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

/* An annotated capture (<Annotated>, founder 2026-10-31: « the reader must see WHAT is tested »): pen marks drawn over a real screen
   of a product, each one a thing its test asserts, told again in the legend under the picture (the margin note).
     <Annotated id="…" marks="6.2,26.1,64.4,36.5,bracket: the finding is shown | 72.9,1.5,13.9,4: the one action"/>
   A mark is « x,y,w,h[,shape]: what the test asserts », in percent of the picture (0–100), numbered from 1 in the order written. The
   shape is the stroke a reader would make with a pen (CTO review 2026-10-31: the Cahier, not generic red boxes): `ring` (the default,
   a loop around a control), `under` (a line of text underlined), `bracket` (a block held in the margin), `frame` (the four corners
   of the whole screen). The marks are drawn into the picture itself by scripts/annotate-figures.mjs (so the books and the newsletter
   carry them too), and the picture records the marks it was drawn with (`marks` in lib/media.json, from marksKey):
   tests/figures.test.mjs fails when the legend and the picture drift apart. */
export const MARK_SHAPES = ["ring", "under", "bracket", "frame"] as const;
export type MarkShape = (typeof MARK_SHAPES)[number];
export type Mark = { n: number; x: number; y: number; w: number; h: number; shape: MarkShape; label: string };
/** `"x,y,w,h[,shape]: label | …"` → the numbered marks; a box outside the picture, an unknown shape, a missing label or more than 6
    marks is refused. */
export function marksOf(spec: string | undefined): Mark[] {
  const marks = itemsOf(spec).map((part, i) => {
    const at = part.indexOf(":");
    if (at <= 0) throw new Error(`an <Annotated> mark needs « x,y,w,h: label »: ${part}`);
    const head = part
      .slice(0, at)
      .split(",")
      .map((v) => v.trim());
    const named = head.length === 5 ? head.pop() : undefined;
    if (named !== undefined && !(MARK_SHAPES as readonly string[]).includes(named))
      throw new Error(`an <Annotated> mark's shape is one of ${MARK_SHAPES.join(", ")}: ${part}`);
    const shape = (named ?? "ring") as MarkShape;
    const box = head.map(Number);
    const label = part.slice(at + 1).trim();
    if (box.length !== 4 || box.some((v) => !Number.isFinite(v)))
      throw new Error(`an <Annotated> mark needs four numbers: ${part}`);
    const [x, y, w, h] = box;
    if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 100 || y + h > 100)
      throw new Error(`an <Annotated> box must lie inside the picture (percent): ${part}`);
    if (label.length < 12) throw new Error(`an <Annotated> mark says what the test asserts: ${part}`);
    return { n: i + 1, x, y, w, h, shape, label };
  });
  if (marks.length === 0 || marks.length > 6) throw new Error("an <Annotated> needs 1 to 6 marks");
  return marks;
}

/** The marks alone, in order (`x,y,w,h,shape;…`): what the picture was drawn with, the same in every language. */
export function marksKey(marks: readonly Mark[]): string {
  return marks.map((m) => [m.x, m.y, m.w, m.h, m.shape].join(",")).join(";");
}
