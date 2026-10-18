// Data access for the matching and review steps.
// Everything else talks to the Store interface, so the JSON version here can be swapped
// for Supabase later without touching matching or UI code.

import catalogJson from "../data/catalog.json";
import myComponentsJson from "../data/my-components.json";
import type { CatalogItem, MyComponent } from "./types.ts";

export interface Store {
  getCatalog(): Promise<CatalogItem[]>;
  getMyComponents(): Promise<MyComponent[]>;
  // Insert or replace by id.
  saveComponents(components: MyComponent[]): Promise<void>;
  updatePrice(myComponentId: string, purchasePrice: number): Promise<void>;
  // Remember that this supplier's code means this catalog item, so next time it matches by rule.
  addSupplierAlias(catalogId: string, alias: CatalogItem["supplierAliases"][number]): Promise<void>;
  // Back to the seed data. Handy for repeating the demo.
  reset(): Promise<void>;
}

const STORAGE_KEY = "invoice-demo-store-v1";

interface State {
  catalog: CatalogItem[];
  myComponents: MyComponent[];
}

const seed = (): State => structuredClone({
  catalog: catalogJson as unknown as CatalogItem[],
  myComponents: myComponentsJson as unknown as MyComponent[],
});

// Seed data from the repo, with changes kept in localStorage when there is one (browser),
// or in memory only (Node, private windows).
export class JsonStore implements Store {
  private state: State;

  constructor() {
    this.state = this.load() ?? seed();
  }

  private load(): State | null {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as State) : null;
    } catch {
      return null;
    }
  }

  private persist() {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch { /* storage unavailable: changes last until reload */ }
  }

  async getCatalog() {
    return structuredClone(this.state.catalog);
  }

  async getMyComponents() {
    return structuredClone(this.state.myComponents);
  }

  async saveComponents(components: MyComponent[]) {
    for (const c of components) {
      const i = this.state.myComponents.findIndex((m) => m.id === c.id);
      if (i >= 0) this.state.myComponents[i] = structuredClone(c);
      else this.state.myComponents.push(structuredClone(c));
    }
    this.persist();
  }

  async updatePrice(myComponentId: string, purchasePrice: number) {
    const c = this.state.myComponents.find((m) => m.id === myComponentId);
    if (!c) throw new Error(`No component ${myComponentId}`);
    c.purchasePrice = purchasePrice;
    c.updatedAt = new Date().toISOString().slice(0, 10);
    this.persist();
  }

  async addSupplierAlias(catalogId: string, alias: CatalogItem["supplierAliases"][number]) {
    const item = this.state.catalog.find((c) => c.id === catalogId);
    if (!item) throw new Error(`No catalog item ${catalogId}`);
    if (!item.supplierAliases.some((a) => a.supplier === alias.supplier && a.code === alias.code)) {
      item.supplierAliases.push(alias);
      this.persist();
    }
  }

  async reset() {
    this.state = seed();
    try { globalThis.localStorage?.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
}
