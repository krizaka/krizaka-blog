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

const stationOf = (spec: RailSpec, defaultStation: string): string => spec.station?.trim() || defaultStation;

/* One station post for the whole figure, so the rails read as one yard: room for the widest arrived set and station name. */
function stationReserve(specs: readonly RailSpec[], defaultStation: string): number {
  return Math.max(
    ...specs.map((spec) => {
      const doneWidth = wagonsOf(spec.wagons)
        .filter((w) => w.state === "done")
        .reduce((sum, w) => sum + wagonWidth(w.label) + GAP, 0);
      return Math.max(doneWidth + STATION_GAP - GAP, Math.ceil(stationOf(spec, defaultStation).length * CHAR) + 6);
    }),
  );
}

/** Wagons in a row, each `gap` apart, from `x` towards `step` (-1 leftwards from the right edge, 1 rightwards). */
function row(wagons: readonly Wagon[], x: number, y: number, step: 1 | -1): { boxes: WagonBox[]; end: number } {
  const boxes: WagonBox[] = [];
  for (const w of wagons) {
    const ww = wagonWidth(w.label);
    const left = step === 1 ? x : x - ww;
    boxes.push({ ...w, x: left, y, w: ww, h: WAGON_H });
    x = step === 1 ? x + ww + GAP : left - GAP;
  }
  return { boxes, end: x };
}

/** The red wagons on their siding under the track, and the siding itself; nothing when no wagon is red. */
function sidingOf(
  red: readonly Wagon[],
  trackX1: number,
  trackY: number,
): { boxes: WagonBox[]; siding?: NonNullable<RailBox["siding"]> } {
  if (red.length === 0) return { boxes: [] };
  const sy = trackY + SIDING_DROP;
  const { boxes, end } = row(red, trackX1 + 2, sy - WAGON_H - 3, 1);
  const x2 = end - GAP + 8;
  return { boxes, siding: { y: sy, x1: trackX1, x2, joinX: x2 + 22 } };
}

/** One rail placed from the top `y`: its track, its wagons either side of the station, its siding. */
function railAt(spec: RailSpec, defaultStation: string, y: number, stationX: number, o: RailsOptions): RailBox {
  const wagons = wagonsOf(spec.wagons);
  const stationLabelY = y + (o.narrow ? 18 : 0) + 12;
  const top = stationLabelY + 8;
  const trackY = top + WAGON_H + 3;
  const trackX1 = o.narrow ? PAD : PAD + NAME_COL;
  const onTrack = wagons.filter((w) => w.state !== "done" && w.state !== "red");
  const waiting = row(onTrack, stationX - STATION_GAP, top, -1).boxes;
  const arrived = row(
    wagons.filter((w) => w.state === "done"),
    stationX + STATION_GAP,
    top,
    1,
  ).boxes;
  const { boxes: sided, siding } = sidingOf(
    wagons.filter((w) => w.state === "red"),
    trackX1,
    trackY,
  );
  return {
    name: spec.name,
    state: railState(spec.state),
    station: stationOf(spec, defaultStation),
    nameX: PAD,
    nameY: o.narrow ? y + 12 : trackY - 9,
    trackY,
    trackX1,
    trackX2: o.width - PAD,
    stationX,
    stationLabelY,
    siding,
    wagons: [...waiting, ...arrived, ...sided],
  };
}

export function railsLayout(specs: readonly RailSpec[], defaultStation: string, o: RailsOptions): RailsLayout {
  if (specs.length === 0) throw new Error("a <Rails> needs at least one rail");
  const stationX = o.width - PAD - stationReserve(specs, defaultStation);
  const rails: RailBox[] = [];
  let y = PAD;
  for (const spec of specs) {
    const rail = railAt(spec, defaultStation, y, stationX, o);
    rails.push(rail);
    y = (rail.siding ? rail.siding.y : rail.trackY) + 22;
  }
  return { rails, viewWidth: o.width, viewHeight: y - 22 + 6 + PAD };
}

/** What does not fit: a wagon left of its track or overlapping another, a name running into the track. Empty when the
    figure is right; the component throws on any, so a crowded figure fails the build instead of drawing a wrong picture. */
const overlap = (a: WagonBox, b: WagonBox) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function nameProblems(r: RailBox, o: RailsOptions): string[] {
  if (!o.narrow)
    return nameWidth(r.name) > NAME_COL - 8 ? [`${r.name}: the rail's name is too long for its column`] : [];
  const frozen = r.state === "frozen" ? 90 : 0;
  return nameWidth(r.name) + frozen > o.width - 2 * PAD ? [`${r.name}: the rail's name is too long for a phone`] : [];
}

function wagonProblems(r: RailBox, w: WagonBox, later: readonly WagonBox[]): string[] {
  const out: string[] = [];
  if (w.x < r.trackX1 || w.x + w.w > r.trackX2) out.push(`${r.name}: wagon « ${w.label} » is off its track`);
  for (const v of later.filter((v) => overlap(w, v)))
    out.push(`${r.name}: wagons « ${w.label} » and « ${v.label} » overlap`);
  if (w.state !== "done" && w.state !== "red" && w.x + w.w > r.stationX)
    out.push(`${r.name}: wagon « ${w.label} » runs past the station`);
  return out;
}

export function railsProblems(layout: RailsLayout, o: RailsOptions): string[] {
  return layout.rails.flatMap((r) => [
    ...nameProblems(r, o),
    ...r.wagons.flatMap((w, i) => wagonProblems(r, w, r.wagons.slice(i + 1))),
  ]);
}
