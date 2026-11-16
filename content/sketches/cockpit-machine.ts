/* Chapter 35: the Health tab of « La machine » (MachineView of cockpit-next, read on 16 November 2026): six tabs, one
   verdict card, the strip of sources to watch, then six rows (Teams, Trains, Scheduled tasks, Alerts, Locks, Cockpit
   refreshes), each with its verdict in words, the date of its source and a fold. Not to scale, no data. */
import type { SketchShape } from "@krizaka/ui/sketch";
import type { SketchEntry } from "../../lib/sketches.ts";

const row = (y: number, open = false): SketchShape[] => [
  { kind: "box", x: 16, y, w: 368, h: open ? 40 : 22, fill: open ? "soft" : "none" },
  { kind: "lines", x: 26, y: y + 11, w: 70, count: 1 },
  { kind: "box", x: 110, y: y + 5, w: 44, h: 12, fill: "accent" },
  { kind: "lines", x: 166, y: y + 11, w: 120, count: 1 },
  { kind: "lines", x: 300, y: y + 11, w: 46, count: 1 },
  { kind: "icon", x: 360, y: y + 5, name: open ? "chevronDown" : "chevronRight", size: 12 },
];

export default {
  spec: {
    width: 400,
    height: 280,
    frame: "desktop",
    seed: 35301,
    shapes: [
      { kind: "box", x: 16, y: 10, w: 50, h: 16, fill: "accent" },
      { kind: "box", x: 70, y: 10, w: 50, h: 16 },
      { kind: "box", x: 124, y: 10, w: 50, h: 16 },
      { kind: "box", x: 178, y: 10, w: 50, h: 16 },
      { kind: "box", x: 232, y: 10, w: 50, h: 16 },
      { kind: "box", x: 286, y: 10, w: 50, h: 16 },
      { kind: "box", x: 16, y: 36, w: 368, h: 34 },
      { kind: "icon", x: 26, y: 42, name: "warning", size: 20 },
      { kind: "lines", x: 56, y: 48, w: 180, count: 2 },
      { kind: "box", x: 16, y: 78, w: 368, h: 14, fill: "soft" },
      ...row(100, true),
      ...row(146),
      ...row(172),
      ...row(198),
      ...row(224),
      { kind: "lines", x: 32, y: 126, w: 200, count: 1 },
    ],
    callouts: [
      { n: 1, from: [362, 18], at: [338, 18] },
      { n: 2, from: [300, 54], at: [240, 54] },
      { n: 3, from: [132, 262], at: [132, 240] },
      { n: 4, from: [322, 262], at: [322, 240] },
      { n: 5, from: [392, 128], at: [370, 110] },
    ],
  },
} satisfies SketchEntry;
