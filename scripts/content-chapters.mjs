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

/** The h2s of an MDX body (outside code fences), as written: what a stat's `section` names. */
const h2Texts = (body) => {
  let fence = false;
  const out = [];
  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const m = !fence && line.match(/^##\s+(.+?)\s*$/);
    if (m) out.push(m[1]);
  }
  return out;
};

/** The problems of one chapter: a post's rules (cover, publishedAt, confidentiality, <Model>, media…), plus the story's
    fields. `postSlugs` is the set of `<locale>:<slug>` of content/posts, which every source must be in. */
export function chapterProblems(file, data, body, ctx, postSlugs) {
  const out = postProblems(file, data, body, ctx);
  const m = file.match(FILE);
  if (!m) return out;
  const locale = m[2];
  if (!Number.isInteger(data.chapter) || data.chapter < 1)
    out.push(`${file}: "chapter" must be a whole number from 1 (its place in the story)`);
  if (!CHAPTER_PERIOD.test(String(data.period ?? "")))
    out.push(
      `${file}: "period" must be YYYY-MM-DD or YYYY-MM-DD/YYYY-MM-DD (quoted): the dates of the posts it absorbs`,
    );
  else {
    const [from, to] = String(data.period).split("/");
    if (!isCalendarDate(from) || (to && !isCalendarDate(to)))
      out.push(`${file}: "period" must contain real calendar dates`);
    else if (to && to < from) out.push(`${file}: "period" ends before it starts`);
  }
  if (data.series !== undefined || data.part !== undefined)
    out.push(`${file}: a chapter has no "series" or "part" — "chapter" is its place`);
  /* krizaka-blog#280: the build's meta check renders drafts too, so a draft chapter without a cover was red only in CI. Lint says it first. */
  if (data.draft === true && !data.cover)
    out.push(
      `${file}: a chapter needs a "cover", even as a draft (the build's meta check renders drafts): render it with ` +
        `python3 scripts/render-image-series.py --worker <sovkora-worker-media> --anchor <brand picture> --out <name> --only <chapter> ` +
        `(docs/image-series.md), make its renditions with scripts/prepare-series-covers.mjs, then set "cover" and "coverAlt"`,
    );
  else if (data.draft === true && blank(data.coverAlt))
    out.push(`${file}: a chapter needs "coverAlt", even as a draft: the words of its cover`);
  if (!Array.isArray(data.sources) || data.sources.length === 0)
    out.push(`${file}: "sources" must list the slugs of the posts it is written from`);
  else
    for (const s of data.sources)
      if (!postSlugs.has(`${locale}:${s}`))
        out.push(`${file}: source "${s}" is not a post of content/posts in this language`);
  for (const k of ["faced", "built"])
    if (!(typeof data.versus?.[k] === "string" && data.versus[k].trim()))
      out.push(`${file}: "versus.${k}" is required (the head's label, from the chapter's own text)`);
  if (data.stats !== undefined) {
    if (!Array.isArray(data.stats)) out.push(`${file}: "stats" must be a list`);
    else {
      if (data.stats.length > CHAPTER_STATS_MAX) out.push(`${file}: at most ${CHAPTER_STATS_MAX} stats`);
      const sections = h2Texts(body);
      for (const s of data.stats) {
        if (!(typeof s?.value === "string" && s.value.trim() && typeof s.label === "string" && s.label.trim())) {
          out.push(`${file}: every stat needs a "value" and a "label" (text)`);
          continue;
        }
        /* Only figures the text already gives: every number of the value is in the body. */
        const bodyNumbers = new Set(body.match(/\d+(?:[.,]\d+)?/g) ?? []);
        for (const num of s.value.match(/\d+(?:[.,]\d+)?/g) ?? [])
          if (!bodyNumbers.has(num))
            out.push(
              `${file}: the stat "${s.value}" gives ${num}, which the body does not — only figures the chapter already gives`,
            );
        if (!sections.includes(s.section))
          out.push(
            `${file}: the stat "${s.value}" names the section ${JSON.stringify(s.section)}, which is not an h2 of the chapter`,
          );
      }
    }
  }
  return out;
}

/** Every chapter: its own problems, then the story as a whole — each chapter in both languages with the same slug, number,
    period and sources; the numbers of a language run from 1 without a gap or a repeat; no dead internal link. */
export function checkChapters(dir, postsDir, ctx) {
  const problems = [];
  const read = (d) =>
    readdirSync(d)
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => ({ file: f, ...matter(readFileSync(join(d, f), "utf8")) }));
  const posts = read(postsDir);
  const chapters = read(dir);
  const postSlugs = new Set();
  /* A chapter may name, as its sources, the posts it absorbed: they are retired (lib/redirects.json), not gone from the story. */
  for (const slug of Object.keys(JSON.parse(readFileSync(new URL("../lib/redirects.json", import.meta.url), "utf8"))))
    for (const locale of ["en", "fr"]) postSlugs.add(`${locale}:${slug}`);
  const known = new Map();
  for (const p of posts) {
    const m = p.file.match(FILE);
    if (!m) continue;
    const [, slug, locale] = m;
    const draft = p.data.draft === true;
    postSlugs.add(`${locale}:${slug}`);
    addKnownRoute(known, `posts:${locale}:${slug}`, draft);
  }
  for (const c of chapters) {
    const m = c.file.match(FILE);
    if (m) addKnownRoute(known, `story:${m[2]}:${m[1]}`, c.data.draft === true);
  }
  for (const c of chapters) {
    problems.push(...chapterProblems(c.file, c.data, c.content, ctx, postSlugs));
    problems.push(...internalLinkProblems(c.file, c.content, known, c.data.draft === true));
  }
  const bySlug = new Map();
  for (const c of chapters) {
    const m = c.file.match(FILE);
    if (m) bySlug.set(m[1], { ...bySlug.get(m[1]), [m[2]]: c.data });
  }
  for (const [slug, langs] of bySlug) {
    if (!langs.en || !langs.fr) {
      problems.push(`chapter ${slug}: it must exist in both languages (${slug}.en.mdx and ${slug}.fr.mdx)`);
      continue;
    }
    for (const k of ["chapter", "period", "sources"])
      if (JSON.stringify(langs.en[k]) !== JSON.stringify(langs.fr[k]))
        problems.push(`chapter ${slug}: "${k}" differs between EN and FR`);
  }
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
  return { files: chapters.map((c) => c.file), problems: [...new Set(problems)] };
}
