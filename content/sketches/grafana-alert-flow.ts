/* Chapter 37: how an alert reaches the founder (the probes and engine scripts of the infrastructure
   code, krizaka-internal#2631 and #3437; the App Platform alerts of each app spec, krizaka-internal#4151): two probe locations, the public sites and the dev apps, the
   engine's measures over OTLP, the metrics, the rules, the one contact point, and DigitalOcean's own alerts beside it. Drawn
   from the code read on 17 November 2026; not to scale, no address. */
import type { SketchEntry } from "../../lib/sketches.ts";

export default {
  spec: {
    width: 400,
    height: 250,
    frame: "none",
    seed: 37201,
    shapes: [
      { kind: "icon", x: 10, y: 26, name: "globe", size: 18 },
      { kind: "icon", x: 10, y: 60, name: "globe", size: 18 },
      { kind: "arrow", from: [30, 35], to: [60, 35] },
      { kind: "arrow", from: [30, 69], to: [60, 50] },
      { kind: "box", x: 60, y: 20, w: 80, h: 40 },
      { kind: "lines", x: 68, y: 32, w: 60, count: 2 },
      { kind: "box", x: 60, y: 88, w: 80, h: 32 },
      { kind: "lines", x: 68, y: 100, w: 56, count: 1 },
      { kind: "box", x: 160, y: 28, w: 235, h: 90, dashed: true },
      { kind: "box", x: 170, y: 40, w: 60, h: 66, fill: "soft" },
      { kind: "lines", x: 178, y: 56, w: 44, count: 3 },
      { kind: "arrow", from: [140, 40], to: [170, 58] },
      { kind: "arrow", from: [140, 104], to: [170, 92] },
      { kind: "box", x: 252, y: 50, w: 58, h: 46 },
      { kind: "icon", x: 270, y: 62, name: "warning", size: 20 },
      { kind: "arrow", from: [230, 73], to: [252, 73] },
      { kind: "box", x: 330, y: 50, w: 58, h: 46 },
      { kind: "icon", x: 348, y: 62, name: "message", size: 20 },
      { kind: "arrow", from: [310, 73], to: [330, 73] },
      { kind: "arrow", from: [359, 96], to: [359, 166] },
      { kind: "icon", x: 347, y: 170, name: "user", size: 24 },
      { kind: "box", x: 170, y: 168, w: 120, h: 48 },
      { kind: "icon", x: 180, y: 180, name: "server", size: 20 },
      { kind: "lines", x: 208, y: 186, w: 70, count: 2 },
      { kind: "arrow", from: [290, 190], to: [344, 184] },
    ],
    callouts: [
      { n: 1, from: [20, 110], at: [20, 80] },
      { n: 2, from: [100, 8], at: [100, 20] },
      { n: 3, from: [100, 142], at: [100, 120] },
      { n: 4, from: [200, 134], at: [200, 106] },
      { n: 5, from: [281, 134], at: [281, 96] },
      { n: 6, from: [392, 134], at: [380, 96] },
      { n: 7, from: [230, 238], at: [230, 216] },
      { n: 8, from: [392, 226], at: [370, 194] },
    ],
  },
} satisfies SketchEntry;
