/* The search's logic, apart from its box: which entries match a query and a topic. Read by SearchBox (the page) and by
   tests/search-topic.test.mjs. A topic is a slug (`tagSlug`), carried by `?topic=` next to the query `?q=`. */

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

/* The topic narrows the entries first. With a query, the results are the matches inside that topic (the query is kept);
   with a topic and no query, the topic lists its entries; with neither, nothing. */
export function searchResults(entries: SearchEntry[], query: string, topic = ""): SearchEntry[] {
  const pool = topic ? entries.filter((e) => e.tags.includes(topic)) : entries;
  if (query.trim()) return searchEntries(pool, query);
  return topic ? pool : [];
}

/** The query and the topic the URL carries (`?q=…&topic=…`). */
export function searchParams(search: string): { query: string; topic: string } {
  const p = new URLSearchParams(search);
  return { query: p.get("q") ?? "", topic: p.get("topic") ?? "" };
}

/** The query string for a query and a topic, empty parts left out. */
export function searchQuery(query: string, topic: string): string {
  const p = new URLSearchParams();
  if (query.trim()) p.set("q", query);
  if (topic) p.set("topic", topic);
  const s = p.toString();
  return s ? `?${s}` : "";
}
