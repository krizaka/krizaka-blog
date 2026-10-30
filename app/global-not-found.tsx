import type { Metadata } from "next";
import { cn } from "@krizaka/ui/cn";
import { ThemeProvider, ThemeScript } from "@krizaka/ui/theme";
import { ErrorPage } from "@krizaka/ui/error-page";
import { Button } from "@krizaka/ui/button";
import { KrizakaLogo } from "@krizaka/ui";
import { getDictionary } from "@/lib/i18n";
import "@krizaka/ui/blocks.css";
import { displayFace, monoFace, textFace } from "./fonts";
import "./globals.css";

/* The 404 of both languages (the two root layouts bypass layout.tsx): @krizaka/ui ErrorPage, the message in English and
   in French, the ways back (the story — the home — in English and in French). */
export const metadata: Metadata = { title: "404 — Krizaka Blog", robots: { index: false } };

export default function GlobalNotFound() {
  const en = getDictionary("en").notFound;
  const fr = getDictionary("fr").notFound;
  return (
    <html
      lang="en"
      className={cn(textFace.variable, displayFace.variable, monoFace.variable, "dark")}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript defaultMode="dark" />
      </head>
      <body>
        <ThemeProvider defaultMode="dark">
          <main className="kz-404">
            <ErrorPage
              code="404"
              mascot={<KrizakaLogo size={96} animated={false} />}
              title={en.title}
              text={
                <>
                  {en.body} {en.lead}
                  <span className="kz-404-fr" lang="fr">
                    {fr.title}. {fr.body}
                  </span>
                </>
              }
              actions={
                <div className="kz-404-actions">
                  <Button asChild variant="primary" size="md">
                    <a href="/">{en.back}</a>
                  </Button>
                  <Button asChild variant="ghost" size="md">
                    <a href="/fr/" lang="fr">
                      {fr.back}
                    </a>
                  </Button>
                </div>
              }
            />
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
