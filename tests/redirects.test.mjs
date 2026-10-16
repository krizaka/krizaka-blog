import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import matter from "gray-matter";

/* The 308s of .do/app.yaml (ingress rules): a post merged into another keeps its address. Every source is a post that no
   longer exists, every target a published post of the same language. */
const spec = readFileSync(new URL("../.do/app.yaml", import.meta.url), "utf8");
const rules = [...spec.matchAll(/prefix: (\/(?:fr\/)?posts\/[a-z0-9-]+) \} \}\n\s+redirect: \{ uri: (\/(?:fr\/)?posts\/([a-z0-9-]+)\/), redirect_code: (\d+) \}/g)];
const post = (path) => {
  const m = path.match(/^\/(fr\/)?posts\/([a-z0-9-]+)\/?$/);
  return new URL(`../content/posts/${m[2]}.${m[1] ? "fr" : "en"}.mdx`, import.meta.url);
};

test("the merged posts redirect (308) to the post that absorbed them, in both languages", () => {
  assert.equal(rules.length, 4);
  for (const [, from, to, , code] of rules) {
    assert.equal(code, "308");
    assert.equal(from.startsWith("/fr/"), to.startsWith("/fr/"), `${from} and ${to} are in the same language`);
    assert.ok(!existsSync(post(from)), `${from} is gone`);
    const target = post(to);
    assert.ok(existsSync(target), `${to} exists`);
    assert.equal(matter(readFileSync(target, "utf8")).data.draft, false, `${to} is published`);
  }
});

test("the sign-in stays under /api and the site answers the rest", () => {
  assert.match(spec, /prefix: \/api \} \}\n\s+component: \{ name: oauth \}/);
  assert.match(spec, /prefix: \/ \} \}\n\s+component: \{ name: site \}/);
  assert.doesNotMatch(spec, /routes:/);
});
