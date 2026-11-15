#!/usr/bin/env node
/* Screenshots of the founder's local cockpit for a post, with nothing sensitive in the pixels.
   A blur is reversible (Unredacter, Depix), so a real value is never blurred: BEFORE the shot, every sensitive value of the page
   is REPLACED in the DOM by a placeholder of the same length ("•••"), and only that placeholder is blurred. Then a guard reads the
   visible text again (with a wider net than the masking used) and refuses to write the image if anything sensitive is left.
     node scripts/capture-cockpit.mjs --out <dir> [--base http://127.0.0.1:3457] [--only <id>] [--names "A B,C D"]
   Writes <dir>/<id>.png (1440 px, PNG chunks stripped to the critical ones: no text, no time, no ICC) and exits 1 without
   writing it when the guard finds a value. Used by content/posts/one-local-cockpit-to-run-the-whole-company. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/* The masking patterns: a value that matches is replaced. `name` says why, for the log (never the value). Several simple patterns
   may share a name: each stays small and linear (no nested quantifier), and the guard below is wider than all of them. */
const NUM = String.raw`\d[\d   .,]{0,12}`;
export const MASK = [
  { name: "money", re: new RegExp(`${NUM}[$€£]`, "g") },
  { name: "money", re: new RegExp(`${NUM}(?:CAD|USD|EUR)\\b`, "g") },
  { name: "money", re: new RegExp(`(?:CAD|USD|EUR|US\\$|[$€£])\\s?${NUM}`, "g") },
  { name: "email", re: /[\w.%+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){1,4}/g },
  { name: "phone", re: /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g },
  { name: "postal", re: /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\b/g },
  { name: "postal", re: /\b\d[ABCEGHJ-NPRSTV-Z]\d\b/g },
  {
    name: "address",
    re: /\b\d{1,5},? (?:rue|avenue|av\.|boulevard|boul\.|chemin|rang|street|st\.|road|rd\.|drive)\b[^,.;\n]{0,30}/gi,
  },
  { name: "address", re: /\b(?:[Rr]ue|[Aa]venue|[Bb]oulevard|[Cc]hemin) [A-ZÉ][\p{L}'-]+/gu },
  { name: "address", re: /\bSainte?-Marguerite\b/gi },
  { name: "tax-id", re: /\b\d{9}\s?(?:RT|TQ|RP)\s?\d{4}\b/gi },
  { name: "tax-id", re: /\b\d{3}[ -]\d{3}[ -]\d{3}\b/g },
  { name: "tax-id", re: /\d{9,}/g },
  { name: "token", re: /\bgh[pousr]_\w{20,}/g },
  { name: "token", re: /\bgithub_pat_\w{20,}/g },
  { name: "token", re: /\bsk-[\w-]{16,}/g },
  { name: "token", re: /\bxox[baprs]-[\w-]{10,}/g },
  { name: "token", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "token", re: /\beyJ[\w-]{10,}\.[\w-]{10,}(?:\.[\w-]+)?/g },
  { name: "hex", re: /\b[0-9a-f]{24,}\b/gi },
  { name: "base64", re: /\b(?=\S*\d)(?=\S*[a-z])(?=\S*[A-Z])[\w+/-]{32,}={0,2}/g },
  { name: "secret-name", re: /\b[A-Z][A-Z0-9_]{0,40}(?:KEY|TOKEN|SECRET|PASSWORD|PASSPHRASE)[A-Z0-9_]{0,40}/g },
  { name: "private-path", re: /(?:\/Users\/|\/private\/|\/var\/folders\/|~\/\.)[^\s"')]*/g },
  { name: "person", re: /\b(?:M\.|Mme|Mr|Mrs|Ms|Dr|Me) [A-ZÉ][\p{L}'-]+(?: [A-ZÉ][\p{L}'-]+)?/gu },
  { name: "person", re: /\bAbid\b|oussamaabid/g },
];

/* A line or a block that names one of these is a finance, tax, bank or security thing: the WHOLE block is replaced. */
const WORDS = [
  ["ledger", "grand livre", "comptabilit[ée]", "accounting", "bank", "banque", "iban", "tps", "tvq", "gst", "qst"],
  ["imp[ôo]ts?", "taxes?", "factures?", "invoices?", "payroll", "salaire", "salary"],
  [
    "secrets?",
    "vault",
    "coffre",
    "sensible",
    "sensitive",
    "security",
    "s[ée]curit[ée]",
    "credentials?",
    "mot de passe",
    "password",
  ],
];
export const SENSITIVE_WORDS = new RegExp(`\\b(?:${WORDS.flat().join("|")})\\b`, "i");

/* The guard's net is WIDER than the masking: any long digit run, any address-like at-sign, any currency next to a digit, any long
   hex, any private path. A pattern here that masking missed is a refusal, never a silent pass. */
export const GUARD = [
  ...MASK,
  { name: "digits-run", re: /\b\d{3}[ . -]\d{3}[ . -]\d{3,4}\b/g },
  { name: "at-sign", re: /[^\s@]{1,64}@[^\s@]{1,64}/g },
  { name: "currency-digit", re: /[$€£]\s?\d|\d\s?[$€£]/g },
  { name: "long-hex", re: /\b[0-9a-f]{20,}\b/gi },
  { name: "sensitive-word", re: new RegExp(SENSITIVE_WORDS.source, "gi") },
];

/** The names of the patterns that match `text`, never the matched value. */
export function findings(text, patterns = GUARD) {
  const hit = new Set();
  for (const { name, re } of patterns) {
    re.lastIndex = 0;
    if (re.test(text)) hit.add(name);
    re.lastIndex = 0;
  }
  return [...hit];
}

/* The in-page masking: small functions that are serialised and sent as one script (`maskScript`), so each stays simple. They run in the
   browser and share only the `ctx` they are given. */
const BLOCK = "tr, li, [role=row], [role=listitem], article, dt, dd, summary, p";
const SKIP_TAGS = /^(SCRIPT|STYLE|NOSCRIPT)$/;
const MASK_STYLE =
  "[data-kz-masked]{filter:blur(4px);user-select:none;pointer-events:none;display:inline-block;color:transparent;background:rgba(110,120,140,.4);border-radius:3px}";

function placeholderOf(s) {
  return s.replace(/\S/g, "•");
}
function wrapText(node, start, end, why, ctx) {
  const before = node.splitText(start);
  const rest = before.splitText(end - start);
  const span = document.createElement("span");
  span.setAttribute("data-kz-masked", why);
  span.textContent = placeholderOf(before.data);
  before.replaceWith(span);
  ctx.count[why] = (ctx.count[why] ?? 0) + 1;
  return rest;
}
function textNodesOf(root) {
  const out = [];
  const accept = (n) => {
    const p = n.parentElement;
    const skip = !p || SKIP_TAGS.test(p.tagName) || p.closest("[data-kz-masked]");
    return skip ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: accept });
  while (walker.nextNode()) out.push(walker.currentNode);
  return out;
}
function maskBlocks(ctx) {
  const done = new Set();
  for (const n of textNodesOf(document.body)) {
    if (!ctx.words.test(n.data)) continue;
    const block = n.parentElement.closest(BLOCK) ?? n.parentElement;
    if (block.matches("nav, nav *, header, header *") || done.has(block)) continue;
    done.add(block);
    for (const t of textNodesOf(block)) if (t.data.trim()) wrapText(t, 0, t.data.length, "sensitive-block", ctx);
  }
}
function firstMatch(data, ctx) {
  let best = null;
  const consider = (start, end, name) => {
    if (end > start && (!best || start < best.start)) best = { start, end, name };
  };
  for (const { name, re } of ctx.patterns) {
    re.lastIndex = 0;
    const m = re.exec(data);
    if (m) consider(m.index, m.index + m[0].length, name);
  }
  const lower = data.toLowerCase();
  for (const nm of ctx.names) {
    const i = lower.indexOf(nm);
    if (i >= 0) consider(i, i + nm.length, "person");
  }
  return best;
}
function maskValues(ctx) {
  for (const node of textNodesOf(document.body)) {
    let current = node;
    for (let i = 0; i < 200 && current; i++) {
      const hit = firstMatch(current.data, ctx);
      if (!hit) break;
      current = wrapText(current, hit.start, hit.end, hit.name, ctx);
    }
  }
}
function maskFields() {
  for (const el of document.querySelectorAll("input, textarea")) {
    if (el.value) el.value = placeholderOf(el.value);
    el.style.filter = "blur(6px)";
  }
  for (const el of document.querySelectorAll("[title], [alt], [aria-label], [placeholder]"))
    for (const a of ["title", "alt", "aria-label", "placeholder"]) el.removeAttribute(a);
  document.title = "cockpit";
}
function maskPage(spec) {
  const ctx = {
    count: {},
    words: new RegExp(spec.words.source, spec.words.flags),
    patterns: spec.mask.map((m) => ({ name: m.name, re: new RegExp(m.source, m.flags) })),
    names: spec.names.map((n) => n.toLowerCase()),
  };
  const style = document.createElement("style");
  style.textContent = spec.style;
  document.head.appendChild(style);
  maskBlocks(ctx);
  maskValues(ctx);
  maskFields();
  return ctx.count;
}

/** The script that masks a page, as a string for `page.evaluate`: the helpers above plus the call, with the patterns as data. */
export function maskScript({ mask, words, names }) {
  const spec = {
    mask: mask.map((m) => ({ name: m.name, source: m.re.source, flags: m.re.flags })),
    words: { source: words.source, flags: words.flags },
    names,
    style: MASK_STYLE,
  };
  const helpers = [placeholderOf, wrapText, textNodesOf, maskBlocks, firstMatch, maskValues, maskFields, maskPage];
  return `(() => {
const BLOCK = ${JSON.stringify(BLOCK)};
const SKIP_TAGS = ${SKIP_TAGS.toString()};
${helpers.map((f) => f.toString()).join("\n")}
return maskPage(${JSON.stringify(spec)});
})()`;
}

/** Runs in the page: what a reader (or a screen reader) can read now. */
export function visibleText() {
  const parts = [document.body.innerText];
  for (const el of document.querySelectorAll("input, textarea")) parts.push(el.value ?? "");
  return parts.join("\n");
}

/** A PNG with only its critical chunks: no text, time, colour profile or EXIF. */
export function stripPng(buf) {
  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error("not a PNG");
  const keep = new Set(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]);
  const out = [SIG];
  for (let i = 8; i < buf.length;) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString("ascii", i + 4, i + 8);
    if (keep.has(type)) out.push(buf.subarray(i, i + 12 + len));
    i += 12 + len;
  }
  return Buffer.concat(out);
}

