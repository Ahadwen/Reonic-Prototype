// Screen C, updated. Three changes, plus localisation as a baseline fix:
//   1. The side nav is grouped into expandable categories instead of a flat list of 22 items.
//   2. The price comes with context: what each part costs, the grant, and what it saves,
//      followed by a clear next step (accept, or ask a question) and where that leads.
//   3. The house illustration and the price are linked: pointing at a product highlights its cost.
// Localisation: every string comes from COPY in the customer's language, with their name filled in.

import { check, house, linkIcon, logo, type Item } from "./art.ts";

export type Lang = "en" | "de";

interface NavGroup { title: string; items: string[]; open: boolean; target?: string }

const CUSTOMER = { title: { en: "Mr", de: "Herr" }, surname: "Thompson" };
const INSTALLER = "Testaccount Hai";

// Illustrative figures for a UK home: solar, battery and an air source heat pump replacing a gas boiler.
const COSTS: { item: Item | "project"; amount: number }[] = [
  { item: "solar", amount: 17_900 },
  { item: "battery", amount: 10_800 },
  { item: "heatpump", amount: 27_800 },
  { item: "project", amount: 3_000 },
];
const GRANT = 7_500;
const SAVINGS_PER_YEAR = 2_100;
const VALID_UNTIL = new Date(2026, 10, 20);

