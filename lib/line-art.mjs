/* Line art for the books' covers (founder, 2026-11-01): the official marks and birds of @krizaka/ui, redrawn as an engraver's
   plate — one ink, a fine stroke, the paper showing through; no gradient, no shade, no glow. Nothing is drawn by hand here: the
   shapes are the SVG paths @krizaka/ui renders, and this module only rewrites how they are painted. Plain ESM, no DOM. */

/** The birds of the flock on the cover, in reading order. */
export const FLOCK = ["owl", "duck", "beaver", "falcon", "pigeon", "flamingo"];

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/** Is this element only light and shade (a drop shadow, a glow, a darkening or lightening overlay)? Those are not lines: they have
    an opacity and no stroke of their own. */
const isShade = (tag) =>
  ((attr(tag, "opacity") ?? attr(tag, "fill-opacity")) !== undefined && attr(tag, "stroke") === undefined) ||
  (attr(tag, "fill") ?? "").startsWith("url(#kzm-glow");

/** Rewrite one bird or mark SVG (React's static markup) as line art in `ink` on `paper`. */
export function lineArt(svg, { ink, paper, size }) {
  let out = svg
    .replace(/<style>[\s\S]*?<\/style>/g, "")
    .replace(/<defs>[\s\S]*?<\/defs>/g, "")
    .replace(/<title>[\s\S]*?<\/title>/g, "");
  // Shade and glow elements go; what is left is outline.
  out = out.replace(/<(ellipse|path|circle)\b[^>]*>(<\/\1>)?/g, (tag) => (isShade(tag) ? "" : tag));
  // A thick pen line (the mark's hexagon, the flamingo's neck) is engraved as two thin ones: ink, then a paper core.
  out = out.replace(/<path\b[^>]*\sstroke-width="(\d+(?:\.\d+)?)"[^>]*><\/path>/g, (tag, width) => {
    const w = Number(width);
    if (w < 4) return tag;
    const outline = tag.replace(/stroke="[^"]*"/, `stroke="${ink}"`);
    const core = tag
      .replace(/stroke="[^"]*"/, `stroke="${paper}"`)
      .replace(`stroke-width="${width}"`, `stroke-width="${w - (w > 12 ? 5 : 2.2)}"`);
    return outline + core;
  });
  out = out
    .replace(/\sclass="[^"]*"/g, "")
    .replace(/\sopacity="[^"]*"/g, "")
    // Paint: strokes in ink, fills in paper; the pupils (black) and the inner nodes of the mark are the only solid ink.
    .replace(/\sstroke="[^"]*"/g, (m) => (m.includes(paper) ? m : ` stroke="${ink}"`))
    .replace(/\sstroke-width="2\.6"/g, ' stroke-width="1.6"')
    .replace(/\sfill="([^"]*)"/g, (m, value) => {
      if (value === "none") return m;
      if (value === "#000000" || value === "#ddeaf4") return ` fill="${ink}"`;
      return ` fill="${paper}"`;
    })
    .replace(/\sstroke-linecap="round"/g, "");
  if (size) out = out.replace(/\swidth="\d+"/, ` width="${size}"`).replace(/\sheight="\d+"/, ` height="${size}"`);
  return out;
}
