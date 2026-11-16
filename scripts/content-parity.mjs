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
const NARROW_SPACES = /[  ]/g;

/** Clock times on one 24-hour form: « 3:55 pm » (en) and « 15 h 55 » (fr) are both « 15:55 »; « 2 p.m. », « 14 h » and
 * « 14:00 » are all « 14 ». */
export function timesOf(text, locale) {
  const spaced = text.replace(NARROW_SPACES, " ");
  const clock = (hour, minutes) => (minutes && minutes !== "00" ? `${hour}:${minutes}` : `${hour}`);
  const local =
    locale === "fr"
      ? spaced.replace(/(?<![\d,.])(\d{1,2}) ?h(?: ?(\d\d))?(?![\p{L}\d])/gu, (_, h, m) => clock(Number(h), m))
      : spaced.replace(/(?<![\d,.])(\d{1,2})(?::(\d\d))? ?([ap])\.?m(?![a-z])\.?/gi, (_, h, m, ap) =>
          clock((Number(h) % 12) + (ap.toLowerCase() === "p" ? 12 : 0), m),
        );
  return local.replace(/(?<![\d,.])(\d{1,2}):00(?!\d)/g, "$1");
}

/** One written number on a neutral form: the French decimal comma and the English thousands commas removed. */
function plainNumber(token, locale) {
  let n = token;
  while (n.endsWith(".") || n.endsWith(",")) n = n.slice(0, -1);
  if (locale === "fr") return /^\d+,\d+$/.test(n) ? n.replace(",", ".") : n;
  return /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(n) ? n.replaceAll(",", "") : n;
}

/** Every number of a text, normalized: « 1 234,5 » (fr) and « 1,234.5 » (en) are both 1234.5.
 * @param {string} text
 * @param {"fr" | "en"} locale
 * @returns {Set<string>} */
export function numbersOf(text, locale) {
  const out = new Set();
  /* Data attributes (a chart's series, dates, ids) are written the same in both languages: read as plain digits. */
  let plain = timesOf(text, locale).replace(DATA_ATTRIBUTE, (_, value) => {
    for (const [n] of value.matchAll(/\d+(?:\.\d+)?/g)) out.add(n);
    return "";
  });
  plain = plain.replace(/\]\([^)]*\)/g, "]").replace(/https?:\/\/\S+/g, "");
  if (locale === "fr")
    plain = plain.replace(/(?<![\p{L}\d.,])\d{1,3}(?: \d{3})+(?!\d)/gu, (m) => m.replaceAll(" ", ""));
  for (const [m] of plain.matchAll(/(?<![\p{L}\d.,])\d[\d.,]*/gu)) out.add(plainNumber(m, locale));
  return out;
}

/** Link targets of a body: the language segment (`/fr/`, `site:www/en`) and the fragment (a heading's own words)
 * removed, so the two languages of one link compare equal. */
export function linksOf(body) {
  return [...body.matchAll(/\]\(([^\s)]+)/g)].map(([, href]) => {
    const target = href
      .split("#")[0]
      .replace(/(^|\/)(?:fr|en)(?=\/|$)/, "$1")
      .replace(/\/+/g, "/");
    return target || (href.startsWith("#") ? "#" : "/");
  });
}

/** A table's rule line (`|---|:---:|`). */
const isTableRule = (line) => {
  const t = line.trim();
  return t.includes("|") && t.includes("---") && /^[|:\- ]+$/.test(t);
};

/** The skeleton of a body: headings per level, components by name, tables. */
export function skeletonOf(body) {
  const prose = withoutCode(body);
  const lines = prose.split("\n");
  const components = {};
  for (const [, name] of prose.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)) components[name] = (components[name] ?? 0) + 1;
  return {
    h2: lines.filter((l) => l.startsWith("## ")).length,
    h3: lines.filter((l) => l.startsWith("### ")).length,
    tables: lines.filter(isTableRule).length,
    components,
  };
}

const byText = (a, b) => a.localeCompare(b);
const sorted = (list) => [...list].sort(byText);
const fact = (v) => JSON.stringify(v instanceof Date ? v.toISOString() : v);

function factProblems(fr, en) {
  return FACT_FIELDS.filter((field) => fact(fr[field]) !== fact(en[field])).map(
    (field) => `front matter ${field}: fr ${fact(fr[field])} ≠ en ${fact(en[field])}`,
  );
}

function skeletonProblems(fr, en) {
  const sf = skeletonOf(fr);
  const se = skeletonOf(en);
  const problems = ["h2", "h3", "tables"]
    .filter((key) => sf[key] !== se[key])
    .map((key) => `${key}: fr ${sf[key]} ≠ en ${se[key]}`);
  const names = sorted(new Set([...Object.keys(sf.components), ...Object.keys(se.components)]));
  for (const name of names) {
    const a = sf.components[name] ?? 0;
    const b = se.components[name] ?? 0;
    if (a !== b) problems.push(`<${name}>: fr ${a} ≠ en ${b}`);
  }
  return problems;
}

