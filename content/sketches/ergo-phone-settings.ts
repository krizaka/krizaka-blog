/* Chapter 34: Verikora's settings at 390 px, five tabs in a row that pushed the page 167 px past the screen (decision
   record), then one menu (measured on 15 November: 0 px of sideways scroll). Not to scale. */
import type { SketchShape } from "@krizaka/ui/sketch";
import type { SketchEntry } from "../../lib/sketches.ts";

const top: SketchShape[] = [
  { kind: "box", x: 0, y: 0, w: 150, h: 24, fill: "soft" },
  { kind: "lines", x: 10, y: 12, w: 36, count: 1 },
  { kind: "lines", x: 10, y: 38, w: 80, count: 1 },
];

export default {
  before: {
    width: 150,
    height: 300,
    frame: "phone",
    seed: 34301,
    shapes: [
      ...top,
      { kind: "box", x: 8, y: 50, w: 38, h: 18, fill: "accent" },
      { kind: "box", x: 50, y: 50, w: 38, h: 18 },
      { kind: "box", x: 92, y: 50, w: 38, h: 18 },
      { kind: "box", x: 134, y: 50, w: 16, h: 18 },
      { kind: "box", x: 8, y: 80, w: 142, h: 70 },
      { kind: "lines", x: 16, y: 94, w: 134, count: 3 },
      { kind: "box", x: 8, y: 160, w: 142, h: 70 },
      { kind: "lines", x: 16, y: 174, w: 134, count: 3 },
      { kind: "arrow", from: [20, 250], to: [146, 250] },
    ],
    callouts: [
      { n: 1, from: [120, 32], at: [142, 50] },
      { n: 2, from: [70, 276], at: [70, 252] },
    ],
  },
  after: {
    width: 150,
    height: 300,
    frame: "phone",
    seed: 34302,
    shapes: [
      ...top,
      { kind: "box", x: 8, y: 50, w: 134, h: 22 },
      { kind: "lines", x: 16, y: 61, w: 60, count: 1 },
      { kind: "icon", x: 122, y: 53, name: "chevronDown" },
      { kind: "box", x: 8, y: 84, w: 134, h: 70 },
      { kind: "lines", x: 16, y: 98, w: 110, count: 3 },
      { kind: "box", x: 8, y: 164, w: 134, h: 70 },
      { kind: "lines", x: 16, y: 178, w: 110, count: 3 },
    ],
    callouts: [{ n: 3, from: [120, 32], at: [110, 50] }],
  },
} satisfies SketchEntry;
