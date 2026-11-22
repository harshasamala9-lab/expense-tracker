"""Durable automation event outbox.

Events are written directly to the shared PostgreSQL `automation_events`
table, so they survive process restarts and are processed idempotently by the
Node backend. The event_id is derived from the immutable import run id and
event type, so replaying an import cannot enqueue duplicates.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from .database import get_pool

logger = logging.getLogger(__name__)

NAMESPACE = uuid.UUID("6ba7b811-9dad-11d1-80b4-00c04fd430c8")


def _event_id(run_id: str, event_type: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"import:{run_id}:{event_type}"))


def _safe_payload(payload: dict[str, Any]) -> dict[str, Any]:
    allowed = {
        "runId",
        "fileName",
        "importedCount",
        "skippedCount",
        "failedCount",
        "parseErrorCount",
        "categorizationRequiredCount",
        "rowCount",
        "status",
        "errorSummary",
    }
    return {key: value for key, value in payload.items() if key in allowed}


def emit_event(event_type: str, payload: dict[str, Any]) -> bool:
    """Inserts one durable event. Returns True when a new row was created."""

    run_id = str(payload.get("runId") or "unknown")
    event_id = _event_id(run_id, event_type)
    safe = _safe_payload(payload)

    try:
        with get_pool().connection() as connection:
            row = connection.execute(
                """
                INSERT INTO automation_events (
                    event_id, event_type, source, status, payload,
                    next_attempt_at
                )
                VALUES (%s, %s, 'python-automation', 'pending', %s::jsonb, NOW())
                ON CONFLICT (event_id) DO NOTHING
                RETURNING event_id
                """,
                (event_id, event_type, json.dumps(safe)),
            ).fetchone()
            connection.commit()
        return row is not None
    except Exception:  # noqa: BLE001 - automation must never break an import
        logger.exception("Could not emit automation event %s", event_type)
        return False


def emit_import_events(summary: Any) -> None:
    """Map an ImportSummary to the event types consumed by the task engine."""

    base = {
        "runId": summary.run_id,
        "fileName": summary.file_name,
        "importedCount": summary.imported_count,
        "skippedCount": summary.skipped_count,
        "failedCount": summary.failed_count,
        "parseErrorCount": getattr(summary, "parse_error_count", 0),
        "categorizationRequiredCount": getattr(
            summary, "categorization_required_count", 0
        ),
        "status": summary.status,
    }

    if summary.status == "failed":
        emit_event(
            "IMPORT_FAILED",
            {
                **base,
                "errorSummary": next(
                    (error["message"] for error in summary.errors),
                    "The automated CSV import failed.",
                )[:500],
            },
        )
        return

    if getattr(summary, "parse_error_count", summary.failed_count) > 0:
        emit_event(
            "PARSING_FAILED",
            {
                **base,
                "parseErrorCount": getattr(
                    summary, "parse_error_count", summary.failed_count
                ),
                "errorSummary": next(
                    (error["message"] for error in summary.errors),
                    "One or more CSV rows could not be parsed.",
                )[:500],
            },
        )

    emit_event("IMPORT_COMPLETED", base)
