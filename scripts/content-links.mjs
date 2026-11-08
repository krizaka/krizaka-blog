// WHY  Links in a post are checked for one thing: they lead somewhere that exists and is public. The rules of links live together.
// WHAT Links between posts, internal links of a body, links to private repositories and to issues of the org, and the straight quote that breaks a JSX attribute.
// HOW  Imported by scripts/content-post.mjs, scripts/content-chapters.mjs and scripts/content-rules.mjs; nothing to run. Tests: tests/content.test.mjs, tests/basics.test.mjs, tests/private-repo-links.test.mjs, tests/attribute-quotes.test.mjs.
// OWNER krizaka-blog (lane platform), ADR-026 phase D.

import { isUnreachableRepo, privateRepoNames, writtenOwnedAddresses } from "../lib/links.ts";
import { FILE } from "./content-names.mjs";

/** Links between posts (`/basics/<slug>` and `/fr/basics/<slug>`, the shelf's addresses): each one leads to a post of that language, and a published
    post never links to a draft (the reader would land on a 404). `posts` is [{ file, data, body }]. */
export function linkProblems(posts) {
  const out = [];
  const known = new Map();
  for (const p of posts) {
    const m = p.file.match(FILE);
    if (m) known.set(`${m[2]}:${m[1]}`, p.data.draft === true);
  }
  for (const p of posts) {
    for (const l of p.body.matchAll(/\]\((\/fr)?\/(?:posts|basics)\/([a-z0-9-]+)\/?(?:#[^)]*)?\)/g)) {
      const key = `${l[1] ? "fr" : "en"}:${l[2]}`;
      if (!known.has(key)) out.push(`${p.file}: links to ${l[0].slice(2, -1)}, which is not a post`);
      else if (p.data.draft !== true && known.get(key))
        out.push(`${p.file}: a published post links to the draft ${l[0].slice(2, -1)}`);
    }
  }
  return out;
}

/** The pages a body may link to besides posts and chapters (both languages). The blog is one page (krizaka-blog#123): the topics,
    the series, the search, the saved posts and the feed page are stubs now (lib/redirects.json), never a link's target. */
const STATIC_PAGES = new Set(["", "about", "newsletter", "basics"]);

/** Internal links of a body (`](/…)`): each leads to a generated route or a page of the site. */
export function internalLinkProblems(file, body, known, sourceDraft = false) {
  const out = [];
  for (const l of body.matchAll(/\]\((\/[^)\s#]*)(?:#[^)]*)?\)/g)) {
    const path = l[1];
    const m = path.match(/^(\/fr)?\/(?:(posts|basics|story)\/([a-z0-9-]+)|([a-z-]*))\/?$/);
    const locale = m?.[1] ? "fr" : "en";
    const kind = m?.[2] === "basics" ? "posts" : m?.[2];
    const key = kind ? `${kind}:${locale}:${m[3]}` : undefined;
    const ok =
      m &&
      (key
        ? known.has(key) && (sourceDraft || !(known instanceof Map && known.get(key) === true))
        : STATIC_PAGES.has(m[4]));
    if (!ok) out.push(`${file}: links to ${path}, which is not a page of the blog`);
  }
  return out;
}

/* A JSX attribute whose text holds a straight double quote ends early and breaks the MDX build (chapter 18, blog#209): use « » or “ ”. */
export function attributeQuoteProblems(text, file) {
  const bad = /\b(?:alt|title|caption|label)="[^"\n]*"(?![\s/>])/g;
  return [...text.matchAll(bad)].map(
    (m) => `${file}: a straight double quote inside an attribute ends it early (${m[0].slice(0, 50)}…): use « » or “ ”`,
  );
}

/* A link to a private repository of the org is a 404 for every reader, and the external link check (ci / Verify) then
   fails every pull request at once (krizaka-infra#9, krizaka-internal#2364). The list is the provider's (lib/links.ts): a
   repository made private is one line there. */
export const PRIVATE_REPOS = privateRepoNames();

/** An address of the org written out in the content: it is asked for by name (krizaka-internal#2961). */
export function writtenAddressProblems(text, file) {
  return writtenOwnedAddresses(text).map(
    (address) =>
      `${file}: ${address}: ask lib/links.ts by name, [words](repo:<name>/<path>) or [words](site:<name>/<path>)`,
  );
}

export function privateRepoLinkProblems(text, file) {
  const link = /https?:\/\/github\.com\/krizaka\/([A-Za-z0-9._-]+)/g;
  return [...text.matchAll(link)]
    .filter((m) => isUnreachableRepo(m[1].replace(/\.git$/, "")))
    .map(
      (m) =>
        `${file}: links the private repository krizaka/${m[1]} (${m[0]}), a 404 for readers: say it without a link`,
    );
}

/* Issues never live in the repository a page names: the company's tickets are in the private krizaka-internal, and a
   ticket moved there (or between repositories) leaves a link that answers 404, or GitHub's generic page with a 200 that
   the external link check cannot tell from a live one (krizaka-blog main red on orazaka-ai-engine#116, 2026-11-06).
   A page names a pull request, a commit or a file, which stay public, or says the thing without a link. */
export function orgIssueLinkProblems(text, file) {
  const link = /https?:\/\/github\.com\/krizaka\/[A-Za-z0-9._-]+\/issues\/\d+/g;
  return [...text.matchAll(link)].map(
    (m) =>
      `${file}: links an issue of the org (${m[0]}), moved to a private tracker or answering 404: link a pull request, or say it without a link`,
  );
}

/* A line anchor on a moving branch (`/blob/main/…#L696-L702`) points at other lines after the next commit and at nothing after a
   rename or a move: the audit chapter's JobListener link was a 404 on main once the repository and package were renamed
   (krizaka-internal#2798). A line is cited by a permalink: the commit's SHA in place of the branch. */
export function branchLineLinkProblems(text, file) {
  const link = /https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/blob\/(?:main|master)\/[^\s)"]*#L\d+/g;
  return [...text.matchAll(link)].map(
    (m) => `${file}: cites lines on a branch (${m[0]}): use a permalink (the commit SHA instead of main)`,
  );
}
