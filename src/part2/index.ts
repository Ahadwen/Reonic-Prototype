// Part 2 of the case study: Screen C, the first page of the digital offer an end customer receives.
// Tabs switch between the screen as provided in the brief (#offer) and the updated one (#offer/updated).

import "./part2.css";
import { renderOriginal } from "./original.ts";
import { renderUpdated, wireUpdated, type Lang } from "./updated.ts";

const root = document.getElementById("part2")!;
let lang: Lang = "en";

// The screen is shown as it looks on a desktop, scaled down on smaller screens rather than reflowed.
const DESIGN_WIDTH = 1440;
function fitToWidth() {
  const offer = root.querySelector<HTMLElement>(".offer");
  if (!offer) return;
  const scale = Math.min(1, root.clientWidth / DESIGN_WIDTH);
  offer.style.zoom = scale < 1 ? String(scale) : "";
  // Sticky offsets inside the screen divide by this, since lengths there are scaled by the zoom.
  offer.style.setProperty("--zoom", String(scale));
}
window.addEventListener("resize", fitToWidth);

export function showPart2(hash: string) {
  const updated = hash === "#offer/updated";
  const tab = (href: string, label: string, active: boolean) =>
    `<a href="${href}" class="${active ? "active" : ""}" ${active ? `aria-current="page"` : ""}>${label}</a>`;

  root.innerHTML = `
    <div class="offer-tabs" role="tablist">
      ${tab("#offer", "Provided screen", !updated)}
      ${tab("#offer/updated", "Updated screen", updated)}
    </div>
    ${updated ? renderUpdated(lang) : renderOriginal()}`;

  if (updated) {
    wireUpdated(root, (next) => {
      lang = next;
      showPart2(hash);
    });
  }
  fitToWidth();
}
