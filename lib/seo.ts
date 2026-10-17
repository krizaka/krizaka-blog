/* Canonical URLs, alternates, Open Graph and JSON-LD of a page. Every page is canonical to itself in its own language;
   it names the other language only when that page exists (hreflang). English is also x-default. */
import type { Metadata } from "next";
import { getDictionary, localizedPath, type Locale } from "./i18n";
import type { Post } from "./posts";
import { faqOf, metaDescription, titleTag } from "./reading.ts";
import { INDEXING_ENABLED, ORGANIZATION_ID, SITE_URL } from "./site";

export const absoluteUrl = (locale: Locale, path: string) => `${SITE_URL}${localizedPath(locale, path)}`;
export const postPath = (slug: string) => `/posts/${slug}`;
export const ogUrl = (locale: Locale, slug: string) => `${SITE_URL}${locale === "en" ? "" : "/fr"}/og/${slug}.png`;
export const DEFAULT_OG = `${SITE_URL}/og/site.png`;

export function pageMetadata(opts: { locale: Locale; path: string; title: string; description: string; alternates?: Locale[]; image?: string; type?: "website" | "article"; published?: string; modified?: string; absoluteTitle?: boolean; tags?: string[] }): Metadata {
  const { locale, path, title, description, type = "website" } = opts;
  const t = getDictionary(locale);
  /* The title tag: the page's own words, then the blog's name — unless the page already gives a complete one (≤ 60). */
  const fullTitle = path === "/" || opts.absoluteTitle ? title : `${title} — ${t.site.name}`;
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
      ...(type === "article" && opts.published ? { publishedTime: opts.published, modifiedTime: opts.modified ?? opts.published, authors: [absoluteUrl(locale, "/")], tags: opts.tags } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image] },
    icons: { icon: "/favicon.svg" },
  };
}

const org = { "@id": ORGANIZATION_ID };
const publisher = { "@type": "Organization", "@id": ORGANIZATION_ID, name: "Krizaka", url: "https://www.krizaka.com" };
export const blogId = (locale: Locale) => `${absoluteUrl(locale, "/")}#blog`;
export const authorId = (author: string) => `${SITE_URL}/#author-${author}`;

/** The metadata of a post's page: the short title tag and description when the post gives them, the full title in Open Graph. */
export function postMetadata(post: Post, alternates: Locale[]): Metadata {
  const t = getDictionary(post.locale);
  const meta = pageMetadata({ locale: post.locale, path: postPath(post.slug), title: titleTag(post, t.site.name), absoluteTitle: true, description: metaDescription(post), type: "article", published: post.date, modified: post.updated, image: post.image ?? ogUrl(post.locale, post.slug), alternates, tags: post.tags });
  return { ...meta, authors: [{ name: (t.authors as Record<string, string>)[post.author] ?? post.author }], keywords: post.tags };
}

/** The writer of a post: Oussama is a Person who founded Krizaka; « the Krizaka team » is the Organization itself. */
function authorNode(post: Post) {
  const t = getDictionary(post.locale);
  if (post.author === "krizaka") return publisher;
  return { "@type": "Person", "@id": authorId(post.author), name: (t.authors as Record<string, string>)[post.author] ?? post.author, url: absoluteUrl(post.locale, "/"), worksFor: org };
}

export function blogJsonLd(locale: Locale) {
  const t = getDictionary(locale);
  return { "@context": "https://schema.org", "@type": "Blog", "@id": blogId(locale), name: t.site.name, description: t.site.description, url: absoluteUrl(locale, "/"), inLanguage: locale, publisher };
}

export function postJsonLd(post: Post, topic?: { name: string; path: string }) {
  const t = getDictionary(post.locale);
  const url = absoluteUrl(post.locale, postPath(post.slug));
  const crumbs = [{ name: t.site.name, item: absoluteUrl(post.locale, "/") }, ...(topic ? [{ name: topic.name, item: absoluteUrl(post.locale, topic.path) }] : []), { name: post.title, item: url }];
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, ...c })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: post.title,
      description: post.description,
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url, breadcrumb: { "@id": `${url}#breadcrumb` }, isPartOf: { "@id": blogId(post.locale) }, publisher: org },
      inLanguage: post.locale,
      datePublished: post.publishedAt ?? post.date,
      dateModified: post.updated ?? post.date,
      image: post.image ?? ogUrl(post.locale, post.slug),
      keywords: post.tags.join(", "),
      wordCount: post.body.split(/\s+/).filter(Boolean).length,
      timeRequired: `PT${post.readingMinutes}M`,
      author: authorNode(post),
      isPartOf: { "@type": "Blog", "@id": blogId(post.locale), name: t.site.name, url: absoluteUrl(post.locale, "/"), publisher: org },
      publisher,
    },
    ...faqJsonLd(post, url),
  ];
}

/** A post with a questions section (lib/reading.ts faqOf) also answers as a FAQPage of the same page. */
function faqJsonLd(post: Post, url: string) {
  const faq = faqOf(post.body);
  if (faq.length === 0) return [];
  return [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      url,
      inLanguage: post.locale,
      isPartOf: { "@id": `${url}#article` },
      publisher,
      mainEntity: faq.map((q) => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })),
    },
  ];
}

/** A listing page (topics, a topic, the search): a CollectionPage of the blog, published by Krizaka. */
export function collectionJsonLd(locale: Locale, path: string, name: string, description: string) {
  const t = getDictionary(locale);
  return { "@context": "https://schema.org", "@type": "CollectionPage", name, description, url: absoluteUrl(locale, path), inLanguage: locale, isPartOf: { "@type": "Blog", name: t.site.name, url: absoluteUrl(locale, "/") }, publisher };
}
