import type { ReactNode } from "react";
import { ThemeProvider, ThemeScript } from "@krizaka/ui/theme";
import { SkipLink } from "@krizaka/ui/skip-link";
import { MotionObserver } from "@krizaka/ui/motion";
import { cn } from "@krizaka/ui/cn";
import { getDictionary, type Locale } from "@/lib/i18n";
import { clientMessages } from "@/lib/client-messages";
import { postsOf, translationOf } from "@/lib/posts";
import { MEDIA_CDN_URL } from "@/lib/site";
import { displayFace, monoFace, textFace } from "../fonts";
import { I18nProvider } from "./I18nProvider";
import SiteFooter from "./SiteFooter";
import { ThemeSync } from "./SiteTheme";
import TopBar from "./TopBar";
import "@krizaka/ui/blocks.css";
import "../globals.css";

/* The root of one language (the two root layouts, app/(en) and app/fr, are this): the document, the Krizaka faces, the
   theme (dark by default, persisted as `kz-theme`, no flash), the bar, the page, the footer. */
export default function SiteRoot({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = getDictionary(locale);
  /* The posts the language switch can land on in the other language (read at build, a few dozen slugs). */
  const translated = postsOf(locale)
    .filter((p) => translationOf(p))
    .map((p) => p.slug);
  return (
    <html
      lang={locale}
      className={cn(textFace.variable, displayFace.variable, monoFace.variable, "h-full dark")}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <ThemeScript defaultMode="dark" />
        <meta name="theme-color" content="#0d0d0f" />
        {/* The pictures come from the media CDN: open the connection with the page, not after it. */}
        <link rel="preconnect" href={MEDIA_CDN_URL} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <ThemeProvider defaultMode="dark">
          <ThemeSync />
          <MotionObserver />
          <I18nProvider locale={locale} messages={clientMessages(t)}>
            <SkipLink href="#main">{t.bar.skip}</SkipLink>
            <TopBar translated={translated} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
