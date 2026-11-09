import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { linksFrom, resolveLinks, settingsProblems, siteUrl, writtenOwnedAddresses } from "../lib/links.ts";

const root = new URL("..", import.meta.url).pathname;
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const contentFiles = () =>
  walk(join(root, "content"))
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => ({ file: f.replace(root, ""), text: readFileSync(f, "utf8") }));

const settings = (repos) => ({
  githubOrg: "https://github.com/krizaka",
  repos,
  retiredRepo: /^retired-/,
  sites: { www: "https://www.krizaka.com", github: "https://github.com/krizaka" },
});

/* The bug of 2026-11-08 (krizaka-internal#2960): a rename and fifteen repositories going private cost 77 links edited by
   hand and blocked every pull request, because each chapter wrote its own addresses. */
test("no chapter or post writes an address of the org: it asks the provider by name", () => {
  const written = contentFiles().flatMap(({ file, text }) => writtenOwnedAddresses(text).map((a) => `${file}: ${a}`));
  assert.deepEqual(written, []);
});

test("every reference in the content names a known repository or site", () => {
  for (const { file, text } of contentFiles())
    assert.doesNotThrow(() => resolveLinks(text), undefined, `${file} names an unknown repository or site`);
});

test("the guard catches a repository, the organisation page and a site, and leaves another host alone", () => {
  const found = writtenOwnedAddresses(
    "[a](https://github.com/krizaka/krizaka-ui/pull/1) https://github.com/krizaka [b](https://dev.sovkora.com/x) https://ui.krizaka.com",
  );
  assert.equal(found.length, 4);
  assert.deepEqual(writtenOwnedAddresses("[c](https://github.com/vercel/next.js) https://www.nvidia.com/x"), []);
  assert.deepEqual(writtenOwnedAddresses("[d](https://github.com/krizakafoo/x)"), []);
});

test("the settings are valid, and a bad status or address is named", () => {
  assert.deepEqual(settingsProblems(), []);
  assert.equal(settingsProblems(settings({ a: { status: "secret" } })).length, 1);
  assert.equal(settingsProblems({ ...settings({}), sites: { x: "http://x.example" } }).length, 1);
  assert.throws(() => linksFrom(settings({ a: { status: "secret" } })), /status "secret"/);
});

test("a repository made private is one line: its links keep their words and lose the address", () => {
  const before = linksFrom(settings({ kit: { status: "public" } }));
  const after = linksFrom(settings({ kit: { status: "private" } }));
  const text = "see [the `kit` [v2]](repo:kit/pull/7) now";
  assert.equal(before.resolveLinks(text), "see [the `kit` [v2]](https://github.com/krizaka/kit/pull/7) now");
  assert.equal(after.resolveLinks(text), "see the `kit` [v2] now");
  assert.deepEqual(after.privateRepoNames(), ["kit"]);
  assert.equal(after.isUnreachableRepo("kit"), true);
});

test("a repository renamed is one line: every reference follows", () => {
  const links = linksFrom(settings({ kit: { status: "public", github: "kit-next" } }));
  assert.equal(
    links.resolveLinks("[x](repo:kit/blob/main/a.md#L3)"),
    "[x](https://github.com/krizaka/kit-next/blob/main/a.md#L3)",
  );
  assert.equal(links.repoUrl("kit"), "https://github.com/krizaka/kit-next");
});

test("sites come from @krizaka/org and from the settings; a reference may be bare in a code block", () => {
  assert.equal(siteUrl("ui"), "https://ui.krizaka.com");
  assert.equal(siteUrl("sovkora", "docs"), "https://www.sovkora.com/docs");
  assert.equal(resolveLinks("```\nTarget: {{site:github}}\n```"), "```\nTarget: https://github.com/krizaka\n```");
  assert.equal(resolveLinks("[w](site:www/services)"), "[w](https://www.krizaka.com/services)");
});

test("an unknown name fails instead of shipping a dead link, and a retired repository is unreachable", () => {
  const links = linksFrom(settings({ kit: { status: "public" } }));
  assert.throws(() => links.resolveLinks("[x](repo:nope/pull/1)"), /unknown repository "nope"/);
  assert.throws(() => links.resolveLinks("[x](site:nope)"), /unknown site "nope"/);
  assert.equal(links.isUnreachableRepo("retired-one"), true);
  assert.equal(links.isUnreachableRepo("kit"), false);
});

test("a chapter and a post read through the provider, and so does llms-full", () => {
  assert.match(readFileSync(join(root, "lib/posts.ts"), "utf8"), /matter\(resolveLinks\(source\)\)/);
  assert.match(readFileSync(join(root, "scripts/postbuild.mjs"), "utf8"), /matter\(resolveLinks\(readFileSync/);
});
