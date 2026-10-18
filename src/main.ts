// The demo app: a components list (the installer's database) and an import flow
// (upload -> read -> match -> review -> confirm). Plain DOM, re-rendered from state.

import { extractInvoice, checkTotals } from "./extract.ts";
import { costUsd } from "./cost.ts";
import { matchInvoice } from "./match.ts";
import { resolveWithAI } from "./resolve.ts";
import { applyPlan, choose, initialDecisions, planChanges, usualMarkup, type LineDecision, type Plan } from "./review.ts";
import { JsonStore } from "./store.ts";
import type {
  CatalogItem, ComponentType, ExtractedInvoice, InvoiceFile, LineMatch, MyComponent, Usage,
} from "./types.ts";

const SAMPLES = [
  { label: "Invoice 1 · PDF", path: "samples/invoice-NRS-24817.pdf" },
  { label: "Invoice 1 · photo", path: "samples/invoice-NRS-24817-photo.jpg" },
  { label: "Invoice 2 · PDF", path: "samples/invoice-NRS-25033.pdf" },
  { label: "Invoice 2 · photo", path: "samples/invoice-NRS-25033-photo.jpg" },
];

const TYPE_LABEL: Record<ComponentType, string> = {
  heat_pump: "Heat pump", hot_water_cylinder: "Hot water cylinder", battery: "Battery", inverter: "Inverter",
  pv_module: "PV module", optimiser: "Optimiser", ev_charger: "EV charger", accessory: "Accessory", service: "Service",
};

const MATCHED_BY_LABEL: Record<string, string> = {
  supplier_code: "Supplier code", manufacturer_article_no: "Article no.", my_article_no: "Your article no.", ai: "AI match",
};

const store = new JsonStore();
const app = document.getElementById("app")!;

// ---------- State ----------

interface Review {
  fileName: string;
  invoice: ExtractedInvoice;
  matches: LineMatch[];
  decisions: LineDecision[];
  catalog: CatalogItem[];
  mine: MyComponent[];
  markup: number;
  seconds: number;
  costUsd: number;
  warnings: string[];
}

type State =
  | { view: "components"; flash?: string; freshIds?: Set<string> }
  | { view: "upload"; error?: string }
  | { view: "processing"; fileName: string; step: 0 | 1 | 2 }
  | { view: "review"; review: Review; error?: string; saving?: boolean };

let state: State = { view: location.hash === "#import" ? "upload" : "components" };

function setState(next: State) {
  state = next;
  const hash = next.view === "components" ? "#components" : "#import";
  if (location.hash !== hash) history.replaceState(null, "", hash);
  render();
}

// ---------- Helpers ----------

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const money = (n: number, cur = "GBP") => {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur || "GBP" }).format(n); }
  catch { return n.toFixed(2); }
};
const pct = (n: number) => `${Math.round(n * 100)}%`;
const margin = (purchase: number, sales: number) => (sales > 0 ? (sales - purchase) / sales : 0);
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

function specPills(specs: Record<string, unknown>, max = 4) {
  const label = (k: string) => k.replace(/([A-Z])/g, " $1").toLowerCase();
  return Object.entries(specs).slice(0, max)
    .map(([k, v]) => `<span class="pill">${esc(label(k))}: ${esc(Array.isArray(v) ? v.join(", ") : v)}</span>`).join("");
}

function apiKey(): string | null {
  return (document.getElementById("api-key") as HTMLInputElement).value.trim() || null;
}

// ---------- Components view ----------

