/* The look of the books (krizaka-blog#235): the Cahier on a page — Young Serif for titles, Atkinson Hyperlegible Next for the text,
   Courier Prime for the § numbers, sizes and captions, the three faces of @krizaka/fonts embedded (the book reads the same on a
   device that has none of them). Warm paper, ink, one blue. Plain ESM, no DOM: the generator (scripts/gen-downloads.mjs) and the tests share it. */
export const INK = "#1b1a17";
export const PAPER = "#f4efe3";
export const BLUE = "#2b46c4";
export const RULE = "#cfc6b2";
export const MUTED = "#5d594f";

/** The embedded faces: family, weight, file of @krizaka/fonts (latin covers French: é à ç œ « »). */
export const FACES = [
  { family: "Krizaka Text", weight: "200 800", file: "atkinson-hyperlegible-next-latin-wght.woff2" },
  { family: "Krizaka Display", weight: "400", file: "young-serif-latin-400.woff2" },
  { family: "Krizaka Mono", weight: "400", file: "courier-prime-latin-400.woff2" },
  { family: "Krizaka Mono", weight: "700", file: "courier-prime-latin-700.woff2" },
];

/** The @font-face rules, the files being looked up under `base` (a relative folder in the EPUB, a file:// folder for the PDF). */
export const fontFaces = (base) =>
  FACES.map(
    (f) =>
      `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:normal;src:url("${base}${f.file}") format("woff2");}`,
  ).join("\n");

const FAMILY = {
  text: `"Krizaka Text", "Atkinson Hyperlegible Next", Georgia, serif`,
  display: `"Krizaka Display", "Young Serif", Georgia, serif`,
  mono: `"Krizaka Mono", "Courier Prime", "Courier New", monospace`,
};

/** What the EPUB and the PDF share: the typography of the text. Sizes are relative so a reader's own setting still scales them. */
const body = (unit) => `
body { font-family: ${FAMILY.text}; color: ${INK}; line-height: 1.6; hyphens: auto; -webkit-hyphens: auto; }
h1, h2, h3 { font-weight: 400; break-after: avoid; page-break-after: avoid; }
h1 { font-family: ${FAMILY.display}; line-height: 1.15; }
h2 { font-family: ${FAMILY.text}; font-weight: 700; line-height: 1.3; }
h3 { font-family: ${FAMILY.text}; font-weight: 700; }
h2 .sec { font-family: ${FAMILY.mono}; font-weight: 700; color: ${BLUE}; font-size: .85em; margin-inline-end: .35em; white-space: nowrap; }
p.kicker { font-family: ${FAMILY.mono}; text-transform: uppercase; letter-spacing: .12em; font-size: .8${unit}; color: ${BLUE}; margin: 0 0 .4em; }
div.standfirst { font-size: 1.1${unit}; color: ${MUTED}; margin: .4em 0 1.2em; }
div.online { font-family: ${FAMILY.mono}; font-size: .8${unit}; color: ${MUTED}; border-top: 1px solid ${RULE}; padding-top: .6em; margin-top: 2em; word-break: break-all; }
figure { margin: 1.4em 0; padding: 0; text-align: center; break-inside: avoid; page-break-inside: avoid; }
figure img, img { max-width: 100%; height: auto; }
figcaption { font-family: ${FAMILY.mono}; font-size: .8${unit}; color: ${MUTED}; text-align: left; margin-top: .5em; line-height: 1.45; break-before: avoid; page-break-before: avoid; }
figcaption::before { content: "— "; color: ${BLUE}; }
div.opener-no { font-family: ${FAMILY.mono}; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; font-size: .8${unit}; color: ${BLUE}; margin: 0 0 .4em; }
div.opener-rule { width: 3em; height: .25em; background: ${BLUE}; margin: .6em 0 .9em; }
div.opener-big, div.opener-foot { display: none; }
figure.opener-pic { margin: 0 0 1.4em; }
p.figure-text { font-family: ${FAMILY.mono}; font-size: .85${unit}; border-left: 3px solid ${BLUE}; padding-left: .8em; color: ${MUTED}; }
pre, code { font-family: ${FAMILY.mono}; font-size: .85${unit}; }
pre { white-space: pre-wrap; word-wrap: break-word; overflow-wrap: anywhere; background: #ece6d6; border-left: 3px solid ${RULE}; padding: .7em .9em; break-inside: avoid; page-break-inside: avoid; }
:not(pre) > code { background: #ece6d6; padding: 0 .25em; }
blockquote { margin: 1.2em 0; padding: .1em 0 .1em 1em; border-left: 3px solid ${BLUE}; color: ${MUTED}; }
table { border-collapse: collapse; width: 100%; font-size: .9${unit}; margin: 1.2em 0; }
th, td { border-bottom: 1px solid ${RULE}; padding: .35em .5em; text-align: left; vertical-align: top; }
th { font-family: ${FAMILY.mono}; font-size: .8${unit}; text-transform: uppercase; letter-spacing: .06em; }
a { color: ${BLUE}; }
`;

