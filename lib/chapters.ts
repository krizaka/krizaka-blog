/* The story's chapters: content/chapters/<slug>.<locale>.mdx, read at build. A chapter is a post's front matter (title,
   description, date, publishedAt, cover…) plus the story's own fields:
   - `chapter`: its place in the story (1, 2…), the same in both languages;
   - `period`: the dates of the posts it absorbs (`YYYY-MM-DD`, or `YYYY-MM-DD/YYYY-MM-DD`);
   - `sources`: the slugs of those posts (every paragraph is Oussama's own sentence from one of them);
   - `versus`: the two labels of its head, what I faced and what we built;
   - `stats`: at most four figures the body already gives, each with the heading of the section it comes from.
   A chapter lives at /story/<slug>/ (EN) and /fr/story/<slug>/ (FR); the rules are scripts/content-rules.mjs chapterProblems. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { LOCALES, type Locale } from "./i18n";
import { parsePost, type Post } from "./posts";
import { SHOW_DRAFTS } from "./site";

export type ChapterStat = { value: string; label: string; section: string };
export type Chapter = Post & {
  chapter: number;
  period: string;
  sources: string[];
  versus: { faced: string; built: string };
  stats: ChapterStat[];
};

const DIR = join(process.cwd(), "content", "chapters");

export function parseChapter(file: string, source: string): Chapter {
  const post = parsePost(file, source);
  const { data } = matter(source);
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    ...post,
    chapter: Number(data.chapter),
    period: str(data.period),
    sources: Array.isArray(data.sources) ? data.sources.map(String) : [],
    versus: { faced: str(data.versus?.faced), built: str(data.versus?.built) },
    stats: Array.isArray(data.stats) ? data.stats.map((s: Record<string, unknown>) => ({ value: str(s.value), label: str(s.label), section: str(s.section) })) : [],
  };
}

let cache: Chapter[] | undefined;

/** Every chapter of the build, drafts included only in a preview, in the story's order. */
export function allChapters(): Chapter[] {
  if (cache) return cache;
  const files = readdirSync(DIR).filter((f) => f.endsWith(".mdx"));
  cache = files
    .map((f) => parseChapter(f, readFileSync(join(DIR, f), "utf8")))
    .filter((c) => SHOW_DRAFTS || !c.draft)
    .sort((a, b) => a.chapter - b.chapter || a.locale.localeCompare(b.locale));
  return cache;
}

export const chaptersOf = (locale: Locale): Chapter[] => allChapters().filter((c) => c.locale === locale);
export const chapterOf = (locale: Locale, slug: string): Chapter | undefined => chaptersOf(locale).find((c) => c.slug === slug);
export const chapterTranslationOf = (c: Chapter): Chapter | undefined => chapterOf(LOCALES.find((l) => l !== c.locale)!, c.slug);
/** The chapter that follows one in its language (« Continuer ? »), when it is out. */
export const nextChapter = (c: Chapter): Chapter | undefined => chaptersOf(c.locale).find((x) => x.chapter > c.chapter);
/** A chapter's number as the screens show it: 01, 02… */
export const chapterNumber = (n: number): string => String(n).padStart(2, "0");
