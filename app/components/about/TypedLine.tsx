/* The typed line of the About page (founder 2026-11-01): the line under the name is written letter by letter once, when the page
   arrives, like the banner of his GitHub profile. Pure CSS (about.css « Typed line »): each letter appears at its turn
   (`animation-delay`), so there is no script, no permanent frame loop and no layout shift: the letters are laid out from the
   start and only their visibility changes. The real text stays in the DOM, readable by screen readers and search engines; the
   animated copy is `aria-hidden`. Under reduced motion the whole line shows at once. */
export function TypedLine({ text, className }: { text: string; className?: string }) {
  let n = 0;
  return (
    <p className={className}>
      <span className="bl-typed-real">{text}</span>
      <span className="bl-typed" aria-hidden="true">
        {text.split(" ").map((word, w) => (
          // eslint-disable-next-line react/no-array-index-key -- the words of a fixed line, never reordered
          <span key={w} className="bl-typed-word">
            {Array.from(word).map((ch) => {
              const i = n++;
              return (
                <span key={i} className="bl-typed-ch" style={{ "--i": i } as React.CSSProperties}>
                  {ch}
                </span>
              );
            })}
            {w < text.split(" ").length - 1 && <span className="bl-typed-sp"> </span>}
          </span>
        ))}
      </span>
    </p>
  );
}
