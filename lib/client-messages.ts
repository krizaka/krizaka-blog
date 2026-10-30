/* The messages a client component reads (`useI18n().t`), the only part of the catalogue sent down to the browser: the rest (home, posts,
   tags, about… ~10 KB per page) is rendered on the server. A client component that reads another namespace adds it here — tests/i18n-client.test.mjs
   fails otherwise. */
import type { TranslationDictionary } from "./i18n";

export const CLIENT_NAMESPACES = ["site", "bar", "footer", "engage", "newsletter", "calc", "offline"] as const;
export type ClientMessages = Pick<TranslationDictionary, (typeof CLIENT_NAMESPACES)[number]>;

export function clientMessages(t: TranslationDictionary): ClientMessages {
  return Object.fromEntries(CLIENT_NAMESPACES.map((k) => [k, t[k]])) as ClientMessages;
}
