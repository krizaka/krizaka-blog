/* Chapter 34: a check that did not go through in Verikora, the message where the report would have been, « Retry »
   (filled) and « Choose another file », the menu and the top bar still usable; below, the « Under the law » card that keeps
   a second filled button (not fixed yet, measured on 15 November). Not to scale. */
import type { SketchEntry } from "./api.ts";

export default {
  spec: {
    width: 400,
    height: 250,
    frame: "desktop",
    seed: 34701,
    shapes: [
      { kind: "box", x: 0, y: 0, w: 400, h: 28, fill: "soft" },
      { kind: "lines", x: 12, y: 14, w: 44, count: 1 },
      { kind: "box", x: 0, y: 28, w: 80, h: 222 },
      { kind: "lines", x: 10, y: 46, w: 56, count: 5 },
      { kind: "lines", x: 100, y: 44, w: 140, count: 1 },
      { kind: "box", x: 100, y: 58, w: 280, h: 72, fill: "soft" },
      { kind: "icon", x: 110, y: 68, name: "warning" },
      { kind: "lines", x: 136, y: 72, w: 228, count: 2 },
      { kind: "button", x: 136, y: 100, w: 70, h: 18, variant: "primary" },
      { kind: "button", x: 214, y: 100, w: 110, h: 18, variant: "secondary" },
      { kind: "box", x: 100, y: 146, w: 280, h: 82 },
      { kind: "lines", x: 112, y: 158, w: 120, count: 1 },
      { kind: "lines", x: 112, y: 172, w: 240, count: 2 },
      { kind: "button", x: 112, y: 200, w: 100, h: 18, variant: "primary" },
    ],
    callouts: [
      { n: 1, from: [392, 44], at: [372, 62] },
      { n: 2, from: [171, 138], at: [171, 118] },
      { n: 3, from: [269, 138], at: [269, 118] },
      { n: 4, at: [40, 150] },
      { n: 5, from: [262, 238], at: [212, 212] },
    ],
  },
} satisfies SketchEntry;
