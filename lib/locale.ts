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
