// Tests for the review step: decisions -> planned changes -> store.
// The AI step is simulated from the .expected.json files, so this runs offline:  npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchInvoice, withDuplicateCheck } from "../src/match.ts";
import { applyPlan, choose, initialDecisions, planChanges, summarise, usualMarkup } from "../src/review.ts";
import { JsonStore } from "../src/store.ts";
import type { CatalogItem, ExtractedInvoice, LineMatch, MyComponent } from "../src/types.ts";

interface ExpectedFile {
  invoiceNumber: string; supplier: string; currency: string;
  lines: { code: string; description: string; quantity: number; unitPrice: number;
    expected: { status: string; catalogId?: string; matchedBy?: string; reason?: string } }[];
}

function load(name: string) {
  const exp: ExpectedFile = JSON.parse(readFileSync(`public/samples/${name}.expected.json`, "utf8"));
  const invoice: ExtractedInvoice = {
    supplierName: exp.supplier, invoiceNumber: exp.invoiceNumber, invoiceDate: "", currency: exp.currency, netTotal: 0, readabilityIssues: "",
    lines: exp.lines.map((l) => ({
      code: l.code, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.quantity * l.unitPrice,
      kind: l.expected.status === "ignored" ? (l.expected.reason === "delivery" ? "delivery" : "consumable") : "product",
      manufacturerGuess: "", modelGuess: "",
    })),
  };
  return { exp, invoice };
}

// Rules, then the answers the AI step is expected to give.
function matchWithSimulatedAI(exp: ExpectedFile, invoice: ExtractedInvoice, catalog: CatalogItem[], mine: MyComponent[]): LineMatch[] {
  return matchInvoice(invoice, catalog, mine).map((m, i) => {
    const e = exp.lines[i].expected;
    if (m.status !== "needs_review" || e.matchedBy !== "ai" || !e.catalogId) return m;
    const item = catalog.find((c) => c.id === e.catalogId);
    return withDuplicateCheck({ ...m, status: "catalog_match", matchedBy: "ai", catalogId: e.catalogId, reason: "simulated" }, item, mine);
  });
}

async function fresh() {
  const store = new JsonStore();
  await store.reset();
  return { store, catalog: await store.getCatalog(), mine: await store.getMyComponents() };
}

test("usual markup is learned from the installer's own products", async () => {
  const { mine } = await fresh();
  const markup = usualMarkup(mine);
  assert.ok(markup > 0.3 && markup < 0.5, `markup ${markup}`);
  assert.equal(usualMarkup([]), 0.35);
});

test("invoice 1: confirm is blocked until the Daikin is decided", async () => {
  const { catalog, mine } = await fresh();
  const { exp, invoice } = load("invoice-NRS-24817");
  const matches = matchWithSimulatedAI(exp, invoice, catalog, mine);
  const decisions = initialDecisions(matches, catalog, usualMarkup(mine));
  const daikin = matches.findIndex((m) => m.line.description.startsWith("DAIKIN"));

  assert.deepEqual(planChanges(invoice, matches, decisions, catalog, mine).undecided, [daikin]);
  await assert.rejects(applyPlan(new JsonStore(), planChanges(invoice, matches, decisions, catalog, mine)));
});

test("invoice 1: adds 7 components, updates the Ecodan price, learns 5 supplier codes", async () => {
  const { store, catalog, mine } = await fresh();
  const { exp, invoice } = load("invoice-NRS-24817");
  const markup = usualMarkup(mine);
  const matches = matchWithSimulatedAI(exp, invoice, catalog, mine);
  const decisions = initialDecisions(matches, catalog, markup);
  const daikin = matches.findIndex((m) => m.line.description.startsWith("DAIKIN"));
  decisions[daikin] = choose(decisions[daikin], matches[daikin], "cat-005", catalog, markup);

  const plan = planChanges(invoice, matches, decisions, catalog, mine);
  assert.deepEqual(plan.undecided, []);
  assert.deepEqual(plan.add.map((c) => c.catalogRef ?? c.name).sort(),
    ["SUNSYNK L5.1 5.12KWH BATTERY", "cat-005", "cat-008", "cat-013", "cat-016", "cat-033", "cat-036"].sort());
  assert.deepEqual(plan.priceUpdates.map((p) => [p.myComponentId, p.from, p.to]), [["my-001", 3180, 3245]]);
  assert.deepEqual(plan.aliases.map((a) => a.catalogId).sort(), ["cat-005", "cat-008", "cat-013", "cat-033", "cat-036"]);

  const sunsynk = plan.add.find((c) => c.catalogRef === null)!;
  assert.equal(sunsynk.articleNo, "NB-BT-23310");
  assert.equal(sunsynk.purchasePrice, 1240);
  assert.equal(sunsynk.salesPrice, Math.round(1240 * (1 + markup)));

  await applyPlan(store, plan);
  const after = await store.getMyComponents();
  assert.equal(after.length, mine.length + 7);
  assert.equal(after.find((c) => c.id === "my-001")!.purchasePrice, 3245);

  // The same invoice again: everything is now known, by rule, with nothing to add.
  const again = matchInvoice(invoice, await store.getCatalog(), after);
  for (const m of again.filter((m) => ["TELFORD", "ZAPPI", "DAIKIN"].some((w) => m.line.description.startsWith(w)))) {
    assert.equal(m.matchedBy, "supplier_code", m.line.description);
    assert.equal(m.status, "duplicate_no_change", m.line.description);
  }
  assert.ok(!again.some((m) => m.status === "needs_review" || m.status === "catalog_match"));
});

