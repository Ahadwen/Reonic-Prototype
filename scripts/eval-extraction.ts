// Runs extraction on every sample invoice and scores it against the .expected.json files.
//
//   ANTHROPIC_API_KEY=sk-ant-... npm run eval            # all samples
//   ANTHROPIC_API_KEY=sk-ant-... npm run eval -- photo   # only files whose name contains "photo"
//   npm run eval -- --runs 3                             # repeat each file to check consistency
//
// Or put ANTHROPIC_API_KEY=... in a .env file (git-ignored).

import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { extractInvoice } from "../src/extract.ts";
import { costUsd } from "../src/cost.ts";
import type { InvoiceFile, InvoiceLine } from "../src/types.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("Set ANTHROPIC_API_KEY (environment variable or .env file).");
  process.exit(1);
}

const args = process.argv.slice(2);
const runsIdx = args.indexOf("--runs");
const runs = runsIdx >= 0 ? Number(args[runsIdx + 1]) : 1;
const filter = args.filter((a, i) => !a.startsWith("--") && i !== runsIdx + 1)[0] ?? "";

const DIR = "public/samples";
const MEDIA: Record<string, InvoiceFile["mediaType"]> = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

interface ExpectedLine {
  code: string; description: string; quantity: number; unitPrice: number;
  expected: { status: string };
}
interface Expected { invoiceNumber: string; lines: ExpectedLine[]; totals: { net: number } }

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();
const near = (a: number, b: number) => Math.abs(a - b) < 0.005;

function findLine(exp: ExpectedLine, got: InvoiceLine[]): InvoiceLine | undefined {
  if (exp.code) return got.find((g) => norm(g.code) === norm(exp.code));
  return got.find((g) => norm(g.description).includes(norm(exp.description)));
}

function score(expected: Expected, lines: InvoiceLine[], netTotal: number) {
  const checks = { found: 0, code: 0, description: 0, quantity: 0, unitPrice: 0, kind: 0 };
  const problems: string[] = [];
  for (const exp of expected.lines) {
    const g = findLine(exp, lines);
    if (!g) { problems.push(`MISSING  ${exp.description}`); continue; }
    checks.found++;
    if (norm(g.code) === norm(exp.code)) checks.code++; else problems.push(`code     ${exp.description}: got "${g.code}"`);
    if (norm(g.description) === norm(exp.description)) checks.description++; else problems.push(`desc     expected "${exp.description}", got "${g.description}"`);
    if (near(g.quantity, exp.quantity)) checks.quantity++; else problems.push(`qty      ${exp.description}: got ${g.quantity}, expected ${exp.quantity}`);
    if (near(g.unitPrice, exp.unitPrice)) checks.unitPrice++; else problems.push(`price    ${exp.description}: got ${g.unitPrice}, expected ${exp.unitPrice}`);
    const shouldIgnore = exp.expected.status === "ignored";
    const ignoredKind = g.kind === "consumable" || g.kind === "delivery";
    if (shouldIgnore === ignoredKind) checks.kind++; else problems.push(`kind     ${exp.description}: got "${g.kind}"`);
  }
  const extra = lines.length - checks.found;
  if (extra > 0) problems.push(`EXTRA    ${extra} line(s) not on the invoice`);
  const totalOk = near(netTotal, expected.totals.net);
  if (!totalOk) problems.push(`total    got ${netTotal}, expected ${expected.totals.net}`);

  const n = expected.lines.length;
  const fieldsRight = Object.values(checks).reduce((a, b) => a + b, 0);
  return { checks, n, fieldAccuracy: fieldsRight / (n * Object.keys(checks).length), totalOk, extra, problems };
}

const files = readdirSync(DIR).filter((f) => MEDIA[extname(f)] && f.includes(filter)).sort();
const results: unknown[] = [];
let totalCost = 0;

for (const f of files) {
  const expectedPath = join(DIR, f.replace(/(-photo)?\.(pdf|jpe?g|png)$/, ".expected.json"));
  const expected: Expected = JSON.parse(readFileSync(expectedPath, "utf8"));
  const file: InvoiceFile = { base64: readFileSync(join(DIR, f)).toString("base64"), mediaType: MEDIA[extname(f)] };

  for (let run = 1; run <= runs; run++) {
    process.stdout.write(`${f}${runs > 1 ? ` (run ${run})` : ""} … `);
    try {
      const r = await extractInvoice(apiKey, file);
      const s = score(expected, r.invoice.lines, r.invoice.netTotal);
      const cost = costUsd(r.model, r.usage) ?? 0;
      totalCost += cost;
      console.log(
        `${(s.fieldAccuracy * 100).toFixed(1)}% fields correct · ${s.checks.found}/${s.n} lines found · ` +
        `total ${s.totalOk ? "✓" : "✗"} · ${(r.durationMs / 1000).toFixed(1)}s · ` +
        `${r.usage.input_tokens} in / ${r.usage.output_tokens} out · $${cost.toFixed(3)}`,
      );
      s.problems.forEach((p) => console.log("   " + p));
      results.push({ file: f, run, ...s, usage: r.usage, durationMs: r.durationMs, costUsd: cost, model: r.model, extracted: r.invoice });
    } catch (e) {
      console.log("FAILED: " + (e instanceof Error ? e.message : e));
      results.push({ file: f, run, error: String(e) });
    }
  }
}

mkdirSync("eval-results", { recursive: true });
const out = join("eval-results", `extraction-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
writeFileSync(out, JSON.stringify(results, null, 2));
console.log(`\nTotal cost ≈ $${totalCost.toFixed(3)} · full results in ${out}`);
