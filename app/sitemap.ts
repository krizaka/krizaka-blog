import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n";
import { allPosts, tagsOf } from "@/lib/posts";
import { absoluteUrl, postPath } from "@/lib/seo";

export const dynamic = "force-static";

/* Every page in both languages; a page that exists in both names the other (hreflang), a post in one language names itself. */
export default function sitemap(): MetadataRoute.Sitemap {
  const built = allPosts()[0]?.updated ?? allPosts()[0]?.date ?? new Date().toISOString().slice(0, 10);
  const both = ["/", "/tags", "/search"].flatMap((path) => {
    const languages = Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(l, path)]));
    return LOCALES.map((l) => ({ url: absoluteUrl(l, path), lastModified: built, changeFrequency: "weekly" as const, alternates: { languages } }));
  });
  const posts = allPosts().map((p) => {
    const langs = LOCALES.filter((l) => allPosts().some((q) => q.slug === p.slug && q.locale === l));
    return { url: absoluteUrl(p.locale, postPath(p.slug)), lastModified: p.updated ?? p.date, alternates: { languages: Object.fromEntries(langs.map((l) => [l, absoluteUrl(l, postPath(p.slug))])) } };
  });
  const tags = LOCALES.flatMap((l) => tagsOf(l).map(({ tag }) => ({ url: absoluteUrl(l, `/tags/${tag}`), lastModified: built })));
  return [...both, ...posts, ...tags];
}
