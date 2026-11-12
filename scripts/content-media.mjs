// WHY  A picture's rules (its renditions, its cover role, the <Figure>/<Clip> tags, the media library) are one subject, apart from the post's text rules.
// WHAT Rendition widths and problems, the media library's context and problems, the media tags of a body and the cover against the library and the body.
// HOW  Imported by scripts/content-post.mjs and scripts/content-rules.mjs; nothing to run. Tests: tests/media.test.mjs, tests/content.test.mjs.
// OWNER krizaka-blog (lane platform), ADR-026 phase D.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CDN, onBlogCdn } from "./content-names.mjs";

/** The widths a picture is sold in: 480, 768, 1200 and 1600 where the source is at least that wide, and its own width (never upscaled).
    Bunny's Optimizer is not enabled, so no width parameter exists: the renditions are made once (scripts/gen-renditions.mjs) and uploaded. */
export const RENDITION_WIDTHS = [480, 768, 1200, 1600];
export function renditionWidths(width) {
  const w = RENDITION_WIDTHS.filter((x) => x <= width);
  if (width > w.at(-1)) w.push(width);
  return w;
}
export const RENDITION_FORMATS = ["avif", "webp"];

/** The problems of one entry's renditions (`{ avif: [{ w, url }], webp: [...] }`): both formats, exactly the widths of `renditionWidths`, on the CDN. */
export function renditionProblems(id, m) {
  if (!(m.width > 0)) return [];
  const r = m.renditions;
  if (!r || typeof r !== "object")
    return [
      `media ${id}: renditions are required (node scripts/gen-renditions.mjs): ${RENDITION_FORMATS.join(" and ")} at ${renditionWidths(m.width).join(", ")} px`,
    ];
  const out = [];
  const want = renditionWidths(m.width).join(",");
  for (const f of RENDITION_FORMATS) {
    const list = r[f];
    if (!Array.isArray(list)) {
      out.push(`media ${id}: renditions.${f} is missing`);
      continue;
    }
    if (list.map((x) => x.w).join(",") !== want)
      out.push(
        `media ${id}: renditions.${f} must be at ${want} px (the source is ${m.width} px wide), not ${list.map((x) => x.w).join(",")}`,
      );
    for (const x of list)
      if (!(typeof x.url === "string" && onBlogCdn(x.url) && x.url.endsWith(`.${f}`)))
        out.push(`media ${id}: renditions.${f} ${x.w}: a .${f} URL on ${CDN} is required`);
  }
  return out;
}

/** The ids of the media library (lib/media.json) and of the series (messages/en.json), read once for the whole check. */
export function readContext(root) {
  const media = JSON.parse(readFileSync(join(root, "lib/media.json"), "utf8"));
  const messages = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8"));
  return { media, series: Object.keys(messages.series?.names ?? {}) };
}

/** The same picture under another id counts too: the same Sovkora run, or the same file stem on the CDN. */
const stemOf = (u) =>
  u
    .split("/")
    .pop()
    .replace(/(-\d+)?\.[0-9a-f]{10}\.\w+$/, "")
    .replace(/-poster$/, "");
const urlsOf = (e) => [...(e.srcs ?? []).map((x) => x.url), e.poster].filter(Boolean);

/** The <Figure>/<Clip> tags of a body against the media library: known id, right kind, alt text. */
export function mediaTagProblems(file, body, media) {
  const out = [];
  for (const m of body.matchAll(/<(Figure|Clip)\b[^>]*?\bid="([^"]+)"/g)) {
    const entry = media[m[2]];
    if (!entry) out.push(`${file}: <${m[1]} id="${m[2]}"> is not in the media library (lib/media.json)`);
    else if ((m[1] === "Clip") !== (entry.kind === "video"))
      out.push(`${file}: <${m[1]} id="${m[2]}"> is a ${entry.kind}`);
  }
  for (const m of body.matchAll(/<(Figure|Clip)\b([^>]*?)\/>/g))
    if (!/\balt="[^"]+"/.test(m[2])) out.push(`${file}: <${m[1]}> needs a non-empty alt`);
  return out;
}

/** True when the body has `id="<id>"` starting at a word boundary (`data-id="…"` counts, `xid="…"` does not). */
export function hasIdAttribute(body, id) {
  const needle = `id="${id}"`;
  for (let at = body.indexOf(needle); at !== -1; at = body.indexOf(needle, at + 1)) {
    if (!/\w/.test(body[at - 1] ?? "")) return true;
  }
  return false;
}

