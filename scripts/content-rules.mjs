/* The rules a post must satisfy, as plain functions (used by `npm run lint` through check-content.mjs and by the tests). */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

export const RESERVED_SLUGS = new Set(["site", "_"]);
export const FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(en|fr)\.mdx$/;
export const CDN = "https://krizaka-assets.b-cdn.net/site/blog/";

/** The ids of the media library (lib/media.json) and of the series (messages/en.json), read once for the whole check. */
export function readContext(root) {
  const media = JSON.parse(readFileSync(join(root, "lib/media.json"), "utf8"));
  const messages = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8"));
  return { media, series: Object.keys(messages.series?.names ?? {}) };
}

/** The problems of one post (file name, parsed front matter, body, context); an empty list when it is fine. */
export function postProblems(file, data, body, ctx) {
  const out = [];
  const m = file.match(FILE);
  if (!m) return [`${file}: the name must be <slug>.<en|fr>.mdx (lower-case, hyphens)`];
  if (RESERVED_SLUGS.has(m[1])) out.push(`${file}: "${m[1]}" is a reserved slug`);
  for (const k of ["title", "description"]) if (typeof data[k] !== "string" || !data[k].trim()) out.push(`${file}: "${k}" is required`);
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date ?? ""))) out.push(`${file}: "date" must be YYYY-MM-DD`);
  if (typeof data.description === "string" && data.description.length > 220) out.push(`${file}: "description" is over 220 characters`);
  if (data.tags !== undefined && !Array.isArray(data.tags)) out.push(`${file}: "tags" must be a list`);
  if (data.draft !== undefined && typeof data.draft !== "boolean") out.push(`${file}: "draft" must be true or false`);
  if (data.image && !String(data.image).startsWith(CDN)) out.push(`${file}: "image" must be on the media CDN (${CDN}…), never a file of this repository`);
  if (/!\[[^\]]*\]\((?!https:\/\/krizaka-assets\.b-cdn\.net\/site\/blog\/)[^)]+\)/.test(body)) out.push(`${file}: images in the body must be on the media CDN (${CDN}…)`);
  if (ctx) {
    if (data.cover !== undefined && !(data.cover in ctx.media)) out.push(`${file}: "cover" ${JSON.stringify(data.cover)} is not in the media library (lib/media.json)`);
    for (const m of body.matchAll(/<(Figure|Clip)\b[^>]*?\bid="([^"]+)"/g)) {
      const entry = ctx.media[m[2]];
      if (!entry) out.push(`${file}: <${m[1]} id="${m[2]}"> is not in the media library (lib/media.json)`);
      else if ((m[1] === "Clip") !== (entry.kind === "video")) out.push(`${file}: <${m[1]} id="${m[2]}"> is a ${entry.kind}`);
    }
    for (const m of body.matchAll(/<(Figure|Clip)\b([^>]*?)\/>/g)) if (!/\balt="[^"]+"/.test(m[2])) out.push(`${file}: <${m[1]}> needs a non-empty alt`);
    if (data.series !== undefined && !ctx.series.includes(data.series)) out.push(`${file}: "series" ${JSON.stringify(data.series)} has no name in messages (series.names)`);
    if (data.part !== undefined && (!Number.isInteger(data.part) || data.part < 1)) out.push(`${file}: "part" must be a whole number from 1`);
    if (data.part !== undefined && data.series === undefined) out.push(`${file}: "part" needs a "series"`);
  }
  if (/```mermaid/.test(body)) out.push(`${file}: Mermaid is retired`);
  return out;
}

/** Every post of a directory: the problems, plus the pairs (a post in both languages shares its slug). */
export function checkDir(dir, ctx) {
  const problems = [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  const posts = [];
  for (const f of files) {
    const { data, content } = matter(readFileSync(join(dir, f), "utf8"));
    problems.push(...postProblems(f, data, content, ctx));
    posts.push({ file: f, data, body: content });
  }
  problems.push(...linkProblems(posts));
  return { files, problems };
}

/** The problems of the media library itself: every URL on the blog's CDN prefix, every entry carries what it needs. */
export function mediaProblems(media) {
  const out = [];
  const onCdn = (u) => typeof u === "string" && u.startsWith(CDN);
  for (const [id, m] of Object.entries(media)) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) out.push(`media ${id}: the id must be lower-case words with hyphens`);
    if (!["image", "video"].includes(m.kind)) out.push(`media ${id}: kind must be image or video`);
    if (!(m.width > 0 && m.height > 0)) out.push(`media ${id}: width and height are required (they reserve the space)`);
    if (!String(m.blur ?? "").startsWith("data:image/webp;base64,")) out.push(`media ${id}: a blur placeholder (webp data URL) is required`);
    if (m.kind === "image") {
      if (!Array.isArray(m.srcs) || m.srcs.length === 0) out.push(`media ${id}: srcs is required`);
      for (const s of m.srcs ?? []) if (!onCdn(s.url) || !(s.w > 0)) out.push(`media ${id}: every src needs a width and a URL on ${CDN}`);
    } else {
      for (const k of ["poster", "mp4", "webm"]) if (!onCdn(m[k])) out.push(`media ${id}: ${k} must be on ${CDN}`);
    }
    if (m.made) {
      if (!m.made.model) out.push(`media ${id}: made.model is required`);
      if (m.made.runId && !/^[0-9a-f-]{36}$/.test(m.made.runId)) out.push(`media ${id}: made.runId is not a run id`);
    }
  }
  return out;
}

/** Links between posts (`/posts/<slug>` and `/fr/posts/<slug>`): each one leads to a post of that language, and a published
    post never links to a draft (the reader would land on a 404). `posts` is [{ file, data, body }]. */
export function linkProblems(posts) {
  const out = [];
  const known = new Map();
  for (const p of posts) {
    const m = p.file.match(FILE);
    if (m) known.set(`${m[2]}:${m[1]}`, p.data.draft === true);
  }
  for (const p of posts) {
    for (const l of p.body.matchAll(/\]\((\/fr)?\/posts\/([a-z0-9-]+)\/?(?:#[^)]*)?\)/g)) {
      const key = `${l[1] ? "fr" : "en"}:${l[2]}`;
      if (!known.has(key)) out.push(`${p.file}: links to ${l[0].slice(2, -1)}, which is not a post`);
      else if (p.data.draft !== true && known.get(key)) out.push(`${p.file}: a published post links to the draft ${l[0].slice(2, -1)}`);
    }
  }
  return out;
}
