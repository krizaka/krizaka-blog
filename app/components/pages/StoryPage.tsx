import Link from "next/link";
import { jsonLd } from "@/lib/json-ld";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { Stepper } from "@krizaka/ui/stepper";
import { Landscape } from "@krizaka/ui/landscape";
import { SpecimenTag } from "@krizaka/ui/specimen-tag";
import { FootnoteRef, Footnotes } from "@krizaka/ui/footnote";
import { PageIndex } from "@krizaka/ui/page-index";
import { PostCard } from "./PostCard";
import { formatDate } from "./PostList";
import { seriesName } from "./SeriesPage";
import { format, getDictionary, type Locale } from "@/lib/i18n";
import { postsOf } from "@/lib/posts";
import { collectionJsonLd } from "@/lib/seo";
import { storyOf, threadsOf } from "@/lib/story";

/* « The Krizaka story » (/story/): the posts in time, read from their front matter by lib/story.ts — a step for each, its
   cover, its first line (the post's own lead) and the way to read it, grouped by week, with the threads (the series) named.
   Every piece is a @krizaka/ui block: the period's landscape, the specimen tags, the stepper (the dated rail), the index, the
   footnotes; the pictures are the posts' cards (a Stepper shows a step's content only while it is current). */
export function StoryPage({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const s = t.story;
  const posts = postsOf(locale);
  const periods = storyOf(posts);
  const threads = threadsOf(periods);
  const thread = (id?: string) => (id ? seriesName(locale, id) : s.noThread);
  const latest = periods.at(-1)?.steps.at(-1)?.slug;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(collectionJsonLd(locale, "/story", s.title, s.lead)) }} />
      <PageHero
        eyebrow={t.home.eyebrow}
        title={s.title}
        lead={<>{s.lead}{periods.length > 0 && <> <FootnoteRef n={1} /> <FootnoteRef n={2} /></>}</>}
        backdrop="plain"
        linkAs={Link}
      />
      {periods.length === 0 ? (
        <Section reveal={false}>
          <p className="bl-status">{s.empty}</p>
        </Section>
      ) : (
        <>
          <Section reveal={false}>
            <div className="bl-story-intro">
              <PageIndex
                label={s.indexLabel}
                linkAs={Link}
                groups={periods.map((p) => ({
                  title: format(s.period, { start: formatDate(p.start, locale), end: formatDate(p.end, locale) }),
                  entries: p.steps.map((st) => ({ label: st.title, href: `#${st.slug}`, page: formatDate(st.date, locale) })),
                }))}
              />
              <SpecimenTag
                code="KZ"
                title={s.threads}
                fields={threads.map(({ thread: id, count }) => ({ label: seriesName(locale, id), value: format(s.threadCount, { count: String(count) }) }))}
              />
            </div>
          </Section>
          {periods.map((p, i) => (
            <Section key={p.id} reveal={false} divider={i > 0}>
              <div className="bl-story-period" id={p.id}>
                <Landscape className="bl-story-landscape" position="relative" phoenix={false} animated={false} fade />
                <SpecimenTag
                  className="bl-story-tag"
                  code={`№ ${i + 1}`}
                  title={format(s.week, { start: formatDate(p.start, locale) })}
                  titleAs="h2"
                  mount="hang"
                  fields={[{ label: s.published, value: format(s.stepCount, { count: String(p.steps.length) }) }]}
                />
              </div>
              <Stepper
                aria-label={s.label}
                labels={s.statuses}
                steps={p.steps.map((st) => ({
                  title: st.title,
                  description: `${formatDate(st.date, locale)} · ${thread(st.thread)}`,
                  status: st.slug === latest ? "current" : "done",
                }))}
              />
              <div className="bl-story-cards">
                {p.steps.map((st) => (
                  <div key={st.slug} id={st.slug} className="bl-story-step">
                    <PostCard post={posts.find((q) => q.slug === st.slug)!} locale={locale} />
                  </div>
                ))}
              </div>
            </Section>
          ))}
          <Section reveal={false} divider>
            <Footnotes label={s.sourcesLabel} backLabel={s.backLabel} notes={s.sources} />
          </Section>
        </>
      )}
    </>
  );
}
