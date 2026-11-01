// The founder's signature at the end of his chapters (founder 2026-10-31): one block per chapter he wrote, after the text and
// before the downloads; his line in both languages; the pen strokes drawn in code (no image, no font file), drawn once by the
// motion system and still under reduced motion; colours from the tokens only.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import matter from "gray-matter";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const count = (s, re) => (s.match(re) ?? []).length;
const page = read("app/components/pages/ChapterPage.tsx");
const sign = read("app/components/pages/Signature.tsx");
const css = read("app/globals.css");

test("a chapter page renders the signature block once, only for a chapter the founder wrote, before the downloads", () => {
  assert.equal(count(page, /<Signature\b/g), 1);
  assert.match(page, /\{signs\(chapter\.author\) && \(\s*<Section[^>]*>\s*<Signature locale=\{locale\} \/>/);
  assert.ok(page.indexOf("<Signature") > page.indexOf("bl-post-body"), "after the text");
  assert.ok(page.indexOf("<Signature") < page.indexOf("<TakeStory"), "before the downloads");
  assert.match(read("lib/author-picture.ts"), /SIGNING_AUTHORS = \["oussama"\]/);
  const chapters = readdirSync(new URL("../content/chapters", import.meta.url)).filter((f) => f.endsWith(".mdx"));
  const founders = chapters.filter((f) => String(matter(read(`content/chapters/${f}`)).data.author) === "oussama");
  assert.ok(founders.length > 0, "the founder signs his chapters");
});

test("the signature is drawn in code, one landmark, his line in both languages", () => {
  assert.equal(count(sign, /<aside\b/g), 1);
  assert.match(sign, /data-reveal="soft"/, "drawn once, when it arrives (the motion system)");
  assert.match(sign, /<svg[^>]*role="img"[^>]*aria-label=\{s\.name\}/);
  assert.match(sign, /pathLength=\{1\}/);
  assert.doesNotMatch(sign, /<(img|Image)\b|\.woff|https?:\/\//);
  for (const l of ["en", "fr"]) {
    const m = JSON.parse(read(`messages/${l}.json`)).chapter.signature;
    assert.equal(m.name, "Wu-sama");
    assert.equal(m.fullName, "Oussama Abid");
    assert.ok(m.quote.length > 20 && m.quote.length <= 120, `${l}: one short line`);
    assert.doesNotMatch(
      m.quote,
      /faible|weak/i,
      `${l}: says « we build, we don't compete » without looking down on anyone`,
    );
    assert.ok(m.label);
  }
  // Guard (krizaka-internal#2084): the founder's own words, not a polite paraphrase.
  const quote = (l) => JSON.parse(read(`messages/${l}.json`)).chapter.signature.quote;
  assert.equal(quote("fr"), "On pose nos briques à l'encre bleue, et c'est le temps qui signe.");
  assert.equal(quote("en"), "We lay our bricks in blue ink, and time does the signing.");
});

test("the strokes draw once and stay still under reduced motion; ink and accent from the tokens", () => {
  const block = css.slice(css.indexOf("/* Signature"));
  assert.match(block, /\.bl-sign\.kz-in \.bl-sign-svg path \{[^}]*animation: bl-sign-draw[^}]*both;/);
  assert.match(
    block,
    /prefers-reduced-motion: reduce\)\s*\{\s*\.bl-sign\.kz-in \.bl-sign-svg path \{\s*animation: none;/,
  );
  assert.doesNotMatch(block, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i, "no hard-coded colour");
  assert.match(block, /stroke: currentColor/);
  assert.match(block, /stroke: var\(--kz-accent\)/);
});

test("the About page may render the signature too, once, after the sheet, with the same component and no quote of its own", () => {
  const about = read("app/components/about/AboutPage.tsx");
  assert.equal(count(about, /<Signature\b/g), 1);
  assert.match(about, /import \{ Signature \} from "\.\.\/pages\/Signature"/);
  assert.ok(about.indexOf("<Signature") > about.indexOf("</article>"), "after the sheet");
  assert.doesNotMatch(
    about,
    /chapter\.signature|On pose nos briques/,
    "the line is read inside Signature, from the messages",
  );
  // The only places that render it: the founder's chapters and the About page.
  const users = ["app/components/pages/ChapterPage.tsx", "app/components/about/AboutPage.tsx"];
  for (const f of users) assert.equal(count(read(f), /<Signature\b/g), 1, f);
});

test("the About line is typed by CSS: real text in the DOM, animated copy aria-hidden, reduced motion shows it at once", () => {
  const typed = read("app/components/about/TypedLine.tsx");
  const about = read("app/components/about/AboutPage.tsx");
  const aboutCss = read("app/components/about/about.css");
  assert.match(about, /<TypedLine className="bl-sheet-line" text=\{a\.line\} \/>/);
  assert.match(typed, /className="bl-typed-real">\{text\}</, "the real text stays in the DOM");
  assert.match(typed, /className="bl-typed" aria-hidden="true"/);
  assert.doesNotMatch(typed, /use client|useEffect|requestAnimationFrame|setInterval/);
  const block = aboutCss.slice(aboutCss.indexOf("/* Typed line"));
  assert.match(block, /\.bl-typed-ch \{[^}]*animation: bl-type-in[^}]*visibility: hidden;/s);
  assert.match(
    block,
    /prefers-reduced-motion: reduce\)\s*\{\s*\.bl-typed-ch \{\s*animation: none;\s*visibility: visible;/,
  );
  assert.doesNotMatch(block, /display: none/, "letters are laid out from the start: no layout shift");
});

test("the About header is a compact banner, in the size range of the other page headers (token type scale, no poster)", () => {
  const css = read("app/components/about/about.css");
  const rule = (sel) => css.match(new RegExp(`${sel.replace(/[\\.]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? "";
  assert.match(
    rule(".bl-sheet-name"),
    /font-size: var\(--kz-type-display-md-size\)/,
    "the name is a display size of the scale",
  );
  assert.doesNotMatch(css, /min-height|clamp\(2\.5rem, 8vw/, "no forced height, no 4.75 rem name");
  // Desktop padding bounds the banner at 1280 px to about 200 px (measured 2026-11-01), inside the 200-260 px range.
  const desktop = css.match(/@media \(min-width: 48rem\) \{\s*\.bl-sheet \{([^}]*)\}/)?.[1] ?? "";
  const pad = desktop.match(/padding-block: ([\d.]+)rem ([\d.]+)rem/);
  assert.ok(pad && Number(pad[1]) + Number(pad[2]) <= 5, "banner padding stays compact");
  assert.match(
    read("app/components/about/AboutPage.tsx"),
    /bl-about-body/,
    "the bio is in the normal reading column below",
  );
});
