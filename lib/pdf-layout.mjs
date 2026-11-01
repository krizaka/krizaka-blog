/* The layout guard of the PDF books (founder 2026-10-31): a caption pushed away from its picture, and the white page it leaves
   behind, are refused at build. The generator reads the PDF it just made page by page (pdf.js, Mozilla, Apache-2.0: the text
   with its position, font size and the pictures painted, with their place on the page) and `layoutProblems` judges the pages.

   Pure functions over plain page summaries ({ width, height, header, items: [{ kind: "text" | "image", top, bottom, size?,
   text? }] }, PDF points from the bottom of the page), so the rules are tested without a PDF (tests/pdf-layout.test.mjs). */

export const MM = 72 / 25.4;
/** The page box of the books (lib/ebook-style.mjs printCss): A4, 24 mm on top, 26 mm under. */
export const PAGE = { width: 210 * MM, height: 297 * MM, top: 24 * MM, bottom: 26 * MM };
/** A page whose content stops before this share of its height is nearly blank (unless the next one opens a part). */
export const MIN_FILL = 0.5;
/** Under this share, a page is blank (a chapter's last page may be short: the next one opens a part). */
export const MIN_FILL_ANY = 0.12;
/** The most a caption may sit under its picture. */
export const CAPTION_GAP = 14 * MM;
/** Captions: the mono at .8em of 10.5 pt (8.4 pt), each opened by « — » (figcaption::before). */
const isCaption = (it) => it.kind === "text" && it.size >= 7.6 && it.size <= 9.2 && /^\s*—\s/.test(it.text ?? "");

/** A page that opens a part (the cover, a chapter opener, the contents, « the whole story »): no running header, or a title ≥ 20 pt. */
export function opensPart(page) {
  if (!page.header) return true;
  const first = [...page.items].sort((a, b) => b.top - a.top)[0];
  return Boolean(first && first.kind === "text" && first.size >= 20);
}

/** How much of the text block a page fills, from its top margin down to its lowest text line or picture (0 → 1). */
export function fillOf(page, box = PAGE) {
  const top = page.height - box.top;
  const floor = box.bottom;
  const inside = page.items.filter((it) => it.top > floor && it.bottom < top + 1);
  if (inside.length === 0) return 0;
  const lowest = Math.min(...inside.map((it) => it.bottom));
  return Math.max(0, Math.min(1, (top - lowest) / (top - floor)));
}

/** What is wrong with the pages of a book: nearly blank pages, and captions not right under their picture. Pages are numbered from 1. */
export function layoutProblems(pages, box = PAGE) {
  const problems = [];
  pages.forEach((page, i) => {
    const n = i + 1;
    const next = pages[i + 1];
    const opener = !page.header;
    if (!opener) {
      const fill = fillOf(page, box);
      if (page.items.length === 0) problems.push(`page ${n} is empty`);
      else if (fill < MIN_FILL_ANY && next && !opensPart(next))
        problems.push(`page ${n} is blank (${Math.round(fill * 100)} % filled)`);
      else if (fill < MIN_FILL && next && !opensPart(next))
        problems.push(
          `page ${n} is nearly blank (${Math.round(fill * 100)} % filled) and the next page does not open a part`,
        );
    }
    const images = page.items.filter((it) => it.kind === "image");
    const lines = page.items.filter((it) => it.kind === "text").sort((a, b) => b.top - a.top);
    for (const cap of lines.filter(isCaption)) {
      const above = images.filter((im) => im.bottom >= cap.top - 2 && im.bottom - cap.top <= CAPTION_GAP);
      if (above.length === 0)
        problems.push(`page ${n}: the caption « ${String(cap.text).trim().slice(0, 48)} » is not under its picture`);
    }
  });
  return problems;
}

/** The pictures Chromium pushed to the next page, leaving a nearly blank page behind: for each, the index of the picture among the
    pictures of the text pages (the order they are painted, the order of the document) and the room, in points, left under the last
    line of the page before. The generator shrinks those pictures to that room (or lets the text flow before them) and prints again. */
