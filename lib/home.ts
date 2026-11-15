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
/** `shown` is the one date a row displays: the chapter's front-matter `date`, never its `period` (krizaka-internal#3906). */
export type StoryRow<C extends StoryChapter = StoryChapter> = { chapter: C; isNew: boolean; shown: string };

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
  all.sort((a, b) => {
    const dt = publishedTime(b.item) - publishedTime(a.item);
    if (dt !== 0) return dt;
    if (a.kind === "chapter" && b.kind === "chapter") return b.item.chapter - a.item.chapter;
    return a.kind === "chapter" ? -1 : 1;
  });
  return all[0];
}

/** Every chapter, newest first by `publishedAt` (then `date`; of two out together, the later in the story), excluding the
    Featured chapter when one is explicitly given. Each row shows its front-matter date, the very one it is ordered by
    (krizaka-internal#3906: a period overlaps its neighbours and made the list read out of order). */
export function storyRows<C extends StoryChapter>(chapters: readonly C[], excluded?: C): StoryRow<C>[] {
  return [...chapters]
    .filter((c) => c !== excluded)
    .sort((a, b) => publishedTime(b) - publishedTime(a) || b.chapter - a.chapter)
    .map((chapter) => ({ chapter, isNew: false, shown: chapter.date }));
}

/** The posts newest first by `publishedAt` (then `date`); ties by slug. */
export function postsNewestFirst<P extends Dated>(posts: readonly P[]): P[] {
  return [...posts].sort((a, b) => publishedTime(b) - publishedTime(a) || a.slug.localeCompare(b.slug));
}
