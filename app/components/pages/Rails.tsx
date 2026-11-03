import { getDictionary, type Locale } from "@/lib/i18n";
import { WAGON_STATES, railsLayout, railsProblems, type RailSpec, type WagonState } from "@/lib/rails";

/* <Rails label="…"><Rail name="Produit A" state="frozen" wagons="fix(main):fix | PR 1:wait"/><Beat>…</Beat></Rails> in a
   chapter: trains drawn as an inline SVG from the tokens (no image, no library, both themes). One rail per line of work, the
   wagons waiting left of the station, the arrived ones right of it, a red wagon on its siding. Two drawings of the same rails:
   a name column on a wide screen, the name above its rail on a phone (CSS picks one); both are decoration (aria-hidden). The
   legend names the states drawn, and the beats are the text version, an ordered list of what happens. Props are strings. */

const WIDE = { width: 640, narrow: false };
const NARROW = { width: 300, narrow: true };

function Drawing({
  rails,
  station,
  frozen,
  o,
  className,
}: Readonly<{ rails: RailSpec[]; station: string; frozen: string; o: typeof WIDE; className: string }>) {
  const layout = railsLayout(rails, station, o);
  const problems = railsProblems(layout, o);
  if (problems.length > 0) throw new Error(`a <Rails> does not fit: ${problems.join("; ")}`);
  return (
    <svg
      className={className}
      viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`}
      width={layout.viewWidth}
      aria-hidden="true"
      focusable="false"
    >
      {layout.rails.map((r) => (
        <g key={r.name} className="bl-rails-rail" data-state={r.state}>
          <text className="bl-rails-name" x={r.nameX} y={r.nameY}>
            {r.name}
            {o.narrow && r.state === "frozen" ? <tspan className="bl-rails-frozen">{`  ${frozen}`}</tspan> : null}
          </text>
          {!o.narrow && r.state === "frozen" ? (
            <text className="bl-rails-frozen" x={r.nameX} y={r.nameY + 16}>
              {frozen}
            </text>
          ) : null}
          <line className="bl-rails-track" x1={r.trackX1} y1={r.trackY} x2={r.trackX2} y2={r.trackY} />
          {r.siding ? (
            <g className="bl-rails-siding">
              <line x1={r.siding.x1} y1={r.siding.y} x2={r.siding.x2} y2={r.siding.y} />
              <line x1={r.siding.x2} y1={r.siding.y} x2={r.siding.joinX} y2={r.trackY} />
            </g>
          ) : null}
          <line className="bl-rails-post" x1={r.stationX} y1={r.stationLabelY + 4} x2={r.stationX} y2={r.trackY + 6} />
          <text className="bl-rails-station" x={r.stationX + 5} y={r.stationLabelY}>
            {r.station}
          </text>
          {r.wagons.map((w) => (
            <g key={`${w.label}-${w.x}`} className="bl-rails-wagon" data-state={w.state}>
              <rect x={w.x} y={w.y} width={w.w} height={w.h} />
              <circle cx={w.x + 9} cy={w.y + w.h + 1} r="2.5" />
              <circle cx={w.x + w.w - 9} cy={w.y + w.h + 1} r="2.5" />
              <text x={w.x + w.w / 2} y={w.y + 17} textAnchor="middle">
                {w.label}
              </text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

export function Rails({
  label,
  rails,
  beats,
  locale,
}: Readonly<{ label: string; rails: RailSpec[]; beats: string[]; locale: Locale }>) {
  const t = getDictionary(locale).rails;
  if (beats.length < 2) throw new Error(`a <Rails> tells what happens in at least two <Beat>: ${label}`);
  const drawn = layoutStates(rails, t.station);
  return (
    <figure className="bl-plate bl-rails" data-reveal="soft">
      <div className="bl-plate-paper">
        <Drawing className="bl-rails-wide" rails={rails} station={t.station} frozen={t.frozen} o={WIDE} />
        <Drawing className="bl-rails-narrow" rails={rails} station={t.station} frozen={t.frozen} o={NARROW} />
        <ul className="bl-rails-legend" aria-label={t.legend}>
          {drawn.map((s) => (
            <li key={s} data-state={s}>
              {t.states[s]}
            </li>
          ))}
        </ul>
        <ol className="bl-rails-text" aria-label={t.textVersion}>
          {beats.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ol>
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/** The states a figure draws, in the legend's order. */
function layoutStates(rails: RailSpec[], station: string): WagonState[] {
  const seen = new Set(railsLayout(rails, station, WIDE).rails.flatMap((r) => r.wagons.map((w) => w.state)));
  return WAGON_STATES.filter((s) => seen.has(s));
}
