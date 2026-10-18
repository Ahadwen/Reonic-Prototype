// Shapes shared by the browser app and the Node eval script.

export type LineKind =
  | "product"     // a component to keep in the database (heat pump, battery, panel…)
  | "accessory"   // mounting kit, controller, cable kit sold as an item
  | "service"     // labour or a service the supplier charges for
  | "consumable"  // cable by the metre, connectors, screws: not worth a database record
  | "delivery"    // carriage, delivery, pallet charges
  | "other";

export interface InvoiceLine {
  code: string;              // supplier or manufacturer code as printed, "" if none
  description: string;       // description exactly as printed
  quantity: number;
  unitPrice: number;         // net, per unit
  lineTotal: number;         // net
  kind: LineKind;
  manufacturerGuess: string; // e.g. "Mitsubishi Electric", "" if unknown
  modelGuess: string;        // expanded model name, e.g. "Ecodan 8.5kW Monobloc", "" if unsure
}

export interface ExtractedInvoice {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;       // ISO yyyy-mm-dd
  currency: string;          // ISO 4217, e.g. "GBP"
  lines: InvoiceLine[];
  netTotal: number;
  readabilityIssues: string; // anything the model couldn't read confidently, "" if none
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

export interface ExtractionResult {
  invoice: ExtractedInvoice;
  usage: Usage;
  durationMs: number;
  model: string;
}

// Input file as the API wants it: base64 without the "data:...;base64," prefix.
export interface InvoiceFile {
  base64: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
}
