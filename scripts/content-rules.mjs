/* The rules a post must satisfy, as plain functions (used by `npm run lint` through check-content.mjs and by the tests). */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { modelLinkProblems } from "../lib/models.ts";
import { featuredOrder } from "../lib/reading.ts";

export const RESERVED_SLUGS = new Set(["site", "_"]);
export const FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(en|fr)\.mdx$/;
export const CDN = "https://krizaka-assets.b-cdn.net/site/blog/";

/** The widths a picture is sold in: 480, 768, 1200 and 1600 where the source is at least that wide, and its own width (never upscaled).
    Bunny's Optimizer is not enabled, so no width parameter exists: the renditions are made once (scripts/gen-renditions.mjs) and uploaded. */
export const RENDITION_WIDTHS = [480, 768, 1200, 1600];
export function renditionWidths(width) {
  const w = RENDITION_WIDTHS.filter((x) => x <= width);
  if (width > w[w.length - 1]) w.push(width);
  return w;
}
export const RENDITION_FORMATS = ["avif", "webp"];

/** The problems of one entry's renditions (`{ avif: [{ w, url }], webp: [...] }`): both formats, exactly the widths of `renditionWidths`, on the CDN. */
export function renditionProblems(id, m) {
  if (!(m.width > 0)) return [];
  const r = m.renditions;
  if (!r || typeof r !== "object") return [`media ${id}: renditions are required (node scripts/gen-renditions.mjs): ${RENDITION_FORMATS.join(" and ")} at ${renditionWidths(m.width).join(", ")} px`];
  const out = [];
  const want = renditionWidths(m.width).join(",");
  for (const f of RENDITION_FORMATS) {
    const list = r[f];
    if (!Array.isArray(list)) {
      out.push(`media ${id}: renditions.${f} is missing`);
      continue;
    }
    if (list.map((x) => x.w).join(",") !== want) out.push(`media ${id}: renditions.${f} must be at ${want} px (the source is ${m.width} px wide), not ${list.map((x) => x.w).join(",")}`);
    for (const x of list) if (!(typeof x.url === "string" && x.url.startsWith(CDN) && x.url.endsWith(`.${f}`))) out.push(`media ${id}: renditions.${f} ${x.w}: a .${f} URL on ${CDN} is required`);
  }
  return out;
}

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
  if (data.draft !== true) {
    /* gray-matter reads an unquoted timestamp as a Date: the front matter quotes it, so the offset is kept as written. */
    const at = typeof data.publishedAt === "string" ? data.publishedAt : "";
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(at)) out.push(`${file}: a published post needs "publishedAt" (quoted, e.g. "2026-10-16T21:44:17-04:00"): the order of posts of one day`);
    else if (at.slice(0, 10) !== String(date)) out.push(`${file}: "publishedAt" (${at}) is not on "date" (${date})`);
    if (!data.cover) out.push(`${file}: a published post needs a "cover" (a media id of lib/media.json)`);
    if (data.cover && !(typeof data.coverAlt === "string" && data.coverAlt.trim())) out.push(`${file}: a published post needs "coverAlt", the words of its cover`);
  }
  if (typeof data.description === "string" && data.description.length > 220) out.push(`${file}: "description" is over 220 characters`);
  if (data.seoTitle !== undefined && (typeof data.seoTitle !== "string" || data.seoTitle.length > 60)) out.push(`${file}: "seoTitle" must be text of at most 60 characters (what a search result shows)`);
  if (data.seoDescription !== undefined && (typeof data.seoDescription !== "string" || data.seoDescription.length > 155)) out.push(`${file}: "seoDescription" must be text of at most 155 characters`);
  if (data.tags !== undefined && !Array.isArray(data.tags)) out.push(`${file}: "tags" must be a list`);
  if (data.draft !== undefined && typeof data.draft !== "boolean") out.push(`${file}: "draft" must be true or false`);
  if (data.image && !String(data.image).startsWith(CDN)) out.push(`${file}: "image" must be on the media CDN (${CDN}…), never a file of this repository`);
  if (/!\[[^\]]*\]\((?!https:\/\/krizaka-assets\.b-cdn\.net\/site\/blog\/)[^)]+\)/.test(body)) out.push(`${file}: images in the body must be on the media CDN (${CDN}…)`);
  if (ctx) {
    if (data.cover !== undefined && !(data.cover in ctx.media)) out.push(`${file}: "cover" ${JSON.stringify(data.cover)} is not in the media library (lib/media.json)`);
    /* A cover is the page's biggest picture (the LCP): it ships in responsive AVIF and WebP renditions, never one file for every screen. */
    if (data.cover !== undefined && data.cover in ctx.media) out.push(...renditionProblems(data.cover, ctx.media[data.cover]).map((p) => `${file}: ${p}`));
    /* The cover is shown once: as the post's hero and on its cards. A picture in the body is another, relevant one. */
    if (data.cover !== undefined && data.cover in ctx.media) {
      const entry = ctx.media[data.cover];
      const urls = [...(entry.srcs ?? []).map((x) => x.url), entry.poster, entry.mp4, entry.webm].filter(Boolean);
      /* The same picture under another id counts too: the same Orazaka run, or the same file stem on the CDN. */
      const stem = (u) => u.split("/").pop().replace(/(-\d+)?\.[0-9a-f]{10}\.\w+$/, "").replace(/-poster$/, "");
      const stems = new Set(urls.map(stem));
      const same = (e) => e && ((entry.made?.runId && e.made?.runId === entry.made.runId) || [...(e.srcs ?? []).map((x) => x.url), e.poster].filter(Boolean).some((u) => stems.has(stem(u))));
      for (const m of body.matchAll(/<(?:Figure|Clip)\b[^>]*?\bid="([^"]+)"/g)) if (m[1] !== data.cover && same(ctx.media[m[1]])) out.push(`${file}: <… id="${m[1]}"> is the cover's picture under another id — a cover is shown once`);
      if (new RegExp(`\\bid="${data.cover}"`).test(body) || urls.some((u) => body.includes(u))) out.push(`${file}: the cover "${data.cover}" is also in the body — a cover is shown once (the hero and the cards); use another, relevant picture in the text`);
    }
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
  /* A model is named with a link to its official page the first time (lib/models.ts): the reader can see what it is. */
  out.push(...modelLinkProblems(body).map((p) => `${file}: ${p}`));
  if (/```mermaid/.test(body)) out.push(`${file}: Mermaid is retired`);
  /* Every fence names its language: CodeBlock highlights with it (`text` for plain output). Opening fences only. */
  let open = false;
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*(```|~~~)\s*([\w+-]*)/);
    if (!m) continue;
    if (!open && !m[2]) out.push(`${file}: a code fence without a language (\`\`\`java, ts, bash, yaml, json, sql, xml, properties, text…)`);
    open = !open;
  }
  /* next-mdx-remote blocks JavaScript in posts (blockJS): `prop={3.99}` reaches the component as nothing. Props are strings. */
  for (const m of body.replace(/```[\s\S]*?```/g, "").matchAll(/<([A-Z]\w*)\b[^>]*?\s(\w+)=\{/g)) out.push(`${file}: <${m[1]} ${m[2]}={…}> is a JavaScript expression, which the renderer drops — write ${m[2]}="…"`);
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
  if (ctx) problems.push(...homeCoverProblems(posts, ctx.media));
  return { files, problems };
}

