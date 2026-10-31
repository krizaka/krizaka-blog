import { itemsOf, sideTone } from "@/lib/figures";

/* <Split label="…"><Side title="Before" tone="before" items="a | b"/><Side title="After" tone="after" items="c | d"/></Split> in a
   chapter: two or three columns set side by side on a ruled plate (before / after, mine / the agent's, own / plug in / refuse),
   stacked on a phone. Plain HTML lists from the tokens: it is its own text version, both themes, no image. The caption is the
   label (« fig. N — » comes from the Cahier's counter). Props are strings. */
export type SplitSide = { title: string; tone?: string; items?: string };

export function Split({ label, sides }: Readonly<{ label: string; sides: SplitSide[] }>) {
  if (sides.length < 2 || sides.length > 3) throw new Error(`a <Split> has 2 or 3 sides: ${label}`);
  return (
    <figure className="bl-plate bl-split" data-reveal="soft">
      <div className="bl-plate-paper" data-paper="lines">
        <div className="bl-split-cols" data-cols={sides.length}>
          {sides.map((s) => (
            <section key={s.title} className="bl-split-side" data-tone={sideTone(s.tone)} aria-label={s.title}>
              <p className="bl-split-title">{s.title}</p>
              <ul>
                {itemsOf(s.items).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
