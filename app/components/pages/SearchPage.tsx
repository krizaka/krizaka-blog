import { jsonLd } from "@/lib/json-ld";
import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { getDictionary, type Locale } from "@/lib/i18n";
import { plainText, postsOf } from "@/lib/posts";
import { collectionJsonLd, postPath } from "@/lib/seo";
import { SearchBox, type SearchEntry } from "../SearchBox";

/* The search: the index is built here, on the server, and handed to the box as props (no fetch in the browser). */
export default function SearchPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const entries: SearchEntry[] = postsOf(locale).map((p) => ({
    href: `${locale === "en" ? "" : "/fr"}${postPath(p.slug)}/`,
    title: p.title,
    description: p.description,
    tags: p.tags,
    text: plainText(p.body).slice(0, 6000),
  }));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(collectionJsonLd(locale, "/search", t.search.title, t.search.lead)) }} />
      <PageHero eyebrow={t.home.eyebrow} title={t.search.title} lead={t.search.lead} backdrop="plain" linkAs={Link} />
      <Section reveal={false}>
        <SearchBox entries={entries} />
      </Section>
    </>
  );
}
