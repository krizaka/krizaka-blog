import { preload } from "react-dom";
import type { ComponentProps } from "react";
import type { Cover } from "@/lib/media";
import { LazyImg } from "./LazyImg";

/* A cover, in the sizes it will be shown at: a <picture> that offers the AVIF renditions first and the WebP ones to the rest
   (`srcset` + `sizes`, so a phone fetches ~25 KB, not the 1024 px file). The page's LCP cover (`priority`) is fetched at once,
   at high priority, and preloaded in the head with the same candidates (the AVIF set, for the browsers that read AVIF — the others
   skip the preload and fetch the WebP from the <img>); every other cover waits until it is near the window (LazyImg). */
export function CoverImage({
  cover,
  sizes,
  priority = false,
  ...img
}: { cover: Cover; sizes: string; priority?: boolean } & Omit<
  ComponentProps<"img">,
  "src" | "srcSet" | "sizes" | "width" | "height"
>) {
  const common = {
    src: cover.src,
    srcSet: cover.srcSet,
    sizes,
    width: cover.width,
    height: cover.height,
    decoding: "async" as const,
  };
  if (!priority)
    return <LazyImg {...img} {...common} avifSrcSet={cover.avifSrcSet} loading="lazy" fetchPriority="low" />;
  if (cover.avifSrcSet)
    preload(cover.src, {
      as: "image",
      imageSrcSet: cover.avifSrcSet,
      imageSizes: sizes,
      type: "image/avif",
      fetchPriority: "high",
    });
  else preload(cover.src, { as: "image", imageSrcSet: cover.srcSet, imageSizes: sizes, fetchPriority: "high" });
  const el = <img {...img} {...common} loading="eager" fetchPriority="high" />;
  return cover.avifSrcSet ? (
    <picture>
      <source type="image/avif" srcSet={cover.avifSrcSet} sizes={sizes} />
      {el}
    </picture>
  ) : (
    el
  );
}