test("unticked lines change nothing; picking an item already owned becomes a price check", async () => {
  const { catalog, mine } = await fresh();
  const { exp, invoice } = load("invoice-NRS-24817");
  const markup = usualMarkup(mine);
  const matches = matchWithSimulatedAI(exp, invoice, catalog, mine);
  const decisions = initialDecisions(matches, catalog, markup).map((d) => ({ ...d, include: false }));
  assert.deepEqual(planChanges(invoice, matches, decisions, catalog, mine), { add: [], priceUpdates: [], aliases: [], undecided: [] });

  // Pretend the installer already owns the 8kW Altherma 3 R at a different price.
  const owned: MyComponent[] = [...mine, { ...mine[0], id: "my-x", name: "Altherma", catalogRef: "cat-005", purchasePrice: 3700 }];
  const daikin = matches.findIndex((m) => m.line.description.startsWith("DAIKIN"));
  const only = decisions.map((d, i) => (i === daikin ? choose({ ...d, include: true }, matches[i], "cat-005", catalog, markup) : d));
  const plan = planChanges(invoice, matches, only, catalog, owned);
  assert.deepEqual(plan.add, []);
  assert.deepEqual(plan.priceUpdates.map((p) => [p.myComponentId, p.to]), [["my-x", 3890]]);
});

test("choosing 'create new' on an unclear line makes a record without a catalog link", async () => {
  const { catalog, mine } = await fresh();
  const { exp, invoice } = load("invoice-NRS-24817");
  const markup = usualMarkup(mine);
  const matches = matchWithSimulatedAI(exp, invoice, catalog, mine);
  const daikin = matches.findIndex((m) => m.line.description.startsWith("DAIKIN"));
  const decisions = initialDecisions(matches, catalog, markup).map((d, i) =>
    i === daikin ? choose(d, matches[i], "new", catalog, markup) : { ...d, include: false });
  const plan = planChanges(invoice, matches, decisions, catalog, mine);
  assert.equal(plan.add.length, 1);
  assert.equal(plan.add[0].catalogRef, null);
  assert.equal(plan.aliases.length, 0);
});

test("summary counts how each line was settled", async () => {
  const { catalog, mine } = await fresh();
  const { exp, invoice } = load("invoice-NRS-24817");
  const markup = usualMarkup(mine);
  const matches = matchWithSimulatedAI(exp, invoice, catalog, mine);
  const decisions = initialDecisions(matches, catalog, markup);
  const daikin = matches.findIndex((m) => m.line.description.startsWith("DAIKIN"));
  decisions[daikin] = choose(decisions[daikin], matches[daikin], "cat-005", catalog, markup);
  const tigo = matches.findIndex((m) => m.line.description.startsWith("TIGO"));
  decisions[tigo] = { ...decisions[tigo], include: false };

  const s = summarise(invoice, matches, decisions, planChanges(invoice, matches, decisions, catalog, mine));
  // Ecodan (price), GivEnergy and Vaillant by rule; Telford and zappi by AI; Daikin by you; Sunsynk new; Tigo skipped.
  assert.deepEqual(
    [s.lines, s.added, s.priceUpdates.length, s.byRule, s.byAI, s.byYou, s.created, s.ignored, s.skipped],
    [11, 6, 1, 3, 2, 1, 1, 3, 1],
  );
  assert.equal(s.minutesSaved, 6 * 3 + 1);
});
