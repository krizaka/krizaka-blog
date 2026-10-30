import { format, getDictionary, type Locale } from "@/lib/i18n";
import type { Made } from "@/lib/media";

/* « How this was made »: what the run recorded about a result — model, prompt, seed, machine, time, cost, Orazaka run id.
   Only recorded fields are shown; an absent one says so instead of being filled in. */
type Words = ReturnType<typeof getDictionary>["media"];

/** The time row: the run's own time; « the run was interrupted » only for a run; a picture made outside Orazaka has no recorded time. */
function timeOf(made: Made, t: Words): string {
  if (made.seconds) return format(t.timeValue, { seconds: String(made.seconds) });
  return made.runId ? t.timeInterrupted : t.notRecorded;
}

/** The cost row: the provider's price, « no cash cost » on our own hardware, or not recorded. */
function costOf(made: Made, t: Words): string {
  if (made.costUsd) return format(t.costValue, { amount: made.costUsd.toFixed(2) });
  return made.costUsd === 0 ? t.costFree : t.notRecorded;
}

export function Provenance({ made, locale }: Readonly<{ made: Made; locale: Locale }>) {
  const t = getDictionary(locale).media;
  const none = t.notRecorded;
  const rows: [string, React.ReactNode][] = [
    [t.model, made.licence ? `${made.model} · ${made.licence}` : made.model],
    [t.engine, made.engine ?? none],
    [t.machine, made.machine ?? t.hostedMachine],
  ];
  if (made.via) rows.push([t.via, made.via]);
  if (made.studio) rows.push([t.studio, <code key="s">{made.studio}</code>]);
  if (made.prompt)
    rows.push([
      t.prompt,
      <q key="p" className="bl-prompt">
        {made.prompt}
      </q>,
    ]);
  if (made.negativePrompt)
    rows.push([
      t.negative,
      <q key="n" className="bl-prompt">
        {made.negativePrompt}
      </q>,
    ]);
  if (made.seed) rows.push([t.seed, <code key="d">{made.seed}</code>]);
  if (made.size)
    rows.push([
      t.size,
      made.durationSeconds
        ? `${made.size} · ${format(t.frames, { fps: String(made.fps), duration: String(made.durationSeconds) })}`
        : made.size,
    ]);
  rows.push(
    [t.time, timeOf(made, t)],
    [t.cost, costOf(made, t)],
    [t.run, made.runId ? <code key="r">{made.runId}</code> : none],
  );
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
