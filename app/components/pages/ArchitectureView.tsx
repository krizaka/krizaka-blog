import { createElement, type ReactNode } from "react";
import data from "@/lib/architecture.json";
import { PAGE_PALETTE, svgTree, textVersion, type ArchView, type SvgElement } from "@/lib/architecture";
import type { Locale } from "@/lib/i18n";

/* <Architecture view="agents_containers" label="…"/> in a post: one view of a checked architecture model,
   drawn inline from its layout (lib/architecture.json, made by scripts/gen-architecture.mjs with the org's architecture tool) in the
   page's tokens, so dark and light follow the theme. Under it: the view in words (its own text version), and the standalone SVG of
   each theme. The words of the drawing are the model's (French: content/diagrams/*.fr.json). Server-rendered, no script. */

type Labels = {
  textVersion: string;
  elements: string;
  relations: string;
  steps: string;
  files: string;
  light: string;
  dark: string;
};

const VIEWS = data.views as unknown as Record<Locale, ArchView[]>;

/** SVG attribute names as React wants them (`stroke-width` → `strokeWidth`); `aria-*`, `data-*` and `viewBox` stay. */
const reactName = (name: string) =>
  name.startsWith("aria-") || name.startsWith("data-")
    ? name
    : name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

function toReact(node: SvgElement | string, key: number): ReactNode {
  if (typeof node === "string") return node;
  const props: Record<string, string | number> = { key };
  for (const [k, v] of Object.entries(node.attrs)) props[reactName(k)] = v;
  return createElement(node.tag, props, ...node.children.map(toReact));
}

export function viewFor(id: string, locale: Locale): ArchView {
  const view = VIEWS[locale].find((v) => v.id === id);
  if (!view) throw new Error(`lib/architecture.json has no view "${id}" (${locale})`);
  return view;
}

export function ArchitectureView({
  view: id,
  label,
  locale,
  labels,
}: Readonly<{ view: string; label: string; locale: Locale; labels: Labels }>) {
  const view = viewFor(id, locale);
  const words = textVersion(view);
  const file = (theme: "light" | "dark") => `/diagrams/${view.id}.${locale}.${theme}.svg`;
  return (
    <figure className="bl-plate bl-arch" data-reveal="soft" data-wide={view.bounds.width > 1000 ? "true" : undefined}>
      <div className="bl-plate-paper bl-arch-paper">{toReact(svgTree(view, PAGE_PALETTE), 0)}</div>
      <details className="bl-arch-text">
        <summary>{labels.textVersion}</summary>
        <p>{labels.elements}</p>
        <ul>
          {words.elements.map((w, i) => (
            <li key={`${i}-${w}`}>{w}</li>
          ))}
        </ul>
        <p>{view.dynamic ? labels.steps : labels.relations}</p>
        {view.dynamic ? (
          <ol>
            {words.relations.map((w, i) => (
              <li key={`${i}-${w}`}>{w}</li>
            ))}
          </ol>
        ) : (
          <ul>
            {words.relations.map((w, i) => (
              <li key={`${i}-${w}`}>{w}</li>
            ))}
          </ul>
        )}
      </details>
      <figcaption>
        {label}{" "}
        <span className="bl-arch-files">
          {labels.files} <a href={file("light")}>{labels.light}</a> · <a href={file("dark")}>{labels.dark}</a>
        </span>
      </figcaption>
    </figure>
  );
}
