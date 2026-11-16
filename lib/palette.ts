import { type BrandId, brands, themes } from "@krizaka/tokens/native";

/* The products' palettes as the tokens resolve them (<Palette/> in a post): nothing typed here, every colour is read from
   @krizaka/tokens (the brand files compiled into `native`), and every ratio is the WCAG 2 formula on those values. */

export const PALETTE_BRANDS = ["krizaka", "verikora", "folioviv", "sovkora"] as const satisfies readonly BrandId[];
export const PALETTE_THEMES = ["dark", "light"] as const;
export type PaletteTheme = (typeof PALETTE_THEMES)[number];

/** One brand in one theme: the fill of a primary button and its text, the accent as text on the page, both ratios. */
export type PaletteSwatch = {
  brand: BrandId;
  theme: PaletteTheme;
  accent: string;
  onAccent: string;
  accentText: string;
  page: string;
  /** on-accent over accent (the text of a filled button). */
  fill: number;
  /** accent-text over surface 0 (a link, a selected tab, on the page). */
  text: number;
};

const HEX = /^#([0-9a-f]{6})$/i;

function channel(v: number) {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** The relative luminance of a #rrggbb colour (WCAG 2.2, « relative luminance »). */
export function luminance(hex: string) {
  const m = HEX.exec(hex);
  if (!m) throw new Error(`palette: "${hex}" is not a #rrggbb colour`);
  const n = Number.parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** The contrast ratio of two #rrggbb colours, rounded down to one decimal (a 4.49 never reads as 4.5). */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.floor(((hi + 0.05) / (lo + 0.05)) * 10) / 10;
}

export function paletteSwatches(): PaletteSwatch[] {
  return PALETTE_BRANDS.flatMap((brand) =>
    PALETTE_THEMES.map((theme) => {
      const roles = brands[brand][theme];
      const page = themes[theme].surface0;
      return {
        brand,
        theme,
        accent: roles.accent,
        onAccent: roles.onAccent,
        accentText: roles.accentText,
        page,
        fill: contrast(roles.accent, roles.onAccent),
        text: contrast(roles.accentText, page),
      };
    }),
  );
}
