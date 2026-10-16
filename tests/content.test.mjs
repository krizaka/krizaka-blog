import test from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDir, postProblems } from "../scripts/content-rules.mjs";

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
  assert.deepEqual(postProblems("x.en.mdx", { ...ok, image: "https://krizaka-assets.b-cdn.net/blog/x/cover.webp" }, "![a](https://krizaka-assets.b-cdn.net/blog/x/a.webp)"), []);
  assert.equal(postProblems("x.en.mdx", ok, "![a](/a.png)").length, 1);
});
test("Mermaid is refused", () => assert.equal(postProblems("x.en.mdx", ok, "```mermaid\ngraph TD\n```").length, 1));
test("the posts of the repository follow the rules, and no post is published without a draft decision", () => {
  const { files, problems } = checkDir(join(dirname(fileURLToPath(import.meta.url)), "../content/posts"));
  assert.deepEqual(problems, []);
  assert.ok(files.length >= 6);
});
