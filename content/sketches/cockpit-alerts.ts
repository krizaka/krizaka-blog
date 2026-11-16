/* Chapter 35: the Alerts tab of « La machine » (AlertsView of cockpit-next, read on 16 November 2026): the counts at the head,
   the table (severity, source, message, count, first and last seen, state, acknowledged by, note, proof; the drawing keeps
   five columns), the facets and 25 rows a page. Not to scale, no data. */
import type { SketchShape } from "@krizaka/ui/sketch";
import type { SketchEntry } from "../../lib/sketches.ts";

const row = (y: number, critical = false): SketchShape[] => [
  { kind: "box", x: 16, y: y + 4, w: 40, h: 12, fill: critical ? "accent" : "soft" },
  { kind: "lines", x: 66, y: y + 10, w: 50, count: 1 },
  { kind: "lines", x: 126, y: y + 10, w: 150, count: 1 },
  { kind: "lines", x: 290, y: y + 10, w: 20, count: 1 },
  { kind: "box", x: 326, y: y + 4, w: 56, h: 12 },
  { kind: "line", from: [16, y + 20], to: [384, y + 20] },
];

export default {
  spec: {
    width: 400,
    height: 250,
    frame: "desktop",
    seed: 35401,
    shapes: [
      { kind: "box", x: 16, y: 12, w: 70, h: 18, fill: "soft" },
      { kind: "box", x: 92, y: 12, w: 70, h: 18 },
      { kind: "box", x: 168, y: 12, w: 70, h: 18 },
      { kind: "icon", x: 300, y: 14, name: "filter", size: 14 },
      { kind: "box", x: 318, y: 12, w: 66, h: 18 },
      { kind: "box", x: 16, y: 40, w: 368, h: 16, fill: "soft" },
      ...row(58, true),
      ...row(80),
      ...row(102),
      ...row(124),
      ...row(146),
      ...row(168),
      { kind: "button", x: 290, y: 206, w: 40, h: 16, variant: "secondary" },
      { kind: "button", x: 336, y: 206, w: 40, h: 16, variant: "secondary" },
    ],
    callouts: [
      { n: 1, from: [264, 21], at: [240, 21] },
      { n: 2, from: [36, 236], at: [36, 76] },
      { n: 3, from: [200, 236], at: [200, 72] },
      { n: 4, from: [300, 236], at: [300, 72] },
      { n: 5, from: [392, 100], at: [380, 72] },
      { n: 6, from: [270, 214], at: [290, 214] },
    ],
  },
} satisfies SketchEntry;
