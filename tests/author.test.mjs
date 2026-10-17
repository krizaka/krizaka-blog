import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";

/* What the blog says about its author comes from a source he gave (content/authors/oussama.json). A text that tells his
   path (the places he comes from or studied in) names only sourced places and points to the About page; nothing names his
   current employer or his birth date. (Replaces the 2026-10-16 guard that forbade the places while they were unsourced.) */
const facts = JSON.parse(readFileSync(new URL("../content/authors/oussama.json", import.meta.url), "utf8"));
const messages = (l) => JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf8"));
const PATH_PLACES = /\b(Oujda|Maroc|Morocco|Grenoble|Casablanca|Rabat|Fès|Fez|Paris|Lyon)\b/g;
const BANKS = /\b(RBC|Royal Bank|Banque Royale|TD Bank|Banque TD|BMO|Bank of Montreal|Banque de Montréal|Scotiabank|CIBC|Banque Nationale|National Bank|Desjardins|Laurentienne|Laurentian)\b/i;
const BIRTH = /\b(né le|née le|born on|date de naissance|date of birth)\b/i;
const posts = readdirSync(new URL("../content/posts/", import.meta.url)).filter((f) => f.endsWith(".mdx"));

test("the author's facts have a source and the list of what is never published", () => {
  assert.ok(facts.source.length > 40);
  assert.ok(facts.places.includes("Oujda") && facts.places.includes("Grenoble") && facts.places.includes("Montréal"));
  assert.ok(facts.neverPublish.some((n) => /employer/.test(n)));
});

test("the About page and the home note tell the sourced path, and never the employer or a birth date", () => {
  for (const l of ["en", "fr"]) {
    const a = messages(l).about;
    const text = [a.lead, ...a.body, a.homeBody].join("\n");
    for (const [place] of text.matchAll(PATH_PLACES)) assert.ok(facts.places.includes(place), `${l}: ${place} is not sourced`);
    for (const p of ["Oujda", "Grenoble", "Montréal"]) assert.match(text, new RegExp(p));
    assert.match(text, /2011/);
    assert.match(text, l === "fr" ? /grande banque canadienne/ : /large Canadian bank/);
    assert.doesNotMatch(text, BANKS);
    assert.doesNotMatch(text, BIRTH);
  }
});

test("a post that tells the author's path names only sourced places and links to the About page", () => {
  for (const f of posts) {
    const { content } = matter(readFileSync(new URL(`../content/posts/${f}`, import.meta.url), "utf8"));
    const named = [...content.matchAll(PATH_PLACES)].map((m) => m[0]);
    assert.doesNotMatch(content, BANKS, f);
    assert.doesNotMatch(content, BIRTH, f);
    if (!named.length) continue;
    for (const p of named) assert.ok(facts.places.includes(p), `${f}: ${p} is not sourced`);
    assert.match(content, f.endsWith(".fr.mdx") ? /\]\(\/fr\/about\/?\)/ : /\]\(\/about\/?\)/, `${f} tells the path: it links to the About page`);
  }
});
