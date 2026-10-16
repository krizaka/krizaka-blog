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
export type ImageMedia = { kind: "image"; width: number; height: number; blur: string; srcs: { w: number; url: string }[]; made?: Made };
export type VideoMedia = { kind: "video"; width: number; height: number; blur: string; poster: string; mp4: string; webm: string; bytes?: { mp4: number; webm: number }; made?: Made };
export type Media = ImageMedia | VideoMedia;

/** The library as read, with every blur placeholder checked to be a webp data URL (it ends up in a CSS `url()`). */
const LIBRARY: Record<string, Media> = Object.fromEntries(Object.entries(data as unknown as Record<string, Media>).map(([id, m]) => [id, { ...m, blur: BLUR.test(m.blur) ? m.blur : "" }]));

export const mediaIds = (): string[] => Object.keys(LIBRARY);
export const hasMedia = (id: string): boolean => id in LIBRARY;
export function mediaOf(id: string): Media {
  const m = LIBRARY[id];
  if (!m) throw new Error(`lib/media.json has no media "${id}"`);
  return m;
}
/** The image a card or a hero shows for a media id: the picture itself, or a clip's poster. */
export function coverOf(id: string): { src: string; srcSet?: string; width: number; height: number; blur: string } {
  const m = mediaOf(id);
  if (m.kind === "video") return { src: m.poster, width: m.width, height: m.height, blur: m.blur };
  const sorted = [...m.srcs].sort((a, b) => a.w - b.w);
  return { src: (sorted.find((s) => s.w >= 960) ?? sorted[sorted.length - 1]).url, srcSet: sorted.map((s) => `${s.url} ${s.w}w`).join(", "), width: m.width, height: m.height, blur: m.blur };
}
