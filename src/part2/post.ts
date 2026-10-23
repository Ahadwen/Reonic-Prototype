// Screen C, post-submission update. A step further than the three changes: the middle of the page
// becomes a set of slides (welcome, at a glance, costs and savings, your system, your home) with
// Back and Next, the sections of "Your system" and "Your home" open as cards inside the slide, and
// the call to action stays in view on the right throughout.
// Figures are illustrative, like the rest of the updated screen.

import { check, house, linkIcon, logo, type Item } from "./art.ts";
import {
  chevron, COPY, COSTS, GRANT, money, renderCta, renderSignModal, VALID_UNTIL, wireShared,
  type Lang, type NavGroup,
} from "./updated.ts";

type CardId =
  | "solar" | "components" | "yield" | "storage" | "heatpump" | "all"
  | "building" | "household" | "heat";

interface Card { id: CardId; title: string; summary: string; facts: [string, string][]; body: string }

const SYSTEM_CARDS: CardId[] = ["solar", "components", "yield", "storage", "heatpump", "all"];
const HOME_CARDS: CardId[] = ["building", "household", "heat"];

const POST = {
  en: {
    slides: ["At a glance", "Costs and savings", "Your system", "Your home"],
    welcomeCta: "View your offer",
    summary: (price: string, valid: string) => [
      ["Includes", "Solar system · Battery storage · Heat pump"],
      ["Your price", `${price} after the grant`],
      ["Valid until", valid],
    ],
    costsLead: "What each part costs, the grant, and what you get back.",
    systemLead: "Open a section to see the details.",
    homeLead: "What we found at your home, and how the system is sized for it.",
    back: "Back",
    next: "Next",
    backTo: (s: string) => `Back to ${s}`,
    open: "Open",
    of: (i: number, n: number) => `${i} of ${n}`,
    overview: ["At a glance"],
    docsLink: (n: number) => `See your documents (${n})`,
    docsTitle: "Your documents",
    docsLead: "Datasheets, the MCS paperwork and the survey results. Open one to see what's in it.",
    backToOffer: "Back to the offer",
    backToDocs: "Back to your documents",
    download: "Download PDF",
    demoNote: "Demo: no file is attached.",
    docFacts: ["Format", "Prepared by", "Date"],
    docs: [
      ["Manufacturer datasheets for every component in the offer.", "PDF bundle · 6 files"],
      ["Expected efficiency and running costs of the heat pump, in the MCS format.", "PDF · 4 pages"],
      ["Noise at the nearest neighbouring window, checked against the MCS limit.", "PDF · 2 pages"],
      ["Contract terms, warranties and what MCS certification covers.", "PDF · 3 pages"],
      ["Expected yearly yield of the solar system, in the MCS format.", "PDF · 2 pages"],
      ["Room-by-room heat loss, and the radiators being upgraded.", "PDF · 6 pages"],
      ["The heat pump model proposed, and how it was sized.", "PDF · 2 pages"],
      ["Shading on the roof through the year.", "PDF · 1 page"],
    ] as [string, string][],
    cards: {
      solar: { title: "Solar system", summary: "8.8 kWp on the south-facing roof",
        facts: [["Panels", "20 × 440 W, all black"], ["Peak output", "8.8 kWp"], ["Roof", "South-facing, 35° pitch"], ["Inverter", "Hybrid, 5 kW"]],
        body: "The panels cover the main south roof. The hybrid inverter also runs the battery, so there's one unit on the wall instead of two." },
      components: { title: "Solar components", summary: "Panels, inverter, mounting and optimisers",
        facts: [["Panels", "JA Solar DeepBlue 4.0, 440 W"], ["Inverter", "GivEnergy Gen3 Hybrid, 5 kW"], ["Mounting", "K2 Systems rails"], ["Optimisers", "Tigo TS4-A-O on 4 shaded panels"]],
        body: "Datasheets for every component are under Documents." },
      yield: { title: "Electricity yield", summary: "About 7,900 kWh a year",
        facts: [["Yearly yield", "≈ 7,900 kWh"], ["Used at home", "≈ 5,500 kWh"], ["Exported to the grid", "≈ 2,400 kWh"], ["Best month", "June, ≈ 1,050 kWh"]],
        body: "Estimated from your roof's orientation, pitch and shading. Exported electricity earns a payment from your energy supplier." },
      storage: { title: "Energy storage", summary: "13.5 kWh battery",
        facts: [["Capacity", "13.5 kWh"], ["How it's used", "Charges by day, powers evenings and nights"], ["Backup", "Optional, for essential circuits"], ["Warranty", "10 years"]],
        body: "The battery stores daytime solar for when you need it, which is what lifts your own-roof share to around 72 %." },
      heatpump: { title: "Heat pump", summary: "11.2 kW air source, replacing your gas boiler",
        facts: [["Output", "11.2 kW"], ["Efficiency", "SCOP ≈ 3.8"], ["Hot water", "250 L cylinder"], ["Radiators", "6 upgraded for lower flow temperatures"]],
        body: "Sized for your home's heat loss with room for cold spells. The cylinder replaces the boiler's hot water supply." },
      all: { title: "All components", summary: "Everything in this offer, item by item",
        facts: [["Solar panels", "20"], ["Hybrid inverter", "1"], ["Battery", "1"], ["Heat pump", "1"], ["Hot water cylinder", "1"], ["Radiators", "6"], ["Mounting kit", "1"]],
        body: "Prices per product are on the Costs and savings slide." },
      building: { title: "Building", summary: "Detached house, built 1978",
        facts: [["Type", "Detached, two storeys"], ["Built", "1978"], ["Heated area", "142 m²"], ["Insulation", "Cavity wall, 270 mm loft"]],
        body: "Recorded during the home survey." },
      household: { title: "Your household", summary: "4 people, about 3,900 kWh of electricity a year",
        facts: [["People", "4"], ["Electricity today", "≈ 3,900 kWh a year"], ["Gas today", "≈ 14,500 kWh a year"], ["With the heat pump", "≈ 7,700 kWh electricity, no gas"]],
        body: "Your usage today is the basis for the savings estimates." },
      heat: { title: "Your heat balance", summary: "Heat loss of about 9.6 kW on the coldest day",
        facts: [["Heat loss", "≈ 9.6 kW at −3 °C"], ["Heating", "≈ 12,300 kWh a year"], ["Hot water", "≈ 2,200 kWh a year"], ["Heat pump size", "11.2 kW"]],
        body: "Calculated room by room. Six radiators are upgraded so the heat pump can run at lower, more efficient temperatures." },
    } as Record<CardId, Omit<Card, "id">>,
  },
  de: {
    slides: ["Auf einen Blick", "Kosten und Ersparnis", "Ihre Anlage", "Ihr Zuhause"],
    welcomeCta: "Zum Angebot",
    summary: (price: string, valid: string) => [
      ["Enthält", "Solaranlage · Batteriespeicher · Wärmepumpe"],
      ["Ihr Preis", `${price} nach Förderung`],
      ["Gültig bis", valid],
    ],
    costsLead: "Was jeder Teil kostet, die Förderung und was Sie zurückbekommen.",
    systemLead: "Öffnen Sie einen Bereich für die Details.",
    homeLead: "Was wir bei Ihnen vorgefunden haben und wie die Anlage dafür ausgelegt ist.",
    back: "Zurück",
    next: "Weiter",
    backTo: (s: string) => `Zurück zu ${s}`,
    open: "Öffnen",
    of: (i: number, n: number) => `${i} von ${n}`,
    overview: ["Auf einen Blick"],
    docsLink: (n: number) => `Ihre Dokumente ansehen (${n})`,
    docsTitle: "Ihre Dokumente",
    docsLead: "Datenblätter, die MCS-Unterlagen und die Ergebnisse des Vor-Ort-Termins. Öffnen Sie ein Dokument, um den Inhalt zu sehen.",
    backToOffer: "Zurück zum Angebot",
    backToDocs: "Zurück zu Ihren Dokumenten",
    download: "PDF herunterladen",
    demoNote: "Demo: keine Datei hinterlegt.",
    docFacts: ["Format", "Erstellt von", "Datum"],
    docs: [
      ["Herstellerdatenblätter zu allen Komponenten im Angebot.", "PDF-Paket · 6 Dateien"],
      ["Erwartete Effizienz und Betriebskosten der Wärmepumpe im MCS-Format.", "PDF · 4 Seiten"],
      ["Schallpegel am nächsten Nachbarfenster, geprüft gegen den MCS-Grenzwert.", "PDF · 2 Seiten"],
      ["Vertragsbedingungen, Garantien und was die MCS-Zertifizierung abdeckt.", "PDF · 3 Seiten"],
      ["Erwarteter Jahresertrag der Solaranlage im MCS-Format.", "PDF · 2 Seiten"],
      ["Raumweise Heizlast und die Heizkörper, die getauscht werden.", "PDF · 6 Seiten"],
      ["Das vorgeschlagene Wärmepumpenmodell und seine Auslegung.", "PDF · 2 Seiten"],
      ["Verschattung des Dachs im Jahresverlauf.", "PDF · 1 Seite"],
    ] as [string, string][],
    cards: {
      solar: { title: "Solaranlage", summary: "8,8 kWp auf dem Süddach",
        facts: [["Module", "20 × 440 W, komplett schwarz"], ["Spitzenleistung", "8,8 kWp"], ["Dach", "Südausrichtung, 35° Neigung"], ["Wechselrichter", "Hybrid, 5 kW"]],
        body: "Die Module belegen das Hauptdach nach Süden. Der Hybrid-Wechselrichter steuert auch den Speicher, so hängt nur ein Gerät an der Wand." },
      components: { title: "Solarkomponenten", summary: "Module, Wechselrichter, Montage und Optimierer",
        facts: [["Module", "JA Solar DeepBlue 4.0, 440 W"], ["Wechselrichter", "GivEnergy Gen3 Hybrid, 5 kW"], ["Montage", "K2 Systems Schienen"], ["Optimierer", "Tigo TS4-A-O an 4 verschatteten Modulen"]],
        body: "Datenblätter zu allen Komponenten finden Sie unter Dokumente." },
      yield: { title: "Stromertrag", summary: "Etwa 7.900 kWh pro Jahr",
        facts: [["Jahresertrag", "≈ 7.900 kWh"], ["Selbst genutzt", "≈ 5.500 kWh"], ["Eingespeist", "≈ 2.400 kWh"], ["Bester Monat", "Juni, ≈ 1.050 kWh"]],
        body: "Geschätzt aus Ausrichtung, Neigung und Verschattung Ihres Dachs. Für eingespeisten Strom erhalten Sie eine Vergütung Ihres Energieversorgers." },
      storage: { title: "Energiespeicher", summary: "Batteriespeicher mit 13,5 kWh",
        facts: [["Kapazität", "13,5 kWh"], ["Nutzung", "Lädt tagsüber, versorgt abends und nachts"], ["Notstrom", "Optional, für wichtige Stromkreise"], ["Garantie", "10 Jahre"]],
        body: "Der Speicher hebt Solarstrom für später auf. Dadurch kommen rund 72 % Ihres Stroms vom eigenen Dach." },
      heatpump: { title: "Wärmepumpe", summary: "11,2 kW Luft-Wasser, ersetzt Ihren Gaskessel",
        facts: [["Leistung", "11,2 kW"], ["Effizienz", "JAZ ≈ 3,8"], ["Warmwasser", "250-L-Speicher"], ["Heizkörper", "6 getauscht für niedrigere Vorlauftemperaturen"]],
        body: "Auf die Heizlast Ihres Hauses ausgelegt, mit Reserve für kalte Tage. Der Speicher übernimmt die Warmwasserbereitung des Kessels." },
      all: { title: "Alle Komponenten", summary: "Alles in diesem Angebot, Position für Position",
        facts: [["Solarmodule", "20"], ["Hybrid-Wechselrichter", "1"], ["Batteriespeicher", "1"], ["Wärmepumpe", "1"], ["Warmwasserspeicher", "1"], ["Heizkörper", "6"], ["Montageset", "1"]],
        body: "Die Preise je Produkt stehen auf der Folie Kosten und Ersparnis." },
      building: { title: "Gebäude", summary: "Freistehendes Haus, Baujahr 1978",
        facts: [["Art", "Freistehend, zweigeschossig"], ["Baujahr", "1978"], ["Beheizte Fläche", "142 m²"], ["Dämmung", "Kerndämmung, 270 mm Dachboden"]],
        body: "Beim Vor-Ort-Termin aufgenommen." },
      household: { title: "Ihr Haushalt", summary: "4 Personen, etwa 3.900 kWh Strom pro Jahr",
        facts: [["Personen", "4"], ["Strom heute", "≈ 3.900 kWh pro Jahr"], ["Gas heute", "≈ 14.500 kWh pro Jahr"], ["Mit Wärmepumpe", "≈ 7.700 kWh Strom, kein Gas"]],
        body: "Ihr heutiger Verbrauch ist die Grundlage der Ersparnisschätzung." },
      heat: { title: "Ihre Wärmebilanz", summary: "Heizlast von etwa 9,6 kW am kältesten Tag",
        facts: [["Heizlast", "≈ 9,6 kW bei −3 °C"], ["Heizung", "≈ 12.300 kWh pro Jahr"], ["Warmwasser", "≈ 2.200 kWh pro Jahr"], ["Wärmepumpe", "11,2 kW"]],
        body: "Raum für Raum berechnet. Sechs Heizkörper werden getauscht, damit die Wärmepumpe mit niedrigeren, effizienteren Temperaturen läuft." },
    } as Record<CardId, Omit<Card, "id">>,
  },
};

