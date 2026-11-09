#!/usr/bin/env node
// WHY  The « how we work » chapter draws a train and a team board from simulated data. The confidentiality rules of a post
//      (scripts/content-confidentiality.mjs) read the MDX, but the figures carry their own text — in the components, their
//      fixtures and the figure's messages — which the MDX rules never see. This guard reads those files too and refuses a
//      private thing drawn into a figure: a machine path, an internal or restricted repository name, a private folder, an
//      e-mail, a key-looking value, or a real pull-request / issue number (ours are ≥ 100; the simulation uses « PR 1 »).
// WHAT `articleConfidentialProblems(root)`: the problems found in the article's own files and the figure's messages. The
//      file list is explicit so the guard never reads its own needles or the test's planted strings.
// HOW  Imported by scripts/check-content.mjs (so it runs in `npm run lint`) and by tests/article-confidential.test.mjs;
//      runnable on its own with `node scripts/check-article-confidential.mjs` (exits 1 on a problem). Nothing to install.
// OWNER krizaka-blog (lane platform), krizaka-internal#2912.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIVATE_REPOS } from "./content-links.mjs";

/** The article's own files: the chapter in both languages, the figure components and their pure simulations. */
export const ARTICLE_FILES = [
  "content/posts/let-me-show-you-the-machine.en.mdx",
  "content/posts/let-me-show-you-the-machine.fr.mdx",
  "app/components/pages/Train.tsx",
  "app/components/pages/TeamBoard.tsx",
  "app/components/pages/MouloudPlate.tsx",
  "lib/train-sim.ts",
  "lib/team-board.ts",
];

/** The message subtrees the figures draw their words from (scanned as text). */
export const FIGURE_MESSAGE_KEYS = ["train", "board", "mouloud"];

const privateRepoLink = new RegExp(`github\\.com/krizaka/(${PRIVATE_REPOS.join("|")})\\b`);

/** A real pull-request or issue reference: `#1234`, `PR 1234`, `issue 1234`, or a `/pull/1234` URL. The simulation uses one
    or two digits (« PR 1 »), so three digits or more in this shape is a real number that must not reach a public figure. */
const REAL_TICKETS = [/#\s?\d{3,}\b/, /\b(?:PR|pull request|issues?)\s*#?\s?\d{3,}\b/i, /\/(?:pull|issues)\/\d+/];
const realTicket = (text) => REAL_TICKETS.map((re) => text.match(re)?.[0]).find(Boolean) ?? null;

/** The first e-mail address in `text`, found word by word so that no pattern can backtrack over a long run of characters. */
function firstEmail(text) {
  for (const word of text.split(/[\s<>()"'`,;:]+/)) {
    const at = word.indexOf("@");
    if (at > 0 && /[\w.+-]$/.test(word.slice(0, at)) && /^[\w-]+\.[a-z]{2,}/i.test(word.slice(at + 1))) return word;
  }
  return null;
}

/** Each rule is `[matcher, what]`; a matcher is a RegExp or `(text) => first match | null`. */
const RULES = [
  [/\/Users\/[\w.-]+/, "a path on someone's machine"],
  [/Documents\/krizaka/, "a path in the founder's workspace"],
  [/\bkrizaka-internal\b/, "the internal repository name"],
  [/\bkrizaka-restricted\b/, "the restricted repository name"],
  [/(^|[^\w-])(env|vault|inbox|prompts)\/[\w.-]/, "a folder name of the private workspace (env/, vault/, inbox/…)"],
  [firstEmail, "an e-mail address"],
  [/\b(sk|pk|rk)[-_](live|test|ant|proj)?[-_]?[A-Za-z0-9]{20,}/, "a key-looking value"],
  [realTicket, "a number that looks like a real pull request or issue (use a fictional « PR 1 »)"],
  [privateRepoLink, "a link to a private repository of the org"],
];

const found = (matcher, text) => (typeof matcher === "function" ? matcher(text) : (text.match(matcher)?.[0] ?? null));

/** The problems of one file's text (exported for the test, which plants a forbidden string and checks it is caught). */
export function textProblems(name, text) {
  const out = [];
  for (const [matcher, what] of RULES) {
    const hit = found(matcher, text);
    if (hit)
      out.push(`${name}: a figure must not carry ${what} (“${hit.trim().slice(0, 40)}”) — the data is simulated`);
  }
  return out;
}

/** Every problem in the article's files and in the figures' message subtrees. `root` is the repository root. */
export function articleConfidentialProblems(root) {
  const out = [];
  for (const rel of ARTICLE_FILES) {
    let text;
    try {
      text = readFileSync(join(root, rel), "utf8");
    } catch {
      out.push(`${rel}: the article file is missing (the guard expects it)`);
      continue;
    }
    out.push(...textProblems(rel, text));
  }
  for (const locale of ["en", "fr"]) {
    const messages = JSON.parse(readFileSync(join(root, `messages/${locale}.json`), "utf8"));
    for (const key of FIGURE_MESSAGE_KEYS)
      if (messages[key] !== undefined)
        out.push(...textProblems(`messages/${locale}.json#${key}`, JSON.stringify(messages[key])));
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const problems = articleConfidentialProblems(root);
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`check-article-confidential: ${ARTICLE_FILES.length} files and the figure messages ok`);
}
