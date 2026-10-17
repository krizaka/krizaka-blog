/* The posts: content/posts/<slug>.<locale>.mdx, read at build. A post is a front-matter block (title, description, date,
   tags, author, draft, image) and an MDX body. A draft is not in the build (APP_SHOW_DRAFTS=1 shows it in a local
   preview). A post may exist in one language only; when both exist they share the slug and name each other (hreflang). */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { LOCALES, type Locale } from "./i18n";
import { SHOW_DRAFTS } from "./site";

export type Post = {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  /** The title tag when the h1 is too long for a search result (≤ 60 characters, tests/reading.test.mjs). */
  seoTitle?: string;
  /** The meta description when the lead is too long for a search result (≤ 155 characters). */
  seoDescription?: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  updated?: string;
  tags: string[];
  author: string;
  draft: boolean;
  /** An absolute https URL on the media CDN (`blog/…`), never a file of this repository. */
  image?: string;
  /** A media id of the library (`lib/media.json`): the post's picture on the home, the cards and the post (a clip shows its poster). */
  cover?: string;
  /** Shown first on the home when it is the newest featured post. */
  featured: boolean;
  /** The series it belongs to (an id of `series.names` in the messages) and its place in it. */
  series?: string;
  part?: number;
  body: string;
  readingMinutes: number;
};

const DIR = join(process.cwd(), "content", "posts");
const FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(en|fr)\.mdx$/;

export const readingMinutes = (body: string): number => Math.max(1, Math.ceil(body.split(/\s+/).filter(Boolean).length / 220));

export function parsePost(file: string, source: string): Post {
  const m = file.match(FILE);
  if (!m) throw new Error(`content/posts/${file}: the name must be <slug>.<en|fr>.mdx`);
  const { data, content } = matter(source);
  const need = (k: string) => {
    const v = data[k];
    if (typeof v !== "string" || !v.trim()) throw new Error(`content/posts/${file}: "${k}" is required`);
    return v.trim();
  };
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : need("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`content/posts/${file}: "date" must be YYYY-MM-DD`);
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  return {
    slug: m[1],
    locale: m[2] as Locale,
    title: need("title"),
    description: need("description"),
    seoTitle: typeof data.seoTitle === "string" && data.seoTitle.trim() ? data.seoTitle.trim() : undefined,
    seoDescription: typeof data.seoDescription === "string" && data.seoDescription.trim() ? data.seoDescription.trim() : undefined,
    date,
    updated: data.updated ? (data.updated instanceof Date ? data.updated.toISOString().slice(0, 10) : String(data.updated)) : undefined,
    tags,
    author: typeof data.author === "string" ? data.author : "krizaka",
    draft: data.draft === true,
    cover: typeof data.cover === "string" && data.cover ? data.cover : undefined,
    featured: data.featured === true,
    series: typeof data.series === "string" && data.series ? data.series : undefined,
    part: typeof data.part === "number" ? data.part : undefined,
    image: typeof data.image === "string" && data.image ? data.image : undefined,
    body: content,
    readingMinutes: readingMinutes(content),
  };
}

let cache: Post[] | undefined;

/** Every post of the build, drafts included only in a preview, newest first. */
export function allPosts(): Post[] {
  if (cache) return cache;
  const files = readdirSync(DIR).filter((f) => f.endsWith(".mdx"));
  cache = files
    .map((f) => parsePost(f, readFileSync(join(DIR, f), "utf8")))
    .filter((p) => SHOW_DRAFTS || !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return cache;
}

export const postsOf = (locale: Locale): Post[] => allPosts().filter((p) => p.locale === locale);
export const postOf = (locale: Locale, slug: string): Post | undefined => postsOf(locale).find((p) => p.slug === slug);
export const translationOf = (post: Post): Post | undefined => {
  const other = LOCALES.find((l) => l !== post.locale)!;
  return postOf(other, post.slug);
};

export const tagSlug = (tag: string): string => tag.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The tags of a language with the posts that wear them, most used first. */
export function tagsOf(locale: Locale): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of postsOf(locale)) for (const t of p.tags.map(tagSlug)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
export const postsWithTag = (locale: Locale, tag: string): Post[] => postsOf(locale).filter((p) => p.tags.map(tagSlug).includes(tag));

/** A plain-text version of an MDX body (search index, feeds' summaries): no markup, no code fences. */
export const plainText = (body: string): string =>
  body.replace(/```[\s\S]*?```/g, " ").replace(/<[^>]+>/g, " ").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`|~-]+/g, " ").replace(/\s+/g, " ").trim();

/** The series of a language with their posts in reading order (`part`, then date). */
export function seriesOf(locale: Locale): { series: string; posts: Post[] }[] {
  const by = new Map<string, Post[]>();
  for (const p of postsOf(locale)) if (p.series) by.set(p.series, [...(by.get(p.series) ?? []), p]);
  return [...by].map(([series, posts]) => ({ series, posts: posts.sort((a, b) => (a.part ?? 99) - (b.part ?? 99) || a.date.localeCompare(b.date)) })).sort((a, b) => b.posts.length - a.posts.length || a.series.localeCompare(b.series));
}
export const postsInSeries = (locale: Locale, series: string): Post[] => seriesOf(locale).find((s) => s.series === series)?.posts ?? [];

/** The posts closest to one: same series first, then shared topics (most shared first), then the newest. Never the post itself. */
export function relatedPosts(post: Post, limit = 3): Post[] {
  const mine = new Set(post.tags.map(tagSlug));
  return postsOf(post.locale)
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, score: (p.series && p.series === post.series ? 10 : 0) + p.tags.map(tagSlug).filter((t) => mine.has(t)).length }))
    .sort((a, b) => b.score - a.score || b.p.date.localeCompare(a.p.date))
    .slice(0, limit)
    .map((x) => x.p);
}

/** The post the home puts first: the newest featured one, else the newest with a cover. */
export function featuredPost(locale: Locale): Post | undefined {
  const posts = postsOf(locale);
  return posts.find((p) => p.featured && p.cover) ?? posts.find((p) => p.cover) ?? posts[0];
}
