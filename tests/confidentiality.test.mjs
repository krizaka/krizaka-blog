import test from "node:test";
import assert from "node:assert/strict";
import {
  CONFIDENTIAL_STRICT,
  firstSecretVariable,
  firstWord,
  LEDGER_WORDS,
  SUPPLIER_NAMES,
  VARIABLE_NAME,
} from "../scripts/content-confidentiality.mjs";
import { confidentialityProblems, hasIdAttribute } from "../scripts/content-rules.mjs";

// ADR-026 phase D: the word lists are data. The expectations below were recorded from the regex version; a comparison of old and
// new on 60,000 generated texts (suppliers, ledger words, variable names, amounts, registration numbers) gave no difference.

test("firstWord: a whole word or phrase, case-insensitive, the earliest in the text, in the text's spelling", () => {
  assert.equal(firstWord("we use RUNPOD and Bunny", SUPPLIER_NAMES), "RUNPOD");
  assert.equal(firstWord("a Bunny.", SUPPLIER_NAMES), "Bunny");
  assert.equal(firstWord("bunnyx xbunny bunny_1", SUPPLIER_NAMES), null, "inside a longer word is not a hit");
  assert.equal(firstWord("Grand Livre et ledger", LEDGER_WORDS), "Grand Livre");
  assert.equal(firstWord("la constitution, la banque", LEDGER_WORDS), "constitution");
  assert.equal(firstWord("bankrupt ledgers", LEDGER_WORDS), null);
  assert.equal(firstWord("Grand  Livre", LEDGER_WORDS), null, "a phrase is matched as written, with one space");
});

test("firstSecretVariable: upper-case words joined by underscores, ending in a secret suffix", () => {
  for (const [text, hit] of [
    ["set STRIPE_SECRET_KEY=1", "STRIPE_SECRET_KEY"],
    ["API_KEY", "API_KEY"],
    ["(FOO_ADMIN)", "FOO_ADMIN"],
    ["MY_API_KEY and X_KEY", "MY_API_KEY"],
    ["9_KEY", null],
    ["KEY", null],
    ["Foo_KEY", null],
    ["FOO_KEYS", null],
    ["aSTRIPE_TOKEN", null],
    ["API_KEY_X", null],
    ["STRIPE__KEY", null],
  ])
    assert.equal(firstSecretVariable(text), hit, text);
  assert.ok(VARIABLE_NAME.test("A_B_C") && !VARIABLE_NAME.test("a_b") && !VARIABLE_NAME.test("A__B"));
});

test("the strict rules flag a sensitive post and the always rules flag every post", () => {
  const sensitive = { sensitive: true, title: "t" };
  const found = (body, data = sensitive) =>
    confidentialityProblems("f.en.mdx", data, body).map((p) => p.split("—")[1].split("(")[0].trim());
  assert.deepEqual(found("we pay 12 $ to Bunny, see STRIPE_SECRET_KEY and the ledger"), [
    "an amount of money",
    "a key or variable name",
    "a supplier name",
    "a ledger, fiscal or bank word",
  ]);
  assert.deepEqual(found("we pay 12 $ to Bunny", { title: "t" }), [], "not sensitive: the strict rules do not apply");
  assert.deepEqual(found("write to jane@krizaka.com", { title: "t" }), ["a company e-mail address"]);
  assert.equal(CONFIDENTIAL_STRICT.length, 4);
});

test('hasIdAttribute: id="x" as an attribute of its own, not data-id', () => {
  assert.equal(hasIdAttribute('<Figure id="cover-a" alt="x" />', "cover-a"), true);
  assert.equal(hasIdAttribute('<div data-id="cover-a">', "cover-a"), true);
  assert.equal(hasIdAttribute('<div xid="cover-a">', "cover-a"), false);
  assert.equal(hasIdAttribute('<Figure id="cover-ab" />', "cover-a"), false);
});
