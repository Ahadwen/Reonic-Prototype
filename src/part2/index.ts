// Part 2 of the case study: Screen C, the digital offer an end customer receives.
// Tabs: the three changes (#offer/changes), the screen as provided in the brief (#offer),
// the updated one (#offer/updated), and a post-submission redesign (#offer/post).

import "./part2.css";
import { renderChanges } from "./changes.ts";
import { renderOriginal } from "./original.ts";
import { openWelcome, renderPost, wirePost } from "./post.ts";
import { renderUpdated, wireUpdated, type Lang } from "./updated.ts";

const POST_NOTE = "Keeping to three tangible changes left the page very close to the original, and I wasn’t satisfied with that. It stayed on my mind after the submission date, so I continued exploring the design in a separate tab from the previously submitted work.";

const root = document.getElementById("part2")!;
let lang: Lang = "en";
let lastHash = "";

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
  const changes = hash === "#offer/changes";
  const post = hash === "#offer/post";
  // Arriving on the post-submission tab (not re-rendering it) opens its welcome card.
  if (post && lastHash !== hash) openWelcome();
  lastHash = hash;
  const tab = (href: string, label: string, active: boolean) =>
    `<a href="${href}" class="${active ? "active" : ""}" ${active ? `aria-current="page"` : ""}>${label}</a>`;

  root.innerHTML = `
    <div class="offer-tabs" role="tablist">
      ${tab("#offer/changes", "The 3 changes", changes)}
      ${tab("#offer", "Provided screen", !updated && !changes && !post)}
      ${tab("#offer/updated", "Updated screen", updated)}
      <a href="#offer/post" class="tab-post ${post ? "active" : ""}" ${post ? `aria-current="page"` : ""} aria-describedby="post-note">
        Post submission update <span class="tab-info" aria-hidden="true">i</span>
        <span class="tab-tip" role="tooltip" id="post-note">${POST_NOTE}</span>
      </a>
    </div>
    ${changes ? renderChanges() : updated ? renderUpdated(lang) : post ? renderPost(lang) : renderOriginal()}`;

  const rerender = (next: Lang) => {
    lang = next;
    showPart2(hash);
  };
  if (updated) wireUpdated(root, rerender);
  if (post) wirePost(root, rerender);
  fitToWidth();
}
