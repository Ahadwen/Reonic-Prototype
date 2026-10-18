// Step 2 of the pipeline: invoice lines -> catalog / installer database, using fixed rules only.
//
// Order, cheapest and surest first:
//   1. consumables and delivery are ignored
//   2. supplier code seen before for this supplier      -> catalog item
//   3. code equals a manufacturer article number         -> catalog item
//   4. code equals an article number in my database      -> my component
//   5. otherwise build a shortlist by text overlap; the AI step (or a person) picks from it
// Anything matched is then checked against the installer's own database for duplicates and price changes.


import type {
  Candidate, CatalogItem, ExtractedInvoice, InvoiceLine, LineMatch, MyComponent,
} from "./types.ts";

const SHORTLIST_SIZE = 5;
const PRICE_TOLERANCE = 0.005;

// Wholesaler shorthand that prefix matching can't recover. Grows as invoices come in.
const ABBREVIATIONS: Record<string, string> = {
  blk: "black", wht: "white", batt: "battery", bat: "battery", cyl: "cylinder",
  mono: "monobloc", teth: "tethered", unteth: "untethered", opt: "optimiser",
  mitsu: "mitsubishi", ashp: "heat pump", hp: "heat pump", inv: "inverter",
};

// Generic words that say nothing about which product it is.
const STOPWORDS = new Set(["the", "and", "with", "for", "kit", "unit", "r32", "r290", "uk"]);