async function renderComponents(s: Extract<State, { view: "components" }>) {
  const mine = await store.getMyComponents();
  const rows = [...mine].sort((a, b) =>
    Number(s.freshIds?.has(b.id) ?? 0) - Number(s.freshIds?.has(a.id) ?? 0) || a.type.localeCompare(b.type));
  app.innerHTML = `
    <div class="page-head">
      <div><h1>Components</h1><p class="sub">${plural(mine.length, "component")} in your database</p></div>
      <span class="spacer"></span>
      <button class="btn primary" data-go="upload">Import from invoice</button>
    </div>
    ${s.flash ? `<div class="banner ok">${s.flash}</div>` : ""}
    <div class="card table-wrap"><table>
      <thead><tr><th>Name</th><th>Type</th><th>Article no.</th><th class="num">Purchase</th><th class="num">Sales</th><th class="num">Margin</th><th>Source</th><th>Updated</th></tr></thead>
      <tbody>${rows.map((c) => `
        <tr class="${s.freshIds?.has(c.id) ? "fresh" : ""}">
          <td class="name-cell"><div class="model">${esc(c.name)}</div><div class="brand">${esc(c.manufacturer ?? "No brand")}</div></td>
          <td><span class="pill type">${TYPE_LABEL[c.type] ?? esc(c.type)}</span></td>
          <td class="line-ref">${esc(c.articleNo ?? "—")}</td>
          <td class="num">${c.purchasePrice ? money(c.purchasePrice) : "—"}</td>
          <td class="num">${money(c.salesPrice)}</td>
          <td class="num">${c.purchasePrice ? pct(margin(c.purchasePrice, c.salesPrice)) : "—"}</td>
          <td>${c.source === "invoice" ? `<span class="pill accent">Invoice</span>` : c.source === "catalog" ? "Catalog" : "Manual"}</td>
          <td class="muted">${esc(c.updatedAt)}</td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
}

// ---------- Upload view ----------

function renderUpload(s: Extract<State, { view: "upload" }>) {
  app.innerHTML = `
    <div class="page-head">
      <div><h1>Import from invoice</h1><p class="sub">Upload a supplier invoice. We read every line, match it to your components and the Reonic catalog, and you confirm.</p></div>
    </div>
    ${s.error ? `<div class="banner error">${esc(s.error)}</div>` : ""}
    <label class="drop" id="drop">
      <strong>Drop a PDF or photo here, or click to choose</strong>
      <span class="muted">PDF, JPG, PNG or WebP</span>
      <input id="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden />
    </label>
    <div class="samples">
      <span class="muted">or try a sample:</span>
      ${SAMPLES.map((x, i) => `<button class="btn" data-sample="${i}">${esc(x.label)}</button>`).join("")}
    </div>
    <div class="how">
      <div class="card"><b>1 · Read</b><span class="muted">AI reads codes, descriptions, quantities and prices from the invoice.</span></div>
      <div class="card"><b>2 · Match</b><span class="muted">Known codes match instantly. AI only decides the rest, and asks when unsure.</span></div>
      <div class="card"><b>3 · Confirm</b><span class="muted">You review, adjust prices and add everything in one click.</span></div>
    </div>`;

  const drop = document.getElementById("drop")!;
  const input = document.getElementById("file") as HTMLInputElement;
  input.addEventListener("change", () => { const f = input.files?.[0]; if (f) process(f.name, f); });
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files[0];
    if (f) process(f.name, f);
  });
}

// ---------- Processing ----------

async function toInvoiceFile(blob: Blob): Promise<InvoiceFile> {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
  const mediaType = allowed.find((t) => t === blob.type);
  if (!mediaType) throw new Error(`Unsupported file type: ${blob.type || "unknown"}. Use a PDF, JPG, PNG or WebP.`);
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  return { base64: dataUrl.split(",")[1], mediaType };
}

async function process(fileName: string, blob: Blob) {
  const started = performance.now();
  try {
    setState({ view: "processing", fileName, step: 0 });
    const key = apiKey();
    const extraction = await extractInvoice(key, await toInvoiceFile(blob));

    setState({ view: "processing", fileName, step: 1 });
    const [catalog, mine] = await Promise.all([store.getCatalog(), store.getMyComponents()]);
    const byRules = matchInvoice(extraction.invoice, catalog, mine);

    setState({ view: "processing", fileName, step: 2 });
    const resolved = await resolveWithAI(key, byRules, catalog, mine);

    const markup = usualMarkup(mine);
    const usage: Usage[] = [extraction.usage, ...(resolved.usage ? [resolved.usage] : [])];
    const warnings = checkTotals(extraction.invoice);
    if (extraction.invoice.readabilityIssues) warnings.unshift(extraction.invoice.readabilityIssues);
    setState({
      view: "review",
      review: {
        fileName, invoice: extraction.invoice, matches: resolved.matches,
        decisions: initialDecisions(resolved.matches, catalog, markup),
        catalog, mine, markup, warnings,
        seconds: (performance.now() - started) / 1000,
        costUsd: usage.reduce((sum, u) => sum + (costUsd(extraction.model, u) ?? 0), 0),
      },
    });
  } catch (err) {
    setState({ view: "upload", error: err instanceof Error ? err.message : String(err) });
  }
}

