/* Merged posts keep their address. DigitalOcean's ingress has no regex and must not list routes one by one (krizaka/.github
   docs/standards/ci-and-deploy.md), so the build writes one small page per old address and language: a meta refresh to the
   post that absorbed it, its canonical, and noindex. Source of truth: content/redirects.json { oldSlug: newSlug }. */
export const SITE = "https://blog.krizaka.com";
export const LOCALES = [{ id: "en", prefix: "" }, { id: "fr", prefix: "/fr" }];

export function redirectPages(map) {
  const pages = [];
  for (const [from, to] of Object.entries(map)) {
    for (const { prefix } of LOCALES) {
      const target = `${SITE}${prefix}/posts/${to}/`;
      pages.push({
        path: `${prefix}/posts/${from}/index.html`.replace(/^\//, ""),
        target,
        html: `<!doctype html><html><head><meta charset="utf-8"><title>Moved</title><meta name="robots" content="noindex"><link rel="canonical" href="${target}"><meta http-equiv="refresh" content="0; url=${target}"></head><body><a href="${target}">${target}</a></body></html>\n`,
      });
    }
  }
  return pages;
}
