"use client";
import { useState } from "react";
import { INITIAL_STATE, LEVELS, type Level, nodesAt, pathLabel, zoomIn, zoomOut } from "@/lib/c4-zoom";

/* The C4 architecture diagram interactive figure: zoom from C1 (Context) to C4 (Code) on a fictional system by clicking
   a node. The state is a path of selected parent node ids. Under `prefers-reduced-motion` the C1 view is shown and no
   transition plays; the full text list is always present for screen readers. All data is FICTIONAL (lib/c4-zoom.ts). */

type Labels = {
  caption: string;
  levels: Record<Level, string>;
  back: string;
  zoomIn: string;
  note: string;
};

export function C4Zoom({ labels, label }: Readonly<{ labels: Labels; label?: string }>) {
  const [state, setState] = useState(INITIAL_STATE);
  const nodes = nodesAt(state);
  const levelIdx = LEVELS.indexOf(state.level);
  const canBack = levelIdx > 0;

  const breadcrumb = state.path.map((_, i) => pathLabel({ level: LEVELS[i + 1], path: state.path }, i)).filter(Boolean);

  return (
    <figure className="bl-c4zoom" data-reveal="soft">
      <div className="bl-plate-paper">
        {/* Level indicator */}
        <div className="bl-c4zoom-levels" aria-label={labels.caption}>
          {LEVELS.map((l, i) => (
            <span
              key={l}
              className="bl-c4zoom-level"
              aria-current={l === state.level ? "step" : undefined}
              data-active={l === state.level}
              data-past={i < levelIdx}
            >
              {l.toUpperCase()} · {labels.levels[l]}
            </span>
          ))}
        </div>

        {/* Breadcrumb path */}
        {breadcrumb.length > 0 && (
          <p className="bl-c4zoom-path" aria-label="Chemin de navigation">
            {breadcrumb.join(" › ")}
          </p>
        )}

        {/* Nodes */}
        <div className="bl-c4zoom-grid" role="list">
          {nodes.map((node) => (
            <div key={node.id} className="bl-c4zoom-node" role="listitem">
              <div className="bl-c4zoom-node-label">{node.label}</div>
              {node.tech && <div className="bl-c4zoom-node-tech">{node.tech}</div>}
              {node.zoomable && (
                <button
                  type="button"
                  className="bl-c4zoom-btn"
                  onClick={() => setState((s) => zoomIn(s, node.id))}
                  aria-label={`${labels.zoomIn} — ${node.label}`}
                >
                  {labels.zoomIn} ›
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Back button */}
        {canBack && (
          <button type="button" className="bl-c4zoom-back" onClick={() => setState((s) => zoomOut(s))}>
            ‹ {labels.back}
          </button>
        )}

        {/* Note about our real diagram */}
        <p className="bl-c4zoom-note">{labels.note}</p>

        {/* Text version for screen readers: all levels listed */}
        <details className="bl-c4zoom-text">
          <summary className="bl-sr-only">{labels.caption}</summary>
          <ul>
            {nodes.map((node) => (
              <li key={node.id}>
                {node.label}
                {node.tech ? ` (${node.tech})` : ""}
              </li>
            ))}
          </ul>
        </details>
      </div>
      <figcaption>{label ?? labels.caption}</figcaption>
    </figure>
  );
}
