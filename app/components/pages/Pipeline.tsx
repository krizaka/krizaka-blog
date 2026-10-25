import { getDictionary, type Locale } from "@/lib/i18n";
import { pipelineLayout, type PipelineBox } from "@/lib/pipeline";

/* <Pipeline label="…"><Stage title="…" note="…" tone="gate">the long version</Stage>…</Pipeline> in a chapter: a pipeline
   drawn as an inline SVG from the tokens (no image, no library, both themes), then its text version, an ordered list of
   every stage with its long version. Two drawings of the same stages: three columns snaking on a wide screen, one column on
   a phone (CSS picks one); both are decoration (aria-hidden), the list is what a screen reader reads. Props are strings. */
export type PipelineStage = { title: string; note?: string; tone?: string; text?: string };

const TONES = new Set(["gate", "ship"]);

function Drawing({ stages, cols, width, className }: Readonly<{ stages: PipelineStage[]; cols: number; width: number; className: string }>) {
  const { boxes, arrows, viewWidth, viewHeight } = pipelineLayout(stages.length, { cols, width });
  return (
    <svg className={className} viewBox={`0 0 ${viewWidth} ${viewHeight}`} width={viewWidth} aria-hidden="true" focusable="false">
      {arrows.map((a) => (
        <g key={`a${a.from}`} className="bl-pipeline-arrow">
          <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} />
          <polygon points={a.head} />
        </g>
      ))}
      {boxes.map((b: PipelineBox, i) => {
        const s = stages[i];
        const tone = s.tone && TONES.has(s.tone) ? s.tone : undefined;
        return (
          <g key={`b${i}`} className="bl-pipeline-box" data-tone={tone}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="10" />
            <text className="bl-pipeline-n" x={b.x + 12} y={b.y + 22}>
              {String(i + 1).padStart(2, "0")}
            </text>
            <text className="bl-pipeline-title" x={b.x + 38} y={b.y + 22}>
              {s.title}
            </text>
            {s.note && (
              <text className="bl-pipeline-note" x={b.x + 12} y={b.y + 46}>
                {s.note}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function Pipeline({ label, stages, locale }: Readonly<{ label: string; stages: PipelineStage[]; locale: Locale }>) {
  const t = getDictionary(locale).pipeline;
  return (
    <figure className="bl-pipeline" data-reveal="soft">
      <figcaption>{label}</figcaption>
      <Drawing className="bl-pipeline-wide" stages={stages} cols={3} width={196} />
      <Drawing className="bl-pipeline-narrow" stages={stages} cols={1} width={300} />
      <ol className="bl-pipeline-text" aria-label={t.textVersion}>
        {stages.map((s, i) => (
          <li key={`s${i}`}>
            <strong>{s.title}</strong>
            {s.note ? ` (${s.note})` : ""}
            {s.text ? <span>{s.text}</span> : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}