/** What a screen does before the shot: open a section, press a button, wait, hide a column. Nothing here reads or writes data. */
export async function runSteps(page, steps = []) {
  for (const st of steps) {
    if (st.click) await page.click(st.click, { timeout: 8000 });
    if (st.wait) await page.waitForTimeout(st.wait);
    if (st.hide) await page.addStyleTag({ content: `${st.hide}{display:none !important}` });
  }
}

/** The rectangle of a block of the page, in page coordinates: from the heading that says `text` to the end of its parent, at most `height` tall. */
export async function clipOfHeading(page, { text, height, pad = 12 }) {
  return page.evaluate(
    ({ text, height, pad }) => {
      const h = [...document.querySelectorAll("h2, h3")].find((e) => e.textContent.trim() === text);
      if (!h) return null;
      const r = h.parentElement.getBoundingClientRect();
      const top = h.getBoundingClientRect().y;
      return {
        x: Math.max(0, r.x - pad),
        y: Math.max(0, top + window.scrollY - pad),
        width: r.width + 2 * pad,
        height: Math.min(r.bottom - top, height) + pad,
      };
    },
    { text, height, pad },
  );
}

/** Masks the page, then reads it again with the guard: throws, naming the kinds only, when anything is left. */
export async function maskAndGuard(page, names = []) {
  const counts = await page.evaluate(maskScript({ mask: MASK, words: SENSITIVE_WORDS, names }));
  await page.waitForTimeout(150);
  const text = await page.evaluate(visibleText);
  const left = findings(text, GUARD);
  const leftNames = names.filter((n) => text.toLowerCase().includes(n.toLowerCase()));
  if (left.length || leftNames.length) {
    const kinds = [...left, ...leftNames.map(() => "person")];
    const err = new Error(`guard: ${kinds.join(", ")} still visible, nothing written`);
    err.findings = kinds;
    throw err;
  }
  return counts;
}

