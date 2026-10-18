// Test bench: pick an invoice, extract it, match the lines, show the outcome per line.
// This page is temporary scaffolding; the real upload -> review -> confirm UI comes later.

import { extractInvoice, checkTotals } from "./extract.ts";
import { costUsd } from "./cost.ts";
import { matchInvoice } from "./match.ts";
import { resolveWithAI, type ResolveResult } from "./resolve.ts";
import { JsonStore } from "./store.ts";
import type { CatalogItem, InvoiceFile, ExtractionResult, LineMatch, MatchStatus } from "./types.ts";

const store = new JsonStore();

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
  runBtn.disabled = !selected;
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
    const apiKey = keyInput.value.trim() || null;
    const file = await toInvoiceFile(selected.blob);
    const result = await extractInvoice(apiKey, file);
    showStatus(`Read ${result.invoice.lines.length} lines. Matching…`);
    const [catalog, mine] = await Promise.all([store.getCatalog(), store.getMyComponents()]);
    const resolved = await resolveWithAI(apiKey, matchInvoice(result.invoice, catalog, mine), catalog, mine);
    statusEl.hidden = true;
    render(result, resolved, catalog);
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

const STATUS_LABEL: Record<MatchStatus, string> = {
  catalog_match: "Catalog match",
  duplicate_no_change: "Already have",
  duplicate_price_change: "Price changed",
  needs_review: "Needs review",
  new: "New",
  ignored: "Ignored",
};

function outcome(m: LineMatch, catalog: CatalogItem[], currency: string): string {
  const name = (id: string) => {
    const c = catalog.find((x) => x.id === id);
    return c ? `${c.manufacturer} ${c.model}` : id;
  };
  let detail = "";
  if (m.catalogId && m.status !== "needs_review") detail = name(m.catalogId);
  if (m.status === "duplicate_price_change" && m.previousPrice !== undefined) {
    detail += ` · ${money(m.previousPrice, currency)} → ${money(m.line.unitPrice, currency)}`;
  }
  if (m.status === "needs_review") detail = m.candidates.map((c) => name(c.catalogId)).join(" or ");
  if (m.suggestion) {
    const s = m.suggestion;
    detail = [s.manufacturer, s.model].filter(Boolean).join(" ") + ` (${s.type.replace(/_/g, " ")})`;
  }
  const by = m.matchedBy ? ` <span class="by">${m.matchedBy === "ai" ? "AI" : m.matchedBy.replace(/_/g, " ")}</span>` : "";
  return `<span class="chip ${m.status}">${STATUS_LABEL[m.status]}</span>${by}
    ${detail ? `<div class="detail">${esc(detail)}</div>` : ""}
    <div class="guess">${esc(m.reason)}</div>`;
}

function render(r: ExtractionResult, resolved: ResolveResult, catalog: CatalogItem[]) {
  const inv = r.invoice;
  const matchCost = resolved.usage ? costUsd(r.model, resolved.usage) ?? 0 : 0;
  const cost = (costUsd(r.model, r.usage) ?? 0) + matchCost;
  const seconds = (r.durationMs + resolved.durationMs) / 1000;
  const warnings = checkTotals(inv);
  if (inv.readabilityIssues) warnings.unshift(`Model notes: ${inv.readabilityIssues}`);

  outputEl.innerHTML = `
    <div class="meta">
      <span><b>${esc(inv.supplierName)}</b></span>
      <span>Invoice <b>${esc(inv.invoiceNumber)}</b></span>
      <span>${esc(inv.invoiceDate)}</span>
      <span><b>${inv.lines.length}</b> lines</span>
      <span>Net <b>${money(inv.netTotal, inv.currency)}</b></span>
      <span>${seconds.toFixed(1)} s</span>
      <span>≈ $${cost.toFixed(3)}</span>
    </div>
    ${warnings.map((w) => `<div class="warn">${esc(w)}</div>`).join("")}
    <div class="table-wrap"><table>
      <thead><tr><th>Code</th><th>Description</th><th>Outcome</th><th class="num">Qty</th><th class="num">Unit</th></tr></thead>
      <tbody>
        ${resolved.matches.map(({ line: l }, i) => `
          <tr>
            <td>${esc(l.code) || "—"}</td>
            <td>${esc(l.description)}
              ${l.manufacturerGuess || l.modelGuess ? `<div class="guess">${esc([l.manufacturerGuess, l.modelGuess].filter(Boolean).join(" · "))}</div>` : ""}</td>
            <td class="outcome">${outcome(resolved.matches[i], catalog, inv.currency)}</td>
            <td class="num">${l.quantity}</td>
            <td class="num">${money(l.unitPrice, inv.currency)}</td>
          </tr>`).join("")}
      </tbody>
    </table></div>
    <details><summary>Raw JSON</summary><pre>${esc(JSON.stringify(inv, null, 2))}</pre></details>
  `;
}
