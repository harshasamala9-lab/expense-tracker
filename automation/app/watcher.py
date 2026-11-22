"""Poll an inbox folder and import new CSV files automatically.

Run locally:
    python -m app.watcher

Or set AUTOMATION_INBOX and use a process manager / scheduled job in
production. The HTTP upload endpoint is usually a better fit on ephemeral
hosts, while the watcher is useful for a workstation or a mounted drive.
"""

from __future__ import annotations

import logging
import time

from .config import get_settings
from .database import close_pool
from .importer import scan_inbox

logging.basicConfig(
    level="INFO", format="%(asctime)s %(levelname)s %(name)s %(message)s"
)
logger = logging.getLogger("expense-automation-watcher")


def main() -> None:
    settings = get_settings()
    logger.info(
        "Watching %s every %ss",
        settings.inbox_dir,
        settings.watch_interval_seconds,
    )

    try:
        while True:
            results = scan_inbox()
            for result in results:
                logger.info(
                    "Imported %s: status=%s imported=%s skipped=%s failed=%s",
                    result.get("fileName"),
                    result.get("status"),
                    result.get("importedCount", 0),
                    result.get("skippedCount", 0),
                    result.get("failedCount", 0),
                )
            time.sleep(settings.watch_interval_seconds)
    except KeyboardInterrupt:
        logger.info("Watcher stopped.")
    finally:
        close_pool()


if __name__ == "__main__":
    main()
