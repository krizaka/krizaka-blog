import { format, getDictionary, type Locale } from "@/lib/i18n";

/** The name of a topic in a language: its message when the topic is known, else the slug itself. */
export function tagLabel(locale: Locale, tag: string): string {
  const names = getDictionary(locale).tags.names as Record<string, string>;
  return names[tag] ?? tag;
}

/** "1 post" / "3 posts" (the message of the language). */
export function postCount(locale: Locale, count: number): string {
  const t = getDictionary(locale).tags;
  return count === 1 ? t.countOne : format(t.count, { count: String(count) });
}
