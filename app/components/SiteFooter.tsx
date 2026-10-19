"use client";

import { SiteFooter as FamilyFooter } from "@krizaka/ui/site-footer";
import { familyLabels } from "@krizaka/ui/sites";
import Link from "next/link";
import { useI18n } from "./I18nProvider";
import { changelogHref, GITHUB_ORG_URL, REPOSITORY_URL } from "@/lib/site";

/* The footer (NAV-SYS) is @krizaka/ui's SiteFooter, the one of every Krizaka site: the blog is a Krizaka publication, so
   it signs “A Krizaka company” and lists the family in columns (fed by @krizaka/ui/sites). The blog's own column holds
   the code and the feeds. Rendered once, by the root layout, outside <main>: the page's single contentinfo. */
export default function SiteFooter({ version = "", ui = "" }: { version?: string; ui?: string }) {
  const { locale, t } = useI18n();
  const f = t.footer;
  const feeds = locale === "en" ? "" : "/fr";
  return (
    <FamilyFooter
      current="krizaka"
      labels={familyLabels[locale]}
      aria-label={f.aria}
      legal={
        version ? (
          <FamilyFooter.Link asChild>
            <Link href={`${changelogHref(locale)}#${version}`}>{`v${version}${ui ? ` · Krizaka UI ${ui}` : ""}`}</Link>
          </FamilyFooter.Link>
        ) : undefined
      }
    >
      <FamilyFooter.Column title={f.project}>
        <FamilyFooter.Link href={`${feeds}/about/`}>{f.about}</FamilyFooter.Link>
        <FamilyFooter.Link href={REPOSITORY_URL}>{f.source}</FamilyFooter.Link>
        <FamilyFooter.Link href={GITHUB_ORG_URL}>GitHub</FamilyFooter.Link>
      </FamilyFooter.Column>
      <FamilyFooter.Column title={f.feeds}>
        <FamilyFooter.Link href={`${feeds}/newsletter/`}>{f.newsletter}</FamilyFooter.Link>
        <FamilyFooter.Link href={`${feeds}/feed/`}>{f.rss}</FamilyFooter.Link>
        <FamilyFooter.Link href={`${feeds}/atom.xml`}>{f.atom}</FamilyFooter.Link>
        <FamilyFooter.Link href={changelogHref(locale)}>{f.changelog}</FamilyFooter.Link>
      </FamilyFooter.Column>
    </FamilyFooter>
  );
}
