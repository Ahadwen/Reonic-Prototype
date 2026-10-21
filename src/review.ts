// Step 4 of the pipeline: what the installer decides on the review screen, and what that changes.
// Pure functions over plain data, so the rules here can be tested without a browser.

import type {
  CatalogItem, ComponentType, ExtractedInvoice, LineMatch, MyComponent, SupplierAlias,
} from "./types.ts";
import type { Store } from "./store.ts";

// What the installer has decided for one invoice line.
export interface LineDecision {
  include: boolean;
  // needs_review only: the chosen catalog item, "new" to create a record instead, or null while undecided.
  choice: string | "new" | null;
  // The record to create. Pre-filled from the catalog or the AI's reading; editable for new products.
  name: string;
  manufacturer: string;
  type: ComponentType;
  salesPrice: number;
}

export interface PriceUpdate {
  myComponentId: string;
  name: string;
  from: number;
  to: number;
}

export interface Plan {
  add: MyComponent[];
  priceUpdates: PriceUpdate[];
  aliases: { catalogId: string; alias: SupplierAlias }[];
  undecided: number[];   // line indexes still waiting on a choice
}

// The installer's usual markup, taken from the products already in their database.
// Falls back to 35% when there's nothing to learn from.
export function usualMarkup(mine: MyComponent[]): number {
  const ratios = mine
    .filter((c) => c.type !== "service" && c.purchasePrice > 0 && c.salesPrice > 0)
    .map((c) => c.salesPrice / c.purchasePrice - 1)
    .sort((a, b) => a - b);
  if (!ratios.length) return 0.35;
  return Math.round(ratios[Math.floor(ratios.length / 2)] * 100) / 100;
}

export const suggestedSalesPrice = (purchasePrice: number, markup: number) =>
  Math.round(purchasePrice * (1 + markup));

function fromCatalog(item: CatalogItem, unitPrice: number, markup: number): Omit<LineDecision, "include" | "choice"> {
  return { name: item.model, manufacturer: item.manufacturer, type: item.type, salesPrice: suggestedSalesPrice(unitPrice, markup) };
}

export function initialDecisions(matches: LineMatch[], catalog: CatalogItem[], markup: number): LineDecision[] {
  return matches.map((m): LineDecision => {
    const item = m.catalogId ? catalog.find((c) => c.id === m.catalogId) : undefined;
    const base: LineDecision = {
      include: false, choice: null,
      name: m.line.description, manufacturer: "", type: "accessory",
      salesPrice: suggestedSalesPrice(m.line.unitPrice, markup),
    };
    switch (m.status) {
      case "catalog_match":
        return item ? { ...base, include: true, ...fromCatalog(item, m.line.unitPrice, markup) } : { ...base, include: true };
      case "duplicate_price_change":
        return { ...base, include: true };
      case "needs_review":
        return { ...base, include: true };
      case "new": {
        const s = m.suggestion;
        return {
          ...base,
          include: true,
          name: s?.model || m.line.description,
          manufacturer: s?.manufacturer ?? "",
          type: s?.type ?? (m.line.kind === "service" ? "service" : "accessory"),
        };
      }
      default:
        return base;
    }
  });
}

// Picking a candidate (or "create new") on a needs_review line re-fills the record from that choice.
export function choose(
  d: LineDecision, m: LineMatch, choice: string | "new", catalog: CatalogItem[], markup: number,
): LineDecision {
  if (choice === "new") {
    const s = m.suggestion;
    return { ...d, choice, name: s?.model || m.line.description, manufacturer: s?.manufacturer ?? "", type: s?.type ?? "accessory" };
  }
  const item = catalog.find((c) => c.id === choice);
  return item ? { ...d, choice, ...fromCatalog(item, m.line.unitPrice, markup) } : d;
}

const today = () => new Date().toISOString().slice(0, 10);
const newId = () => `my-${crypto.randomUUID().slice(0, 8)}`;

