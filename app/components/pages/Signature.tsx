import { getDictionary, type Locale } from "@/lib/i18n";

/* The founder's signature at the end of his chapters (founder 2026-10-31): a short line of his, then « Wu-sama » written with a
   pen — an SVG drawn in code, its strokes laid down one after the other once, when the block arrives (the motion system's
   `data-reveal` → `.kz-in`, globals.css « Signature »), still under reduced motion and without JavaScript — and « Oussama Abid »
   small under it, in the mono of the notes. Ink on the paper in both themes (currentColor), the underline stroke in the accent.
   Every stroke is one path of `pathLength="1"`, so the draw needs no measured length. */
const STROKES = [
  // W
  "M10 20 C13 38 17 56 23 66 C29 52 33 40 38 32 C42 46 46 58 52 66 C58 50 62 34 67 18",
  // u
  "M73 44 C72 55 74 64 80 64 C86 64 90 55 91 44 C91 55 93 63 100 63",
  // -
  "M106 52 C110 51 114 50 119 50",
  // s
  "M137 43 C130 39 122 43 127 50 C131 55 138 58 132 64 C127 68 120 66 118 61",
  // a
  "M158 49 C151 43 142 47 142 56 C142 66 152 66 157 55 L157 45 C157 56 157 63 164 63",
  // m
  "M168 64 C169 58 170 52 171 47 C174 43 180 44 180 50 L180 63 M180 51 C183 43 190 44 190 50 L190 62",
  // a
  "M214 49 C207 43 198 47 198 56 C198 66 208 66 213 55 L213 45 C213 56 213 63 222 61",
];
const FLOURISH = "M14 80 C70 73 150 71 246 76";

export function Signature({ locale }: { locale: Locale }) {
  const s = getDictionary(locale).chapter.signature;
  return (
    <aside className="bl-sign" data-reveal="soft" aria-label={s.label}>
      <blockquote className="bl-sign-quote" lang={locale}>
        <p>{s.quote}</p>
      </blockquote>
      <figure className="bl-sign-hand">
        <svg viewBox="0 0 260 90" className="bl-sign-svg" role="img" aria-label={s.name}>
          {STROKES.map((d, i) => (
            <path key={d} d={d} pathLength={1} style={{ "--i": i } as React.CSSProperties} />
          ))}
          <path
            className="bl-sign-flourish"
            d={FLOURISH}
            pathLength={1}
            style={{ "--i": STROKES.length } as React.CSSProperties}
          />
        </svg>
        <figcaption className="bl-sign-name">{s.fullName}</figcaption>
      </figure>
    </aside>
  );
}
