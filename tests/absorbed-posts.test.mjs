import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";

/* A chapter's sources are the posts it absorbed. A source that is no longer a post must have its stub (lib/redirects.json),
   so that its old address keeps leading to the chapter. */
const map = JSON.parse(readFileSync(new URL("../lib/redirects.json", import.meta.url), "utf8"));
const chapters = readdirSync(new URL("../content/chapters/", import.meta.url)).filter((f) => f.endsWith(".mdx"));

test("every source of a chapter is either a live post or a retired post with a stub", () => {
  for (const f of chapters) {
    const locale = f.match(/\.(en|fr)\.mdx$/)[1];
    const { sources } = matter(readFileSync(new URL(`../content/chapters/${f}`, import.meta.url), "utf8")).data;
    for (const s of sources) {
      const live = existsSync(new URL(`../content/posts/${s}.${locale}.mdx`, import.meta.url));
      assert.ok(live || map[s]?.[locale], `${f}: source ${s} is a post or has a stub in ${locale}`);
    }
  }
});