/** Masks, guards, shoots, and guards again: the cockpit re-renders by itself, so a frame counts only when the page is clean before AND
    after the shot; else it is tried again (4 times), then the last refusal is thrown and nothing is written. */
export async function guardedShot(page, { names = [], area }) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const counts = await maskAndGuard(page, names);
      const png = stripPng(await page.screenshot({ fullPage: true, clip: area, animations: "disabled" }));
      const after = findings(await page.evaluate(visibleText), GUARD);
      if (after.length === 0) return { png, counts };
      last = new Error(`guard: ${after.join(", ")} appeared during the shot, nothing written`);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

/** Steps, masks, guards, shoots. Throws (and writes nothing) when the guard finds something. */
export async function shoot(page, { out, clip, clipOf, steps, names = [] }) {
  await runSteps(page, steps);
  const area = clipOf ? await clipOfHeading(page, clipOf) : clip;
  if (clipOf && !area) throw new Error(`no heading « ${clipOf.text} » on the page, nothing written`);
  const { png, counts } = await guardedShot(page, { names, area });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
  return { counts, bytes: png.length };
}

/* The screens of the post: id, address (French, light), the part of the page kept. Public: session titles, repositories, PR numbers,
   train and alert states. Not here: Coûts, Affaires, Entreprise, Documents, Secrets. A security-labelled title is masked as a whole
   block by the words rule. `width` is the window's: narrower than the cockpit's 1440, so the text stays readable once the figure is
   shown at phone width; `scale` is the pixel ratio. */