function renderProcessing(s: Extract<State, { view: "processing" }>) {
  const steps = ["Reading the invoice", "Matching known codes", "Checking the rest with AI"];
  app.innerHTML = `
    <div class="page-head"><div><h1>Import from invoice</h1><p class="sub">${esc(s.fileName)}</p></div></div>
    <div class="card progress">
      <h2>Working on it…</h2>
      <ol class="steps">${steps.map((label, i) => `
        <li class="${i < s.step ? "done" : i === s.step ? "active" : ""}"><span class="dot">${i < s.step ? "✓" : ""}</span>${label}</li>`).join("")}
      </ol>
    </div>`;
}

// ---------- Review view ----------

function lineHead(m: LineMatch, cur: string) {
  return `<div class="line-ref">${esc(m.line.code || "no code")} · ${esc(m.line.description)} · ${m.line.quantity} × ${money(m.line.unitPrice, cur)}</div>`;
}

function salesInput(i: number, d: LineDecision, purchase: number, inline = false) {
  const tag = inline ? "span" : "div";
  return `<input type="number" min="0" step="1" value="${d.salesPrice}" data-field="salesPrice" data-i="${i}" aria-label="Sales price" />
    <${tag} class="margin" data-margin="${i}">${pct(margin(purchase, d.salesPrice))} margin</${tag}>`;
}

function renderDecisions(r: Review, idx: number[]) {
  const cur = r.invoice.currency;
  return idx.map((i) => {
    const m = r.matches[i];
    const d = r.decisions[i];
    const options = m.candidates.map((c) => {
      const item = r.catalog.find((x) => x.id === c.catalogId);
      if (!item) return "";
      const owned = r.mine.find((x) => x.catalogRef === item.id);
      return `<label class="option ${d.choice === item.id ? "selected" : ""}">
        <input type="radio" name="choice-${i}" value="${esc(item.id)}" data-choose="${i}" ${d.choice === item.id ? "checked" : ""} />
        <div><div><b>${esc(item.manufacturer)} ${esc(item.model)}</b> <span class="line-ref">${esc(item.manufacturerArticleNo)}</span>
          ${owned ? `<span class="pill">Already in your database</span>` : ""}</div>
          <div class="specs">${specPills(item.specs)}</div></div>
      </label>`;
    }).join("");
    return `<div class="decision">
      ${lineHead(m, cur)}
      <div class="reason">${esc(m.reason)}</div>
      <div class="options">
        ${options}
        <label class="option ${d.choice === "new" ? "selected" : ""}">
          <input type="radio" name="choice-${i}" value="new" data-choose="${i}" ${d.choice === "new" ? "checked" : ""} />
          <div><b>None of these</b> <span class="muted">· add as a new product</span></div>
        </label>
      </div>
      ${d.choice ? `<div class="hint sales-row">Sales price ${salesInput(i, d, m.line.unitPrice, true)}</div>` : ""}
    </div>`;
  }).join("");
}

function renderNew(r: Review, idx: number[]) {
  const cur = r.invoice.currency;
  return `<div class="table-wrap"><table>
    <thead><tr><th></th><th>Name</th><th>Manufacturer</th><th>Type</th><th class="num">Purchase</th><th class="num">Sales</th></tr></thead>
    <tbody>${idx.map((i) => {
      const m = r.matches[i];
      const d = r.decisions[i];
      const specs = m.suggestion?.specs ?? [];
      return `<tr class="${d.include ? "" : "off"}">
        <td><input type="checkbox" data-include="${i}" ${d.include ? "checked" : ""} aria-label="Include" /></td>
        <td><input type="text" value="${esc(d.name)}" data-field="name" data-i="${i}" aria-label="Name" />
          ${lineHead(m, cur)}
          ${specs.length ? `<div class="specs">${specs.map((s) => `<span class="pill">${esc(s.name)}: ${esc(s.value)}</span>`).join("")}</div>` : ""}</td>
        <td><input type="text" value="${esc(d.manufacturer)}" placeholder="Unknown" data-field="manufacturer" data-i="${i}" aria-label="Manufacturer" /></td>
        <td><select data-field="type" data-i="${i}" aria-label="Type">${(Object.keys(TYPE_LABEL) as ComponentType[]).map((t) =>
          `<option value="${t}" ${d.type === t ? "selected" : ""}>${TYPE_LABEL[t]}</option>`).join("")}</select></td>
        <td class="num">${money(m.line.unitPrice, cur)}</td>
        <td class="num">${salesInput(i, d, m.line.unitPrice)}</td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
}

