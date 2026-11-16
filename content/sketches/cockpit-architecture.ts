/* Chapter 35: « Architecture » (ArchitectureView of cockpit-next, read on 16 November 2026): the facts at the top (repositories
   in step with main, gaps, date read), one tab per system, the C1 / C2 drawing made from each repository's architecture folder
   with one gap marked, and the text version under it. Not to scale, no data. */
import type { SketchEntry } from "../../lib/sketches.ts";

export default {
  spec: {
    width: 400,
    height: 260,
    frame: "desktop",
    seed: 35701,
    shapes: [
      { kind: "box", x: 16, y: 12, w: 80, h: 30, fill: "soft" },
      { kind: "box", x: 102, y: 12, w: 80, h: 30, fill: "soft" },
      { kind: "lines", x: 196, y: 28, w: 110, count: 1 },
      { kind: "box", x: 16, y: 52, w: 54, h: 16, fill: "accent" },
      { kind: "box", x: 74, y: 52, w: 54, h: 16 },
      { kind: "box", x: 132, y: 52, w: 54, h: 16 },
      { kind: "box", x: 190, y: 52, w: 54, h: 16 },
      { kind: "box", x: 248, y: 52, w: 54, h: 16 },
      { kind: "box", x: 16, y: 78, w: 368, h: 124 },
      { kind: "box", x: 36, y: 96, w: 90, h: 36 },
      { kind: "box", x: 156, y: 96, w: 90, h: 36 },
      { kind: "box", x: 276, y: 96, w: 90, h: 36, fill: "accent" },
      { kind: "box", x: 96, y: 152, w: 90, h: 36, dashed: true },
      { kind: "box", x: 216, y: 152, w: 90, h: 36 },
      { kind: "arrow", from: [126, 114], to: [156, 114] },
      { kind: "arrow", from: [246, 114], to: [276, 114] },
      { kind: "arrow", from: [200, 132], to: [150, 152] },
      { kind: "arrow", from: [210, 132], to: [250, 152] },
      { kind: "lines", x: 16, y: 218, w: 340, count: 3 },
    ],
    callouts: [
      { n: 1, from: [326, 28], at: [308, 28] },
      { n: 2, from: [322, 60], at: [304, 60] },
      { n: 3, from: [30, 170], at: [96, 170] },
      { n: 4, from: [374, 150], at: [340, 132] },
      { n: 5, from: [374, 232], at: [356, 232] },
    ],
  },
} satisfies SketchEntry;
