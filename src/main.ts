// Entry point: one site for both parts of the case study.
//   #             home, with a card per part; clicking a card opens its write-up
//   #components   Part 1, the components list    (#import: the invoice import flow)
//   #offer/changes  Part 2: the three changes   (#offer: Screen C as provided, #offer/updated: updated,
//                   #offer/post: post-submission redesign)
// A case-study bar runs across the top of both parts, so they read as two sections of one piece of work.

import { showPart1 } from "./part1.ts";
import { showPart2 } from "./part2/index.ts";
import { downloadBundle } from "./samples.ts";

const bar = document.getElementById("case-bar")!;
const home = document.getElementById("home")!;
const part1 = document.getElementById("part1")!;
const part2 = document.getElementById("part2")!;

type PartId = "part1" | "part2";

const PARTS: Record<PartId, { label: string; title: string; teaser: string; href: string; cta: string; writeup: string }> = {
  part1: {
    label: "Part 1 · Product thinking",
    title: "Invoice → Components",
    teaser: "Installers already have their supplier invoices. Upload one and every line is read, matched to the catalog and their own database, and added after a quick review.",
    href: "#components",
    cta: "See the prototype",
    writeup: `
      <h3>The problem</h3>
      <p>Installers spend too long setting up their component database. Every heat pump, battery and wallbox needs an article number, prices and specs, typed in one by one.</p>

      <h3>The idea</h3>
      <p>The data already exists. Every component an installer has bought is on a supplier invoice in their inbox. We could remove most of the input time if the user uploads the invoice, either as a PDF or a phone photo, and the components come out the other side, matched and ready to confirm.</p>

      <h3>How it works</h3>
      <ol>
        <li><b>Read.</b> Claude reads every line: code, description, quantity and net price, as structured data. The line totals are checked against the invoice total to catch misreads.</li>
        <li><b>Match by rules first.</b> Known supplier codes and manufacturer article numbers match instantly, without AI. Each match is checked against the installer's own database, so duplicates and price changes are flagged.</li>
        <li><b>AI only where it's needed.</b> For the rest, the rules build a shortlist from the catalog and Claude picks one, or says it can't tell. It can only choose from the shortlist, so it can't invent a product.</li>
        <li><b>Review and confirm.</b> Lines are grouped by what needs attention: decisions first, then new products, price changes and catalog matches. Sales prices are pre-filled at the installer's usual markup. One click adds everything.</li>
        <li><b>Learn.</b> Confirming teaches the catalog that supplier's codes, so the next invoice from them matches by rule.</li>
      </ol>

      <h3>How the AI is integrated</h3>
      <ul>
        <li><b>Two narrow jobs, not a chatbot.</b> One call reads the invoice into structured data. A second call runs only for lines the rules couldn't settle, and only picks from a shortlist.</li>
        <li><b>Guardrails.</b> Line totals are checked against the invoice total. The AI can't invent a catalog match, and can answer "unsure" so a person decides. Nothing is saved until the installer confirms.</li>
        <li><b>Measured, not assumed.</b> An evaluation scores reading and matching against known answers on every change.</li>
        <li><b>Gets cheaper with use.</b> Confirmed supplier codes are remembered, so repeat purchases match by rule without the AI.</li>
      </ul>

      <h3>Why it fits Reonic</h3>
      <ul>
        <li>It uses something installers already have and already handle, so there's no new habit to learn.</li>
        <li>It keeps working after onboarding: every new invoice updates prices and adds new models.</li>
        <li>Each confirmed match is a verified supplier code for the central catalog, which helps with "our central database is often outdated".</li>
      </ul>

      <h3>Results so far</h3>
      <ul>
        <li>On two sample invoices (17 lines), every line ends up right, consistently over 3 runs.</li>
        <li>Ambiguous cases, such as with 'Daikin', where two 8kW models fit the description, are left for the installer to decide, instead of being guessed.</li>
        <li>An invoice takes about 12 seconds, at about $0.03 in AI costs.</li>
        <li>Importing the same invoice a second time matches everything by code, so only the reading step uses AI.</li>
      </ul>

      <h3>Evidence to gather first</h3>
      <ul>
        <li><b>Do invoices list several components, or are parts bought one at a time?</b> Ask installers for 10–20 recent invoices and count component lines per invoice, suppliers, and "system pack" lines that hide several parts. Ask how they buy: stocking up from a wholesaler, per project, or direct from manufacturers, and whether it differs by market. If most invoices hold one item, the value shifts to keeping the database current and to a single-product photo mode.</li>
        <li><b>How painful is setup today?</b> Customer Success: how long setups take, how many sessions, where installers get stuck. Product data: time to the first 20 components, and accounts that stall at setup.</li>
        <li><b>Do installers have the invoices to hand?</b> 5–8 installer interviews across DACH, UK and Italy: PDFs, paper, wholesaler portals?</li>
        <li><b>Does it work on real invoices?</b> Run the pipeline offline on 50–100 real invoices per market and measure reading and matching accuracy. This is the biggest risk.</li>
        <li><b>Is the review trusted?</b> Usability sessions with a few installers: do they trust the matches, and is reviewing faster than typing?</li>
      </ul>

      <h3>Measuring success</h3>
      <ul>
        <li><b>Main measure:</b> time from account creation to a usable database (for example the first 20 components).</li>
        <li><b>Adoption:</b> share of new accounts that import at least one invoice, and invoices imported per account.</li>
        <li><b>Quality:</b> share of lines confirmed without edits, and how often an imported component is corrected later.</li>
        <li><b>Lasting use:</b> imports after onboarding, and price changes picked up from them.</li>
        <li><b>For Reonic:</b> fewer Customer Success hours spent on setup, and verified supplier codes added to the central catalog.</li>
        <li><b>Guardrail:</b> no rise in support tickets or wrong prices in offers caused by imported components.</li>
      </ul>
      <p>The result card after each import already shows early versions of these: time taken, lines settled by rule, by AI or by the installer, and supplier codes learned.</p>

      <h3>What's simulated</h3>
      <p>The 43-item catalog stands in for Reonic's central database, and the supplier and invoices are invented. Changes are saved in your browser; "Reset demo data" in the sidebar starts over.</p>`,
  },
  part2: {
    label: "Part 2 · Product taste",
    title: "Screen C: the digital offer",
    teaser: "The digital offer an end customer receives: what gets in the way, and a better version.",
    href: "#offer/changes",
    cta: "See the screen",
    writeup: `
      <h3>The screen</h3>
      <p>Screen C is the digital offer an end customer receives. It needs to explain the price and make the next step obvious. The prototype recreates it as given in the brief, flaws included, as the "before".</p>

      <h3>What gets in the way</h3>
      <ol>
        <li><b>The greeting is broken.</b> "Sehr geehrte/r ," has no name, and it's German on an otherwise English page.</li>
        <li><b>The price has no context.</b> £59,500 sits under generic benefit statements, with no breakdown, savings or payback.</li>
        <li><b>The navigation overwhelms.</b> There are 22 items, "Your heat balance" appears twice, and the MCS compliance documents sit alongside the sales story.</li>
        <li><b>There's no clear next step.</b> "Accept" is buried in the nav; the most prominent button is "View PDF".</li>
        <li><b>The illustration doesn't connect to the price.</b> It shows which products are in the offer, but nothing links a product to what it costs.</li>
      </ol>

      <h3>Next</h3>
      <p>Pick three of these and design the improved version alongside the original.</p>`,
  },
};

