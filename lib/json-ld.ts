/* JSON-LD for a <script type="application/ld+json">: JSON.stringify alone lets a title or summary containing
   `</script>` close the tag and inject markup, so `<`, `>`, `&` and the two line separators are written as \u escapes
   (the same JSON, read the same by crawlers). Every JSON-LD block of the blog goes through here. */
const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [String.fromCharCode(0x2028)]: "\\u2028",
  [String.fromCharCode(0x2029)]: "\\u2029",
};

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(new RegExp(`[${Object.keys(ESCAPES).join("")}]`, "g"), (c) => ESCAPES[c]);
}