/** How many diagram covers the home may show among its first cards: the blog tells stories, its front page is pictures and
    clips, and a schema stays inside its post. */
export const HOME_DIAGRAM_COVERS_MAX = 1;
export const HOME_CARDS = 3;

/** The home's first cards (lib/reading.ts featuredOrder over the published posts of each language) carry at most
    HOME_DIAGRAM_COVERS_MAX covers whose media is a diagram (`style: "diagram"` in lib/media.json). */
export function homeCoverProblems(posts, media) {
  const out = [];
  for (const locale of ["en", "fr"]) {
    const published = posts
      .filter((p) => p.file.endsWith(`.${locale}.mdx`) && p.data.draft !== true)
      .map((p) => ({ slug: p.file.replace(/\.(en|fr)\.mdx$/, ""), featured: p.data.featured === true, publishedAt: p.data.publishedAt, date: String(p.data.date ?? ""), cover: p.data.cover }));
    const first = featuredOrder(published, HOME_CARDS);
    const diagrams = first.filter((p) => media[p.cover]?.style === "diagram");
    if (diagrams.length > HOME_DIAGRAM_COVERS_MAX) out.push(`home (${locale}): ${diagrams.length} of the first ${HOME_CARDS} cards have a diagram as cover (${diagrams.map((p) => p.slug).join(", ")}) — at most ${HOME_DIAGRAM_COVERS_MAX}: give a post an evocative picture or clip (an Orazaka run) and keep its diagram in the text`);
  }
  return out;
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
    if (m.renditions !== undefined) out.push(...renditionProblems(id, m));
    if (m.kind === "image") {
      if (!Array.isArray(m.srcs) || m.srcs.length === 0) out.push(`media ${id}: srcs is required`);
      for (const s of m.srcs ?? []) if (!onCdn(s.url) || !(s.w > 0)) out.push(`media ${id}: every src needs a width and a URL on ${CDN}`);
    } else {
      for (const k of ["poster", "mp4", "webm"]) if (!onCdn(m[k])) out.push(`media ${id}: ${k} must be on ${CDN}`);
    }
    /* A picture is either made (its provenance in `made`) or drawn from code as a diagram (`style: "diagram"`). */
    if (m.style !== undefined && m.style !== "diagram") out.push(`media ${id}: style is "diagram" or absent`);
    if (m.kind === "image" && !m.made && m.style !== "diagram") out.push(`media ${id}: a picture without provenance (made) must be a diagram drawn from code (style: "diagram")`);
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
