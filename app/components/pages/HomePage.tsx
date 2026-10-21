import Link from "next/link";
import { Section } from "@krizaka/ui/page";
import { PageHero } from "@krizaka/ui/page-hero";
import { LinkCard } from "@krizaka/ui/link-card";
import { CardGrid } from "@krizaka/ui/card-grid";
import { EmptyState } from "@krizaka/ui/empty-state";
import { NotificationIcon } from "@krizaka/icons";
import { Button } from "@krizaka/ui/button";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { featuredPosts, postsOf, seriesOf } from "@/lib/posts";
import { JAVA_URL, KRIZAKA_URL, UI_URL } from "@/lib/site";
import { PostList } from "./PostList";
import { PostCard } from "./PostCard";
import { seriesCount, seriesLead, seriesName } from "./SeriesPage";
import { NewsletterSection } from "../newsletter/NewsletterSection";
import { AuthorNote } from "../about/AuthorNote";
import { TopicFilter } from "./TopicFilter";

/* The home: the blog's promise, three posts first (the newest large, the next two medium), the topics as filters (each one its own page), the other
   posts as cards, the series, and where the work lives. */
export default function HomePage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const posts = postsOf(locale);
  const series = seriesOf(locale);
  /* Three posts first: the newest (or a pinned one, `featured: true`) as the large card, the next two beside it. */
  const [featured, ...second] = featuredPosts(locale, 3);
  const rest = posts.filter((p) => p !== featured && !second.includes(p));
  const feed = `${locale === "en" ? "" : "/fr"}/feed/`;
  /* The Cahier (krizaka-ui ADR-004): the sections are the notebook's pages, numbered in the red margin (§ 1, § 2…), in
     the order they appear; the latest posts sit on its lined paper. */
  let n = 0;
  const no = () => `§ ${++n}`;
  return (
    <>
      <PageHero eyebrow={t.home.eyebrow} title={t.home.title} lead={t.home.lead} linkAs={Link} />
      {featured && (
        <Section title={t.home.featuredTitle} reveal={false} number={no()} margin>
          <PostCard post={featured} locale={locale} feature priority />
          {second.length > 0 && (
            <div className="bl-featured-pair">
              {second.map((p) => (
                <PostCard key={p.slug} post={p} locale={locale} />
              ))}
            </div>
          )}
        </Section>
      )}
      <Section title={t.home.latest} lead={posts.length ? t.home.latestLead : undefined} reveal={false} divider={Boolean(featured)} number={no()} margin paper="lines">
        <TopicFilter locale={locale} />
        {rest.length ? (
          <PostList posts={rest} locale={locale} reveal={false} />
        ) : posts.length ? null : (
          <EmptyState
            title={t.home.emptyTitle}
            description={t.home.emptyBody}
            action={
              <Button asChild variant="secondary" size="md">
                <a href={feed}>
                  <NotificationIcon size={16} />
                  {t.home.emptyAction}
                </a>
              </Button>
            }
          />
        )}
      </Section>
      <NewsletterSection locale={locale} where="home" />
      {series.length > 0 && (
        <Section title={t.home.seriesTitle} lead={t.home.seriesLead} divider number={no()} margin>
          <CardGrid min={320}>
            {series.map(({ series: id, posts: inSeries }) => (
              <LinkCard key={id} linkAs={Link} href={localizedPath(locale, `/series/${id}`)} title={seriesName(locale, id)} description={seriesLead(locale, id)} meta={seriesCount(locale, inSeries.length)} cta={t.home.moreFromSeries} titleAs="h3" />
            ))}
          </CardGrid>
        </Section>
      )}
      <AuthorNote locale={locale} />
      <Section title={t.home.elsewhereTitle} lead={t.home.elsewhereLead} divider number={no()} margin>
        <CardGrid min={260}>
          <LinkCard href={KRIZAKA_URL} title={t.home.company} description={t.home.companyBody} cta={t.home.open} titleAs="h3" />
          <LinkCard href={UI_URL} title={t.home.ui} description={t.home.uiBody} cta={t.home.open} titleAs="h3" />
          <LinkCard href={JAVA_URL} title={t.home.java} description={t.home.javaBody} cta={t.home.open} titleAs="h3" />
        </CardGrid>
      </Section>
    </>
  );
}
