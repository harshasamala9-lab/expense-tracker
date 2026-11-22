from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

from psycopg.rows import dict_row

from .config import get_settings
from .database import get_pool
from .outbox import emit_import_events
from .parsing import CsvFormatError, parse_csv

logger = logging.getLogger(__name__)

SOURCE = "automation"


@dataclass
class ImportSummary:
    run_id: str
    file_name: str
    status: str
    imported_count: int = 0
    skipped_count: int = 0
    failed_count: int = 0
    parse_error_count: int = 0
    categorization_required_count: int = 0
    total_amount: Decimal = Decimal("0.00")
    started_at: datetime | None = None
    finished_at: datetime | None = None
    errors: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "runId": self.run_id,
            "fileName": self.file_name,
            "status": self.status,
            "importedCount": self.imported_count,
            "skippedCount": self.skipped_count,
            "failedCount": self.failed_count,
            "totalAmount": float(self.total_amount),
            "startedAt": _iso(self.started_at),
            "finishedAt": _iso(self.finished_at),
            "errors": self.errors[:20],
        }


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def _safe_file_name(file_name: str) -> str:
    return os.path.basename(file_name or "expenses.csv")[:255]


def _create_run(file_name: str) -> dict[str, Any]:
    with get_pool().connection() as connection:
        row = connection.execute(
            """
            INSERT INTO import_runs (source, file_name, status)
            VALUES (%s, %s, 'running')
            RETURNING id, started_at
            """,
            (SOURCE, file_name),
        ).fetchone()
        connection.commit()
    return row


def _finish_run(
    run_id: str,
    status: str,
    imported_count: int,
    skipped_count: int,
    failed_count: int,
    total_amount: Decimal,
    error_message: str | None = None,
) -> datetime:
    with get_pool().connection() as connection:
        row = connection.execute(
            """
            UPDATE import_runs
               SET status = %s,
                   imported_count = %s,
                   skipped_count = %s,
                   failed_count = %s,
                   total_amount = %s,
                   error_message = %s,
                   finished_at = NOW()
             WHERE id = %s
             RETURNING finished_at
            """,
            (
                status,
                imported_count,
                skipped_count,
                failed_count,
                total_amount,
                error_message,
                run_id,
            ),
        ).fetchone()
        connection.commit()
    return row["finished_at"]


def import_csv_bytes(content: bytes, file_name: str) -> ImportSummary:
    """Parse and persist a CSV file, recording a durable import_runs audit row.

    Rows are inserted inside one transaction. Each insert uses a nested
    savepoint so a single invalid row does not roll back valid rows. The unique
    index on (source, external_id) makes re-importing the same file safe.
    """

    settings = get_settings()
    if len(content) > settings.max_upload_bytes:
        raise CsvFormatError(
            f"CSV files must be {settings.max_upload_bytes // (1024 * 1024)} MB or smaller."
        )

    safe_name = _safe_file_name(file_name)
    run = _create_run(safe_name)
    summary = ImportSummary(
        run_id=str(run["id"]),
        file_name=safe_name,
        status="running",
        started_at=run["started_at"],
    )

    try:
        parsed = parse_csv(content, source=SOURCE)
        summary.failed_count = len(parsed.errors)
        summary.parse_error_count = len(parsed.errors)
        summary.categorization_required_count = sum(
            1 for row in parsed.rows if row.category == "Other"
        )
        summary.errors = [
            {"rowNumber": error.row_number, "message": error.message}
            for error in parsed.errors
        ]

        with get_pool().connection() as connection:
            with connection.transaction():
                for row in parsed.rows:
                    try:
                        with connection.transaction():
                            inserted = connection.execute(
                                """
                                INSERT INTO expenses (
                                    amount,
                                    category,
                                    description,
                                    expense_date,
                                    source,
                                    external_id,
                                    import_run_id
                                )
                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (source, external_id)
                                    WHERE external_id IS NOT NULL
                                DO NOTHING
                                RETURNING id
                                """,
                                (
                                    row.amount,
                                    row.category,
                                    row.description,
                                    row.expense_date,
                                    SOURCE,
                                    row.external_id,
                                    summary.run_id,
                                ),
                            ).fetchone()
                    except Exception as exc:  # noqa: BLE001 - row-level audit
                        summary.failed_count += 1
                        if len(summary.errors) < 100:
                            summary.errors.append(
                                {
                                    "rowNumber": row.row_number,
                                    "message": f"Database rejected the row: {exc.__class__.__name__}",
                                }
                            )
                        continue

                    if inserted:
                        summary.imported_count += 1
                        summary.total_amount += row.amount
                    else:
                        summary.skipped_count += 1

        summary.status = "completed"
        summary.finished_at = _finish_run(
            summary.run_id,
            "completed",
            summary.imported_count,
            summary.skipped_count,
            summary.failed_count,
            summary.total_amount,
            None,
        )
        emit_import_events(summary)
        return summary
    except CsvFormatError as exc:
        summary.status = "failed"
        summary.errors = [{"rowNumber": 0, "message": str(exc)}]
        summary.finished_at = _finish_run(
            summary.run_id,
            "failed",
            summary.imported_count,
            summary.skipped_count,
            summary.failed_count,
            summary.total_amount,
            str(exc),
        )
        emit_import_events(summary)
        raise
    except Exception as exc:  # noqa: BLE001 - preserve audit trail
        logger.exception("Import failed for %s", safe_name)
        summary.status = "failed"
        summary.finished_at = _finish_run(
            summary.run_id,
            "failed",
            summary.imported_count,
            summary.skipped_count,
            summary.failed_count,
            summary.total_amount,
            "The import could not be completed.",
        )
        emit_import_events(summary)
        raise exc


def import_csv_file(path: Path) -> ImportSummary:
    return import_csv_bytes(path.read_bytes(), path.name)


def scan_inbox() -> list[dict[str, Any]]:
    """Process every CSV in the inbox and move it to processed/ or failed/.

    This is the file-drop automation path. The same importer powers the HTTP
    upload endpoint, so both routes share categorization and deduplication.
    """

    settings = get_settings()
    inbox = settings.inbox_dir
    processed = inbox / "processed"
    failed = inbox / "failed"
    inbox.mkdir(parents=True, exist_ok=True)
    processed.mkdir(parents=True, exist_ok=True)
    failed.mkdir(parents=True, exist_ok=True)

    results: list[dict[str, Any]] = []

    for path in sorted(inbox.glob("*.csv")):
        try:
            # Avoid reading a file that is still being copied into the folder.
            age_seconds = datetime.now().timestamp() - path.stat().st_mtime
            if age_seconds < 2:
                continue

            summary = import_csv_file(path)
            target = processed / path.name
            if target.exists():
                target = processed / (
                    f"{path.stem}-{int(datetime.now().timestamp())}.csv"
                )
            path.replace(target)
            results.append(summary.to_dict())
        except Exception as exc:  # noqa: BLE001 - continue with other files
            logger.exception("Could not import %s", path)
            target = failed / path.name
            if target.exists():
                target = failed / (
                    f"{path.stem}-{int(datetime.now().timestamp())}.csv"
                )
            try:
                path.replace(target)
            except OSError:
                logger.exception("Could not move failed file %s", path)
            results.append(
                {
                    "fileName": path.name,
                    "status": "failed",
                    "message": str(exc),
                }
            )

    return results
