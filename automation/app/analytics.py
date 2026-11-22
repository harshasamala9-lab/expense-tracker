from __future__ import annotations

from typing import Any

from .database import get_pool


def _money(value: Any) -> float:
    return float(value or 0)


def get_summary() -> dict[str, Any]:
    with get_pool().connection() as connection:
        totals = connection.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS total_spent,
                   COUNT(*)::int AS expense_count,
                   COALESCE(SUM(amount) FILTER (WHERE source = 'automation'), 0)
                       AS automated_total
              FROM expenses
            """
        ).fetchone()

        categories = connection.execute(
            """
            SELECT category,
                   SUM(amount) AS total,
                   COUNT(*)::int AS expense_count
              FROM expenses
             GROUP BY category
             ORDER BY total DESC, category ASC
            """
        ).fetchall()

        sources = connection.execute(
            """
            SELECT source,
                   SUM(amount) AS total,
                   COUNT(*)::int AS expense_count
              FROM expenses
             GROUP BY source
             ORDER BY total DESC, source ASC
            """
        ).fetchall()

        recent = connection.execute(
            """
            SELECT id, amount, category, description, expense_date,
                   created_at, source
              FROM expenses
             ORDER BY expense_date DESC, created_at DESC
             LIMIT 8
            """
        ).fetchall()

    return {
        "totalSpent": _money(totals["total_spent"]),
        "expenseCount": int(totals["expense_count"]),
        "automatedTotal": _money(totals["automated_total"]),
        "categoryBreakdown": [
            {
                "category": row["category"],
                "total": _money(row["total"]),
                "count": int(row["expense_count"]),
            }
            for row in categories
        ],
        "sources": [
            {
                "source": row["source"],
                "total": _money(row["total"]),
                "count": int(row["expense_count"]),
            }
            for row in sources
        ],
        "recentExpenses": [
            {
                "id": str(row["id"]),
                "amount": _money(row["amount"]),
                "category": row["category"],
                "description": row["description"],
                "expense_date": row["expense_date"].isoformat()
                if hasattr(row["expense_date"], "isoformat")
                else row["expense_date"],
                "created_at": row["created_at"].isoformat()
                if hasattr(row["created_at"], "isoformat")
                else row["created_at"],
                "source": row["source"],
            }
            for row in recent
        ],
    }


def get_import_runs(limit: int = 10) -> list[dict[str, Any]]:
    safe_limit = min(max(int(limit), 1), 50)
    with get_pool().connection() as connection:
        rows = connection.execute(
            """
            SELECT id, source, file_name, status, imported_count,
                   skipped_count, failed_count, total_amount,
                   error_message, started_at, finished_at
              FROM import_runs
             ORDER BY started_at DESC
             LIMIT %s
            """,
            (safe_limit,),
        ).fetchall()

    return [
        {
            "id": str(row["id"]),
            "source": row["source"],
            "fileName": row["file_name"],
            "status": row["status"],
            "importedCount": int(row["imported_count"]),
            "skippedCount": int(row["skipped_count"]),
            "failedCount": int(row["failed_count"]),
            "totalAmount": _money(row["total_amount"]),
            "errorMessage": row["error_message"],
            "startedAt": row["started_at"].isoformat()
            if row["started_at"]
            else None,
            "finishedAt": row["finished_at"].isoformat()
            if row["finished_at"]
            else None,
        }
        for row in rows
    ]
