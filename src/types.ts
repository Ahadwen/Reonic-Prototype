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

// ---- Component data ----

export type ComponentType =
  | "heat_pump" | "hot_water_cylinder" | "battery" | "inverter" | "pv_module"
  | "optimiser" | "ev_charger" | "accessory" | "service";

// Markets are listed now so per-market fields have a home; the demo only fills UK.
export type Market = "UK" | "DACH" | "IT" | "LATAM";

export interface SupplierAlias {
  supplier: string;
  code: string;
  description: string;
}

// A record in Reonic's central catalog.
export interface CatalogItem {
  id: string;
  type: ComponentType;
  manufacturer: string;
  model: string;
  manufacturerArticleNo: string;
  specs: Record<string, string | number | boolean | string[]>;
  datasheetUrl: string;
  markets: Market[];
  marketData: Partial<Record<Market, Record<string, string>>>;
  supplierAliases: SupplierAlias[];
  lastVerified: string;
}

// A record in one installer's own component database.
export interface MyComponent {
  id: string;
  name: string;
  type: ComponentType;
  manufacturer: string | null;
  articleNo: string | null;
  purchasePrice: number;
  salesPrice: number;
  catalogRef: string | null;
  specs: Record<string, string | number | boolean | string[]>;
  source: "manual" | "catalog" | "invoice";
  updatedAt: string;
}

// ---- Matching ----

export type MatchStatus =
  | "ignored"                 // consumable or delivery: no record needed
  | "catalog_match"           // found in the central catalog, not yet in the installer's database
  | "duplicate_no_change"     // already in the installer's database at this price
  | "duplicate_price_change"  // already in the installer's database, price differs
  | "needs_review"            // several plausible candidates, a person has to choose
  | "new";                    // not in the catalog: create from the invoice line

export type MatchedBy = "supplier_code" | "manufacturer_article_no" | "my_article_no" | "ai";

export interface Candidate {
  catalogId: string;
  score: number;              // 0..1, how well the text overlaps; only used for ordering
}

export interface LineMatch {
  line: InvoiceLine;
  status: MatchStatus;
  matchedBy?: MatchedBy;
  catalogId?: string;
  myComponentId?: string;
  previousPrice?: number;     // set for duplicate_price_change
  candidates: Candidate[];    // shortlist for the AI step or for manual review
  reason: string;             // one line, shown in the review UI
  suggestion?: NewComponentSuggestion; // for "new" lines: the AI's reading of what the product is
}

export interface NewComponentSuggestion {
  type: ComponentType;
  manufacturer: string;
  model: string;
  specs: { name: string; value: string }[];
}
