// Step 3 of the pipeline: the AI settles what the rules couldn't.
//
// One call per invoice, covering every line still open:
//   - needs_review lines: pick one shortlisted catalog item, or say it's unclear, or that none fits
//   - new lines: read the description into a type, manufacturer, model and specs, to pre-fill the new record
// The model only ever chooses from candidates the rules found, so it can't invent a catalog match.

import { callClaude, DEFAULT_MODEL } from "./api.ts";
import { withDuplicateCheck } from "./match.ts";
import type { CatalogItem, ComponentType, LineMatch, MyComponent, NewComponentSuggestion, Usage } from "./types.ts";

const SYSTEM = `You match supplier invoice lines to products for solar, battery, heat pump and EV charger installers.
Wholesaler descriptions are abbreviated (MONO = monobloc, UNV = unvented, TETH = tethered, BLK = black).

For each line with candidates, choose the candidate the description identifies.
Only choose when the description pins down one candidate: every distinguishing detail it gives
(size, capacity, colour, cable length, tethered or not, vented or not) agrees, and nothing it leaves out
is what separates the candidates. If two or more candidates still fit, answer "unclear". If none fits, answer "none".
A wrong match costs the installer more than asking, so prefer "unclear" when in doubt.

For each line without candidates, say what the product most likely is, from the description alone.
Leave manufacturer or model empty rather than guessing. Only list specs the description states.`;

const COMPONENT_TYPES: ComponentType[] = [
  "heat_pump", "hot_water_cylinder", "battery", "inverter", "pv_module", "optimiser", "ev_charger", "accessory", "service",
];

const SCHEMA = {
  type: "object",
  properties: {
    choices: {
      type: "array",
      items: {
        type: "object",
        properties: {
          line: { type: "integer" },
          decision: { type: "string", enum: ["match", "unclear", "none"] },
          catalogId: { type: "string", description: "The chosen candidate id when decision is match, else empty" },
          reason: { type: "string", description: "One short sentence for the installer" },
        },
        required: ["line", "decision", "catalogId", "reason"],
        additionalProperties: false,
      },
    },
    newProducts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          line: { type: "integer" },
          type: { type: "string", enum: COMPONENT_TYPES },
          manufacturer: { type: "string" },
          model: { type: "string" },
          specs: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, value: { type: "string" } },
              required: ["name", "value"],
              additionalProperties: false,
            },
          },
        },
        required: ["line", "type", "manufacturer", "model", "specs"],
        additionalProperties: false,
      },
    },
  },
  required: ["choices", "newProducts"],
  additionalProperties: false,
};

interface Response {
  choices: { line: number; decision: "match" | "unclear" | "none"; catalogId: string; reason: string }[];
  newProducts: ({ line: number } & NewComponentSuggestion)[];
}

export interface ResolveResult {
  matches: LineMatch[];
  usage: Usage | null;   // null when nothing needed the AI
  durationMs: number;
}

function describeCandidate(c: CatalogItem): string {
  const specs = Object.entries(c.specs).map(([k, v]) => `${k}=${v}`).join(", ");
  return `    - ${c.id}: ${c.manufacturer} ${c.model} (article ${c.manufacturerArticleNo}; ${specs})`;
}

function buildPrompt(open: { index: number; m: LineMatch }[], catalog: CatalogItem[]): string {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return open.map(({ index, m }) => {
    const head = `Line ${index}: "${m.line.description}"${m.line.code ? ` (code ${m.line.code})` : ""}`;
    if (m.status === "new") return `${head}\n  No candidates: describe the product.`;
    const cands = m.candidates.map((c) => byId.get(c.catalogId)).filter((c): c is CatalogItem => !!c);
    return `${head}\n  Candidates:\n${cands.map(describeCandidate).join("\n")}`;
  }).join("\n\n");
}

export async function resolveWithAI(
  apiKey: string | null,
  matches: LineMatch[],
  catalog: CatalogItem[],
  mine: MyComponent[],
  model: string = DEFAULT_MODEL,
): Promise<ResolveResult> {
  const started = performance.now();
  const open = matches
    .map((m, index) => ({ index, m }))
    .filter(({ m }) => m.status === "needs_review" || m.status === "new");
  if (!open.length) return { matches, usage: null, durationMs: 0 };

  const response = await callClaude(apiKey, {
    model,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: buildPrompt(open, catalog) }],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });
  if (response.stop_reason === "refusal") throw new Error("The model declined to match these lines.");
  if (response.stop_reason === "max_tokens") throw new Error("Matching response was cut off (max_tokens).");
  const text = response.content.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new Error("No text block in matching response.");
  const ai = JSON.parse(text) as Response;

  const result = matches.map((m, index): LineMatch => {
    if (m.status === "new") {
      const s = ai.newProducts.find((p) => p.line === index);
      return s ? { ...m, suggestion: { type: s.type, manufacturer: s.manufacturer, model: s.model, specs: s.specs } } : m;
    }
    if (m.status !== "needs_review") return m;

    const choice = ai.choices.find((c) => c.line === index);
    if (!choice) return m;
    if (choice.decision === "none") {
      return { ...m, status: "new", candidates: [], reason: choice.reason };
    }
    const picked = m.candidates.find((c) => c.catalogId === choice.catalogId);
    if (choice.decision === "match" && picked) {
      const item = catalog.find((c) => c.id === picked.catalogId);
      return withDuplicateCheck(
        { ...m, status: "catalog_match", matchedBy: "ai", catalogId: picked.catalogId, reason: choice.reason },
        item, mine,
      );
    }
    // Unclear, or the model named something outside the shortlist: leave it to the installer.
    return { ...m, reason: choice.reason };
  });

  return { matches: result, usage: response.usage, durationMs: Math.round(performance.now() - started) };
}
