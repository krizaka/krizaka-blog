/* Chapter 37: the « Observabilité » block of the cockpit as ADR-028 §2 plans it (krizaka-internal#2838): every link in one
   row, dev and prod (prod « à créer » while it does not exist), one row per app with its headline numbers read live from the
   stack, and an unreachable stack shown as « indisponible », never as a made-up 100 %. Not built yet: drawn from the plan,
   not from a screen; not to scale, no data. */
import type { SketchShape } from "@krizaka/ui/sketch";
import type { SketchEntry } from "../../lib/sketches.ts";

const row = (y: number): SketchShape[] => [
  { kind: "lines", x: 22, y: y + 9, w: 60, count: 1 },
  { kind: "icon", x: 98, y: y + 2, name: "check", size: 12 },
  { kind: "lines", x: 130, y: y + 9, w: 30, count: 1 },
  { kind: "lines", x: 180, y: y + 9, w: 24, count: 1 },
  { kind: "lines", x: 226, y: y + 9, w: 30, count: 1 },
  { kind: "lines", x: 276, y: y + 9, w: 12, count: 1 },
  { kind: "box", x: 310, y: y + 3, w: 44, h: 12 },
  { kind: "line", from: [16, y + 20], to: [384, y + 20] },
];

export default {
  spec: {
    width: 400,
    height: 250,
    frame: "desktop",
    seed: 37301,
    shapes: [
      { kind: "box", x: 0, y: 0, w: 400, h: 24, fill: "soft" },
      { kind: "lines", x: 12, y: 12, w: 60, count: 1 },
      { kind: "lines", x: 16, y: 40, w: 110, count: 1 },
      { kind: "button", x: 16, y: 52, w: 52, h: 16, variant: "secondary" },
      { kind: "button", x: 74, y: 52, w: 52, h: 16, variant: "secondary" },
      { kind: "button", x: 132, y: 52, w: 52, h: 16, variant: "secondary" },
      { kind: "button", x: 190, y: 52, w: 52, h: 16, variant: "secondary" },
      { kind: "button", x: 248, y: 52, w: 52, h: 16, variant: "secondary" },
      { kind: "box", x: 312, y: 52, w: 32, h: 16, fill: "accent" },
      { kind: "box", x: 350, y: 52, w: 34, h: 16, dashed: true },
      { kind: "box", x: 16, y: 80, w: 368, h: 14, fill: "soft" },
      ...row(96),
      ...row(118),
      ...row(140),
      { kind: "lines", x: 22, y: 171, w: 60, count: 1 },
      { kind: "box", x: 130, y: 165, w: 224, h: 12, dashed: true },
      { kind: "line", from: [16, 182], to: [384, 182] },
      { kind: "lines", x: 16, y: 204, w: 250, count: 1 },
    ],
    callouts: [
      { n: 1, from: [160, 36], at: [160, 52] },
      { n: 2, from: [367, 36], at: [367, 52] },
      { n: 3, from: [8, 128], at: [22, 128] },
      { n: 4, from: [200, 236], at: [200, 160] },
      { n: 5, from: [392, 171], at: [354, 171] },
    ],
  },
} satisfies SketchEntry;
