// WHY  The story's chapters have rules of their own on top of a post's (number, period, sources, stats, both languages).
// WHAT `chapterProblems` and `checkChapters` (every chapter, then the story as a whole).
// HOW  Imported by scripts/content-rules.mjs (and scripts/check-content.mjs through it); nothing to run. Tests: tests/chapters.test.mjs.
// OWNER krizaka-blog (lane platform), ADR-026 phase D.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { internalLinkProblems } from "./content-links.mjs";
import { FILE } from "./content-names.mjs";
import { blank, postProblems } from "./content-post.mjs";

/** The story's chapters (content/chapters/<slug>.<en|fr>.mdx, lib/chapters.ts). */
export const CHAPTER_PERIOD = /^\d{4}-\d{2}-\d{2}(\/\d{4}-\d{2}-\d{2})?$/;
const isCalendarDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const addKnownRoute = (known, key, draft) => known.set(key, known.has(key) && known.get(key) === false ? false : draft);

export const CHAPTER_STATS_MAX = 4;

/** The spaces and line breaks of `\s`, and the line terminators that `.` does not cross. */
const isSpace = (ch) => /\s/.test(ch);
const LINE_TERMINATOR = /[\r\u2028\u2029]/;

/** The text of an h2 line (`## Title`), exactly as /^##\s+(.+?)\s*$/ reads it, or null. Read without that regex: its
    `\s+(.+?)\s*$` backtracks (super-linear on a long line of spaces). */
export function h2Text(line) {
  if (!line.startsWith("##") || !isSpace(line[2] ?? "")) return null;
  const rest = line.slice(2);
  const text = rest.trim();
  if (text) return LINE_TERMINATOR.test(text) ? null : text;
  // A heading of spaces only: the regex keeps one space, the last one that is not a line terminator, after at least one other.
  for (let k = rest.length - 1; k >= 1; k--) if (!LINE_TERMINATOR.test(rest[k])) return rest[k];
  return null;
}

/** The h2s of an MDX body (outside code fences), as written: what a stat's `section` names. */
const h2Texts = (body) => {
  let fence = false;
  const out = [];
  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const text = fence ? null : h2Text(line);
    if (text !== null) out.push(text);
  }
  return out;
};

const hasText = (value) => typeof value === "string" && value.trim() !== "";
/** A figure as the text writes it: 12, 3.5, 1,200. */
const NUMBER = /\d+(?:[.,]\d+)?/g;

const numberProblems = (file, data) =>
  Number.isInteger(data.chapter) && data.chapter >= 1
    ? []
    : [`${file}: "chapter" must be a whole number from 1 (its place in the story)`];

function periodProblems(file, data) {
  if (!CHAPTER_PERIOD.test(String(data.period ?? "")))
    return [
      `${file}: "period" must be YYYY-MM-DD or YYYY-MM-DD/YYYY-MM-DD (quoted): the dates of the posts it absorbs`,
    ];
  const [from, to] = String(data.period).split("/");
  if (!isCalendarDate(from) || (to && !isCalendarDate(to)))
    return [`${file}: "period" must contain real calendar dates`];
  if (to && to < from) return [`${file}: "period" ends before it starts`];
  return [];
}

const placeProblems = (file, data) =>
  data.series !== undefined || data.part !== undefined
    ? [`${file}: a chapter has no "series" or "part" — "chapter" is its place`]
    : [];

/* krizaka-blog#280: the build's meta check renders drafts too, so a draft chapter without a cover was red only in CI. Lint says it first. */
function draftCoverProblems(file, data) {
  if (data.draft !== true) return [];
  if (!data.cover)
    return [
      `${file}: a chapter needs a "cover", even as a draft (the build's meta check renders drafts): render it with ` +
        `python3 scripts/render-image-series.py --worker <sovkora-worker-media> --anchor <brand picture> --out <name> --only <chapter> ` +
        `(docs/image-series.md), make its renditions with scripts/prepare-series-covers.mjs, then set "cover" and "coverAlt"`,
    ];
  if (blank(data.coverAlt)) return [`${file}: a chapter needs "coverAlt", even as a draft: the words of its cover`];
  return [];
}

function sourceProblems(file, data, locale, postSlugs) {
  if (!Array.isArray(data.sources) || data.sources.length === 0)
    return [`${file}: "sources" must list the slugs of the posts it is written from`];
  return data.sources
    .filter((s) => !postSlugs.has(`${locale}:${s}`))
    .map((s) => `${file}: source "${s}" is not a post of content/posts in this language`);
}

const versusProblems = (file, data) =>
  ["faced", "built"]
    .filter((k) => !hasText(data.versus?.[k]))
    .map((k) => `${file}: "versus.${k}" is required (the head's label, from the chapter's own text)`);

/* Only figures the text already gives: every number of the value is in the body; its section is an h2 of the chapter. */
function statProblems(file, stat, bodyNumbers, sections) {
  if (!(hasText(stat?.value) && hasText(stat.label)))
    return [`${file}: every stat needs a "value" and a "label" (text)`];
  const out = (stat.value.match(NUMBER) ?? [])
    .filter((num) => !bodyNumbers.has(num))
    .map(
      (num) =>
        `${file}: the stat "${stat.value}" gives ${num}, which the body does not — only figures the chapter already gives`,
    );
  if (!sections.includes(stat.section))
    out.push(
      `${file}: the stat "${stat.value}" names the section ${JSON.stringify(stat.section)}, which is not an h2 of the chapter`,
    );
  return out;
}