/** The stylesheet of the EPUB (EPUB 3, any reader: no unit a reader ignores, no page media). */
export const epubCss = () => `${fontFaces("../fonts/")}
${body("em")}
body { margin: 0 .4em; }
h1 { font-size: 1.9em; margin: 1.2em 0 .3em; }
h2 { font-size: 1.2em; margin: 1.8em 0 .5em; }
nav#toc ol, nav ol { list-style: none; padding-left: 0; }
nav ol ol { padding-left: 1.2em; }
nav li { margin: .35em 0; }
nav a { text-decoration: none; }
nav h1 { font-size: 1.6em; }
section.cover-page, div.titlepage { text-align: center; }
`;

/** The page of the PDF's text: a lighter sheet of the notebook than the cover's (the paper is printed: `printBackground`). */
export const SHEET = "#fbf8f1";
/** The text block of an A4 page (the margins of `@page`), in mm: what the fit pass of the generator measures against. */
export const TEXT_BLOCK = { width: 170, height: 247 };

/** The stylesheet of the PDF: a story you hold (founder 2026-10-31) — A4 on the notebook's paper, a running header and footer in
    the margins (CSS paged media), every chapter opened by a page of its own (its cover full-bleed, « § NN », the title, the
    standfirst, the big number), the photos across the text block, every caption kept with its picture. */
export const printCss = ({ fontsBase, runningTitle, runningKicker }) => `${fontFaces(fontsBase)}
@page { size: A4; margin: 24mm 20mm 26mm; }
@page cover { margin: 0; }
@page opener { margin: 0; }
@page { @top-left { content: "${runningKicker}"; font: 700 7.5pt ${FAMILY.mono}; letter-spacing: .12em; text-transform: uppercase; color: ${BLUE}; }
        @top-right { content: "${runningTitle}"; font: 400 7.5pt ${FAMILY.mono}; color: ${MUTED}; }
        @bottom-center { content: counter(page); font: 700 8.5pt ${FAMILY.mono}; color: ${INK}; }
        @bottom-left { content: ""; border-top: 0.4pt solid ${RULE}; width: 100%; } }
@page cover { @top-left { content: none; } @top-right { content: none; } @bottom-center { content: none; } @bottom-left { content: none; } }
@page opener { @top-left { content: none; } @top-right { content: none; } @bottom-center { content: none; } @bottom-left { content: none; } }
@page { background: ${SHEET}; }
html, body { background-color: transparent; }
html { font-size: 10.5pt; }
${body("em")}
/* pandoc's own page styles (a 36em column with 50px of padding) never reach the book: the text block is the page's. */
body { margin: 0; padding: 0; max-width: none; }
figure { text-align: left; }
section.cover { page: cover; break-after: page; width: 210mm; height: 297mm; }
section.cover img { display: block; width: 210mm; height: 297mm; max-width: none; max-height: none; }
header#title-block-header { display: none; }
nav#TOC { break-after: page; }
nav#TOC > h1, nav#TOC > h2 { font-family: ${FAMILY.display}; font-weight: 400; font-size: 24pt; margin: 0 0 8mm; }
nav#TOC ul { list-style: none; padding-left: 0; }
nav#TOC > ul > li { margin: 3.2mm 0 1mm; font-weight: 700; }
nav#TOC ul ul { padding-left: 6mm; margin-top: 1mm; }
nav#TOC ul ul li { font-weight: 400; font-size: 9.5pt; margin: .8mm 0; }
nav#TOC a { color: ${INK}; text-decoration: none; }
section.chapter, section[id^="ch-"] { break-before: page; }
section#the-story { break-before: page; }

/* The chapter's opener: one page, no running header, the cover across the top edge to edge. */
div.opener { page: opener; break-after: page; position: relative; width: 210mm; height: 297mm; overflow: hidden; background: ${PAPER}; display: flex; flex-direction: column; }
div.opener figure.opener-pic { margin: 0; height: 156mm; flex: none; }
div.opener figure.opener-pic img { display: block; width: 210mm; height: 156mm; max-width: none; max-height: none; object-fit: cover; }
div.opener-plain { justify-content: center; }
div.opener-text { position: relative; flex: 1; display: flex; flex-direction: column; padding: 15mm 22mm 14mm; }
div.opener-plain div.opener-text { flex: none; padding-top: 70mm; }
div.opener-no { font: 700 8.5pt ${FAMILY.mono}; letter-spacing: .16em; text-transform: uppercase; color: ${BLUE}; margin: 0 0 4mm; }
div.opener h1 { font-size: 30pt; line-height: 1.08; margin: 0; max-width: 150mm; position: relative; z-index: 1; }
div.opener-rule { width: 26mm; height: 1.4mm; background: ${BLUE}; margin: 6mm 0 5mm; }
div.opener div.standfirst { font-size: 12.5pt; line-height: 1.45; color: ${MUTED}; max-width: 140mm; margin: 0; position: relative; z-index: 1; }
div.opener-big { position: absolute; right: 14mm; bottom: 8mm; font: 400 118pt/1 ${FAMILY.display}; color: ${BLUE}; opacity: .1; }
div.opener-foot { margin-top: auto; display: flex; justify-content: space-between; border-top: .4pt solid ${RULE}; padding-top: 3mm; font: 400 8pt ${FAMILY.mono}; color: ${MUTED}; position: relative; z-index: 1; }
div.opener-plain div.opener-foot { position: absolute; left: 22mm; right: 22mm; bottom: 14mm; }

h1 { font-size: 26pt; margin: 0 0 3mm; }
h2 { font-size: 13.5pt; margin: 9mm 0 3mm; }
h3 { font-size: 11.5pt; margin: 6mm 0 2mm; }
p { orphans: 3; widows: 3; margin: 0 0 3.2mm; }
div.online { break-before: avoid; }

/* The photos: across the text block, never taller than half a page and a bit, so a picture and its caption always fit together
   (the generator's fit pass also shrinks a picture to the room left on its page). Nothing is wider than the text block: Chromium
   shrinks every page to fit a wider box and clips what runs into the margins, so the only full-bleed pictures are the opener's,
   on a page without margins. */
/* Only a picture is kept whole with its caption; a figure of text (a table, a chart told as data) breaks like text. */
figure { margin: 6mm 0; break-inside: auto; page-break-inside: auto; }
figure:has(img) { break-inside: avoid; page-break-inside: avoid; }
/* A caption without its picture (a clip, told by its label in a book) is not a picture's caption: no dash (the guard reads the dash). */
figure:not(:has(img)) figcaption::before { content: none; }
pre { break-inside: auto; page-break-inside: auto; }
tr { break-inside: avoid; }
figure img { display: block; margin: 0 auto; width: auto; max-width: 100%; max-height: 128mm; height: auto; }
figure figcaption { margin-top: 2.2mm; }
`;

