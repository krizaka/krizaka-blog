"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CardGrid } from "@krizaka/ui/card-grid";
import { chipVariants } from "@krizaka/ui/chip-link";
import { LinkCard } from "@krizaka/ui/link-card";
import { format } from "@/lib/locale";
import { searchParams, searchQuery, searchResults, type SearchEntry } from "@/lib/search";
import { useI18n } from "./I18nProvider";

export type { SearchEntry } from "@/lib/search";
export type SearchTopic = { tag: string; label: string; count: number };

/* The search box and the topics as its filter. The query and the topic live in the URL (`?q=`, `?topic=`), so a result list
   can be shared and the topic keeps the query the reader typed. The index is handed in by the page (no fetch). */
export function SearchBox({ entries, topics, allTopics, filterLabel }: { entries: SearchEntry[]; topics: SearchTopic[]; allTopics: string; filterLabel: string }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = searchParams(window.location.search);
    setQuery(p.query);
    setTopic(p.topic);
  }, []);

  /* The URL follows the reader's choice without a navigation (the page stays, the query stays). */
  const write = (q: string, tp: string) => window.history.replaceState(null, "", `${window.location.pathname}${searchQuery(q, tp)}`);
  const pick = (next: string) => {
    setTopic(next);
    write(query, next);
  };

  const results = useMemo(() => searchResults(entries, query, topic), [entries, query, topic]);
  const chip = (selected: boolean) => chipVariants({ size: "md", selected });
  return (
    <div className="bl-search">
      <div>
        <label htmlFor="bl-q" className="sr-only">{t.search.label}</label>
        <input
          id="bl-q"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            write(e.target.value, topic);
          }}
          placeholder={t.search.placeholder}
          autoComplete="off"
        />
      </div>
      {topics.length > 0 && (
        <nav aria-label={filterLabel}>
          <ul className="bl-tags">
            <li>
              <button type="button" className={chip(!topic)} aria-pressed={!topic} onClick={() => pick("")}>{allTopics}</button>
            </li>
            {topics.map((tp) => (
              <li key={tp.tag}>
                <button type="button" className={chip(topic === tp.tag)} aria-pressed={topic === tp.tag} onClick={() => pick(tp.tag)}>
                  {tp.label} <span className="bl-count">{tp.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <p className="bl-status" role="status" aria-live="polite">
        {!query.trim() && !topic ? t.search.hint : results.length ? format(t.search.results, { count: String(results.length) }) : t.search.noResults}
      </p>
      {results.length > 0 && (
        <CardGrid min={320} reveal={false}>
          {results.map((r) => (
            <LinkCard key={r.href} linkAs={Link} href={r.href} title={r.title} description={r.description} titleAs="h2" />
          ))}
        </CardGrid>
      )}
    </div>
  );
}
