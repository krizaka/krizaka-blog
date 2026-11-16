/* Chapter 34: one row of Verikora's list of checks on a phone, four « label: value » pairs per document (decision record),
   then a title, one line of facts and the result at the end. Not to scale. */
import type { SketchEntry, SketchShape } from "./api.ts";

const top: SketchShape[] = [
  { kind: "box", x: 0, y: 0, w: 150, h: 24, fill: "soft" },
  { kind: "lines", x: 10, y: 12, w: 36, count: 1 },
];

const oldRow = (y: number): SketchShape[] => [
  { kind: "box", x: 8, y, w: 134, h: 80 },
  { kind: "lines", x: 14, y: y + 12, w: 50, count: 1 },
  { kind: "lines", x: 14, y: y + 26, w: 118, count: 4 },
];

const newRow = (y: number): SketchShape[] => [
  { kind: "box", x: 8, y, w: 134, h: 36 },
  { kind: "lines", x: 14, y: y + 11, w: 80, count: 1 },
  { kind: "lines", x: 14, y: y + 24, w: 56, count: 1 },
  { kind: "icon", x: 120, y: y + 10, name: "check" },
];

export default {
  before: {
    width: 150,
    height: 300,
    frame: "phone",
    seed: 34401,
    shapes: [...top, ...oldRow(110), ...oldRow(198)],
    callouts: [{ n: 1, from: [40, 72], at: [40, 136] }],
  },
  after: {
    width: 150,
    height: 300,
    frame: "phone",
    seed: 34402,
    shapes: [...top, ...newRow(110), ...newRow(152), ...newRow(194), ...newRow(236)],
    callouts: [
      { n: 2, from: [24, 64], at: [40, 120] },
      { n: 3, from: [70, 88], at: [62, 133] },
      { n: 4, from: [124, 64], at: [128, 118] },
    ],
  },
} satisfies SketchEntry;
