# Invoice Processing Demo

A small Python demonstration that reads **synthetic invoice text files**, extracts a few common fields, and writes a CSV summary. The sample data is fictional and contains no real customer or supplier information. This project is a learning/demo artifact, not client work and not a production accounting tool.

## What it does

- Reads `.txt` invoice files from this project folder.
- Extracts invoice number, invoice date, vendor, customer, currency, and total.
- Writes successfully parsed invoices to `results/extracted_invoices.csv`.
- Prints a warning for files with missing required fields.

The example simulates the text-extraction stage after OCR. It does not perform OCR on PDF or image files.

## Run

Requires Python 3.9 or newer. From this folder, run:

```bash
python process_invoices.py
```

Optional input and output paths:

```bash
python process_invoices.py --input . --output results/extracted_invoices.csv
```

## Sample output

| invoice_number | invoice_date | vendor | customer | currency | total |
| --- | --- | --- | --- | --- | ---: |
| IW-2026-001 | 2026-01-15 | Blue Harbor Supplies | Northstar Foods | INR | 18450.00 |
| IW-2026-002 | 2026-01-21 | Cedarline Office Mart | Northstar Foods | INR | 7299.50 |
| IW-2026-003 | 2026-02-02 | Meridian Cloud Tools | Northstar Foods | INR | 12000.00 |

All names, numbers, dates, and amounts above are fictional.
