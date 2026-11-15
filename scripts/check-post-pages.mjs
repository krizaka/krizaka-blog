#!/usr/bin/env node
/* The page contract of a post, on the built site (krizaka-internal#3643, founder 2026-11-15: « comment ça se fait que les contrôles ne
   l'ont pas détecté »): a regression of the end-of-post signature and of the other-language link went through because nothing read
   the built pages for them. After the build (out/ exists):

     node scripts/check-post-pages.mjs [--out out]

   Every published post whose author signs (lib/author-picture.ts, SIGNING_AUTHORS) ends with the Signature block (`aside.bl-sign`,
   after the article); the other-language action of its byline is a link (role link, `hreflang`, `lang`), never a button. */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { hasClass, readHtml } from "./html-tree.mjs";

/** What is wrong on one built post page: `html` of the page, `signs` whether its author signs, `hasOther` whether it has a translation. */
export function postPageProblems(html, { signs, hasOther }) {
  const page = readHtml(html);
  const problems = [];
  const signatures = page.tags("aside", (el) => hasClass(el, "bl-sign"));
  const article = page.tags("article", (el) => hasClass(el, "bl-article"))[0];
  if (signs) {
    if (signatures.length !== 1) problems.push(`the signature block shows ${signatures.length} times, expected once`);
    else if (article && signatures[0].startIndex < article.endIndex)
      problems.push("the signature is not after the article");
  } else if (signatures.length > 0) problems.push("the signature shows for an author who does not sign");
  const actions = page.tags("div", (el) => hasClass(el, "bl-byline-actions"))[0];
  if (hasOther) {
    const other = actions && page.tags("a", (el) => hasClass(el, "bl-byline-other")).find((el) => el.attribs.hreflang);
    if (!other) problems.push("the other-language action is not a link with hreflang");
    else if (other.attribs.role === "button" || hasClass(other, "kz-button"))
      problems.push("the other-language action is styled as a button");
    if (actions && page.tags("button", (el) => hasClass(el, "bl-byline-other")).length > 0)
      problems.push("the other-language action is a <button>");
  }
  return problems;
}

function main() {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const i = process.argv.indexOf("--out");
  const out = resolve(root, i === -1 ? "out" : process.argv[i + 1]);
  const signing = [
    ...readFileSync(join(root, "lib/author-picture.ts"), "utf8")
      .match(/SIGNING_AUTHORS = \[([^\]]*)\]/)[1]
      .matchAll(/"([^"]+)"/g),
  ].map((m) => m[1]);
  const dir = join(root, "content/posts");
  const problems = [];
  let checked = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
    const m = file.match(/^(.+)\.(en|fr)\.mdx$/);
    if (!m) continue;
    const { data } = matter(readFileSync(join(dir, file), "utf8"));
    if (data.draft) continue;
    const [, slug, locale] = m;
    const hasOther = readdirSync(dir).includes(`${slug}.${locale === "en" ? "fr" : "en"}.mdx`);
    const page = join(out, locale === "en" ? "" : "fr", "basics", slug, "index.html");
    let html;
    try {
      html = readFileSync(page, "utf8");
    } catch {
      continue; // a post kept as a story chapter or a stub has its own contract
    }
    checked += 1;
    for (const p of postPageProblems(html, { signs: signing.includes(String(data.author)), hasOther }))
      problems.push(`${locale}/${slug}: ${p}`);
  }
  if (checked === 0) problems.push("no built post page was found under /basics/");
  if (problems.length > 0) {
    console.error(`check-post-pages:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`check-post-pages: ${checked} post pages, signature and other-language link as contracted`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
