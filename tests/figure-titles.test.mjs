import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

// krizaka-internal#3880: a figure's title is a title, not a paragraph. `<Architecture label>` is the plate's display title; the long
// sentence goes in `description` (the plate's subtitle). Over 80 characters fails, naming the post and the figure.
export const MAX_TITLE = 80;
const DIRS = ["content/posts", "content/chapters"];
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

export function longTitles(file, source) {
  const found = [];
  for (const m of source.matchAll(/<Architecture\b([^>]*?)\/?>/g)) {
    const label = attr(m[1], "label") ?? "";
    if (label.length > MAX_TITLE)
      found.push(
        `${file}: <Architecture view="${attr(m[1], "view")}"> title is ${label.length} characters (max ${MAX_TITLE})`,
      );
  }
  return found;
}

test("the guard names an Architecture label over the limit", () => {
  const src = `<Architecture view="v" label="${"x".repeat(81)}" />`;
  assert.equal(longTitles("a.mdx", src).length, 1);
  assert.deepEqual(
    longTitles("a.mdx", `<Architecture view="v" label="Le contexte (C1)" description="${"x".repeat(300)}" />`),
    [],
  );
});

test("no post or chapter has a figure title over 80 characters", () => {
  const problems = DIRS.flatMap((d) =>
    readdirSync(d)
      .filter((f) => f.endsWith(".mdx"))
      .flatMap((f) => longTitles(`${d}/${f}`, readFileSync(`${d}/${f}`, "utf8"))),
  );
  assert.deepEqual(problems, []);
});
