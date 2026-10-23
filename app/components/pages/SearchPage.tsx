import { jsonLd } from "@/lib/json-ld";
import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { getDictionary, type Locale } from "@/lib/i18n";
import { plainText, postsOf, tagsOf, tagSlug } from "@/lib/posts";
import { chapterPath, collectionJsonLd, postPath } from "@/lib/seo";
import { chaptersOf } from "@/lib/chapters";
import { SearchBox, type SearchEntry, type SearchTopic } from "../SearchBox";
import { tagLabel } from "./tag-label";

/* The search: the index is built here, on the server, and handed to the box as props (no fetch in the browser). The topics
   are the box's filter (`?topic=`), not links to other pages. */
export default function SearchPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const prefix = locale === "en" ? "" : "/fr";
  /* The index covers the posts and the chapters of the story (the bar's « L'histoire »). */
  const entries: SearchEntry[] = [
    ...postsOf(locale).map((p) => ({ href: `${prefix}${postPath(p.slug)}/`, title: p.title, description: p.description, tags: p.tags.map(tagSlug), text: plainText(p.body).slice(0, 6000) })),
    ...chaptersOf(locale).map((c) => ({ href: `${prefix}${chapterPath(c.slug)}/`, title: c.title, description: c.description, tags: c.tags.map(tagSlug), text: plainText(c.body).slice(0, 6000) })),
  ];
  const topics: SearchTopic[] = tagsOf(locale).map(({ tag, count }) => ({ tag, label: tagLabel(locale, tag), count }));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(collectionJsonLd(locale, "/search", t.search.title, t.search.lead)) }} />
      <PageHero eyebrow={t.home.eyebrow} title={t.search.title} lead={t.search.lead} backdrop="plain" linkAs={Link} />
      <Section reveal={false}>
        <SearchBox entries={entries} topics={topics} allTopics={t.home.allTopics} filterLabel={t.home.filterLabel} />
      </Section>
    </>
  );
}
