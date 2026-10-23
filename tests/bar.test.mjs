import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { barCentre } from "../lib/bar.ts";

/* One bar on every page: the centre comes from lib/bar.ts for every page type, in FR and EN, and only the story pages make
   « L'histoire » active. The bar is rendered once, by the root (SiteRoot), so no page owns a second one. */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const messages = { en: JSON.parse(read("messages/en.json")), fr: JSON.parse(read("messages/fr.json")) };

const PAGE_TYPES = [
  { type: "home", path: "/", story: false },
  { type: "post", path: "/posts/a-post", story: false },
  { type: "topic", path: "/tags/measured", story: false },
  { type: "search", path: "/search", story: false },
  { type: "saved", path: "/saved", story: false },
  { type: "series", path: "/series/building-orazaka", story: false },
  { type: "about", path: "/about", story: false },
  { type: "story", path: "/story", story: true },
  { type: "story (trailing slash)", path: "/story/", story: true },
  { type: "chapter", path: "/story/a-chapter", story: true },
];

for (const locale of ["en", "fr"]) {
  for (const page of PAGE_TYPES) {
    test(`${locale}: ${page.type} renders the same centre, « L'histoire » first`, () => {
      const centre = barCentre(locale, page.path);
      assert.deepEqual(centre.map((item) => item.key), ["story"]);
      assert.equal(centre[0].href, locale === "en" ? "/story/" : "/fr/story/");
      assert.equal(centre[0].active, page.story);
    });
  }

  test(`${locale}: the bar's label is in the messages`, () => {
    assert.ok(messages[locale].bar.story.trim().length > 0);
    assert.ok(messages[locale].footer.story.trim().length > 0);
    assert.ok(messages[locale].footer.allPosts.trim().length > 0);
    assert.ok(messages[locale].home.readStory.trim().length > 0);
  });
}

test("the centre never lists Posts, Topics or Saved (they moved out of the bar)", () => {
  const bar = read("app/components/TopBar.tsx");
  assert.doesNotMatch(bar, /b\.posts|b\.tags/);
  assert.match(bar, /barCentre\(locale, path\)/);
});

test("the root renders the one bar, and no page renders its own", () => {
  const root = read("app/components/SiteRoot.tsx");
  assert.equal(root.match(/<TopBar /g)?.length, 1);
  for (const file of ["app/components/pages/StoryPage.tsx", "app/components/pages/ChapterPage.tsx", "app/components/pages/SearchPage.tsx", "app/components/pages/HomePage.tsx"]) {
    assert.doesNotMatch(read(file), /<TopBar\b|NavBar\.Root/, file);
  }
});

test("the home points to the story under its lead, in both languages", () => {
  const home = read("app/components/pages/HomePage.tsx");
  assert.match(home, /t\.home\.readStory/);
  assert.match(home, /localizedPath\(locale, "\/story"\)/);
});

test("the search covers the chapters and carries the topic filter", () => {
  const search = read("app/components/pages/SearchPage.tsx");
  assert.match(search, /chaptersOf\(locale\)/);
  assert.match(search, /<TopicFilter locale=\{locale\} \/>/);
});

test("the footer carries the chapters and « All posts »", () => {
  const root = read("app/components/SiteRoot.tsx");
  assert.match(root, /chaptersOf\(locale\)/);
  assert.match(root, /<SiteFooter chapters=\{chapters\} \/>/);
  assert.match(read("app/components/SiteFooter.tsx"), /f\.allPosts/);
});
