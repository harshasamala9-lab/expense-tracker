"""Command-line interface for batch imports and inbox scans.

Examples:
    python -m app.cli import ../sample-data/expenses.csv
    python -m app.cli scan
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .database import close_pool
from .importer import import_csv_file, scan_inbox


def main() -> int:
    parser = argparse.ArgumentParser(description="Expense Tracker automation CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    import_parser = subparsers.add_parser("import", help="Import one CSV file")
    import_parser.add_argument("path", type=Path)

    subparsers.add_parser("scan", help="Process every CSV in the inbox folder")

    args = parser.parse_args()

    try:
        if args.command == "import":
            result = import_csv_file(args.path)
            print(json.dumps(result.to_dict(), indent=2))
        else:
            print(json.dumps(scan_inbox(), indent=2))
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"Import failed: {exc}", file=sys.stderr)
        return 1
    finally:
        close_pool()


if __name__ == "__main__":
    raise SystemExit(main())
