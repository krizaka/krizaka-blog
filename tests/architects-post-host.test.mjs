import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* The architects' post does not name the hosting provider (krizaka-internal#3902): we say « our cloud host in Canada ».
   The list of provider names lives here, once. */
const PROVIDERS = ["digitalocean", "digital ocean"];
const FILES = [
  "content/chapters/design-choices-for-architects.en.mdx",
  "content/chapters/design-choices-for-architects.fr.mdx",
  "content/diagrams/design-choices-for-architects.c4",
  "content/diagrams/design-choices-for-architects.fr.json",
];

for (const file of FILES) {
  test(`${file} names no hosting provider`, () => {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8").toLowerCase();
    for (const name of PROVIDERS) assert.ok(!text.includes(name), `${file} names « ${name} »`);
  });
}