// Which slide and card are showing; kept across language switches and tab changes.
let slide = 0;
let openCard: CardId | null = null;
// The documents view replaces the slides until the customer goes back to the offer.
let docsOpen = false;
let openDoc: number | null = null;
const navOpen = new Map<number, boolean>();

// Nav groups map onto slides and cards, or documents. "Next steps" isn't here: the
// call-to-action panel is always on screen and covers it.
type Target = { slide: number; card?: CardId } | { doc: number } | null;
function navGroups(lang: Lang): { group: NavGroup; targets: Target[] }[] {
  const base = COPY[lang].nav;
  return [
    // Same order as the slides: welcome and at a glance, costs, your system, your home.
    { group: { ...base[0], items: POST[lang].overview }, targets: [{ slide: 0 }] },
    { group: base[3], targets: base[3].items.map(() => ({ slide: 1 })) },
    { group: base[1], targets: SYSTEM_CARDS.map((card) => ({ slide: 2, card })) },
    { group: base[2], targets: HOME_CARDS.map((card) => ({ slide: 3, card })) },
    { group: base[5], targets: base[5].items.map((_, doc) => ({ doc })) },
  ];
}

// Each nav group heading leads to the root of its area, in the same order as navGroups().
type Area = { slide: number } | "docs";
const AREAS: Area[] = [{ slide: 0 }, { slide: 1 }, { slide: 2 }, { slide: 3 }, "docs"];
const atArea = (a: Area) => a === "docs" ? docsOpen && openDoc === null : !docsOpen && slide === a.slide && openCard === null;

