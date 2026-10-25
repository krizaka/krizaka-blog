import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

/* One bar on every page, and it is small (krizaka-blog#123): the blog is one page, the story, so the bar is the mark (the way
   home), the language and the theme — nothing else. No sections, no tag menu, no second bar, no search, no saved posts, no
   GitHub, no krizaka.com button (the footer carries the family). The bar is rendered once, by the root (SiteRoot). */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const messages = { en: JSON.parse(read("messages/en.json")), fr: JSON.parse(read("messages/fr.json")) };
const bar = read("app/components/TopBar.tsx");

test("the bar is the mark, the language and the theme", () => {
  assert.match(bar, /<NavBar\.Brand asChild>[\s\S]*<KrizakaLogo[\s\S]*t\.site\.name[\s\S]*<\/NavBar\.Brand>/);
  assert.match(bar, /<NavBar\.Language label=\{b\.language\} current=\{locale\} languages=\{languages\} linkAs=\{Link\} \/>/);
  assert.match(bar, /onClick=\{toggleTheme\}/);
  /* The theme toggle shows on every width: there is no phone menu to hold it. */
  assert.doesNotMatch(bar, /hidden h-9 w-9 md:inline-flex/);
});

test("the bar has no tag menu, no centre and no second bar", () => {
  assert.doesNotMatch(bar, /NavBar\.(Items|Link|Menu|MenuLink|Mobile|MobileLink|MobileGroup|Family|Repo)\b/);
  assert.doesNotMatch(bar, /TopicFilter|ChipLink|\/tags|tagsOf|barCentre/);
  assert.equal(bar.match(/<NavBar\.Root\b/g)?.length, 1, "one bar");
  assert.ok(!existsSync(new URL("../lib/bar.ts", import.meta.url)), "no list of sections any more");
  assert.ok(!existsSync(new URL("../app/components/pages/TopicFilter.tsx", import.meta.url)), "the tag menu is gone");
});

test("nothing else in the bar: no search, no saved posts, no GitHub, no feed, no way to krizaka.com", () => {
  assert.doesNotMatch(bar, /SearchField|SearchIcon|\/search|BookmarkIcon|useSaved|\/saved|GitHubMark|REPOSITORY_URL|GITHUB_ORG_URL|KRIZAKA_URL|\/feed/);
  assert.equal(bar.match(/<Button\b/g)?.length, 1, "one button: the theme");
});

test("the language switch is the family's (NavBar.Language), each language landing on the same page", () => {
  assert.match(bar, /from "@krizaka\/ui\/language-switch"/);
  assert.match(bar, /languageSwitchPath\(code, page, translated\)/);
  assert.doesNotMatch(bar, /hrefLang=|languageShort|switchLanguage/, "no hand-made language pill");
});

for (const locale of ["en", "fr"]) {
  test(`${locale}: the bar's words are in the messages, and only those`, () => {
    const b = messages[locale].bar;
    for (const k of ["aria", "language", "toLight", "toDark", "skip"]) assert.ok(typeof b[k] === "string" && b[k].trim().length > 0, `${locale}: bar.${k}`);
    for (const k of ["posts", "tags", "search", "saved", "story", "github", "company", "menu"]) assert.equal(b[k], undefined, `${locale}: bar.${k} is gone`);
  });
}

test("the root renders the one bar, and no page renders its own", () => {
  const root = read("app/components/SiteRoot.tsx");
  assert.equal(root.match(/<TopBar /g)?.length, 1);
  for (const file of ["app/components/pages/ChapterPage.tsx", "app/components/pages/HomePage.tsx", "app/components/pages/PostPage.tsx", "app/components/pages/BasicsPage.tsx"]) {
    assert.doesNotMatch(read(file), /<TopBar\b|NavBar\.Root/, file);
  }
});

test("the footer carries one sentence and one link to the story, « The basics » and the feeds as files", () => {
  const root = read("app/components/SiteRoot.tsx");
  assert.match(root, /<SiteFooter \/>/);
  assert.doesNotMatch(root, /chaptersOf/);
  const footer = read("app/components/SiteFooter.tsx");
  /* No chapter list (krizaka-blog#136): the home lists them; the footer says one sentence and links the story. */
  assert.doesNotMatch(footer, /chapters\.map|\{ chapters \}/);
  assert.match(footer, />\{f\.storyNote\}</);
  assert.match(footer, /localizedPath\(locale, "\/"\)\}>\{f\.readStory\}/);
  for (const lang of ["en", "fr"]) {
    const f = JSON.parse(read(`messages/${lang}.json`)).footer;
    assert.ok(f.storyNote && f.storyNote.length <= 90, `${lang}: footer.storyNote is one short sentence`);
    assert.ok(f.readStory, `${lang}: footer.readStory`);
  }
  assert.match(footer, /localizedPath\(locale, "\/basics"\)/);
  assert.match(footer, /\/feed\.xml`/);
  assert.match(footer, /\/atom\.xml`/);
  assert.match(footer, /\/about\/`/);
  assert.doesNotMatch(footer, /allPosts/);
});
