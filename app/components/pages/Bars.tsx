import { BarChart } from "@krizaka/charts/bar";
import { getDictionary, type Locale } from "@/lib/i18n";
import { rowsOf, seriesOf } from "@/lib/figures";

/* <Bars label="…" source="…" format="integer|percent|number" stacked="true" series="Green:success | Red:danger"
   data="First run=155,150; Tonight=198,112"/> in a chapter: a small chart of numbers the text already gives (a run, a
   measure, an API read), drawn by @krizaka/charts' BarChart (horizontal, values at the tips, both themes), framed on a plate
   with its caption. The chart carries its own data table for screen readers. `percent` values are written as in the text
   (78.9 → 78.9 %). Props are strings. */
const FORMATS = new Set(["integer", "number", "percent", "compact"]);

export function Bars({
  label,
  source,
  format,
  stacked,
  series,
  data,
  locale,
}: Readonly<{
  label: string;
  source?: string;
  format?: string;
  stacked?: string;
  series: string;
  data: string;
  locale: Locale;
}>) {
  const t = getDictionary(locale);
  const { line: _line, category: _category, value: _value, ...words } = t.curve.labels;
  const labels = {
    ...words,
    kinds: { bar: t.bars.bar },
    category: t.bars.category,
    value: t.bars.value,
    total: t.bars.total,
  };
  const spec = seriesOf(series);
  const percent = format === "percent";
  const rows = rowsOf(data, spec).map((r) =>
    percent ? Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "number" ? v / 100 : v])) : r,
  );
  const fmt = FORMATS.has(format ?? "") ? (format as "integer" | "number" | "percent" | "compact") : "number";
  return (
    <figure className="bl-plate bl-bars" data-reveal="soft">
      <div className="bl-plate-paper">
        <BarChart
          title={label}
          hideTitle
          description={source}
          data={rows}
          x="label"
          xFormat="text"
          series={spec}
          horizontal
          stacked={stacked === "true"}
          format={fmt}
          zero
          height={Math.max(120, rows.length * (spec.length > 1 && stacked !== "true" ? 64 : 44) + 48)}
          legend={spec.length > 1}
          filterable={false}
          exportable={false}
          locale={locale === "en" ? "en-CA" : "fr-CA"}
          labels={labels}
        />
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