export function pushedPictures(pages, box = PAGE) {
  const out = [];
  let index = 0;
  pages.forEach((page, i) => {
    const pictures = page.header ? page.items.filter((it) => it.kind === "image").length : 0;
    const next = pages[i + 1];
    if (page.header && next?.header && fillOf(page, box) < MIN_FILL) {
      const first = [...next.items].sort((a, b) => b.top - a.top)[0];
      if (first?.kind === "image") {
        const lowest = Math.min(page.height - box.top, ...page.items.map((it) => it.bottom));
        out.push({ index: index + pictures, page: i + 1, room: Math.max(0, lowest - box.bottom) });
      }
    }
    index += pictures;
  });
  return out;
}

const IDENTITY = [1, 0, 0, 1, 0, 0];

function multiply(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

/** The body text items of a page and whether it carries a running header (the footer is dropped). */
async function readText(page, view, box) {
  const items = [];
  let header = false;
  const content = await page.getTextContent();
  for (const t of content.items) {
    if (!t.str || !t.str.trim()) continue;
    const [a, b, , , , y] = t.transform;
    const size = Math.hypot(a, b);
    const top = y + size * 0.8;
    if (y > view.height - box.top) header = true;
    else if (top >= box.bottom) items.push({ kind: "text", top, bottom: y - size * 0.2, size, text: t.str });
  }
  return { items, header };
}

/** The box of a painted picture under the current transform, or null when it is too small to count. */
function pictureAt(ctm) {
  const ys = [ctm[5], ctm[5] + ctm[3], ctm[5] + ctm[1], ctm[5] + ctm[1] + ctm[3]];
  const top = Math.max(...ys);
  const bottom = Math.min(...ys);
  return top - bottom > 6 ? { kind: "image", top, bottom } : null;
}

/** The transform after one drawing operation (forms push and pop it). */
function nextTransform(OPS, fn, args, ctm, stack) {
  if (fn === OPS.save) stack.push(ctm);
  else if (fn === OPS.restore || fn === OPS.paintFormXObjectEnd) return stack.pop() ?? IDENTITY;
  else if (fn === OPS.transform) return multiply(ctm, args);
  else if (fn === OPS.paintFormXObjectBegin) {
    stack.push(ctm);
    if (Array.isArray(args?.[0]) || ArrayBuffer.isView(args?.[0])) return multiply(ctm, Array.from(args[0]));
  }
  return ctm;
}

/** The pictures a page paints (the transform of each, followed through forms). */
async function readPictures(pdfjs, page) {
  const { OPS } = pdfjs;
  const ops = await page.getOperatorList();
  const paint = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageXObjectRepeat]);
  const pictures = [];
  const stack = [];
  let ctm = IDENTITY;
  ops.fnArray.forEach((fn, k) => {
    const picture = paint.has(fn) ? pictureAt(ctm) : null;
    if (picture) pictures.push(picture);
    ctm = nextTransform(OPS, fn, ops.argsArray[k], ctm, stack);
  });
  return pictures;
}

/** A page summary from pdf.js: its text items and the pictures it paints. */
async function summarise(pdfjs, page, box) {
  const view = page.getViewport({ scale: 1 });
  const { items, header } = await readText(page, view, box);
  items.push(...(await readPictures(pdfjs, page)));
  return { width: view.width, height: view.height, header, items };
}

/** The pages of a PDF, read with pdf.js (legacy build: Node, no canvas, no worker). */
export async function readPages(bytes, box = PAGE) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false, isEvalSupported: false });
  const doc = await task.promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) pages.push(await summarise(pdfjs, await doc.getPage(n), box));
  await task.destroy();
  return pages;
}

/** Reads a PDF and judges its layout. */
export async function pdfLayoutProblems(bytes, box = PAGE) {
  return layoutProblems(await readPages(bytes, box), box);
}
