// Screen C as provided in the brief: a faithful recreation, flaws included.
// Only the part of the page the brief shows is recreated.

import { check, house, linkIcon, logo } from "./art.ts";

const NAV = [
  "At a glance", "Solar system", "Solar components", "Electricity yield", "Energy storage", "Building",
  "Heat pump", "Your heat balance", "Your household", "Your heat balance", "Economic efficiency",
  "Future tariff overview", "Components", "Accept", "Datasheets", "MCS heat pump system performance estimate",
  "MCS sound check compliance results", "MCS key information", "MCS PV performance estimate",
  "Heatloss survey and radiator changes", "MCS Proposed Heatpump", "MCS Shading Sunpath Diagram",
];

export function renderOriginal(): string {
  return `
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
            <div class="offer-art">${house({ solar: "Solar system", heatpump: "Heat pump", battery: "Battery storage" })}</div>
          </section>
          <div class="offer-pdf">
            <div><b>You can also download your cost estimate as a PDF.</b><small>Simply click on the adjacent button.</small></div>
            <button class="offer-pdf-btn">${linkIcon} View PDF</button>
          </div>
          <div class="offer-end"><span>End of the screen shown in the brief</span></div>
        </div>
      </div>
    </div>`;
}
