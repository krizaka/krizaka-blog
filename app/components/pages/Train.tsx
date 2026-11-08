"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "@/lib/locale";
import type { Beat, Frame, Lane, Reason } from "@/lib/train-sim";

/* The chapter's merge train, played from a pure simulation (lib/train-sim.ts): pull requests enter the queue, a check turns
   green or red, a red one is set aside on the siding with its reason, the head merges and the line advances. Every car is in
   the drawing from the start, off to the left until it enters, so each beat is only a CSS move between two still frames — no
   library. It plays by itself, with controls to pause, step and restart. Under `prefers-reduced-motion` it does not move or
   play: it shows the final frame and the beats are the ordered text list, which is also what a screen reader reads. */

type Labels = {
  caption: string;
  gate: string;
  legend: Record<"queue" | "merged" | "siding" | "green" | "red" | "running", string>;
  beats: Record<Beat, string>;
  reasons: Record<Reason, string>;
  controls: Record<"play" | "pause" | "prev" | "next" | "restart" | "progress", string>;
  textTitle: string;
};

const VIEW = { w: 680, h: 250 };
const CAR = { w: 74, h: 34, gap: 12 };
const GATE_X = 322;
const TRACK_Y = 104;

/** The top-left of a car at (lane, index): the queue runs left of the gate head-first, the merged line climbs to the right,
    the siding sits below the gate. A car not yet entered waits off the left edge. */
function slot(lane: Lane | "staged", index: number): { x: number; y: number } {
  const step = CAR.w + CAR.gap;
  if (lane === "queue") return { x: GATE_X - 26 - CAR.w - index * step, y: TRACK_Y };
  if (lane === "merged") return { x: GATE_X + 44 + index * step, y: TRACK_Y - 60 };
  if (lane === "siding") return { x: GATE_X - 150 + index * step, y: TRACK_Y + 74 };
  return { x: -CAR.w - 24, y: TRACK_Y };
}

const beatText = (l: Labels, f: Frame): string =>
  format(l.beats[f.beat], { pr: f.carLabel ?? "", reason: f.reason ? l.reasons[f.reason] : "" });

