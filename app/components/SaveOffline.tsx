"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@krizaka/ui/button";
import { Popover } from "@krizaka/ui/popover";
import { format } from "@/lib/locale";
import { offlineStore, type OfflineState } from "@/lib/offline-store";
import { useI18n } from "./I18nProvider";

/* « Save for offline » (krizaka-blog#211): the buttons of a chapter (this one, the whole series) and the list of what this device holds.
   They read lib/offline-store.ts; the page around them is static and complete without them. */
const useOffline = (): OfflineState =>
  useSyncExternalStore(offlineStore.subscribe, offlineStore.getSnapshot, offlineStore.getServerSnapshot);

function Notice({ state }: Readonly<{ state: OfflineState }>) {
  const { t } = useI18n();
  const message = state.status === "unsupported" ? t.offline.unsupported : state.error && t.offline[state.error];
  return (
    <output className="bl-offline-note" hidden={!message}>
      {message}
    </output>
  );
}

/** The « ? » next to the save buttons: what « Read offline » does (kept in THIS browser, no account, nothing sent) and how to remove it.
    A popover of @krizaka/ui: a button the keyboard reaches, Enter/Space open it, Escape closes it and gives the focus back, a tap on a phone. */
export function OfflineHelp() {
  const { t } = useI18n();
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="bl-help" aria-label={t.offline.helpLabel}>
          <span aria-hidden="true">?</span>
        </button>
      </Popover.Trigger>
      <Popover.Content className="bl-help-card" side="bottom" align="start">
        <p>{t.offline.helpBody}</p>
        <p>{t.offline.helpRemove}</p>
      </Popover.Content>
    </Popover.Root>
  );
}

/** The chapter's own button: save it, then show it saved with a way to remove it. */
export function SaveChapter({ url }: Readonly<{ url: string }>) {
  const { t } = useI18n();
  const state = useOffline();
  if (state.status === "unsupported") return null;
  const saved = state.saved.includes(url);
  const saving = state.status === "saving";
  const label = saving ? t.offline.saving : t.offline[saved ? "remove" : "save"];
  return (
    <div className="bl-offline">
      <Button
        type="button"
        variant={saved ? "ghost" : "secondary"}
        size="md"
        disabled={saving || state.status === "loading"}
        aria-pressed={saved}
        onClick={() => (saved ? void offlineStore.remove([url]) : void offlineStore.save([url]))}
      >
        {label}
      </Button>
      {saved && <span className="bl-offline-state">{t.offline.saved}</span>}
      <Notice state={state} />
    </div>
  );
}

/** Every chapter of the language in one go; the count says how many (the series is all of them). */
export function SaveSeries({ urls, quiet = false }: Readonly<{ urls: readonly string[]; quiet?: boolean }>) {
  const { t } = useI18n();
  const state = useOffline();
  if (state.status === "unsupported" || urls.length === 0) return null;
  const all = urls.every((u) => state.saved.includes(u));
  const saving = state.status === "saving";
  let label = format(t.offline.saveSeries, { n: String(urls.length) });
  if (all) label = t.offline.seriesSaved;
  if (saving && state.progress) label = `${t.offline.saving} ${state.progress.done}/${state.progress.total}`;
  return (
    <div className="bl-offline">
      <Button
        type="button"
        variant={quiet ? "ghost" : "primary"}
        shape={quiet ? undefined : "cut"}
        size={quiet ? "sm" : "md"}
        className={quiet ? "bl-offline-quiet" : undefined}
        disabled={saving || all || state.status === "loading"}
        onClick={() => void offlineStore.save(urls)}
      >
        {label}
      </Button>
      <Notice state={state} />
    </div>
  );
}

export type SavedChapter = { url: string; number: string; title: string };

/** The chapters held on this device, each a link that opens with no network, and a way to remove it. */
export function SavedList({ chapters }: Readonly<{ chapters: readonly SavedChapter[] }>) {
  const { t } = useI18n();
  const state = useOffline();
  const held = chapters.filter((c) => state.saved.includes(c.url));
  if (state.status === "loading") return null;
  return (
    <section aria-labelledby="bl-saved-title" className="bl-saved">
      <h2 id="bl-saved-title">{t.offline.savedTitle}</h2>
      {held.length === 0 ? (
        <p>{t.offline.empty}</p>
      ) : (
        <ul>
          {held.map((c) => (
            <li key={c.url}>
              <a href={c.url}>
                <span className="bl-saved-n">{c.number}</span> {c.title}
              </a>
              <Button type="button" variant="ghost" size="sm" onClick={() => void offlineStore.remove([c.url])}>
                {t.offline.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