const OPEN_TEAMS = [
  { click: "summary:has-text('Équipes, trains')" },
  { click: "button:has-text('Rafraîchir')" },
  { wait: 1500 },
];
export const SCREENS = [
  {
    id: "cockpit-equipes",
    path: "/fr/machine",
    note: "The cockpit, « La machine », the opened section « Équipes, trains et arbre du travail, en détail » after a refresh: every ticket in progress under its feature and its epic, with its title and the pull requests that close it.",
    width: 1280,
    scale: 2,
    steps: OPEN_TEAMS,
    clipOf: { text: "De l'épopée à la PR", height: 585 },
  },
  {
    id: "cockpit-alertes",
    path: "/fr/machine?tab=alerts",
    note: "The cockpit, « La machine », Alertes: the watchdog's and the team sessions' open alerts, with severity, source, message, count and state (the two date columns are hidden: their layout overlaps, krizaka-internal#3894).",
    width: 1440,
    scale: 2,
    steps: [{ hide: "th:nth-child(5), td:nth-child(5), th:nth-child(6), td:nth-child(6)" }],
    clip: { x: 300, y: 445, width: 840, height: 390 },
  },
  {
    id: "cockpit-livraison",
    path: "/fr/machine?tab=delivery",
    note: "The cockpit, « La machine », Livraison: the merge queue of each repository, then what merged in 24 h and the red pull requests, cut under the figures' row.",
    width: 1100,
    scale: 2,
    clip: { x: 255, y: 435, width: 845, height: 445 },
  },
];

/* The refresh, as a short loop: the Livraison page, a click on « Rafraîchir ». Each frame is masked and guarded
   like a still; the frames are put end to end by ffmpeg. Times in milliseconds. */
export const LOOP = {
  id: "cockpit-rafraichir",
  path: "/fr/machine?tab=delivery",
  width: 1100,
  note: "The cockpit, « La machine », Livraison: a click on « Rafraîchir »; the collection date moves to now and the merge-queue badges are read again.",
  steps: [],
  button: "button:has-text('Rafraîchir')",
  clip: { x: 255, y: 130, width: 845, height: 400 },
  holdBefore: 3000,
  holdAfter: 3500,
  frameMs: 500,
  frames: 4,
  badge: /À jour · [^\n]+/,
  waitMax: 90000,
};

/** The frame list of a loop: [{ png, ms }]. Throws, writing nothing, as soon as one frame fails the guard. */
export async function loopFrames(page, { spec = LOOP, names = [] } = {}) {
  await runSteps(page, spec.steps);
  const grab = async (ms) => ({ png: (await guardedShot(page, { names, area: spec.clip })).png, ms });
  const frames = [await grab(spec.holdBefore)];
  const badge = (text) => spec.badge.exec(text)?.[0];
  const first = badge(await page.evaluate(visibleText));
  await page.click(spec.button, { timeout: 8000 });
  for (let i = 0; i < spec.frames; i++) {
    await page.waitForTimeout(spec.frameMs);
    frames.push(await grab(spec.frameMs));
  }
  // The collection takes a while: the wait is cut out of the clip (no frame is taken), and its length is said in the note.
  const started = Date.now();
  while (badge(await page.evaluate(visibleText)) === first) {
    if (Date.now() - started > spec.waitMax) throw new Error("the refresh did not finish, nothing written");
    await page.waitForTimeout(500);
  }
  frames.waitedMs = Date.now() - started + spec.frames * spec.frameMs;
  await page.waitForTimeout(800);
  frames.push(await grab(spec.holdAfter));
  return frames;
}

