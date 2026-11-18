import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";

/* One footer, one contentinfo: @krizaka/ui's FamilyFooter drawn from footerFor("blog") of @krizaka/org (krizaka-internal#4120),
   rendered once by the root, after <main>. Nothing typed: no URL, no social, no column but the blog's own. A local footer
   (lib/footer.ts, a hand-made <footer>, the old SiteFooter settings) fails here. */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const exists = (file) => {
  try {
    statSync(new URL(`../${file}`, import.meta.url));
    return true;
  } catch {
    return false;
  }
};
const walk = (dir) =>
  readdirSync(new URL(`../${dir}/`, import.meta.url)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(new URL(`../${rel}`, import.meta.url)).isDirectory() ? walk(rel) : [rel];
  });

test("the footer is FamilyFooter of the family, read from @krizaka/org", () => {
  const footer = read("app/components/SiteFooter.tsx");
  assert.match(footer, /FamilyFooter/);
  assert.match(footer, /footerFor\("blog"\)/);
  assert.match(footer, /kind="company"/);
  assert.doesNotMatch(footer, /<footer|resolveFooterSettings|config=\{/);
  assert.doesNotMatch(read("app/globals.css"), /\.kz-footer/);
});

test("no local footer data comes back", () => {
  for (const file of ["lib/footer.ts", "lib/family-footer.ts"]) assert.equal(exists(file), false, file);
});

test("the root renders it once, after <main>", () => {
  const root = read("app/components/SiteRoot.tsx");
  assert.equal(root.match(/<SiteFooter\b/g)?.length, 1);
  assert.ok(root.indexOf("</main>") < root.indexOf("<SiteFooter"));
});

test("no other file renders a footer", () => {
  const offenders = walk("app")
    .filter(
      (file) =>
        /\.tsx$/.test(file) && file !== "app/components/SiteFooter.tsx" && file !== "app/components/SiteRoot.tsx",
    )
    .filter((file) => /<SiteFooter\b|<footer\b|<FamilyFooter\b/.test(read(file)));
  assert.deepEqual(offenders, []);
});

test("the footer types no address, no social and no library link", () => {
  const footer = read("app/components/SiteFooter.tsx");
  assert.doesNotMatch(footer, /https?:\/\//);
  assert.doesNotMatch(footer, /instagram|facebook|youtube|linkedin/i);
  for (const file of walk("lib").filter((f) => /\.(ts|tsx|mjs)$/.test(f) && !f.endsWith("links.ts"))) {
    assert.doesNotMatch(
      read(file),
      /\b(UI|JAVA|TS|LAB|RUST)_URL\b|https:\/\/(ui|java|ts|lab|motion)\.krizaka\.com/,
      file,
    );
  }
});

test("the org gives the blog its four socials, the open-source column from the family (Krizaka Rust in it), the legal links", async () => {
  const { footerFor } = await import("@krizaka/org");
  const f = footerFor("blog");
  assert.deepEqual(
    f.social.map((s) => s.id),
    ["instagram", "facebook", "youtube", "linkedin"],
  );
  const os = f.groups.find((g) => g.group === "open-source");
  assert.ok(os.entries.some((e) => e.id === "rust"));
  assert.deepEqual(
    f.legal.map((l) => l.id),
    ["privacy", "terms"],
  );
});

test("the blog's own column words exist in both languages", () => {
  for (const l of ["en", "fr"]) {
    const footer = JSON.parse(read(`messages/${l}.json`)).footer;
    for (const k of ["blogColumn", "readStory", "basics", "newsletter", "rss", "atom", "about"]) {
      assert.equal(typeof footer[k], "string", `${l}: ${k}`);
    }
  }
});

test("no founder name in the site chrome (footer and bar)", () => {
  const chrome = [read("app/components/TopBar.tsx"), read("app/components/SiteFooter.tsx")];
  for (const l of ["en", "fr"]) {
    const m = JSON.parse(read(`messages/${l}.json`));
    chrome.push(JSON.stringify(m.footer), JSON.stringify(m.bar));
  }
  for (const text of chrome) assert.doesNotMatch(text, /Oussama|Abid|oussamaABID/i);
});