const isCurrent = (t: Target) => {
  if (t === null) return false;
  if ("doc" in t) return docsOpen && openDoc === t.doc;
  return !docsOpen && t.slide === slide && (t.card ?? null) === (openCard ?? null);
};
const inView = (t: Target) => t !== null && ("doc" in t ? docsOpen : !docsOpen && t.slide === slide);

function renderNav(lang: Lang) {
  const groups = navGroups(lang);
  // The first nav item that points at what's on screen is the current one.
  const gi0 = groups.findIndex((g) => g.targets.some(isCurrent));
  const current = gi0 < 0 ? "" : `${gi0}:${groups[gi0].targets.findIndex(isCurrent)}`;
  return groups.map(({ group, targets }, gi) => {
    const holdsCurrent = targets.some(inView);
    const open = navOpen.get(gi) ?? (holdsCurrent || group.open);
    // Documents aren't part of the slide sequence, so a divider sets them apart.
    const apart = AREAS[gi] === "docs" ? "apart" : "";
    return `<div class="nav-group ${open ? "open" : ""} ${apart}">
      <button class="nav-group-head ${atArea(AREAS[gi]) ? "current" : ""}" data-pgroup="${gi}" aria-expanded="${open}">${chevron}<span>${group.title}</span><span class="nav-count">${group.items.length}</span></button>
      <div class="nav-items">${group.items.map((label, i) => {
        const active = current === `${gi}:${i}`;
        return `<button class="${active ? "active" : ""} ${targets[i] === null ? "no-slide" : ""}" data-pnav="${gi}:${i}" ${active ? `aria-current="true"` : ""}>${label}</button>`;
      }).join("")}</div>
    </div>`;
  }).join("");
}

