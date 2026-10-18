// Entry point: one site for both parts of the case study.
//   #             home, with a card per part
//   #components   Part 1, the components list    (#import: the invoice import flow)
//   #offer        Part 2, Screen C (the digital offer)

import { showPart1 } from "./part1.ts";
import { showPart2 } from "./part2.ts";

const home = document.getElementById("home")!;
const part1 = document.getElementById("part1")!;
const part2 = document.getElementById("part2")!;

home.innerHTML = `
  <div class="home">
    <div class="eyebrow">Reonic · Product Management case study</div>
    <h1>Two parts, one prototype</h1>
    <p>Part 1 is a working prototype for the component database problem. Part 2 takes one screen apart and puts it back together.</p>
    <div class="parts">
      <a class="card part" href="#components">
        <span class="label">Part 1 · Product thinking</span>
        <h2>Invoice → Components</h2>
        <p>Installers already have their supplier invoices. Upload one and every line is read, matched to the catalog and their own database, and added after a quick review.</p>
        <span class="go">Open the prototype →</span>
      </a>
      <a class="card part" href="#offer">
        <span class="label">Part 2 · Product taste</span>
        <h2>Screen C: the digital offer</h2>
        <p>The first page an end customer sees when they receive an offer: what gets in their way, and a better version.</p>
        <span class="go">Open the screen →</span>
      </a>
    </div>
  </div>`;

function route() {
  const hash = location.hash;
  const page = hash === "#components" || hash === "#import" ? part1 : hash === "#offer" ? part2 : home;
  for (const el of [home, part1, part2]) el.hidden = el !== page;
  if (page === part1) showPart1(hash);
  else if (page === part2) showPart2();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
