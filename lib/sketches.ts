/* The chapters' pen drawings by id (krizaka-internal#3943): a chapter writes <Sketch id title><Callout n label>…</Callout></Sketch>,
   the drawing is a typed spec in content/sketches/<id>.ts (no SVG by hand), the words are the chapter's own. The block that
   draws them is @krizaka/ui/sketch (krizaka-internal#4006); its types are the only ones. Checked here and in
   tests/sketches.test.mjs: an unknown id is refused, the numbers run 1 to n across a before / after pair, every shape stays
   in its drawing, and every number has exactly one legend line and the reverse. */
import type { SketchLegendItem, SketchShape, SketchSpec } from "@krizaka/ui/sketch";
import cockpitToday from "../content/sketches/cockpit-today.ts";
import cockpitRefresh from "../content/sketches/cockpit-refresh.ts";
import cockpitMachine from "../content/sketches/cockpit-machine.ts";
import cockpitAlerts from "../content/sketches/cockpit-alerts.ts";
import cockpitShips from "../content/sketches/cockpit-ships.ts";
import cockpitCosts from "../content/sketches/cockpit-costs.ts";
import cockpitArchitecture from "../content/sketches/cockpit-architecture.ts";
import cockpitSecrets from "../content/sketches/cockpit-secrets.ts";
import ergoEmpty from "../content/sketches/ergo-empty.ts";
import ergoError from "../content/sketches/ergo-error.ts";
import ergoHome from "../content/sketches/ergo-home.ts";
import ergoPhoneList from "../content/sketches/ergo-phone-list.ts";
import ergoPhoneSettings from "../content/sketches/ergo-phone-settings.ts";
import ergoSovkoraTabs from "../content/sketches/ergo-sovkora-tabs.ts";
import ergoStudios from "../content/sketches/ergo-studios.ts";
import ergoThemes from "../content/sketches/ergo-themes.ts";
import grafanaSeenFromOutside from "../content/sketches/grafana-seen-from-outside.ts";
import grafanaAlertFlow from "../content/sketches/grafana-alert-flow.ts";
import grafanaCockpitBlock from "../content/sketches/grafana-cockpit-block.ts";
import socialRow from "../content/sketches/social-row.ts";

/** One drawing of a chapter: one screen, or a before / after pair whose callouts are numbered 1 to n across both. */
export type SketchEntry = { spec: SketchSpec } | { before: SketchSpec; after: SketchSpec };

export const SKETCHES: Readonly<Record<string, SketchEntry>> = {
  "ergo-home": ergoHome,
  "ergo-studios": ergoStudios,
  "ergo-phone-settings": ergoPhoneSettings,
  "ergo-phone-list": ergoPhoneList,
  "ergo-sovkora-tabs": ergoSovkoraTabs,
  "ergo-empty": ergoEmpty,
  "ergo-error": ergoError,
  "ergo-themes": ergoThemes,
  "cockpit-today": cockpitToday,
  "cockpit-refresh": cockpitRefresh,
  "cockpit-machine": cockpitMachine,
  "cockpit-alerts": cockpitAlerts,
  "cockpit-ships": cockpitShips,
  "cockpit-costs": cockpitCosts,
  "cockpit-architecture": cockpitArchitecture,
  "cockpit-secrets": cockpitSecrets,
  "grafana-seen-from-outside": grafanaSeenFromOutside,
  "grafana-alert-flow": grafanaAlertFlow,
  "grafana-cockpit-block": grafanaCockpitBlock,
  "social-row": socialRow,
};

/** The drawing of an id; an unknown id fails the build. */
export function sketchOf(id: string): SketchEntry {
  const entry = Object.hasOwn(SKETCHES, id) ? SKETCHES[id] : undefined;
  if (!entry) throw new Error(`Sketch: unknown id « ${id} » (content/sketches/, lib/sketches.ts)`);
  return entry;
}

/** The drawings of an entry, in reading order: one, or before then after. */
export const specsOf = (entry: SketchEntry): SketchSpec[] =>
  "spec" in entry ? [entry.spec] : [entry.before, entry.after];

/** The callout numbers of an entry, in reading order. */
export const numbersOf = (entry: SketchEntry): number[] =>
  specsOf(entry).flatMap((s) => (s.callouts ?? []).map((c) => c.n));

const pointsOf = (shape: SketchShape): [number, number][] => {
  if ("from" in shape) return [shape.from, shape.to];
  const corner: [number, number] = [shape.x, shape.y];
  if ("w" in shape) return [corner, [shape.x + shape.w, shape.y + ("h" in shape ? shape.h : 0)]];
  return [corner];
};

const inside = (spec: SketchSpec, [x, y]: [number, number]) => x >= 0 && y >= 0 && x <= spec.width && y <= spec.height;

/** Every problem of a drawing: numbers 1..n each once, shapes and callouts inside their drawing. */
export function drawingProblems(id: string, entry: SketchEntry): string[] {
  const out: string[] = [];
  const numbers = numbersOf(entry);
  if (numbers.length === 0) out.push(`${id}: a sketch explains at least one item`);
  [...numbers]
    .sort((a, b) => a - b)
    .forEach((n, i) => {
      if (n !== i + 1) out.push(`${id}: callouts are numbered 1 to ${numbers.length}, each once (found ${n})`);
    });
  if (numbers.some((n, i) => i > 0 && n < numbers[i - 1])) out.push(`${id}: callouts are numbered in reading order`);
  specsOf(entry).forEach((spec, k) => {
    spec.shapes.forEach((shape, i) => {
      if (!pointsOf(shape).every((p) => inside(spec, p))) out.push(`${id}: drawing ${k + 1}, shape ${i + 1} leaves it`);
      if (shape.kind === "text") out.push(`${id}: no words inside a drawing, the legend carries them (shape ${i + 1})`);
    });
    for (const c of spec.callouts ?? []) {
      if (!inside(spec, c.at) || (c.from && !inside(spec, c.from)))
        out.push(`${id}: callout ${c.n} leaves its drawing`);
    }
  });
  return out;
}

/** The legend's problems: one line per callout number, and no line without its number. */
export function legendProblems(id: string, entry: SketchEntry, legend: readonly number[]): string[] {
  const drawn = new Set(numbersOf(entry));
  const said = new Set(legend);
  const out: string[] = [];
  for (const n of drawn) if (!said.has(n)) out.push(`${id}: callout ${n} has no legend line`);
  for (const n of said) if (!drawn.has(n)) out.push(`${id}: legend line ${n} has no callout`);
  if (said.size !== legend.length) out.push(`${id}: a legend number is given twice`);
  return out;
}

/** The legend lines of one drawing of an entry: those whose number is one of its callouts, in the legend's order. */
export const legendFor = (spec: SketchSpec, legend: readonly SketchLegendItem[]): SketchLegendItem[] => {
  const drawn = new Set((spec.callouts ?? []).map((c) => c.n));
  return legend.filter((l) => drawn.has(l.n));
};
