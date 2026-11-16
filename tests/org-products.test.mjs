import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";

/* The footer's products are @krizaka/org's, never typed here (krizaka-internal#3908): the family's `products` group,
   in its order, each with the status of `org.products`. The words of a status are `footer.status.<id>`. */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const walk = (dir) =>
  readdirSync(new URL(`../${dir}/`, import.meta.url)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(new URL(`../${rel}`, import.meta.url)).isDirectory() ? walk(rel) : [rel];
  });

test("the footer's products are the org family's products: set, order, address and status", async () => {
  const { org } = await import("@krizaka/org");
  const { footerSettings, productStatusOf } = await import("../lib/footer.ts");
  const links = footerSettings.columns.find((c) => c.id === "products").links;
  const family = org.family.filter((e) => e.group === "products");
  assert.deepEqual(
    links.map((l) => l.label),
    family.map((e) => e.name),
  );
  assert.deepEqual(
    links.map((l) => l.href),
    family.map((e) => e.url.replace(/\/$/, "")),
  );
  for (const e of family) {
    assert.equal(productStatusOf(e.name), org.products.find((p) => p.id === e.id).status, e.name);
  }
  assert.ok(
    links.some((l) => l.label === "Kridoc"),
    "Kridoc is shown",
  );
});

test("every status of the org has its words, in both languages", async () => {
  const { PRODUCT_STATUS } = await import("@krizaka/org");
  for (const l of ["en", "fr"]) {
    const words = JSON.parse(read(`messages/${l}.json`)).footer.status;
    assert.deepEqual(Object.keys(words).sort(), [...PRODUCT_STATUS].sort(), l);
  }
});

test("no typed product status map and no retired code name in lib/ and app/", () => {
  const retired = /orazaka|yomizaka|akinaza|kachizaka/i;
  const files = [...walk("lib"), ...walk("app")]
    .filter((f) => /\.(ts|tsx|mjs)$/.test(f))
    .filter((f) => f !== "lib/links.ts"); // its retired-repository matcher names the old repositories on purpose
  const offenders = files.filter((f) => {
    const text = read(f);
    return retired.test(text) || /PRODUCT_STATUS\s*=\s*\{/.test(text);
  });
  assert.deepEqual(offenders, []);
});