export function Train({ frames, labels, label }: Readonly<{ frames: Frame[]; labels: Labels; label?: string }>) {
  const calm = useReducedMotion();
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);

  // The reader who asked for no motion starts on the last frame (the finished yard) and never autoplays.
  useEffect(() => {
    if (calm) {
      setPlaying(false);
      setAt(frames.length - 1);
    } else {
      setPlaying(true);
    }
  }, [calm, frames.length]);

  useEffect(() => {
    if (!playing) return;
    if (at >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setAt((n) => Math.min(n + 1, frames.length - 1)), 1700);
    return () => clearTimeout(id);
  }, [playing, at, frames.length]);

  const frame = frames[at];
  // Every car that ever appears, in order of first entry, so each keeps its place in the DOM across beats.
  const cars = useMemo(() => {
    const seen = new Map<string, string>();
    for (const f of frames) for (const c of f.cars) if (!seen.has(c.id)) seen.set(c.id, c.label);
    return [...seen].map(([id, carLabel]) => ({ id, label: carLabel }));
  }, [frames]);
  const placed = new Map(frame.cars.map((c) => [c.id, c]));

  const go = (n: number) => {
    setPlaying(false);
    setAt(Math.max(0, Math.min(n, frames.length - 1)));
  };

  return (
    <figure className="bl-train" data-reveal="soft">
      <div className="bl-plate-paper">
        <svg
          className="bl-train-svg"
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          width={VIEW.w}
          aria-hidden="true"
          focusable="false"
        >
          {/* the queue line, the climb of the merged line, the siding branch */}
          <line className="bl-train-track" x1={10} y1={TRACK_Y + CAR.h / 2} x2={GATE_X} y2={TRACK_Y + CAR.h / 2} />
          <line
            className="bl-train-track bl-train-track-merged"
            x1={GATE_X}
            y1={TRACK_Y + CAR.h / 2}
            x2={VIEW.w - 10}
            y2={TRACK_Y - 60 + CAR.h / 2}
          />
          <path
            className="bl-train-track bl-train-track-siding"
            d={`M ${GATE_X} ${TRACK_Y + CAR.h / 2} L ${GATE_X - 70} ${TRACK_Y + 74 + CAR.h / 2} L ${GATE_X - 150} ${TRACK_Y + 74 + CAR.h / 2}`}
            fill="none"
          />
          <line className="bl-train-gate" x1={GATE_X} y1={TRACK_Y - 66} x2={GATE_X} y2={TRACK_Y + CAR.h + 20} />
          <text className="bl-train-gate-label" x={GATE_X + 6} y={TRACK_Y - 54}>
            {labels.gate}
          </text>

          {cars.map((car) => {
            const p = placed.get(car.id);
            const pos = slot(p?.lane ?? "staged", p?.index ?? 0);
            return (
              <g
                key={car.id}
                className="bl-train-car"
                data-lane={p?.lane ?? "staged"}
                data-check={p?.check ?? "none"}
                transform={`translate(${pos.x} ${pos.y})`}
              >
                <rect x={0} y={0} width={CAR.w} height={CAR.h} rx={2} />
                <circle className="bl-train-check" cx={CAR.w - 11} cy={11} r={5} />
                <text className="bl-train-car-label" x={CAR.w / 2} y={CAR.h / 2 + 4} textAnchor="middle">
                  {car.label}
                </text>
                {p?.lane === "siding" && p.reason ? (
                  <text className="bl-train-reason" x={0} y={CAR.h + 16}>
                    {labels.reasons[p.reason]}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {/* a visual echo of the current beat; the ordered list below is what a screen reader reads */}
        <p className="bl-train-beat" aria-hidden="true">
          {beatText(labels, frame)}
        </p>

        <div className="bl-train-controls">
          <button type="button" className="bl-train-btn" onClick={() => go(0)} aria-label={labels.controls.restart}>
            ⟲
          </button>
          <button
            type="button"
            className="bl-train-btn"
            onClick={() => go(at - 1)}
            disabled={at === 0}
            aria-label={labels.controls.prev}
          >
            ‹
          </button>
          <button
            type="button"
            className="bl-train-btn bl-train-play"
            onClick={() => (at >= frames.length - 1 ? go(0) : setPlaying((p) => !p))}
            aria-label={playing ? labels.controls.pause : labels.controls.play}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <button
            type="button"
            className="bl-train-btn"
            onClick={() => go(at + 1)}
            disabled={at >= frames.length - 1}
            aria-label={labels.controls.next}
          >
            ›
          </button>
          <span className="bl-train-progress">
            {format(labels.controls.progress, { k: String(at + 1), n: String(frames.length) })}
          </span>
        </div>

        <ul className="bl-train-legend" aria-hidden="true">
          <li data-check="green">{labels.legend.green}</li>
          <li data-check="red">{labels.legend.red}</li>
          <li data-lane="siding">{labels.legend.siding}</li>
          <li data-lane="merged">{labels.legend.merged}</li>
        </ul>

        <ol className="bl-train-text" aria-label={labels.textTitle}>
          {frames.slice(1).map((f) => (
            <li key={f.step}>{beatText(labels, f)}</li>
          ))}
        </ol>
      </div>
      <figcaption>{label ?? labels.caption}</figcaption>
    </figure>
  );
}

/** Whether the reader asked the system for no motion; recomputed if they change it. */
function useReducedMotion(): boolean {
  const [calm, setCalm] = useState(false);
  const mql = useRef<MediaQueryList | null>(null);
  useEffect(() => {
    mql.current = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setCalm(mql.current?.matches ?? false);
    on();
    mql.current.addEventListener("change", on);
    return () => mql.current?.removeEventListener("change", on);
  }, []);
  return calm;
}
