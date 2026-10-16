import { format, getDictionary, type Locale } from "@/lib/i18n";
import { mediaOf } from "@/lib/media";
import { ClipPlayer } from "./ClipPlayer";
import { Provenance } from "./Provenance";

/* A clip of a post, from the library: the light player, then how it was made. The sound (a music bed Orazaka made) is on the
   file; the player starts muted. */
export function Clip({ id, alt, caption, locale }: { id: string; alt: string; caption?: React.ReactNode; locale: Locale }) {
  const m = mediaOf(id);
  if (m.kind !== "video") throw new Error(`media "${id}" is an image, use <Figure>`);
  const t = getDictionary(locale).media;
  return (
    <figure className="bl-figure">
      <ClipPlayer poster={m.poster} mp4={m.mp4} webm={m.webm} width={m.width} height={m.height} blur={m.blur} label={format(t.videoLabel, { alt })} />
      <figcaption>
        {caption ?? alt}
        {m.bytes && <span className="bl-weight"> · {format(t.fileSize, { mb: (m.bytes.mp4 / 1e6).toFixed(1) })}</span>}
      </figcaption>
      {m.made && <Provenance made={m.made} locale={locale} />}
    </figure>
  );
}
