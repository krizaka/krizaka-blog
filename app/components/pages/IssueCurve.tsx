import { LineChart } from "@krizaka/charts/line";
import { format, getDictionary, type Locale } from "@/lib/i18n";
import { cumulate, rowsAt, type IssueCurveFile } from "@/lib/issue-curve";
import data from "@/lib/issue-curve.json";

/* <IssueCurve dates="2026-10-09,2026-10-17,…"/> in a chapter: the running totals of the krizaka organisation's public issues
   (lib/issue-curve.json, written by scripts/gen-issue-curve.mjs — never typed), drawn with @krizaka/charts' LineChart, then its
   text version: a table of the given days. The extraction's date and time are said under the title, in Montréal time.
   Props are strings (the renderer drops JavaScript expressions in MDX). */
const file = data as IssueCurveFile;

export function IssueCurve({ dates, locale }: { dates?: string; locale: Locale }) {
  const t = getDictionary(locale).curve;
  const intl = locale === "en" ? "en-CA" : "fr-CA";
  const rows = cumulate(file.daily);
  const at = new Date(file.extractedAt);
  const zone = { timeZone: "America/Toronto" } as const;
  const description = format(t.description, {
    date: new Intl.DateTimeFormat(intl, { ...zone, dateStyle: "long" }).format(at),
    time: new Intl.DateTimeFormat(intl, { ...zone, timeStyle: "short" }).format(at),
  });
  const { line, ...labels } = t.labels;
  const picked = rowsAt(rows, (dates ?? "").split(",").map((d) => d.trim()).filter(Boolean));
  const num = new Intl.NumberFormat(intl);
  const day = new Intl.DateTimeFormat(intl, { timeZone: "UTC", day: "numeric", month: "short" });
  return (
    <div className="bl-curve">
      <LineChart
        title={t.title}
        description={description}
        data={rows}
        x="date"
        xFormat="day"
        xLabel={t.day}
        series={[
          { key: "created", label: t.opened, color: "neutral", dashed: true },
          { key: "open", label: t.open, color: "accent" },
          { key: "completed", label: t.completed, color: "success" },
          { key: "notPlanned", label: t.notPlanned, color: "warning" },
        ]}
        format="integer"
        zero
        endLabels={false}
        locale={intl}
        labels={{ ...labels, kinds: { line } }}
      />
      {picked.length > 0 && (
        <div className="bl-table" tabIndex={0} role="region" aria-label={t.tableCaption}>
          <table>
            <caption>{t.tableCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.day}</th>
                <th scope="col">{t.opened}</th>
                <th scope="col">{t.open}</th>
                <th scope="col">{t.completed}</th>
                <th scope="col">{t.notPlanned}</th>
              </tr>
            </thead>
            <tbody>
              {picked.map((r) => (
                <tr key={r.date}>
                  <th scope="row">{day.format(new Date(`${r.date}T12:00:00Z`))}</th>
                  <td>{num.format(r.created)}</td>
                  <td>{num.format(r.open)}</td>
                  <td>{num.format(r.completed)}</td>
                  <td>{num.format(r.notPlanned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
