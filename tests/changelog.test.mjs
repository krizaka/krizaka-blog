import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { loadReleases } from "../lib/changelog.ts";

// /changelog (EN/FR): the weeks of merged work on the blog, on the Changelog template, with a feed and the footer's version link.
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const messages = (lang) => JSON.parse(read(`messages/${lang}.json`));

const PULLS = [
  { title: "feat(posts): a new post (#12)", html_url: "https://github.com/krizaka/krizaka-blog/pull/12", merged_at: "2026-10-16T10:00:00Z" },
  { title: "chore: bump", html_url: "https://github.com/krizaka/krizaka-blog/pull/13", merged_at: "2026-10-16T11:00:00Z" },
  { title: "fix: XSS in the search box (#9)", html_url: "https://github.com/krizaka/krizaka-blog/pull/9", merged_at: "2026-10-07T10:00:00Z" },
];

test("the merged pull requests become weeks, the latest first, housekeeping left out", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(PULLS)));
  const releases = await loadReleases();
  assert.deepEqual(releases.map((r) => r.version), ["2026-10-12", "2026-10-05"]);
  assert.deepEqual(releases[0].changes.map((c) => c.tag), ["feature"]);
  assert.equal(releases[1].changes[0].tag, "security");
});

test("an unreachable GitHub gives an empty page, not a broken build", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("no", { status: 403 }));
  assert.deepEqual(await loadReleases(), []);
});

test("both languages have the page, the feed and the sitemap entry", () => {
  for (const dir of ["app/(en)/changelog", "app/fr/changelog"]) {
    assert.ok(existsSync(new URL(`../${dir}/page.tsx`, import.meta.url)), `${dir}/page.tsx`);
    assert.match(read(`${dir}/page.tsx`), /<ChangelogView/);
    assert.match(read(`${dir}/feed.xml/route.ts`), /changelogFeed/);
  }
  assert.match(read("app/components/ChangelogView.tsx"), /await loadReleases\(\)/);
  assert.match(read("app/sitemap.ts"), /"\/changelog"/);
  for (const lang of ["en", "fr"]) {
    const m = messages(lang);
    assert.ok(m.changelog.title && m.changelog.kinds.security && m.footer.changelog, lang);
  }
});

test("the footer's version links /changelog#<version> and the page owns that anchor", () => {
  assert.match(read("app/components/SiteFooter.tsx"), /`\$\{changelogHref\(locale\)\}#\$\{version\}`/);
  assert.match(read("app/components/SiteRoot.tsx"), /version=\{buildVersion\(\)\}/);
  assert.match(read("app/components/ChangelogView.tsx"), /version=\{buildVersion\(\)\}/);
  assert.match(read("app/components/ChangelogBody.tsx"), /<span id=\{version\}>/);
});
