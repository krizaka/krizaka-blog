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
import { mediaOf, hasMedia } from "./media";
import { OG_HEIGHT, OG_WIDTH, WORD_BANDS, brightEnd, veilFor, veilGradient, widestSource } from "./og-cover.ts";

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
const markDataUrl = () =>
  `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), ".cache/og-mark.svg")).toString("base64")}`;

/** The post's cover, cropped to the card (1200×630) and turned into a JPEG data URL the renderer reads (it does not read WebP),
    with the veil its words need: each band that carries words is measured (krizaka-internal#4502).
    Null when the post has no cover or the file cannot be fetched: the card then keeps its plain ink background. */
async function coverOf(coverId?: string): Promise<{ url: string; veil: string } | null> {
  if (!coverId || !hasMedia(coverId)) return null;
  try {
    const res = await fetch(widestSource(mediaOf(coverId)));
    if (!res.ok) return null;
    const sharp = (await import("sharp")).default;
    const card = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "centre" })
      .removeAlpha()
      .toBuffer();
    const band = async (b: (typeof WORD_BANDS)[keyof typeof WORD_BANDS]) =>
      veilFor(brightEnd(new Uint8Array(await sharp(card).extract(b).raw().toBuffer()), 3));
    const jpeg = await sharp(card).jpeg({ quality: 82 }).toBuffer();
    return {
      url: `data:image/jpeg;base64,${jpeg.toString("base64")}`,
      veil: veilGradient(await band(WORD_BANDS.head), await band(WORD_BANDS.title)),
    };
  } catch {
    return null;
  }
}

export async function ogImage(locale: Locale, title?: string, tags: string[] = [], coverId?: string) {
  const t = getDictionary(locale);
  const picture = await coverOf(coverId);
  const heading = title ?? t.site.tagline;
  const size = heading.length > 90 ? 54 : heading.length > 60 ? 62 : 72;
  const names = t.tags.names as Record<string, string>;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", padding: 20, background: c.border }}>
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          borderRadius: 28,
          overflow: "hidden",
          background: `linear-gradient(140deg, ${c.surface} 0%, ${c.raised} 55%, ${c.deep} 100%)`,
          color: c.text,
          fontFamily: "Plus Jakarta Sans",
        }}
      >
        {picture ? (
          <>
            <img
              src={picture.url}
              width={1160}
              height={590}
              alt=""
              style={{ position: "absolute", top: -56, left: -64, width: 1160, height: 590, objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                top: -56,
                left: -64,
                width: 1160,
                height: 590,
                display: "flex",
                background: picture.veil,
              }}
            />
          </>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={markDataUrl()} width={72} height={72} alt="" />
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 700,
              color: c.text,
              textShadow: "0 2px 10px rgba(8, 12, 20, 0.55)",
            }}
          >
            {t.site.name}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ width: 96, height: 6, borderRadius: 3, background: c.accent }} />
          <div
            style={{
              display: "flex",
              fontSize: size,
              lineHeight: 1.08,
              fontWeight: 800,
              letterSpacing: -2,
              maxWidth: 1000,
              textShadow: "0 2px 14px rgba(8, 12, 20, 0.55)",
            }}
          >
            {heading}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            color: c.muted,
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            {tags.slice(0, 3).map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  padding: "6px 16px",
                  borderRadius: 999,
                  border: `2px solid ${c.border}`,
                  color: c.accentText,
                }}
              >
                {names[tag] ?? tag}
              </div>
            ))}
          </div>
          <div style={{ display: "flex" }}>blog.krizaka.com</div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Plus Jakarta Sans", data: font("PlusJakartaSans-ExtraBold.ttf"), weight: 800 },
        { name: "Plus Jakarta Sans", data: font("PlusJakartaSans-Bold.ttf"), weight: 700 },
      ],
    },
  );
}
