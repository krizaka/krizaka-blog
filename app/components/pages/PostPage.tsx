import { jsonLd } from "@/lib/json-ld";
import { blurUrl } from "@/lib/blur";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { ChipLink } from "@krizaka/ui/chip-link";
import { CardGrid } from "@krizaka/ui/card-grid";
import { LinkCard } from "@krizaka/ui/link-card";
import { Toc, TocLayout } from "@krizaka/ui/toc";
import { BackIcon, ForwardIcon } from "@krizaka/icons";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { coverOf } from "@/lib/media";
import { postsInSeries, relatedPosts, tagSlug, translationOf, type Post } from "@/lib/posts";
import { headingsOf, neighbours } from "@/lib/reading.ts";
import { postJsonLd, postPath } from "@/lib/seo";
import { PostList, formatDate } from "./PostList";
import { tagLabel } from "./tag-label";
import { mdxComponentsFor } from "./mdx";
import { seriesName } from "./SeriesPage";
import { PostEngage } from "../engage/PostEngage";
import { NewsletterSection } from "../newsletter/NewsletterSection";
import { SaveButton } from "../engage/SaveButton";
import { Byline } from "./Byline";

/** A transparent 1×1 GIF: what a phone gets instead of the cover. */
const NOTHING = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/* One post, a reading page: a hairline that follows the reading, the title block (topic and series, h1, lead, who wrote it,
   when, how long), the cover, the body at a reading measure with its contents in a sticky column (desktop), the previous and next parts of its series, and related posts. */
export default function PostPage({ post }: { post: Post }) {
  const { locale } = post;
  const t = getDictionary(locale);
  const other = translationOf(post);
  const more = relatedPosts(post, 3).filter((p) => !post.series || p.series !== post.series);
  const inSeries = post.series ? postsInSeries(locale, post.series) : [];
  const at = inSeries.findIndex((p) => p.slug === post.slug);
  const { prev, next } = neighbours(inSeries, post.slug);
  const cover = post.cover ? coverOf(post.cover) : undefined;
  /* The cover's words: the alt the post itself gives that picture or clip, when it shows it. */
  const coverAlt = post.cover ? (post.body.match(new RegExp(`<(?:Figure|Clip)\\s+id="${post.cover}"\\s+alt="([^"]+)"`))?.[1] ?? "") : "";
  const headings = headingsOf(post.body);
  const topic = post.tags.map(tagSlug)[0];
  const body = (
    <article className="bl-article">
      {post.draft && <p className="bl-draft">{t.post.draftNotice}</p>}
      {cover ? (
        /* On a phone the post opens on its words: the cover is a picture the body shows again where the text talks about it,
           so below 48rem nothing is downloaded (a 1-pixel source) and the box is hidden. */
        <picture className="bl-cover-frame">
          <source media="(max-width: 47.99rem)" srcSet={NOTHING} />
          <img className="bl-cover bl-img" src={cover.src} srcSet={cover.srcSet} sizes="(min-width: 64rem) 680px, calc(100vw - 64px)" width={cover.width} height={cover.height} alt={coverAlt} fetchPriority="high" decoding="async" style={{ backgroundImage: blurUrl(cover.blur) }} />
        </picture>
      ) : (
        post.image && <img className="bl-cover" src={post.image} alt="" width={1200} height={630} />
      )}
      <div className="bl-prose">
        <MDXRemote source={post.body} components={mdxComponentsFor(locale)} options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } }} />
      </div>
      {post.tags.length > 0 && (
        <ul className="bl-tags bl-post-tags" aria-label={t.post.topics}>
          {post.tags.map(tagSlug).map((tag) => (
            <li key={tag}>
              <ChipLink asChild>
                <Link href={localizedPath(locale, `/tags/${tag}`)}>{tagLabel(locale, tag)}</Link>
              </ChipLink>
            </li>
          ))}
        </ul>
      )}
      <PostEngage slug={post.slug} title={post.title} locale={locale} />
      <p className="bl-feed">
        {/* A feed is a file, not a page: a plain link (next/link would fetch it as a route). */}
        <a href={`${locale === "en" ? "" : "/fr"}/feed.xml`}>{t.post.share}</a>
      </p>
    </article>
  );
  return (
    <>
      <div className="bl-progress" aria-hidden="true" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(postJsonLd(post, topic ? { name: tagLabel(locale, topic), path: `/tags/${topic}` } : undefined)) }} />
      <PageHero
        back={{ href: localizedPath(locale, "/"), label: t.post.back }}
        linkAs={Link}
        eyebrow={
          <span className="bl-eyebrow">
            {topic && <Link href={localizedPath(locale, `/tags/${topic}`)}>{tagLabel(locale, topic)}</Link>}
            {post.series && at >= 0 && (
              <Link href={localizedPath(locale, `/series/${post.series}`)}>
                {format(t.post.inSeries, { series: seriesName(locale, post.series), part: String(at + 1), count: String(inSeries.length) })}
              </Link>
            )}
          </span>
        }
        title={post.title}
        lead={post.description}
        backdrop="plain"
        className="bl-post-hero"
      >
        <Byline post={post} other={other} />
        <div className="bl-hero-actions">
          <SaveButton slug={post.slug} />
        </div>
      </PageHero>
      <Section reveal={false} spacing="sm" className="bl-post-body">
        {headings.length >= 3 ? <TocLayout className="bl-post-layout" toc={<Toc label={t.post.toc} items={headings.map((h) => ({ id: h.id, label: h.text }))} />}>{body}</TocLayout> : body}
      </Section>
      <NewsletterSection locale={locale} where="post" />
      {(prev || next) && post.series && (
        <Section title={seriesName(locale, post.series)} divider reveal={false}>
          <CardGrid min={280} reveal={false} className="bl-series-nav">
            {prev && <LinkCard linkAs={Link} href={localizedPath(locale, postPath(prev.slug))} meta={t.post.prevInSeries} title={prev.title} icon={<BackIcon size={18} />} titleAs="h3" />}
            {next && <LinkCard linkAs={Link} href={localizedPath(locale, postPath(next.slug))} meta={t.post.nextInSeries} title={next.title} icon={<ForwardIcon size={18} />} titleAs="h3" className="bl-series-next" />}
          </CardGrid>
        </Section>
      )}
      {more.length > 0 && (
        <Section title={t.post.related} divider>
          <PostList posts={more} locale={locale} />
        </Section>
      )}
    </>
  );
}
