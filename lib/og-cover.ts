/* The picture behind a post's Open Graph card: its cover, the widest file of the library (a clip's poster), cropped to the card. */
export type CoverSource = { kind: "image"; srcs: { w: number; url: string }[] } | { kind: "video"; poster: string };

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** The URL of the widest file of a cover: the picture itself, or a clip's poster. */
export function widestSource(m: CoverSource): string {
  if (m.kind === "video") return m.poster;
  return [...m.srcs].sort((a, b) => b.w - a.w)[0].url;
}
