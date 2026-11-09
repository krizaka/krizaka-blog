"use client";
import { useState } from "react";
import type { Row, Team } from "@/lib/team-board";

/* The « équipe » board of the cockpit, rebuilt here from simulated data (lib/team-board.ts): one row per team session, the
   lane it runs, the ticket it carries and a « non prouvé » badge where no fact backs the claim yet. A button lands the
   waiting facts: the badges lift to « prouvé » and the ticket turns into a (fictional) merged pull request. The lift is a
   CSS move, still under `prefers-reduced-motion`. The table is read as a table; the badge says its state in words, not by
   colour alone. */

type Labels = {
  caption: string;
  columns: Record<"team" | "lane" | "ticket" | "claim", string>;
  teams: Record<Team, { name: string; lane: string }>;
  proven: string;
  unproven: string;
  reveal: string;
  revealed: string;
};

export function TeamBoard({ board, labels, label }: Readonly<{ board: Row[]; labels: Labels; label?: string }>) {
  const [shown, setShown] = useState(false);
  const rows = board.map((r) => ({ ...r, proven: r.proven || shown }));
  return (
    <figure className="bl-board" data-reveal="soft">
      <div className="bl-plate-paper">
        <div className="bl-board-head">
          <button
            type="button"
            className="bl-board-btn"
            onClick={() => setShown(true)}
            disabled={shown}
            aria-pressed={shown}
          >
            {shown ? labels.revealed : labels.reveal}
          </button>
        </div>
        <table className="bl-board-table">
          <caption className="bl-sr-only">{label ?? labels.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{labels.columns.team}</th>
              <th scope="col">{labels.columns.lane}</th>
              <th scope="col">{labels.columns.ticket}</th>
              <th scope="col">{labels.columns.claim}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.team} data-proven={r.proven}>
                <th scope="row">{labels.teams[r.team].name}</th>
                <td>{labels.teams[r.team].lane}</td>
                <td className="bl-board-ticket">{r.ticket}</td>
                <td>
                  <span className="bl-board-badge" data-proven={r.proven}>
                    {r.proven ? labels.proven : labels.unproven}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>{label ?? labels.caption}</figcaption>
    </figure>
  );
}
