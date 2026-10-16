import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = readFileSync(new URL("../public/admin/config.yml", import.meta.url), "utf8");
const html = readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");

test("the editor uses GitHub accounts and the editorial workflow (a draft is a pull request)", () => {
  assert.match(config, /name: github/);
  assert.match(config, /repo: krizaka\/krizaka-blog/);
  assert.match(config, /publish_mode: editorial_workflow/);
});
test("the editor writes the same files the site reads: <slug>.<locale>.mdx with the front-matter fields", () => {
  assert.match(config, /extension: mdx/);
  assert.match(config, /structure: multiple_files/);
  for (const f of ["title", "description", "date", "tags", "author", "draft", "image", "body"]) assert.match(config, new RegExp(`name: ${f}\\b`));
});
test("a new post starts as a draft, and images are URLs on the media CDN", () => {
  assert.match(config, /name: draft[^\n]*default: true/);
  assert.match(config, /krizaka-assets\\\\\.b-cdn\\\\\.net\/site\/blog\//);
});
test("the editor script is pinned with an integrity hash and the page is noindex", () => {
  assert.match(html, /decap-cms@\d+\.\d+\.\d+\/dist\/decap-cms\.js/);
  assert.match(html, /integrity="sha384-[A-Za-z0-9+/=]{64}"/);
  assert.match(html, /noindex/);
});

test("the function's project.yml hands the two sign-in variables of the app spec to the actions", () => {
  const project = readFileSync(new URL("../functions/project.yml", import.meta.url), "utf8");
  const spec = readFileSync(new URL("../.do/app.yaml", import.meta.url), "utf8");
  for (const k of ["AUTH_GITHUB_CLIENT_ID", "AUTH_GITHUB_CLIENT_SECRET"]) {
    assert.match(project, new RegExp(`${k}: \\$\\{${k}\\}`));
    assert.match(spec, new RegExp(`key: ${k}`));
  }
});

test("each function action has an index.js entry (the runtime's default main) next to its handshake copy", async () => {
  const { existsSync } = await import("node:fs");
  for (const a of ["auth", "callback"]) {
    assert.ok(existsSync(new URL(`../functions/packages/oauth/${a}/index.js`, import.meta.url)), a);
    assert.ok(existsSync(new URL(`../functions/packages/oauth/${a}/oauth.js`, import.meta.url)), a);
  }
});
