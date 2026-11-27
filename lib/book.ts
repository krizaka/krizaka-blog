/* The book around a post (krizaka-internal#3911): the chapter just before it and the one just after it, by when they went out
   (`publishedTime`, the same order as the story's home), so a shelf post still shows where it sits in the story. */
import type { Chapter } from "./chapters";
import { publishedTime } from "./reading.ts";

export function chaptersAround(
  post: { publishedAt?: string; date?: string },
  chapters: readonly Chapter[],
): { before?: Chapter; after?: Chapter } {
  const at = publishedTime(post);
  const byTime = [...chapters].sort((a, b) => publishedTime(a) - publishedTime(b) || a.chapter - b.chapter);
  return {
    before: byTime.findLast((c) => publishedTime(c) <= at),
    after: byTime.find((c) => publishedTime(c) > at),
  };
}
