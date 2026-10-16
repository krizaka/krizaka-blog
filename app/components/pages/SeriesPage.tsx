import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { CardGrid } from "@krizaka/ui/card-grid";
import { LinkCard } from "@krizaka/ui/link-card";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { postsInSeries, seriesOf } from "@/lib/posts";
import { collectionJsonLd } from "@/lib/seo";
import { PostList } from "./PostList";

export const seriesName = (locale: Locale, id: string): string => (getDictionary(locale).series.names as Record<string, string>)[id] ?? id;
export const seriesLead = (locale: Locale, id: string): string => (getDictionary(locale).series.leads as Record<string, string>)[id] ?? "";
export const seriesCount = (locale: Locale, count: number): string => {
  const t = getDictionary(locale).series;
  return count === 1 ? t.countOne : format(t.count, { count: String(count) });
};

export function SeriesIndexPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const all = seriesOf(locale);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd(locale, "/series", t.series.title, t.series.lead)) }} />
      <PageHero eyebrow={t.home.eyebrow} title={t.series.title} lead={t.series.lead} backdrop="plain" linkAs={Link} />
      <Section reveal={false}>
        {all.length ? (
          <CardGrid min={320} reveal={false}>
            {all.map(({ series, posts }) => (
              <LinkCard key={series} linkAs={Link} href={localizedPath(locale, `/series/${series}`)} title={seriesName(locale, series)} description={seriesLead(locale, series)} meta={seriesCount(locale, posts.length)} titleAs="h2" />
            ))}
          </CardGrid>
        ) : (
          <p className="bl-status">{t.home.emptyBody}</p>
        )}
      </Section>
    </>
  );
}

export function SeriesPage({ locale, series }: { locale: Locale; series: string }) {
  const t = getDictionary(locale);
  const posts = postsInSeries(locale, series);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd(locale, `/series/${series}`, seriesName(locale, series), seriesLead(locale, series))) }} />
      <PageHero back={{ href: localizedPath(locale, "/series"), label: t.series.back }} linkAs={Link} eyebrow={`${t.series.title} · ${format(t.series.oneLead, { count: String(posts.length) })}`} title={seriesName(locale, series)} lead={seriesLead(locale, series)} backdrop="plain" />
      <Section reveal={false}>{posts.length ? <PostList posts={posts} locale={locale} reveal={false} /> : <p className="bl-status">{t.tags.none}</p>}</Section>
    </>
  );
}
