import { ArchitectureDiagram, type ArchView } from "@krizaka/ui/architecture-diagram";
import agents from "@/lib/architecture.json";
import designChoices from "@/lib/architecture-design-choices.json";
import observability from "@/lib/architecture-observability.json";
import social from "@/lib/architecture-social.json";
import type { Locale } from "@/lib/i18n";

/* <Architecture view="agents_containers" label="short title" description="the long sentence"/> in a post: one view of a checked architecture model, laid out at build time
   (lib/architecture.json, made by scripts/gen-architecture.mjs with `layoutViews` of @krizaka/architecture) and drawn by the family's
   `ArchitectureDiagram` of @krizaka/ui, in the page's tokens (dark and light follow the theme), with its text version. The words of
   the drawing are the model's (French: content/diagrams/*.fr.json). Server-rendered, no script. */

type Labels = {
  textVersion: string;
  elements: string;
  relations: string;
  steps: string;
};

/** Every laid-out model (scripts/gen-architecture.mjs `MODELS`); a view id is unique across them. */
const LAYOUTS = [agents, designChoices, observability, social].map((d) => d.views as unknown as Record<Locale, ArchView[]>);
const VIEWS: Record<Locale, ArchView[]> = {
  en: LAYOUTS.flatMap((l) => l.en),
  fr: LAYOUTS.flatMap((l) => l.fr),
};

export function viewFor(id: string, locale: Locale): ArchView {
  const view = VIEWS[locale].find((v) => v.id === id);
  if (!view) throw new Error(`lib/architecture.json has no view "${id}" (${locale})`);
  return view;
}

export function ArchitectureView({
  view: id,
  label,
  description,
  locale,
  labels,
}: Readonly<{ view: string; label: string; description?: string; locale: Locale; labels: Labels }>) {
  const view = viewFor(id, locale);
  return (
    <div className="bl-arch" data-reveal="soft" data-wide={view.bounds.width > 1000 ? "true" : undefined}>
      <ArchitectureDiagram
        view={view}
        title={label}
        subtitle={description}
        words={{
          summary: labels.textVersion,
          elements: labels.elements,
          relations: labels.relations,
          steps: labels.steps,
        }}
      />
    </div>
  );
}
