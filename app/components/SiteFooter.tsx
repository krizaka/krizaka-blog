"use client";

import { SiteFooter as FamilyFooter } from "@krizaka/ui/site-footer";
import { familyLabels } from "@krizaka/ui/sites";
import { localizedPath } from "@/lib/locale";
import { useI18n } from "./I18nProvider";
import { REPOSITORY_URL } from "@/lib/site";
import { FOOTER_PRODUCT_IDS } from "@/lib/footer-family";

/* The footer (NAV-SYS) is @krizaka/ui's SiteFooter, one calm band (krizaka-ui#434): the blog is a Krizaka publication, so
   it signs “A Krizaka company”. Its own columns say what the page says (krizaka-blog#123): the story (one sentence and one link to
   it — the home lists the chapters, the footer does not repeat them: krizaka-blog#136 — then « The basics »), the feeds (the newsletter, RSS and Atom — the files), the project (À propos, the source). They sit beside the
   family's (Products · Open source: Krizaka UI, Krizaka Java, GitHub · Krizaka: the company), which is where the home's old « Where
   the work lives » went. Rendered once, by the root layout, outside <main>: the page's single contentinfo. */
export default function SiteFooter() {
  const { locale, t } = useI18n();
  const f = t.footer;
  const feeds = locale === "en" ? "" : "/fr";
  return (
    <FamilyFooter current="krizaka" products={FOOTER_PRODUCT_IDS} labels={familyLabels[locale]} aria-label={f.aria}>
      <FamilyFooter.Column title={f.story}>
        <p className="max-w-[32ch] text-sm text-fg-muted">{f.storyNote}</p>
        <FamilyFooter.Link href={localizedPath(locale, "/")}>{f.readStory}</FamilyFooter.Link>
        <FamilyFooter.Link href={localizedPath(locale, "/basics")}>{f.basics}</FamilyFooter.Link>
      </FamilyFooter.Column>
      <FamilyFooter.Column title={f.feeds}>
        <FamilyFooter.Link href={`${feeds}/newsletter/`}>{f.newsletter}</FamilyFooter.Link>
        <FamilyFooter.Link href={`${feeds}/feed.xml`}>{f.rss}</FamilyFooter.Link>
        <FamilyFooter.Link href={`${feeds}/atom.xml`}>{f.atom}</FamilyFooter.Link>
      </FamilyFooter.Column>
      <FamilyFooter.Column title={f.project}>
        <FamilyFooter.Link href={`${feeds}/about/`}>{f.about}</FamilyFooter.Link>
        <FamilyFooter.Link href={`${feeds}/offline/`}>{f.offline}</FamilyFooter.Link>
        <FamilyFooter.Link href={REPOSITORY_URL}>{f.source}</FamilyFooter.Link>
      </FamilyFooter.Column>
    </FamilyFooter>
  );
}
