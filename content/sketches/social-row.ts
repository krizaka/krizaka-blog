/* Chapter 38: one row of the publishing calendar on its way to the record. Top: the row (day and hour, its status, its text).
   Middle: the statuses, propose → a-valider-cto → valide-cto, and the side exit (retire, or by hand). Right: the gate at the
   hour. Bottom: the claim pushed first, the network call, then the « published » line of the record. Not to scale. */
import type { SketchEntry } from "../../lib/sketches.ts";

export default {
  spec: {
    width: 420,
    height: 270,
    frame: "none",
    seed: 37101,
    shapes: [
      // the calendar row
      { kind: "box", x: 10, y: 12, w: 400, h: 34, fill: "soft" },
      { kind: "icon", x: 18, y: 17, name: "calendar" },
      { kind: "lines", x: 48, y: 30, w: 40, count: 1 },
      { kind: "box", x: 98, y: 18, w: 62, h: 22, fill: "accent" },
      { kind: "lines", x: 172, y: 26, w: 226, count: 2 },
      // the statuses
      { kind: "box", x: 10, y: 74, w: 84, h: 30 },
      { kind: "lines", x: 20, y: 90, w: 60, count: 1 },
      { kind: "arrow", from: [94, 89], to: [118, 89] },
      { kind: "box", x: 118, y: 74, w: 84, h: 30 },
      { kind: "lines", x: 128, y: 90, w: 60, count: 1 },
      { kind: "arrow", from: [202, 89], to: [226, 89] },
      { kind: "box", x: 226, y: 74, w: 84, h: 30, fill: "accent" },
      { kind: "line", from: [160, 104], to: [160, 128] },
      { kind: "box", x: 118, y: 128, w: 84, h: 26, dashed: true },
      { kind: "lines", x: 128, y: 142, w: 60, count: 1 },
      // the gate at the hour
      { kind: "arrow", from: [310, 89], to: [340, 89] },
      { kind: "icon", x: 344, y: 75, name: "shield" },
      { kind: "icon", x: 378, y: 75, name: "clock" },
      // the claim, the network call
      { kind: "arrow", from: [356, 104], to: [356, 168] },
      { kind: "icon", x: 344, y: 172, name: "lock" },
      { kind: "arrow", from: [342, 184], to: [300, 184] },
      { kind: "icon", x: 272, y: 172, name: "globe" },
      // the record: one line per event
      { kind: "box", x: 10, y: 210, w: 400, h: 50 },
      { kind: "icon", x: 18, y: 222, name: "server" },
      { kind: "lines", x: 50, y: 222, w: 220, count: 1 },
      { kind: "box", x: 48, y: 234, w: 300, h: 18, fill: "soft" },
      { kind: "lines", x: 56, y: 246, w: 260, count: 1 },
      { kind: "arrow", from: [356, 196], to: [356, 220] },
      { kind: "arrow", from: [284, 196], to: [284, 234] },
    ],
    callouts: [
      { n: 1, from: [28, 62], at: [36, 46] },
      { n: 2, from: [52, 120], at: [52, 104] },
      { n: 3, from: [216, 62], at: [160, 74] },
      { n: 4, from: [300, 62], at: [268, 74] },
      { n: 5, from: [222, 142], at: [202, 142] },
      { n: 6, from: [404, 112], at: [368, 96] },
      { n: 7, from: [404, 160], at: [368, 184] },
      { n: 8, from: [236, 168], at: [272, 184] },
      { n: 9, from: [396, 232], at: [348, 243] },
    ],
  },
} satisfies SketchEntry;
