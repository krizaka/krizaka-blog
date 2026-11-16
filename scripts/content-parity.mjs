#!/usr/bin/env node
/* FR/EN parity of a post or chapter (krizaka-internal#3971): the two languages of one slug must carry the same
   structure — the same `##` and `###` headings, the same blocks (every MDX component: <Figure>, <Clip>, <Architecture>,
   <Pipeline>, <Compare>…), the same tables, the same links, the same front-matter facts, and every number of one text
   in the other. The words are free; the skeleton and the facts are not.
   `npm run lint` runs it (`node scripts/content-parity.mjs`). A known gap sits in `content-parity-allow.json` with
   the exact problem it accepts: the list only shrinks — an entry that no longer matches a problem fails too. */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

/** Front-matter fields that are facts, the same in both languages. */
export const FACT_FIELDS = /** @type {const} */ ([
  "date",
  "publishedAt",
  "draft",
  "cover",
  "tags",
  "author",
  "series",
  "part",
  "chapter",
  "period",
  "newsletter",
  "sensitive",
]);

/** The body without code: fenced blocks and inline code are the same program in both languages and are not prose. */
const withoutCode = (body) => body.replace(/^[ \t]*(```|~~~)[\s\S]*?^[ \t]*\1[^\n]*$/gm, "").replace(/`[^`\n]*`/g, "");

/** Attributes whose value is data, not words. */
const DATA_ATTRIBUTE = /\b(?:id|data|dates|level|hourly|hosted|seconds|part|chapter)="([^"]*)"/g;

/** Clock times on one 24-hour form: « 3:55 pm » (en) and « 15 h 55 » (fr) are both « 15:55 », « 2 p.m. » and « 14 h » both « 14 ». */
export function timesOf(text, locale) {
  if (locale === "fr")
    return text.replace(
      /(?<![\d,.])(\d{1,2})[\u00a0\u202f ]?h(?:[\u00a0\u202f ]?(\d{2}))?(?![\p{L}\d])/gu,
      (_, h, m) => (m ? `${Number(h)}:${m}` : `${Number(h)}`),
    );
  return text.replace(/(?<![\d,.])(\d{1,2})(?::(\d{2}))?[\u00a0\u202f ]?([ap])\.?m\b\.?/gi, (_, h, m, ap) => {
    const hour = (Number(h) % 12) + (ap.toLowerCase() === "p" ? 12 : 0);
    return m ? `${hour}:${m}` : `${hour}`;
  });
}

/** Every number of a text, normalized: « 1 234,5 » (fr) and « 1,234.5 » (en) are both 1234.5.
 * @param {string} text
 * @param {"fr" | "en"} locale
 * @returns {Set<string>} */
export function numbersOf(text, locale) {
  const out = new Set();
  text = timesOf(text, locale);
  /* Data attributes (a chart's series, dates, ids) are written the same in both languages: read as plain digits. */
  const plain = text
    .replace(DATA_ATTRIBUTE, (_, value) => {
      for (const [n] of value.matchAll(/\d+(?:\.\d+)?/g)) out.add(n);
      return "";
    })
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/https?:\/\/\S+/g, "");
  const re =
    locale === "fr"
      ? /(?<![\p{L}\d,.])(?:\d{1,3}(?:[\u00a0\u202f ]\d{3})+(?:,\d+)?|\d+(?:[,.]\d+)*)/gu
      : /(?<![\p{L}\d,.])(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)*)/gu;
  for (const [m] of plain.matchAll(re)) {
    let n = m;
    if (locale === "fr") n = /[   ]/.test(n) ? n.replace(/[   ]/g, "").replace(",", ".") : n;
    if (locale === "fr" && /^\d+,\d+$/.test(n)) n = n.replace(",", ".");
    if (locale === "en" && /^\d{1,3}(,\d{3})+/.test(n)) n = n.replace(/,/g, "");
    out.add(n);
  }
  return out;
}

/** Link targets of a body: the language segment (`/fr/`, `site:www/en`) and the fragment (a heading's own words)
 * removed, so the two languages of one link compare equal. */
export function linksOf(body) {
  return [...body.matchAll(/(?<!!)\[[^\]\n]*\]\(([^)\s]+)[^)]*\)/g)].map(([, href]) => {
    const target = href
      .replace(/#.*$/, "")
      .replace(/(^|\/)(?:fr|en)(?=\/|$)/, "$1")
      .replace(/\/+/g, "/");
    return target || (href.startsWith("#") ? "#" : "/");
  });
}

