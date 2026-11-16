/* Chapter 34: Verikora's home, before and after 4 November 2026 (decision record: one primary action, the window as the
   drop target). Drawn from the record and the screen measured on 15 November; not to scale. */
import type { SketchEntry, SketchShape } from "./api.ts";

const header: SketchShape[] = [
  { kind: "box", x: 0, y: 0, w: 400, h: 28, fill: "soft" },
  { kind: "lines", x: 12, y: 14, w: 44, count: 1 },
  { kind: "button", x: 298, y: 6, w: 90, h: 16, variant: "primary" },
];

export default {
  before: {
    width: 400,
    height: 250,
    frame: "desktop",
    seed: 34101,
    shapes: [
      ...header,
      { kind: "lines", x: 100, y: 46, w: 200, count: 1 },
      { kind: "box", x: 100, y: 62, w: 200, h: 104, dashed: true },
      { kind: "icon", x: 192, y: 72, name: "upload" },
      { kind: "lines", x: 150, y: 100, w: 100, count: 1 },
      { kind: "button", x: 160, y: 124, w: 80, h: 22, variant: "primary" },
      { kind: "lines", x: 100, y: 184, w: 60, count: 1 },
      { kind: "button", x: 100, y: 196, w: 60, h: 16, variant: "secondary" },
      { kind: "button", x: 170, y: 196, w: 60, h: 16, variant: "secondary" },
      { kind: "button", x: 240, y: 196, w: 60, h: 16, variant: "secondary" },
    ],
    callouts: [
      { n: 1, from: [60, 92], at: [100, 100] },
      { n: 2, from: [340, 135], at: [242, 135] },
      { n: 3, from: [350, 222], at: [302, 205] },
    ],
  },
  after: {
    width: 400,
    height: 250,
    frame: "desktop",
    seed: 34102,
    shapes: [
      ...header,
      { kind: "box", x: 4, y: 32, w: 392, h: 214, dashed: true },
      { kind: "lines", x: 24, y: 48, w: 180, count: 1 },
      { kind: "lines", x: 24, y: 66, w: 250, count: 2 },
      { kind: "box", x: 24, y: 104, w: 352, h: 28 },
      { kind: "lines", x: 34, y: 118, w: 180, count: 1 },
      { kind: "box", x: 24, y: 138, w: 352, h: 28 },
      { kind: "lines", x: 34, y: 152, w: 150, count: 1 },
      { kind: "box", x: 24, y: 172, w: 352, h: 28 },
      { kind: "lines", x: 34, y: 186, w: 200, count: 1 },
    ],
    callouts: [
      { n: 4, from: [343, 66], at: [343, 23] },
      { n: 5, from: [40, 226], at: [5, 236] },
    ],
  },
} satisfies SketchEntry;
