/* JSON-LD for a <script type="application/ld+json">: JSON.stringify alone lets a title or summary containing
   `</script>` close the tag and inject markup, so `<`, `>`, `&` and the two line separators are written as \u escapes
   (the same JSON, read the same by crawlers). Every JSON-LD block of the blog goes through here. */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/ /g, "\\u2028")
    .replace(/ /g, "\\u2029");
}
