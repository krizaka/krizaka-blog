import Link from "next/link";
import { Section } from "@krizaka/ui/page";
import { PageHero } from "@krizaka/ui/page-hero";
import { LinkCard } from "@krizaka/ui/link-card";
import { Badge } from "@krizaka/ui/badge";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { chapterNumber, chaptersOf } from "@/lib/chapters";
import { latestChapter, storyRows } from "@/lib/home";
import { postsOf } from "@/lib/posts";
import { chapterPath, postPath } from "@/lib/seo";
import { formatPeriod } from "./PostList";
import { PostCard } from "./PostCard";
import { NewsletterSection } from "../newsletter/NewsletterSection";

/* The home is the story (krizaka-blog#123), one page read in five seconds, then deeper on demand:
   - the title and the one sentence that says what this is: the notes from building Krizaka, then who writes them (the byline;
     À propos is in the footer);
   - Featured: one card, the latest chapter (cover, title, its line, date, « Read the chapter »);
   - the chapters in reading order, 1 → N, one row each (number, title, what I faced → what we built, the period), the latest
     marked « New »: a timeline you follow, never a feed (lib/home.ts);
   - at the end, « The basics » as quiet links, then the one newsletter line. The footer follows (SiteRoot).
   Every piece is a @krizaka/ui block: PageHero, Section (the Cahier's § in the margin), the post card, LinkCard, Badge. The
   chapters are an <ol> of LinkCards until a Stepper's steps can be links (krizaka-ui#617). */
export default function HomePage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const h = t.home;
  const chapters = chaptersOf(locale);
  const featured = latestChapter(chapters);
  const rows = storyRows(chapters);
  const basics = postsOf(locale);
  const href = (slug: string) => localizedPath(locale, chapterPath(slug));
  /* The versus labels are written as the second half of a sentence (« Ce que j'ai affronté : un écran vert… »); alone on a row they
     start with a capital. */
  const upperFirst = (s: string) => s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
  let n = 0;
  const no = () => `§ ${++n}`;
  return (
    <>
      <PageHero eyebrow={h.eyebrow} title={h.title} lead={<span className="bl-home-sentence">{h.lead}</span>} linkAs={Link}>
        <p className="bl-home-byline">{h.byline}</p>
      </PageHero>
      {featured && (
        <Section id="featured" title={h.featuredTitle} reveal={false} number={no()} margin>
          <PostCard
            post={featured}
            locale={locale}
            feature
            priority
            titleAs="h3"
            href={href(featured.slug)}
            kicker={format(t.chapter.label, { n: chapterNumber(featured.chapter) })}
            cta={h.readChapter}
          />
        </Section>
      )}
      {rows.length > 0 && (
        <Section id="chapters" title={h.chaptersTitle} lead={h.chaptersLead} reveal={false} divider number={no()} margin paper="lines">
          <ol className="bl-chapters" aria-label={h.chaptersTitle}>
            {rows.map(({ chapter: c, isNew }) => (
              <li key={c.slug} className="bl-chapter" data-chapter={c.chapter} data-new={isNew || undefined}>
                <LinkCard
                  linkAs={Link}
                  href={href(c.slug)}
                  icon={<span className="bl-chapter-no">{chapterNumber(c.chapter)}</span>}
                  meta={
                    <>
                      <time dateTime={c.period.split("/")[0]}>{formatPeriod(c.period, locale)}</time>
                      {isNew && (
                        <Badge tone="accent" dot className="bl-chapter-new">
                          {h.new}
                        </Badge>
                      )}
                    </>
                  }
                  title={c.title}
                  description={format(h.versus, { faced: upperFirst(c.versus.faced), built: c.versus.built })}
                  titleAs="h3"
                  footerAlign="top"
                />
              </li>
            ))}
          </ol>
        </Section>
      )}
      {basics.length > 0 && (
        <Section id="basics" title={h.basicsTitle} lead={h.basicsLead} divider number={no()} margin>
          <ul className="bl-basics-links">
            {basics.map((p) => (
              <li key={p.slug}>
                <Link href={localizedPath(locale, postPath(p.slug))}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <NewsletterSection locale={locale} where="home" />
    </>
  );
}
