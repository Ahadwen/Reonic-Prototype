// Scores rule-based matching against the .expected.json files. No API calls, so it's free to run often.
//
//   npm run eval:match                      # lines taken from .expected.json (code + description only)
//   npm run eval:match -- --extracted       # lines from the newest eval-results/extraction-*.json,
//                                           # i.e. what the model really read, guesses included
//
// Lines the AI step is meant to resolve are scored on whether the right item made the shortlist.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { matchInvoice } from "../src/match.ts";
import { JsonStore } from "../src/store.ts";
import type { ExtractedInvoice, InvoiceLine, LineMatch } from "../src/types.ts";

interface ExpectedLine {
  code: string; description: string; quantity: number; unitPrice: number;
  expected: {
    status: string; catalogId?: string; myComponentId?: string; matchedBy?: string;
    candidates?: string[]; reason?: string;
  };
}
interface Expected { invoiceNumber: string; supplier: string; currency: string; lines: ExpectedLine[] }

const DIR = "public/samples";
const useExtracted = process.argv.includes("--extracted");

const store = new JsonStore();
const catalog = await store.getCatalog();
const mine = await store.getMyComponents();

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();

function linesFromExpected(exp: Expected): InvoiceLine[] {
  return exp.lines.map((l) => ({
    code: l.code, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice,
    lineTotal: l.quantity * l.unitPrice,
    kind: l.expected.status === "ignored" ? (l.expected.reason === "delivery" ? "delivery" : "consumable") : "product",
    manufacturerGuess: "", modelGuess: "",
  }));
}

// Newest extraction run, one result per invoice number (PDF preferred over photo).
function latestExtractions(): Map<string, ExtractedInvoice> {
  const files = existsSync("eval-results") ? readdirSync("eval-results").filter((f) => f.startsWith("extraction-")).sort() : [];
  if (!files.length) throw new Error("No eval-results/extraction-*.json yet. Run `npm run eval` first.");
  const runs = JSON.parse(readFileSync(join("eval-results", files.at(-1)!), "utf8")) as { file: string; extracted?: ExtractedInvoice }[];
  const byNumber = new Map<string, ExtractedInvoice>();
  for (const r of runs.sort((a, b) => Number(a.file.includes("photo")) - Number(b.file.includes("photo")))) {
    if (r.extracted && !byNumber.has(r.extracted.invoiceNumber)) byNumber.set(r.extracted.invoiceNumber, r.extracted);
  }
  console.log(`Using extracted lines from ${files.at(-1)}\n`);
  return byNumber;
}

type Verdict = "ok" | "shortlisted" | "wrong";

function judge(exp: ExpectedLine["expected"], m: LineMatch | undefined): { verdict: Verdict; detail: string } {
  if (!m) return { verdict: "wrong", detail: "line missing" };
  const got = `${m.status}${m.catalogId ? ` ${m.catalogId}` : ""}${m.matchedBy ? ` by ${m.matchedBy}` : ""}`;
  const ids = m.candidates.map((c) => c.catalogId);

  if (exp.matchedBy === "ai") {
    // Rules shouldn't guess here; the right answer just has to reach the AI step.
    if (m.status === "needs_review" && exp.catalogId && ids.includes(exp.catalogId)) {
      return { verdict: "shortlisted", detail: `in shortlist at #${ids.indexOf(exp.catalogId) + 1} of ${ids.length}` };
    }
    return { verdict: "wrong", detail: `got ${got}, shortlist [${ids.join(", ")}]` };
  }
  if (exp.status === "needs_review") {
    const all = (exp.candidates ?? []).every((c) => ids.includes(c));
    return m.status === "needs_review" && all
      ? { verdict: "ok", detail: `candidates [${ids.join(", ")}]` }
      : { verdict: "wrong", detail: `got ${got}, shortlist [${ids.join(", ")}]` };
  }
  const ok = m.status === exp.status
    && (!exp.catalogId || m.catalogId === exp.catalogId)
    && (!exp.myComponentId || m.myComponentId === exp.myComponentId);
  return { verdict: ok ? "ok" : "wrong", detail: ok ? got : `got ${got}` };
}

const extracted = useExtracted ? latestExtractions() : null;
const tally: Record<Verdict, number> = { ok: 0, shortlisted: 0, wrong: 0 };
let aiLines = 0;

for (const f of readdirSync(DIR).filter((f) => f.endsWith(".expected.json")).sort()) {
  const exp: Expected = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  const invoice: ExtractedInvoice = extracted?.get(exp.invoiceNumber) ?? {
    supplierName: exp.supplier, invoiceNumber: exp.invoiceNumber, invoiceDate: "", currency: exp.currency,
    lines: linesFromExpected(exp), netTotal: 0, readabilityIssues: "",
  };
  if (extracted && !extracted.has(exp.invoiceNumber)) console.log(`(no extraction for ${exp.invoiceNumber}, using expected lines)`);

  const matches = matchInvoice(invoice, catalog, mine);
  console.log(exp.invoiceNumber);
  for (const l of exp.lines) {
    const m = matches.find((x) => (l.code ? norm(x.line.code) === norm(l.code) : norm(x.line.description).includes(norm(l.description))));
    const { verdict, detail } = judge(l.expected, m);
    tally[verdict]++;
    if (l.expected.matchedBy === "ai") aiLines++;
    const mark = { ok: "✓", shortlisted: "→", wrong: "✗" }[verdict];
    console.log(`  ${mark} ${l.description.padEnd(34)} expected ${l.expected.status.padEnd(22)} ${detail}`);
  }
  console.log();
}

const total = tally.ok + tally.shortlisted + tally.wrong;
console.log(
  `${tally.ok}/${total - aiLines} rule lines correct · ${tally.shortlisted}/${aiLines} AI lines shortlisted · ${tally.wrong} wrong`,
);
console.log("✓ correct   → right answer in shortlist, left for the AI step   ✗ wrong");
process.exitCode = tally.wrong ? 1 : 0;
