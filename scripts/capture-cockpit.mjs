#!/usr/bin/env node
/* Screenshots of the founder's local cockpit for a post, with nothing sensitive in the pixels.
   A blur is reversible (Unredacter, Depix), so a real value is never blurred: BEFORE the shot, every sensitive value of the page
   is REPLACED in the DOM by a placeholder of the same length ("•••"), and only that placeholder is blurred. Then a guard reads the
   visible text again (with a wider net than the masking used) and refuses to write the image if anything sensitive is left.
     node scripts/capture-cockpit.mjs --out <dir> [--base http://127.0.0.1:3457] [--only <id>] [--names "A B,C D"]
   Writes <dir>/<id>.png (1440 px, PNG chunks stripped to the critical ones: no text, no time, no ICC) and exits 1 without
   writing it when the guard finds a value. Used by content/posts/one-local-cockpit-to-run-the-whole-company. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/* The masking patterns: a value that matches is replaced. `name` says why, for the log (never the value). */
export const MASK = [
  {
    name: "money",
    re: /[-−]?\d[\d   .,]*\s?(?:\$|€|£|CAD|USD|EUR)(?![A-Za-z])|(?:US\$|\$|€|£|CAD|USD|EUR)\s?\d[\d   .,]*/g,
  },
  { name: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g },
  { name: "phone", re: /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g },
  { name: "postal", re: /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z](?:[\s-]?\d[ABCEGHJ-NPRSTV-Z]\d)?\b/g },
  {
    name: "address",
    re: /\b\d{1,5}[, ]+(?:rue|avenue|av\.|boulevard|boul\.|chemin|rang|street|st\.|road|rd\.|drive)\b[^,.;\n]{0,30}|\b(?:rue|avenue|boulevard|chemin)\s+[A-ZÉ][\p{L}'-]+|\bSainte?-Marguerite\b/giu,
  },
  { name: "tax-id", re: /\b\d{9}\s?(?:RT|TQ|RP)\s?\d{4}\b|\b\d{3}[ -]\d{3}[ -]\d{3}\b|\b\d{9,}\b/gi },
  {
    name: "token",
    re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]+)?)\b/g,
  },
  { name: "hex", re: /\b[0-9a-fA-F]{24,}\b/g },
  {
    name: "base64",
    re: /\b(?=[A-Za-z0-9+/_-]*\d)(?=[A-Za-z0-9+/_-]*[a-z])(?=[A-Za-z0-9+/_-]*[A-Z])[A-Za-z0-9+/_-]{32,}={0,2}/g,
  },
  { name: "secret-name", re: /\b[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSPHRASE)[A-Z0-9_]*\b/g },
  { name: "private-path", re: /(?:\/Users\/|\/private\/|\/var\/folders\/|~\/\.)[^\s"')]*/g },
  {
    name: "person",
    re: /\b(?:M\.|Mme|Mr|Mrs|Ms|Dr|Me)\s+[A-ZÉ][\p{L}'-]+(?:\s+[A-ZÉ][\p{L}'-]+)?|\bAbid\b|oussamaabid/gu,
  },
];

/* A line or a block that names one of these is a finance, tax, bank or security thing: the WHOLE block is replaced. */
export const SENSITIVE_WORDS =
  /\b(?:ledger|grand livre|comptabilit[ée]|accounting|bank|banque|iban|tps|tvq|gst|qst|impôts?|taxes?|factures?|invoices?|payroll|salaire|salary|secrets?|vault|coffre|sensible|sensitive|security|sécurité|credentials?|mot de passe|password)\b/i;

/* The guard's net is WIDER than the masking: any long digit run, any address-like at-sign, any currency next to a digit, any long
   hex, any private path. A pattern here that masking missed is a refusal, never a silent pass. */
export const GUARD = [
  ...MASK,
  { name: "digits-run", re: /\d{9,}|\b\d{3}[ .\u00a0-]\d{3}[ .\u00a0-]\d{3,4}\b/g },
  { name: "at-sign", re: /\S+@\S+/g },
  { name: "currency-digit", re: /[$€£]\s?\d|\d\s?[$€£]/g },
  { name: "long-hex", re: /\b[0-9a-fA-F]{20,}\b/g },
  { name: "sensitive-word", re: new RegExp(SENSITIVE_WORDS.source, "gi") },
];

/** The names of the patterns that match `text`, never the matched value. */
export function findings(text, patterns = GUARD) {
  const hit = [];
  for (const { name, re } of patterns) {
    re.lastIndex = 0;
    if (re.test(text)) hit.push(name);
    re.lastIndex = 0;
  }
  return hit;
}

