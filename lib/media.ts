/* The blog's media library: every image and clip a post shows, by id. The files live on the media CDN (Bunny
   `krizaka-assets`, prefix `blog/`) — `lib/media.json` holds their URLs, a tiny blur placeholder, and the provenance of each
   result (model, prompt, seed, machine, time, cost, Orazaka run id) read from the Orazaka records that made it
   (`orazaka-web-client` gallery.ts · gallery-clips.ts · model-compare.ts, `orazaka` docs/measurements/runs.json).
   A figure of a post is `<Figure id="…" alt="…" />`; a clip is `<Clip id="…" alt="…" />`. Nothing here is typed by hand. */
import data from "./media.json";
import { BLUR } from "./blur";

export type Made = {
  model: string;
  licence?: string;
  engine?: string;
  /** The machine it ran on; absent for a hosted model (the provider is in `engine`). */
  machine?: string | null;
  via?: string;
  studio?: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: string;
  size?: string;
  fps?: number;
  durationSeconds?: number;
  /** Command to file, in seconds; absent or null when the run was interrupted and the figure would mislead. */
  seconds?: number | null;
  costUsd?: number | null;
  runId?: string;
  sound?: string;
  /** Said when the result was not made through an Orazaka run. */
  note?: string;
  source?: string;
};
/** The sizes a picture is sold in, per format (scripts/gen-renditions.mjs): AVIF for the browsers that read it, WebP for the rest. */
export type Renditions = { avif: { w: number; url: string }[]; webp: { w: number; url: string }[] };
/** `style: "diagram"`: a schema drawn from code (no provenance); the home shows at most one as a cover (scripts/content-rules.mjs). */
export type ImageMedia = {
  kind: "image";
  style?: "diagram";
  width: number;
  height: number;
  blur: string;
  srcs: { w: number; url: string }[];
  renditions?: Renditions;
  made?: Made;
  /** An annotated capture (<Annotated>): the boxes it was drawn with (lib/figures.ts marksKey), checked against the legend. */
  marks?: string;
};
export type VideoMedia = {
  kind: "video";
  width: number;
  height: number;
  blur: string;
  poster: string;
  mp4: string;
  webm: string;
  bytes?: { mp4: number; webm: number };
  renditions?: Renditions;
  made?: Made;
};
export type Media = ImageMedia | VideoMedia;

/** The library as read, with every blur placeholder checked to be a webp data URL (it ends up in a CSS `url()`). */
const LIBRARY: Record<string, Media> = Object.fromEntries(
  Object.entries(data as unknown as Record<string, Media>).map(([id, m]) => [
    id,
    { ...m, blur: BLUR.test(m.blur) ? m.blur : "" },
  ]),
);

export const mediaIds = (): string[] => Object.keys(LIBRARY);
export const hasMedia = (id: string): boolean => id in LIBRARY;
export function mediaOf(id: string): Media {
  const m = LIBRARY[id];
  if (!m) throw new Error(`lib/media.json has no media "${id}"`);
  return m;
}
export type Cover = { src: string; srcSet?: string; avifSrcSet?: string; width: number; height: number; blur: string };
const set = (l: { w: number; url: string }[]) => l.map((s) => `${s.url} ${s.w}w`).join(", ");
/** The image a card or a hero shows for a media id: the picture itself, or a clip's poster. With renditions, `srcSet` is the WebP set,
    `avifSrcSet` the AVIF one (a <picture> offers it first) and `src` the WebP at 768 px (the fallback); without, the library's own sizes. */
export function coverOf(id: string): Cover {
  const m = mediaOf(id);
  const r = m.renditions;
  if (r && r.webp.length > 0) {
    const webp = [...r.webp].sort((a, b) => a.w - b.w);
    const src = (webp.find((s) => s.w >= 768) ?? webp[webp.length - 1]).url;
    return {
      src,
      srcSet: set(webp),
      avifSrcSet: r.avif.length ? set([...r.avif].sort((a, b) => a.w - b.w)) : undefined,
      width: m.width,
      height: m.height,
      blur: m.blur,
    };
  }
  if (m.kind === "video") return { src: m.poster, width: m.width, height: m.height, blur: m.blur };
  const sorted = [...m.srcs].sort((a, b) => a.w - b.w);
  return {
    src: (sorted.find((s) => s.w >= 960) ?? sorted[sorted.length - 1]).url,
    srcSet: set(sorted),
    width: m.width,
    height: m.height,
    blur: m.blur,
  };
}
