# End-to-End Invoice Processing Demo

A lightweight, dependency-free demonstration for turning labeled **synthetic invoice text files** into an organized CSV review sheet. It extracts common fields, validates required values, flags duplicate invoice numbers and incomplete records, then exports all records with their status and issue notes.

## What it includes

- A Node.js command-line processor that reads `.txt` files from a folder and writes a CSV summary.
- A browser workspace for uploading `.txt` files, reviewing extracted fields, and downloading the CSV.
- Four fictional sample invoices: three complete invoices and one intentionally incomplete invoice.
- Validation for missing fields, real ISO dates, three-letter currency codes, positive totals, and duplicate invoice numbers.
- Ready and needs-review counts, with valid totals grouped by currency.

The browser demo processes files locally and does not send them to a server. This is a portfolio demonstration, not client work or a production accounting system. It handles labeled text files only; it does **not** perform OCR or read PDF/image files.

## Run the end-to-end processor

Requires Node.js 18 or newer. No packages need to be installed.

```bash
node process-invoices.js
```

By default, it reads the sample `.txt` files in this folder and writes `results/invoice-processing-summary.csv`. You can choose a different input folder or output file:

```bash
node process-invoices.js --input path/to/invoices --output path/to/summary.csv
```

## Open the browser workspace

```bash
node serve.js
```

Open `http://127.0.0.1:4173`, choose **Load synthetic samples**, review the exception row, and click **Download CSV**.

## Expected sample summary

The four sample invoices produce three ready records, one record needing review (its total is missing), and INR 37,749.50 in valid totals.

All names, dates, invoice numbers, and amounts are fictional.
