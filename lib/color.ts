/* Token colours for renderers without CSS (the Open Graph images): `hsl(H S% L% / A)` → `#rrggbb` or `rgba()`.
   scripts/gen-favicon.mjs keeps the same function for the mark (tests/og.test.mjs checks they agree). */
/** `hsl(217 92% 53%)` or `hsl(0 0% 100% / 0.1)` → `#rrggbb` / `rgba(…)`: the renderer of the mark reads neither. */
export function hslToCss(hsl: string): string {
  const m = hsl.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*(?:\/\s*([\d.]+))?\s*\)/);
  if (!m) return hsl;
  const [h, s, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  const [r, g, b] = [f(0), f(8), f(4)];
  return m[4] ? `rgba(${r}, ${g}, ${b}, ${m[4]})` : `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

