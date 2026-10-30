/* The rules a post must satisfy, as plain functions (used by `npm run lint` through check-content.mjs and by the tests). */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { modelLinkProblems } from "../lib/models.ts";
import { featuredOrder } from "../lib/reading.ts";

export const RESERVED_SLUGS = new Set(["site", "_"]);
export const FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(en|fr)\.mdx$/;
export const CDN = "https://krizaka-assets.b-cdn.net/site/blog/";
/** The media layout v2 (krizaka-com ADR-014): new uploads of `cdn-assets.mjs` land under sites/blog/posts/; the older files keep the legacy prefix. */
export const CDN_V2 = "https://krizaka-assets.b-cdn.net/sites/blog/posts/";
export const CDN_PREFIXES = [CDN, CDN_V2];
export const onBlogCdn = (u) => typeof u === "string" && CDN_PREFIXES.some((p) => u.startsWith(p));
export const cdnBaseOf = (u) => CDN_PREFIXES.find((p) => u.startsWith(p));

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
    for (const x of list) if (!(typeof x.url === "string" && onBlogCdn(x.url) && x.url.endsWith(`.${f}`))) out.push(`media ${id}: renditions.${f} ${x.w}: a .${f} URL on ${CDN} is required`);
  }
  return out;
}

/** The ids of the media library (lib/media.json) and of the series (messages/en.json), read once for the whole check. */
export function readContext(root) {
  const media = JSON.parse(readFileSync(join(root, "lib/media.json"), "utf8"));
  const messages = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8"));
  return { media, series: Object.keys(messages.series?.names ?? {}) };
}

/** Confidentiality: what a public post never carries. `CONFIDENTIAL_ALWAYS` is checked in every post (company registration
    numbers, the company's own e-mail addresses, the private folder's names, secret-looking values); `CONFIDENTIAL_STRICT` in a
    post that declares `sensitive: true` in its front matter (a post about how the company is run): no amount, no tax or ledger
    word, no variable name that gives away a provider or an account, no supplier name. Patterns, not internals. */
export const CONFIDENTIAL_ALWAYS = [
  [/(?<![\d.,])\d{10}(?![\d.,])/, "a 10-digit number (looks like a company registration number)"],
  [/\b\d{4}[ -]\d{3}[ -]\d{3}\b/, "a number grouped like a company registration number"],
  [/[\w.+-]+@krizaka\.com\b/i, "a company e-mail address"],
  [/(^|[^\w-])(env|vault|inbox|prompts)\/[\w.-]/, "a folder name of the private workspace (env/, vault/, inbox/…)"],
  [/Documents\/krizaka|\/Users\/[\w.-]+/, "a path on the founder's machine"],
  [/\bsecrets\.map\b|\.local\.md\b|\bCREDENTIALS\b/, "the name of a private file"],
  [/\b(sk|pk|rk)[-_](live|test|ant|proj)?[-_]?[A-Za-z0-9]{20,}/, "a key-looking value"],
  [/\b(NEQ|TPS|TVQ|GST|QST|SIN|NAS)\b/, "a registration, tax or identity-number word"],
];
export const CONFIDENTIAL_STRICT = [
  [/\$\s?\d|\d[\d\s.,]*\s?(\$|US\$|CAD|USD|EUR|€)(?![\w])/, "an amount of money"],
  [/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_(?:API_KEY|KEY|TOKEN|SECRET|PASSWORD|ADMIN)\b|\bAPI_KEY\b/, "a key or variable name"],
  [/\b(RunPod|DigitalOcean|Bunny|Mailgun|Anthropic|Cloudflare|Porkbun|Firebase|BigQuery)\b/i, "a supplier name"],
  [/\b(grand livre|ledger|compte 2500|account 2500|incorporation|constitution|facture|invoice|comptable|accountant|bank|banque)\b/i, "a ledger, fiscal or bank word"],
];