/** Runs in the page: replaces what must not be read by a blurred placeholder of the same length. Returns the count per reason. */
export function maskInPage({ mask, words, names }) {
  const patterns = mask.map((m) => ({ name: m.name, re: new RegExp(m.re.source, m.re.flags) }));
  const wordRe = new RegExp(words.source, words.flags);
  const count = {};
  const style = document.createElement("style");
  style.textContent =
    "[data-kz-masked]{filter:blur(4px);user-select:none;pointer-events:none;display:inline-block;color:transparent;background:rgba(110,120,140,.4);border-radius:3px}";
  document.head.appendChild(style);
  const placeholder = (s) => s.replace(/\S/g, "•");
  const wrap = (node, start, end, why) => {
    const before = node.splitText(start);
    const rest = before.splitText(end - start);
    const span = document.createElement("span");
    span.setAttribute("data-kz-masked", why);
    span.textContent = placeholder(before.data);
    before.replaceWith(span);
    count[why] = (count[why] ?? 0) + 1;
    return rest;
  };
  const maskNode = (node, why) => {
    if (!node.data.trim()) return;
    wrap(node, 0, node.data.length, why);
  };
  const textNodes = (root) => {
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.parentElement &&
        !/^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.parentElement.tagName) &&
        !n.parentElement.closest("[data-kz-masked]")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  };
  /* 1. a block that names a finance / tax / bank / security word: all its text. */
  const BLOCK = "tr, li, [role=row], [role=listitem], article, dt, dd, summary, p";
  const done = new Set();
  for (const n of textNodes(document.body)) {
    if (!wordRe.test(n.data)) continue;
    const block = n.parentElement.closest(BLOCK) ?? n.parentElement;
    if (block.matches("nav, nav *, header, header *") || done.has(block)) continue;
    done.add(block);
    for (const t of textNodes(block)) maskNode(t, "sensitive-block");
  }
  /* 2. values, by pattern, inside the text that is left. */
  const named = names.map((n) => n.toLowerCase());
  for (const node of textNodes(document.body)) {
    let current = node;
    for (let guard = 0; guard < 200 && current; guard++) {
      let best = null;
      for (const { name, re } of patterns) {
        re.lastIndex = 0;
        const m = re.exec(current.data);
        if (m && m[0].length && (!best || m.index < best.start))
          best = { start: m.index, end: m.index + m[0].length, name };
      }
      for (const nm of named) {
        const i = current.data.toLowerCase().indexOf(nm);
        if (i >= 0 && (!best || i < best.start)) best = { start: i, end: i + nm.length, name: "person" };
      }
      if (!best) break;
      current = wrap(current, best.start, best.end, best.name);
    }
  }
  /* 3. attributes and form values a reader can see or select. */
  for (const el of document.querySelectorAll("input, textarea"))
    if (el.value) ((el.value = placeholder(el.value)), (el.style.filter = "blur(6px)"));
  for (const el of document.querySelectorAll("[title], [alt], [aria-label], [placeholder]"))
    for (const a of ["title", "alt", "aria-label", "placeholder"]) el.removeAttribute(a);
  document.title = "cockpit";
  return count;
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

/** Masks, guards, shoots. Throws (and writes nothing) when the guard finds something. */
export async function shoot(page, { out, clip, names = [] }) {
  const counts = await page.evaluate(maskInPage, { mask: MASK, words: SENSITIVE_WORDS, names });
  await page.waitForTimeout(150);
  const text = await page.evaluate(visibleText);
  const left = findings(text, GUARD);
  const leftNames = names.filter((n) => text.toLowerCase().includes(n.toLowerCase()));
  if (left.length || leftNames.length) {
    const err = new Error(
      `guard: ${[...left, ...leftNames.map(() => "person")].join(", ")} still visible, nothing written`,
    );
    err.findings = [...left, ...leftNames.map(() => "person")];
    throw err;
  }
  const png = stripPng(await page.screenshot({ fullPage: true, clip, animations: "disabled" }));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
  return { counts, bytes: png.length };
}

/* The screens of the post: id, address (French, light), the part of the page kept. Public: session titles, repositories, PR numbers,
   train and alert states. Not here: Coûts, Affaires, Entreprise, Documents, Secrets. */
export const SCREENS = [
  {
    id: "cockpit-sante",
    path: "/fr/machine",
    note: "The cockpit, « La machine », Santé: one verdict per block (teams, merge trains, scheduled tasks, alerts, locks).",
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  },
  {
    id: "cockpit-alertes",
    path: "/fr/machine?tab=alerts",
    note: "The cockpit, « La machine », Alertes: the watchdog's and the team sessions' open alerts, with severity, source and count.",
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  },
  {
    id: "cockpit-livraison",
    path: "/fr/machine?tab=delivery",
    note: "The cockpit, « La machine », Livraison: the merge queue of each repository, what merged in 24 h, the red pull requests.",
    clip: { x: 0, y: 0, width: 1440, height: 760 },
  },
];

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
  const base = arg("--base", "http://127.0.0.1:3457");
  const only = arg("--only");
  const record = arg("--record");
  const names = (arg("--names", process.env.KZ_CAPTURE_NAMES ?? "") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const { chromium } = await import(pathToFileURL(join(root, "node_modules/playwright/index.mjs")).href);
  const browser = await chromium.launch();
  let failed = 0;
  try {
    for (const s of SCREENS.filter((x) => !only || x.id === only)) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
        colorScheme: "light",
      });
      const page = await context.newPage();
      await page.goto(base + s.path, { waitUntil: "networkidle" });
      try {
        const r = await shoot(page, { out: join(out, `${s.id}.png`), clip: s.clip, names });
        console.log(`${s.id}: ${r.bytes} bytes, masked ${JSON.stringify(r.counts)}`);
        if (record) {
          const file = join(root, "lib/media.json");
          const media = JSON.parse(readFileSync(file, "utf8"));
          media[s.id] = await mediaEntry({
            png: join(out, `${s.id}.png`),
            id: s.id,
            slug: record,
            dir: out,
            note: s.note,
            takenOn: new Date().toISOString().slice(0, 10),
          });
          writeFileSync(file, `${JSON.stringify(media, null, 2)}\n`);
        }
      } catch (e) {
        failed++;
        console.error(`${s.id}: REFUSED — ${e.message}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