/** Makes <dir>/<slug>/<id>.webm, .mp4 and -poster.webp from the frames, and returns the `lib/media.json` entry of the clip. */
export async function clipEntry({ frames, spec = LOOP, slug, dir, takenOn, run = execFileSync }) {
  const { default: sharp } = await import("sharp");
  const work = join(dir, "frames");
  mkdirSync(work, { recursive: true });
  const list = frames
    .map((f, i) => {
      writeFileSync(join(work, `f${i}.png`), f.png);
      return `file 'f${i}.png'\nduration ${(f.ms / 1000).toFixed(3)}`;
    })
    .concat(`file 'f${frames.length - 1}.png'`)
    .join("\n");
  writeFileSync(join(work, "list.txt"), `${list}\n`);
  const total = (frames.reduce((n, f) => n + f.ms, 0) / 1000).toFixed(2);
  const out = join(dir, slug);
  mkdirSync(out, { recursive: true });
  const base = [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    join(work, "list.txt"),
    "-t",
    String(total),
    "-vf",
    "fps=10,scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-an",
  ];
  run("ffmpeg", [...base, "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", join(out, `${spec.id}.webm`)]);
  run("ffmpeg", [
    ...base,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "30",
    "-movflags",
    "+faststart",
    join(out, `${spec.id}.mp4`),
  ]);
  const first = frames[0].png;
  const { width, height } = await sharp(first).metadata();
  const poster = await sharp(first).webp({ quality: 78 }).toBuffer();
  writeFileSync(join(out, `${spec.id}-poster.webp`), poster);
  const tiny = await sharp(first).resize({ width: 24 }).webp({ quality: 20 }).toBuffer();
  const url = (name, data) => {
    const hash = createHash("sha256").update(data).digest("hex").slice(0, 10);
    const hashed = name.replace(/\.(\w+)$/, `.${hash}.$1`);
    return `${CDN}/${slug}/${hashed}`;
  };
  const webm = readFileSync(join(out, `${spec.id}.webm`));
  const mp4 = readFileSync(join(out, `${spec.id}.mp4`));
  return {
    kind: "video",
    width,
    height,
    blur: `data:image/webp;base64,${tiny.toString("base64")}`,
    poster: url(`${spec.id}-poster.webp`, poster),
    mp4: url(`${spec.id}.mp4`, mp4),
    webm: url(`${spec.id}.webm`, webm),
    bytes: { mp4: mp4.length, webm: webm.length },
    made: {
      model: "none: a screen recording of the local cockpit",
      engine:
        "Playwright (Chromium) frames put end to end by ffmpeg (VP9 and H.264), prefers-reduced-motion set to reduce, light theme",
      machine: "MacBook Pro, Apple M1 Max",
      costUsd: 0,
      note: `${spec.note} Taken on ${takenOn}: ${Math.round(frames.reduce((n, f) => n + f.ms, 0) / 1000)} seconds, muted; the refresh itself took about ${Math.round((frames.waitedMs ?? 0) / 1000)} seconds, the wait is cut out. Every frame has its sensitive values replaced by a placeholder and blurred before it is shot, and a guard refuses the clip if anything sensitive is readable (scripts/capture-cockpit.mjs). Not a generated video, not a Sovkora run.`,
    },
  };
}

const CDN = "https://krizaka-assets.b-cdn.net/sites/blog/posts";
const QUALITY = { avif: { quality: 52, effort: 6 }, webp: { quality: 78, effort: 5 } };

/** Makes the web files of a capture (AVIF + WebP at each width, named like the CDN will name them) in <dir>/<slug>/ and returns its
    `lib/media.json` entry: sizes, blur, provenance. Nothing is uploaded: that is krizaka-com's `cdn-assets.mjs upload <dir>/<slug> --to blog/posts/<slug>`. */