let openPart: PartId | null = null;

function renderHome() {
  const card = (id: PartId) => {
    const p = PARTS[id];
    const open = openPart === id;
    return `<button class="card part ${open ? "open" : ""}" data-part="${id}" aria-expanded="${open}">
      <span class="label">${p.label}</span>
      <h2>${p.title}</h2>
      <p>${p.teaser}</p>
      <span class="go">${open ? "Hide the write-up ↑" : "Read the write-up ↓"}</span>
    </button>`;
  };
  const p = openPart ? PARTS[openPart] : null;
  home.innerHTML = `
    <header class="home-band">
      <div class="home-inner">
        <div class="eyebrow">Reonic · Product Management case study</div>
        <h1>Two parts, one prototype</h1>
        <p>Part 1 is a working prototype for the component database problem. Part 2 takes one screen apart and puts it back together.</p>
      </div>
    </header>
    <div class="home-inner">
      <div class="parts">${card("part1")}${card("part2")}</div>
      ${p ? `
        <article class="card writeup" id="writeup">
          <div class="writeup-head">
            <div><span class="label">${p.label}</span><h2>${p.title}</h2></div>
            <a class="btn primary big" href="${p.href}">${p.cta} →</a>
          </div>
          <div class="writeup-body">${p.writeup}</div>
          <div class="writeup-foot"><a class="btn primary big" href="${p.href}">${p.cta} →</a></div>
        </article>` : ""}
    </div>`;
}

home.addEventListener("click", (e) => {
  const id = (e.target as HTMLElement).closest<HTMLElement>("[data-part]")?.dataset.part as PartId | undefined;
  if (!id) return;
  openPart = openPart === id ? null : id;
  renderHome();
  if (openPart) document.getElementById("writeup")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

function renderBar(current: PartId) {
  const other: PartId = current === "part1" ? "part2" : "part1";
  bar.innerHTML = `
    <a href="#" class="bar-home">← Case study</a>
    <span class="bar-current">${PARTS[current].label}: ${PARTS[current].title}</span>
    ${current === "part1" ? `<button class="bar-download" id="download-bundle">↓ Download invoice bundle</button>` : ""}
    <a href="${PARTS[other].href}" class="bar-other">${PARTS[other].label.split(" · ")[0]} →</a>`;
}

function route() {
  const hash = location.hash;
  const current: PartId | null = hash === "#components" || hash === "#import" ? "part1"
    : hash.startsWith("#offer") ? "part2" : null;
  const page = current === "part1" ? part1 : current === "part2" ? part2 : home;
  for (const el of [home, part1, part2]) el.hidden = el !== page;
  bar.hidden = !current;
  if (current) renderBar(current);
  if (current === "part1") showPart1(hash);
  else if (current === "part2") showPart2(hash);
  else renderHome();
  window.scrollTo(0, 0);
}

bar.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("#download-bundle");
  if (!btn) return;
  btn.disabled = true;
  try { await downloadBundle(); } finally { btn.disabled = false; }
});

window.addEventListener("hashchange", route);
route();
