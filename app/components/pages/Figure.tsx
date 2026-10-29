import { blurUrl } from "@/lib/blur";
import { mediaOf } from "@/lib/media";
import type { Locale } from "@/lib/i18n";
import { Provenance } from "./Provenance";
import { LazyImg } from "./LazyImg";

/* An image of a post: responsive (`srcset` from the sizes on the CDN), with a blur placeholder behind it (a ~400-byte webp
   inlined as the background, so the frame is painted before the file arrives), fetched near the window (LazyImg), size-reserved (no layout shift),
   and the provenance of the result under it. */
export function Figure({
  id,
  alt,
  caption,
  locale,
  priority = false,
}: {
  id: string;
  alt: string;
  caption?: React.ReactNode;
  locale: Locale;
  priority?: boolean;
}) {
  const m = mediaOf(id);
  if (m.kind !== "image") throw new Error(`media "${id}" is a clip, use <Clip>`);
  const srcs = [...m.srcs].sort((a, b) => a.w - b.w);
  const best = srcs[srcs.length - 1];
  return (
    <figure className="bl-figure">
      <LazyImg
        className="bl-img"
        src={(srcs.find((s) => s.w >= 960) ?? best).url}
        srcSet={srcs.map((s) => `${s.url} ${s.w}w`).join(", ")}
        sizes="(min-width: 48rem) 704px, calc(100vw - 32px)"
        width={m.width}
        height={m.height}
        alt={alt}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        style={{ backgroundImage: blurUrl(m.blur) }}
      />
      {caption && <figcaption>{caption}</figcaption>}
      {m.made && <Provenance made={m.made} locale={locale} />}
    </figure>
  );
}
