import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";
import { storyOf, threadsOf, weekStart } from "../lib/story.ts";

/* « The Krizaka story »: the timeline is read from the posts' front matter, never typed. */

const fixtures = [
  { slug: "c", title: "C", description: "Line C", date: "2026-10-21", publishedAt: "2026-10-21T09:00:00-04:00", series: "building-orazaka", part: 7, cover: "cc" },
  { slug: "a", title: "A", description: "Line A", date: "2026-10-16", publishedAt: "2026-10-16T21:44:17-04:00", series: "measured", part: 1, cover: "ca" },
  { slug: "b", title: "B", description: "Line B", date: "2026-10-16", publishedAt: "2026-10-16T22:00:00-04:00", series: "building-orazaka", part: 1 },
  { slug: "d", title: "D", description: "Line D", date: "2026-10-23", publishedAt: "2026-10-23T08:00:00-04:00" },
  { slug: "x", title: "Draft", description: "Hidden", date: "2026-10-22", draft: true },
];

test("a week opens on its Monday", () => {
  assert.equal(weekStart("2026-10-16"), "2026-10-12");
  assert.equal(weekStart("2026-10-18"), "2026-10-12");
  assert.equal(weekStart("2026-10-19"), "2026-10-19");
});

test("the periods are weeks, oldest first; the steps keep the order they went out; a draft is not in the story", () => {
  const periods = storyOf(fixtures);
  assert.deepEqual(periods.map((p) => [p.start, p.end]), [["2026-10-12", "2026-10-18"], ["2026-10-19", "2026-10-25"]]);
  assert.deepEqual(periods.map((p) => p.steps.map((s) => s.slug)), [["a", "b"], ["c", "d"]]);
  assert.ok(!periods.flatMap((p) => p.steps).some((s) => s.slug === "x"));
});

test("a step carries the post's own date, lead, cover and thread", () => {
  const [step] = storyOf(fixtures)[0].steps;
  assert.deepEqual(step, { slug: "a", title: "A", description: "Line A", date: "2026-10-16", thread: "measured", cover: "ca" });
});

test("the threads are the series, in order of first appearance, with their step counts", () => {
  assert.deepEqual(threadsOf(storyOf(fixtures)), [{ thread: "measured", count: 1 }, { thread: "building-orazaka", count: 2 }]);
});

test("a new post appears by itself, in its own week", () => {
  const periods = storyOf([...fixtures, { slug: "n", title: "N", description: "New", date: "2026-11-03" }]);
  assert.equal(periods.length, 3);
  assert.equal(periods[2].start, "2026-11-02");
  assert.deepEqual(storyOf([]), []);
});

test("every real post is a step of the story, in both languages", () => {
  const dir = new URL("../content/posts/", import.meta.url);
  for (const locale of ["en", "fr"]) {
    const posts = readdirSync(dir).filter((f) => f.endsWith(`.${locale}.mdx`)).map((f) => {
      const d = matter(readFileSync(new URL(f, dir), "utf8")).data;
      return { slug: f.replace(`.${locale}.mdx`, ""), title: d.title, description: d.description, date: d.date instanceof Date ? d.date.toISOString().slice(0, 10) : d.date, publishedAt: d.publishedAt instanceof Date ? d.publishedAt.toISOString() : d.publishedAt, series: d.series, part: d.part, cover: d.cover, draft: d.draft === true };
    });
    const steps = storyOf(posts).flatMap((p) => p.steps);
    assert.equal(steps.length, posts.filter((p) => !p.draft).length);
  }
});

test("the story page is linked from the home and the series, and sits in the sitemap", () => {
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  assert.match(read("app/components/pages/HomePage.tsx"), /localizedPath\(locale, "\/story"\)/);
  assert.match(read("app/components/pages/SeriesPage.tsx"), /localizedPath\(locale, "\/story"\)/);
  assert.match(read("app/sitemap.ts"), /"\/story"/);
});
