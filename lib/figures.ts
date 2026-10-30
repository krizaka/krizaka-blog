/* The string props of a chapter's code-drawn figures (app/components/pages/Split.tsx, Layers.tsx, Bars.tsx), parsed once.
   MDX props are strings (the renderer drops JavaScript expressions), so a figure's data is written in a small, readable form:

     <Side items="first point | second point"/>                       → ["first point", "second point"]
     <Bars series="Green cells:success | Red cells:danger"
           data="First run=155,150; Tonight=198,112"/>                → two series, two rows

   Pure functions, tested in tests/figures.test.mjs: a malformed figure fails the build instead of drawing a wrong number. */

export const SIDE_TONES = ["before", "after", "own", "plug", "refuse", "plain"] as const;
export type SideTone = (typeof SIDE_TONES)[number];

export const BAR_TONES = ["neutral", "accent", "success", "warning", "danger", "info"] as const;
export type BarTone = (typeof BAR_TONES)[number];

export type BarSeries = { key: string; label: string; color: BarTone };
export type BarRow = { label: string } & Record<string, number | string>;

/** The items of a side or a layer: split on `|`, trimmed, never empty. */
export function itemsOf(items: string | undefined): string[] {
  return (items ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** A side's tone, `plain` when none or unknown is given. */
export function sideTone(tone: string | undefined): SideTone {
  return (SIDE_TONES as readonly string[]).includes(tone ?? "") ? (tone as SideTone) : "plain";
}

/** `"Label:tone | Label:tone"` → the series of a bar chart (keys `s0`, `s1`…); the tone defaults to the accent. */
export function seriesOf(spec: string): BarSeries[] {
  const out = itemsOf(spec).map((part, i) => {
    const at = part.lastIndexOf(":");
    const tone = at > 0 ? part.slice(at + 1).trim() : "";
    const known = (BAR_TONES as readonly string[]).includes(tone);
    const label = known ? part.slice(0, at).trim() : part;
    return { key: `s${i}`, label, color: (known ? tone : "accent") as BarTone };
  });
  if (out.length === 0) throw new Error("a <Bars> needs at least one series");
  return out;
}

/** `"Category=1,2; Other=3,4"` → one row per category, one value per series, in the series' order. */
export function rowsOf(data: string, series: readonly BarSeries[]): BarRow[] {
  const rows = data
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const at = part.lastIndexOf("=");
      if (at <= 0) throw new Error(`a <Bars> row needs « label=value »: ${part}`);
      const label = part.slice(0, at).trim();
      const values = part
        .slice(at + 1)
        .split(",")
        .map((v) => Number(v.trim()));
      if (values.length !== series.length || values.some((v) => !Number.isFinite(v)))
        throw new Error(`a <Bars> row needs ${series.length} number(s): ${part}`);
      const row: BarRow = { label };
      series.forEach((s, i) => {
        row[s.key] = values[i];
      });
      return row;
    });
  if (rows.length === 0) throw new Error("a <Bars> needs at least one row");
  return rows;
}