function renderDocs(lang: Lang) {
  const p = POST[lang];
  const names = COPY[lang].nav[5].items;
  if (openDoc !== null) {
    const [desc, format] = p.docs[openDoc];
    const date = new Intl.DateTimeFormat(COPY[lang].locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(2026, 9, 16));
    return `<div class="card-open">
      <button class="card-back" data-close-doc>← ${p.backToDocs}</button>
      <h2>${names[openDoc]}</h2>
      <p class="card-open-lead">${desc}</p>
      <dl class="facts">${[[p.docFacts[0], format], [p.docFacts[1], COPY[lang].from.replace(/^\S+ /, "")], [p.docFacts[2], date]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      <div class="doc-actions"><button class="deck-btn primary" data-doc-download>↓ ${p.download}</button><span class="hint">${p.demoNote}</span></div>
    </div>`;
  }
  return `<h1>${p.docsTitle}</h1>
    <p class="slide-lead">${p.docsLead}</p>
    <div class="card-grid docs">${names.map((name, i) => `
      <button class="info-card doc-card" data-doc="${i}">
        <span class="doc-icon" aria-hidden="true">PDF</span>
        <span class="doc-text"><b>${name}</b><em>${p.docs[i][1]}</em></span>
      </button>`).join("")}</div>`;
}