const COPY = {
  en: {
    locale: "en-GB",
    offerTitle: "Your personal offer",
    from: `from ${INSTALLER}`,
    h1: "Your cost estimate",
    greeting: `Dear ${CUSTOMER.title.en} ${CUSTOMER.surname},`,
    intro: [
      "Thank you for your enquiry. We're pleased to present our offer: a high-quality system at a fair price.",
      "If you have any questions or would like more information, please get in touch. We look forward to hearing from you and helping you make the right choice.",
    ],
    glance: "At a glance",
    glanceLead: "Your cost estimate at a glance:",
    checks: {
      solar: "With your solar system, you produce CO₂-neutral electricity.",
      battery: "You can achieve greater independence with your battery storage system.",
      heatpump: "With your heat pump, you can heat your home efficiently and in an environmentally friendly way.",
    } as Record<Item, string>,
    labels: { solar: "Solar system", battery: "Battery storage", heatpump: "Heat pump" } as Record<Item, string>,
    houseAria: "Your home with solar system, heat pump and battery storage",
    houseHint: "Point to or tap a part of your home to see what it costs.",
    investment: "Your investment",
    rows: {
      solar: ["Solar system", "20 panels · 8.8 kWp · inverter · installation"],
      battery: ["Battery storage", "13.5 kWh · keeps daytime solar for the evening"],
      heatpump: ["Heat pump", "11.2 kW air source · 250 L cylinder · 6 radiators upgraded · installation"],
      project: ["Project costs", "Scaffolding · electrical work · MCS certification · grid notification"],
    } as Record<Item | "project", [string, string]>,
    beforeGrant: "Total before grant",
    grant: "Boiler Upgrade Scheme grant",
    grantNote: "We apply for this on your behalf.",
    yourPrice: "Your price",
    stats: [
      [money(SAVINGS_PER_YEAR, "en-GB"), "lower energy bills per year"],
      ["72 %", "of your electricity from your own roof"],
      ["5.1 t", "less CO₂ per year"],
    ],
    estimates: "Estimates based on your household's usage. See Costs and savings for the details.",
    nextTitle: "Next steps",
    steps: ["Review your offer", "Accept online", "Technical survey", "Installation"],
    stepNotes: ["You are here", "Takes a minute", "We visit to confirm the details", "Usually 3–5 days on site"],
    surveyNext: "We'll call within 2 working days",
    accept: "Accept offer",
    accepted: "Offer accepted",
    acceptedNote: "Thank you. We'll call you within 2 working days to book your technical survey.",
    undo: "Undo",
    ask: "Ask a question",
    askPlaceholder: "Your question for Testaccount Hai…",
    send: "Send",
    sent: "Sent. We'll reply by email, usually the same day.",
    validity: (d: string) => `Valid until ${d}. You can cancel free of charge within 14 days of accepting.`,
    pdfLead: "You can also download your cost estimate as a PDF.",
    pdfSub: "Simply click the button.",
    pdfBtn: "View PDF",
    end: "End of the screen shown in the brief",
    nav: [
      { title: "Overview", open: true, items: ["At a glance"] },
      { title: "Your system", open: true, items: ["Solar system", "Solar components", "Electricity yield", "Energy storage", "Heat pump", "All components"] },
      { title: "Your home", open: false, items: ["Building", "Your household", "Your heat balance"] },
      { title: "Costs and savings", open: false, items: ["Economic efficiency", "Future tariff overview"] },
      { title: "Next steps", open: false, items: ["Accept offer"], target: "next" },
      { title: "Documents", open: false, items: ["Datasheets", "MCS heat pump performance estimate", "MCS sound check results", "MCS key information", "MCS PV performance estimate", "Heat loss survey and radiator changes", "MCS proposed heat pump", "MCS shading and sun path diagram"] },
    ] as NavGroup[],
    langName: "English",
  },
  de: {
    locale: "de-DE",
    offerTitle: "Ihr persönliches Angebot",
    from: `von ${INSTALLER}`,
    h1: "Ihre Kostenschätzung",
    greeting: `Sehr geehrter ${CUSTOMER.title.de} ${CUSTOMER.surname},`,
    intro: [
      "wir freuen uns, Ihnen unser Angebot für Ihre Anfrage vorstellen zu dürfen. Unser Ziel ist es, Ihnen eine qualitativ hochwertige Lösung zu einem fairen Preis anzubieten.",
      "Wenn Sie Fragen haben oder weitere Informationen benötigen, zögern Sie bitte nicht, uns zu kontaktieren. Wir freuen uns darauf, von Ihnen zu hören und Ihnen dabei zu helfen, die richtige Wahl zu treffen.",
    ],
    glance: "Auf einen Blick",
    glanceLead: "Ihre Kostenschätzung auf einen Blick:",
    checks: {
      solar: "Mit Ihrer Solaranlage erzeugen Sie CO₂-neutralen Strom.",
      battery: "Mit Ihrem Batteriespeicher werden Sie unabhängiger vom Netz.",
      heatpump: "Mit Ihrer Wärmepumpe heizen Sie Ihr Zuhause effizient und umweltfreundlich.",
    } as Record<Item, string>,
    labels: { solar: "Solaranlage", battery: "Batteriespeicher", heatpump: "Wärmepumpe" } as Record<Item, string>,
    houseAria: "Ihr Zuhause mit Solaranlage, Wärmepumpe und Batteriespeicher",
    houseHint: "Zeigen oder tippen Sie auf einen Teil Ihres Hauses, um die Kosten zu sehen.",
    investment: "Ihre Investition",
    rows: {
      solar: ["Solaranlage", "20 Module · 8,8 kWp · Wechselrichter · Montage"],
      battery: ["Batteriespeicher", "13,5 kWh · speichert Solarstrom für den Abend"],
      heatpump: ["Wärmepumpe", "11,2 kW Luft-Wasser · 250-L-Speicher · 6 Heizkörper getauscht · Montage"],
      project: ["Projektkosten", "Gerüst · Elektroarbeiten · MCS-Zertifizierung · Netzanmeldung"],
    } as Record<Item | "project", [string, string]>,
    beforeGrant: "Summe vor Förderung",
    grant: "Förderung (Boiler Upgrade Scheme)",
    grantNote: "Wir beantragen die Förderung für Sie.",
    yourPrice: "Ihr Preis",
    stats: [
      [money(SAVINGS_PER_YEAR, "de-DE"), "niedrigere Energiekosten pro Jahr"],
      ["72 %", "Ihres Stroms vom eigenen Dach"],
      ["5,1 t", "weniger CO₂ pro Jahr"],
    ],
    estimates: "Schätzwerte auf Basis Ihres Verbrauchs. Details unter Kosten und Ersparnis.",
    nextTitle: "Nächste Schritte",
    steps: ["Angebot prüfen", "Online annehmen", "Technische Begehung", "Installation"],
    stepNotes: ["Sie sind hier", "Dauert eine Minute", "Wir prüfen die Details vor Ort", "Meist 3–5 Tage vor Ort"],
    surveyNext: "Wir melden uns innerhalb von 2 Werktagen",
    accept: "Angebot annehmen",
    accepted: "Angebot angenommen",
    acceptedNote: "Vielen Dank. Wir rufen Sie innerhalb von 2 Werktagen an, um die technische Begehung zu vereinbaren.",
    undo: "Rückgängig",
    ask: "Frage stellen",
    askPlaceholder: "Ihre Frage an Testaccount Hai …",
    send: "Senden",
    sent: "Gesendet. Wir antworten per E-Mail, meist noch am selben Tag.",
    validity: (d: string) => `Gültig bis ${d}. Sie können innerhalb von 14 Tagen nach Annahme kostenfrei widerrufen.`,
    pdfLead: "Sie können Ihre Kostenschätzung auch als PDF herunterladen.",
    pdfSub: "Klicken Sie einfach auf die Schaltfläche.",
    pdfBtn: "PDF ansehen",
    end: "Ende des Bildschirms aus der Aufgabe",
    nav: [
      { title: "Überblick", open: true, items: ["Auf einen Blick"] },
      { title: "Ihre Anlage", open: true, items: ["Solaranlage", "Solarkomponenten", "Stromertrag", "Energiespeicher", "Wärmepumpe", "Alle Komponenten"] },
      { title: "Ihr Zuhause", open: false, items: ["Gebäude", "Ihr Haushalt", "Ihre Wärmebilanz"] },
      { title: "Kosten und Ersparnis", open: false, items: ["Wirtschaftlichkeit", "Zukünftige Tarife"] },
      { title: "Nächste Schritte", open: false, items: ["Angebot annehmen"], target: "next" },
      { title: "Dokumente", open: false, items: ["Datenblätter", "MCS-Leistungsprognose Wärmepumpe", "MCS-Schallprüfung", "MCS-Kerninformationen", "MCS-Leistungsprognose PV", "Wärmeverlust und Heizkörpertausch", "MCS-Wärmepumpenvorschlag", "MCS-Verschattungsdiagramm"] },
    ] as NavGroup[],
    langName: "Deutsch",
  },
};

