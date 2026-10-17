/* What a post page derives from a post, as plain functions (no framework, no alias: the tests import this file directly).
   - its table of contents: the h2s of the MDX body, with the ids rehype-slug writes (github-slugger, same order);
   - its neighbours in a series;
   - the title tag and the meta description the search engines read (a post may give shorter ones than its h1 and lead). */
import GithubSlugger from "github-slugger";

export type Heading = { id: string; text: string };

/** The words of a Markdown heading as rendered: links keep their text, code and emphasis marks go. */
const headingText = (raw: string): string =>
  raw
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__|\*|_)(.+?)\1/g, "$2")
    .split(/[<>]/)
    .filter((_, i) => i % 2 === 0)
    .join("")
    .trim();

/** The h2s of an MDX body, in order, with their anchors. Headings inside code fences are not headings. */
export function headingsOf(body: string): Heading[] {
  const slugger = new GithubSlugger();
  const out: Heading[] = [];
  let fence = false;
  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = headingText(m[2]);
    const id = slugger.slug(text);
    if (m[1].length === 2) out.push({ id, text });
  }
  return out;
}

/** The parts before and after one in a reading order. */
export function neighbours<T extends { slug: string }>(list: readonly T[], slug: string): { prev?: T; next?: T } {
  const at = list.findIndex((p) => p.slug === slug);
  if (at < 0) return { prev: undefined, next: undefined };
  return { prev: list[at - 1], next: list[at + 1] };
}

/** What search engines show in full: longer titles and descriptions are cut in the results. */
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

/** The title tag of a post: its `seoTitle` when it has one, else its title followed by the blog's name. */
export const titleTag = (p: { title: string; seoTitle?: string }, siteName: string): string => p.seoTitle?.trim() || `${p.title} — ${siteName}`;

/** The meta description of a post: its `seoDescription` when it has one, else its lead. */
export const metaDescription = (p: { description: string; seoDescription?: string }): string => p.seoDescription?.trim() || p.description;


/** When a post went out: its `publishedAt` (date, time and offset), so posts of the same day keep their order. */
export const publishedTime = (p: { publishedAt?: string; date?: string }): number => Date.parse(p.publishedAt ?? `${p.date ?? "1970-01-01"}T12:00:00Z`);

/** The posts the home puts first: pinned ones (`featured: true`) newest first, then the others newest first; ties by slug. */
export function featuredOrder<T extends { slug: string; featured?: boolean; publishedAt?: string; date?: string }>(posts: readonly T[], count = 3): T[] {
  const newest = (a: T, b: T) => publishedTime(b) - publishedTime(a) || a.slug.localeCompare(b.slug);
  return [...posts.filter((p) => p.featured).sort(newest), ...posts.filter((p) => !p.featured).sort(newest)].slice(0, count);
}
