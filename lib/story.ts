/* « The Krizaka story »: the company's path in time, read from the posts' front matter (date, series, part, cover, description),
   never typed. Posts are grouped by week (the Monday that opens it), oldest first; a post's thread is its series. A new post
   appears by itself. */
import { publishedTime } from "./reading.ts";

export type StoryPost = { slug: string; title: string; description: string; date: string; publishedAt?: string; series?: string; part?: number; cover?: string; draft?: boolean };
export type StoryStep = { slug: string; title: string; description: string; date: string; thread?: string; cover?: string };
export type StoryPeriod = { id: string; start: string; end: string; steps: StoryStep[] };

const DAY = 86_400_000;
const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** The Monday of the week a date (YYYY-MM-DD) is in. */
export function weekStart(date: string): string {
  const ms = Date.parse(`${date}T00:00:00Z`);
  return iso(ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY);
}

/** The published posts as periods, oldest first; in a period the steps keep the order they went out (`publishedAt`, then series part, then slug). */
export function storyOf(posts: readonly StoryPost[]): StoryPeriod[] {
  const by = new Map<string, StoryPost[]>();
  for (const p of posts) if (!p.draft) by.set(weekStart(p.date), [...(by.get(weekStart(p.date)) ?? []), p]);
  return [...by]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([start, list]) => {
      const steps = list
        .sort((a, b) => publishedTime(a) - publishedTime(b) || (a.part ?? 99) - (b.part ?? 99) || a.slug.localeCompare(b.slug))
        .map(({ slug, title, description, date, series, cover }) => ({ slug, title, description, date, thread: series, cover }));
      return { id: `week-${start}`, start, end: iso(Date.parse(`${start}T00:00:00Z`) + 6 * DAY), steps };
    });
}

/** The threads of a story (series ids) in order of first appearance, with how many steps each has. */
export function threadsOf(periods: readonly StoryPeriod[]): { thread: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of periods.flatMap((p) => p.steps)) if (s.thread) counts.set(s.thread, (counts.get(s.thread) ?? 0) + 1);
  return [...counts].map(([thread, count]) => ({ thread, count }));
}
