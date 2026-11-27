import test from "node:test";
import assert from "node:assert/strict";
import { allPosts, parsePost, plainText, postOf, postsOf, seriesOf, translationOf } from "../lib/posts.ts";

const mdx = (front, body = "Hello world.") => `---\n${front}\n---\n\n${body}\n`;

test("parsePost parses required and optional front matter fields, including YAML Dates and trimmed strings", () => {
  const post = parsePost(
    "sample-post.en.mdx",
    mdx(
      [
        'title: "  Sample Title  "',
        'description: "  A short description  "',
        "date: 2026-10-16",
        "publishedAt: 2026-10-16T21:44:17Z",
        "updated: 2026-10-18",
        'seoTitle: "  SEO Title  "',
        'seoDescription: "  SEO Desc  "',
        "tags: [ai, costs]",
        "author: oussama",
        "draft: false",
        "cover: hero-pic",
        'coverAlt: "  Hero alt  "',
        "featured: true",
        "series: measured",
        "part: 2",
        "image: https://krizaka-assets.b-cdn.net/blog/x.webp",
      ].join("\n"),
      "One two three.",
    ),
  );
  assert.equal(post.slug, "sample-post");
  assert.equal(post.locale, "en");
  assert.equal(post.title, "Sample Title");
  assert.equal(post.description, "A short description");
  assert.equal(post.date, "2026-10-16");
  assert.equal(post.publishedAt, "2026-10-16T21:44:17.000Z");
  assert.equal(post.updated, "2026-10-18");
  assert.equal(post.seoTitle, "SEO Title");
  assert.equal(post.seoDescription, "SEO Desc");
  assert.deepEqual(post.tags, ["ai", "costs"]);
  assert.equal(post.author, "oussama");
  assert.equal(post.draft, false);
  assert.equal(post.cover, "hero-pic");
  assert.equal(post.coverAlt, "Hero alt");
  assert.equal(post.featured, true);
  assert.equal(post.series, "measured");
  assert.equal(post.part, 2);
  assert.equal(post.image, "https://krizaka-assets.b-cdn.net/blog/x.webp");
  assert.equal(post.readingMinutes, 1);
});

test("parsePost accepts string dates/timestamps and drops blank or non-string optional fields", () => {
  const post = parsePost(
    "minimal.fr.mdx",
    mdx(
      [
        'title: "Titre"',
        'description: "Desc"',
        'date: "2026-10-16"',
        'publishedAt: "2026-10-16T10:00:00-04:00"',
        'updated: "2026-10-17"',
        'seoTitle: "   "',
        "seoDescription: 42",
        'cover: ""',
        'coverAlt: ""',
        "series: 123",
        'image: ""',
      ].join("\n"),
    ),
  );
  assert.equal(post.locale, "fr");
  assert.equal(post.date, "2026-10-16");
  assert.equal(post.publishedAt, "2026-10-16T10:00:00-04:00");
  assert.equal(post.updated, "2026-10-17");
  assert.equal(post.seoTitle, undefined);
  assert.equal(post.seoDescription, undefined);
  assert.equal(post.cover, undefined);
  assert.equal(post.coverAlt, undefined);
  assert.equal(post.series, undefined);
  assert.equal(post.image, undefined);
  assert.equal(post.author, "krizaka");
  assert.deepEqual(post.tags, []);

  const noTimestamps = parsePost(
    "bare.en.mdx",
    mdx('title: "Bare"\ndescription: "Desc"\ndate: "2026-10-16"\npublishedAt: 123'),
  );
  assert.equal(noTimestamps.publishedAt, undefined);
  assert.equal(noTimestamps.updated, undefined);
});

test("parsePost rejects invalid file names, missing required fields, and bad dates", () => {
  assert.throws(() => parsePost("Bad_Name.en.mdx", mdx("")), /the name must be <slug>\.<en\|fr>\.mdx/);
  assert.throws(() => parsePost("ok.en.mdx", mdx('description: "d"\ndate: "2026-10-16"')), /"title" is required/);
  assert.throws(
    () => parsePost("ok.en.mdx", mdx('title: "t"\ndescription: "   "\ndate: "2026-10-16"')),
    /"description" is required/,
  );
  assert.throws(
    () => parsePost("ok.en.mdx", mdx('title: "t"\ndescription: "d"\ndate: "16/10/2026"')),
    /"date" must be YYYY-MM-DD/,
  );
});

test("plainText strips code fences, HTML tags, and markdown link/image syntax", () => {
  const body =
    "Intro\n\n```ts\nconst hidden = 1;\n```\n\nRead [the guide](https://example.com) with <strong>bold</strong> and ![alt text](https://example.com/a.png).";
  assert.equal(plainText(body), "Intro Read the guide with bold and alt text.");
});

test("allPosts, postsOf, postOf, translationOf, and seriesOf read the repository posts", () => {
  const all = allPosts();
  assert.ok(all.length > 0);
  const en = postsOf("en");
  assert.ok(en.length > 0);
  assert.equal(postOf("en", en[0].slug)?.slug, en[0].slug);
  assert.equal(translationOf(en[0])?.locale, "fr");
  for (const group of seriesOf("en")) {
    assert.ok(group.posts.length > 0);
    for (let i = 1; i < group.posts.length; i++) {
      const prev = group.posts[i - 1];
      const curr = group.posts[i];
      assert.ok((prev.part ?? 99) <= (curr.part ?? 99));
    }
  }
});