function renderCards(lang: Lang, ids: CardId[], parent: string) {
  const p = POST[lang];
  if (openCard && ids.includes(openCard)) {
    const c = p.cards[openCard];
    return `<div class="card-open">
      <button class="card-back" data-close-card>← ${p.backTo(parent)}</button>
      <h2>${c.title}</h2>
      <p class="card-open-lead">${c.summary}</p>
      <dl class="facts">${c.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      <p class="card-open-body">${c.body}</p>
    </div>`;
  }
  return `<div class="card-grid">${ids.map((id) => `
    <button class="info-card" data-card="${id}">
      <b>${p.cards[id].title}</b>
      <span>${p.cards[id].summary}</span>
      <em>${p.open} →</em>
    </button>`).join("")}</div>`;
}

function renderSlide(lang: Lang) {
  const t = COPY[lang];
  const p = POST[lang];
  const total = COSTS.reduce((s, c) => s + c.amount, 0);
  const price = money(total - GRANT, t.locale, 2);
  const amount = (item: Item) => money(COSTS.find((c) => c.item === item)!.amount, t.locale);

  switch (slide) {
    case 0: return `
      <h1>${t.glance}</h1>
      <div class="glance-grid">
        <ul class="offer-checks">
          ${(["solar", "battery", "heatpump"] as Item[]).map((i) => `<li data-item="${i}">${check}<span>${t.checks[i]}<b class="check-price">${t.labels[i]} · ${amount(i)}</b></span></li>`).join("")}
        </ul>
        <div class="glance-art">${house(t.labels, true, t.houseAria)}<p class="house-hint">${t.houseHint}</p></div>
      </div>`;
    case 1: return `
      <h1>${p.slides[1]}</h1>
      <p class="slide-lead">${p.costsLead}</p>
      <div class="costs-grid">
        <div>
          ${COSTS.map((c) => {
            const [name, detail] = t.rows[c.item];
            return `<div class="cost-row" ${c.item !== "project" ? `data-item="${c.item}"` : ""}><div><b>${name}</b><small>${detail}</small></div><span>${money(c.amount, t.locale)}</span></div>`;
          }).join("")}
          <div class="cost-row subtotal"><span>${t.beforeGrant}</span><span>${money(total, t.locale)}</span></div>
          <div class="cost-row grant"><div><b>${t.grant}</b><small>${t.grantNote}</small></div><span>− ${money(GRANT, t.locale)}</span></div>
          <div class="cost-row price"><span>${t.yourPrice}</span><span>${price}</span></div>
        </div>
        <div class="stats stacked">${t.stats.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("")}<p class="estimates">${t.estimates}</p></div>
      </div>`;
    // An open card takes over the whole slide; its back link names the section it returns to.
    case 2: return openCard && SYSTEM_CARDS.includes(openCard)
      ? renderCards(lang, SYSTEM_CARDS, p.slides[2])
      : `<h1>${p.slides[2]}</h1><p class="slide-lead">${p.systemLead}</p>${renderCards(lang, SYSTEM_CARDS, p.slides[2])}`;
    default: return openCard && HOME_CARDS.includes(openCard)
      ? renderCards(lang, HOME_CARDS, p.slides[3])
      : `<h1>${p.slides[3]}</h1><p class="slide-lead">${p.homeLead}</p>${renderCards(lang, HOME_CARDS, p.slides[3])}`;
  }
}