/** The confidentiality problems of one post: `text` is the front matter's text and the body together. */
export function confidentialityProblems(file, data, body) {
  const out = [];
  const text = [data.title, data.description, data.seoTitle, data.seoDescription, body].filter((x) => typeof x === "string").join("\n");
  const rules = data.sensitive === true ? [...CONFIDENTIAL_ALWAYS, ...CONFIDENTIAL_STRICT] : CONFIDENTIAL_ALWAYS;
  for (const [re, what] of rules) {
    const m = text.match(re);
    if (m) out.push(`${file}: confidential — ${what} (“${m[0].trim().slice(0, 40)}”); describe the pattern, not the internals`);
  }
  return out;
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
  if (data.image && !onBlogCdn(String(data.image))) out.push(`${file}: "image" must be on the media CDN (${CDN}…), never a file of this repository`);
  if (/!\[[^\]]*\]\((?!https:\/\/krizaka-assets\.b-cdn\.net\/sites?\/blog\/)[^)]+\)/.test(body)) out.push(`${file}: images in the body must be on the media CDN (${CDN}…)`);
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
  out.push(...confidentialityProblems(file, data, body));
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
  const onCdn = onBlogCdn;
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

/** Links between posts (`/basics/<slug>` and `/fr/basics/<slug>`, the shelf's addresses): each one leads to a post of that language, and a published
    post never links to a draft (the reader would land on a 404). `posts` is [{ file, data, body }]. */
export function linkProblems(posts) {
  const out = [];
  const known = new Map();
  for (const p of posts) {
    const m = p.file.match(FILE);
    if (m) known.set(`${m[2]}:${m[1]}`, p.data.draft === true);
  }
  for (const p of posts) {
    for (const l of p.body.matchAll(/\]\((\/fr)?\/(?:posts|basics)\/([a-z0-9-]+)\/?(?:#[^)]*)?\)/g)) {
      const key = `${l[1] ? "fr" : "en"}:${l[2]}`;
      if (!known.has(key)) out.push(`${p.file}: links to ${l[0].slice(2, -1)}, which is not a post`);
      else if (p.data.draft !== true && known.get(key)) out.push(`${p.file}: a published post links to the draft ${l[0].slice(2, -1)}`);
    }
  }
  return out;
}

/** The story's chapters (content/chapters/<slug>.<en|fr>.mdx, lib/chapters.ts). */
export const CHAPTER_PERIOD = /^\d{4}-\d{2}-\d{2}(\/\d{4}-\d{2}-\d{2})?$/;
const isCalendarDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const addKnownRoute = (known, key, draft) => known.set(key, known.has(key) && known.get(key) === false ? false : draft);

export const CHAPTER_STATS_MAX = 4;

/** The pages a body may link to besides posts and chapters (both languages). The blog is one page (krizaka-blog#123): the topics,
    the series, the search, the saved posts and the feed page are stubs now (lib/redirects.json), never a link's target. */
const STATIC_PAGES = new Set(["", "about", "newsletter", "basics"]);

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
  if (!Number.isInteger(data.chapter) || data.chapter < 1) out.push(`${file}: "chapter" must be a whole number from 1 (its place in the story)`);
  if (!CHAPTER_PERIOD.test(String(data.period ?? ""))) out.push(`${file}: "period" must be YYYY-MM-DD or YYYY-MM-DD/YYYY-MM-DD (quoted): the dates of the posts it absorbs`);
  else {
    const [from, to] = String(data.period).split("/");
    if (!isCalendarDate(from) || (to && !isCalendarDate(to))) out.push(`${file}: "period" must contain real calendar dates`);
    else if (to && to < from) out.push(`${file}: "period" ends before it starts`);
  }
  if (data.series !== undefined || data.part !== undefined) out.push(`${file}: a chapter has no "series" or "part" — "chapter" is its place`);
  if (!Array.isArray(data.sources) || data.sources.length === 0) out.push(`${file}: "sources" must list the slugs of the posts it is written from`);
  else for (const s of data.sources) if (!postSlugs.has(`${locale}:${s}`)) out.push(`${file}: source "${s}" is not a post of content/posts in this language`);
  for (const k of ["faced", "built"]) if (!(typeof data.versus?.[k] === "string" && data.versus[k].trim())) out.push(`${file}: "versus.${k}" is required (the head's label, from the chapter's own text)`);
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
        for (const num of s.value.match(/\d+(?:[.,]\d+)?/g) ?? []) if (!bodyNumbers.has(num)) out.push(`${file}: the stat "${s.value}" gives ${num}, which the body does not — only figures the chapter already gives`);
        if (!sections.includes(s.section)) out.push(`${file}: the stat "${s.value}" names the section ${JSON.stringify(s.section)}, which is not an h2 of the chapter`);
      }
    }
  }
  return out;
}

