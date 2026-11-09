// WHY  The names every content rule shares (a post file's name, the media CDN prefixes) have one home, so the rules do not import each other for a constant.
// WHAT RESERVED_SLUGS, FILE (`<slug>.<en|fr>.mdx`), the CDN prefixes and the two helpers that read them.
// HOW  Imported by the content-*.mjs modules (and re-exported by scripts/content-rules.mjs); nothing to run. Tests: tests/content.test.mjs, tests/media.test.mjs.
// OWNER krizaka-blog (lane platform), ADR-026 phase D.

export const RESERVED_SLUGS = new Set(["site", "_"]);
export const FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.(en|fr)\.mdx$/;
export const CDN = "https://krizaka-assets.b-cdn.net/site/blog/";
/** The media layout v2 (krizaka-com ADR-014): new uploads of `cdn-assets.mjs` land under sites/blog/posts/; the older files keep the legacy prefix. */
export const CDN_V2 = "https://krizaka-assets.b-cdn.net/sites/blog/posts/";
export const CDN_PREFIXES = [CDN, CDN_V2];
export const onBlogCdn = (u) => typeof u === "string" && CDN_PREFIXES.some((p) => u.startsWith(p));
export const cdnBaseOf = (u) => CDN_PREFIXES.find((p) => u.startsWith(p));
