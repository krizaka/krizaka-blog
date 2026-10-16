/* The Open Graph image of a post (and of the site): 1200×630, drawn at build with next/og in the Krizaka ink and blue,
   Plus Jakarta Sans (the files of @krizaka/fonts). One per post and language, written to out/ as a static file. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getDictionary, type Locale } from "./i18n";

const font = (name: string) => readFileSync(join(process.cwd(), "node_modules/@krizaka/fonts/files/native", name));

export async function ogImage(locale: Locale, title?: string, tags: string[] = []) {
  const t = getDictionary(locale);
  const heading = title ?? t.site.tagline;
  const size = heading.length > 90 ? 52 : heading.length > 55 ? 62 : 74;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #0d0d0f 0%, #11182b 60%, #16306b 100%)", color: "#f5f5f7", fontFamily: "Plus Jakarta Sans" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700, color: "#7aa7ff" }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: "#4c8dff", transform: "rotate(45deg)" }} />
          {t.site.name}
        </div>
        <div style={{ display: "flex", fontSize: size, lineHeight: 1.1, fontWeight: 800, letterSpacing: -2 }}>{heading}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#a1a1aa" }}>
          <div style={{ display: "flex" }}>{tags.slice(0, 3).join(" · ")}</div>
          <div style={{ display: "flex" }}>blog.krizaka.com</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: "Plus Jakarta Sans", data: font("PlusJakartaSans-ExtraBold.ttf"), weight: 800 }, { name: "Plus Jakarta Sans", data: font("PlusJakartaSans-Bold.ttf"), weight: 700 }] },
  );
}
