import { getDictionary, type Locale } from "@/lib/i18n";

/** The name and the lead of a series in a language (`series.names.*`, `series.leads.*`), else its id / nothing. */
export const seriesName = (locale: Locale, id: string): string => (getDictionary(locale).series.names as Record<string, string>)[id] ?? id;
export const seriesLead = (locale: Locale, id: string): string => (getDictionary(locale).series.leads as Record<string, string>)[id] ?? "";
