/* Canonical URLs, alternates, Open Graph and JSON-LD of a page. Every page is canonical to itself in its own language;
   it names the other language only when that page exists (hreflang). English is also x-default. */
import type { Metadata } from "next";
import { getDictionary, localizedPath, type Locale } from "./i18n";
import type { Post } from "./posts";
import { INDEXING_ENABLED, ORGANIZATION_ID, SITE_URL } from "./site";

export const absoluteUrl = (locale: Locale, path: string) => `${SITE_URL}${localizedPath(locale, path)}`;
export const postPath = (slug: string) => `/posts/${slug}`;
export const ogUrl = (locale: Locale, slug: string) => `${SITE_URL}${locale === "en" ? "" : "/fr"}/og/${slug}.png`;
export const DEFAULT_OG = `${SITE_URL}/og/site.png`;

export function pageMetadata(opts: { locale: Locale; path: string; title: string; description: string; alternates?: Locale[]; image?: string; type?: "website" | "article"; published?: string }): Metadata {
  const { locale, path, title, description, type = "website" } = opts;
  const t = getDictionary(locale);
  const fullTitle = path === "/" ? title : `${title} — ${t.site.name}`;
  const url = absoluteUrl(locale, path);
  const langs = opts.alternates ?? [locale];
  const image = opts.image ?? DEFAULT_OG;
  return {
    title: { absolute: fullTitle },
    description,
    metadataBase: new URL(SITE_URL),
    robots: INDEXING_ENABLED ? { index: true, follow: true } : { index: false, follow: false },
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(langs.map((l) => [l, absoluteUrl(l, path)])),
        ...(langs.includes("en") ? { "x-default": absoluteUrl("en", path) } : {}),
      },
      types: { "application/rss+xml": `${SITE_URL}${locale === "en" ? "" : "/fr"}/feed.xml`, "application/atom+xml": `${SITE_URL}${locale === "en" ? "" : "/fr"}/atom.xml` },
    },
    openGraph: {
      type,
      siteName: t.site.name,
      title: fullTitle,
      description,
      url,
      locale: locale === "en" ? "en_US" : "fr_CA",
      images: [{ url: image, width: 1200, height: 630 }],
      ...(type === "article" && opts.published ? { publishedTime: opts.published } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image] },
    icons: { icon: "/favicon.svg" },
  };
}

const publisher = { "@type": "Organization", "@id": ORGANIZATION_ID, name: "Krizaka", url: "https://www.krizaka.com" };

export function blogJsonLd(locale: Locale) {
  const t = getDictionary(locale);
  return { "@context": "https://schema.org", "@type": "Blog", name: t.site.name, description: t.site.description, url: absoluteUrl(locale, "/"), inLanguage: locale, publisher };
}

export function postJsonLd(post: Post) {
  const t = getDictionary(post.locale);
  const url = absoluteUrl(post.locale, postPath(post.slug));
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t.site.name, item: absoluteUrl(post.locale, "/") },
        { "@type": "ListItem", position: 2, name: post.title, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      url,
      mainEntityOfPage: url,
      inLanguage: post.locale,
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      image: post.image ?? ogUrl(post.locale, post.slug),
      keywords: post.tags.join(", "),
      author: { "@type": "Person", name: t.authors[post.author as keyof typeof t.authors] ?? post.author },
      isPartOf: { "@type": "Blog", name: t.site.name, url: absoluteUrl(post.locale, "/") },
      publisher,
    },
  ];
}

/** A listing page (topics, a topic, the search): a CollectionPage of the blog, published by Krizaka. */
export function collectionJsonLd(locale: Locale, path: string, name: string, description: string) {
  const t = getDictionary(locale);
  return { "@context": "https://schema.org", "@type": "CollectionPage", name, description, url: absoluteUrl(locale, path), inLanguage: locale, isPartOf: { "@type": "Blog", name: t.site.name, url: absoluteUrl(locale, "/") }, publisher };
}
