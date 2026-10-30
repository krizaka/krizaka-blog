import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { llmsText, readEntries } from "../scripts/postbuild.mjs";
import { auditLlms } from "../scripts/check-seo-family.mjs";

/* llms.txt says what the blog is now (krizaka-blog#123): one page, the story — the chapters in reading order in each language,
   then « The basics », then the family. It passes the family's shape (scripts/check-seo-family.mjs). */
const root = new URL("..", import.meta.url).pathname;
const chapters = readEntries(join(root, "content/chapters"));
const posts = readEntries(join(root, "content/posts"));
const text = llmsText({ chapters, posts });

test("llms.txt lists every chapter in reading order, per language, at its /story/ address", () => {
  for (const [l, prefix, heading] of [
    ["en", "", "## The story (English)"],
    ["fr", "/fr", "## L'histoire (français)"],
  ]) {
    const section = text.slice(text.indexOf(heading), text.indexOf("\n## ", text.indexOf(heading) + 3));
    const numbers = [...section.matchAll(/^(\d+)\. \[/gm)].map((m) => Number(m[1]));
    const expected = chapters
      .filter((c) => c.locale === l)
      .map((c) => c.chapter)
      .sort((a, b) => a - b);
    assert.deepEqual(numbers, expected, `${l}: 1 → N`);
    for (const c of chapters.filter((x) => x.locale === l))
      assert.ok(section.includes(`https://blog.krizaka.com${prefix}/story/${c.slug}/`), `${l}: ${c.slug}`);
  }
});

test("llms.txt lists the basics at /basics/, never a removed address, and passes the family's audit", () => {
  for (const p of posts)
    assert.ok(text.includes(`https://blog.krizaka.com${p.locale === "fr" ? "/fr" : ""}/basics/${p.slug}/`), p.slug);
  assert.doesNotMatch(text, /\/(tags|series|search|saved|posts)\/|\/feed\//);
  assert.match(text, /one page, the story/);
  assert.deepEqual(auditLlms(text, { host: "https://blog.krizaka.com" }), []);
});
