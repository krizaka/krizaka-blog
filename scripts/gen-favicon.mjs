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
