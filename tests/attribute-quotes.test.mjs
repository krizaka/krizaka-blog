import { test } from "node:test";
import assert from "node:assert/strict";
import { attributeQuoteProblems } from "../scripts/content-rules.mjs";

test("a straight quote inside an attribute is refused", () => {
  assert.equal(
    attributeQuoteProblems(
      '<Figure id="a" alt="under the "Development version" banner" />',
      "x.mdx",
    ).length,
    1,
  );
});

test("well-formed attributes pass", () => {
  assert.deepEqual(
    attributeQuoteProblems(
      '<Figure id="a" alt="under the « Development version » banner" />\n<Figure id="b" alt="x"/>',
      "x.mdx",
    ),
    [],
  );
});
