/* The bar's centre: this site's sections, as one list for every page. TopBar is rendered once, by the root (SiteRoot), so no page
   type can change its items; this module is the list itself, read from the path alone, and tests/bar.test.mjs checks it per page
   type and per language. « L'histoire » comes first, and is active on the story and on each of its chapters (/story/<slug>). */
import { localizedPath, type Locale } from "./locale.ts";

export type BarLink = { key: "story"; href: string; active: boolean };

/** Whether a path (without its language prefix) is the story or one of its chapters. */
export const inStory = (path: string): boolean => /^\/story(\/|$)/.test(path);

/** The centre of the bar, in order. `path` is the page's path without its language prefix (`splitLocale`). */
export function barCentre(locale: Locale, path: string): BarLink[] {
  return [{ key: "story", href: localizedPath(locale, "/story"), active: inStory(path === "/" ? "/" : path.replace(/\/$/, "")) }];
}
