from __future__ import annotations

import argparse
import csv
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

FIELDS = {
    "invoice_number": re.compile(r"^Invoice\s+Number:\s*(.+?)\s*$", re.I | re.M),
    "invoice_date": re.compile(r"^Invoice\s+Date:\s*(\d{4}-\d{2}-\d{2})\s*$", re.I | re.M),
    "vendor": re.compile(r"^Vendor:\s*(.+?)\s*$", re.I | re.M),
    "customer": re.compile(r"^Bill\s+To:\s*(.+?)\s*$", re.I | re.M),
    "currency": re.compile(r"^Currency:\s*([A-Z]{3})\s*$", re.I | re.M),
    "total": re.compile(r"^Total:\s*([0-9,]+(?:\.\d{2})?)\s*$", re.I | re.M),
}
COLUMNS = ["invoice_number", "invoice_date", "vendor", "customer", "currency", "total"]


def extract_invoice(path: Path) -> tuple[dict[str, str] | None, list[str]]:
    text = path.read_text(encoding="utf-8")
    values: dict[str, str] = {}
    missing: list[str] = []
    for name, pattern in FIELDS.items():
        match = pattern.search(text)
        if not match:
            missing.append(name)
            continue
        value = match.group(1).strip()
        if name == "currency":
            value = value.upper()
        if name == "total":
            try:
                value = f"{Decimal(value.replace(',', '')):.2f}"
            except InvalidOperation:
                missing.append(name)
                continue
        values[name] = value
    return (values if not missing else None), missing


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract key fields from synthetic invoice text files.")
    parser.add_argument("--input", type=Path, default=Path("."), help="Folder containing .txt invoices")
    parser.add_argument("--output", type=Path, default=Path("results/extracted_invoices.csv"), help="CSV output path")
    args = parser.parse_args()

    files = sorted(args.input.glob("*.txt"))
    if not files:
        print(f"No .txt invoice files found in {args.input}")
        return 1

    rows: list[dict[str, str]] = []
    failures = 0
    for path in files:
        try:
            row, missing = extract_invoice(path)
        except (OSError, UnicodeError) as error:
            print(f"WARNING: {path.name}: could not read file ({error})")
            failures += 1
            continue
        if row is None:
            print(f"WARNING: {path.name}: missing or invalid fields: {', '.join(missing)}")
            failures += 1
            continue
        rows.append(row)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Processed {len(files)} file(s): {len(rows)} extracted, {failures} warning(s).")
    print(f"CSV written to {args.output}")
    return 0 if rows else 1


if __name__ == "__main__":
    raise SystemExit(main())

