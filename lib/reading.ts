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

export type Faq = { question: string; answer: string };
/** The headings that open a post's questions section: its h3s are the questions, the text under each one its answer. */
export const FAQ_HEADING = /^(questions fréquentes|foire aux questions|faq|frequently asked questions)\b/i;

/** Tags out until none is left (a tag cut in two, `<<b>b>`, is removed whole), then any stray angle bracket. */
function withoutTags(raw: string): string {
  let text = raw;
  let previous: string;
  do {
    previous = text;
    text = text.replace(/<[^<>]*>/g, "");
  } while (text !== previous);
  return text.replace(/[<>]/g, "");
}

/** The words of a Markdown/MDX passage as a reader sees them: links and <Model> keep their text, marks and tags go. */
const plainText = (raw: string): string =>
  withoutTags(raw.replace(/<Model\b[^>]*>([\s\S]*?)<\/Model>/g, "$1").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1"))
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__|\*|_)(.+?)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();

/** The questions and answers of a post (the h3s under its « Questions fréquentes » / « FAQ » h2), for FAQPage JSON-LD;
    empty when the post has no such section. */
export function faqOf(body: string): Faq[] {
  const out: Faq[] = [];
  let inFaq = false;
  let fence = false;
  let current: { question: string; lines: string[] } | undefined;
  const flush = () => {
    if (current && current.lines.join("").trim()) out.push({ question: plainText(current.question), answer: plainText(current.lines.join("\n")) });
    current = undefined;
  };
  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const h = fence ? null : line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (h && h[1] === "##") {
      flush();
      inFaq = FAQ_HEADING.test(headingText(h[2]));
      continue;
    }
    if (!inFaq) continue;
    if (h && h[1] === "###") {
      flush();
      current = { question: headingText(h[2]), lines: [] };
      continue;
    }
    current?.lines.push(line);
  }
  flush();
  return out;
}
