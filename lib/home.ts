/* The home is the story (krizaka-blog#123): one sentence, one Featured card (the newest published piece — chapter or post —
   by publishedTime), then every chapter in reading order 1 → N. When a post is Featured, every chapter stays in the list.
   Pure, tested in tests/home.test.mjs. */
import { publishedTime } from "./reading.ts";

export type StoryChapter = {
  slug: string;
  chapter: number;
  title: string;
  date: string;
  publishedAt?: string;
  period: string;
  versus: { faced: string; built: string };
};
export type StoryRow<C extends StoryChapter = StoryChapter> = { chapter: C; isNew: boolean };

type Dated = { slug: string; publishedAt?: string; date?: string };

/** The latest chapter: the one that went out last (`publishedAt`, then `date`); of two out at the same minute, the later in the story. */
export function latestChapter<C extends StoryChapter>(chapters: readonly C[]): C | undefined {
  return [...chapters].sort((a, b) => publishedTime(b) - publishedTime(a) || b.chapter - a.chapter)[0];
}

/** The Featured item: the newest published piece among chapters and posts by publishedTime.
    Of two items at the same millisecond, a chapter wins (by its number, descending). */
export function latestFeatured<C extends StoryChapter, P extends Dated>(
  chapters: readonly C[],
  posts: readonly P[],
): { kind: "chapter"; item: C } | { kind: "post"; item: P } | undefined {
  const all: Array<{ kind: "chapter"; item: C } | { kind: "post"; item: P }> = [
    ...chapters.map((item) => ({ kind: "chapter" as const, item })),
    ...posts.map((item) => ({ kind: "post" as const, item })),
  ];
  return all.sort((a, b) => {
    const dt = publishedTime(b.item) - publishedTime(a.item);
    if (dt !== 0) return dt;
    if (a.kind === "chapter" && b.kind === "chapter") return b.item.chapter - a.item.chapter;
    return a.kind === "chapter" ? -1 : 1;
  })[0];
}

/** Every chapter in reading order (newest first by number), excluding the Featured chapter when one is explicitly given.
    When a post is Featured (excluded is undefined), every chapter stays in the list. */
export function storyRows<C extends StoryChapter>(chapters: readonly C[], excluded?: C): StoryRow<C>[] {
  // Oussama (2026-10-24): the newest is Featured, and the others go down below it, newest first by chapter number.
  return [...chapters]
    .filter((c) => c !== excluded)
    .sort((a, b) => b.chapter - a.chapter)
    .map((chapter) => ({ chapter, isNew: false }));
}
