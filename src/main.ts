// Step 1 test bench: pick an invoice, extract it, show the lines.
// This page is temporary scaffolding; the real upload -> review -> confirm UI comes later.

import { extractInvoice, checkTotals } from "./extract.ts";
import { costUsd } from "./cost.ts";
import type { InvoiceFile, ExtractionResult } from "./types.ts";

const SAMPLES = [
  { label: "Invoice 1 (PDF)", path: "samples/invoice-NRS-24817.pdf" },
  { label: "Invoice 1 (photo)", path: "samples/invoice-NRS-24817-photo.jpg" },
  { label: "Invoice 2 (PDF)", path: "samples/invoice-NRS-25033.pdf" },
  { label: "Invoice 2 (photo)", path: "samples/invoice-NRS-25033-photo.jpg" },
];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const keyInput = $<HTMLInputElement>("api-key");
const rememberBox = $<HTMLInputElement>("remember-key");
const fileInput = $<HTMLInputElement>("file");
const runBtn = $<HTMLButtonElement>("run");
const statusEl = $("status");
const outputEl = $("output");

let selected: { name: string; blob: Blob } | null = null;

// --- API key: kept in memory, optionally remembered in localStorage ---
const KEY_STORAGE = "invoice-demo-api-key";
try {
  const saved = localStorage.getItem(KEY_STORAGE);
  if (saved) { keyInput.value = saved; rememberBox.checked = true; }
} catch { /* storage unavailable: fine, just don't remember */ }

function persistKey() {
  try {
    if (rememberBox.checked && keyInput.value) localStorage.setItem(KEY_STORAGE, keyInput.value);
    else localStorage.removeItem(KEY_STORAGE);
  } catch { /* ignore */ }
}
keyInput.addEventListener("input", () => { persistKey(); updateRunButton(); });
rememberBox.addEventListener("change", persistKey);

// --- File selection ---
const samplesEl = $("samples");
for (const s of SAMPLES) {
  const b = document.createElement("button");
  b.className = "sample";
  b.textContent = s.label;
  b.onclick = async () => {
    const res = await fetch(s.path);
    selected = { name: s.label, blob: await res.blob() };
    fileInput.value = "";
    document.querySelectorAll(".sample").forEach((el) => el.classList.toggle("active", el === b));
    updateRunButton();
  };
  samplesEl.append(b);
}
fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  selected = f ? { name: f.name, blob: f } : null;
  document.querySelectorAll(".sample").forEach((el) => el.classList.remove("active"));
  updateRunButton();
});

function updateRunButton() {
  runBtn.disabled = !(keyInput.value.trim() && selected);
}

async function toInvoiceFile(blob: Blob): Promise<InvoiceFile> {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
  const mediaType = allowed.find((t) => t === blob.type);
  if (!mediaType) throw new Error(`Unsupported file type: ${blob.type || "unknown"}`);
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  return { base64: dataUrl.split(",")[1], mediaType };
}

// --- Run ---
runBtn.addEventListener("click", async () => {
  if (!selected) return;
  runBtn.disabled = true;
  outputEl.innerHTML = "";
  showStatus(`Reading ${selected.name}…`);
  try {
    const file = await toInvoiceFile(selected.blob);
    const result = await extractInvoice(keyInput.value.trim(), file);
    statusEl.hidden = true;
    render(result);
  } catch (err) {
    showStatus(String(err instanceof Error ? err.message : err), true);
  } finally {
    updateRunButton();
  }
});

function showStatus(msg: string, isError = false) {
  statusEl.hidden = false;
  statusEl.className = "status" + (isError ? " error" : "");
  statusEl.textContent = msg;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const money = (n: number, cur: string) => {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur || "GBP" }).format(n); }
  catch { return n.toFixed(2); }
};

function render(r: ExtractionResult) {
  const inv = r.invoice;
  const cost = costUsd(r.model, r.usage);
  const warnings = checkTotals(inv);
  if (inv.readabilityIssues) warnings.unshift(`Model notes: ${inv.readabilityIssues}`);

  outputEl.innerHTML = `
    <div class="meta">
      <span><b>${esc(inv.supplierName)}</b></span>
      <span>Invoice <b>${esc(inv.invoiceNumber)}</b></span>
      <span>${esc(inv.invoiceDate)}</span>
      <span><b>${inv.lines.length}</b> lines</span>
      <span>Net <b>${money(inv.netTotal, inv.currency)}</b></span>
      <span>${(r.durationMs / 1000).toFixed(1)} s</span>
      <span>${r.usage.input_tokens.toLocaleString()} in / ${r.usage.output_tokens.toLocaleString()} out tokens${cost !== null ? ` ≈ $${cost.toFixed(3)}` : ""}</span>
    </div>
    ${warnings.map((w) => `<div class="warn">${esc(w)}</div>`).join("")}
    <div class="table-wrap"><table>
      <thead><tr><th>Code</th><th>Description</th><th>Kind</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead>
      <tbody>
        ${inv.lines.map((l) => `
          <tr>
            <td>${esc(l.code) || "—"}</td>
            <td>${esc(l.description)}
              ${l.manufacturerGuess || l.modelGuess ? `<div class="guess">${esc([l.manufacturerGuess, l.modelGuess].filter(Boolean).join(" · "))}</div>` : ""}</td>
            <td><span class="kind ${l.kind}">${l.kind}</span></td>
            <td class="num">${l.quantity}</td>
            <td class="num">${money(l.unitPrice, inv.currency)}</td>
            <td class="num">${money(l.lineTotal, inv.currency)}</td>
          </tr>`).join("")}
      </tbody>
    </table></div>
    <details><summary>Raw JSON</summary><pre>${esc(JSON.stringify(inv, null, 2))}</pre></details>
  `;
}
