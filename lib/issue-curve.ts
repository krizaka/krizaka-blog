/* The issue curve of chapter 10: the pure part of scripts/gen-issue-curve.mjs (the searches of a day, the days of a period) and of
   the chart (the running totals). The counts themselves are lib/issue-curve.json, written by the script; tests/issue-curve.test.mjs. */

export type IssueDay = { date: string; created: number; completed: number; notPlanned: number; closed: number };
export type IssueCurveRow = { date: string; created: number; completed: number; notPlanned: number; open: number };
export type IssueCurveFile = {
  extractedAt: string;
  source: string;
  from: string;
  to: string;
  now: { before: number; open: number; all: number; openPullRequests: number };
  daily: IssueDay[];
};

/** The four searches of one UTC day: opened that day, closed as completed, closed as not planned, closed for any reason. */
export function queriesFor(
  org: string,
  day: string,
): Record<"created" | "completed" | "notPlanned" | "closed", string> {
  const scope = `org:${org} is:issue is:public`;
  return {
    created: `${scope} created:${day}`,
    completed: `${scope} is:closed reason:completed closed:${day}`,
    notPlanned: `${scope} is:closed reason:"not planned" closed:${day}`,
    closed: `${scope} is:closed closed:${day}`,
  };
}

/** Every day from `from` to `to`, both included (YYYY-MM-DD, UTC). */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 86_400_000)
    out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** The running totals, day by day: opened, completed, not planned, and still open (opened minus closed for any reason). */
export function cumulate(daily: readonly IssueDay[]): IssueCurveRow[] {
  let created = 0;
  let completed = 0;
  let notPlanned = 0;
  let closed = 0;
  return daily.map((d) => {
    created += d.created;
    completed += d.completed;
    notPlanned += d.notPlanned;
    closed += d.closed;
    return { date: d.date, created, completed, notPlanned, open: created - closed };
  });
}

/** The rows of the text version: the given dates, in order (a date the series lacks is left out). */
export function rowsAt(rows: readonly IssueCurveRow[], dates: readonly string[]): IssueCurveRow[] {
  return dates.map((d) => rows.find((r) => r.date === d)).filter((r): r is IssueCurveRow => r !== undefined);
}
