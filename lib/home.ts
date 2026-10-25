/* The home is the story (krizaka-blog#123): one sentence, one Featured card (the latest chapter), then every chapter in reading
   order, 1 → N, the latest marked « New ». A timeline you follow, never a feed: the order is the chapters' own numbers, not their
   dates. Pure, read from the chapters' front matter (lib/chapters.ts), tested in tests/home.test.mjs. */
import { publishedTime } from "./reading.ts";

export type StoryChapter = { slug: string; chapter: number; title: string; date: string; publishedAt?: string; period: string; versus: { faced: string; built: string } };
export type StoryRow<C extends StoryChapter = StoryChapter> = { chapter: C; isNew: boolean };

/** The latest chapter: the one that went out last (`publishedAt`, then `date`); of two out at the same minute, the later in the story. */
export function latestChapter<C extends StoryChapter>(chapters: readonly C[]): C | undefined {
  return [...chapters].sort((a, b) => publishedTime(b) - publishedTime(a) || b.chapter - a.chapter)[0];
}

/** Every chapter in reading order (1 → N), the latest one marked new. */
export function storyRows<C extends StoryChapter>(chapters: readonly C[]): StoryRow<C>[] {
  // Oussama (2026-10-24): the newest is Featured, and the others go down below it, newest first: when a new chapter comes out it
  // takes the Featured place and the previous one moves down into the list. Featured is never repeated in the list.
  const latest = latestChapter(chapters);
  return [...chapters].filter((c) => c !== latest).sort((a, b) => b.chapter - a.chapter).map((chapter) => ({ chapter, isNew: false }));
}