const COVER_BASE = (fontsBase) => `${fontFaces(fontsBase)}
*{box-sizing:border-box;margin:0}
html,body{width:100%;height:100%}
body{background:${PAPER};color:${INK};font-family:${FAMILY.text};position:relative;overflow:hidden}
.frame{position:absolute;inset:4.2%;border:2px solid ${INK};display:flex;flex-direction:column;justify-content:space-between;padding:6%}
.top{display:flex;justify-content:space-between;align-items:baseline;font:700 1.9vw ${FAMILY.mono};letter-spacing:.2em;text-transform:uppercase}
.top b{color:${BLUE}}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center;gap:3.4vw}
.kicker{font:700 2.1vw ${FAMILY.mono};letter-spacing:.14em;text-transform:uppercase;color:${BLUE}}
.title{font:400 8.4vw/1.08 ${FAMILY.display}}
.rule{width:14%;height:.7vw;background:${BLUE}}
.lede{font:400 2.6vw/1.4 ${FAMILY.text};color:${MUTED};max-width:80%}
.pic{width:100%;aspect-ratio:3/2;background-size:cover;background-position:center;border:2px solid ${INK}}
.foot{display:flex;justify-content:space-between;font:400 1.8vw ${FAMILY.mono};color:${MUTED}}
.sect{position:absolute;right:7%;bottom:12%;font:400 30vw/1 ${FAMILY.display};color:${BLUE};opacity:.1;pointer-events:none}
`;

/** The cover, as an HTML page drawn at the size it is screenshot (an A4 page, or the 2:3 of an e-book). `image` is a file URL or none. */
export const coverHtml = ({ lang, kicker, title, lede, author, image, fontsBase, label }) => {
  const e = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>${COVER_BASE(fontsBase)}</style><body>
<div class="sect" aria-hidden="true">§</div>
<div class="frame">
<div class="top"><span>Krizaka</span><b>${e(label)}</b></div>
<div class="mid">${image ? `<div class="pic" style="background-image:url('${image}')"></div>` : ""}<div class="kicker">${e(kicker)}</div><div class="title">${e(title)}</div><div class="rule"></div>${lede ? `<div class="lede">${e(lede)}</div>` : ""}</div>
<div class="foot"><span>${e(author)}</span><span>blog.krizaka.com</span></div>
</div></body></html>`;
};
