/* RSS 2.0 and Atom 1.0 of one language, as strings (written to out/ by route handlers, at build). */
import { getDictionary, type Locale } from "./i18n";
import { plainText, type Post } from "./posts";
import { absoluteUrl, postPath } from "./seo";
import { SITE_URL } from "./site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const iso = (d: string) => `${d}T12:00:00Z`;
const prefix = (l: Locale) => (l === "en" ? "" : "/fr");

export function rss(locale: Locale, posts: Post[]): string {
  const t = getDictionary(locale);
  const items = posts
    .map((p) => {
      const url = absoluteUrl(locale, postPath(p.slug));
      return `    <item>\n      <title>${esc(p.title)}</title>\n      <link>${url}</link>\n      <guid isPermaLink="true">${url}</guid>\n      <pubDate>${new Date(iso(p.date)).toUTCString()}</pubDate>\n      <description>${esc(p.description)}</description>\n${p.tags.map((c) => `      <category>${esc(c)}</category>`).join("\n")}\n    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>${esc(t.site.name)}</title>\n    <link>${absoluteUrl(locale, "/")}</link>\n    <description>${esc(t.site.description)}</description>\n    <language>${locale === "en" ? "en" : "fr-CA"}</language>\n    <atom:link href="${SITE_URL}${prefix(locale)}/feed.xml" rel="self" type="application/rss+xml"/>\n${items}\n  </channel>\n</rss>\n`;
}

export function atom(locale: Locale, posts: Post[]): string {
  const t = getDictionary(locale);
  const updated = posts[0] ? iso(posts[0].updated ?? posts[0].date) : "2026-01-01T00:00:00Z";
  const entries = posts
    .map((p) => {
      const url = absoluteUrl(locale, postPath(p.slug));
      const author = (t.authors as Record<string, string>)[p.author] ?? p.author;
      return `  <entry>\n    <title>${esc(p.title)}</title>\n    <link href="${url}"/>\n    <id>${url}</id>\n    <published>${iso(p.date)}</published>\n    <updated>${iso(p.updated ?? p.date)}</updated>\n    <author><name>${esc(author)}</name></author>\n    <summary>${esc(p.description)}</summary>\n    <content type="text">${esc(plainText(p.body).slice(0, 600))}</content>\n${p.tags.map((c) => `    <category term="${esc(c)}"/>`).join("\n")}\n  </entry>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${locale}">\n  <title>${esc(t.site.name)}</title>\n  <link href="${absoluteUrl(locale, "/")}"/>\n  <link rel="self" href="${SITE_URL}${prefix(locale)}/atom.xml"/>\n  <id>${absoluteUrl(locale, "/")}</id>\n  <updated>${updated}</updated>\n  <subtitle>${esc(t.site.description)}</subtitle>\n${entries}\n</feed>\n`;
}