// The greeting and summary open over the offer when the customer arrives, instead of being a slide.
let welcomeOpen = true;
export function openWelcome() { welcomeOpen = true; }

function renderWelcome(lang: Lang) {
  const t = COPY[lang];
  const p = POST[lang];
  const price = money(COSTS.reduce((s, c) => s + c.amount, 0) - GRANT, t.locale, 2);
  const valid = new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "long", year: "numeric" }).format(VALID_UNTIL);
  return `<div class="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title" lang="${lang}">
    <div class="welcome">
      <div class="welcome-top">
        <div class="offer-logo">${logo}</div>
        <div><div class="offer-title">${t.offerTitle}</div><div class="offer-from">${t.from}</div></div>
        <div class="lang-switch" role="group" aria-label="Language">
          ${(["en", "de"] as Lang[]).map((l) => `<button data-welcome-lang="${l}" class="${l === lang ? "active" : ""}" aria-pressed="${l === lang}">${COPY[l].langName}</button>`).join("")}
        </div>
      </div>
      <h1 id="welcome-title">${t.greeting}</h1>
      ${t.intro.map((x) => `<p>${x}</p>`).join("")}
      <dl class="summary-list">${p.summary(price, valid).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      <button class="cta welcome-go" data-welcome-close>${p.welcomeCta} →</button>
    </div>
  </div>`;
}

export function renderPost(lang: Lang): string {
  const t = COPY[lang];
  const p = POST[lang];
  const n = p.slides.length;
  const total = COSTS.reduce((s, c) => s + c.amount, 0);

  return `
    <div class="offer post" lang="${lang}">
      <header class="offer-head">
        <div class="offer-logo">${logo}</div>
        <div><div class="offer-title">${t.offerTitle}</div><div class="offer-from">${t.from}</div></div>
        <div class="lang-switch" role="group" aria-label="Language">
          ${(["en", "de"] as Lang[]).map((l) => `<button data-lang="${l}" class="${l === lang ? "active" : ""}" aria-pressed="${l === lang}">${COPY[l].langName}</button>`).join("")}
        </div>
      </header>
      <div class="offer-body">
        <nav class="offer-nav grouped">${renderNav(lang)}</nav>
        <main class="deck">
          <ol class="deck-steps">${p.slides.map((label, i) => {
            const cls = docsOpen ? "" : i === slide ? "current" : i < slide ? "seen" : "";
            return `<li><button data-slide="${i}" class="${cls}" ${!docsOpen && i === slide ? `aria-current="step"` : ""}><span>${i + 1}</span>${label}</button></li>`;
          }).join("")}</ol>
          <section class="slide" tabindex="-1" aria-live="polite" aria-label="${docsOpen ? p.docsTitle : p.slides[slide]}">${docsOpen ? renderDocs(lang) : renderSlide(lang)}</section>
          <div class="deck-controls">
            ${docsOpen
              ? `<button class="deck-btn" data-back-offer>← ${p.backToOffer}: ${p.slides[slide]}</button>`
              : `<button class="deck-btn" data-step="-1" ${slide === 0 ? "disabled" : ""}>← ${p.back}</button>
                 <span class="deck-count">${p.of(slide + 1, n)}</span>
                 <button class="deck-btn primary" data-step="1">${p.next}: ${p.slides[(slide + 1) % n]} →</button>`}
          </div>
          <div class="deck-pdf">${t.pdfLead} <button class="offer-pdf-btn">${linkIcon} ${t.pdfBtn}</button></div>
        </main>
        <aside class="cta-rail">${renderCta(t, money(total - GRANT, t.locale, 2),
          `<button class="docs-link ${docsOpen ? "active" : ""}" data-open-docs>${p.docsLink(p.docs.length)} →</button>`)}</aside>
      </div>
    </div>
    ${renderSignModal(t)}
    ${welcomeOpen ? renderWelcome(lang) : ""}`;
}

