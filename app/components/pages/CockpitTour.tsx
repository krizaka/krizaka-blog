"use client";
import { useState } from "react";
import { type GroupId, GROUPS, MOCK_DATA, type ScreenId } from "@/lib/cockpit-tour";

/* The cockpit's screens, grouped and clickable: select a screen to see a small simulated snapshot of what it answers,
   with one line on its purpose. All data is SIMULATED — no real values, no real connection. Pure CSS moves between
   states; under `prefers-reduced-motion` the first screen in the first group is shown and no transition plays. The
   table is read as a table; the selected screen is communicated to screen readers via aria-pressed. */

type ScreenMessages = { name: string; hint: string };
type Labels = {
  caption: string;
  groups: Record<GroupId, string>;
  screens: Record<ScreenId, ScreenMessages>;
  mockLabel: string;
  mockValueLabel: string;
};

export function CockpitTour({ labels, label }: Readonly<{ labels: Labels; label?: string }>) {
  const [activeGroup, setActiveGroup] = useState<GroupId>("pilotage");
  const [activeScreen, setActiveScreen] = useState<ScreenId>("today");

  const group = GROUPS.find((g) => g.id === activeGroup)!;
  const mock = MOCK_DATA[activeScreen];
  const screenMsg = labels.screens[activeScreen];

  return (
    <figure className="bl-cockpit-tour" data-reveal="soft">
      <div className="bl-plate-paper">
        {/* Group tabs */}
        <div className="bl-ctour-groups" role="tablist" aria-label={labels.caption}>
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={g.id === activeGroup}
              className="bl-ctour-group-tab"
              onClick={() => {
                setActiveGroup(g.id);
                setActiveScreen(g.screens[0].id);
              }}
            >
              {labels.groups[g.id]}
            </button>
          ))}
        </div>

        {/* Screen pills for the active group */}
        <div className="bl-ctour-screens" role="tabpanel">
          {group.screens.map((s) => (
            <button
              key={s.id}
              type="button"
              className="bl-ctour-screen-btn"
              aria-pressed={s.id === activeScreen}
              onClick={() => setActiveScreen(s.id)}
            >
              {labels.screens[s.id].name}
            </button>
          ))}
        </div>

        {/* Mock view + hint */}
        <div className="bl-ctour-mock">
          <p className="bl-ctour-hint">{screenMsg.hint}</p>
          <table className="bl-ctour-table">
            <caption className="bl-sr-only">{labels.screens[activeScreen].name}</caption>
            <thead>
              <tr>
                <th scope="col">{labels.mockLabel}</th>
                <th scope="col">{labels.mockValueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {mock.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className="bl-ctour-val">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <figcaption>{label ?? labels.caption}</figcaption>
    </figure>
  );
}
