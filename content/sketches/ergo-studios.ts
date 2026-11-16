/* Chapter 34: Sovkora's Studios, the two-column card grid (three per screen) then the list (one state in words and one
   action per row, the filter in the address). Drawn from the decision record and the screen of 15 November; not to scale. */
import type { SketchShape } from "@krizaka/ui/sketch";
import type { SketchEntry } from "../../lib/sketches.ts";

const header: SketchShape[] = [
  { kind: "box", x: 0, y: 0, w: 400, h: 28, fill: "soft" },
  { kind: "lines", x: 12, y: 14, w: 44, count: 1 },
];

const card = (x: number, y: number): SketchShape[] => [
  { kind: "box", x, y, w: 170, h: 95 },
  { kind: "box", x: x + 8, y: y + 8, w: 154, h: 40, fill: "soft" },
  { kind: "lines", x: x + 8, y: y + 58, w: 140, count: 2 },
  { kind: "button", x: x + 8, y: y + 74, w: 60, h: 14, variant: "secondary" },
];

const row = (y: number): SketchShape[] => [
  { kind: "box", x: 24, y, w: 352, h: 28 },
  { kind: "icon", x: 32, y: y + 6, name: "studio" },
  { kind: "lines", x: 60, y: y + 14, w: 170, count: 1 },
  { kind: "lines", x: 248, y: y + 14, w: 44, count: 1 },
  { kind: "button", x: 308, y: y + 5, w: 60, h: 18, variant: "secondary" },
];

export default {
  before: {
    width: 400,
    height: 250,
    frame: "desktop",
    seed: 34201,
    shapes: [...header, ...card(24, 40), ...card(206, 40), ...card(24, 145)],
    callouts: [{ n: 1, from: [300, 196], at: [194, 186] }],
  },
  after: {
    width: 400,
    height: 250,
    frame: "desktop",
    seed: 34202,
    shapes: [
      ...header,
      { kind: "box", x: 24, y: 38, w: 50, h: 16, fill: "accent" },
      { kind: "box", x: 80, y: 38, w: 50, h: 16 },
      { kind: "box", x: 136, y: 38, w: 64, h: 16 },
      ...row(64),
      ...row(98),
      ...row(132),
      ...row(166),
      ...row(200),
    ],
    callouts: [
      { n: 2, from: [238, 46], at: [202, 46] },
      { n: 3, from: [270, 240], at: [270, 216] },
      { n: 4, from: [386, 48], at: [352, 69] },
    ],
  },
} satisfies SketchEntry;
