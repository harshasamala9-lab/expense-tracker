from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _positive_int(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        return default
    return value if value > 0 else default


@dataclass(frozen=True)
class Settings:
    database_url: str
    automation_key: str
    inbox_dir: Path
    watch_interval_seconds: int
    max_upload_bytes: int
    max_rows: int

    @property
    def automation_configured(self) -> bool:
        return bool(self.database_url and self.automation_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    inbox = os.getenv("AUTOMATION_INBOX", "").strip()
    return Settings(
        database_url=os.getenv("DATABASE_URL", "").strip(),
        automation_key=os.getenv("AUTOMATION_KEY", "").strip(),
        inbox_dir=Path(inbox).expanduser() if inbox else BASE_DIR / "inbox",
        watch_interval_seconds=_positive_int("AUTOMATION_WATCH_INTERVAL", 15),
        max_upload_bytes=_positive_int(
            "AUTOMATION_MAX_UPLOAD_BYTES", 2 * 1024 * 1024
        ),
        max_rows=_positive_int("AUTOMATION_MAX_ROWS", 5000),
    )
