"use client";

/* An image that is fetched when it comes within half a screen of the window — not at the page's first request, as the
   browser's own `loading="lazy"` does for anything in the first ~2,500 px. The first picture of a page then has the line to
   itself. Before that the frame shows the blur placeholder (its background) at its reserved size; without script the
   <noscript> copy loads as usual. */
import { useEffect, useRef, useState, type ComponentProps } from "react";

export function LazyImg({ src, srcSet, avifSrcSet, ...props }: ComponentProps<"img"> & { avifSrcSet?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setNear(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: "50% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  /* With an AVIF set the image sits in a <picture>: the source gets its srcset at the same moment as the <img>. */
  const sizes = props.sizes;
  return (
    <>
      {avifSrcSet ? (
        <picture>
          <source type="image/avif" srcSet={near ? avifSrcSet : undefined} sizes={sizes} />
          <img ref={ref} {...props} src={near ? src : undefined} srcSet={near ? srcSet : undefined} />
        </picture>
      ) : (
        <img ref={ref} {...props} src={near ? src : undefined} srcSet={near ? srcSet : undefined} />
      )}
      <noscript>
        {avifSrcSet ? (
          <picture>
            <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
            <img {...props} src={src} srcSet={srcSet} />
          </picture>
        ) : (
          <img {...props} src={src} srcSet={srcSet} />
        )}
      </noscript>
    </>
  );
}
