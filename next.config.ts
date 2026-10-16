import type { NextConfig } from "next";

/* A static site: `next build` writes out/ (HTML, CSS, JS, feeds, Open Graph images), served as is — no server, no function.
   Every page has its own directory (`/posts/x/index.html`), so any static host answers `/posts/x/` and `/posts/x`.
   English is at the root, French under /fr/. */
const nextConfig: NextConfig = {
  output: "export",
  // The private preview build (scripts/build.mjs) lives under /preview/<token>.
  ...(process.env.APP_PREVIEW_PATH ? { basePath: process.env.APP_PREVIEW_PATH } : {}),
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: { unoptimized: true },
  // One 404 for both languages: they are two root layouts (app/(en), app/fr), so the global one is the way.
  experimental: { globalNotFound: true },
};

export default nextConfig;