function renderPriceChanges(r: Review, idx: number[]) {
  const cur = r.invoice.currency;
  return `<div class="table-wrap"><table>
    <thead><tr><th></th><th>Component</th><th class="num">Was</th><th class="num">Now</th><th class="num">Your sales price</th></tr></thead>
    <tbody>${idx.map((i) => {
      const m = r.matches[i];
      const d = r.decisions[i];
      const c = r.mine.find((x) => x.id === m.myComponentId);
      if (!c) return "";
      const before = margin(c.purchasePrice, c.salesPrice);
      const after = margin(m.line.unitPrice, c.salesPrice);
      return `<tr class="${d.include ? "" : "off"}">
        <td><input type="checkbox" data-include="${i}" ${d.include ? "checked" : ""} aria-label="Update price" /></td>
        <td class="name-cell"><div class="model">${esc(c.name)}</div><div class="brand">${esc(c.manufacturer)}</div>${lineHead(m, cur)}</td>
        <td class="num">${money(c.purchasePrice, cur)}</td>
        <td class="num"><b>${money(m.line.unitPrice, cur)}</b><div class="margin">${m.line.unitPrice > c.purchasePrice ? "+" : ""}${pct((m.line.unitPrice - c.purchasePrice) / c.purchasePrice)}</div></td>
        <td class="num">${money(c.salesPrice, cur)}<div class="margin">margin ${pct(before)} → <span class="${after < before ? "pill amber" : ""}">${pct(after)}</span></div></td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
}

function renderCatalogMatches(r: Review, idx: number[]) {
  const cur = r.invoice.currency;
  return `<div class="table-wrap"><table>
    <thead><tr><th></th><th>Component</th><th>Matched by</th><th class="num">Purchase</th><th class="num">Sales</th></tr></thead>
    <tbody>${idx.map((i) => {
      const m = r.matches[i];
      const d = r.decisions[i];
      const item = r.catalog.find((x) => x.id === m.catalogId);
      return `<tr class="${d.include ? "" : "off"}">
        <td><input type="checkbox" data-include="${i}" ${d.include ? "checked" : ""} aria-label="Include" /></td>
        <td class="name-cell"><div class="model">${esc(d.name)}</div><div class="brand">${esc(d.manufacturer)} · ${TYPE_LABEL[d.type]}</div>
          ${item ? `<div class="specs">${specPills(item.specs, 3)}</div>` : ""}${lineHead(m, cur)}</td>
        <td><span class="pill ${m.matchedBy === "ai" ? "accent" : "green"}">${MATCHED_BY_LABEL[m.matchedBy ?? ""] ?? "Match"}</span>
          <div class="reason">${esc(m.reason)}</div></td>
        <td class="num">${money(m.line.unitPrice, cur)}</td>
        <td class="num">${salesInput(i, d, m.line.unitPrice)}</td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
}

