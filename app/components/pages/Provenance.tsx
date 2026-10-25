import { format, getDictionary, type Locale } from "@/lib/i18n";
import type { Made } from "@/lib/media";

/* « How this was made »: what the run recorded about a result — model, prompt, seed, machine, time, cost, Orazaka run id.
   Only recorded fields are shown; an absent one says so instead of being filled in. */
export function Provenance({ made, locale }: { made: Made; locale: Locale }) {
  const t = getDictionary(locale).media;
  const none = t.notRecorded;
  const rows: [string, React.ReactNode][] = [
    [t.model, made.licence ? `${made.model} · ${made.licence}` : made.model],
    [t.engine, made.engine ?? none],
    [t.machine, made.machine ?? t.hostedMachine],
  ];
  if (made.via) rows.push([t.via, made.via]);
  if (made.studio) rows.push([t.studio, <code key="s">{made.studio}</code>]);
  if (made.prompt) rows.push([t.prompt, <q key="p" className="bl-prompt">{made.prompt}</q>]);
  if (made.negativePrompt) rows.push([t.negative, <q key="n" className="bl-prompt">{made.negativePrompt}</q>]);
  if (made.seed) rows.push([t.seed, <code key="d">{made.seed}</code>]);
  if (made.size) rows.push([t.size, made.durationSeconds ? `${made.size} · ${format(t.frames, { fps: String(made.fps), duration: String(made.durationSeconds) })}` : made.size]);
  /* « the run was interrupted » only for a run; a picture made outside Orazaka simply has no recorded time. */
  rows.push([t.time, made.seconds ? format(t.timeValue, { seconds: String(made.seconds) }) : made.runId ? t.timeInterrupted : none]);
  rows.push([t.cost, made.costUsd ? format(t.costValue, { amount: made.costUsd.toFixed(2) }) : made.costUsd === 0 ? t.costFree : none]);
  rows.push([t.run, made.runId ? <code key="r">{made.runId}</code> : none]);
  if (made.note) rows.push([t.note, made.note]);
  if (made.sound) rows.push([t.sound, made.sound]);
  return (
    <details className="bl-how">
      <summary>{t.how}</summary>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
