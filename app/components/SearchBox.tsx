"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CardGrid } from "@krizaka/ui/card-grid";
import { LinkCard } from "@krizaka/ui/link-card";
import { format } from "@/lib/i18n";
import { useI18n } from "./I18nProvider";

export type SearchEntry = { href: string; title: string; description: string; tags: string[]; text: string };

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* Every word typed must appear in the title, summary, topics or text of a post (accents ignored); a title match ranks first. */
export function searchEntries(entries: SearchEntry[], query: string): SearchEntry[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const e of entries) {
    const title = fold(e.title);
    const rest = fold(`${e.description} ${e.tags.join(" ")} ${e.text}`);
    if (!words.every((w) => title.includes(w) || rest.includes(w))) continue;
    scored.push({ e, score: words.filter((w) => title.includes(w)).length * 2 + words.filter((w) => rest.includes(w)).length });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.e);
}

export function SearchBox({ entries }: { entries: SearchEntry[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchEntries(entries, query), [entries, query]);
  return (
    <div className="bl-search">
      <div>
        <label htmlFor="bl-q" className="sr-only">{t.search.label}</label>
        <input id="bl-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search.placeholder} autoComplete="off" />
      </div>
      <p className="bl-status" role="status" aria-live="polite">
        {!query.trim() ? t.search.hint : results.length ? format(t.search.results, { count: String(results.length) }) : t.search.noResults}
      </p>
      {results.length > 0 && (
        <CardGrid light={false} min={320} reveal={false}>
          {results.map((r) => (
            <LinkCard key={r.href} linkAs={Link} href={r.href} title={r.title} description={r.description} titleAs="h2" />
          ))}
        </CardGrid>
      )}
    </div>
  );
}
