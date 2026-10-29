import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteFooter as FamilyFooter } from "@krizaka/ui/site-footer";
import { familyLabels, sites, sitesByGroup } from "@krizaka/ui/sites";
import { FOOTER_PRODUCT_IDS } from "../lib/footer-family.ts";

/* The footer's family columns come from @krizaka/ui (site-footer + sites), never from a copy. The blog lists the focus of
   krizaka.com; the package has no flag for it, so the focus is passed as `products`. The hidden products are read from the
   package registry, not from a list here. */
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const productSites = sitesByGroup().find((g) => g.group === "products").sites;
const hidden = productSites.filter((s) => !FOOTER_PRODUCT_IDS.includes(s.id));

/* The footer as the blog renders it: the package's own SiteFooter with the blog's props (SiteFooter.tsx), rendered to HTML. */
const html = renderToStaticMarkup(
  createElement(FamilyFooter, { current: "krizaka", products: FOOTER_PRODUCT_IDS, labels: familyLabels.en, "aria-label": "Footer" }),
);
const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

test("the focus names products of the family registry", () => {
  for (const id of FOOTER_PRODUCT_IDS) {
    assert.equal(sites.find((s) => s.id === id)?.group, "products", `${id} is not a product of @krizaka/ui/sites`);
  }
});

test("the footer renders no product that the registry lists outside the focus", () => {
  /* When the registry lists no product outside the focus (every product is in it), there is nothing to hide and the loop below is vacuous. */
  for (const site of hidden) {
    assert.ok(!hrefs.some((href) => href.startsWith(site.url)), `${site.name} (${site.url}) is rendered`);
  }
});

test("the footer renders every focus product", () => {
  for (const site of productSites.filter((s) => FOOTER_PRODUCT_IDS.includes(s.id))) {
    assert.ok(hrefs.some((href) => href.startsWith(site.url)), `${site.name} is missing`);
  }
});

test("the open-source column is the package's: every open-source project and GitHub", () => {
  const open = sites.filter((s) => s.group === "open-source" || s.group === "github");
  for (const site of open) {
    assert.ok(hrefs.some((href) => href.startsWith(site.url)), `${site.name} is missing`);
  }
});

test("the blog passes the focus to the package and keeps no list of its own", () => {
  const footer = read("app/components/SiteFooter.tsx");
  assert.match(footer, /products=\{FOOTER_PRODUCT_IDS\}/);
  assert.doesNotMatch(footer, /https?:\/\/(www\.)?(orochia|yasakia|yororis|kachizaka)\./);
});
