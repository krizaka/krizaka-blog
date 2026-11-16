import { jsonLd } from "@/lib/json-ld";
import Link from "next/link";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { postsOf } from "@/lib/posts";
import { splitBasics } from "@/lib/basics";
import { PostList } from "./PostList";
import { collectionJsonLd } from "@/lib/seo";
import { BasicsPath } from "./BasicsPath";
import { seriesLead, seriesName } from "./series-label";

/* « Les bases »: the shelf of standalone posts that teach, at /basics/ (EN) and /fr/basics/ (FR). Its words are the series' name and lead. */
export function BasicsPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const posts = postsOf(locale);
  const { basics, others } = splitBasics(posts);
  const name = seriesName(locale, "basics");
  const lead = seriesLead(locale, "basics");
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(collectionJsonLd(locale, "/basics", name, lead)) }}
      />
      <PageHero eyebrow={t.home.eyebrow} title={name} lead={lead} backdrop="plain" linkAs={Link} />
      <Section reveal={false}>
        {posts.length ? (
          <>
            <p className="bl-path-for">{t.basics.for}</p>
            <BasicsPath posts={basics} locale={locale} label={name} />
            {/* The posts that are not a way in (weekly, integration) stay on this index, under the path. */}
            {others.length > 0 && (
              <>
                <h2 className="bl-basics-others">{t.basics.others}</h2>
                <PostList posts={others} locale={locale} label={t.basics.others} reveal={false} />
              </>
            )}
          </>
        ) : (
          <p className="bl-status">{t.tags.none}</p>
        )}
        <p className="bl-story-link">
          <Link href={localizedPath(locale, "/")}>{t.basics.story}</Link>
        </p>
      </Section>
    </>
  );
}
