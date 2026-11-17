/* Chapter 37: the reading surface « krizaka.com · Seen from outside » (ADR-028 §3, the register of the founder's Grafana Page,
   kept as a dashboard because a Page cannot be kept as code): the text panel with its source line, the « right now » sentence,
   one row per probe (up now, availability against its target, failed runs, HTTP status, certificate days, an up/down band),
   the footnote legend. Drawn from the register and the screen read on 17 November 2026; not to scale, no data. */
import type { SketchShape } from "@krizaka/ui/sketch";
import type { SketchEntry } from "../../lib/sketches.ts";

const band = (y: number): SketchShape[] =>
  [0, 1, 2, 3, 4, 5].map(
    (i) => ({ kind: "box", x: 316 + i * 11, y: y + 5, w: 9, h: 8, fill: "accent" }) as SketchShape,
  );

const row = (y: number): SketchShape[] => [
  { kind: "lines", x: 22, y: y + 9, w: 70, count: 1 },
  { kind: "icon", x: 112, y: y + 2, name: "check", size: 12 },
  { kind: "lines", x: 146, y: y + 9, w: 40, count: 1 },
  { kind: "lines", x: 204, y: y + 9, w: 14, count: 1 },
  { kind: "lines", x: 234, y: y + 9, w: 22, count: 1 },
  { kind: "lines", x: 274, y: y + 9, w: 22, count: 1 },
  ...band(y),
  { kind: "line", from: [16, y + 18], to: [384, y + 18] },
];

export default {
  spec: {
    width: 400,
    height: 250,
    frame: "desktop",
    seed: 37101,
    shapes: [
      { kind: "box", x: 16, y: 10, w: 368, h: 48, fill: "soft" },
      { kind: "lines", x: 26, y: 24, w: 150, count: 1 },
      { kind: "lines", x: 26, y: 38, w: 260, count: 1 },
      { kind: "lines", x: 26, y: 50, w: 180, count: 1 },
      { kind: "icon", x: 16, y: 64, name: "check", size: 14 },
      { kind: "lines", x: 36, y: 72, w: 200, count: 1 },
      { kind: "box", x: 16, y: 88, w: 368, h: 14, fill: "soft" },
      ...row(104),
      ...row(122),
      ...row(140),
      ...row(158),
      ...row(176),
      { kind: "lines", x: 16, y: 212, w: 300, count: 2 },
    ],
    callouts: [
      { n: 1, from: [300, 24], at: [178, 24] },
      { n: 2, from: [300, 50], at: [208, 50] },
      { n: 3, from: [300, 72], at: [238, 72] },
      { n: 4, from: [8, 140], at: [22, 140] },
      { n: 5, from: [200, 240], at: [200, 194] },
      { n: 6, from: [392, 80], at: [380, 108] },
      { n: 7, from: [340, 216], at: [318, 216] },
    ],
  },
} satisfies SketchEntry;
