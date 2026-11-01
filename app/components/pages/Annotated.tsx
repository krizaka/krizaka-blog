import { Fragment } from "react";
import { marksOf } from "@/lib/figures";
import type { Locale } from "@/lib/i18n";
import { mediaOf } from "@/lib/media";
import { Figure } from "./Figure";

/* An annotated capture (lib/figures.ts marksOf): the picture carries the numbered boxes (drawn into it by
   scripts/annotate-figures.mjs), the caption says which test and which screen, and the legend under it says, box by box, what the
   test asserts. The legend is inside the figcaption, so the caption stays right under its picture in the books too. Words between
   backticks read as code (a selector, a setting). */
export function Annotated({
  id,
  alt,
  caption,
  marks,
  locale,
}: {
  id: string;
  alt: string;
  caption: string;
  marks: string;
  locale: Locale;
}) {
  const list = marksOf(marks);
  const m = mediaOf(id);
  if (m.kind !== "image" || !m.marks)
    throw new Error(`media "${id}" is not an annotated capture (scripts/annotate-figures.mjs)`);
  return (
    <Figure
      id={id}
      alt={alt}
      locale={locale}
      className={m.height > m.width ? "bl-annotated bl-tall" : "bl-annotated"}
      caption={
        <>
          {caption}
          <ol className="bl-legend">
            {list.map((k) => (
              <li key={k.n} value={k.n}>
                <span>
                  {k.label
                    .split("`")
                    .map((part, i) => (i % 2 ? <code key={i}>{part}</code> : <Fragment key={i}>{part}</Fragment>))}
                </span>
              </li>
            ))}
          </ol>
        </>
      }
    />
  );
}
