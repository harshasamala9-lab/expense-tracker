from __future__ import annotations

import hmac
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

import psycopg
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from .analytics import get_import_runs, get_summary
from .config import get_settings
from .database import check_database, close_pool, get_pool
from .importer import import_csv_bytes, scan_inbox
from .parsing import CsvFormatError

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    if not settings.database_url:
        logger.warning("DATABASE_URL is not configured.")
    else:
        try:
            get_pool()
            logger.info("PostgreSQL pool initialized.")
        except Exception:  # noqa: BLE001 - service should still start
            logger.exception("Could not initialize the PostgreSQL pool.")

    if not settings.automation_key:
        logger.warning("AUTOMATION_KEY is not configured; protected routes will fail.")

    yield
    close_pool()


app = FastAPI(
    title="Expense Tracker Automation",
    version="1.0.0",
    description=(
        "Python ingestion service for CSV expense imports, rule-based "
        "categorization, deduplication, and PostgreSQL analytics."
    ),
    lifespan=lifespan,
)


async def require_api_key(
    x_automation_key: str | None = Header(default=None),
) -> None:
    settings = get_settings()

    if not settings.automation_key:
        raise HTTPException(
            status_code=503,
            detail="AUTOMATION_KEY is not configured on the automation service.",
        )

    if not x_automation_key or not hmac.compare_digest(
        x_automation_key, settings.automation_key
    ):
        raise HTTPException(status_code=401, detail="Invalid automation key.")


def _health_payload() -> dict[str, Any]:
    settings = get_settings()

    if not settings.database_url:
        return {
            "status": "degraded",
            "service": "expense-automation",
            "database": "not_configured",
            "message": "DATABASE_URL is not configured.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    info = check_database()
    return {
        "status": "ok",
        "service": "expense-automation",
        "database": "connected",
        "databaseName": info["database"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/", tags=["meta"])
def root() -> dict[str, Any]:
    return {
        "name": "Expense Tracker Automation",
        "version": "1.0.0",
        "endpoints": [
            "GET /health",
            "POST /import",
            "POST /scan",
            "GET /analytics/summary",
            "GET /imports",
        ],
    }


@app.get("/health", tags=["meta"])
def health() -> JSONResponse:
    try:
        payload = _health_payload()
        status_code = 200 if payload["status"] == "ok" else 503
        return JSONResponse(payload, status_code=status_code)
    except Exception as exc:  # noqa: BLE001 - health must never crash
        logger.warning("Health check failed: %s", exc)
        return JSONResponse(
            {
                "status": "degraded",
                "service": "expense-automation",
                "database": "unavailable",
                "message": "The database is unavailable.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            status_code=503,
        )


@app.post("/import", status_code=201, tags=["automation"])
async def import_expenses(
    file: UploadFile = File(...),
    _: None = Depends(require_api_key),
) -> dict[str, Any]:
    settings = get_settings()
    filename = file.filename or "expenses.csv"

    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a .csv file.")

    content = await file.read(settings.max_upload_bytes + 1)

    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=(
                f"CSV files must be "
                f"{settings.max_upload_bytes // (1024 * 1024)} MB or smaller."
            ),
        )

    if not content.strip():
        raise HTTPException(status_code=400, detail="The CSV file is empty.")

    try:
        summary = import_csv_bytes(content, filename)
    except CsvFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except psycopg.Error as exc:
        logger.exception("Database error during import")
        raise HTTPException(
            status_code=503,
            detail="The database is unavailable. Please try again.",
        ) from exc

    return summary.to_dict()


@app.post("/scan", tags=["automation"])
def scan(
    _: None = Depends(require_api_key),
) -> dict[str, Any]:
    try:
        results = scan_inbox()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Inbox scan failed")
        raise HTTPException(
            status_code=503,
            detail="The inbox scan could not be completed.",
        ) from exc

    return {
        "processedFiles": len(results),
        "results": results,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/analytics/summary", tags=["analytics"])
def analytics_summary(
    _: None = Depends(require_api_key),
) -> dict[str, Any]:
    try:
        return get_summary()
    except psycopg.Error as exc:
        logger.exception("Could not calculate analytics")
        raise HTTPException(
            status_code=503,
            detail="The database is unavailable. Please try again.",
        ) from exc


@app.get("/imports", tags=["analytics"])
def imports(
    limit: int = 10,
    _: None = Depends(require_api_key),
) -> dict[str, Any]:
    try:
        runs = get_import_runs(limit)
    except psycopg.Error as exc:
        logger.exception("Could not load import runs")
        raise HTTPException(
            status_code=503,
            detail="The database is unavailable. Please try again.",
        ) from exc

    return {"importRuns": runs, "count": len(runs)}
