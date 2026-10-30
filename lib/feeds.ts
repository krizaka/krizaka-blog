/* RSS 2.0, Atom 1.0 and JSON Feed 1.1 of one language, as strings (written to out/ by route handlers, at build). */
import { chaptersOf } from "./chapters";
import { MIME, downloadsOf } from "./downloads";
import { getDictionary, type Locale } from "./i18n";
import { publishedTime } from "./reading";
import { plainText, postsOf, type Post } from "./posts";
import { absoluteUrl, chapterPath, postPath } from "./seo";
import { SITE_URL } from "./site";

/* One entry of a feed: a post (/posts/<slug>/) or a chapter of the story (/story/<slug>/), with its own address. The posts merged
   into a chapter are no longer posts: their chapter carries their story in the feeds. Newest first, as the site orders them. */
export type FeedEntry = { item: Post; path: string };
/** The downloads of an entry: only a chapter has them (its EPUB and its PDF). */
const filesOf = (locale: Locale, item: Post) => ("chapter" in item ? downloadsOf(locale, item.slug) : []);

export const feedEntriesOf = (locale: Locale): FeedEntry[] =>
  [
    ...postsOf(locale).map((item) => ({ item, path: postPath(item.slug) })),
    ...chaptersOf(locale).map((item) => ({ item, path: chapterPath(item.slug) })),
  ].sort((a, b) => publishedTime(b.item) - publishedTime(a.item) || a.item.slug.localeCompare(b.item.slug));

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const iso = (d: string) => `${d}T12:00:00Z`;
const prefix = (l: Locale) => (l === "en" ? "" : "/fr");

export function rss(locale: Locale, entries: FeedEntry[]): string {
  const t = getDictionary(locale);
  const items = entries
    .map(({ item: p, path }) => {
      const url = absoluteUrl(locale, path);
      return `    <item>\n      <title>${esc(p.title)}</title>\n      <link>${url}</link>\n      <guid isPermaLink="true">${url}</guid>\n      <pubDate>${new Date(iso(p.date)).toUTCString()}</pubDate>\n      <description>${esc(p.description)}</description>\n${filesOf(
        locale,
        p,
      )
        .filter((f) => f.format === "epub")
        .map((f) => `      <enclosure url="${f.url}" length="${f.bytes}" type="${MIME[f.format]}"/>\n`)
        .join("")}${p.tags.map((c) => `      <category>${esc(c)}</category>`).join("\n")}\n    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${esc(t.site.name)}</title>\n    <link>${absoluteUrl(locale, "/")}</link>\n    <description>${esc(t.site.description)}</description>\n    <language>${locale === "en" ? "en" : "fr-CA"}</language>\n    <atom:link href="${SITE_URL}${prefix(locale)}/feed.xml" rel="self" type="application/rss+xml"/>\n${items}\n  </channel>\n</rss>\n`;
}

export function atom(locale: Locale, feed: FeedEntry[]): string {
  const t = getDictionary(locale);
  const updated = feed[0] ? iso(feed[0].item.updated ?? feed[0].item.date) : "2026-01-01T00:00:00Z";
  const entries = feed
    .map(({ item: p, path }) => {
      const url = absoluteUrl(locale, path);
      const author = (t.authors as Record<string, string>)[p.author] ?? p.author;
      return `  <entry>\n    <title>${esc(p.title)}</title>\n    <link href="${url}"/>\n    <id>${url}</id>\n    <published>${iso(p.date)}</published>\n    <updated>${iso(p.updated ?? p.date)}</updated>\n    <author><name>${esc(author)}</name></author>\n    <summary>${esc(p.description)}</summary>\n${filesOf(
        locale,
        p,
      )
        .map((f) => `    <link rel="enclosure" type="${MIME[f.format]}" href="${f.url}" length="${f.bytes}"/>\n`)
        .join(
          "",
        )}    <content type="text">${esc(plainText(p.body).slice(0, 600))}</content>\n${p.tags.map((c) => `    <category term="${esc(c)}"/>`).join("\n")}\n  </entry>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${locale}">\n  <title>${esc(t.site.name)}</title>\n  <link href="${absoluteUrl(locale, "/")}"/>\n  <link rel="self" href="${SITE_URL}${prefix(locale)}/atom.xml"/>\n  <id>${absoluteUrl(locale, "/")}</id>\n  <updated>${updated}</updated>\n  <subtitle>${esc(t.site.description)}</subtitle>\n${entries}\n</feed>\n`;
}

/** JSON Feed 1.1 (jsonfeed.org): the same entries as the RSS and the Atom, for readers that prefer JSON. */
export function jsonFeed(locale: Locale, entries: FeedEntry[]): string {
  const t = getDictionary(locale);
  const items = entries.map(({ item: p, path }) => {
    const url = absoluteUrl(locale, path);
    return {
      id: url,
      url,
      title: p.title,
      summary: p.description,
      content_text: plainText(p.body).slice(0, 600),
      date_published: iso(p.date),
      date_modified: iso(p.updated ?? p.date),
      tags: p.tags,
      language: locale,
      ...(filesOf(locale, p).length > 0 && {
        attachments: filesOf(locale, p).map((f) => ({ url: f.url, mime_type: MIME[f.format], size_in_bytes: f.bytes })),
      }),
    };
  });
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: t.site.name,
    home_page_url: absoluteUrl(locale, "/"),
    feed_url: `${SITE_URL}${prefix(locale)}/feed.json`,
    language: locale,
    items,
  };
  return JSON.stringify(feed, null, 2);
}
