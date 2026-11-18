"use client";

import { FamilyFooter } from "@krizaka/ui/site-footer";
import { familyLabels } from "@krizaka/ui/sites";
import { footerFor, org } from "@krizaka/org";

import { localizedPath } from "@/lib/locale";
import { useI18n } from "./I18nProvider";

/* The one family footer (krizaka-internal#4120): `FamilyFooter` of @krizaka/ui drawn from `footerFor("blog")` of
   @krizaka/org — the family, the four socials, the legal line, the company's facts. Nothing is typed here but the
   blog's own column, « The blog » (the story, the basics, the newsletter, the feeds as files, About). Rendered once, by
   the root layout, outside <main>: the page's single contentinfo. */
const footer = footerFor("blog");

export default function SiteFooter() {
  const { locale, t } = useI18n();
  const own = (path: string) => {
    if (/\.[a-z]+$/.test(path)) return `${locale === "en" ? "" : "/fr"}${path}`; // a feed file: no trailing slash
    return localizedPath(locale, path);
  };
  const f = t.footer;
  return (
    <FamilyFooter
      current="blog"
      kind="company"
      footer={footer}
      labels={familyLabels[locale]}
      company={org.company}
      contact={org.contact.page}
    >
      <FamilyFooter.Column title={f.blogColumn}>
        <FamilyFooter.Link href={own("/")}>{f.readStory}</FamilyFooter.Link>
        <FamilyFooter.Link href={own("/basics")}>{f.basics}</FamilyFooter.Link>
        <FamilyFooter.Link href={own("/newsletter")}>{f.newsletter}</FamilyFooter.Link>
        <FamilyFooter.Link href={own("/feed.xml")}>{f.rss}</FamilyFooter.Link>
        <FamilyFooter.Link href={own("/atom.xml")}>{f.atom}</FamilyFooter.Link>
        <FamilyFooter.Link href={own("/about")}>{f.about}</FamilyFooter.Link>
      </FamilyFooter.Column>
    </FamilyFooter>
  );
}
