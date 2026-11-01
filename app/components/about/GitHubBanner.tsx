import { AUTHOR_GITHUB } from "@/lib/author-links";

/* The banner of the author's GitHub profile (krizaka-internal#2071) — not his picture: the About page still shows him by the
   Wu-sama mark. One file per theme (the site's theme is a class on <html>, not the system's): only the active theme's is shown
   (about.css). On the first screen: not lazy, size reserved; it scales to the column, so it never overflows at 360 px. */
export function GitHubBanner({ label, alt }: { label: string; alt: string }) {
  const { url, banner } = AUTHOR_GITHUB;
  return (
    <figure className="bl-about-banner">
      <a href={url} rel="noopener me" target="_blank" aria-label={label}>
        {/* eslint-disable-next-line @next/next/no-img-element -- an SVG from the blog's CDN, drawn at its own size */}
        <img
          className="bl-about-banner-dark"
          src={banner.dark}
          alt={alt}
          width={banner.width}
          height={banner.height}
          decoding="async"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- the same banner, light */}
        <img
          className="bl-about-banner-light"
          src={banner.light}
          alt={alt}
          width={banner.width}
          height={banner.height}
          decoding="async"
        />
      </a>
    </figure>
  );
}