export function planChanges(
  invoice: Pick<ExtractedInvoice, "supplierName">,
  matches: LineMatch[],
  decisions: LineDecision[],
  catalog: CatalogItem[],
  mine: MyComponent[],
): Plan {
  const plan: Plan = { add: [], priceUpdates: [], aliases: [], undecided: [] };

  const updatePrice = (c: MyComponent, to: number) => {
    if (Math.abs(c.purchasePrice - to) > 0.005 && !plan.priceUpdates.some((p) => p.myComponentId === c.id)) {
      plan.priceUpdates.push({ myComponentId: c.id, name: c.name, from: c.purchasePrice, to });
    }
  };
  // Teach the catalog this supplier's code, so next time the rules match it without AI.
  const learnAlias = (m: LineMatch, catalogId: string) => {
    if (!m.line.code || m.matchedBy === "supplier_code") return;
    plan.aliases.push({ catalogId, alias: { supplier: invoice.supplierName, code: m.line.code, description: m.line.description } });
  };

  matches.forEach((m, i) => {
    const d = decisions[i];
    if (!d.include) return;
    const line = m.line;

    switch (m.status) {
      case "duplicate_price_change": {
        const c = mine.find((x) => x.id === m.myComponentId);
        if (c) updatePrice(c, line.unitPrice);
        if (m.catalogId) learnAlias(m, m.catalogId);
        return;
      }
      case "duplicate_no_change":
      case "ignored":
        return;
    }

    let catalogId: string | null = null;
    if (m.status === "catalog_match") catalogId = m.catalogId ?? null;
    if (m.status === "needs_review") {
      if (d.choice === null) { plan.undecided.push(i); return; }
      catalogId = d.choice === "new" ? null : d.choice;
    }

    const item = catalogId ? catalog.find((c) => c.id === catalogId) : undefined;
    if (item) {
      learnAlias(m, item.id);
      // A person picked something already in their database: treat it as a price check, not a new record.
      const existing = mine.find((c) => c.catalogRef === item.id);
      if (existing) { updatePrice(existing, line.unitPrice); return; }
    }

    plan.add.push({
      id: newId(),
      name: d.name.trim() || line.description,
      type: d.type,
      manufacturer: d.manufacturer.trim() || null,
      articleNo: item?.manufacturerArticleNo ?? (line.code || null),
      purchasePrice: line.unitPrice,
      salesPrice: d.salesPrice,
      catalogRef: item?.id ?? null,
      specs: item
        ? structuredClone(item.specs)
        : Object.fromEntries((m.suggestion?.specs ?? []).map((s) => [s.name, s.value])),
      source: "invoice",
      updatedAt: today(),
    });
  });

  return plan;
}

export async function applyPlan(store: Store, plan: Plan): Promise<void> {
  if (plan.undecided.length) throw new Error("Some lines still need a decision.");
  await store.saveComponents(plan.add);
  for (const p of plan.priceUpdates) await store.updatePrice(p.myComponentId, p.to);
  for (const a of plan.aliases) await store.addSupplierAlias(a.catalogId, a.alias);
}

// ---- What an import achieved, for the result card ----

// Rough time to type one component in by hand (name, article no., prices, specs) and to update a price.
// Assumptions for the estimate, shown next to it in the UI.
export const MANUAL_MINUTES_PER_COMPONENT = 3;
export const MANUAL_MINUTES_PER_PRICE_UPDATE = 1;

export interface ImportSummary {
  invoiceNumber: string;
  supplierName: string;
  lines: number;
  added: number;
  priceUpdates: PriceUpdate[];
  codesLearned: number;
  // How the lines that changed something were settled.
  byRule: number;       // supplier code or article number, no AI
  byAI: number;         // the AI picked from the shortlist
  byYou: number;        // the installer chose between candidates
  created: number;      // new products not in the catalog
  ignored: number;      // consumables, delivery
  skipped: number;      // lines the installer unticked
  minutesSaved: number;
}

export function summarise(
  invoice: Pick<ExtractedInvoice, "invoiceNumber" | "supplierName">,
  matches: LineMatch[],
  decisions: LineDecision[],
  plan: Plan,
): ImportSummary {
  const s: ImportSummary = {
    invoiceNumber: invoice.invoiceNumber, supplierName: invoice.supplierName, lines: matches.length,
    added: plan.add.length, priceUpdates: plan.priceUpdates, codesLearned: plan.aliases.length,
    byRule: 0, byAI: 0, byYou: 0, created: 0, ignored: 0, skipped: 0, minutesSaved: 0,
  };
  matches.forEach((m, i) => {
    const d = decisions[i];
    if (m.status === "ignored") { s.ignored++; return; }
    if (m.status === "duplicate_no_change") return;
    if (!d.include) { s.skipped++; return; }
    if (m.status === "new" || (m.status === "needs_review" && d.choice === "new")) s.created++;
    else if (m.status === "needs_review") s.byYou++;
    else if (m.matchedBy === "ai") s.byAI++;
    else s.byRule++;
  });
  s.minutesSaved = s.added * MANUAL_MINUTES_PER_COMPONENT + s.priceUpdates.length * MANUAL_MINUTES_PER_PRICE_UPDATE;
  return s;
}
