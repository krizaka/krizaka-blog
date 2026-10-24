import { getDictionary, type Locale } from "@/lib/i18n";

/** The name of a topic in a language: its message when the topic is known, else the slug itself. */
export function tagLabel(locale: Locale, tag: string): string {
  const names = getDictionary(locale).tags.names as Record<string, string>;
  return names[tag] ?? tag;
}
