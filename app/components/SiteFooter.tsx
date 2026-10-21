"use client";

import { SiteFooter as FamilyFooter } from "@krizaka/ui/site-footer";
import { familyLabels } from "@krizaka/ui/sites";
import { useI18n } from "./I18nProvider";
import { REPOSITORY_URL } from "@/lib/site";

/* The footer (NAV-SYS) is @krizaka/ui's SiteFooter, one calm band (krizaka-ui#434): the blog is a Krizaka publication, so
   it signs “A Krizaka company”; its own columns (the project, the feeds) sit beside the family's (Products · Open source
   with GitHub · Krizaka: story, blog, contact), then one line. Nothing twice: GitHub is in the family's columns. Rendered
   once, by the root layout, outside <main>: the page's single contentinfo. */
export default function SiteFooter() {
  const { locale, t } = useI18n();
  const f = t.footer;
  const feeds = locale === "en" ? "" : "/fr";
  return (
    <FamilyFooter current="krizaka" labels={familyLabels[locale]} aria-label={f.aria}>
      <FamilyFooter.Column title={f.project}>
        <FamilyFooter.Link href={`${feeds}/about/`}>{f.about}</FamilyFooter.Link>
        <FamilyFooter.Link href={REPOSITORY_URL}>{f.source}</FamilyFooter.Link>
      </FamilyFooter.Column>
      <FamilyFooter.Column title={f.feeds}>
        <FamilyFooter.Link href={`${feeds}/newsletter/`}>{f.newsletter}</FamilyFooter.Link>
        <FamilyFooter.Link href={`${feeds}/feed/`}>{f.rss}</FamilyFooter.Link>
        <FamilyFooter.Link href={`${feeds}/atom.xml`}>{f.atom}</FamilyFooter.Link>
      </FamilyFooter.Column>
    </FamilyFooter>
  );
}
