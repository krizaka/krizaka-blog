import type { MetadataRoute } from "next";
import { INDEXING_ENABLED, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/* The family's AI-crawler list (krizaka.com AGENTS §2.4), allowed — once the blog is open. Until Oussama publishes the
   first post the whole site is `Disallow: /` (and every page is noindex): APP_INDEXING_ENABLED=true opens it. */
const AI_CRAWLERS = [
  "Googlebot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
];

/** The editor and its sign-in are never for crawlers. */
const PRIVATE = ["/admin/", "/api/"];

export default function robots(): MetadataRoute.Robots {
  if (!INDEXING_ENABLED)
    return { rules: { userAgent: "*", disallow: "/" }, sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