function renderPlainList(r: Review, idx: number[]) {
  return `<div class="table-wrap"><table><tbody>${idx.map((i) => {
    const m = r.matches[i];
    return `<tr><td>${lineHead(m, r.invoice.currency)}<div class="reason">${esc(m.reason)}</div></td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function confirmLabel(plan: Plan) {
  const parts = [];
  if (plan.add.length) parts.push(`Add ${plural(plan.add.length, "component")}`);
  if (plan.priceUpdates.length) parts.push(`update ${plural(plan.priceUpdates.length, "price")}`);
  return parts.length ? parts.join(" · ").replace(/^./, (c) => c.toUpperCase()) : "Nothing to add";
}

function currentPlan(r: Review) {
  return planChanges(r.invoice, r.matches, r.decisions, r.catalog, r.mine);
}

function renderConfirmBar(r: Review, saving = false) {
  const plan = currentPlan(r);
  const blocked = plan.undecided.length > 0;
  const empty = !plan.add.length && !plan.priceUpdates.length;
  const bar = document.getElementById("confirm-bar");
  if (!bar) return;
  bar.innerHTML = `
    <span class="what">${blocked
      ? `<span class="pill red">${plural(plan.undecided.length, "line needs", "lines need")} your decision</span>`
      : plan.aliases.length ? `Remembers ${plural(plan.aliases.length, "supplier code")} so next time they match instantly` : ""}</span>
    <button class="btn" data-go="upload">Cancel</button>
    <button class="btn primary" id="confirm" ${blocked || empty || saving ? "disabled" : ""}>${saving ? "Saving…" : confirmLabel(plan)}</button>`;
}

function renderReview(s: Extract<State, { view: "review" }>) {
  const r = s.review;
  const by = (pred: (m: LineMatch) => boolean) => r.matches.map((m, i) => (pred(m) ? i : -1)).filter((i) => i >= 0);
  const decide = by((m) => m.status === "needs_review");
  const fresh = by((m) => m.status === "new");
  const prices = by((m) => m.status === "duplicate_price_change");
  const matched = by((m) => m.status === "catalog_match");
  const same = by((m) => m.status === "duplicate_no_change");
  const ignored = by((m) => m.status === "ignored");

  const section = (title: string, note: string, body: string, n: number) => n ? `
    <section class="card section"><div class="section-head"><h2>${title}</h2><span class="muted">${note}</span></div>${body}</section>` : "";
  const collapsed = (title: string, note: string, body: string, n: number) => n ? `
    <details class="card section collapsed"><summary><h2>${title}</h2><span class="muted">${note}</span></summary>${body}</details>` : "";

  app.innerHTML = `
    <div class="page-head">
      <div><h1>Review invoice ${esc(r.invoice.invoiceNumber)}</h1>
        <p class="sub">${esc(r.invoice.supplierName)} · ${esc(r.invoice.invoiceDate)} · ${plural(r.matches.length, "line")} · net ${money(r.invoice.netTotal, r.invoice.currency)}</p></div>
      <span class="spacer"></span>
      <span class="muted">Read and matched in ${r.seconds.toFixed(0)}s${r.costUsd ? ` · ≈ $${r.costUsd.toFixed(3)}` : ""}</span>
    </div>
    ${s.error ? `<div class="banner error">${esc(s.error)}</div>` : ""}
    ${r.warnings.map((w) => `<div class="banner warn">${esc(w)}</div>`).join("")}
    <div class="summary">
      ${decide.length ? `<span class="pill red">${decide.length} to decide</span>` : ""}
      ${fresh.length ? `<span class="pill blue">${fresh.length} new</span>` : ""}
      ${prices.length ? `<span class="pill amber">${plural(prices.length, "price change")}</span>` : ""}
      ${matched.length ? `<span class="pill green">${matched.length} from catalog</span>` : ""}
      ${same.length ? `<span class="pill">${same.length} up to date</span>` : ""}
      ${ignored.length ? `<span class="pill">${ignored.length} ignored</span>` : ""}
    </div>
    ${section("Needs your decision", "More than one product fits. Pick the right one.", renderDecisions(r, decide), decide.length)}
    ${section("New products", "Not in the catalog. Pre-filled from the invoice; check the details.", renderNew(r, fresh), fresh.length)}
    ${section("Price changes", "Already in your database at a different purchase price.", renderPriceChanges(r, prices), prices.length)}
    ${section("From the Reonic catalog", "Full specs and datasheets come with these.", renderCatalogMatches(r, matched), matched.length)}
    ${collapsed("Already up to date", plural(same.length, "line"), renderPlainList(r, same), same.length)}
    ${collapsed("Ignored", "Consumables and delivery", renderPlainList(r, ignored), ignored.length)}
    <div class="confirm-bar" id="confirm-bar"></div>`;
  renderConfirmBar(r, s.saving);
}

// ---------- Events ----------

app.addEventListener("click", async (e) => {
  const t = e.target as HTMLElement;
  const go = t.closest<HTMLElement>("[data-go]")?.dataset.go;
  if (go === "upload") return setState({ view: "upload" });

  const sample = t.closest<HTMLElement>("[data-sample]")?.dataset.sample;
  if (sample !== undefined) {
    const s = SAMPLES[Number(sample)];
    const res = await fetch(s.path);
    return process(s.label, await res.blob());
  }

  if (t.id === "confirm" && state.view === "review") {
    const r = state.review;
    const plan = currentPlan(r);
    setState({ ...state, saving: true });
    try {
      await applyPlan(store, plan);
      const bits = [
        plan.add.length && `Added ${plural(plan.add.length, "component")}`,
        plan.priceUpdates.length && `updated ${plural(plan.priceUpdates.length, "price")}`,
        plan.aliases.length && `learned ${plural(plan.aliases.length, "supplier code")}`,
      ].filter(Boolean).join(" · ");
      setState({
        view: "components",
        flash: `${esc(bits)} from invoice ${esc(r.invoice.invoiceNumber)}.`,
        freshIds: new Set([...plan.add.map((c) => c.id), ...plan.priceUpdates.map((p) => p.myComponentId)]),
      });
    } catch (err) {
      setState({ view: "review", review: r, error: err instanceof Error ? err.message : String(err) });
    }
  }
});

app.addEventListener("change", (e) => {
  if (state.view !== "review") return;
  const r = state.review;
  const t = e.target as HTMLInputElement;

  if (t.dataset.include !== undefined) {
    const i = Number(t.dataset.include);
    r.decisions[i] = { ...r.decisions[i], include: t.checked };
    return render();
  }
  if (t.dataset.choose !== undefined) {
    const i = Number(t.dataset.choose);
    r.decisions[i] = choose(r.decisions[i], r.matches[i], t.value, r.catalog, r.markup);
    return render();
  }
  if (t.dataset.field === "type") {
    const i = Number(t.dataset.i);
    r.decisions[i] = { ...r.decisions[i], type: t.value as ComponentType };
    renderConfirmBar(r);
  }
});

// Text and number fields update state without a re-render, so typing keeps focus.
app.addEventListener("input", (e) => {
  if (state.view !== "review") return;
  const r = state.review;
  const t = e.target as HTMLInputElement;
  const i = Number(t.dataset.i);
  if (t.dataset.field === "name" || t.dataset.field === "manufacturer") {
    r.decisions[i] = { ...r.decisions[i], [t.dataset.field]: t.value };
  } else if (t.dataset.field === "salesPrice") {
    const value = Number(t.value) || 0;
    r.decisions[i] = { ...r.decisions[i], salesPrice: value };
    const el = app.querySelector(`[data-margin="${i}"]`);
    if (el) el.textContent = `${pct(margin(r.matches[i].line.unitPrice, value))} margin`;
  }
  renderConfirmBar(r);
});

// ---------- Sidebar ----------

const keyInput = document.getElementById("api-key") as HTMLInputElement;
const rememberBox = document.getElementById("remember-key") as HTMLInputElement;
const KEY_STORAGE = "invoice-demo-api-key";
try {
  const saved = localStorage.getItem(KEY_STORAGE);
  if (saved) { keyInput.value = saved; rememberBox.checked = true; }
} catch { /* storage unavailable */ }
function persistKey() {
  try {
    if (rememberBox.checked && keyInput.value) localStorage.setItem(KEY_STORAGE, keyInput.value);
    else localStorage.removeItem(KEY_STORAGE);
  } catch { /* ignore */ }
}
keyInput.addEventListener("input", persistKey);
rememberBox.addEventListener("change", persistKey);

document.getElementById("reset")!.addEventListener("click", async () => {
  await store.reset();
  setState({ view: "components", flash: "Demo data reset to the original 8 components." });
});

window.addEventListener("hashchange", () => {
  const want = location.hash === "#import" ? "upload" : "components";
  if (want === "upload" && (state.view === "processing" || state.view === "review")) return;
  if (state.view !== want) setState({ view: want } as State);
});

// ---------- Render ----------

async function render() {
  const nav = state.view === "components" ? "components" : "import";
  document.querySelectorAll<HTMLElement>("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === nav));
  document.getElementById("nav-count")!.textContent = String((await store.getMyComponents()).length);

  switch (state.view) {
    case "components": return renderComponents(state);
    case "upload": return renderUpload(state);
    case "processing": return renderProcessing(state);
    case "review": return renderReview(state);
  }
}

render();
