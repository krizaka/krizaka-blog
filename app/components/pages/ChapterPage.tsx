import "@krizaka/ui/story.css";
import type { ComponentProps } from "react";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { Toc, TocLayout } from "@krizaka/ui/toc";
import { Stat } from "@krizaka/ui/stat";
import { StageBanner } from "@krizaka/ui/stage-banner";
import { ContinuePrompt } from "@krizaka/ui/continue-prompt";
import { blurUrl } from "@/lib/blur";
import { jsonLd } from "@/lib/json-ld";
import { format, getDictionary, localizedPath } from "@/lib/i18n";
import { coverOf } from "@/lib/media";
import { chapterNumber, chapterTranslationOf, nextChapter, type Chapter } from "@/lib/chapters";
import { headingsOf, rehypeRounds } from "@/lib/reading.ts";
import { chapterOgUrl, chapterPath, postJsonLd } from "@/lib/seo";
import { mdxComponentsFor } from "./mdx";
import { formatDate } from "./PostList";
import { Byline } from "./Byline";
import { CoverImage } from "./CoverImage";

/* One chapter of the story, the arcade's frames around the normal reading column:
   - the head: « Chapitre 01 · période » and the versus labels as text (a StageBanner until VersusCard ships, krizaka-ui#548),
     then the h1, the lead and who wrote it, and the cover once;
   - the body: the reading layout of a post, « Round n » set before each h2 (rehypeRounds; the h2 and its id do not change);
   - the stats: the figures the body already gives, each linked to its section;
   - « Continuer ? »: the next chapter, or back to the story (the home) after the last one. */
export default function ChapterPage({ chapter }: { chapter: Chapter }) {
  const { locale } = chapter;
  const t = getDictionary(locale);
  const tc = t.chapter;
  const other = chapterTranslationOf(chapter);
  const next = nextChapter(chapter);
  const cover = chapter.cover ? coverOf(chapter.cover) : undefined;
  const headings = headingsOf(chapter.body);
  const n = chapterNumber(chapter.chapter);
  const [from, to] = chapter.period.split("/");
  const period = to ? format(tc.period, { from: formatDate(from, locale), to: formatDate(to, locale) }) : formatDate(from, locale);
  const components = {
    ...mdxComponentsFor(locale),
    h2: ({ children, ...props }: ComponentProps<"h2"> & { "data-round"?: string }) => {
      const { "data-round": round, ...rest } = props;
      return (
        <>
          {round && <StageBanner className="bl-round" variant="arcade" size="sm" stage={format(tc.round, { n: round })} aria-hidden="true" />}
          <h2 {...rest}>{children}</h2>
        </>
      );
    },
  };
  const body = (
    <article className="bl-article">
      {chapter.draft && <p className="bl-draft">{t.post.draftNotice}</p>}
      <div className="bl-prose">
        <MDXRemote source={chapter.body} components={components} options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug, rehypeRounds] } }} />
      </div>
      {chapter.stats.length > 0 && (
        <section className="bl-chapter-stats" aria-label={tc.stats}>
          <StageBanner variant="arcade" size="lg" stage={format(tc.statsOf, { n })} title={tc.stats} titleAs="h2" />
          <div className="bl-numbers">
            {chapter.stats.map((s) => {
              const id = headings.find((h) => h.text === s.section)?.id;
              return <Stat key={s.value + s.label} className="bl-num" label={s.label} value={s.value} hint={id ? <a href={`#${id}`}>{s.section}</a> : s.section} />;
            })}
          </div>
        </section>
      )}
    </article>
  );
  return (
    <>
      <div className="bl-progress" aria-hidden="true" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(postJsonLd(chapter, undefined, chapterPath(chapter.slug), chapterOgUrl(locale, chapter.slug))) }} />
      <header className="bl-versus">
        <StageBanner
          variant="arcade"
          size="lg"
          stage={`${format(tc.label, { n })} · ${period}`}
          title={
            <>
              <span className="bl-versus-side">
                <span className="bl-versus-label">{tc.faced}</span>
                <span>{chapter.versus.faced}</span>
              </span>
              <span className="bl-versus-vs"> {tc.vs} </span>
              <span className="bl-versus-side">
                <span className="bl-versus-label">{tc.built}</span>
                <span>{chapter.versus.built}</span>
              </span>
            </>
          }
          aria-label={tc.versus}
          role="group"
        />
        {cover && <CoverImage className="bl-cover bl-img bl-versus-cover" cover={cover} sizes="(min-width: 60rem) 896px, calc(100vw - 32px)" alt={chapter.coverAlt ?? ""} priority style={{ backgroundImage: blurUrl(cover.blur) }} />}
      </header>
      <PageHero back={{ href: localizedPath(locale, "/"), label: tc.back }} linkAs={Link} title={chapter.title} lead={chapter.description} backdrop="plain" className="bl-post-hero">
        <Byline post={chapter} other={other} section="story" />
      </PageHero>
      <Section reveal={false} spacing="sm" className="bl-post-body">
        {headings.length >= 3 ? <TocLayout className="bl-post-layout" toc={<Toc label={tc.toc} items={headings.map((h) => ({ id: h.id, label: h.text }))} />}>{body}</TocLayout> : body}
      </Section>
      <Section reveal={false} spacing="sm" className="bl-continue">
        <ContinuePrompt
          variant="arcade"
          title={tc.continue}
          actionKey={tc.start}
          caption={next ? tc.nextCaption : undefined}
          actionLabel={next ? format(tc.next, { n: chapterNumber(next.chapter) }) : tc.toStory}
          href={next ? localizedPath(locale, chapterPath(next.slug)) : localizedPath(locale, "/")}
        >
          {next ? (
            <>
              <p className="bl-continue-title">{next.title}</p>
              <p>{next.description}</p>
            </>
          ) : (
            <p>{tc.storySoFar}</p>
          )}
        </ContinuePrompt>
      </Section>
    </>
  );
}
