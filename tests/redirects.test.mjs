import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

test("the site is open to search engines now that posts are published", () => {
  assert.match(spec, /key: APP_INDEXING_ENABLED\n\s+scope: BUILD_TIME\n\s+value: "true"/);
});

test("the spec carries the captcha site key (public by design), never the secret key, and never « unset »", () => {
  assert.match(spec, /key: NEXT_PUBLIC_ABUSE_CAPTCHA_SITE_KEY\n\s+scope: BUILD_TIME\n\s+value: 0x4[A-Za-z0-9_-]{15,}\n/);
  assert.doesNotMatch(spec, /ABUSE_CAPTCHA_SECRET_KEY\n(\s+\w+: .*\n)*?\s+value:/);
});

test("the live-spec check is documented: `krizaka-deploy drift` (krizaka/.github) must report no difference", () => {
  const readme = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8");
  assert.match(readme, /krizaka-deploy drift/);
});

test("App Platform allows 10 ingress rules: the redirects leave room for /api and the site", () => {
  const all = [...spec.matchAll(/^\s+- match:/gm)];
  assert.ok(all.length <= 10, `${all.length} ingress rules`);
});

test("a redirected address is not a post any more: no post file, and no post links it", () => {
  const gone = rules.map(([, from]) => from.replace(/^\/(fr\/)?posts\//, ""));
  const files = readdirSync(new URL("../content/posts/", import.meta.url));
  for (const slug of gone) assert.ok(!files.some((f) => f.startsWith(`${slug}.`)), `${slug} has no post file left`);
  for (const f of files) {
    const body = readFileSync(new URL(`../content/posts/${f}`, import.meta.url), "utf8");
    for (const slug of gone) assert.ok(!body.includes(`/posts/${slug}`), `${f} still links /posts/${slug}`);
  }
});
