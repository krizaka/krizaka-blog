import { jsonLd } from "@/lib/json-ld";
import { blurUrl } from "@/lib/blur";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { ChipLink } from "@krizaka/ui/chip-link";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { coverOf } from "@/lib/media";
import { postsInSeries, relatedPosts, tagSlug, translationOf, type Post } from "@/lib/posts";
import { postJsonLd } from "@/lib/seo";
import { PostList, formatDate } from "./PostList";
import { tagLabel } from "./tag-label";
import { mdxComponentsFor } from "./mdx";
import { seriesName } from "./SeriesPage";
import { PostEngage } from "../engage/PostEngage";
import { SaveButton } from "../engage/SaveButton";

/* One post: the hero (back link, topics, title, summary, date · author · reading time), the cover, the body, the other
   language when it exists, and the next posts. */
export default function PostPage({ post }: { post: Post }) {
  const { locale } = post;
  const t = getDictionary(locale);
  const other = translationOf(post);
  const author = (t.authors as Record<string, string>)[post.author] ?? post.author;
  const more = relatedPosts(post, 3);
  const inSeries = post.series ? postsInSeries(locale, post.series) : [];
  const at = inSeries.findIndex((p) => p.slug === post.slug);
  const cover = post.cover ? coverOf(post.cover) : undefined;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(postJsonLd(post)) }} />
      <PageHero
        back={{ href: localizedPath(locale, "/"), label: t.post.back }}
        linkAs={Link}
        eyebrow={`${formatDate(post.date, locale)} · ${format(t.post.readingTime, { minutes: String(post.readingMinutes) })}`}
        title={post.title}
        lead={post.description}
        backdrop="plain"
      >
        <p className="bl-meta">
          <span>{format(t.post.by, { author })}</span>
          {post.updated && <span>{format(t.post.updated, { date: formatDate(post.updated, locale) })}</span>}
          {other && (
            <Link href={localizedPath(other.locale, `/posts/${other.slug}`)} hrefLang={other.locale} lang={other.locale} title={t.post.otherLabel}>
              {t.post.readInOther}
            </Link>
          )}
        </p>
        <div className="bl-hero-actions">
          <SaveButton slug={post.slug} />
        </div>
      </PageHero>
      <Section reveal={false}>
        <article className="bl-article">
          {post.draft && <p className="bl-draft">{t.post.draftNotice}</p>}
          {cover ? (
            <img className="bl-cover bl-img" src={cover.src} srcSet={cover.srcSet} sizes="(min-width: 48rem) 704px, calc(100vw - 32px)" width={cover.width} height={cover.height} alt="" fetchPriority="high" decoding="async" style={{ backgroundImage: blurUrl(cover.blur) }} />
          ) : (
            post.image && <img className="bl-cover" src={post.image} alt="" width={1200} height={630} />
          )}
          {post.series && inSeries.length > 1 && (
            <nav className="bl-series" aria-label={seriesName(locale, post.series)}>
              <p className="bl-series-title">
                <Link href={localizedPath(locale, `/series/${post.series}`)}>{seriesName(locale, post.series)}</Link> · {format(t.post.seriesPart, { part: String(at + 1) })}
              </p>
              <ol>
                {inSeries.map((p) => (
                  <li key={p.slug} aria-current={p.slug === post.slug ? "page" : undefined}>
                    {p.slug === post.slug ? p.title : <Link href={localizedPath(locale, `/posts/${p.slug}`)}>{p.title}</Link>}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className="bl-prose">
            <MDXRemote source={post.body} components={mdxComponentsFor(locale)} options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } }} />
          </div>
          {post.tags.length > 0 && (
            <ul className="bl-tags" aria-label={t.post.topics} style={{ marginTop: "2.5rem" }}>
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
            <Link href={`${locale === "en" ? "" : "/fr"}/feed.xml`}>{t.post.share}</Link>
          </p>
        </article>
      </Section>
      {more.length > 0 && (
        <Section title={t.post.related} divider>
          <PostList posts={more} locale={locale} />
        </Section>
      )}
    </>
  );
}
