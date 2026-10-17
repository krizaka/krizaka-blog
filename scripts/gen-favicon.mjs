#!/usr/bin/env node
/* The favicon is the Krizaka mark of the published @krizaka/ui (KrizakaLogo), rendered once at build — never a copy of it
   in this repository. Writes the git-ignored public/favicon.svg. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KrizakaLogo } from "@krizaka/ui";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "favicon.svg");

// The mark draws with tokens (--kz-text-*, --kz-border-*): a favicon has no stylesheet, so it carries their values for the
// browser's light and dark tab bars, and its viewBox is cropped to the mark.
const tokens = (primary, secondary, border, strong) =>
  `--kz-text-primary: ${primary}; --kz-text-secondary: ${secondary}; --kz-border-default: ${border}; --kz-border-strong: ${strong};`;
const style =
  `svg { ${tokens("hsl(240 6% 10%)", "hsl(240 4% 41%)", "hsl(240 6% 0% / .10)", "hsl(240 6% 0% / .16)")} }\n` +
  `@media (prefers-color-scheme: dark) { svg { ${tokens("hsl(0 0% 96%)", "hsl(240 4% 64%)", "hsl(0 0% 100% / .10)", "hsl(0 0% 100% / .16)")} } }\n`;
const svg = renderToStaticMarkup(createElement(KrizakaLogo, { size: 64 }))
  .replace(' aria-hidden="true"', "")
  .replace('viewBox="0 0 400 400"', 'viewBox="86 82 228 228"')
  .replace("<style>\n", `<style>\n${style}`);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log(`favicon: ${svg.length} bytes`);

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
