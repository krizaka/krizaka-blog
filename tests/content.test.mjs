import test from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDir, linkProblems, postProblems } from "../scripts/content-rules.mjs";

const ok = { title: "T", description: "D", date: "2026-10-16", tags: ["ai"], draft: true };

test("a well-formed post has no problem", () => assert.deepEqual(postProblems("a-post.en.mdx", ok, "text"), []));
test("the file name must carry slug and language", () => assert.equal(postProblems("A Post.mdx", ok, "").length, 1));
test("reserved slugs are refused", () => assert.match(postProblems("site.en.mdx", ok, "")[0], /reserved/));
test("title, description and a real date are required", () => {
  assert.equal(postProblems("x.en.mdx", { ...ok, title: "" }, "").length, 1);
  assert.equal(postProblems("x.en.mdx", { ...ok, description: undefined }, "").length, 1);
  assert.equal(postProblems("x.en.mdx", { ...ok, date: "16/10/2026" }, "").length, 1);
});
test("an image must be on the media CDN, in the cover and in the text", () => {
  assert.equal(postProblems("x.en.mdx", { ...ok, image: "/local.png" }, "").length, 1);
  assert.deepEqual(postProblems("x.en.mdx", { ...ok, image: "https://krizaka-assets.b-cdn.net/site/blog/x/cover.webp" }, "![a](https://krizaka-assets.b-cdn.net/site/blog/x/a.webp)"), []);
  assert.equal(postProblems("x.en.mdx", ok, "![a](/a.png)").length, 1);
});
test("a link between posts leads to a post of that language, never from a published post to a draft", () => {
  const post = (file, draft, body = "") => ({ file, data: { draft }, body });
  const posts = [post("a.en.mdx", false, "See [b](/posts/b/) and [c](/fr/posts/c)."), post("b.en.mdx", false), post("c.fr.mdx", false)];
  assert.deepEqual(linkProblems(posts), []);
  assert.match(linkProblems([post("a.en.mdx", false, "[gone](/posts/gone)")])[0], /not a post/);
  assert.match(linkProblems([post("a.en.mdx", false, "[b](/fr/posts/b)"), post("b.en.mdx", false)])[0], /not a post/);
  assert.match(linkProblems([post("a.fr.mdx", false, "[d](/fr/posts/d/)"), post("d.fr.mdx", true)])[0], /draft/);
  assert.deepEqual(linkProblems([post("a.fr.mdx", true, "[d](/fr/posts/d/)"), post("d.fr.mdx", true)]), []);
});
test("Mermaid is refused", () => assert.equal(postProblems("x.en.mdx", ok, "```mermaid\ngraph TD\n```").length, 1));
test("the posts of the repository follow the rules, and no post is published without a draft decision", () => {
  const { files, problems } = checkDir(join(dirname(fileURLToPath(import.meta.url)), "../content/posts"));
  assert.deepEqual(problems, []);
  assert.ok(files.length >= 6);
});

test("the preview build is private: token-gated, under /preview/<token>, never indexable", async () => {
  const { readFileSync } = await import("node:fs");
  const r = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  assert.match(r("package.json"), /"build": "npm run gen && node scripts\/build\.mjs"/);
  assert.match(r("scripts/build.mjs"), /out\/preview\/\$\{token\}|preview\/\$\{token\}/);
  assert.match(r("next.config.ts"), /APP_PREVIEW_PATH/);
  assert.match(r("lib/site.ts"), /APP_INDEXING_ENABLED === "true" && !process\.env\.APP_PREVIEW_PATH/);
  assert.match(r(".do/app.yaml"), /APP_PREVIEW_TOKEN[\s\S]*type: SECRET[\s\S]*value: unset/);
  assert.doesNotMatch(r("app/sitemap.ts"), /preview/);
});

test("a search title is at most 60 characters and a search description at most 155", () => {
  assert.deepEqual(postProblems("x.en.mdx", { ...ok, seoTitle: "a".repeat(60), seoDescription: "b".repeat(155) }, ""), []);
  assert.match(postProblems("x.en.mdx", { ...ok, seoTitle: "a".repeat(61) }, "")[0], /seoTitle/);
  assert.match(postProblems("x.en.mdx", { ...ok, seoDescription: "b".repeat(156) }, "")[0], /seoDescription/);
});

test("a component prop written as a JS expression is refused: the renderer drops it silently (the calculator showed NaN)", () => {
  assert.match(postProblems("x.en.mdx", ok, "<Utilization hourly={3.99} seconds={175} hosted={0.6} />")[0], /expression/);
  assert.deepEqual(postProblems("x.en.mdx", ok, '<Utilization hourly="3.99" seconds="175" hosted="0.6" />\n\n```js\nconst a = {b: 1};\n```'), []);
});

test("a cover is also shown in the body (a phone does not get the cover: it reads the picture where the text is)", () => {
  const ctx = { media: { a: { kind: "image" } }, series: [] };
  assert.match(postProblems("x.en.mdx", { ...ok, cover: "a" }, "text only", ctx).join(" "), /cover/);
  assert.deepEqual(postProblems("x.en.mdx", { ...ok, cover: "a" }, '<Figure id="a" alt="A picture" />', ctx), []);
});

test("every code fence declares its language (highlighting needs it; `text` for plain output)", () => {
  assert.match(postProblems("x.en.mdx", ok, "Intro\n\n```\nnpm ci\n```\n")[0], /language/);
  assert.deepEqual(postProblems("x.en.mdx", ok, "```bash\nnpm ci\n```\n\n```text\nok\n```\n"), []);
});
