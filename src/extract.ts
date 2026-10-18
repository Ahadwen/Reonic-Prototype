// Step 1 of the pipeline: invoice (PDF or photo) -> structured line items.
// One API call. The response is forced to match INVOICE_SCHEMA, so no parsing guesswork.

import { callClaude, DEFAULT_MODEL } from "./api.ts";
import type { ExtractedInvoice, ExtractionResult, InvoiceFile } from "./types.ts";

const SYSTEM = `You read supplier invoices for solar, battery, heat pump and EV charger installers.
Extract every line item exactly as printed. Do not invent or correct codes or prices.

For each line, classify "kind":
- product: a component an installer would quote to customers (heat pump, battery, inverter, PV module, cylinder, EV charger, optimiser)
- accessory: a branded item sold alongside products (controller, mounting rail, diverter)
- service: labour or a service
- consumable: generic materials by length or in bulk (cable drums, connectors, fixings)
- delivery: carriage, delivery, pallet charges
- other: anything else

Also give your best expansion of abbreviated descriptions as manufacturerGuess and modelGuess
(e.g. "MITSU ECODAN 8.5KW MONO" -> "Mitsubishi Electric", "Ecodan 8.5kW Monobloc").
Leave them empty rather than guessing wildly.
Use "" for missing text fields. Prices are net of VAT. Dates as yyyy-mm-dd.
If any part of the document is hard to read, say so in readabilityIssues.`;

// JSON schema for structured output. Note: additionalProperties must be false on every object,
// and numeric constraints like "minimum" are not supported.
const LINE_SCHEMA = {
  type: "object",
  properties: {
    code: { type: "string" },
    description: { type: "string" },
    quantity: { type: "number" },
    unitPrice: { type: "number" },
    lineTotal: { type: "number" },
    kind: { type: "string", enum: ["product", "accessory", "service", "consumable", "delivery", "other"] },
    manufacturerGuess: { type: "string" },
    modelGuess: { type: "string" },
  },
  required: ["code", "description", "quantity", "unitPrice", "lineTotal", "kind", "manufacturerGuess", "modelGuess"],
  additionalProperties: false,
};

const INVOICE_SCHEMA = {
  type: "object",
  properties: {
    supplierName: { type: "string" },
    invoiceNumber: { type: "string" },
    invoiceDate: { type: "string" },
    currency: { type: "string" },
    lines: { type: "array", items: LINE_SCHEMA },
    netTotal: { type: "number" },
    readabilityIssues: { type: "string" },
  },
  required: ["supplierName", "invoiceNumber", "invoiceDate", "currency", "lines", "netTotal", "readabilityIssues"],
  additionalProperties: false,
};

function fileBlock(file: InvoiceFile) {
  const source = { type: "base64", media_type: file.mediaType, data: file.base64 };
  return file.mediaType === "application/pdf"
    ? { type: "document", source }
    : { type: "image", source };
}

export async function extractInvoice(
  apiKey: string | null,  // null: use the demo proxy
  file: InvoiceFile,
  model: string = DEFAULT_MODEL,
): Promise<ExtractionResult> {
  const started = performance.now();

  const response = await callClaude(apiKey, {
    model,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [fileBlock(file), { type: "text", text: "Extract this invoice." }],
      },
    ],
    output_config: { format: { type: "json_schema", schema: INVOICE_SCHEMA } },
  });

  if (response.stop_reason === "refusal") throw new Error("The model declined to process this file.");
  if (response.stop_reason === "max_tokens") throw new Error("Response was cut off (max_tokens). Try a shorter invoice.");

  // With structured output the JSON arrives in the text block. Thinking blocks, if any, come before it.
  const text = response.content.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new Error("No text block in response.");

  const invoice = JSON.parse(text) as ExtractedInvoice;
  return {
    invoice,
    usage: response.usage,
    durationMs: Math.round(performance.now() - started),
    model: response.model,
  };
}

// Sanity check the model's arithmetic against itself. Cheap, and catches misread numbers.
export function checkTotals(inv: ExtractedInvoice): string[] {
  const warnings: string[] = [];
  for (const l of inv.lines) {
    if (Math.abs(l.quantity * l.unitPrice - l.lineTotal) > 0.02) {
      warnings.push(`"${l.description}": ${l.quantity} × ${l.unitPrice} ≠ ${l.lineTotal}`);
    }
  }
  const sum = inv.lines.reduce((s, l) => s + l.lineTotal, 0);
  if (Math.abs(sum - inv.netTotal) > 0.05) {
    warnings.push(`Lines add up to ${sum.toFixed(2)} but invoice net total is ${inv.netTotal.toFixed(2)}`);
  }
  return warnings;
}
