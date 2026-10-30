import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* The app spec: no ingress redirect for a post merged into a chapter. Its old address is a static stub page built from
   lib/redirects.json (tests/retired-stubs.test.mjs). The ingress stays under the 10-rule limit with /api and the site. */
const spec = readFileSync(new URL("../.do/app.yaml", import.meta.url), "utf8");

test("no ingress redirect for the merged posts: their stubs are static pages (lib/redirects.json)", () => {
  assert.doesNotMatch(spec, /redirect_code/);
  assert.doesNotMatch(spec, /prefix: \/(fr\/)?posts/);
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
  assert.match(
    spec,
    /key: NEXT_PUBLIC_ABUSE_CAPTCHA_SITE_KEY\n\s+scope: BUILD_TIME\n\s+value: 0x4[A-Za-z0-9_-]{15,}\n/,
  );
  assert.doesNotMatch(spec, /ABUSE_CAPTCHA_SECRET_KEY\n(\s+\w+: .*\n)*?\s+value:/);
});

test("the live-spec check is documented: `krizaka-deploy drift` (krizaka/.github) must report no difference", () => {
  const readme = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8");
  assert.match(readme, /krizaka-deploy drift/);
});

test("App Platform allows 10 ingress rules: /api and the site", () => {
  const all = [...spec.matchAll(/^\s+- match:/gm)];
  assert.ok(all.length <= 10, `${all.length} ingress rules`);
});
