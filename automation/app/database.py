from __future__ import annotations

import logging
from typing import Any

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import get_settings

logger = logging.getLogger(__name__)

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    global _pool

    if _pool is None:
        settings = get_settings()
        if not settings.database_url:
            raise RuntimeError(
                "DATABASE_URL is not configured for the automation service."
            )

        _pool = ConnectionPool(
            conninfo=settings.database_url,
            min_size=1,
            max_size=5,
            timeout=10,
            open=False,
            kwargs={
                "application_name": "expense-automation",
                "row_factory": dict_row,
            },
        )
        _pool.open()

    return _pool


def close_pool() -> None:
    global _pool

    if _pool is not None:
        _pool.close()
        _pool = None


def check_database() -> dict[str, Any]:
    with get_pool().connection(timeout=5) as connection:
        row = connection.execute(
            "SELECT current_database() AS database, current_user AS db_user"
        ).fetchone()

    return {
        "database": row["database"] if row else None,
        "dbUser": row["db_user"] if row else None,
    }
