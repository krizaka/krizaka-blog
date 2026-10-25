#!/usr/bin/env node
/* The issue curve of chapter 10 (« La courbe qui monte »): every day since FROM, how many public issues of the krizaka
   organisation were opened, closed as completed and closed as not planned, counted by GitHub's search (UTC days). It writes
   lib/issue-curve.json with the time of the extraction; the chapter draws it (app/components/pages/IssueCurve.tsx) and
   gives a few of its dates as a table. Run with a GitHub login that can search the organisation:

     node scripts/gen-issue-curve.mjs [--to YYYY-MM-DD]

   The counts are GitHub's, never typed: re-running it rewrites the file. The pure parts are tested in tests/issue-curve.test.mjs. */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cumulate, daysBetween, queriesFor } from "../lib/issue-curve.ts";

export const ORG = "krizaka";
export const FROM = "2026-09-25";
const BATCH = 8; // days per GraphQL request: 4 searches a day, 32 aliases

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argTo = process.argv.indexOf("--to");
const extractedAt = new Date();
const to = argTo > 0 ? process.argv[argTo + 1] : extractedAt.toISOString().slice(0, 10);

const search = (aliases) => {
  const query = `{ ${aliases.map(([alias, q]) => `${alias}: search(type: ISSUE, query: ${JSON.stringify(q)}, first: 0) { issueCount }`).join(" ")} }`;
  const out = execFileSync("gh", ["api", "graphql", "-f", `query=${query}`], { encoding: "utf8" });
  const data = JSON.parse(out).data;
  return Object.fromEntries(aliases.map(([alias]) => [alias, data[alias].issueCount]));
};

const days = daysBetween(FROM, to);
const daily = [];
for (let i = 0; i < days.length; i += BATCH) {
  const slice = days.slice(i, i + BATCH);
  const aliases = slice.flatMap((day, j) => Object.entries(queriesFor(ORG, day)).map(([kind, q]) => [`d${j}_${kind}`, q]));
  const counts = search(aliases);
  slice.forEach((date, j) => daily.push({ date, created: counts[`d${j}_created`], completed: counts[`d${j}_completed`], notPlanned: counts[`d${j}_notPlanned`], closed: counts[`d${j}_closed`] }));
}
/* The check: what the search says today, against what the days add up to. */
const scope = `org:${ORG} is:issue is:public`;
const now = search([
  ["before", `${scope} created:<${FROM}`],
  ["open", `${scope} is:open`],
  ["all", `${scope}`],
  ["openPullRequests", `org:${ORG} is:pr is:public is:open`],
]);
const rows = cumulate(daily);
const last = rows.at(-1);
if (now.before !== 0) throw new Error(`${now.before} issues were opened before ${FROM}: move FROM back`);
if (to === extractedAt.toISOString().slice(0, 10) && (last.created !== now.all || last.open !== now.open))
  console.warn(`the days add up to ${last.created} opened / ${last.open} open; the search says ${now.all} / ${now.open} (issues reopened, or opened during the run)`);

const file = {
  extractedAt: extractedAt.toISOString(),
  source: `GitHub search, public issues of github.com/${ORG}, per UTC day: created:<day>; is:closed reason:completed closed:<day>; is:closed reason:"not planned" closed:<day>; is:closed closed:<day>`,
  from: FROM,
  to,
  now,
  daily,
};
/* One day per line: the file reads as a table in a diff. */
const json = JSON.stringify({ ...file, daily: [] }, null, 2).replace('"daily": []', `"daily": [\n${daily.map((d) => `    ${JSON.stringify(d)}`).join(",\n")}\n  ]`);
writeFileSync(join(root, "lib/issue-curve.json"), json + "\n");
console.log(`lib/issue-curve.json: ${daily.length} days, ${last.created} opened, ${last.completed} completed, ${last.notPlanned} not planned, ${last.open} open (${file.extractedAt})`);
