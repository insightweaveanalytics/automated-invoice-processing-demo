const SAMPLE_INVOICES = [
  { name: "invoice_001.txt", text: `INVOICE\nInvoice Number: IW-2026-001\nInvoice Date: 2026-01-15\nVendor: Blue Harbor Supplies\nBill To: Northstar Foods\nCurrency: INR\n\nDescription: Packaging materials\nSubtotal: 16,500.00\nTax: 1,950.00\nTotal: 18,450.00` },
  { name: "invoice_002.txt", text: `INVOICE\nInvoice Number: IW-2026-002\nInvoice Date: 2026-01-21\nVendor: Cedarline Office Mart\nBill To: Northstar Foods\nCurrency: INR\n\nDescription: Office supplies\nSubtotal: 6,525.00\nTax: 774.50\nTotal: 7,299.50` },
  { name: "invoice_003.txt", text: `INVOICE\nInvoice Number: IW-2026-003\nInvoice Date: 2026-02-02\nVendor: Meridian Cloud Tools\nBill To: Northstar Foods\nCurrency: INR\n\nDescription: Monthly software subscription\nSubtotal: 10,000.00\nTax: 2,000.00\nTotal: 12,000.00` },
  { name: "invoice_004_missing_total.txt", text: `INVOICE\nInvoice Number: IW-2026-004\nInvoice Date: 2026-02-08\nVendor: Juniper Stationery Works\nBill To: Northstar Foods\nCurrency: INR\n\nDescription: Notebooks and folders\nSubtotal: 1,850.00\nTax: 333.00\nTotal:` }
];

const ui = {
  fileInput: document.querySelector("#file-input"),
  dropCard: document.querySelector("#drop-card"),
  sampleButton: document.querySelector("#sample-button"),
  clearButton: document.querySelector("#clear-button"),
  exportButton: document.querySelector("#export-button"),
  body: document.querySelector("#results-body"),
  hint: document.querySelector("#results-hint"),
  processed: document.querySelector("#processed-count"),
  ready: document.querySelector("#ready-count"),
  review: document.querySelector("#review-count"),
  total: document.querySelector("#total-value"),
  reviewPanel: document.querySelector("#review-panel"),
  reviewList: document.querySelector("#review-list")
};
let currentRecords = [];

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
  const invoice = {
    sourceFile: file.name,
    invoiceNumber: readField(file.text, "Invoice Number"),
    date: readField(file.text, "Invoice Date"),
    vendor: readField(file.text, "Vendor"),
    customer: readField(file.text, "Bill To"),
    currency: readField(file.text, "Currency").toUpperCase(),
    totalRaw: readField(file.text, "Total"),
    total: null,
    issues: []
  };
  for (const key of ["invoiceNumber", "date", "vendor", "customer", "currency", "totalRaw"]) {
    if (!invoice[key]) invoice.issues.push(`Missing ${key === "totalRaw" ? "total" : key.replace(/[A-Z]/g, c => ` ${c.toLowerCase()}`)}.`);
  }
  if (invoice.date && !isRealISODate(invoice.date)) invoice.issues.push("Invoice date must be a real date in YYYY-MM-DD format.");
  if (invoice.currency && !/^[A-Z]{3}$/.test(invoice.currency)) invoice.issues.push("Currency must be a three-letter code.");
  if (invoice.totalRaw) {
    invoice.total = parseAmount(invoice.totalRaw);
    if (invoice.total === null) invoice.issues.push("Total must be a positive amount with up to two decimal places.");
  }
  return invoice;
}

function processFiles(files) {
  const records = files.map(extractInvoice);
  const seen = new Map();
  records.forEach(record => {
    if (!record.invoiceNumber) return;
    const prior = seen.get(record.invoiceNumber);
    if (prior) {
      record.issues.push(`Duplicate invoice number also found in ${prior.sourceFile}.`);
      prior.issues.push(`Duplicate invoice number also found in ${record.sourceFile}.`);
    } else {
      seen.set(record.invoiceNumber, record);
    }
  });
  currentRecords = records;
  render();
}

