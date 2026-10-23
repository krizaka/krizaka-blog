import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";

/* One footer, one contentinfo: @krizaka/ui's SiteFooter, rendered once by the root, after <main>. No page renders a
   footer of its own and the hand-made `.kz-footer` is gone. */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const walk = (dir) =>
  readdirSync(new URL(`../${dir}/`, import.meta.url)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(new URL(`../${rel}`, import.meta.url)).isDirectory() ? walk(rel) : [rel];
  });

test("the footer is @krizaka/ui's SiteFooter, not a copy", () => {
  const footer = read("app/components/SiteFooter.tsx");
  assert.match(footer, /@krizaka\/ui\/site-footer/);
  assert.doesNotMatch(footer, /<footer/);
  assert.doesNotMatch(read("app/globals.css"), /\.kz-footer/);
});

test("the root renders it once, after <main>", () => {
  const root = read("app/components/SiteRoot.tsx");
  assert.equal(root.match(/<SiteFooter\b/g)?.length, 1);
  assert.ok(root.indexOf("</main>") < root.indexOf("<SiteFooter"));
});

test("no other file renders a footer", () => {
  const offenders = walk("app")
    .filter((file) => /\.tsx$/.test(file) && file !== "app/components/SiteFooter.tsx" && file !== "app/components/SiteRoot.tsx")
    .filter((file) => /<SiteFooter\b|<footer\b/.test(read(file)));
  assert.deepEqual(offenders, []);
});
