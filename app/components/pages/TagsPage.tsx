import { jsonLd } from "@/lib/json-ld";
import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { CardGrid } from "@krizaka/ui/card-grid";
import { LinkCard } from "@krizaka/ui/link-card";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { postsWithTag, tagsOf } from "@/lib/posts";
import { collectionJsonLd } from "@/lib/seo";
import { PostList } from "./PostList";
import { postCount, tagLabel, tagSeo } from "./tag-label";
import { TopicFilter } from "./TopicFilter";

export function TagsPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const tags = tagsOf(locale);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(collectionJsonLd(locale, "/tags", t.tags.title, t.tags.lead)) }} />
      <PageHero eyebrow={t.home.eyebrow} title={t.tags.title} lead={t.tags.lead} backdrop="plain" linkAs={Link} />
      <Section reveal={false}>
        {tags.length ? (
          <CardGrid light={false} min={240} reveal={false}>
            {tags.map(({ tag, count }) => (
              <LinkCard key={tag} linkAs={Link} href={localizedPath(locale, `/tags/${tag}`)} title={tagLabel(locale, tag)} description={postCount(locale, count)} titleAs="h2" />
            ))}
          </CardGrid>
        ) : (
          <p className="bl-status">{t.home.emptyBody}</p>
        )}
      </Section>
    </>
  );
}

export function TagPage({ locale, tag }: { locale: Locale; tag: string }) {
  const t = getDictionary(locale);
  const posts = postsWithTag(locale, tag);
  const label = tagLabel(locale, tag);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(collectionJsonLd(locale, `/tags/${tag}`, format(t.tags.oneTitle, { tag: label }), tagSeo(locale, tag).description)) }} />
      <PageHero back={{ href: localizedPath(locale, "/tags"), label: t.tags.back }} linkAs={Link} eyebrow={t.tags.title} title={format(t.tags.oneTitle, { tag: label })} lead={tagSeo(locale, tag).description} backdrop="plain" />
      <Section reveal={false}>
        <TopicFilter locale={locale} current={tag} />
        {posts.length ? <PostList posts={posts} locale={locale} reveal={false} /> : <p className="bl-status">{t.tags.none}</p>}</Section>
    </>
  );
}