export async function mediaEntry({ png, id, slug, dir, note, takenOn }) {
  const { default: sharp } = await import("sharp");
  const { renditionWidths } = await import("./content-media.mjs");
  const src = readFileSync(png);
  const { width, height } = await sharp(src).metadata();
  const renditions = { avif: [], webp: [] };
  mkdirSync(join(dir, slug), { recursive: true });
  for (const w of renditionWidths(width)) {
    for (const f of ["avif", "webp"]) {
      const data = await sharp(src).resize({ width: w, withoutEnlargement: true })[f](QUALITY[f]).toBuffer();
      const hash = createHash("sha256").update(data).digest("hex").slice(0, 10);
      writeFileSync(join(dir, slug, `${id}-${w}.${f}`), data);
      renditions[f].push({ w, url: `${CDN}/${slug}/${id}-${w}.${hash}.${f}` });
    }
  }
  const tiny = await sharp(src).resize({ width: 24 }).webp({ quality: 20 }).toBuffer();
  return {
    kind: "image",
    width,
    height,
    blur: `data:image/webp;base64,${tiny.toString("base64")}`,
    srcs: renditions.webp,
    renditions,
    made: {
      model: "none: a screenshot of the local cockpit",
      engine: "Playwright (Chromium), prefers-reduced-motion set to reduce, light theme",
      machine: "MacBook Pro, Apple M1 Max",
      costUsd: 0,
      note: `${note} Taken on ${takenOn}. Capture of the local cockpit, sensitive values replaced then blurred (scripts/capture-cockpit.mjs): each value is replaced in the page by a placeholder of the same length before the shot, then the placeholder is blurred, and a guard refuses the image if anything sensitive is still readable. Not a generated picture, not a Sovkora run.`,
    },
  };
}

function record(root, id, entry) {
  const file = join(root, "lib/media.json");
  const media = JSON.parse(readFileSync(file, "utf8"));
  media[id] = entry;
  writeFileSync(file, `${JSON.stringify(media, null, 2)}\n`);
}

async function captureStill(browser, s, o) {
  const context = await browser.newContext({
    viewport: { width: s.width ?? 1440, height: 900 },
    deviceScaleFactor: s.scale ?? 1,
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  const page = await context.newPage();
  await page.goto(o.base + s.path, { waitUntil: "networkidle" });
  try {
    const out = join(o.out, `${s.id}.png`);
    const r = await shoot(page, { out, clip: s.clip, clipOf: s.clipOf, steps: s.steps, names: o.names });
    console.log(`${s.id}: ${r.bytes} bytes, masked ${JSON.stringify(r.counts)}`);
    if (o.record)
      record(
        o.root,
        s.id,
        await mediaEntry({ png: out, id: s.id, slug: o.record, dir: o.out, note: s.note, takenOn: today() }),
      );
    return 0;
  } catch (e) {
    console.error(`${s.id}: REFUSED — ${e.message}`);
    return 1;
  } finally {
    await context.close();
  }
}

async function captureLoop(browser, o) {
  const context = await browser.newContext({
    viewport: { width: LOOP.width, height: 900 },
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  const page = await context.newPage();
  await page.goto(o.base + LOOP.path, { waitUntil: "networkidle" });
  try {
    const frames = await loopFrames(page, { names: o.names });
    const entry = await clipEntry({ frames, slug: o.record ?? "clip", dir: o.out, takenOn: today() });
    console.log(`${LOOP.id}: ${frames.length} frames, webm ${entry.bytes.webm} bytes, mp4 ${entry.bytes.mp4} bytes`);
    if (o.record) record(o.root, LOOP.id, entry);
    return 0;
  } catch (e) {
    console.error(`${LOOP.id}: REFUSED — ${e.message}`);
    return 1;
  } finally {
    await context.close();
  }
}

const today = () => new Date().toISOString().slice(0, 10);

async function main() {
  const arg = (k, d) => {
    const i = process.argv.indexOf(k);
    return i >= 0 ? process.argv[i + 1] : d;
  };
  const out = arg("--out");
  if (!out) {
    console.error(
      "usage: node scripts/capture-cockpit.mjs --out <dir> [--base url] [--only id] [--record <post slug>] [--names 'A B,C D']",
    );
    process.exit(2);
  }
  const only = arg("--only");
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const names = (arg("--names", process.env.KZ_CAPTURE_NAMES ?? "") || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const o = { out, root, names, base: arg("--base", "http://127.0.0.1:3457"), record: arg("--record") };
  const { chromium } = await import(pathToFileURL(join(root, "node_modules/playwright/index.mjs")).href);
  const browser = await chromium.launch();
  let failed = 0;
  try {
    for (const s of SCREENS.filter((x) => !only || x.id === only)) failed += await captureStill(browser, s, o);
    if (!only || only === LOOP.id) failed += await captureLoop(browser, o);
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
