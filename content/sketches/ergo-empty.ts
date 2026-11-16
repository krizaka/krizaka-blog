/* Chapter 34: an empty collection in Verikora, the owl, one sentence and the screen's only drop zone with what it
   accepts. The owl is a soft box until @krizaka/ui/sketch can draw a mascot (krizaka-internal#4006). Not to scale. */
import type { SketchEntry } from "../../lib/sketches.ts";

export default {
  spec: {
    width: 400,
    height: 250,
    frame: "desktop",
    seed: 34601,
    shapes: [
      { kind: "box", x: 0, y: 0, w: 400, h: 28, fill: "soft" },
      { kind: "lines", x: 12, y: 14, w: 44, count: 1 },
      { kind: "button", x: 298, y: 6, w: 90, h: 16, variant: "primary" },
      { kind: "box", x: 0, y: 28, w: 80, h: 222 },
      { kind: "lines", x: 10, y: 46, w: 56, count: 5 },
      { kind: "lines", x: 100, y: 46, w: 120, count: 1 },
      { kind: "box", x: 215, y: 62, w: 50, h: 46, fill: "soft" },
      { kind: "lines", x: 170, y: 122, w: 140, count: 2 },
      { kind: "box", x: 130, y: 148, w: 220, h: 72, dashed: true },
      { kind: "icon", x: 232, y: 158, name: "upload" },
      { kind: "lines", x: 190, y: 190, w: 100, count: 1 },
    ],
    callouts: [
      { n: 1, from: [310, 74], at: [266, 84] },
      { n: 2, from: [360, 112], at: [312, 126] },
      { n: 3, from: [380, 236], at: [350, 214] },
    ],
  },
} satisfies SketchEntry;