function money(n: number, locale: string, decimals = 0) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "GBP", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

const chevron = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Which nav groups the customer has opened or closed, kept across language switches.
const openGroups = new Map<number, boolean>();
// Demo state for the call to action, also kept across language switches.
let accepted = false;
let asking = false;
let questionSent = false;

const tick = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function renderNextSteps(t: (typeof COPY)[Lang]) {
  // Reading the offer is step 1; accepting completes steps 1 and 2 and makes the survey current.
  const current = accepted ? 2 : 0;
  const steps = t.steps.map((label, i) => {
    const state = i < current ? "done" : i === current ? "current" : "";
    const note = state === "done" ? "" : accepted && i === 2 ? t.surveyNext : t.stepNotes[i];
    return `<li class="${state}"><span class="step-dot">${state === "done" ? tick : i + 1}</span>
      <div><b>${label}</b><small>${note}</small></div></li>`;
  }).join("");
  const date = new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "long", year: "numeric" }).format(VALID_UNTIL);

  return `<section class="next" id="next">
    <h3>${t.nextTitle}</h3>
    <ol class="offer-steps">${steps}</ol>
    ${accepted
      ? `<div class="accepted"><span class="step-dot done">${tick}</span><div><b>${t.accepted}</b><p>${t.acceptedNote}</p></div>
          <button class="link-btn" data-cta="undo">${t.undo}</button></div>`
      : `<div class="cta-row">
          <button class="cta" data-cta="accept">${t.accept} →</button>
          <button class="cta-secondary" data-cta="ask" aria-expanded="${asking}">${t.ask}</button>
        </div>`}
    ${!accepted && asking ? (questionSent
      ? `<p class="ask-sent">${t.sent}</p>`
      : `<div class="ask"><textarea rows="3" placeholder="${t.askPlaceholder}"></textarea><button class="cta-secondary" data-cta="send">${t.send}</button></div>`) : ""}
    <p class="validity">${t.validity(date)}</p>
  </section>`;
}

