/* JSON-LD for a <script type="application/ld+json">: JSON.stringify alone lets a title or summary containing
   `</script>` close the tag and inject markup, so `<`, `>`, `&` and the two line separators are written as \u escapes
   (the same JSON, read the same by crawlers). Every JSON-LD block of the blog goes through here. */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, String.raw`\u003c`)
    .replace(/>/g, String.raw`\u003e`)
    .replace(/&/g, String.raw`\u0026`)
    .replace(/\u2028/g, String.raw`\u2028`)
    .replace(/\u2029/g, String.raw`\u2029`);
}
