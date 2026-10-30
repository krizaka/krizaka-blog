import "@krizaka/ui/story.css";
import type { ComponentProps } from "react";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Section } from "@krizaka/ui/page";
import { Toc, TocLayout } from "@krizaka/ui/toc";
import { Stat } from "@krizaka/ui/stat";
import { StageBanner } from "@krizaka/ui/stage-banner";
import { ChapterFoot, ChapterHead } from "@krizaka/ui/chapter";
import { blurUrl } from "@/lib/blur";
import { jsonLd } from "@/lib/json-ld";
import { format, getDictionary, localizedPath } from "@/lib/i18n";
import { coverOf } from "@/lib/media";
import {
  chapterNumber,
  chaptersOf,
  chapterTranslationOf,
  nextChapter,
  previousChapter,
  type Chapter,
} from "@/lib/chapters";
import { headingsOf, rehypeRounds } from "@/lib/reading.ts";
import { absoluteUrl, chapterOgUrl, chapterPath, postJsonLd } from "@/lib/seo";
import { mdxComponentsFor } from "./mdx";
import { formatPeriod } from "./PostList";
import { Byline } from "./Byline";
import { CoverImage } from "./CoverImage";
import { SaveChapter, SaveSeries } from "../SaveOffline";

/* One chapter of the story, sober on the notebook lines (krizaka-blog#127):
   - the head (ChapterHead): « 01 » in the margin, the h1, one meta line (the period · the reading time), what I faced →
     what we built once as the standfirst; then who wrote it (the other language) and the cover once;
   - the body: the reading layout of a post, « Round n » set before each h2 (rehypeRounds; the h2 and its id do not change);
   - the stats: the figures the body already gives, each linked to its section;
   - the foot (ChapterFoot): the previous and the next chapter, then back to the story (the home). */
export default function ChapterPage({ chapter }: { chapter: Chapter }) {
  const { locale } = chapter;
  const t = getDictionary(locale);
  const tc = t.chapter;
  const other = chapterTranslationOf(chapter);
  const next = nextChapter(chapter);
  const previous = previousChapter(chapter);
  const home = localizedPath(locale, "/");
  const link = (c: Chapter) => ({
    number: chapterNumber(c.chapter),
    title: c.title,
    href: localizedPath(locale, chapterPath(c.slug)),
  });
  /* The versus halves are written as the second half of a sentence (« Ce que j'ai affronté : un écran vert… »); as the
     standfirst the first starts with a capital. */
  const upperFirst = (s: string) => s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
  const cover = chapter.cover ? coverOf(chapter.cover) : undefined;
  const headings = headingsOf(chapter.body);
  const n = chapterNumber(chapter.chapter);
  // The same short range as the story's index (« 16–17 oct. 2026 »), never the two dates written out in full.
  const period = formatPeriod(chapter.period, locale);
  const components = {
    ...mdxComponentsFor(locale),
    h2: ({ children, ...props }: ComponentProps<"h2"> & { "data-round"?: string }) => {
      const { "data-round": round, ...rest } = props;
      return (
        <>
          {round && (
            <StageBanner
              className="bl-round"
              variant="arcade"
              size="sm"
              stage={format(tc.round, { n: round })}
              aria-hidden="true"
            />
          )}
          <h2 {...rest}>{children}</h2>
        </>
      );
    },
  };
  const body = (
    <article className="bl-article">
      {chapter.draft && <p className="bl-draft">{t.post.draftNotice}</p>}
      <div className="bl-prose">
        <MDXRemote
          source={chapter.body}
          components={components}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug, rehypeRounds] } }}
        />
      </div>
      {chapter.stats.length > 0 && (
        <section className="bl-chapter-stats" aria-label={tc.stats}>
          <StageBanner variant="arcade" size="lg" stage={format(tc.statsOf, { n })} title={tc.stats} titleAs="h2" />
          <div className="bl-numbers">
            {chapter.stats.map((s) => {
              const id = headings.find((h) => h.text === s.section)?.id;
              return (
                <Stat
                  key={s.value + s.label}
                  className="bl-num"
                  label={s.label}
                  value={s.value}
                  hint={id ? <a href={`#${id}`}>{s.section}</a> : s.section}
                />
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
  return (
    <>
      <div className="bl-progress" aria-hidden="true" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            postJsonLd(chapter, undefined, chapterPath(chapter.slug), chapterOgUrl(locale, chapter.slug), {
              position: chapter.chapter,
              name: t.home.title,
              url: absoluteUrl(locale, "/"),
            }),
          ),
        }}
      />
      <Section reveal={false} spacing="sm" className="bl-chapter-top">
        <ChapterHead
          number={n}
          title={chapter.title}
          period={period}
          readingTime={format(t.post.readingTime, { minutes: String(chapter.readingMinutes) })}
          faced={upperFirst(chapter.versus.faced)}
          built={chapter.versus.built}
          versusLabels={[tc.faced, tc.built]}
        >
          <Byline post={chapter} other={other} section="story" readingTime={false} />
        </ChapterHead>
        {cover && (
          <CoverImage
            className="bl-cover bl-img bl-chapter-cover"
            cover={cover}
            sizes="(min-width: 60rem) 896px, calc(100vw - 32px)"
            alt={chapter.coverAlt ?? ""}
            priority
            style={{ backgroundImage: blurUrl(cover.blur) }}
          />
        )}
        <div className="bl-offline-bar" role="group" aria-label={t.offline.regionLabel}>
          <SaveChapter url={localizedPath(locale, chapterPath(chapter.slug))} />
          <SaveSeries urls={chaptersOf(locale).map((c) => localizedPath(locale, chapterPath(c.slug)))} />
        </div>
      </Section>
      <Section reveal={false} spacing="sm" className="bl-post-body">
        {headings.length >= 3 ? (
          <TocLayout
            className="bl-post-layout"
            toc={<Toc label={tc.toc} items={headings.map((h) => ({ id: h.id, label: h.text }))} />}
          >
            {body}
          </TocLayout>
        ) : (
          body
        )}
      </Section>
      <Section reveal={false} spacing="sm">
        <ChapterFoot
          previous={previous && link(previous)}
          next={next && link(next)}
          back={{ href: home, label: tc.toStory }}
          labels={{ previous: tc.previous, next: tc.nextLabel }}
          label={tc.nav}
          linkAs={Link}
        />
      </Section>
    </>
  );
}
