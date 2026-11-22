from __future__ import annotations

import csv
import hashlib
import io
import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from .categorizer import CATEGORIES, categorize
from .config import get_settings

MAX_DESCRIPTION_LENGTH = 500
MAX_AMOUNT = Decimal("9999999999.99")

DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%m/%d/%Y",
    "%d %b %Y",
    "%d %B %Y",
)

FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "date": (
        "date",
        "transaction_date",
        "transaction_dt",
        "posted_date",
        "posting_date",
        "value_date",
        "expense_date",
    ),
    "description": (
        "description",
        "merchant",
        "payee",
        "details",
        "narration",
        "memo",
        "name",
        "transaction_description",
    ),
    "amount": (
        "amount",
        "transaction_amount",
        "expense_amount",
        "value",
        "amount_usd",
        "amount_inr",
    ),
    "debit": ("debit", "withdrawal", "withdrawal_amount", "debit_amount"),
    "credit": ("credit", "deposit", "deposit_amount", "credit_amount"),
    "category": ("category", "type_category"),
    "external_id": (
        "external_id",
        "transaction_id",
        "transaction_ref",
        "reference",
        "reference_id",
        "txn_id",
        "id",
    ),
    "type": ("type", "transaction_type", "debit_credit", "dr_cr"),
}

CREDIT_TYPES = {
    "credit",
    "cr",
    "income",
    "deposit",
    "refund",
    "reversal",
    "salary",
}


class CsvFormatError(ValueError):
    pass


@dataclass(frozen=True)
class ParsedRow:
    expense_date: date
    amount: Decimal
    description: str
    category: str
    external_id: str
    row_number: int


@dataclass(frozen=True)
class RowError:
    row_number: int
    message: str


@dataclass(frozen=True)
class ParseResult:
    rows: list[ParsedRow]
    errors: list[RowError]


def _normalize_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip(
        "_"
    )


def _decode(content: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise CsvFormatError("The CSV file could not be decoded as text.")


def _header_map(fieldnames: list[str] | None) -> dict[str, str]:
    if not fieldnames:
        raise CsvFormatError("The CSV file has no header row.")

    normalized = {
        _normalize_header(name): name
        for name in fieldnames
        if name is not None and str(name).strip()
    }

    mapping: dict[str, str] = {}
    for field, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias in normalized:
                mapping[field] = normalized[alias]
                break

    if "date" not in mapping:
        raise CsvFormatError(
            "Missing date column. Expected one of: date, transaction_date, posted_date."
        )

    if "description" not in mapping:
        raise CsvFormatError(
            "Missing description column. Expected one of: description, merchant, payee, details."
        )

    if "amount" not in mapping and "debit" not in mapping:
        raise CsvFormatError(
            "Missing amount column. Expected one of: amount, debit, withdrawal."
        )

    return mapping


def _parse_date(raw: str) -> date:
    value = str(raw or "").strip()
    if not value:
        raise ValueError("Date is empty.")

    # ISO timestamps are common in card exports. Keep only the calendar day.
    if "T" in value:
        value = value.split("T", 1)[0]

    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue

    raise ValueError(f"Unrecognized date format: {value!r}.")


def _parse_decimal(raw: str) -> Decimal:
    value = str(raw or "").strip()
    if not value:
        raise ValueError("Amount is empty.")

    negative = value.startswith("(") and value.endswith(")")
    value = value.strip("()")
    value = re.sub(r"[^\d,.\-]", "", value)

    # Handle both 1,234.56 and 1.234,56 styles.
    if "," in value and "." in value:
        if value.rfind(",") > value.rfind("."):
            value = value.replace(".", "").replace(",", ".")
        else:
            value = value.replace(",", "")
    elif "," in value:
        parts = value.split(",")
        if len(parts[-1]) == 2:
            value = value.replace(",", ".")
        else:
            value = value.replace(",", "")

    try:
        amount = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError(f"Invalid amount: {raw!r}.") from exc

    if negative:
        amount = -amount

    amount = abs(amount)
    if amount <= 0:
        raise ValueError("Amount must be greater than zero.")
    if amount > MAX_AMOUNT:
        raise ValueError("Amount is too large.")
    if amount.as_tuple().exponent < -2:
        raise ValueError("Amount can have at most two decimal places.")

    return amount.quantize(Decimal("0.01"))


def build_external_id(
    expense_date: date, amount: Decimal, description: str, source: str
) -> str:
    normalized = re.sub(r"\s+", " ", description.strip().lower())
    digest = hashlib.sha256(
        f"{source}|{expense_date.isoformat()}|{amount:.2f}|{normalized}".encode(
            "utf-8"
        )
    ).hexdigest()
    return f"auto-{digest[:40]}"


def parse_csv(content: bytes, source: str = "automation") -> ParseResult:
    settings = get_settings()
    text = _decode(content)
    reader = csv.DictReader(io.StringIO(text))
    mapping = _header_map(reader.fieldnames)
    rows: list[ParsedRow] = []
    errors: list[RowError] = []

    for index, raw_row in enumerate(reader, start=2):
        if index - 1 > settings.max_rows:
            raise CsvFormatError(
                f"The CSV contains more than {settings.max_rows} rows."
            )

        if not any(str(value or "").strip() for value in raw_row.values()):
            continue

        try:
            type_value = str(
                raw_row.get(mapping.get("type", ""), "") or ""
            ).strip().lower()
            if type_value in CREDIT_TYPES:
                continue

            if "debit" in mapping:
                debit_raw = raw_row.get(mapping["debit"], "")
                credit_raw = (
                    raw_row.get(mapping["credit"], "")
                    if "credit" in mapping
                    else ""
                )
                if not str(debit_raw or "").strip() and str(
                    credit_raw or ""
                ).strip():
                    continue
                amount = _parse_decimal(debit_raw)
            else:
                amount = _parse_decimal(raw_row.get(mapping["amount"], ""))

            expense_date = _parse_date(raw_row.get(mapping["date"], ""))
            description = re.sub(
                r"\s+",
                " ",
                str(raw_row.get(mapping["description"], "") or "").strip(),
            )
            if not description:
                description = "Imported expense"
            description = description[:MAX_DESCRIPTION_LENGTH]

            explicit_category = (
                raw_row.get(mapping["category"], "")
                if "category" in mapping
                else ""
            )
            category = categorize(description, explicit_category)
            if category not in CATEGORIES:
                category = "Other"

            external_id = (
                str(raw_row.get(mapping["external_id"], "") or "").strip()
                if "external_id" in mapping
                else ""
            )
            if not external_id:
                external_id = build_external_id(
                    expense_date, amount, description, source
                )

            rows.append(
                ParsedRow(
                    expense_date=expense_date,
                    amount=amount,
                    description=description,
                    category=category,
                    external_id=external_id[:255],
                    row_number=index,
                )
            )
        except (ValueError, TypeError) as exc:
            errors.append(RowError(row_number=index, message=str(exc)))

    return ParseResult(rows=rows, errors=errors)
