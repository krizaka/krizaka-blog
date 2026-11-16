/* Chapter 35: the age of a figure, before and after « Rafraîchir » (the stale badge of a source, its refresh button, then the
   same block up to date). Drawn from the freshness badge of cockpit-next (messages « Vieux de {age} », « À jour · {date} »,
   « Relevé toutes les {every} »), read on 16 November 2026. Replaces the clip of the first version. Not to scale. */
import type { SketchShape } from "@krizaka/ui/sketch";
import type { SketchEntry } from "../../lib/sketches.ts";

const card: SketchShape[] = [
  { kind: "box", x: 10, y: 10, w: 280, h: 140 },
  { kind: "lines", x: 22, y: 26, w: 90, count: 1 },
  { kind: "lines", x: 22, y: 70, w: 240, count: 3 },
  { kind: "box", x: 22, y: 110, w: 70, h: 26 },
  { kind: "box", x: 100, y: 110, w: 70, h: 26 },
  { kind: "box", x: 178, y: 110, w: 70, h: 26 },
];

export default {
  before: {
    width: 300,
    height: 160,
    frame: "desktop",
    seed: 35201,
    shapes: [
      ...card,
      { kind: "box", x: 22, y: 40, w: 110, h: 16, fill: "accent" },
      { kind: "icon", x: 26, y: 42, name: "warning", size: 12 },
      { kind: "button", x: 210, y: 20, w: 68, h: 18, variant: "secondary" },
    ],
    callouts: [
      { n: 1, from: [160, 48], at: [134, 48] },
      { n: 2, from: [244, 54], at: [244, 38] },
    ],
  },
  after: {
    width: 300,
    height: 160,
    frame: "desktop",
    seed: 35202,
    shapes: [
      ...card,
      { kind: "box", x: 22, y: 40, w: 110, h: 16, fill: "soft" },
      { kind: "icon", x: 26, y: 42, name: "check", size: 12 },
      { kind: "lines", x: 140, y: 48, w: 70, count: 1 },
      { kind: "button", x: 210, y: 20, w: 68, h: 18, variant: "secondary" },
    ],
    callouts: [
      { n: 3, from: [80, 92], at: [76, 56] },
      { n: 4, from: [230, 62], at: [210, 48] },
    ],
  },
} satisfies SketchEntry;
