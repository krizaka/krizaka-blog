#!/usr/bin/env node
/* After `next build`: llms.txt (llmstxt.org) written next to the pages in out/. The blog is one page, the story
   (krizaka-blog#123): llms.txt says so, lists the chapters in reading order (1 → N) in each language, then « The basics », then
   the family. The text is `llmsText`, pure and tested (tests/llms.test.mjs). */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SITE = "https://blog.krizaka.com";

const dateOf = (d) => String(d instanceof Date ? d.toISOString().slice(0, 10) : d);

/** The published entries of a content folder: slug, locale, title, description, date, and a chapter's number. */
export function readEntries(dir, show = false) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => ({ f, ...matter(readFileSync(join(dir, f), "utf8")) }))
    .filter((p) => show || p.data.draft !== true)
    .map((p) => {
      const [, slug, locale] = p.f.match(/^(.+)\.(en|fr)\.mdx$/);
      return {
        slug,
        locale,
        title: p.data.title,
        description: p.data.description,
        date: dateOf(p.data.date),
        chapter: Number(p.data.chapter) || undefined,
        period: p.data.period ? String(p.data.period) : undefined,
        stats: Array.isArray(p.data.stats) ? p.data.stats : [],
        headings: [...p.content.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim()),
      };
    });
}

/** llms.txt: the story's chapters in reading order, then the basics (newest first), per language, then the family. */
export function llmsText({ chapters, posts }) {
  const prefix = (l) => (l === "fr" ? "/fr" : "");
  const story = (l) =>
    chapters
      .filter((c) => c.locale === l)
      .sort((a, b) => a.chapter - b.chapter)
      .map((c) => `${c.chapter}. [${c.title}](${SITE}${prefix(l)}/story/${c.slug}/): ${c.description}`)
      .join("\n") || "- (no chapter published yet)";
  const basics = (l) =>
    posts
      .filter((p) => p.locale === l)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((p) => `- [${p.title}](${SITE}${prefix(l)}/basics/${p.slug}/): ${p.description}`)
      .join("\n") || "- (no post published yet)";
  return `# Krizaka Blog

> The building notes of Krizaka (https://www.krizaka.com), told by its founder in Montréal: one page, the story, in chapters you read in order, and a few basics to understand them. English at ${SITE}/, French at ${SITE}/fr/. Feeds: ${SITE}/feed.xml, ${SITE}/atom.xml.

## The story (English), in reading order

${story("en")}

## The basics (English)

${basics("en")}

## L'histoire (français), dans l'ordre de lecture

${story("fr")}

## Les bases (français)

${basics("fr")}

## Elsewhere

- [Krizaka](https://www.krizaka.com)
- [Krizaka UI](https://ui.krizaka.com)
- [Krizaka Java](https://java.krizaka.com)
- [Source](https://github.com/krizaka/krizaka-blog)
`;
}

/** llms-full.txt: the same story with what each chapter holds (its period, the sections it walks through, the figures it gives), so a model can choose a chapter without opening them all. */
export function llmsFullText({ chapters, posts }) {
  const prefix = (l) => (l === "fr" ? "/fr" : "");
  const chapter = (c) =>
    [
      `### ${c.chapter}. ${c.title}`,
      `${SITE}${prefix(c.locale)}/story/${c.slug}/${c.period ? ` (${c.period})` : ""}`,
      c.description,
      c.headings.length ? `Sections: ${c.headings.join(" / ")}` : "",
      ...c.stats.map((s) => `- ${s.value} ${s.label}`),
    ]
      .filter(Boolean)
      .join("\n");
  const part = (l, title) =>
    `## ${title}\n\n${
      chapters
        .filter((c) => c.locale === l)
        .sort((a, b) => a.chapter - b.chapter)
        .map(chapter)
        .join("\n\n") || "(no chapter published yet)"
    }`;
  return `${llmsText({ chapters, posts })
    .split("\n## Elsewhere")[0]
    .replace(/\n## .*$/s, "")}
${part("en", "The story, chapter by chapter (English)")}

${part("fr", "L'histoire, chapitre par chapitre (français)")}
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const show = process.env.APP_SHOW_DRAFTS === "1";
  const chapters = readEntries(join(root, "content/chapters"), show);
  const posts = readEntries(join(root, "content/posts"), show);
  writeFileSync(join(root, "out/llms.txt"), llmsText({ chapters, posts }));
  writeFileSync(join(root, "out/llms-full.txt"), llmsFullText({ chapters, posts }));
  console.log(`postbuild: llms.txt, llms-full.txt (${chapters.length} chapters, ${posts.length} posts)`);
}
