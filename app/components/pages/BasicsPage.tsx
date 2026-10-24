import { jsonLd } from "@/lib/json-ld";
import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { postsOf } from "@/lib/posts";
import { collectionJsonLd } from "@/lib/seo";
import { PostList } from "./PostList";
import { seriesLead, seriesName } from "./SeriesPage";

/* « Les bases »: the shelf of standalone posts that teach, at /basics/ (EN) and /fr/basics/ (FR). Its words are the series' name and lead. */
export function BasicsPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const posts = postsOf(locale);
  const name = seriesName(locale, "basics");
  const lead = seriesLead(locale, "basics");
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(collectionJsonLd(locale, "/basics", name, lead)) }} />
      <PageHero eyebrow={t.home.eyebrow} title={name} lead={lead} backdrop="plain" linkAs={Link} />
      <Section reveal={false}>
        {posts.length ? <PostList posts={posts} locale={locale} reveal={false} /> : <p className="bl-status">{t.tags.none}</p>}
        <p className="bl-story-link">
          <Link href={localizedPath(locale, "/story")}>{t.series.story}</Link>
        </p>
      </Section>
    </>
  );
}
