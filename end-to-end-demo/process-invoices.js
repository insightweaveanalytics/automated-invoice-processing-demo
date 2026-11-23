const fs = require("node:fs/promises");
const path = require("node:path");

function readField(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^\\s*${escaped}\\s*:\\s*(.*?)\\s*$`, "im"));
  return match ? match[1].trim() : "";
}

function isRealISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseAmount(value) {
  const cleaned = value.replace(/,/g, "").replace(/^(?:INR|USD|EUR|GBP|Rs\.?|₹|\$)\s*/i, "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function extractInvoice(file) {
  const record = {
    sourceFile: file.name,
    invoiceNumber: readField(file.text, "Invoice Number"),
    date: readField(file.text, "Invoice Date"),
    vendor: readField(file.text, "Vendor"),
    customer: readField(file.text, "Bill To"),
    currency: readField(file.text, "Currency").toUpperCase(),
    rawTotal: readField(file.text, "Total"),
    total: null,
    issues: []
  };
  const required = [
    ["invoiceNumber", "invoice number"], ["date", "invoice date"], ["vendor", "vendor"],
    ["customer", "customer"], ["currency", "currency"], ["rawTotal", "total"]
  ];
  for (const [key, label] of required) if (!record[key]) record.issues.push(`Missing ${label}.`);
  if (record.date && !isRealISODate(record.date)) record.issues.push("Invoice date must be a real date in YYYY-MM-DD format.");
  if (record.currency && !/^[A-Z]{3}$/.test(record.currency)) record.issues.push("Currency must be a three-letter code.");
  if (record.rawTotal) {
    record.total = parseAmount(record.rawTotal);
    if (record.total === null) record.issues.push("Total must be a positive amount with up to two decimal places.");
  }
  return record;
}

function markDuplicateNumbers(records) {
  const seen = new Map();
  for (const record of records) {
    if (!record.invoiceNumber) continue;
    const previous = seen.get(record.invoiceNumber);
    if (previous) {
      record.issues.push(`Duplicate invoice number also found in ${previous.sourceFile}.`);
      previous.issues.push(`Duplicate invoice number also found in ${record.sourceFile}.`);
    } else {
      seen.set(record.invoiceNumber, record);
    }
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function parseArgs(argv) {
  const options = { input: __dirname, output: path.join(__dirname, "results", "invoice-processing-summary.csv") };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true };
    if ((arg === "--input" || arg === "--output") && argv[index + 1]) {
      options[arg.slice(2)] = path.resolve(argv[++index]);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return options;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    console.log("Usage: node process-invoices.js [--input FOLDER] [--output FILE]");
    return;
  }

  let entries;
  try {
    entries = await fs.readdir(options.input, { withFileTypes: true });
  } catch (error) {
    console.error(`Could not read input folder ${options.input}: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const names = entries.filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".txt"))
    .map(entry => entry.name).sort((a, b) => a.localeCompare(b));
  if (!names.length) {
    console.error(`No .txt invoice files found in ${options.input}`);
    process.exitCode = 1;
    return;
  }

  const records = [];
  for (const name of names) {
    try {
      const text = await fs.readFile(path.join(options.input, name), "utf8");
      records.push(extractInvoice({ name, text }));
    } catch (error) {
      records.push({
        sourceFile: name, invoiceNumber: "", date: "", vendor: "", customer: "", currency: "",
        total: null, issues: [`Could not read file: ${error.message}`]
      });
    }
  }
  markDuplicateNumbers(records);

  const headers = ["source_file", "invoice_number", "invoice_date", "vendor", "customer", "currency", "total", "status", "issues"];
  const rows = records.map(record => [
    record.sourceFile, record.invoiceNumber, record.date, record.vendor, record.customer,
    record.currency, record.total === null ? "" : record.total.toFixed(2),
    record.issues.length ? "Needs review" : "Ready", record.issues.join(" | ")
  ]);
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  await fs.mkdir(path.dirname(options.output), { recursive: true });
  await fs.writeFile(options.output, `\uFEFF${csv}`, "utf8");

  const ready = records.filter(record => !record.issues.length);
  const review = records.filter(record => record.issues.length > 0);
  const totals = new Map();
  ready.forEach(record => totals.set(record.currency, (totals.get(record.currency) || 0) + record.total));
  console.log(`Processed ${records.length} invoice file(s): ${ready.length} ready, ${review.length} needing review.`);
  for (const [currency, amount] of totals) console.log(`Valid total (${currency}): ${amount.toFixed(2)}`);
  if (review.length) console.log(`Review: ${review.map(record => `${record.sourceFile} — ${record.issues.join(" ")}`).join("; ")}`);
  console.log(`CSV saved to ${options.output}`);
}

main().catch(error => {
  console.error(`Processing failed: ${error.message}`);
  process.exitCode = 1;
});