/** Internal links of a body (`](/…)`): each leads to a generated route or a page of the site. */
export function internalLinkProblems(file, body, known, sourceDraft = false) {
  const out = [];
  for (const l of body.matchAll(/\]\((\/[^)\s#]*)(?:#[^)]*)?\)/g)) {
    const path = l[1];
    const m = path.match(/^(\/fr)?\/(?:(posts|basics|story)\/([a-z0-9-]+)|([a-z-]*))\/?$/);
    const locale = m?.[1] ? "fr" : "en";
    const kind = m?.[2] === "basics" ? "posts" : m?.[2];
    const key = kind ? `${kind}:${locale}:${m[3]}` : undefined;
    const ok = m && (key ? known.has(key) && (sourceDraft || !(known instanceof Map && known.get(key) === true)) : STATIC_PAGES.has(m[4]));
    if (!ok) out.push(`${file}: links to ${path}, which is not a page of the blog`);
  }
  return out;
}

/** Every chapter: its own problems, then the story as a whole — each chapter in both languages with the same slug, number,
    period and sources; the numbers of a language run from 1 without a gap or a repeat; no dead internal link. */
export function checkChapters(dir, postsDir, ctx) {
  const problems = [];
  const read = (d) => readdirSync(d).filter((f) => f.endsWith(".mdx")).map((f) => ({ file: f, ...matter(readFileSync(join(d, f), "utf8")) }));
  const posts = read(postsDir);
  const chapters = read(dir);
  const postSlugs = new Set();
  /* A chapter may name, as its sources, the posts it absorbed: they are retired (lib/redirects.json), not gone from the story. */
  for (const slug of Object.keys(JSON.parse(readFileSync(new URL("../lib/redirects.json", import.meta.url), "utf8")))) for (const locale of ["en", "fr"]) postSlugs.add(`${locale}:${slug}`);
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
    for (const k of ["chapter", "period", "sources"]) if (JSON.stringify(langs.en[k]) !== JSON.stringify(langs.fr[k])) problems.push(`chapter ${slug}: "${k}" differs between EN and FR`);
  }
  for (const locale of ["en", "fr"]) {
    const nums = chapters.filter((c) => c.file.endsWith(`.${locale}.mdx`)).map((c) => c.data.chapter).sort((a, b) => a - b);
    nums.forEach((n, i) => {
      if (n !== i + 1) problems.push(`chapters (${locale}): the numbers must run 1, 2, 3… without a gap or a repeat (found ${nums.join(", ")})`);
    });
  }
  return { files: chapters.map((c) => c.file), problems: [...new Set(problems)] };
}

/* A JSX attribute whose text holds a straight double quote ends early and breaks the MDX build (chapter 18, blog#209): use « » or “ ”. */
export function attributeQuoteProblems(text, file) {
  const bad = /\b(?:alt|title|caption|label)="[^"\n]*"(?![\s/>])/g;
  return [...text.matchAll(bad)].map((m) => `${file}: a straight double quote inside an attribute ends it early (${m[0].slice(0, 50)}…): use « » or “ ”`);
}
