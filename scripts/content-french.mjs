// WHY  A French text of the blog is written in French, not translated word for word from the English (krizaka-internal#3942):
//      a technical word a French-speaking developer says in English stays in English (watchdog, pull request, merge queue…), and a
//      calque (« chien de garde », « file de fusion », « jeton ») is refused with the word to use.
// WHAT `FR_TERMS` (content/glossary/fr-terms.json) and `frenchProblems(file, data, body)`: one problem per calque found in a
//      `.fr.mdx` (title, description, cover words and body; code blocks and inline code left out).
// HOW  Imported by scripts/content-post.mjs (so `npm run lint` runs it on every post and chapter); nothing to run.
//      Tests: tests/french.test.mjs.
// OWNER krizaka-blog (lane platform).

import { readFileSync } from "node:fs";

export const FR_TERMS = JSON.parse(readFileSync(new URL("../content/glossary/fr-terms.json", import.meta.url), "utf8"));

/** Letters of a French word, so a pattern only matches whole words (« invite » in « invités » does not count). */
const LETTER = "\\p{L}\\p{N}_";
const REFUSED = FR_TERMS.refuse.map(({ pattern, use }) => ({
  re: new RegExp(`(?<![${LETTER}])${pattern}(?![${LETTER}])`, "giu"),
  use,
}));

/** The prose of a post: code fences and inline code are left out (a command or an identifier is not French). */
function prose(body) {
  const kept = [];
  let fence = null;
  for (const line of body.split("\n")) {
    const opener = line.trimStart().slice(0, 3);
    if (opener === "```" || opener === "~~~") {
      if (fence === null) fence = opener;
      else if (fence === opener) fence = null;
      continue;
    }
    if (fence === null) kept.push(line.replace(/`[^`\n]*`/g, ""));
  }
  return kept.join("\n");
}

/** Every refused calque of one French text, once per word, with the word to use. */
export function frenchProblems(file, data, body) {
  if (!file.endsWith(".fr.mdx")) return [];
  const text = [data.title, data.description, data.coverAlt, data.seoTitle, data.seoDescription, prose(body)]
    .filter((v) => typeof v === "string")
    .join("\n");
  const out = [];
  for (const { re, use } of REFUSED) {
    const found = [...new Set([...text.matchAll(re)].map((m) => m[0].toLowerCase()))];
    for (const word of found)
      out.push(`${file}: « ${word} » is a calque: say « ${use} » (content/glossary/fr-terms.json)`);
  }
  return out;
}
