import facts from "../content/authors/oussama.json";

/* Where the blog sends a reader who wants to know its author better: his GitHub profile, and the banner that profile shows
   (dark and light, hosted on the blog's CDN prefix — never committed). The values live with his sourced facts
   (content/authors/oussama.json, `github`), tested by tests/author.test.mjs. */
export const AUTHOR_GITHUB = facts.github;
