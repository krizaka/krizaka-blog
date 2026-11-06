// WHY  The built pages are checked for what a search engine reads (title, meta, h1, cover, links). Reading HTML with regexes
//      breaks on attribute order, quotes and nesting; a parser does not.
// WHAT `readHtml(html)`: the page as a tree (htmlparser2, entities left as written so lengths are counted on the source), with
//      `find`/`findAll` by a test on the element, `attr`, `classes`, `text` and `source` (the tag as written, for messages).
// HOW  Imported by scripts/check-meta.mjs; nothing to run. Tests: tests/meta.test.mjs.
// OWNER krizaka-blog (lane platform), ADR-026 phase D.

import { DomUtils, parseDocument } from "htmlparser2";

/** The element `el` has this class (a whole class name, not part of one). */
export const hasClass = (el, name) => (el.attribs?.class ?? "").split(/\s+/).includes(name);

/** The page as a tree with the helpers the checks need. */
export function readHtml(html) {
  const doc = parseDocument(html, { decodeEntities: false, withStartIndices: true, withEndIndices: true });
  const findAll = (test) => DomUtils.findAll(test, doc.children);
  return {
    find: (test) => DomUtils.findOne(test, doc.children),
    findAll,
    /** The elements named `name` (lower case) for which `test(el)` holds (all of them by default). */
    tags: (name, test = () => true) => findAll((el) => el.name === name && test(el)),
    /** The text of an element, entities as written. */
    text: (el) => DomUtils.getText(el),
    /** The tag as written in the page, from its `<` to its `>`. */
    source: (el) => html.slice(el.startIndex, el.endIndex + 1),
  };
}
