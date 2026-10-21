// The "Changes" tab: the three proposed changes to Screen C, with the problem each one solves.
// A plain, readable page (not zoomed like the screens themselves).

const CHANGES = [
  {
    title: "Navigation grouped into sections",
    problem: "22 items in one flat list. \"Your heat balance\" appears twice, and eight MCS compliance documents sit alongside the sales story, so the parts that help the customer decide are hard to find.",
    change: "Six expandable groups: Overview, Your system, Your home, Costs and savings, Next steps, Documents. Each shows how many items it holds. The duplicate is gone and the compliance documents are grouped under Documents.",
    why: "The customer sees the story of the offer first. Everything else is still one click away, but no longer competes for attention.",
  },
  {
    title: "Pricing with context, and a clear next step",
    problem: "£59,500 sits alone under three generic statements, with no breakdown, no grant and no savings. There's no obvious way to say yes: \"Accept\" is buried in the nav, and the most prominent button is \"View PDF\".",
    change: "The price is broken down by product, with the Boiler Upgrade Scheme grant, the price the customer actually pays, and estimated savings, self-sufficiency and CO₂. Beside it, a panel shows the customer's progress (home survey, this offer, signing, installation), with \"Accept and sign\" as the main action. Signing opens a signature pad that works with a finger or a mouse. \"Decide later: email me this offer\" is the alternative.",
    why: "Price is what decides the sale. The customer should understand what they're paying for, what they get back, and what happens when they say yes, without leaving the page.",
  },
  {
    title: "The illustration linked to the costs",
    problem: "The house picture shows which products are in the offer, but it's static: nothing ties a product in the picture to what it costs or to what it does for the customer.",
    change: "Pointing at a product in the picture (or tapping it on a touchscreen) highlights it, its line under \"At a glance\" and its cost row. Pointing at a cost row lights up the product in the picture.",
    why: "The picture becomes a way into the price: the customer can see what each product costs, and the installer can walk through the offer item by item.",
  },
];

export function renderChanges(): string {
  return `
    <div class="changes">
      <h1>Screen C: three changes</h1>
      <p class="lead">Screen C is the digital offer an end customer receives. It has to explain the price and make saying yes easy. These are the three changes in the updated screen.</p>
      <ol class="change-list">
        ${CHANGES.map((c, i) => `
          <li class="change">
            <span class="change-n">${i + 1}</span>
            <div>
              <h2>${c.title}</h2>
              <dl>
                <dt>Problem</dt><dd>${c.problem}</dd>
                <dt>Change</dt><dd>${c.change}</dd>
                <dt>Why</dt><dd>${c.why}</dd>
              </dl>
            </div>
          </li>`).join("")}
      </ol>
      <aside class="baseline">
        <b>Also fixed, not counted as one of the three: localisation.</b>
        The original greets the customer with "Sehr geehrte/r ," (German, with no name) on an otherwise English page. The updated screen uses the customer's name, keeps to one language, formats numbers and currency for it, and has an English | Deutsch switch.
      </aside>
      <div class="changes-actions">
        <a class="btn-cta" href="#offer/updated">See the updated screen →</a>
        <a class="btn-plain" href="#offer">Compare with the provided screen</a>
      </div>
    </div>`;
}
