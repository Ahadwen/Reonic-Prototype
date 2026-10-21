// Part 2 of the case study: Screen C, the first page of the digital offer an end customer receives.
// This is a faithful recreation of the screen as given in the brief, flaws included, so the critique
// and the redesign can sit next to it. Only the part of the page the brief shows is recreated.

import "./part2.css";

const NAV = [
  "At a glance", "Solar system", "Solar components", "Electricity yield", "Energy storage", "Building",
  "Heat pump", "Your heat balance", "Your household", "Your heat balance", "Economic efficiency",
  "Future tariff overview", "Components", "Accept", "Datasheets", "MCS heat pump system performance estimate",
  "MCS sound check compliance results", "MCS key information", "MCS PV performance estimate",
  "Heatloss survey and radiator changes", "MCS Proposed Heatpump", "MCS Shading Sunpath Diagram",
];

const root = document.getElementById("part2")!;

// The screen is shown as it looks on a desktop, scaled down on smaller screens rather than reflowed.
const DESIGN_WIDTH = 1440;
function fitToWidth() {
  const offer = root.querySelector<HTMLElement>(".offer");
  if (!offer) return;
  const scale = Math.min(1, root.clientWidth / DESIGN_WIDTH);
  offer.style.zoom = scale < 1 ? String(scale) : "";
}
window.addEventListener("resize", fitToWidth);

const check = `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#1f3d4f"/>
  <path d="M9.5 16.5l4.2 4.2 8.8-9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// The installer's logo in the original is an orange swoosh; this is a generic stand-in.
const logo = `<svg viewBox="0 0 72 44" aria-hidden="true">
  <path d="M4 40 C20 30 34 22 70 2 C46 10 30 16 22 22 L30 22 C24 28 14 34 4 40Z" fill="#f08a00"/>
  <path d="M16 26 C24 20 36 14 52 8" fill="none" stroke="#f6b04a" stroke-width="2"/></svg>`;

function pill(x: number, y: number, label: string) {
  const w = 40 + label.length * 9.2;
  return `<g transform="translate(${x} ${y})">
    <rect width="${w}" height="32" rx="16" fill="#1f3d4f"/>
    <path d="M12 16.5l4.4 4.4 8.4-9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="33" y="21.5" fill="#fff" font-size="15.5" font-weight="600">${label}</text></g>`;
}

function radiator(x: number, y: number) {
  return `<g transform="translate(${x} ${y})" stroke="#c9c9c9" stroke-width="2.5" fill="none">
    <rect width="30" height="34" rx="3" fill="#fff"/>${[8, 15, 22].map((v) => `<line x1="${v}" y1="5" x2="${v}" y2="29"/>`).join("")}</g>`;
}

