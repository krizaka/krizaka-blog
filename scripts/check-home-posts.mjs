#!/usr/bin/env node
/* Every published post has a link on the home page, in each language (krizaka-internal#3219). After the build (out/ exists):

     node scripts/check-home-posts.mjs [--out out]

   With #320 two published posts left the home page and no check said so: the build passed and the founder found it on the site. */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The slugs of `slugs` that the home page `html` of `locale` never links (`/basics/<slug>`, `/fr/basics/<slug>` in French). */
export function missingFromHome(html, locale, slugs) {
  const prefix = locale === "en" ? "" : `/${locale}`;
  return slugs.filter((slug) => !html.includes(`href="${prefix}/basics/${slug}`));
}

/** The published posts of a language: the content files whose front matter does not say `draft: true`. */
function publishedSlugs(root, locale) {
  const dir = join(root, "content/posts");
  return readdirSync(dir)
    .filter((f) => f.endsWith(`.${locale}.mdx`))
    .filter((f) => !/^draft:\s*true\s*$/m.test(readFileSync(join(dir, f), "utf8").split(/^---\s*$/m)[1] ?? ""))
    .map((f) => f.slice(0, -`.${locale}.mdx`.length));
}

function main() {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const i = process.argv.indexOf("--out");
  const out = resolve(root, i === -1 ? "out" : process.argv[i + 1]);
  const problems = [];
  for (const [locale, page] of [
    ["en", "index.html"],
    ["fr", "fr/index.html"],
  ]) {
    const html = readFileSync(join(out, page), "utf8");
    for (const slug of missingFromHome(html, locale, publishedSlugs(root, locale)))
      problems.push(`${locale}: the home page has no link to the published post « ${slug} »`);
  }
  if (problems.length > 0) {
    console.error(`check-home-posts:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log("check-home-posts: every published post is linked from the home page, in each language");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
