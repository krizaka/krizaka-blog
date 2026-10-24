/* The posts merged into a chapter. Their old addresses (`/posts/<slug>/` and `/fr/posts/<slug>/`) are static stub pages built
   from lib/redirects.json (the single source; tests/retired-stubs.test.mjs checks it): a 0-second meta refresh and a canonical
   to the chapter's section, noindex, and a visible link. A live post never has a stub. */
import redirects from "./redirects.json";
import type { Locale } from "./i18n";

export type Retired = { href: string; chapterSlug: string; anchor: string };

const MAP: Record<string, Record<Locale, string>> = redirects;

/** Every retired slug (both languages share it). */
export const retiredSlugs = (): string[] => Object.keys(MAP);

/** Where a retired address goes in a language: the chapter's path with its anchor, or undefined for a live or unknown slug. */
export function retiredTarget(locale: Locale, slug: string): Retired | undefined {
  const href = MAP[slug]?.[locale];
  if (!href) return undefined;
  const [path, anchor = ""] = href.split("#");
  return { href, chapterSlug: path.replace(/^\/(fr\/)?story\//, "").replace(/\/$/, ""), anchor };
}
