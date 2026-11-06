// WHY  What one post owes (front matter, publication, series, code fences, body images, JavaScript props) is the core of the content check.
// WHAT `postProblems(file, data, body, ctx)` and the rules it is made of.
// HOW  Imported by scripts/content-rules.mjs and scripts/content-chapters.mjs; nothing to run. Tests: tests/content.test.mjs.
// OWNER krizaka-blog (lane platform), ADR-026 phase D.

import { modelLinkProblems } from "../lib/models.ts";
import { confidentialityProblems } from "./content-confidentiality.mjs";
import { coverProblems, mediaTagProblems } from "./content-media.mjs";
import { CDN, FILE, RESERVED_SLUGS, onBlogCdn } from "./content-names.mjs";

export const blank = (v) => typeof v !== "string" || !v.trim();

/** What a published (non-draft) post owes: the order of its day, a cover and the words of the cover. */
function publicationProblems(file, data, date) {
  const out = [];
  /* gray-matter reads an unquoted timestamp as a Date: the front matter quotes it, so the offset is kept as written. */
  const at = typeof data.publishedAt === "string" ? data.publishedAt : "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(at))
    out.push(
      `${file}: a published post needs "publishedAt" (quoted, e.g. "2026-10-16T21:44:17-04:00"): the order of posts of one day`,
    );
  else if (at.slice(0, 10) !== String(date)) out.push(`${file}: "publishedAt" (${at}) is not on "date" (${date})`);
  if (!data.cover) out.push(`${file}: a published post needs a "cover" (a media id of lib/media.json)`);
  if (data.cover && blank(data.coverAlt))
    out.push(`${file}: a published post needs "coverAlt", the words of its cover`);
  return out;
}

/** The text fields with a limit: the description, and what a search result shows (title, description). */
function lengthProblems(file, data) {
  const out = [];
  if (typeof data.description === "string" && data.description.length > 220)
    out.push(`${file}: "description" is over 220 characters`);
  if (data.seoTitle !== undefined && (typeof data.seoTitle !== "string" || data.seoTitle.length > 60))
    out.push(`${file}: "seoTitle" must be text of at most 60 characters (what a search result shows)`);
  if (
    data.seoDescription !== undefined &&
    (typeof data.seoDescription !== "string" || data.seoDescription.length > 155)
  )
    out.push(`${file}: "seoDescription" must be text of at most 155 characters`);
  return out;
}

/** The front matter's own fields: required text, date, length limits, types. */
function frontMatterProblems(file, data) {
  const out = [];
  for (const k of ["title", "description"]) if (blank(data[k])) out.push(`${file}: "${k}" is required`);
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date ?? ""))) out.push(`${file}: "date" must be YYYY-MM-DD`);
  if (data.draft !== true) out.push(...publicationProblems(file, data, date));
  out.push(...lengthProblems(file, data));
  if (data.tags !== undefined && !Array.isArray(data.tags)) out.push(`${file}: "tags" must be a list`);
  if (data.draft !== undefined && typeof data.draft !== "boolean") out.push(`${file}: "draft" must be true or false`);
  if (data.image && !onBlogCdn(String(data.image)))
    out.push(`${file}: "image" must be on the media CDN (${CDN}…), never a file of this repository`);
  return out;
}

/** The series a post belongs to and its place in it. */
function seriesProblems(file, data, series) {
  const out = [];
  if (data.series !== undefined && !series.includes(data.series))
    out.push(`${file}: "series" ${JSON.stringify(data.series)} has no name in messages (series.names)`);
  if (data.part !== undefined && (!Number.isInteger(data.part) || data.part < 1))
    out.push(`${file}: "part" must be a whole number from 1`);
  if (data.part !== undefined && data.series === undefined) out.push(`${file}: "part" needs a "series"`);
  return out;
}

/** Every fence names its language: CodeBlock highlights with it (`text` for plain output). Opening fences only. */
function fenceProblems(file, body) {
  const out = [];
  let open = false;
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*(```|~~~)\s*([\w+-]*)/);
    if (!m) continue;
    if (!open && !m[2])
      out.push(
        `${file}: a code fence without a language (\`\`\`java, ts, bash, yaml, json, sql, xml, properties, text…)`,
      );
    open = !open;
  }
  return out;
}

/** Images in the body live on the media CDN. */
function bodyProblems(file, body) {
  const out = [];
  if (/!\[[^\]]*\]\((?!https:\/\/krizaka-assets\.b-cdn\.net\/sites?\/blog\/)[^)]+\)/.test(body))
    out.push(`${file}: images in the body must be on the media CDN (${CDN}…)`);
  return out;
}

/** next-mdx-remote blocks JavaScript in posts (blockJS): `prop={3.99}` reaches the component as nothing. Props are strings. */
function jsPropProblems(file, body) {
  return [...body.replace(/```[\s\S]*?```/g, "").matchAll(/<([A-Z]\w*)\b[^>]*?\s(\w+)=\{/g)].map(
    (m) => `${file}: <${m[1]} ${m[2]}={…}> is a JavaScript expression, which the renderer drops — write ${m[2]}="…"`,
  );
}

/** The problems of one post (file name, parsed front matter, body, context); an empty list when it is fine. */
export function postProblems(file, data, body, ctx) {
  const m = file.match(FILE);
  if (!m) return [`${file}: the name must be <slug>.<en|fr>.mdx (lower-case, hyphens)`];
  const out = [];
  if (RESERVED_SLUGS.has(m[1])) out.push(`${file}: "${m[1]}" is a reserved slug`);
  out.push(...frontMatterProblems(file, data));
  out.push(...bodyProblems(file, body));
  if (ctx)
    out.push(
      ...coverProblems(file, data, body, ctx.media),
      ...mediaTagProblems(file, body, ctx.media),
      ...seriesProblems(file, data, ctx.series),
    );
  /* A model is named with a link to its official page the first time (lib/models.ts): the reader can see what it is. */
  out.push(...modelLinkProblems(body).map((p) => `${file}: ${p}`), ...confidentialityProblems(file, data, body));
  if (/```mermaid/.test(body)) out.push(`${file}: Mermaid is retired`);
  out.push(...fenceProblems(file, body), ...jsPropProblems(file, body));
  return out;
}
