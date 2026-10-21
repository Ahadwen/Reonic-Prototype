// The sample invoices: shown on the upload page, and downloadable as one bundle from the case-study bar.

import { zip } from "./zip.ts";

export interface Sample {
  label: string;
  path: string;      // the file that gets uploaded
  preview: string;   // an image of it, for thumbnails and the processing view
  note: string;
}

export const SAMPLES: Sample[] = [
  { label: "Invoice 1 · PDF", path: "samples/invoice-NRS-24817.pdf", preview: "samples/previews/invoice-NRS-24817.jpg", note: "NRS-INV-24817 · 11 lines" },
  { label: "Invoice 1 · photo", path: "samples/invoice-NRS-24817-photo.jpg", preview: "samples/previews/invoice-NRS-24817-photo.jpg", note: "Same invoice, photographed" },
  { label: "Invoice 2 · PDF", path: "samples/invoice-NRS-25033.pdf", preview: "samples/previews/invoice-NRS-25033.jpg", note: "NRS-INV-25033 · 6 lines" },
  { label: "Invoice 2 · photo", path: "samples/invoice-NRS-25033-photo.jpg", preview: "samples/previews/invoice-NRS-25033-photo.jpg", note: "Same invoice, photographed" },
];

const README = `Sample supplier invoices for the Invoice -> Components prototype

From a fictional wholesaler, Northbridge Renewables Supply Ltd, to a fictional
installer, Brightwell Heat & Solar Ltd. Brand and model names are real products;
article numbers, supplier codes and prices are invented for the demo.

  invoice-NRS-24817.pdf        11 lines: catalog matches, a price change, an
  invoice-NRS-24817-photo.jpg  ambiguous heat pump, a new product, consumables
  invoice-NRS-25033.pdf        6 lines: a duplicate, cable-length and battery
  invoice-NRS-25033-photo.jpg  variants, a mounting accessory, carriage

Upload any of them under "Import from invoice". The photos are the same invoices
photographed at an angle, to show reading from a phone picture.
`;

export async function downloadBundle() {
  const files = await Promise.all(SAMPLES.map(async (s) => ({
    name: s.path.split("/").pop()!,
    data: new Uint8Array(await (await fetch(s.path)).arrayBuffer()),
  })));
  files.push({ name: "README.txt", data: new TextEncoder().encode(README) });

  const url = URL.createObjectURL(zip(files));
  const a = Object.assign(document.createElement("a"), { href: url, download: "sample-invoices.zip" });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