// Cut-away house with garage, as in the original illustration.
const house = `<svg class="offer-house" viewBox="0 0 650 430" role="img" aria-label="House with solar system, heat pump and battery storage">
  <g fill="none" stroke="#cfcfcf" stroke-width="2">
    <path d="M0 210 H200 M0 220 H200" /><rect x="0" y="210" width="200" height="90" fill="#f4f4f4" stroke="#e6e6e6"/>
  </g>
  <g transform="translate(26 245)">
    <rect x="0" y="16" width="68" height="22" rx="6" fill="#a9a5e6"/><path d="M10 16 L18 2 H50 L58 16Z" fill="#c4c1f0"/>
    <circle cx="14" cy="40" r="6" fill="#8d89cf"/><circle cx="54" cy="40" r="6" fill="#8d89cf"/>
    <path d="M70 30 C90 46 110 40 128 20" fill="none" stroke="#9fd8a3" stroke-width="2.5"/>
    <rect x="128" y="-6" width="18" height="30" rx="3" fill="#a9a5e6"/><path d="M138 2 l-4 8 h5 l-4 8" stroke="#fff" fill="none" stroke-width="1.5"/>
  </g>
  <g fill="none" stroke="#cfcfcf" stroke-width="11" stroke-linejoin="miter">
    <path d="M208 418 V186 M532 418 V186 M196 196 L368 14 L548 196"/>
    <path d="M202 418 H538"/><path d="M214 190 H528 M214 304 H528" stroke-width="7"/>
    <path d="M366 196 V300 M290 310 V412" stroke-width="7"/>
  </g>
  <rect x="270" y="58" width="12" height="40" fill="#cfcfcf"/>
  <path d="M392 30 L500 134" stroke="#1414e6" stroke-width="5" stroke-dasharray="40 10 999"/>
  <g fill="#cfcfcf"><rect x="250" y="168" width="70" height="16" rx="5"/><rect x="330" y="172" width="16" height="12"/></g>
  ${radiator(410, 144)}${radiator(316, 260)}${radiator(470, 260)}
  <g stroke="#cfcfcf" stroke-width="2.5" fill="#fff"><circle cx="232" cy="276" r="12"/><rect x="220" y="262" width="26" height="30" fill="none"/></g>
  <path d="M378 252 H420 V300 H378Z" fill="#cfcfcf"/><path d="M396 232 v18 M392 232 h10" stroke="#cfcfcf" stroke-width="2.5"/>
  <g stroke="#cfcfcf" stroke-width="2.5" fill="#efefef"><rect x="222" y="318" width="64" height="76"/><line x1="254" y1="318" x2="254" y2="394"/></g>
  <path d="M220 398 H290" stroke="#9a9a9a" stroke-width="3"/>
  <g transform="translate(440 336)"><rect width="46" height="56" rx="3" fill="#7be07b"/><rect x="18" y="12" width="12" height="30" rx="5" fill="#f4f000"/>
    <path d="M6 56 v10 M40 56 v10" stroke="#5cbf5c" stroke-width="3"/></g>
  <path d="M532 262 H556 M532 268 H556" stroke="#e05050" stroke-width="2.5"/>
  <g transform="translate(556 242)"><rect width="50" height="46" rx="3" fill="#1e1e1e"/>
    <g fill="#fff" transform="translate(25 23)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="5" ry="10" transform="rotate(${a}) translate(0 -9)"/>`).join("")}</g></g>
  <path d="M532 290 H640" stroke="#cfcfcf" stroke-width="2"/>
  ${pill(388, 22, "Solar system")}${pill(470, 222, "Heat pump")}${pill(458, 330, "Battery storage")}
</svg>`;

export function showPart2() {
  root.innerHTML = `
    <div class="offer">
      <header class="offer-head">
        <div class="offer-logo">${logo}</div>
        <div><div class="offer-title">Your personal offer</div><div class="offer-from">from Testaccount Hai</div></div>
      </header>
      <div class="offer-body">
        <nav class="offer-nav">${NAV.map((n, i) => `<button class="${i === 0 ? "active" : ""}">${n}</button>`).join("")}</nav>
        <div class="offer-main">
          <section class="offer-glance">
            <div class="offer-text">
              <h1>Your cost estimate</h1>
              <p>Sehr geehrte/r ,</p>
              <p>wir freuen uns, Ihnen unser Angebot für Ihre Anfrage vorstellen zu dürfen. Unser Ziel ist es, Ihnen eine qualitativ hochwertige Lösung zu einem fairen Preis anzubieten.</p>
              <p>Wenn Sie Fragen haben oder weitere Informationen benötigen, zögern Sie bitte nicht, uns zu kontaktieren. Wir freuen uns darauf, von Ihnen zu hören und Ihnen dabei zu helfen, die richtige Wahl zu treffen.</p>
              <h3>At a glance</h3>
              <p>Your cost estimate at a glance:</p>
              <ul class="offer-checks">
                <li>${check}<span>With your solar system, you produce CO2-neutral electricity.</span></li>
                <li>${check}<span>You can achieve greater independence with your battery storage system.</span></li>
                <li>${check}<span>With your heat pump, you can heat your home efficiently and in an environmentally friendly way.</span></li>
              </ul>
              <div class="offer-total"><span>Total investment</span><span>£59,500.00</span></div>
            </div>
            <div class="offer-art">${house}</div>
          </section>
          <div class="offer-pdf">
            <div><b>You can also download your cost estimate as a PDF.</b><small>Simply click on the adjacent button.</small></div>
            <button class="offer-pdf-btn">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              View PDF</button>
          </div>
          <div class="offer-end"><span>End of the screen shown in the brief</span></div>
        </div>
      </div>
    </div>`;

  fitToWidth();
}
