# Invoice → Components prototype

Upload a supplier invoice (PDF or photo). The app extracts the line items, matches each one against the installer's existing components and a central catalog, then shows a pre-filled list to review and confirm.

**All data here is invented for the demo.** Brand and model names are real products, but article numbers, supplier codes, MCS certificate numbers, specs and prices are made up or approximate.

## Running it

Needs Node 22 (or 20.12+).

```bash
npm install
npm run dev          # opens the test bench at http://localhost:5173
```

Paste an API key into the page, pick a sample invoice, press **Extract**. The key stays in your browser and only goes to api.anthropic.com.

To score extraction against the expected results:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env   # git-ignored
npm run eval                 # all 4 sample files
npm run eval -- photo        # only the photos
npm run eval -- --runs 3     # repeat each to check consistency
```

Each run prints field accuracy, tokens, time and cost per file, and saves full results to `eval-results/` (git-ignored).

## Deploying to GitHub Pages

Push to `main`, then in the repo go to **Settings → Pages → Source: GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds and publishes the site on every push.

Never commit an API key. The site asks for one at runtime instead.

## Code

| File | Purpose |
|---|---|
| `src/api.ts` | Minimal `fetch` wrapper for the Messages API |
| `src/extract.ts` | Pipeline step 1: invoice → structured line items, using a JSON schema so the response shape is guaranteed. Also checks the model's arithmetic. |
| `src/types.ts` | Shared types |
| `src/cost.ts` | Token → USD estimate |
| `src/main.ts`, `index.html`, `src/style.css` | Temporary test bench page |
| `scripts/eval-extraction.ts` | Accuracy scoring against `public/samples/*.expected.json` |

## Data

| File | What it is |
|---|---|
| `data/catalog.json` | 43 components standing in for the central database: heat pumps, cylinders, batteries, inverters, PV modules, optimisers, EV chargers, accessories. Each has a manufacturer article number, specs, markets, UK MCS data where relevant, and supplier aliases. |
| `data/my-components.json` | The installer's existing database: 5 products and 3 services. |

## Sample invoices

From a fictional wholesaler, *Northbridge Renewables Supply Ltd*, to a fictional installer, *Brightwell Heat & Solar Ltd*. Each comes as a clean PDF and a photo-style JPG, plus an `.expected.json` with the correct outcome for every line, used for measuring accuracy.

### NRS-INV-24817 (11 lines)

| Line | Expected outcome | What it tests |
|---|---|---|
| MITSU ECODAN 8.5KW MONO ASHP R32 | Already in database, price changed £3,180 → £3,245 | Duplicate detection + price update |
| GIVENERGY AIO 13.5KWH BATTERY | Catalog match | Supplier code lookup (rules) |
| VAILLANT AROTHERM PLUS 7KW R290 | Catalog match | Manufacturer article no. (rules) |
| TELFORD TEMP HP CYL 250L UNV | Catalog match | Abbreviation; 210/250/300L variants (AI) |
| ZAPPI 7KW UNTETH BLK | Catalog match | Picking untethered + black of 3 variants (AI) |
| DAIKIN ALTHERMA 3 MONO 8KW | Needs review | Genuinely ambiguous: two 8kW Altherma 3 models |
| TIGO TS4-A-O OPTIMISER 700W | Catalog match | Manufacturer article no. (rules) |
| SUNSYNK L5.1 5.12KWH BATTERY | New | Not in catalog: create, flag missing specs |
| 6MM TWIN & EARTH, MC4 CONNECTORS | Ignored | Consumables |
| DELIVERY - PALLET | Ignored | Delivery charge |

### NRS-INV-25033 (6 lines)

| Line | Expected outcome | What it tests |
|---|---|---|
| AIKO NEOSTAR 2P 450W BLK FR | Catalog match | Supplier code (rules) |
| GIVENERGY GEN3 HYBRID 5KW | Already in database, same price | Duplicate, no change |
| OHME HOME PRO 7KW TETH 8M | Catalog match | 5m vs 8m variant (AI) |
| FOX ESS EP11 BATT 10.36KWH | Catalog match | No code match (AI) |
| K2 MINIRAIL 2.2M | New | Accessory not in catalog |
| CARRIAGE | Ignored | Delivery charge |
