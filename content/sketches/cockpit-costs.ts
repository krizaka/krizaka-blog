/* Chapter 35: « Coûts » without its amounts (CostsView of cockpit-next, read on 16 November 2026): the header and « Refresh »,
   the month's total (hatched: no amount is ever drawn) with its « amounts missing » badge, the fixed part, a block whose source
   is run by hand and shows its stale warning, the estimates kept apart. Not to scale, no data. */
import type { SketchEntry } from "../../lib/sketches.ts";

export default {
  spec: {
    width: 400,
    height: 250,
    frame: "desktop",
    seed: 35601,
    shapes: [
      { kind: "lines", x: 16, y: 20, w: 80, count: 1 },
      { kind: "button", x: 308, y: 12, w: 76, h: 18, variant: "secondary" },
      { kind: "box", x: 16, y: 40, w: 368, h: 50 },
      { kind: "lines", x: 28, y: 54, w: 70, count: 1 },
      { kind: "hatch", x: 28, y: 64, w: 120, h: 18 },
      { kind: "box", x: 260, y: 58, w: 110, h: 14, fill: "accent" },
      { kind: "box", x: 16, y: 100, w: 180, h: 90 },
      { kind: "lines", x: 28, y: 114, w: 60, count: 1 },
      { kind: "lines", x: 28, y: 132, w: 110, count: 3 },
      { kind: "hatch", x: 150, y: 128, w: 36, h: 36 },
      { kind: "box", x: 204, y: 100, w: 180, h: 90 },
      { kind: "lines", x: 216, y: 114, w: 60, count: 1 },
      { kind: "box", x: 216, y: 124, w: 156, h: 16, fill: "soft" },
      { kind: "icon", x: 220, y: 126, name: "warning", size: 12 },
      { kind: "hatch", x: 216, y: 150, w: 156, h: 28 },
      { kind: "box", x: 16, y: 200, w: 368, h: 40, dashed: true },
      { kind: "lines", x: 28, y: 214, w: 60, count: 1 },
      { kind: "hatch", x: 120, y: 208, w: 250, h: 24 },
    ],
    callouts: [
      { n: 1, from: [290, 21], at: [306, 21] },
      { n: 2, from: [168, 73], at: [150, 73] },
      { n: 3, from: [242, 65], at: [258, 65] },
      { n: 4, from: [106, 114], at: [90, 114] },
      { n: 5, from: [366, 114], at: [350, 128] },
      { n: 6, from: [104, 214], at: [90, 214] },
    ],
  },
} satisfies SketchEntry;
