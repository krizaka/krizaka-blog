import Link from "next/link";
import { Section } from "@krizaka/ui/page";
import { PageHero } from "@krizaka/ui/page-hero";
import { ChapterIndex } from "@krizaka/ui/chapter";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { chapterNumber, chaptersOf } from "@/lib/chapters";
import { latestChapter, storyRows } from "@/lib/home";
import { postsOf } from "@/lib/posts";
import { chapterPath, postPath } from "@/lib/seo";
import { coverOf, type Cover } from "@/lib/media";
import { formatPeriod } from "./PostList";
import { PostCard } from "./PostCard";
import { TakeStory } from "../TakeStory";
import { NewsletterSection } from "../newsletter/NewsletterSection";

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** The print's picture: the WebP set and its intrinsic size (the album keeps the aspect-ratio, so nothing shifts). */
const albumCover = (c: Cover) => ({ src: c.src, srcSet: c.srcSet, width: c.width, height: c.height });

/* The home is the story (krizaka-blog#123), one page read in five seconds, then deeper on demand:
   - the title and the one sentence that says what this is: the notes from building Krizaka, then who writes them (the byline;
     À propos is in the footer);
   - Featured: one card, the latest chapter (cover, title, its line, date, « Read the chapter »);
   - the chapters in reading order, 1 → N, one ruled line each (the number in the margin, the title the link, the quiet
     period), the latest marked « New »: a timeline you follow, never a feed (lib/home.ts); what was faced → built is on the
     chapter's own head, never repeated here (krizaka-blog#127);
   - at the end, « The basics » as quiet links, then the one newsletter line. The footer follows (SiteRoot).
   Every piece is a @krizaka/ui block: PageHero, Section (the Cahier's § in the margin), the post card, ChapterIndex. */
export default function HomePage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const h = t.home;
  const chapters = chaptersOf(locale);
  const featured = latestChapter(chapters);
  const rows = storyRows(chapters);
  const basics = postsOf(locale);
  /* An address is built from known values only: a slug of lower-case words (the file names of content/), never anything else. */
  const safe = (slug: string) => (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : "");
  const href = (slug: string) => localizedPath(locale, chapterPath(safe(slug)));
  let n = 0;
  const no = () => `§ ${++n}`;
  return (
    <>
      <PageHero
        eyebrow={h.eyebrow}
        title={h.title}
        lead={<span className="bl-home-sentence">{h.lead}</span>}
        linkAs={Link}
      >
        <p className="bl-home-byline">{h.byline}</p>
        <TakeStory locale={locale} />
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
        <Section
          id="chapters"
          title={h.chaptersTitle}
          lead={h.chaptersLead}
          reveal={false}
          divider
          number={no()}
          margin
          paper="lines"
        >
          <ChapterIndex
            label={h.chaptersTitle}
            newLabel={h.new}
            linkAs={Link}
            paper={false}
            variant="album"
            chapters={rows.map(({ chapter: c, isNew }) => ({
              number: chapterNumber(c.chapter),
              title: c.title,
              href: href(c.slug),
              // The album (krizaka-ui#621): the chapter's cover as a taped print, and one short line, what we built.
              detail: upperFirst(c.versus.built),
              cover: c.cover ? albumCover(coverOf(c.cover)) : undefined,
              period: <time dateTime={c.period.split("/")[0]}>{formatPeriod(c.period, locale)}</time>,
              isNew,
            }))}
          />
        </Section>
      )}
      {basics.length > 0 && (
        <Section id="basics" title={h.basicsTitle} lead={h.basicsLead} divider number={no()} margin>
          <ul className="bl-basics-links">
            {basics.map((p) => (
              <li key={p.slug}>
                <Link href={localizedPath(locale, postPath(safe(p.slug)))}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <NewsletterSection locale={locale} where="home" />
    </>
  );
}
