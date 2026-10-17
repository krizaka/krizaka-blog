"use client";

import { SiteFooter as FamilyFooter } from "@krizaka/ui/site-footer";
import { familyLabels } from "@krizaka/ui/sites";
import { useI18n } from "./I18nProvider";
import { GITHUB_ORG_URL, REPOSITORY_URL } from "@/lib/site";

/* The footer (NAV-SYS) is @krizaka/ui's SiteFooter, the one of every Krizaka site: the blog is a Krizaka publication, so
   it signs “A Krizaka company” and lists the family in columns (fed by @krizaka/ui/sites). The blog's own column holds
   the code and the feeds. Rendered once, by the root layout, outside <main>: the page's single contentinfo. */
export default function SiteFooter() {
  const { locale, t } = useI18n();
  const f = t.footer;
  const feeds = locale === "en" ? "" : "/fr";
  return (
    <FamilyFooter current="krizaka" labels={familyLabels[locale]} aria-label={f.aria}>
      <FamilyFooter.Column title={f.project}>
        <FamilyFooter.Link href={REPOSITORY_URL}>{f.source}</FamilyFooter.Link>
        <FamilyFooter.Link href={GITHUB_ORG_URL}>GitHub</FamilyFooter.Link>
      </FamilyFooter.Column>
      <FamilyFooter.Column title={f.feeds}>
        <FamilyFooter.Link href={`${feeds}/feed.xml`}>{f.rss}</FamilyFooter.Link>
        <FamilyFooter.Link href={`${feeds}/atom.xml`}>{f.atom}</FamilyFooter.Link>
      </FamilyFooter.Column>
    </FamilyFooter>
  );
}
