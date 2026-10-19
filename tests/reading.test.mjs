import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";
import { DESCRIPTION_MAX, TITLE_MAX, featuredOrder, headingsOf, metaDescription, neighbours, titleTag } from "../lib/reading.ts";

/* What the post page derives from a post: its table of contents (the h2 ids rehype-slug writes), its place in a series,
   and the title tag and description the search engines read. */

test("the table of contents is the h2s, with the ids rehype-slug gives them; code fences and h3s are not in it", () => {
  const body = "Intro\n\n## Spring Boot 4, Spring AI 2, and models that become data\n\ntext\n\n### Detail\n\n```bash\n## not a heading\n```\n\n## The [ClassCastException](https://x.y) that killed the `chat`\n\n## Spring Boot 4, Spring AI 2, and models that become data\n";
  assert.deepEqual(headingsOf(body), [
    { id: "spring-boot-4-spring-ai-2-and-models-that-become-data", text: "Spring Boot 4, Spring AI 2, and models that become data" },
    { id: "the-classcastexception-that-killed-the-chat", text: "The ClassCastException that killed the chat" },
    { id: "spring-boot-4-spring-ai-2-and-models-that-become-data-1", text: "Spring Boot 4, Spring AI 2, and models that become data" },
  ]);
  assert.deepEqual(headingsOf("## Ce qu'Orazaka en fait")[0].id, "ce-quorazaka-en-fait");
});

test("a post's neighbours in its series: the previous and the next part, none past the ends", () => {
  const list = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
  assert.deepEqual(neighbours(list, "b"), { prev: { slug: "a" }, next: { slug: "c" } });
  assert.deepEqual(neighbours(list, "a"), { prev: undefined, next: { slug: "b" } });
  assert.deepEqual(neighbours(list, "c"), { prev: { slug: "b" }, next: undefined });
  assert.deepEqual(neighbours(list, "z"), { prev: undefined, next: undefined });
});

test("the title tag: the post's seoTitle when it has one, else the title and the blog's name; the description likewise", () => {
  assert.equal(titleTag({ title: "Long title", seoTitle: "Short" }, "Krizaka Blog"), "Short");
  assert.equal(titleTag({ title: "A post" }, "Krizaka Blog"), "A post — Krizaka Blog");
  assert.equal(metaDescription({ description: "Long", seoDescription: "Short" }), "Short");
  assert.equal(metaDescription({ description: "Only" }), "Only");
});

const dir = new URL("../content/posts/", import.meta.url);
const published = readdirSync(dir)
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => ({ f, ...matter(readFileSync(new URL(f, dir), "utf8")) }))
  .filter((p) => p.data.draft !== true);

test(`every published post: a title tag of at most ${TITLE_MAX} characters and a description of at most ${DESCRIPTION_MAX}`, () => {
  assert.ok(published.length >= 4);
  for (const { f, data } of published) {
    const title = titleTag(data, "Krizaka Blog");
    const description = metaDescription(data);
    assert.ok(title.length <= TITLE_MAX, `${f}: title tag is ${title.length} characters: ${title}`);
    assert.ok(description.length <= DESCRIPTION_MAX, `${f}: description is ${description.length} characters`);
  }
});

test("every topic a published post wears has its own title tag and description, in both languages", () => {
  for (const locale of ["en", "fr"]) {
    const t = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"));
    for (const { f, data } of published.filter((p) => p.f.endsWith(`.${locale}.mdx`))) {
      for (const tag of data.tags ?? []) {
        const seo = t.tags.seo?.[tag];
        assert.ok(seo, `${f}: the topic "${tag}" has no tags.seo.${tag} in ${locale}.json`);
        assert.ok(seo.title.length <= TITLE_MAX, `${locale} tags.seo.${tag}.title is ${seo.title.length} characters`);
        assert.ok(seo.description.length <= DESCRIPTION_MAX, `${locale} tags.seo.${tag}.description is ${seo.description.length} characters`);
      }
    }
  }
});


test("a heading's text drops markup, even nested or broken", () => {
  assert.equal(headingsOf("## A <b>bold</b> <<i>x</i>i> word")[0].text.includes("<"), false);
});

test("featured: the newest first unless a post is pinned (featured: true), then by publication time, three at most", () => {
  const p = (slug, publishedAt, featured = false) => ({ slug, publishedAt, featured });
  const posts = [p("a", "2026-10-16T09:06:09-04:00"), p("b", "2026-10-16T21:44:17-04:00"), p("c", "2026-10-15T10:00:00-04:00"), p("d", "2026-10-16T09:06:09-04:00")];
  assert.deepEqual(featuredOrder(posts).map((x) => x.slug), ["b", "a", "d"]);
  posts[2].featured = true;
  assert.deepEqual(featuredOrder(posts).map((x) => x.slug), ["c", "b", "a"]);
});

test("on the blog as published: the newest post is the first featured one in each language", () => {
  for (const locale of ["en", "fr"]) {
    const mine = published.filter((x) => x.f.endsWith(`.${locale}.mdx`)).map((x) => ({ slug: x.f.split(".")[0], publishedAt: x.data.publishedAt, featured: x.data.featured === true }));
    const newest = [...mine].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0];
    if (!mine.some((x) => x.featured)) assert.equal(featuredOrder(mine)[0].slug, newest.slug);
  }
});

test("a post's questions section becomes its FAQ: each h3 a question, the text under it the answer (links and <Model> keep their words)", async () => {
  const { faqOf } = await import("../lib/reading.ts");
  const body = "Intro\n\n### Not a question\n\ntext\n\n## Questions fréquentes\n\n### Quel GPU pour un LLM de 7B ?\n\nUn GPU de **8 Go**, voir [le billet](/fr/posts/x/) et <Model id=\"qwen25-7b\">Qwen 2.5 7B</Model>.\n\nSecond paragraphe.\n\n### Empty?\n\n## After\n\n### Not in the FAQ\n\nno\n";
  assert.deepEqual(faqOf(body), [{ question: "Quel GPU pour un LLM de 7B ?", answer: "Un GPU de 8 Go, voir le billet et Qwen 2.5 7B. Second paragraphe." }]);
  assert.deepEqual(faqOf("## FAQ\n\n```md\n### no\n```\n"), []);
  assert.deepEqual(faqOf("no section"), []);
  assert.deepEqual(faqOf("## FAQ\n\n### Q\n\nA <<script>script>x 3 > 2\n"), [{ question: "Q", answer: "A x 3 2" }]);
});
