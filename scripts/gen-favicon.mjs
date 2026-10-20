#!/usr/bin/env node
/* Renders the OG mark only. The tab, apple-touch and manifest icons are not drawn here: scripts/sync-brand-icons.mjs
   copies them from the brand CDN. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KrizakaLogo } from "@krizaka/ui";

/* The mark of the Open Graph images (lib/og.tsx): the same KrizakaLogo, still, on the ink theme — its colours resolved to
   the values of @krizaka/tokens' dark theme, as #rrggbb (the image renderer reads neither CSS variables nor hsl()).
   Written to the git-ignored .cache/og-mark.svg. */
import { values } from "@krizaka/tokens";

export function hslToCss(hsl) {
  const m = hsl.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*(?:\/\s*([\d.]+))?\s*\)/);
  if (!m) return hsl;
  const [h, s, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  const [r, g, b] = [f(0), f(8), f(4)];
  return m[4] ? `rgba(${r}, ${g}, ${b}, ${m[4]})` : `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
const ink = values.dark;
const mark = renderToStaticMarkup(createElement(KrizakaLogo, { size: 96, animated: false }))
  .replace(/<style>[\s\S]*?<\/style>/, "")
  .replace(/var\(--kz-text-secondary[^"]*\)/g, hslToCss(ink.textSecondary))
  .replace(/var\(--kz-text-primary[^"]*\)/g, hslToCss(ink.textPrimary))
  .replace(/var\(--kz-border-[a-z]+[^"]*\)/g, hslToCss(ink.textSecondary));
const markOut = join(dirname(fileURLToPath(import.meta.url)), "..", ".cache", "og-mark.svg");
mkdirSync(dirname(markOut), { recursive: true });
writeFileSync(markOut, mark);
console.log(`og mark: ${mark.length} bytes`);