function statsProblems(file, data, body) {
  if (data.stats === undefined) return [];
  if (!Array.isArray(data.stats)) return [`${file}: "stats" must be a list`];
  const out = data.stats.length > CHAPTER_STATS_MAX ? [`${file}: at most ${CHAPTER_STATS_MAX} stats`] : [];
  const sections = h2Texts(body);
  const bodyNumbers = new Set(body.match(NUMBER) ?? []);
  for (const stat of data.stats) out.push(...statProblems(file, stat, bodyNumbers, sections));
  return out;
}

/** The problems of one chapter: a post's rules (cover, publishedAt, confidentiality, <Model>, media…), plus the story's
    fields. `postSlugs` is the set of `<locale>:<slug>` of content/posts, which every source must be in. */
export function chapterProblems(file, data, body, ctx, postSlugs) {
  const out = postProblems(file, data, body, ctx);
  const m = file.match(FILE);
  if (!m) return out;
  const locale = m[2];
  return [
    ...out,
    ...numberProblems(file, data),
    ...periodProblems(file, data),
    ...placeProblems(file, data),
    ...draftCoverProblems(file, data),
    ...sourceProblems(file, data, locale, postSlugs),
    ...versusProblems(file, data),
    ...statsProblems(file, data, body),
  ];
}

const readMdx = (d) =>
  readdirSync(d)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => ({ file: f, ...matter(readFileSync(join(d, f), "utf8")) }));

/** The `<locale>:<slug>` a source may name: every post, and the posts a chapter absorbed (retired in lib/redirects.json,
    not gone from the story). */
function sourceSlugs(posts) {
  const postSlugs = new Set();
  for (const slug of Object.keys(JSON.parse(readFileSync(new URL("../lib/redirects.json", import.meta.url), "utf8"))))
    for (const locale of ["en", "fr"]) postSlugs.add(`${locale}:${slug}`);
  for (const p of posts) {
    const m = p.file.match(FILE);
    if (m) postSlugs.add(`${m[2]}:${m[1]}`);
  }
  return postSlugs;
}

/** The pages an internal link may reach (`posts:<locale>:<slug>`, `story:<locale>:<slug>`), each with whether it is a draft. */
function knownRoutes(posts, chapters) {
  const known = new Map();
  for (const p of posts) {
    const m = p.file.match(FILE);
    if (m) addKnownRoute(known, `posts:${m[2]}:${m[1]}`, p.data.draft === true);
  }
  for (const c of chapters) {
    const m = c.file.match(FILE);
    if (m) addKnownRoute(known, `story:${m[2]}:${m[1]}`, c.data.draft === true);
  }
  return known;
}

/** Each chapter in both languages with the same slug, number, period and sources. */
function bothLanguagesProblems(chapters) {
  const bySlug = new Map();
  for (const c of chapters) {
    const m = c.file.match(FILE);
    if (m) bySlug.set(m[1], { ...bySlug.get(m[1]), [m[2]]: c.data });
  }
  const problems = [];
  for (const [slug, langs] of bySlug) {
    if (!langs.en || !langs.fr) {
      problems.push(`chapter ${slug}: it must exist in both languages (${slug}.en.mdx and ${slug}.fr.mdx)`);
      continue;
    }
    for (const k of ["chapter", "period", "sources"])
      if (JSON.stringify(langs.en[k]) !== JSON.stringify(langs.fr[k]))
        problems.push(`chapter ${slug}: "${k}" differs between EN and FR`);
  }
  return problems;
}

/** The numbers of a language run from 1 without a gap or a repeat. */
function numberingProblems(chapters) {
  const problems = [];
  for (const locale of ["en", "fr"]) {
    const nums = chapters
      .filter((c) => c.file.endsWith(`.${locale}.mdx`))
      .map((c) => c.data.chapter)
      .sort((a, b) => a - b);
    nums.forEach((n, i) => {
      if (n !== i + 1)
        problems.push(
          `chapters (${locale}): the numbers must run 1, 2, 3… without a gap or a repeat (found ${nums.join(", ")})`,
        );
    });
  }
  return problems;
}

/** Every chapter: its own problems, then the story as a whole — each chapter in both languages with the same slug, number,
    period and sources; the numbers of a language run from 1 without a gap or a repeat; no dead internal link. */
export function checkChapters(dir, postsDir, ctx) {
  const posts = readMdx(postsDir);
  const chapters = readMdx(dir);
  const postSlugs = sourceSlugs(posts);
  const known = knownRoutes(posts, chapters);
  const problems = chapters.flatMap((c) => [
    ...chapterProblems(c.file, c.data, c.content, ctx, postSlugs),
    ...internalLinkProblems(c.file, c.content, known, c.data.draft === true),
  ]);
  problems.push(...bothLanguagesProblems(chapters), ...numberingProblems(chapters));
  return { files: chapters.map((c) => c.file), problems: [...new Set(problems)] };
}
