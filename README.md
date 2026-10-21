# Reonic PM case study prototype

One site for both parts of the case study. The home page (`#`) has a card per part; clicking one opens a write-up with a link to the prototype. A purple case-study bar runs across the top of both parts.

- **Part 1 · Product thinking** (`#components`, `#import`): invoice → components, described below.
- **Part 2 · Product taste** (`#offer/changes`, `#offer`, `#offer/updated`): Screen C, the digital offer: the three changes, the screen as provided in the brief, and the updated screen, switchable with tabs.

## Part 1: Invoice → Components

Upload a supplier invoice (PDF or photo). The app extracts the line items, matches each one against the installer's existing components and a central catalog, then shows a pre-filled list to review and confirm.

**All data here is invented for the demo.** Brand and model names are real products, but article numbers, supplier codes, MCS certificate numbers, specs and prices are made up or approximate.

## Running it

Needs Node 22 (or 20.12+).

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # review-step tests, offline
```

Go to **Import from invoice**, pick a sample (or drop your own PDF/photo), review the matches and confirm. The new components appear on the **Components** page. No API key needed: the page calls Claude through the `claude-proxy` Edge Function (see below). Changes are kept in your browser; **Reset demo data** in the sidebar starts over. Import the same invoice twice to see the learned supplier codes match everything instantly. 

To score extraction against the expected results:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env   # git-ignored
npm run eval                 # all 4 sample files
npm run eval -- photo        # only the photos
npm run eval -- --runs 3     # repeat each to check consistency
```

Each run prints field accuracy, tokens, time and cost per file, and saves full results to `eval-results/` (git-ignored).

To score matching (no API calls, free):

```bash
npm run eval:match                 # uses the lines from .expected.json
npm run eval:match -- --extracted  # uses what the model actually read in the latest `npm run eval`
npm run eval:match -- --ai         # also runs the AI step (calls the API); add --runs 3 to check consistency
```

## Supabase

Project `vefbvrgnobfapzosivag` is shared with another app, so everything here is prefixed `reonic_`.

- `supabase/migrations/*.sql`: schema changes, applied in name order and recorded in `reonic_schema_migrations`.
- `supabase/functions/claude-proxy`: forwards Messages API calls with the demo's Anthropic key, held as a Supabase secret. Only accepts the demo's origins and allowed models, caps `max_tokens`, and stops after `DAILY_CALL_LIMIT` calls a day (default 300), counted in `reonic_api_usage`.

```bash
# .env needs SUPABASE_ACCESS_TOKEN=sbp_... (and ANTHROPIC_API_KEY for the secret)
npm run supabase -- migrate
npm run supabase -- secret ANTHROPIC_API_KEY
npm run supabase -- deploy claude-proxy
npm run supabase -- sql "select * from reonic_api_usage"
```

Behind a proxy that Node's `fetch` ignores, prefix these with `NODE_USE_ENV_PROXY=1`.

## Deploying to GitHub Pages

Push to `main`, then in the repo go to **Settings → Pages → Source: GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds and publishes the site on every push.

Never commit an API key. The site asks for one at runtime instead.

## Code

| File | Purpose |
|---|---|
| `src/api.ts` | Minimal `fetch` wrapper for the Messages API: direct with a key, through `claude-proxy` without |
| `src/config.ts` | Public Supabase settings (project URL, anon key, proxy URL) |
| `src/extract.ts` | Pipeline step 1: invoice → structured line items, using a JSON schema so the response shape is guaranteed. Also checks the model's arithmetic. |
| `src/match.ts` | Pipeline step 2: rule-based matching. Supplier code → manufacturer article no. → your own article no.; then duplicate and price-change check. Anything left gets a shortlist of candidates for the AI step or a person. |
| `src/resolve.ts` | Pipeline step 3: one AI call per invoice picks from each shortlist (or says it's unclear, so a person decides), and reads lines with no catalog match into a type, manufacturer, model and specs for the new record. It can only pick shortlisted items, so it can't invent a match. |
| `src/review.ts` | Pipeline step 4: the installer's decisions per line, and the changes they produce (new records, price updates, supplier codes to remember). Sales prices are suggested at the installer's usual markup, learned from their existing products. |
| `src/samples.ts`, `src/zip.ts` | The sample invoices (shown as cards on the upload page) and the "Download invoice bundle" button in the case-study bar, which zips them in the browser |
| `src/store.ts` | Data access behind a `Store` interface. Today: the JSON seed data plus localStorage. Later: Supabase. |
| `src/types.ts` | Shared types |
| `src/cost.ts` | Token → USD estimate |
| `src/main.ts` | Router and case-study home page |
| `src/part1.ts`, `index.html`, `src/style.css` | Part 1 UI: components list, and the upload → processing → review → confirm flow |
| `src/part2/` | Part 2: Screen C. `original.ts` recreates it as given in the brief; `updated.ts` is the redesign (grouped expandable nav, price breakdown with grant and savings, house illustration linked to the costs, English/German); `art.ts` holds the shared artwork; `index.ts` switches between them with tabs (`#offer`, `#offer/updated`). |
| `scripts/eval-extraction.ts` | Extraction accuracy against `public/samples/*.expected.json` |
| `scripts/eval-matching.ts` | Matching accuracy against the same files |
| `scripts/test-review.ts` | Tests for the review step (`npm test`), with the AI step simulated from the expected results |
| `scripts/supabase.ts` | Migrations, Edge Function deploys and secrets via the Supabase Management API |

## Data

| File | What it is |
|---|---|
| `data/catalog.json` | 43 components standing in for the central database: heat pumps, cylinders, batteries, inverters, PV modules, optimisers, EV chargers, accessories. Each has a manufacturer article number, specs, markets, UK MCS data where relevant, and supplier aliases. |
| `data/my-components.json` | The installer's existing database: 5 products and 3 services. |

## Sample invoices

From a fictional wholesaler, *Northbridge Renewables Supply Ltd*, to a fictional installer, *Brightwell Heat & Solar Ltd*. Each comes as a clean PDF and a photo-style JPG, plus an `.expected.json` with the correct outcome for every line, used for measuring accuracy. `public/samples/previews/` holds an image of each, used for the sample cards and while an invoice is being read (made with `pdftoppm` for the PDFs).

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
