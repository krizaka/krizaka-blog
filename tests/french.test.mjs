import test from "node:test";
import assert from "node:assert/strict";
import { FR_TERMS, frenchProblems } from "../scripts/content-french.mjs";
import { postProblems } from "../scripts/content-rules.mjs";

const ok = { title: "T", description: "D", date: "2026-10-16", tags: ["ai"], draft: true };

test("a calque in a French text is refused, with the word to use", () => {
  const p = frenchProblems("x.fr.mdx", ok, "Le chien de garde relit la file de fusion.");
  assert.equal(p.length, 2);
  assert.match(p[0], /chien de garde.*watchdog/);
  assert.match(p[1], /file de fusion.*merge queue/);
});

test("the post check runs it (npm run lint)", () => {
  assert.ok(postProblems("x.fr.mdx", ok, "Chaque jeton compte.").some((p) => /jeton.*token/.test(p)));
});

test("the English words of the glossary pass, and an English text is not read", () => {
  assert.deepEqual(frenchProblems("x.fr.mdx", ok, "Le watchdog relit la merge queue ; chaque token compte."), []);
  assert.deepEqual(frenchProblems("x.en.mdx", ok, "chien de garde"), []);
});

test("whole words only, real French stays: brackets, a verb, a guest", () => {
  assert.deepEqual(frenchProblems("x.fr.mdx", ok, "Un calcul entre crochets. Il invite les invités."), []);
  assert.equal(frenchProblems("x.fr.mdx", ok, "Les deux crochets de l'organisation.").length, 1);
  assert.equal(frenchProblems("x.fr.mdx", ok, "Une invite générique.").length, 1);
});

test("the title, the description and the cover words are read; code is not", () => {
  assert.equal(frenchProblems("x.fr.mdx", { ...ok, title: "Le veilleur" }, "").length, 1);
  assert.equal(frenchProblems("x.fr.mdx", { ...ok, coverAlt: "Des jetons" }, "").length, 1);
  assert.deepEqual(frenchProblems("x.fr.mdx", ok, "Voir `jeton` et\n\n```text\nchien de garde\n```\n"), []);
});

test("the glossary keeps the words the founder named in English", () => {
  for (const w of ["watchdog", "pull request", "merge queue", "runner", "build", "lint", "commit", "release", "CI", "deploy", "cache", "token", "prompt"])
    assert.ok(FR_TERMS.keep.includes(w), w);
  for (const { use } of FR_TERMS.refuse) assert.ok(use.trim(), "every refused word names the word to use");
});
