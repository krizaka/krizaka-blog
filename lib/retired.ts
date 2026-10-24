/* The old addresses of the blog (lib/redirects.json, the single source). An absorbed post's `/posts/<slug>/` is a static stub that
   moves the reader to the chapter's section; a shelf post's `/posts/<slug>/` moves to `/basics/<slug>/`; a retired series
   (`series:<id>`) moves to the story or the shelf. Each stub is a 0-second meta refresh and a canonical, noindex, with a visible
   link (app/components/pages/RetiredPost.tsx). A live post never has a stub at its own address (tests/retired-stubs.test.mjs). */
import redirects from "./redirects.json";
import type { Locale } from "./i18n";

export type Retired = { href: string; chapterSlug: string; anchor: string };

const MAP: Record<string, Record<Locale, string>> = redirects;
const SERIES = "series:";

/** Every retired post slug (both languages share it): the removed posts and the shelf posts that moved. */
export const retiredSlugs = (): string[] => Object.keys(MAP).filter((k) => !k.startsWith(SERIES));

/** Every retired series id (`building-krizaka`…): its address under /series/<id>/ is a stub. */
export const retiredSeriesIds = (): string[] => Object.keys(MAP).filter((k) => k.startsWith(SERIES)).map((k) => k.slice(SERIES.length));

/** Where a retired address goes in a language: a chapter's or a shelf post's path with its anchor, or undefined for a live or unknown slug. */
export function retiredTarget(locale: Locale, slug: string): Retired | undefined {
  const href = MAP[slug]?.[locale];
  if (!href) return undefined;
  const [path, anchor = ""] = href.split("#");
  return { href, chapterSlug: path.replace(/^\/(fr\/)?(story|basics)\//, "").replace(/\/$/, ""), anchor };
}
