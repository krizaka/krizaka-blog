// « Read offline » (krizaka-blog#235): the action says what it does (kept in THIS browser, no account), the scopes are named, the
// helper is a keyboard-reachable popover, in both languages.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const msg = (l) => JSON.parse(read(`messages/${l}.json`));

test("the save action is « Read offline » / « Lire hors ligne », not « Save », and no label promises an account", () => {
  assert.equal(msg("en").offline.save, "Read offline");
  assert.equal(msg("fr").offline.save, "Lire hors ligne");
  for (const l of ["en", "fr"])
    for (const k of ["save", "saved", "remove", "saveSeries", "seriesSaved", "empty"])
      assert.doesNotMatch(msg(l).offline[k], /\bSave\b|Enregistr/, `${l}.offline.${k}`);
});

test("the helper says it stays in this browser, with no account and nothing sent, and how to remove it", () => {
  assert.match(msg("en").offline.helpBody, /this browser/);
  assert.match(msg("en").offline.helpBody, /No account, nothing is sent/);
  assert.match(msg("fr").offline.helpBody, /ce navigateur/);
  assert.match(msg("fr").offline.helpBody, /Pas de compte, rien n'est envoyé/);
  for (const l of ["en", "fr"]) assert.match(msg(l).offline.helpRemove, /«/);
});

test("a chapter names its two scopes and carries the helper; the end line groups files by scope with a book for each", () => {
  const page = read("app/components/pages/ChapterPage.tsx");
  assert.match(page, /bl-scope-label">\{t\.downloads\.takeChapter\}/);
  assert.match(page, /bl-scope-label">\{t\.downloads\.takeStory\}/);
  assert.match(page, /<OfflineHelp \/>/);
  const take = read("app/components/TakeStory.tsx");
  assert.match(take, /bl-book bl-book-whole|bl-book\$\{whole/);
  assert.match(take, /takeChapters/);
});

test("the helper is a @krizaka/ui Popover on a real button with an accessible name (keyboard, screen reader, touch)", () => {
  const c = read("app/components/SaveOffline.tsx");
  assert.match(c, /@krizaka\/ui\/popover/);
  assert.match(c, /<button type="button" className="bl-help" aria-label=\{t\.offline\.helpLabel\}>/);
  const css = read("app/globals.css");
  assert.match(css, /\.bl-help:focus-visible/);
  assert.match(css, /@media \(pointer: coarse\)/);
  assert.doesNotMatch(css.slice(css.indexOf(".bl-help-card"), css.indexOf(".bl-help-card") + 600), /#[0-9a-f]{3,6}/i);
});