const normCode = (s: string | null | undefined) => (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const normSupplier = (s: string) =>
  s.toLowerCase().replace(/\b(ltd|limited|plc|gmbh|srl|spa|inc)\b\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// "TELFORD TEMP HP CYL 250L" -> ["telford", "temp", "heat", "pump", "cylinder", "250l"]
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1.$2")
    .split(/[^a-z0-9.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .flatMap((t) => (ABBREVIATIONS[t] ?? t).split(" "))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const isNumeric = (t: string) => /\d/.test(t);

// Does line token `a` refer to catalog token `b`? Exact, or a 3+ letter prefix ("temp" -> "tempest").
function tokenMatches(a: string, b: string): boolean {
  if (a === b) return true;
  if (isNumeric(a) || isNumeric(b)) return false; // 8kw must not match 8.5kw
  return a.length >= 3 && b.startsWith(a);
}

function catalogText(c: CatalogItem): string {
  return [c.manufacturer, c.model, c.manufacturerArticleNo, ...c.supplierAliases.map((a) => a.description)].join(" ");
}

// Words that start a model name but aren't a product line ("Home Pro", "All in One").
const NOT_PRODUCT_LINES = new Set(["home", "all", "battery", "power", "sunny", "primo"]);

// Catalog items whose brand or product line the line mentions. Invoices often name only the
// product line ("ZAPPI 7KW", not "myenergi zappi"), so both count.
function sameBrand(line: InvoiceLine, catalog: CatalogItem[]): CatalogItem[] {
  const lineTokens = tokens(`${line.description} ${line.manufacturerGuess} ${line.modelGuess}`);
  const mentions = (word: string | undefined) =>
    !!word && lineTokens.some((t) => tokenMatches(t, word) && t.length >= Math.min(4, word.length));
  const brands = new Set(
    catalog
      .filter((c) => {
        const productLine = tokens(c.model)[0];
        return mentions(tokens(c.manufacturer)[0])
          || (productLine && !isNumeric(productLine) && !NOT_PRODUCT_LINES.has(productLine) && mentions(productLine));
      })
      .map((c) => c.manufacturer),
  );
  return catalog.filter((c) => brands.has(c.manufacturer));
}

// Share of the line's meaningful tokens found in the catalog item. Numbers (sizes, capacities)
// count double: they are what separates variants of the same model.
function overlapScore(lineTokens: string[], item: CatalogItem): number {
  const itemTokens = tokens(catalogText(item));
  let hit = 0;
  let total = 0;
  for (const t of lineTokens) {
    const w = isNumeric(t) ? 2 : 1;
    total += w;
    if (itemTokens.some((it) => tokenMatches(t, it))) hit += w;
  }
  return total ? hit / total : 0;
}

export function shortlist(line: InvoiceLine, catalog: CatalogItem[]): Candidate[] {
  // Without a known brand the line is most likely a product the catalog doesn't have.
  const lineTokens = [...new Set(tokens(`${line.description} ${line.modelGuess}`))];
  return sameBrand(line, catalog)
    .map((c) => ({ catalogId: c.id, score: Math.round(overlapScore(lineTokens, c) * 100) / 100 }))
    .filter((c) => c.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, SHORTLIST_SIZE);
}

// Without a catalog item, `mine` holds the one component already identified.
export function withDuplicateCheck(m: LineMatch, item: CatalogItem | undefined, mine: MyComponent[]): LineMatch {
  const existing = item
    ? mine.find((c) => c.catalogRef === item.id || (normCode(c.articleNo) !== "" && normCode(c.articleNo) === normCode(item.manufacturerArticleNo)))
    : mine[0];
  if (!existing) return m;
  const changed = Math.abs(existing.purchasePrice - m.line.unitPrice) > PRICE_TOLERANCE;
  return {
    ...m,
    status: changed ? "duplicate_price_change" : "duplicate_no_change",
    myComponentId: existing.id,
    previousPrice: changed ? existing.purchasePrice : undefined,
    reason: changed
      ? `Already in your database at ${existing.purchasePrice.toFixed(2)}; invoice says ${m.line.unitPrice.toFixed(2)}`
      : "Already in your database at this price",
  };
}

export function matchLine(
  line: InvoiceLine, supplierName: string, catalog: CatalogItem[], mine: MyComponent[],
): LineMatch {
  const base = { line, candidates: [] as Candidate[] };

  if (line.kind === "consumable" || line.kind === "delivery") {
    return { ...base, status: "ignored", reason: line.kind === "delivery" ? "Delivery charge" : "Consumable, not worth a record" };
  }

  const code = normCode(line.code);
  const supplier = normSupplier(supplierName);

  if (code) {
    const bySupplierCode = catalog.find((c) =>
      c.supplierAliases.some((a) => normCode(a.code) === code && normSupplier(a.supplier) === supplier));
    if (bySupplierCode) {
      return withDuplicateCheck({
        ...base, status: "catalog_match", matchedBy: "supplier_code", catalogId: bySupplierCode.id,
        reason: `Supplier code ${line.code} is known for ${bySupplierCode.manufacturer} ${bySupplierCode.model}`,
      }, bySupplierCode, mine);
    }

    const byArticleNo = catalog.find((c) => normCode(c.manufacturerArticleNo) === code);
    if (byArticleNo) {
      return withDuplicateCheck({
        ...base, status: "catalog_match", matchedBy: "manufacturer_article_no", catalogId: byArticleNo.id,
        reason: `Manufacturer article no. ${line.code}`,
      }, byArticleNo, mine);
    }

    const myByArticleNo = mine.find((c) => normCode(c.articleNo) === code);
    if (myByArticleNo) {
      return withDuplicateCheck({
        ...base, status: "catalog_match", matchedBy: "my_article_no", catalogId: myByArticleNo.catalogRef ?? undefined,
        reason: `Article no. ${line.code} is in your database`,
      }, undefined, [myByArticleNo]);
    }
  }

  const candidates = shortlist(line, catalog);
  if (candidates.length === 0) {
    return { ...base, status: "new", reason: "No matching product in the catalog" };
  }
  return { ...base, status: "needs_review", candidates, reason: `${candidates.length} possible match${candidates.length > 1 ? "es" : ""}` };
}

export function matchInvoice(invoice: ExtractedInvoice, catalog: CatalogItem[], mine: MyComponent[]): LineMatch[] {
  return invoice.lines.map((l) => matchLine(l, invoice.supplierName, catalog, mine));
}
