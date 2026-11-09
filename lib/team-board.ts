/* The simulated « équipe » board behind app/components/pages/TeamBoard.tsx: one row per named team session, each with the
   ticket it works on and whether its claim is proven yet. Everything is SIMULATED: the teams are the lanes the chapter
   describes, the tickets are fictional (« PR 1 »), and « proven » only means a fact (a merged pull request) backs the claim.
   The point the board makes is the one the cockpit makes: a claim with no fact behind it shows « non prouvé ». Pure data and
   a small check, tested in tests/team-board.test.mjs. */

/** The team sessions, one per lane; their names and work are resolved to words by the component (messages board.teams.*). */
export const TEAMS = ["sovkora", "site", "security", "marketing", "tooling", "blog"] as const;
export type Team = (typeof TEAMS)[number];

/** One row: the team, the fictional ticket it carries, and whether a fact already backs it. */
export type Row = { team: Team; ticket: string; proven: boolean };

/** The board as it stands: some claims already proven by a merged pull request, some still « non prouvé ». The blog row is
    this very chapter — unproven until it lands, which is the fact the reader makes appear. */
export const BOARD: readonly Row[] = [
  { team: "sovkora", ticket: "PR 4", proven: true },
  { team: "site", ticket: "PR 7", proven: true },
  { team: "security", ticket: "PR 2", proven: false },
  { team: "marketing", ticket: "PR 5", proven: true },
  { team: "tooling", ticket: "PR 3", proven: false },
  { team: "blog", ticket: "PR 1", proven: false },
];

/** What a sound board holds: a row for every team, no team twice, and at least one claim still unproven (so a fact can lift
    a badge). Empty when the board is sound; the build fails otherwise. */
export function boardProblems(board: readonly Row[] = BOARD): string[] {
  const out: string[] = [];
  const teams = board.map((r) => r.team);
  for (const team of TEAMS) if (!teams.includes(team)) out.push(`the board has no row for the "${team}" team`);
  if (new Set(teams).size !== teams.length) out.push("a team appears twice on the board");
  if (!board.some((r) => !r.proven)) out.push("every claim is already proven — nothing for a fact to lift");
  return [...new Set(out)];
}
