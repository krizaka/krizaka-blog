/* Chapter 34: the navigation of Sovkora's phone app, four tabs at the bottom, each an icon and a word, nothing hidden at
   the top (decision record only: no capture, no measure). The tabs are drawn as places, not named. Not to scale. */
import type { SketchEntry, SketchShape } from "./api.ts";

const tab = (x: number): SketchShape[] => [
  { kind: "box", x: x + 5, y: 266, w: 14, h: 14 },
  { kind: "lines", x, y: 288, w: 24, count: 1 },
];

export default {
  spec: {
    width: 150,
    height: 300,
    frame: "phone",
    seed: 34501,
    shapes: [
      { kind: "lines", x: 10, y: 26, w: 70, count: 1 },
      { kind: "box", x: 8, y: 40, w: 134, h: 84 },
      { kind: "box", x: 16, y: 48, w: 118, h: 44, fill: "soft" },
      { kind: "lines", x: 16, y: 104, w: 100, count: 2 },
      { kind: "box", x: 8, y: 132, w: 134, h: 84 },
      { kind: "box", x: 16, y: 140, w: 118, h: 44, fill: "soft" },
      { kind: "lines", x: 16, y: 196, w: 100, count: 2 },
      { kind: "box", x: 0, y: 258, w: 150, h: 42, fill: "soft" },
      ...tab(8),
      ...tab(44),
      ...tab(80),
      ...tab(116),
    ],
    callouts: [
      { n: 1, from: [118, 236], at: [104, 258] },
      { n: 2, from: [30, 236], at: [20, 272] },
      { n: 3, at: [134, 14] },
    ],
  },
} satisfies SketchEntry;
