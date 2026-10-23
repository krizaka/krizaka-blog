/* The language-only part of lib/i18n.ts: the locales, and the URLs of a language. It holds no message, so a client component can import it
   without bundling both catalogues (messages/en.json + fr.json, ~32 KB) — those are read on the server (lib/i18n.ts) and the active one is
   handed down by I18nProvider. */
export { format } from "@krizaka/i18n";

export type Locale = "en" | "fr";
export const LOCALES: readonly Locale[] = ["en", "fr"];
export const DEFAULT_LOCALE: Locale = "en";

/** The URL of a path in a language: English at the root, French under /fr. `path` starts with "/" (the root is "/"). */
export function localizedPath(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path.replace(/\/$/, "");
  return `${locale === "en" ? "" : "/fr"}${clean}/`;
}

/** The language of a URL path, and the path without its language prefix. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const m = pathname.match(/^\/fr(\/.*)?$/);
  return m ? { locale: "fr", path: m[1] ?? "/" } : { locale: "en", path: pathname || "/" };
}

/**
 * Where the language switch lands: the same page in the other language. A post lands on its translation when there is one
 * (`translated`: the slugs that exist in both languages), else on the other language's home — never on a page that would 404.
 */
export function languageSwitchPath(other: Locale, path: string, translated: readonly string[]): string {
  const clean = path === "/" ? "/" : path.replace(/\/$/, "");
  const post = clean.match(/^\/posts\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (post) return translated.includes(post[1]) ? localizedPath(other, clean) : localizedPath(other, "/");
  return localizedPath(other, clean);
}