function linkProblems(fr, en) {
  const lf = linksOf(withoutCode(fr));
  const le = linksOf(withoutCode(en));
  const times = (list, href) => list.filter((h) => h === href).length;
  return [...new Set([...sorted(lf), ...sorted(le)])]
    .filter((href) => times(lf, href) !== times(le, href))
    .map((href) => `link ${href}: fr ${times(lf, href)} ≠ en ${times(le, href)}`);
}

function numberProblems(fr, en) {
  const nf = numbersOf(withoutCode(fr), "fr");
  const ne = numbersOf(withoutCode(en), "en");
  return [
    ...sorted(ne)
      .filter((n) => !nf.has(n))
      .map((n) => `number ${n}: in en, not in fr`),
    ...sorted(nf)
      .filter((n) => !ne.has(n))
      .map((n) => `number ${n}: in fr, not in en`),
  ];
}

/** Problems of one FR/EN pair, each a stable sentence (the allowlist names them exactly).
 * @param {string} frText - the whole .fr.mdx
 * @param {string} enText - the whole .en.mdx
 * @returns {string[]} */
export function parityProblems(frText, enText) {
  const fr = matter(frText);
  const en = matter(enText);
  return [
    ...factProblems(fr.data, en.data),
    ...skeletonProblems(fr.content, en.content),
    ...linkProblems(fr.content, en.content),
    ...numberProblems(fr.content, en.content),
    ...englishProblems(en.content),
  ];
}

/** The English text is written as English, not as French in English words: “ ” quotes, the dollar sign first.
 * @param {string} body
 * @returns {string[]} */
export function englishProblems(body) {
  const prose = withoutCode(body).replace(NARROW_SPACES, " ");
  const problems = [];
  const quotes = (prose.match(/«/g) ?? []).length;
  if (quotes) problems.push(`en: ${quotes} French quote(s) « » — English quotes are “ ”`);
  const amounts = [...prose.matchAll(/(?<![\p{L}\d.,$])\d[\d.,]* ?\$(?!\d)/gu)].map(([m]) => m);
  if (amounts.length) problems.push(`en: amount(s) written the French way (${amounts.join(", ")}) — write $12.50`);
  return problems;
}

/** Every slug that has both languages, per folder. */
export function pairsOf(root, dirs = ["content/chapters", "content/posts"]) {
  const pairs = [];
  for (const dir of dirs) {
    const names = new Set(readdirSync(join(root, dir)));
    for (const name of sorted(names))
      if (name.endsWith(".fr.mdx") && names.has(name.replace(/\.fr\.mdx$/, ".en.mdx")))
        pairs.push(`${dir}/${name.replace(/\.fr\.mdx$/, "")}`);
  }
  return pairs;
}

/** A pair's problems against its allowed ones: the new ones, and the allowed ones that are gone. */
function pairProblems(root, pair, allowed) {
  const found = parityProblems(
    readFileSync(join(root, `${pair}.fr.mdx`), "utf8"),
    readFileSync(join(root, `${pair}.en.mdx`), "utf8"),
  );
  const ok = new Set(allowed);
  return [
    ...found.filter((p) => !ok.has(p)).map((p) => `${pair}: ${p}`),
    ...allowed
      .filter((p) => !found.includes(p))
      .map((p) => `${pair}: « ${p} » is fixed — remove it from content-parity-allow.json`),
  ];
}

/** Problems of the whole content against the allowlist: a new gap, or an allowed gap that is gone.
 * @param {string} root
 * @param {{ excluded?: Record<string, string>, allowed?: Record<string, string[]> }} allow
 * @returns {{ problems: string[], pairs: number }} */
export function contentParity(root, allow) {
  const excluded = allow.excluded ?? {};
  const allowed = allow.allowed ?? {};
  const pairs = pairsOf(root);
  const problems = pairs
    .filter((pair) => !(pair in excluded))
    .flatMap((pair) => pairProblems(root, pair, allowed[pair] ?? []));
  for (const pair of [...Object.keys(allowed), ...Object.keys(excluded)])
    if (!pairs.includes(pair)) problems.push(`${pair}: no such FR/EN pair — remove it from content-parity-allow.json`);
  return { problems, pairs: pairs.length };
}

/** The problems grouped by pair, for `--json`. */
function byPair(problems) {
  const out = {};
  for (const p of problems) {
    const i = p.indexOf(": ");
    const key = p.slice(0, i);
    out[key] = [...(out[key] ?? []), p.slice(i + 2)];
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const allow = JSON.parse(readFileSync(join(root, "scripts/content-parity-allow.json"), "utf8"));
  const { problems, pairs } = contentParity(root, allow);
  if (process.argv.includes("--json")) console.log(JSON.stringify(byPair(problems), null, 2));
  else if (problems.length) {
    console.error(problems.join("\n"));
    console.error(
      `content-parity: ${problems.length} problem(s) — the FR and EN of a slug must have the same skeleton`,
    );
    process.exit(1);
  } else console.log(`content-parity: ${pairs} FR/EN pairs have the same skeleton`);
}