/** The cover against the media library and the body (shown once, rendered in AVIF/WebP). */
export function coverProblems(file, data, body, media) {
  if (data.cover === undefined) return [];
  if (!(data.cover in media))
    return [`${file}: "cover" ${JSON.stringify(data.cover)} is not in the media library (lib/media.json)`];
  /* A diagram drawn from code stays inside its post: as a cover it is cropped in the 16:9 hero and the home's Featured card (#3206). */
  if (media[data.cover].style === "diagram")
    return [
      `${file}: "cover" ${JSON.stringify(data.cover)} is a diagram — a diagram is never a cover; use an evocative still or a clip`,
    ];
  /* A cover is the page's biggest picture (the LCP): it ships in responsive AVIF and WebP renditions, never one file for every screen. */
  const out = renditionProblems(data.cover, media[data.cover]).map((p) => `${file}: ${p}`);
  const entry = media[data.cover];
  const urls = [...urlsOf(entry), entry.mp4, entry.webm].filter(Boolean);
  const stems = new Set(urls.map(stemOf));
  const same = (e) =>
    e && ((entry.made?.runId && e.made?.runId === entry.made.runId) || urlsOf(e).some((u) => stems.has(stemOf(u))));
  for (const m of body.matchAll(/<(?:Figure|Clip)\b[^>]*?\bid="([^"]+)"/g))
    if (m[1] !== data.cover && same(media[m[1]]))
      out.push(`${file}: <… id="${m[1]}"> is the cover's picture under another id — a cover is shown once`);
  if (hasIdAttribute(body, data.cover) || urls.some((u) => body.includes(u)))
    out.push(
      `${file}: the cover "${data.cover}" is also in the body — a cover is shown once (the hero and the cards); use another, relevant picture in the text`,
    );
  return out;
}

/** An entry's shape: a lower-case id, a kind, its size and its blur placeholder. */
function entryProblems(id, m) {
  const out = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) out.push(`media ${id}: the id must be lower-case words with hyphens`);
  if (!["image", "video"].includes(m.kind)) out.push(`media ${id}: kind must be image or video`);
  if (!(m.width > 0 && m.height > 0)) out.push(`media ${id}: width and height are required (they reserve the space)`);
  if (!String(m.blur ?? "").startsWith("data:image/webp;base64,"))
    out.push(`media ${id}: a blur placeholder (webp data URL) is required`);
  return out;
}

/** An entry's files on the blog's CDN: a picture's srcs (each with its width), a video's poster, mp4 and webm. */
function fileProblems(id, m) {
  if (m.kind !== "image")
    return ["poster", "mp4", "webm"].filter((k) => !onBlogCdn(m[k])).map((k) => `media ${id}: ${k} must be on ${CDN}`);
  const out = [];
  if (!Array.isArray(m.srcs) || m.srcs.length === 0) out.push(`media ${id}: srcs is required`);
  for (const s of m.srcs ?? [])
    if (!onBlogCdn(s.url) || !(s.w > 0)) out.push(`media ${id}: every src needs a width and a URL on ${CDN}`);
  return out;
}

/* A picture is either made (its provenance in `made`) or drawn from code as a diagram (`style: "diagram"`). */
function provenanceProblems(id, m) {
  const out = [];
  if (m.style !== undefined && m.style !== "diagram") out.push(`media ${id}: style is "diagram" or absent`);
  if (m.kind === "image" && !m.made && m.style !== "diagram")
    out.push(`media ${id}: a picture without provenance (made) must be a diagram drawn from code (style: "diagram")`);
  if (m.made && !m.made.model) out.push(`media ${id}: made.model is required`);
  if (m.made?.runId && !/^[0-9a-f-]{36}$/.test(m.made.runId)) out.push(`media ${id}: made.runId is not a run id`);
  return out;
}

/** The problems of the media library itself: every URL on the blog's CDN prefix, every entry carries what it needs. */
export function mediaProblems(media) {
  return Object.entries(media).flatMap(([id, m]) => [
    ...entryProblems(id, m),
    ...(m.renditions === undefined ? [] : renditionProblems(id, m)),
    ...fileProblems(id, m),
    ...provenanceProblems(id, m),
  ]);
}
