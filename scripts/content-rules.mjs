/* The rules a post must satisfy, as plain functions (used by `npm run lint` through check-content.mjs and by the tests). */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

export const RESERVED_SLUGS = new Set(["site", "_"]);
export const FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(en|fr)\.mdx$/;
export const CDN = "https://krizaka-assets.b-cdn.net/site/blog/";

/** The problems of one post (file name, parsed front matter, body); an empty list when it is fine. */
export function postProblems(file, data, body) {
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
  if (/```mermaid/.test(body)) out.push(`${file}: Mermaid is retired`);
  return out;
}

/** Every post of a directory: the problems, plus the pairs (a post in both languages shares its slug). */
export function checkDir(dir) {
  const problems = [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  for (const f of files) {
    const { data, content } = matter(readFileSync(join(dir, f), "utf8"));
    problems.push(...postProblems(f, data, content));
  }
  return { files, problems };
}
