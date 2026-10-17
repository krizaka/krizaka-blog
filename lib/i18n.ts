/* i18n — every user-facing string lives in messages/<locale>.json (the words of the posts are content/posts/<slug>.<locale>.mdx).
   en.json is the reference: its shape is the TranslationDictionary type, a key missing from fr.json fails
   type-checking, and `npm run lint` runs `krizaka-i18n check messages`. The engine is @krizaka/i18n, shared by every
   Krizaka app. English is served at the root (`/`), French under `/fr/`. */

import { createI18n } from "@krizaka/i18n";
import { DEFAULT_LOCALE, type Locale } from "./locale";
import en from "@/messages/en.json";
import frMessages from "@/messages/fr.json";

export { DEFAULT_LOCALE, LOCALES, localizedPath, splitLocale, format, type Locale } from "./locale";

export type TranslationDictionary = typeof en;
const fr: TranslationDictionary = frMessages;

export const i18n = createI18n<TranslationDictionary, Locale>({ en, fr }, { defaultLocale: DEFAULT_LOCALE });
export const getDictionary = (locale: Locale): TranslationDictionary => i18n.getDictionary(locale);
