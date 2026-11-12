/* The pure rule of the /basics/<slug>/ stubs, on the redirects map given (lib/redirects.json), so the tests run it as the site does
   (krizaka-internal#3206: the week 46 post was folded into chapter 27 and its /basics/ address answered 404 although the newsletter linked
   it; a slug key only made the old /posts/ stub). A retired post keeps a stub where it was last published; a live post never has one. */

/** The target of /basics/<slug>/ in a language when it is a stub: the withdrawn shelf post's key first, else the retired post's slug key. */
export function stubHref(map, locale, slug) {
  return map[`page:/basics/${slug}/`]?.[locale] ?? (slug.includes(":") ? undefined : map[slug]?.[locale]);
}

/** Every /basics/<slug>/ that is a stub in a language: the withdrawn shelf posts and every retired post slug, minus the live posts. */
export function stubSlugs(map, locale, live) {
  const keys = Object.keys(map);
  const shelf = keys
    .filter((k) => k.startsWith("page:/basics/") && k !== "page:/basics/")
    .map((k) => k.slice("page:/basics/".length).replace(/\/$/, ""));
  const posts = keys.filter((k) => !k.includes(":"));
  return [...new Set([...shelf, ...posts])].filter((s) => !live.has(s) && stubHref(map, locale, s));
}
