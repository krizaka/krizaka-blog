import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n";
import { allPosts } from "@/lib/posts";
import { allChapters } from "@/lib/chapters";
import { absoluteUrl, chapterPath, postPath } from "@/lib/seo";

export const dynamic = "force-static";

/* Every page in both languages; a page that exists in both names the other (hreflang), a post in one language names itself.
   The blog is one page (krizaka-blog#123): the home (the story), its chapters, « The basics » and their posts, À propos and the
   newsletter. A removed address is a stub (lib/retired.ts), never in the sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const built = allPosts()[0]?.updated ?? allPosts()[0]?.date ?? new Date().toISOString().slice(0, 10);
  const both = ["/", "/basics", "/about", "/newsletter"].flatMap((path) => {
    const languages = Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(l, path)]));
    return LOCALES.map((l) => ({
      url: absoluteUrl(l, path),
      lastModified: built,
      changeFrequency: "weekly" as const,
      alternates: { languages },
    }));
  });
  const posts = allPosts().map((p) => {
    const langs = LOCALES.filter((l) => allPosts().some((q) => q.slug === p.slug && q.locale === l));
    return {
      url: absoluteUrl(p.locale, postPath(p.slug)),
      lastModified: p.updated ?? p.date,
      alternates: { languages: Object.fromEntries(langs.map((l) => [l, absoluteUrl(l, postPath(p.slug))])) },
    };
  });
  const chapters = allChapters().map((c) => {
    const langs = LOCALES.filter((l) => allChapters().some((q) => q.slug === c.slug && q.locale === l));
    return {
      url: absoluteUrl(c.locale, chapterPath(c.slug)),
      lastModified: c.updated ?? c.date,
      alternates: { languages: Object.fromEntries(langs.map((l) => [l, absoluteUrl(l, chapterPath(c.slug))])) },
    };
  });
  return [...both, ...chapters, ...posts];
}
