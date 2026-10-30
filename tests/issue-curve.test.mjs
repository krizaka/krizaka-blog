import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cumulate, daysBetween, queriesFor, rowsAt } from "../lib/issue-curve.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const file = JSON.parse(read("lib/issue-curve.json"));

test("the searches of a day: public issues of the organisation, opened, completed, not planned, closed", () => {
  const q = queriesFor("krizaka", "2026-10-20");
  assert.equal(q.created, "org:krizaka is:issue is:public created:2026-10-20");
  assert.equal(q.completed, "org:krizaka is:issue is:public is:closed reason:completed closed:2026-10-20");
  assert.equal(q.notPlanned, 'org:krizaka is:issue is:public is:closed reason:"not planned" closed:2026-10-20');
  assert.equal(q.closed, "org:krizaka is:issue is:public is:closed closed:2026-10-20");
});

test("the days of a period: both ends included, across a month", () => {
  assert.deepEqual(daysBetween("2026-09-29", "2026-10-02"), ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  assert.deepEqual(daysBetween("2026-10-25", "2026-10-25"), ["2026-10-25"]);
  assert.deepEqual(daysBetween("2026-10-26", "2026-10-25"), []);
});

test("the running totals: open is opened minus closed for any reason (a duplicate closes too)", () => {
  const rows = cumulate([
    { date: "a", created: 10, completed: 2, notPlanned: 1, closed: 4 },
    { date: "b", created: 5, completed: 3, notPlanned: 0, closed: 3 },
  ]);
  assert.deepEqual(rows, [
    { date: "a", created: 10, completed: 2, notPlanned: 1, open: 6 },
    { date: "b", created: 15, completed: 5, notPlanned: 1, open: 8 },
  ]);
  assert.deepEqual(
    rowsAt(rows, ["b", "missing", "a"]).map((r) => r.date),
    ["b", "a"],
  );
});

test("the stored curve is whole: every day from its start to its end, once, with its extraction time and GitHub's own totals", () => {
  assert.match(file.extractedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
  assert.deepEqual(
    file.daily.map((d) => d.date),
    daysBetween(file.from, file.to),
  );
  assert.equal(file.now.before, 0, "no issue before the start");
  const last = cumulate(file.daily).at(-1);
  assert.equal(last.created, file.now.all, "the days add up to the search's total");
  assert.equal(last.open, file.now.open, "the days add up to the search's open count");
  for (const d of file.daily)
    assert.ok(d.completed + d.notPlanned <= d.closed, `${d.date}: completed and not planned are part of closed`);
});

test("chapter 10 gives the curve's own figures, in both languages", () => {
  const rows = cumulate(file.daily);
  const at = (d) => rows.find((r) => r.date === d);
  const last = rows.at(-1);
  const day = (d) => file.daily.find((x) => x.date === d);
  const want = [
    last.created,
    last.completed,
    last.notPlanned,
    last.open,
    file.now.openPullRequests,
    at("2026-10-09").open,
    day("2026-10-17").created,
    day("2026-10-22").created,
    day("2026-10-23").created,
    day("2026-10-20").notPlanned,
    at("2026-10-19").open,
    at("2026-10-20").open,
    at("2026-10-22").open,
  ];
  const digits = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u0001");
  for (const locale of ["fr", "en"]) {
    const body = read(`content/chapters/a-curve-that-climbs.${locale}.mdx`);
    for (const n of want) {
      const re = new RegExp(`(?<![\\d,\u00a0\u202f])${digits(n).replace("\u0001", "[,\u00a0\u202f ]")}(?![\\d])`);
      assert.match(body, re, `${locale}: ${n} is in the text`);
    }
    assert.match(body, /<IssueCurve dates="[\d,-]+" \/>/, `${locale}: the curve is drawn, with its table`);
  }
});
