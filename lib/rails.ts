/* The geometry of a chapter's train figure (app/components/pages/Rails.tsx): one rail per line of work, its wagons waiting
   left of the station, the ones that arrived right of it, a red wagon moved down to a siding. MDX props are strings, so a
   rail is written in a small, readable form:

     <Rail name="Produit A" state="frozen" wagons="fix(main):fix | PR 2:wait | PR 1:done"/>

   Wagons are listed head first: the first non-arrived wagon is the nearest to the station. Pure numbers, tested in
   tests/rails.test.mjs: no wagon overlaps another, every wagon and label fits the drawing, at the wide and the phone width. */

export const WAGON_STATES = ["wait", "go", "done", "red", "fix", "stack", "free", "model"] as const;
export type WagonState = (typeof WAGON_STATES)[number];

export const RAIL_STATES = ["open", "frozen"] as const;
export type RailState = (typeof RAIL_STATES)[number];

export type Wagon = { label: string; state: WagonState };
export type RailSpec = { name: string; state?: string; station?: string; wagons: string };

export type WagonBox = Wagon & { x: number; y: number; w: number; h: number };
export type RailBox = {
  name: string;
  state: RailState;
  station: string;
  nameX: number;
  nameY: number;
  trackY: number;
  trackX1: number;
  trackX2: number;
  stationX: number;
  stationLabelY: number;
  /* the siding: a line under the track, joined to it by a short diagonal, where red wagons wait */
  siding?: { y: number; x1: number; x2: number; joinX: number };
  wagons: WagonBox[];
};
export type RailsLayout = { rails: RailBox[]; viewWidth: number; viewHeight: number };

/** `"PR 1:go | PR 2:wait"` → the wagons, head first. An unknown or missing state fails the build. */
export function wagonsOf(spec: string): Wagon[] {
  const out = spec
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const at = part.lastIndexOf(":");
      const state = at > 0 ? part.slice(at + 1).trim() : "";
      if (!(WAGON_STATES as readonly string[]).includes(state))
        throw new Error(`a wagon needs « label:state » with a state of ${WAGON_STATES.join(", ")}: ${part}`);
      return { label: part.slice(0, at).trim(), state: state as WagonState };
    });
  if (out.length === 0) throw new Error("a <Rail> needs at least one wagon");
  return out;
}

export function railState(state: string | undefined): RailState {
  if (state === undefined || state === "") return "open";
  if (!(RAIL_STATES as readonly string[]).includes(state))
    throw new Error(`a <Rail> state is open or frozen: ${state}`);
  return state as RailState;
}

/* The mono face at 11 px is about 6.7 px a character; a wagon is never narrower than four characters. */
const CHAR = 6.8;
export const wagonWidth = (label: string): number => Math.max(44, Math.ceil(label.length * CHAR + 16));
const nameWidth = (name: string): number => Math.ceil(name.length * 7.4);

export type RailsOptions = { width: number; narrow: boolean };

const WAGON_H = 26;
const GAP = 6;
const PAD = 4;
const STATION_GAP = 10;
const SIDING_DROP = 36;
const NAME_COL = 116;

export function railsLayout(specs: readonly RailSpec[], defaultStation: string, o: RailsOptions): RailsLayout {
  if (specs.length === 0) throw new Error("a <Rails> needs at least one rail");
  const rails: RailBox[] = [];
  /* One station post for the whole figure, so the rails read as one yard: room for the widest arrived set and station name. */
  const reserve = Math.max(
    ...specs.map((spec) => {
      const doneWidth = wagonsOf(spec.wagons)
        .filter((w) => w.state === "done")
        .reduce((sum, w) => sum + wagonWidth(w.label) + GAP, 0);
      const station = spec.station?.trim() || defaultStation;
      return Math.max(doneWidth + STATION_GAP - GAP, Math.ceil(station.length * CHAR) + 6);
    }),
  );
  let y = PAD;
  for (const spec of specs) {
    const wagons = wagonsOf(spec.wagons);
    const state = railState(spec.state);
    const station = spec.station?.trim() || defaultStation;
    const nameRow = o.narrow ? 18 : 0;
    const stationLabelY = y + nameRow + 12;
    const top = stationLabelY + 8;
    const trackY = top + WAGON_H + 3;
    const trackX1 = o.narrow ? PAD : PAD + NAME_COL;
    const trackX2 = o.width - PAD;
    const done = wagons.filter((w) => w.state === "done");
    const red = wagons.filter((w) => w.state === "red");
    const onTrack = wagons.filter((w) => w.state !== "done" && w.state !== "red");
    const stationX = trackX2 - reserve;
    const boxes: WagonBox[] = [];
    let x = stationX - STATION_GAP;
    for (const w of onTrack) {
      const ww = wagonWidth(w.label);
      x -= ww;
      boxes.push({ ...w, x, y: top, w: ww, h: WAGON_H });
      x -= GAP;
    }
    let dx = stationX + STATION_GAP;
    for (const w of done) {
      const ww = wagonWidth(w.label);
      boxes.push({ ...w, x: dx, y: top, w: ww, h: WAGON_H });
      dx += ww + GAP;
    }
    let siding: RailBox["siding"];
    if (red.length > 0) {
      const sy = trackY + SIDING_DROP;
      let rx = trackX1 + 2;
      for (const w of red) {
        const ww = wagonWidth(w.label);
        boxes.push({ ...w, x: rx, y: sy - WAGON_H - 3, w: ww, h: WAGON_H });
        rx += ww + GAP;
      }
      const x2 = rx - GAP + 8;
      siding = { y: sy, x1: trackX1, x2, joinX: x2 + 22 };
    }
    const bottom = siding ? siding.y : trackY;
    rails.push({
      name: spec.name,
      state,
      station,
      nameX: PAD,
      nameY: o.narrow ? y + 12 : trackY - 9,
      trackY,
      trackX1,
      trackX2,
      stationX,
      stationLabelY,
      siding,
      wagons: boxes,
    });
    y = bottom + 22;
  }
  return { rails, viewWidth: o.width, viewHeight: y - 22 + 6 + PAD };
}

/** What does not fit: a wagon left of its track or overlapping another, a name running into the track. Empty when the
    figure is right; the component throws on any, so a crowded figure fails the build instead of drawing a wrong picture. */
export function railsProblems(layout: RailsLayout, o: RailsOptions): string[] {
  const out: string[] = [];
  const overlap = (a: WagonBox, b: WagonBox) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (const r of layout.rails) {
    if (!o.narrow && nameWidth(r.name) > NAME_COL - 8)
      out.push(`${r.name}: the rail's name is too long for its column`);
    if (o.narrow && nameWidth(r.name) + (r.state === "frozen" ? 90 : 0) > o.width - 2 * PAD)
      out.push(`${r.name}: the rail's name is too long for a phone`);
    for (const [i, w] of r.wagons.entries()) {
      if (w.x < r.trackX1 || w.x + w.w > r.trackX2) out.push(`${r.name}: wagon « ${w.label} » is off its track`);
      for (const v of r.wagons.slice(i + 1))
        if (overlap(w, v)) out.push(`${r.name}: wagons « ${w.label} » and « ${v.label} » overlap`);
      if (w.state !== "done" && w.state !== "red" && w.x + w.w > r.stationX)
        out.push(`${r.name}: wagon « ${w.label} » runs past the station`);
    }
  }
  return out;
}