/** The skeleton of a body: headings per level, components by name, tables. */
export function skeletonOf(body) {
  const prose = withoutCode(body);
  const count = (re) => (prose.match(re) ?? []).length;
  const components = {};
  for (const [, name] of prose.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)) components[name] = (components[name] ?? 0) + 1;
  return {
    h2: count(/^## /gm),
    h3: count(/^### /gm),
    tables: count(/^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$|^\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm),
    components,
  };
}

const sorted = (list) => [...list].sort();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Problems of one FR/EN pair, each a stable sentence (the allowlist names them exactly).
 * @param {string} frText - the whole .fr.mdx
 * @param {string} enText - the whole .en.mdx
 * @returns {string[]} */
export function parityProblems(frText, enText) {
  const fr = matter(frText);
  const en = matter(enText);
  const problems = [];
  for (const field of FACT_FIELDS) {
    const a = fr.data[field];
    const b = en.data[field];
    if (!same(a instanceof Date ? a.toISOString() : a, b instanceof Date ? b.toISOString() : b))
      problems.push(`front matter ${field}: fr ${JSON.stringify(a)} ≠ en ${JSON.stringify(b)}`);
  }
  const sf = skeletonOf(fr.content);
  const se = skeletonOf(en.content);
  for (const key of ["h2", "h3", "tables"])
    if (sf[key] !== se[key]) problems.push(`${key}: fr ${sf[key]} ≠ en ${se[key]}`);
  for (const name of sorted(new Set([...Object.keys(sf.components), ...Object.keys(se.components)])))
    if ((sf.components[name] ?? 0) !== (se.components[name] ?? 0))
      problems.push(`<${name}>: fr ${sf.components[name] ?? 0} ≠ en ${se.components[name] ?? 0}`);
  const lf = sorted(linksOf(withoutCode(fr.content)));
  const le = sorted(linksOf(withoutCode(en.content)));
  for (const href of new Set([...lf, ...le])) {
    const a = lf.filter((h) => h === href).length;
    const b = le.filter((h) => h === href).length;
    if (a !== b) problems.push(`link ${href}: fr ${a} ≠ en ${b}`);
  }
  const nf = numbersOf(withoutCode(fr.content), "fr");
  const ne = numbersOf(withoutCode(en.content), "en");
  for (const n of sorted(ne)) if (!nf.has(n)) problems.push(`number ${n}: in en, not in fr`);
  for (const n of sorted(nf)) if (!ne.has(n)) problems.push(`number ${n}: in fr, not in en`);
  return [...problems, ...englishProblems(en.content)];
}

/** The English text is written as English, not as French in English words: “ ” quotes, the dollar sign first.
 * @param {string} body
 * @returns {string[]} */
export function englishProblems(body) {
  const prose = withoutCode(body);
  const problems = [];
  const quotes = (prose.match(/«/g) ?? []).length;
  if (quotes) problems.push(`en: ${quotes} French quote(s) « » — English quotes are “ ”`);
  const amounts = [...prose.matchAll(/(?<![\p{L}\d.,$])\d[\d.,]*[\u00a0\u202f ]?\$(?!\d)/gu)].map(([m]) => m);
  if (amounts.length) problems.push(`en: amount(s) written the French way (${amounts.join(", ")}) — write $12.50`);
  return problems;
}

/** Every slug that has both languages, per folder. */
export function pairsOf(root, dirs = ["content/chapters", "content/posts"]) {
  const pairs = [];
  for (const dir of dirs) {
    const names = new Set(readdirSync(join(root, dir)));
    for (const name of [...names].sort())
      if (name.endsWith(".fr.mdx") && names.has(name.replace(/\.fr\.mdx$/, ".en.mdx")))
        pairs.push(`${dir}/${name.replace(/\.fr\.mdx$/, "")}`);
  }
  return pairs;
}

/** Problems of the whole content against the allowlist: a new gap, or an allowed gap that is gone.
 * @param {string} root
 * @param {{ excluded?: Record<string, string>, allowed?: Record<string, string[]> }} allow
 * @returns {{ problems: string[], pairs: number }} */
export function contentParity(root, allow) {
  const excluded = allow.excluded ?? {};
  const allowed = allow.allowed ?? {};
  const problems = [];
  const pairs = pairsOf(root);
  for (const pair of pairs) {
    if (pair in excluded) continue;
    const found = parityProblems(
      readFileSync(join(root, `${pair}.fr.mdx`), "utf8"),
      readFileSync(join(root, `${pair}.en.mdx`), "utf8"),
    );
    const ok = new Set(allowed[pair] ?? []);
    for (const p of found) if (!ok.has(p)) problems.push(`${pair}: ${p}`);
    for (const p of ok)
      if (!found.includes(p)) problems.push(`${pair}: « ${p} » is fixed — remove it from content-parity-allow.json`);
  }
  for (const pair of [...Object.keys(allowed), ...Object.keys(excluded)])
    if (!pairs.includes(pair)) problems.push(`${pair}: no such FR/EN pair — remove it from content-parity-allow.json`);
  return { problems, pairs: pairs.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const allow = JSON.parse(readFileSync(join(root, "scripts/content-parity-allow.json"), "utf8"));
  const { problems, pairs } = contentParity(root, allow);
  if (process.argv.includes("--json")) {
    const byPair = {};
    for (const p of problems) {
      const i = p.indexOf(": ");
      (byPair[p.slice(0, i)] ??= []).push(p.slice(i + 2));
    }
    console.log(JSON.stringify(byPair, null, 2));
  } else if (problems.length) {
    console.error(problems.join("\n"));
    console.error(
      `content-parity: ${problems.length} problem(s) — the FR and EN of a slug must have the same skeleton`,
    );
    process.exit(1);
  } else console.log(`content-parity: ${pairs} FR/EN pairs have the same skeleton`);
}