export function renderUpdated(lang: Lang): string {
  const t = COPY[lang];
  const total = COSTS.reduce((s, c) => s + c.amount, 0);

  const nav = t.nav.map((g, gi) => {
    const open = openGroups.get(gi) ?? g.open;
    return `<div class="nav-group ${open ? "open" : ""}">
      <button class="nav-group-head" data-group="${gi}" aria-expanded="${open}">${chevron}<span>${g.title}</span><span class="nav-count">${g.items.length}</span></button>
      <div class="nav-items">${g.items.map((n, i) => `<button class="${gi === 0 && i === 0 ? "active" : ""}" ${g.target ? `data-target="${g.target}"` : ""}>${n}</button>`).join("")}</div>
    </div>`;
  }).join("");

  const rows = COSTS.map((c) => {
    const [name, detail] = t.rows[c.item];
    return `<div class="cost-row" ${c.item !== "project" ? `data-item="${c.item}"` : ""}>
      <div><b>${name}</b><small>${detail}</small></div><span>${money(c.amount, t.locale)}</span></div>`;
  }).join("");

  return `
    <div class="offer updated" lang="${lang}">
      <header class="offer-head">
        <div class="offer-logo">${logo}</div>
        <div><div class="offer-title">${t.offerTitle}</div><div class="offer-from">${t.from}</div></div>
        <div class="lang-switch" role="group" aria-label="Language">
          ${(["en", "de"] as Lang[]).map((l) => `<button data-lang="${l}" class="${l === lang ? "active" : ""}" aria-pressed="${l === lang}">${COPY[l].langName}</button>`).join("")}
        </div>
      </header>
      <div class="offer-body">
        <nav class="offer-nav grouped">${nav}</nav>
        <div class="offer-main">
          <section class="offer-glance">
            <div class="offer-text">
              <h1>${t.h1}</h1>
              <p>${t.greeting}</p>
              ${t.intro.map((p) => `<p>${p}</p>`).join("")}
              <h3>${t.glance}</h3>
              <p>${t.glanceLead}</p>
              <ul class="offer-checks">
                ${(["solar", "battery", "heatpump"] as Item[]).map((i) => `<li data-item="${i}">${check}<span>${t.checks[i]}</span></li>`).join("")}
              </ul>
              <section class="invest">
                <h3 class="invest-title">${t.investment}</h3>
                ${rows}
                <div class="cost-row subtotal"><span>${t.beforeGrant}</span><span>${money(total, t.locale)}</span></div>
                <div class="cost-row grant"><div><b>${t.grant}</b><small>${t.grantNote}</small></div><span>− ${money(GRANT, t.locale)}</span></div>
                <div class="cost-row price"><span>${t.yourPrice}</span><span>${money(total - GRANT, t.locale, 2)}</span></div>
                <div class="stats">${t.stats.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("")}</div>
                <p class="estimates">${t.estimates}</p>
              </section>
              ${renderNextSteps(t)}
            </div>
            <div class="offer-art">
              ${house(t.labels, true, t.houseAria)}
              <p class="house-hint">${t.houseHint}</p>
            </div>
          </section>
          <div class="offer-pdf">
            <div><b>${t.pdfLead}</b><small>${t.pdfSub}</small></div>
            <button class="offer-pdf-btn">${linkIcon} ${t.pdfBtn}</button>
          </div>
          <div class="offer-end"><span>${t.end}</span></div>
        </div>
      </div>
    </div>`;
}

// Interaction for the updated screen. Returns nothing; wires listeners on `root`.
export function wireUpdated(root: HTMLElement, rerender: (lang: Lang) => void) {
  const offer = root.querySelector<HTMLElement>(".offer.updated");
  if (!offer) return;
  const currentLang = (offer.getAttribute("lang") ?? "en") as Lang;

  // Linked highlight: a product in the picture, its tick line and its cost row light up together.
  let pinned: Item | null = null;
  const light = (item: Item | null) => {
    offer.querySelectorAll<HTMLElement | SVGElement>("[data-item]").forEach((el) =>
      el.classList.toggle("lit", item !== null && el.getAttribute("data-item") === item));
  };
  const itemOf = (e: Event) => (e.target as Element).closest?.("[data-item]")?.getAttribute("data-item") as Item | null ?? null;

  offer.addEventListener("pointerover", (e) => { const i = itemOf(e); if (i) light(i); });
  offer.addEventListener("pointerout", (e) => {
    const to = (e as PointerEvent).relatedTarget as Element | null;
    if (!to?.closest?.("[data-item]")) light(pinned);
  });
  offer.addEventListener("focusin", (e) => { const i = itemOf(e); if (i) light(i); });
  offer.addEventListener("focusout", () => light(pinned));

  offer.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    // Tap to pin on touch screens (no hover); tap again to clear.
    const i = itemOf(e);
    if (i) { pinned = pinned === i ? null : i; light(pinned ?? i); return; }

    const group = t.closest<HTMLElement>("[data-group]");
    if (group) {
      const gi = Number(group.dataset.group);
      const box = group.parentElement!;
      const open = !box.classList.contains("open");
      box.classList.toggle("open", open);
      group.setAttribute("aria-expanded", String(open));
      openGroups.set(gi, open);
      return;
    }
    const lang = t.closest<HTMLElement>("[data-lang]")?.dataset.lang as Lang | undefined;
    if (lang) return rerender(lang);

    const cta = t.closest<HTMLElement>("[data-cta]")?.dataset.cta;
    if (cta) {
      if (cta === "accept") accepted = true;
      if (cta === "undo") accepted = false;
      if (cta === "ask") { asking = !asking; questionSent = false; }
      if (cta === "send") questionSent = true;
      rerender(currentLang);
      root.querySelector("#next")?.scrollIntoView({ block: "nearest" });
      if (cta === "ask" && asking) root.querySelector<HTMLTextAreaElement>(".ask textarea")?.focus();
      return;
    }

    const navItem = t.closest<HTMLElement>(".nav-items button");
    if (navItem) {
      offer.querySelectorAll(".nav-items button.active").forEach((b) => b.classList.remove("active"));
      navItem.classList.add("active");
      if (navItem.dataset.target) root.querySelector(`#${navItem.dataset.target}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
  offer.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && itemOf(e)) { e.preventDefault(); (e.target as Element).dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });
}
