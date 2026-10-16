/* The Open Graph image of a post (and of the site): 1200×630, drawn at build with next/og. Colours are the Krizaka dark
   theme's values (@krizaka/tokens `values.dark` — an image has no CSS variables), the mark is @krizaka/ui's KrizakaLogo
   rendered still by scripts/gen-favicon.mjs, the face Plus Jakarta Sans from @krizaka/fonts. Both themes considered: the card is the ink theme
   (what a dark feed shows), framed by a lighter border and an accent rule so it still reads as a card on a white feed. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { values } from "@krizaka/tokens";
import { getDictionary, type Locale } from "./i18n";
import { hslToCss } from "./color.ts";

const font = (name: string) => readFileSync(join(process.cwd(), "node_modules/@krizaka/fonts/files/native", name));

const ink = values.dark;
const c = {
  surface: hslToCss(ink.surface0),
  raised: hslToCss(ink.surface1),
  text: hslToCss(ink.textPrimary),
  muted: hslToCss(ink.textSecondary),
  accent: hslToCss(ink.accent),
  accentText: hslToCss(ink.accentText),
  border: hslToCss(ink.borderStrong),
  deep: hslToCss(ink.brandGradientFrom),
};

/** The Krizaka mark (KrizakaLogo of @krizaka/ui, still, on the ink theme), rendered by scripts/gen-favicon.mjs before the build. */
const markDataUrl = () => `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), ".cache/og-mark.svg")).toString("base64")}`;

export async function ogImage(locale: Locale, title?: string, tags: string[] = []) {
  const t = getDictionary(locale);
  const heading = title ?? t.site.tagline;
  const size = heading.length > 90 ? 54 : heading.length > 60 ? 62 : 72;
  const names = t.tags.names as Record<string, string>;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", padding: 20, background: c.border }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px", borderRadius: 28, background: `linear-gradient(140deg, ${c.surface} 0%, ${c.raised} 55%, ${c.deep} 100%)`, color: c.text, fontFamily: "Plus Jakarta Sans" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <img src={markDataUrl()} width={72} height={72} alt="" />
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: c.text }}>{t.site.name}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ width: 96, height: 6, borderRadius: 3, background: c.accent }} />
            <div style={{ display: "flex", fontSize: size, lineHeight: 1.08, fontWeight: 800, letterSpacing: -2, maxWidth: 1000 }}>{heading}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: c.muted }}>
            <div style={{ display: "flex", gap: 14 }}>
              {tags.slice(0, 3).map((tag) => (
                <div key={tag} style={{ display: "flex", padding: "6px 16px", borderRadius: 999, border: `2px solid ${c.border}`, color: c.accentText }}>
                  {names[tag] ?? tag}
                </div>
              ))}
            </div>
            <div style={{ display: "flex" }}>blog.krizaka.com</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: "Plus Jakarta Sans", data: font("PlusJakartaSans-ExtraBold.ttf"), weight: 800 }, { name: "Plus Jakarta Sans", data: font("PlusJakartaSans-Bold.ttf"), weight: 700 }] },
  );
}
