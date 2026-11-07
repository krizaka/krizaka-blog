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
    .filter(
      (file) =>
        /\.tsx$/.test(file) && file !== "app/components/SiteFooter.tsx" && file !== "app/components/SiteRoot.tsx",
    )
    .filter((file) => /<SiteFooter\b|<footer\b/.test(read(file)));
  assert.deepEqual(offenders, []);
});

/* The footer as krizaka.com draws it (founder, 2026-11-05): lib/footer.ts in the settings shape of the apps (@krizaka/ui
   FooterSettings), valid by the admin's rules; the blog adds one column of its own. SiteFooter.tsx only resolves it. */
const messages = (lang) => JSON.parse(read(`messages/${lang}.json`));

test("the footer's settings pass the admin's validation and name the company once", async () => {
  const { footerSettingsProblems } = await import("@krizaka/ui/site-footer");
  const { footerSettings } = await import("../lib/footer.ts");
  assert.deepEqual(footerSettingsProblems(footerSettings), []);
  assert.deepEqual(
    footerSettings.columns.map((c) => c.id),
    ["products", "open-source", "company", "blog"],
  );
  assert.equal(footerSettings.legal.legalName, "Technologies Krizaka Inc.");
  assert.match(footerSettings.legal.neq, /^\d{10}$/);
  assert.equal(footerSettings.legal.city, "Montréal (Québec)");
});

test("the products are the commercial names on their www address, never a code name", async () => {
  const { footerSettings } = await import("../lib/footer.ts");
  const products = footerSettings.columns.find((c) => c.id === "products");
  assert.deepEqual(products.links.map((l) => l.label).sort(), ["Folioviv", "Sovkora", "Verikora"]);
  assert.equal(products.status, undefined, "no one status for the column: each product says its own");
  for (const l of products.links) assert.match(l.href, /^https:\/\/www\.(sovkora|verikora|folioviv)\.com$/);
  assert.doesNotMatch(read("lib/footer.ts"), /orazaka\.com|yomizaka\.com|akinaza\.com|Orazaka|Yomizaka|Akinaza/);
});

test("every link to the company points to www.krizaka.com, in the reader's language", async () => {
  const { footerSettings, localized } = await import("../lib/footer.ts");
  const company = footerSettings.columns.find((c) => c.id === "company");
  for (const l of company.links) assert.match(l.href, /^https:\/\/www\.krizaka\.com\//, l.href);
  for (const l of footerSettings.legal.links) assert.match(l.href, /^https:\/\/www\.krizaka\.com\//, l.href);
  assert.equal(localized("https://www.krizaka.com/story", "fr"), "https://www.krizaka.com/fr/story");
  assert.equal(localized("https://www.krizaka.com/story", "en"), "https://www.krizaka.com/en/story");
  assert.equal(localized("https://ui.krizaka.com", "fr"), "https://ui.krizaka.com");
  assert.equal(localized("/newsletter", "fr"), "/fr/newsletter/");
  assert.equal(localized("/feed.xml", "fr"), "/fr/feed.xml");
  assert.equal(localized("/about", "en"), "/about/");
});

test("every message key of the footer exists in both languages", () => {
  const keys = [...read("lib/footer.ts").matchAll(/(?:labelKey|titleKey): "([\w.]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length >= 12);
  for (const l of ["en", "fr"]) {
    for (const key of keys) {
      assert.equal(typeof key.split(".").reduce((n, p) => n?.[p], messages(l)), "string", `${l}: ${key}`);
    }
  }
});

test("SiteFooter.tsx draws the settings and types no column", () => {
  const footer = read("app/components/SiteFooter.tsx");
  assert.match(footer, /resolveFooterSettings/);
  assert.match(footer, /config=\{config\}/);
  assert.doesNotMatch(footer, /<FamilyFooter\.Column|<FamilyFooter\.Link|FOOTER_PRODUCT_IDS/);
});

/* One status per product, the same word as krizaka.com (decision 2026-11-05, reunion 6): Verikora and Sovkora in
   development, Folioviv paused. krizaka.com's own words for « development » are pinned here (its messages/*.json,
   site.nav.status.development); « paused » is the decided word, not yet in @krizaka/org. */
test("each product says its own status, in both languages", async () => {
  const { PRODUCT_STATUS, productLabel } = await import("../lib/footer.ts");
  assert.deepEqual(PRODUCT_STATUS, { Verikora: "development", Sovkora: "development", Folioviv: "paused" });
  const words = {
    en: { development: "In development", paused: "Paused" },
    fr: { development: "En développement", paused: "En pause" },
  };
  for (const l of ["en", "fr"]) {
    assert.deepEqual(messages(l).footer.status, words[l]);
    assert.equal(productLabel("Folioviv", messages(l).footer.status), `Folioviv · ${words[l].paused}`);
    assert.equal(productLabel("Verikora", messages(l).footer.status), `Verikora · ${words[l].development}`);
    assert.equal(productLabel("Sovkora", messages(l).footer.status), `Sovkora · ${words[l].development}`);
  }
});

test("SiteFooter.tsx writes each product's status on its link", () => {
  assert.match(read("app/components/SiteFooter.tsx"), /productLabel/);
});

test("no founder name in the site chrome (footer and bar)", () => {
  const chrome = [read("lib/footer.ts"), read("app/components/TopBar.tsx"), read("app/components/SiteFooter.tsx")];
  for (const l of ["en", "fr"]) chrome.push(JSON.stringify(messages(l).footer), JSON.stringify(messages(l).bar));
  for (const text of chrome) assert.doesNotMatch(text, /Oussama|Abid|oussamaABID/i);
});
