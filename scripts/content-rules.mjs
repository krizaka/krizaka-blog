// WHY  `npm run lint` checks every post and chapter against the rules of the blog; one entry point keeps the callers (check-content.mjs,
//      the tests, the media scripts) unchanged while the rules live in files of one subject each.
// WHAT `checkDir` (every post of a directory) and `homeCoverProblems`, and the re-export of the rules: names (content-names), media
//      (content-media), confidentiality (content-confidentiality), links (content-links), a post (content-post), chapters (content-chapters).
// HOW  Imported by scripts/check-content.mjs and the tests; run the check with `node scripts/check-content.mjs` (part of `npm run lint`).
// OWNER krizaka-blog (lane platform), ADR-026 phase D.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { featuredOrder } from "../lib/reading.ts";
import { linkProblems } from "./content-links.mjs";
import { postProblems } from "./content-post.mjs";

export * from "./content-chapters.mjs";
export * from "./content-confidentiality.mjs";
export * from "./content-links.mjs";
export * from "./content-media.mjs";
export * from "./content-names.mjs";
export { postProblems } from "./content-post.mjs";

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
      .map((p) => ({
        slug: p.file.replace(/\.(en|fr)\.mdx$/, ""),
        featured: p.data.featured === true,
        publishedAt: p.data.publishedAt,
        date: String(p.data.date ?? ""),
        cover: p.data.cover,
      }));
    const first = featuredOrder(published, HOME_CARDS);
    const diagrams = first.filter((p) => media[p.cover]?.style === "diagram");
    if (diagrams.length > HOME_DIAGRAM_COVERS_MAX)
      out.push(
        `home (${locale}): ${diagrams.length} of the first ${HOME_CARDS} cards have a diagram as cover (${diagrams.map((p) => p.slug).join(", ")}) — at most ${HOME_DIAGRAM_COVERS_MAX}: give a post an evocative picture or clip (a Sovkora run) and keep its diagram in the text`,
      );
  }
  return out;
}
