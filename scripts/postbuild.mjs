#!/usr/bin/env node
/* After `next build`: llms.txt (llmstxt.org) written next to the pages in out/, linking the posts and the family. */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://blog.krizaka.com";
const dir = join(root, "content/posts");
const show = process.env.APP_SHOW_DRAFTS === "1";
const posts = readdirSync(dir)
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => ({ f, ...matter(readFileSync(join(dir, f), "utf8")) }))
  .filter((p) => show || p.data.draft !== true)
  .map((p) => {
    const [, slug, locale] = p.f.match(/^(.+)\.(en|fr)\.mdx$/);
    return { slug, locale, title: p.data.title, description: p.data.description, date: String(p.data.date instanceof Date ? p.data.date.toISOString().slice(0, 10) : p.data.date) };
  })
  .sort((a, b) => b.date.localeCompare(a.date));
const line = (p) => `- [${p.title}](${SITE}${p.locale === "fr" ? "/fr" : ""}/posts/${p.slug}/): ${p.description}`;
const list = (l) => (posts.filter((p) => p.locale === l).map(line).join("\n") || "- (no post published yet)");
writeFileSync(
  join(root, "out/llms.txt"),
  `# Krizaka Blog\n\n> The company blog of Krizaka (https://www.krizaka.com): notes on sovereign AI, measured costs and real document runs. English at the root, French under ${SITE}/fr/. Feeds: ${SITE}/feed.xml, ${SITE}/atom.xml.\n\n## Posts (English)\n\n${list("en")}\n\n## Billets (français)\n\n${list("fr")}\n\n## Elsewhere\n\n- [Krizaka](https://www.krizaka.com)\n- [Krizaka UI](https://ui.krizaka.com)\n- [Krizaka Java](https://java.krizaka.com)\n- [Source](https://github.com/krizaka/krizaka-blog)\n`,
);
console.log(`postbuild: llms.txt (${posts.length} posts)`);
