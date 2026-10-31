import { itemsOf } from "@/lib/figures";

/* <Layers label="…"><Layer tag="0" title="Foundations" note="tokens, preset" items="a | b" level="0"/>…</Layers> in a chapter:
   levels stacked on a ruled plate, top to bottom, joined by an ink rule (the levels of a library, a tree of work: `level`
   indents a child under its parent). An ordered list from the tokens: its own text version, both themes, one column on a
   phone. The caption is the label. Props are strings. */
export type Layer = { tag?: string; title: string; note?: string; items?: string; level?: string };

export function Layers({ label, layers }: Readonly<{ label: string; layers: Layer[] }>) {
  if (layers.length < 2) throw new Error(`a <Layers> has at least 2 layers: ${label}`);
  return (
    <figure className="bl-plate bl-layers" data-reveal="soft">
      <div className="bl-plate-paper" data-paper="lines">
        <ol>
          {layers.map((l) => {
            const items = itemsOf(l.items);
            return (
              <li key={`${l.tag ?? ""}${l.title}`} data-level={Math.min(2, Math.max(0, Number(l.level ?? 0) || 0))}>
                {l.tag && <span className="bl-layers-tag">{l.tag}</span>}
                <span className="bl-layers-body">
                  <strong>{l.title}</strong>
                  {l.note && <span className="bl-layers-note">{l.note}</span>}
                  {items.length > 0 && <span className="bl-layers-items">{items.join(" · ")}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
