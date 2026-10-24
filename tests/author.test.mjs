import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";

/* What the blog says about its author comes from a source he gave (content/authors/oussama.json). His public bio says only
   that he builds Krizaka in Montréal, the education in his own words, and his work without his employer's name.
   It never names his city of origin or his city of studies, never calls him a Java and Spring engineer, never links LinkedIn.
   (2026-10-17, Oussama's correction.) */
const facts = JSON.parse(readFileSync(new URL("../content/authors/oussama.json", import.meta.url), "utf8"));
const messages = (l) => JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), "utf8"));
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const PATH_PLACES = /\b(Oujda|Maroc|Morocco|Grenoble|Casablanca|Rabat|Fès|Fez|Paris|Lyon)\b/g;
// Grenoble may appear only inside the 2011 lab's name (the LIG), as Oussama asked on 2026-10-17.
const LAB = /laboratoire d'informatique de Grenoble \(LIG\)|Grenoble Informatics Laboratory \(LIG\)/gi;
const FORBIDDEN = /Oujda|Grenoble|Maroc|Morocco|Java and Spring|Java et Spring|linkedin\.com/i;
const BANKS = /\b(RBC|Royal Bank|Banque Royale|TD Bank|Banque TD|BMO|Bank of Montreal|Banque de Montréal|Scotiabank|CIBC|Banque Nationale|National Bank|Desjardins|Laurentienne|Laurentian)\b/i;
const BIRTH = /\b(né le|née le|born on|date de naissance|date of birth)\b/i;
const EDU = {
  en: "I studied mathematics and computer science, then turned to mathematics and computing applied to cognitive science.",
  fr: "J'ai étudié les mathématiques et l'informatique, puis je me suis orienté vers les mathématiques et l'informatique appliquées aux sciences cognitives.",
};
const posts = readdirSync(new URL("../content/posts/", import.meta.url)).filter((f) => f.endsWith(".mdx"));

test("the author's facts have a source and the list of what is never published", () => {
  assert.ok(facts.source.length > 40);
  assert.deepEqual(facts.places, ["Montréal"]);
  assert.ok(facts.neverPublish.some((n) => /employer/.test(n)));
});

test("the About page and the home note tell the sourced path, and never the employer, a birth date, a former city or LinkedIn", () => {
  for (const l of ["en", "fr"]) {
    const a = messages(l).about;
    const text = [a.lead, ...a.body, a.labNote, ...a.places].join("\n");
    assert.ok(a.labNote.includes("{lab}"), `${l}: the About page's note names the 2011 lab`);
    assert.match(a.lab, new RegExp(LAB.source, "i"), `${l}: the lab is named as the LIG`);
    for (const [place] of text.matchAll(PATH_PLACES)) assert.ok(facts.places.includes(place), `${l}: ${place} is not sourced`);
    assert.doesNotMatch(text, FORBIDDEN, `${l}: forbidden in the bio`);
    assert.match(text, /Montréal/);
    assert.ok(text.includes(EDU[l]), `${l}: the education is worded as he gave it`);
    // His current job is never told, even unnamed (Oussama, 2026-10-17).
    assert.doesNotMatch(text, /banque canadienne|Canadian bank|bancaire|banking|architecte dans|architect at/i, `${l}: the current job is not told`);
    assert.doesNotMatch(text, BANKS);
    assert.doesNotMatch(text, BIRTH);
  }
});

test("the About page links the 2011 lab, the LIG, and its name is the only place Grenoble appears (the home keeps a byline, krizaka-blog#123)", () => {
  assert.equal(facts.lab.url, "https://www.liglab.fr/");
  assert.match(read("app/components/about/AboutPage.tsx"), /https:\/\/www\.liglab\.fr\//);
  for (const l of ["en", "fr"]) assert.doesNotMatch(messages(l).about.lab.replace(LAB, ""), FORBIDDEN);
  assert.ok(!existsSync(new URL("../app/components/about/AuthorNote.tsx", import.meta.url)), "the home's « Who writes » block is gone");
});

test("the Person JSON-LD of the About page names no former city and no LinkedIn profile", () => {
  assert.doesNotMatch(read("app/components/about/AboutPage.tsx"), FORBIDDEN);
});

test("a post that tells the author's path names only sourced places and links to the About page", () => {
  for (const f of posts) {
    const { content } = matter(read(`content/posts/${f}`));
    const named = [...content.matchAll(PATH_PLACES)].map((m) => m[0]);
    assert.doesNotMatch(content, BANKS, f);
    assert.doesNotMatch(content, BIRTH, f);
    if (!named.length) continue;
    for (const p of named) assert.ok(facts.places.includes(p), `${f}: ${p} is not sourced`);
    assert.doesNotMatch(content, FORBIDDEN, `${f}: forbidden in a public post`);
    assert.doesNotMatch(content, /Java et Spring|Java and Spring/);
    assert.match(content, /Montréal/, `${f} says Montréal`);
    assert.ok(content.includes(f.endsWith(".fr.mdx") ? EDU.fr : EDU.en), `${f}: the education is worded as he gave it`);
    assert.match(content, f.endsWith(".fr.mdx") ? /\]\(\/fr\/about\/?\)/ : /\]\(\/about\/?\)/, `${f} tells the path: it links to the About page`);
  }
});

test("the author is shown by the Wu-sama mark, never a photo: the About page and the byline", () => {
  for (const f of ["app/components/about/AboutPage.tsx", "app/components/pages/Byline.tsx"]) {
    assert.match(read(f), /WuSamaMark/, `${f} draws the Wu-sama mark`);
    assert.doesNotMatch(read(f), /<(img|Image)\b|@krizaka\/ui\/avatar/, `${f} shows no photo or avatar image`);
  }
  assert.doesNotMatch(read("app/components/about/AboutPage.tsx"), /KrizakaLogo/);
});

test("the About page mark's label names « Wu-sama », and the bio body keeps it retired", () => {
  for (const l of ["en", "fr"]) {
    const a = messages(l).about;
    assert.equal(a.body.join("\n").match(/Wu-sama/g)?.length ?? 0, 0, `${l}: the nickname is not in the bio text`);
    assert.match(a.slot, /Wu-sama/, `${l}: the mark's label`);
  }
});