export function wirePost(root: HTMLElement, rerender: (lang: Lang) => void) {
  const offer = root.querySelector<HTMLElement>(".offer.post");
  if (!offer) return;
  const lang = (offer.getAttribute("lang") ?? "en") as Lang;
  const shared = wireShared(root, offer, rerender);

  // Welcome card: close with its button, a click outside it or Escape; it has its own language switch.
  const welcome = root.querySelector<HTMLElement>(".welcome-modal");
  const closeWelcome = () => { welcomeOpen = false; rerender(lang); };
  welcome?.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const l = t.closest<HTMLElement>("[data-welcome-lang]")?.dataset.welcomeLang as Lang | undefined;
    if (l) return rerender(l);
    if (t === welcome || t.closest("[data-welcome-close]")) closeWelcome();
  });
  welcome?.querySelector<HTMLElement>("[data-welcome-close]")?.focus({ preventScroll: true });
  const n = POST[lang].slides.length;

  const go = (to: number, card: CardId | null = null) => {
    slide = Math.max(0, Math.min(n - 1, to));
    openCard = card;
    docsOpen = false;
    openDoc = null;
    rerender(lang);
    root.querySelector<HTMLElement>(".slide")?.focus({ preventScroll: true });
  };

  offer.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (shared(e)) return;

    // Documents: open the view (optionally at one document), move between list and document, leave.
    const showDocs = (doc: number | null) => {
      docsOpen = true;
      openDoc = doc;
      rerender(lang);
      root.querySelector<HTMLElement>(".slide")?.focus({ preventScroll: true });
    };
    if (t.closest("[data-open-docs]")) return showDocs(null);

    // A group heading opens its list and goes to the root of its area. Clicking it again while
    // already there just opens or closes the list.
    const pgroup = t.closest<HTMLElement>("[data-pgroup]");
    if (pgroup) {
      const gi = Number(pgroup.dataset.pgroup);
      const area = AREAS[gi];
      const isOpen = pgroup.parentElement!.classList.contains("open");
      if (isOpen && atArea(area)) {
        navOpen.set(gi, false);
        return rerender(lang);
      }
      navOpen.set(gi, true);
      return area === "docs" ? showDocs(null) : go(area.slide);
    }
    const doc = t.closest<HTMLElement>("[data-doc]");
    if (doc) return showDocs(Number(doc.dataset.doc));
    if (t.closest("[data-close-doc]")) return showDocs(null);
    if (t.closest("[data-back-offer]")) return go(slide, openCard);

    const step = t.closest<HTMLElement>("[data-step]");
    // Next on the last slide loops back to the first.
    if (step) return go((slide + Number(step.dataset.step) + n) % n);
    const to = t.closest<HTMLElement>("[data-slide]");
    if (to) return go(Number(to.dataset.slide));
    const card = t.closest<HTMLElement>("[data-card]");
    if (card) return go(slide, card.dataset.card as CardId);
    if (t.closest("[data-close-card]")) return go(slide);

    const nav = t.closest<HTMLElement>("[data-pnav]");
    if (nav) {
      const [gi, i] = nav.dataset.pnav!.split(":").map(Number);
      const target = navGroups(lang)[gi].targets[i];
      if (target && "doc" in target) return showDocs(target.doc);
      if (target) return go(target.slide, target.card ?? null);
    }
  });

  // Arrow keys move between slides, unless the customer is typing or signing.
  const onKey = (e: KeyboardEvent) => {
    if (!document.contains(offer) || root.hidden) return document.removeEventListener("keydown", onKey);
    const tag = (e.target as HTMLElement).tagName;
    if (root.querySelector(".welcome-modal")) { if (e.key === "Escape") closeWelcome(); return; }
    if (tag === "INPUT" || tag === "TEXTAREA" || root.querySelector(".sign-modal")) return;
    if (docsOpen) return;
    if (e.key === "ArrowRight") go((slide + 1) % n);
    if (e.key === "ArrowLeft" && slide > 0) go(slide - 1);
  };
  document.addEventListener("keydown", onKey);
}
