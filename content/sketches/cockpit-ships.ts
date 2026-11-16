/* Chapter 35: « Ce qui sort », By product tab (DeliveriesView of cockpit-next, read on 16 November 2026): three tabs, one card
   per product with the board's counts, the train and its red pull requests, the last release and deploy, the date of its
   oldest source and a link to GitHub. Not to scale, no data. */
import type { SketchShape } from "@krizaka/ui/sketch";
import type { SketchEntry } from "../../lib/sketches.ts";

const card = (x: number): SketchShape[] => [
  { kind: "box", x, y: 44, w: 110, h: 186 },
  { kind: "lines", x: x + 10, y: 58, w: 60, count: 1 },
  { kind: "box", x: x + 10, y: 70, w: 22, h: 18, fill: "soft" },
  { kind: "box", x: x + 36, y: 70, w: 22, h: 18, fill: "soft" },
  { kind: "box", x: x + 62, y: 70, w: 22, h: 18, fill: "soft" },
  { kind: "box", x: x + 88, y: 70, w: 18, h: 18, fill: "accent" },
  { kind: "line", from: [x + 10, 100], to: [x + 106, 100] },
  { kind: "lines", x: x + 10, y: 114, w: 60, count: 1 },
  { kind: "box", x: x + 76, y: 108, w: 30, h: 12, fill: "accent" },
  { kind: "line", from: [x + 10, 132], to: [x + 106, 132] },
  { kind: "lines", x: x + 10, y: 146, w: 90, count: 2 },
  { kind: "line", from: [x + 10, 178], to: [x + 106, 178] },
  { kind: "icon", x: x + 10, y: 188, name: "clock", size: 12 },
  { kind: "lines", x: x + 26, y: 194, w: 50, count: 1 },
  { kind: "icon", x: x + 92, y: 210, name: "external", size: 12 },
];

export default {
  spec: {
    width: 400,
    height: 250,
    frame: "desktop",
    seed: 35501,
    shapes: [
      { kind: "box", x: 16, y: 12, w: 70, h: 18, fill: "accent" },
      { kind: "box", x: 92, y: 12, w: 70, h: 18 },
      { kind: "box", x: 168, y: 12, w: 70, h: 18 },
      ...card(16),
      ...card(148),
      ...card(280),
    ],
    callouts: [
      { n: 1, from: [262, 21], at: [240, 21] },
      { n: 2, from: [137, 60], at: [158, 79] },
      { n: 3, from: [137, 114], at: [224, 114] },
      { n: 4, from: [137, 154], at: [158, 154] },
      { n: 5, from: [137, 194], at: [174, 194] },
      { n: 6, from: [269, 216], at: [252, 216] },
    ],
  },
} satisfies SketchEntry;
