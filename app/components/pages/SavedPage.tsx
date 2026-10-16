import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { postsOf } from "@/lib/posts";
import { postPath } from "@/lib/seo";
import { SavedList, type SavedCandidate } from "../engage/SavedList";

/* The reader's saved posts. Kept in this browser (lib/saved.ts); the page is static and lists every post it could show,
   the list keeps those saved. A post only in the other language is offered in that language. */
export default function SavedPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const other: Locale = locale === "en" ? "fr" : "en";
  const candidates = new Map<string, SavedCandidate>();
  for (const l of [locale, other]) {
    for (const p of postsOf(l)) {
      if (candidates.has(p.slug)) continue;
      candidates.set(p.slug, { slug: p.slug, href: `${l === "en" ? "" : "/fr"}${postPath(p.slug)}/`, title: p.title, description: p.description });
    }
  }
  return (
    <>
      <PageHero eyebrow={t.home.eyebrow} title={t.engage.savedTitle} lead={t.engage.savedLead} backdrop="plain" linkAs={Link} />
      <Section reveal={false}>
        <SavedList posts={[...candidates.values()]} homeHref={localizedPath(locale, "/")} />
      </Section>
    </>
  );
}
