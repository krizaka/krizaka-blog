/* Chapter 34: Verikora's appearance settings, System, Light and Dark (the default), the choice kept in the browser.
   Not to scale. */
import type { SketchEntry } from "./api.ts";

export default {
  spec: {
    width: 400,
    height: 250,
    frame: "desktop",
    seed: 34801,
    shapes: [
      { kind: "box", x: 0, y: 0, w: 400, h: 28, fill: "soft" },
      { kind: "lines", x: 12, y: 14, w: 44, count: 1 },
      { kind: "box", x: 0, y: 28, w: 80, h: 222 },
      { kind: "lines", x: 10, y: 46, w: 56, count: 5 },
      { kind: "lines", x: 100, y: 44, w: 100, count: 1 },
      { kind: "box", x: 100, y: 62, w: 280, h: 104 },
      { kind: "lines", x: 112, y: 78, w: 100, count: 1 },
      { kind: "box", x: 112, y: 96, w: 240, h: 30 },
      { kind: "line", from: [192, 96], to: [192, 126] },
      { kind: "box", x: 272, y: 96, w: 80, h: 30, fill: "accent" },
      { kind: "icon", x: 144, y: 103, name: "theme" },
      { kind: "icon", x: 224, y: 103, name: "sun" },
      { kind: "icon", x: 304, y: 103, name: "moon" },
      { kind: "lines", x: 112, y: 142, w: 200, count: 2 },
    ],
    callouts: [
      { n: 1, from: [152, 196], at: [152, 126] },
      { n: 2, from: [232, 196], at: [232, 126] },
      { n: 3, from: [312, 196], at: [312, 126] },
    ],
  },
} satisfies SketchEntry;
