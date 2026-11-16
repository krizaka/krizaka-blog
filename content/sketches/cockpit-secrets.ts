/* Chapter 35: « Secrets et comptes » in the Workshop (SecretsView of cockpit-next, read on 16 November 2026): the « Local only »
   badge, two tabs, one name per row, the empty place of the value (the screen never reads it), « Copy » that has the Mac put
   the value on its clipboard, cleared after 30 seconds. Not to scale, no data. */
import type { SketchShape } from "@krizaka/ui/sketch";
import type { SketchEntry } from "../../lib/sketches.ts";

const row = (y: number): SketchShape[] => [
  { kind: "icon", x: 22, y: y + 4, name: "lock", size: 12 },
  { kind: "lines", x: 42, y: y + 10, w: 110, count: 1 },
  { kind: "hatch", x: 170, y: y + 2, w: 120, h: 16 },
  { kind: "button", x: 304, y: y + 2, w: 70, h: 16, variant: "secondary" },
  { kind: "line", from: [16, y + 22], to: [384, y + 22] },
];

export default {
  spec: {
    width: 400,
    height: 230,
    frame: "desktop",
    seed: 35801,
    shapes: [
      { kind: "lines", x: 16, y: 20, w: 120, count: 1 },
      { kind: "box", x: 300, y: 12, w: 84, h: 16, fill: "soft" },
      { kind: "box", x: 16, y: 40, w: 90, h: 18, fill: "accent" },
      { kind: "box", x: 112, y: 40, w: 90, h: 18 },
      ...row(70),
      ...row(96),
      ...row(122),
      ...row(148),
      ...row(174),
    ],
    callouts: [
      { n: 1, from: [280, 20], at: [298, 20] },
      { n: 2, from: [222, 49], at: [204, 49] },
      { n: 3, from: [96, 214], at: [96, 186] },
      { n: 4, from: [230, 214], at: [230, 192] },
      { n: 5, from: [392, 108], at: [376, 104] },
    ],
  },
} satisfies SketchEntry;
