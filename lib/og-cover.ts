/* The picture behind a post's Open Graph card: its cover, the widest file of the library (a clip's poster), cropped to the card. */
export type CoverSource = { kind: "image"; srcs: { w: number; url: string }[] } | { kind: "video"; poster: string };

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** The URL of the widest file of a cover: the picture itself, or a clip's poster. */
export function widestSource(m: CoverSource): string {
  if (m.kind === "video") return m.poster;
  return [...m.srcs].sort((a, b) => b.w - a.w)[0].url;
}

/* The veil behind the card's white words (krizaka-internal#4502). A fixed light veil left white words on a light cover (the
   series is ink and watercolor on white paper) at less than 2:1. The veil is measured instead: in each band that carries words,
   the bright end of the cover (its 90th percentile of relative luminance) is darkened by the veil until white reaches 3:1, WCAG
   AA for large text: every word over the picture is large (the title 54 to 72 px ExtraBold, the blog's name 32 px Bold; the tags sit
   on the foot's 0.88 veil). A dark cover keeps the light veil of before. */
export const VEIL_RGB = [8, 12, 20] as const;
export const VEIL_MIN = 0.2;
/** WCAG 2 AA for large text (at least 18.66 px bold). */
export const LARGE_TEXT_CONTRAST = 3;

const linear = (v: number): number => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** The relative luminance of an sRGB colour (WCAG 2). */
export const luminanceOf = ([r, g, b]: readonly number[]): number =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/** The bright end of raw RGB(A) pixels: the luminance below which `q` of them fall. */
export function brightEnd(raw: Uint8Array, channels: number, q = 0.9): number {
  const values: number[] = [];
  for (let i = 0; i + 2 < raw.length; i += channels) values.push(luminanceOf([raw[i], raw[i + 1], raw[i + 2]]));
  if (!values.length) return 0;
  values.sort((a, b) => a - b);
  return values[Math.min(values.length - 1, Math.floor(q * values.length))];
}

/** The veil's opacity over a band whose bright end is `luminance`: white on the veiled band reaches 3:1, rounded up. */
export function veilFor(luminance: number): number {
  const dark = luminanceOf(VEIL_RGB);
  const most = 1.05 / LARGE_TEXT_CONTRAST - 0.05;
  if (luminance <= most) return VEIL_MIN;
  const needed = (luminance - most) / (luminance - dark);
  return Math.max(VEIL_MIN, Math.ceil(needed * 100) / 100);
}

/** The bands of the 1200×630 card that carry words: the mark and the blog's name, then the title. */
export const WORD_BANDS = {
  head: { left: 40, top: 40, width: 560, height: 110 },
  title: { left: 40, top: 150, width: 1080, height: 330 },
} as const;

/** The card's veil, top to bottom: the head band's, the title band's, then the foot (the tags), never lighter than before. */
export const veilGradient = (head: number, title: number): string => {
  const c = VEIL_RGB.join(", ");
  return `linear-gradient(180deg, rgba(${c}, ${Math.max(head, 0.35)}) 0%, rgba(${c}, ${Math.max(head, 0.35)}) 18%, rgba(${c}, ${title}) 32%, rgba(${c}, ${title}) 76%, rgba(${c}, ${Math.max(title, 0.88)}) 100%)`;
};
