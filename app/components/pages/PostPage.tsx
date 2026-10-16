import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { PageHero } from "@krizaka/ui/page-hero";
import { Section } from "@krizaka/ui/page";
import { ChipLink } from "@krizaka/ui/chip-link";
import { format, getDictionary, localizedPath, type Locale } from "@/lib/i18n";
import { postsOf, tagSlug, translationOf, type Post } from "@/lib/posts";
import { postJsonLd } from "@/lib/seo";
import { PostList, formatDate } from "./PostList";
import { tagLabel } from "./tag-label";
import { mdxComponents } from "./mdx";

/* One post: the hero (back link, topics, title, summary, date · author · reading time), the cover, the body, the other
   language when it exists, and the next posts. */
export default function PostPage({ post }: { post: Post }) {
  const { locale } = post;
  const t = getDictionary(locale);
  const other = translationOf(post);
  const author = (t.authors as Record<string, string>)[post.author] ?? post.author;
  const more = postsOf(locale).filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd(post)) }} />
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
      </PageHero>
      <Section reveal={false}>
        <article className="bl-article">
          {post.draft && <p className="bl-draft">{t.post.draftNotice}</p>}
          {post.image && <img className="bl-cover" src={post.image} alt="" width={1200} height={630} />}
          <div className="bl-prose">
            <MDXRemote source={post.body} components={mdxComponents} options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } }} />
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
        </article>
      </Section>
      {more.length > 0 && (
        <Section title={t.post.moreTitle} divider>
          <PostList posts={more} locale={locale} />
        </Section>
      )}
    </>
  );
}