function formatMoney(amount, currency) {
  if (amount === null) return "—";
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function render() {
  const ready = currentRecords.filter(record => record.issues.length === 0);
  const review = currentRecords.filter(record => record.issues.length > 0);
  ui.processed.textContent = String(currentRecords.length);
  ui.ready.textContent = String(ready.length);
  ui.review.textContent = String(review.length);
  const totals = new Map();
  ready.forEach(record => totals.set(record.currency, (totals.get(record.currency) || 0) + record.total));
  ui.total.textContent = totals.size ? [...totals].map(([currency, amount]) => formatMoney(amount, currency)).join(" · ") : "—";
  ui.hint.textContent = currentRecords.length ? `${currentRecords.length} file(s) processed. Review flagged rows before using the CSV.` : "Load the synthetic samples or choose your own .txt invoices.";
  ui.exportButton.disabled = currentRecords.length === 0;

  if (!currentRecords.length) {
    ui.body.innerHTML = '<tr class="empty-row"><td colspan="6">No invoices processed yet.</td></tr>';
  } else {
    ui.body.innerHTML = currentRecords.map(record => {
      const good = record.issues.length === 0;
      return `<tr>
        <td><span class="invoice-id">${escapeHTML(record.invoiceNumber || "No invoice number")}</span><span class="subline">${escapeHTML(record.sourceFile)}</span></td>
        <td>${escapeHTML(record.date || "—")}</td>
        <td>${escapeHTML(record.vendor || "—")}</td>
        <td>${escapeHTML(record.customer || "—")}</td>
        <td>${escapeHTML(formatMoney(record.total, record.currency || "INR"))}</td>
        <td><span class="status-pill ${good ? "status-ready" : "status-review"}">${good ? "Ready" : "Needs review"}</span>${good ? "" : `<span class="subline">${record.issues.length} issue(s)</span>`}</td>
      </tr>`;
    }).join("");
  }

  ui.reviewPanel.hidden = review.length === 0;
  ui.reviewList.innerHTML = review.map(record => `<li><strong>${escapeHTML(record.sourceFile)}</strong>: ${record.issues.map(escapeHTML).join(" ")}</li>`).join("");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCSV() {
  const columns = ["source_file", "invoice_number", "invoice_date", "vendor", "customer", "currency", "total", "status", "issues"];
  const rows = currentRecords.map(record => [
    record.sourceFile, record.invoiceNumber, record.date, record.vendor, record.customer,
    record.currency, record.total === null ? "" : record.total.toFixed(2),
    record.issues.length ? "Needs review" : "Ready", record.issues.join(" | ")
  ]);
  const csv = [columns, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "invoice-processing-summary.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

async function processTextFiles(fileList) {
  const files = [...fileList].filter(file => file.name.toLowerCase().endsWith(".txt"));
  if (!files.length) {
    ui.hint.textContent = "Choose .txt invoice files. This demo does not read PDFs or images.";
    return;
  }
  const contents = await Promise.all(files.map(async file => ({ name: file.name, text: await file.text() })));
  processFiles(contents);
}

ui.sampleButton.addEventListener("click", () => processFiles(SAMPLE_INVOICES));
ui.clearButton.addEventListener("click", () => { currentRecords = []; render(); });
ui.exportButton.addEventListener("click", exportCSV);
ui.fileInput.addEventListener("change", event => processTextFiles(event.target.files));

ui.dropCard.addEventListener("dragover", event => { event.preventDefault(); ui.dropCard.classList.add("dragging"); });
ui.dropCard.addEventListener("dragleave", () => ui.dropCard.classList.remove("dragging"));
ui.dropCard.addEventListener("drop", event => {
  event.preventDefault();
  ui.dropCard.classList.remove("dragging");
  processTextFiles(event.dataTransfer.files);
});

render();


