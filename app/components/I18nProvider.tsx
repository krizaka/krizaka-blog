"use client";

import { createI18nReact } from "@krizaka/i18n/react";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/locale";
import type { ClientMessages } from "@/lib/client-messages";

/* The active catalogue, handed down by the server: the client never bundles both messages/*.json, and gets only the namespaces its components read (lib/client-messages.ts). Components read `t`
   from useI18n(); format and <Rich> stay @krizaka/i18n. */
const engine = createI18nReact<ClientMessages, Locale>({ locales: ["en", "fr"], defaultLocale: "en" });

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: ClientMessages;
  children: ReactNode;
}) {
  return (
    <engine.I18nProvider locale={locale} messages={messages} setLocale={() => undefined}>
      {children}
    </engine.I18nProvider>
  );
}

export function useI18n(): { locale: Locale; t: ClientMessages } {
  const { locale, messages } = engine.useI18n();
  return { locale, t: messages };
}
