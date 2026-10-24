/* The old addresses of the blog (lib/redirects.json, the single source). Three kinds of key:
   - `<slug>`: a post. An absorbed post's `/posts/<slug>/` moves to the chapter's section; a shelf post's to `/basics/<slug>/`;
   - `series:<id>`: a retired series, `/series/<id>/`, moves to the story (the home) or to the shelf;
   - `page:<path>`: a removed page (krizaka-blog#123, the blog is one page): `/story/`, `/series/`, `/tags/` and each topic,
     `/search/`, `/saved/`, `/feed/`, `/posts/` move to the story (the home), or to the chapter or shelf post that absorbed them.
   Each stub is a 0-second meta refresh and a canonical, noindex, with a visible link (app/components/pages/RetiredPost.tsx): the
   permanent move a static host can give. A live page never has a stub at its own address (tests/retired-stubs.test.mjs). */
import redirects from "./redirects.json";
import type { Locale } from "./i18n";

export type Retired = { href: string; chapterSlug: string; anchor: string };

const MAP: Record<string, Record<Locale, string>> = redirects;
const SERIES = "series:";
const PAGE = "page:";

/** Every retired post slug (both languages share it): the removed posts and the shelf posts that moved. */
export const retiredSlugs = (): string[] => Object.keys(MAP).filter((k) => !k.startsWith(SERIES) && !k.startsWith(PAGE));

/** Every retired series id (`building-krizaka`…): its address under /series/<id>/ is a stub. */
export const retiredSeriesIds = (): string[] => Object.keys(MAP).filter((k) => k.startsWith(SERIES)).map((k) => k.slice(SERIES.length));

/** The key of a removed page: `page:/search/`. */
export const pageKey = (path: string): string => `${PAGE}${path}`;

/** The removed pages under a prefix, by their last segment: `retiredPagesUnder("/tags/")` → `["ai", "costs", …]` (the index itself is `pageKey("/tags/")`). */
export const retiredPagesUnder = (prefix: string): string[] =>
  Object.keys(MAP)
    .filter((k) => k.startsWith(PAGE + prefix) && k !== PAGE + prefix)
    .map((k) => k.slice(PAGE.length + prefix.length).replace(/\/$/, ""));

/** Where a retired address goes in a language: a chapter's or a shelf post's path with its anchor, the home, or undefined for a live or unknown key. */
export function retiredTarget(locale: Locale, key: string): Retired | undefined {
  const href = MAP[key]?.[locale];
  if (!href) return undefined;
  const [path, anchor = ""] = href.split("#");
  const slug = path.match(/^\/(?:fr\/)?(?:story|basics)\/([a-z0-9-]+)\/$/)?.[1] ?? "";
  return { href, chapterSlug: slug, anchor };
}
