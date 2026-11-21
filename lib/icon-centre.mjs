/* Every icon (an <svg>) that sits beside a text, with the vertical offset between its centre and the centre of the text line it
   belongs to (krizaka-internal#4001). Runs in the browser (page.evaluate serialises it): self-contained, no import.
   The text is the first line of the nearest text of the icon's own control (link, button) or, for a lone icon, of its parent. */
export const iconOffsets = () => {
  const textRect = (root, icon) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim() || icon.contains(n) || n.parentElement.closest("svg, style, script")) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const line = [...range.getClientRects()].find((r) => r.width > 2 && r.height > 2);
      const hidden = (e) => {
        for (let p = e; p && p !== root.parentElement; p = p.parentElement) {
          const r = p.getBoundingClientRect();
          if (r.width <= 1 && r.height <= 1) return true;
        }
        return false;
      };
      if (line && !hidden(n.parentElement)) return { line, text: n.textContent.trim() };
    }
    return null;
  };
  const rows = [];
  for (const icon of document.querySelectorAll("svg")) {
    const box = icon.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    if (box.width > 40 || icon.closest("[role='img']")) continue;
    const owner = icon.closest("a, button, li, p, span");
    if (!owner) continue;
    const found = textRect(owner, icon);
    if (!found) continue;
    const { line: text } = found;
    /* only an icon on the same line as its text: a text line that overlaps the icon's own rows */
    if (text.bottom < box.top || text.top > box.bottom) continue;
    const label = found.text.replace(/\s+/g, " ").slice(0, 30);
    const cls = String(owner.className?.baseVal ?? owner.className).split(" ")[0];
    rows.push({
      owner: `${owner.tagName.toLowerCase()}${cls ? "." + cls : ""}`,
      label,
      offset: Math.round((box.top + box.height / 2 - (text.top + text.height / 2)) * 100) / 100,
    });
  }
  return rows;
};

/** The largest offset, in px, an icon may sit from the centre of its text line. */
export const ICON_OFFSET_MAX = 1;

/** The problems among the rows `iconOffsets` measured: an icon more than ICON_OFFSET_MAX px off its text line. */
export const iconProblems = (rows) =>
  rows
    .filter((r) => Math.abs(r.offset) > ICON_OFFSET_MAX)
    .map((r) => `the icon of ${r.owner} « ${r.label} » is ${r.offset} px off its text line (max ${ICON_OFFSET_MAX})`);
