import "./palette.css";

import type { CSSProperties } from "react";

import type { Locale } from "@/lib/i18n";
import { PALETTE_BRANDS, PALETTE_THEMES, type PaletteSwatch, paletteSwatches } from "@/lib/palette";

/* <Palette label/> in a post: each product's accent, dark and light, as the tokens resolve it (lib/palette.ts). Each half
   is painted with the theme's own page colour, so the swatch is the real pair, whatever the reader's theme; the hex values
   and the WCAG ratios are written under it as text. The colours are data from @krizaka/tokens, never typed here. */

/** The words of the figure, given by the post (MDX props are strings). */
export type PaletteWords = {
  dark: string;
  light: string;
  fill: string;
  text: string;
  fillRatio: string;
  textRatio: string;
};

const NAMES: Record<(typeof PALETTE_BRANDS)[number], string> = {
  krizaka: "Krizaka",
  verikora: "Verikora",
  folioviv: "Folioviv",
  sovkora: "Sovkora",
};

function Half({ s, words, ratio }: Readonly<{ s: PaletteSwatch; words: PaletteWords; ratio: (n: number) => string }>) {
  const page: CSSProperties = { background: s.page };
  const fill: CSSProperties = { background: s.accent, color: s.onAccent };
  const text: CSSProperties = { color: s.accentText };
  return (
    <div className="bl-palette-half">
      <div className="bl-palette-paint" style={page} aria-hidden="true">
        <span className="bl-palette-fill" style={fill}>
          {words.fill}
        </span>
        <span className="bl-palette-text" style={text}>
          {words.text}
        </span>
      </div>
      <dl className="bl-palette-facts">
        <dt>{words[s.theme]}</dt>
        <dd>
          <code>{s.accent}</code>
          <span>
            {words.fillRatio} {ratio(s.fill)}:1
          </span>
        </dd>
        <dd>
          <code>{s.accentText}</code>
          <span>
            {words.textRatio} {ratio(s.text)}:1
          </span>
        </dd>
      </dl>
    </div>
  );
}

export function Palette({ label, locale, words }: Readonly<{ label: string; locale: Locale; words: PaletteWords }>) {
  const swatches = paletteSwatches();
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const ratio = (n: number) => number.format(n);
  return (
    <figure className="bl-palette" data-reveal>
      <ul className="bl-palette-grid">
        {PALETTE_BRANDS.map((brand) => (
          <li key={brand} className="bl-palette-brand">
            <p className="bl-palette-name">{NAMES[brand]}</p>
            {PALETTE_THEMES.map((theme) => {
              const s = swatches.find((x) => x.brand === brand && x.theme === theme);
              return s ? <Half key={theme} s={s} words={words} ratio={ratio} /> : null;
            })}
          </li>
        ))}
      </ul>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
