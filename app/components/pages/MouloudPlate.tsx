import { SpecimenTag } from "@krizaka/ui/specimen-tag";

/* Mouloud's plate: the CTO of the story is a Gabonese grey parrot (Psittacus erithacus) — grey, with the species' red tail.
   He is drawn here as a naturalist's specimen, in the flock's flat, geometric register (the mascots of @krizaka/ui), beside a
   specimen tag that names him and his promise: he listens, remembers and repeats only what is true. The drawing is ink on
   paper from the tokens (no colour typed in the component); the facts are in the tag and the caption, so the drawing is
   decoration (aria-hidden). A reusable parrot belongs in @krizaka/ui's flock (krizaka-ui); this plate is the article's own. */

type Labels = {
  caption: string;
  code: string;
  species: string;
  speciesLabel: string;
  roleLabel: string;
  role: string;
  habitLabel: string;
  habit: string;
  status: string;
  promise: string;
};

export function MouloudPlate({ labels, label }: Readonly<{ labels: Labels; label?: string }>) {
  return (
    <figure className="bl-plate bl-mouloud" data-reveal="soft">
      <div className="bl-plate-paper bl-mouloud-body">
        <svg className="bl-mouloud-svg" viewBox="0 0 220 300" width="220" aria-hidden="true" focusable="false">
          {/* the perch */}
          <line className="bl-mouloud-perch" x1="26" y1="250" x2="194" y2="250" />
          {/* the red tail of the grey parrot, hanging below the perch */}
          <path className="bl-mouloud-tail" d="M96 214 L112 214 L120 292 L100 292 Z" />
          <line className="bl-mouloud-feather" x1="110" y1="230" x2="110" y2="286" />
          {/* the body */}
          <path
            className="bl-mouloud-plumage"
            d="M150 150 q18 44 -6 76 q-24 28 -54 24 q-30 -4 -36 -36 q-8 -44 22 -78 q30 -32 60 -14 q12 8 14 28 Z"
          />
          {/* the folded wing with a few feather strokes */}
          <path className="bl-mouloud-wing" d="M132 160 q22 30 8 72 q-10 26 -34 28 q24 -36 18 -72 q-4 -22 8 -28 Z" />
          <line className="bl-mouloud-feather" x1="124" y1="188" x2="118" y2="236" />
          <line className="bl-mouloud-feather" x1="132" y1="190" x2="128" y2="238" />
          {/* the head */}
          <circle className="bl-mouloud-plumage" cx="128" cy="118" r="42" />
          {/* the pale face mask of the African grey */}
          <path className="bl-mouloud-face" d="M108 96 q34 -8 46 18 q8 24 -14 36 q-26 12 -40 -10 q-10 -32 8 -44 Z" />
          {/* the eye */}
          <circle className="bl-mouloud-eye-ring" cx="132" cy="112" r="9" />
          <circle className="bl-mouloud-eye" cx="132" cy="112" r="4" />
          {/* the hooked beak */}
          <path className="bl-mouloud-beak" d="M150 118 q28 -4 30 18 q0 18 -18 18 q-4 -14 -14 -16 q10 -10 2 -20 Z" />
        </svg>
      </div>
      <div className="bl-mouloud-tag">
        <SpecimenTag
          code={labels.code}
          title="Mouloud"
          titleAs="p"
          status={{ label: labels.status, tone: "ink" }}
          fields={[
            { label: labels.speciesLabel, value: labels.species },
            { label: labels.roleLabel, value: labels.role },
            { label: labels.habitLabel, value: labels.habit },
          ]}
          mount="pin"
        >
          {labels.promise}
        </SpecimenTag>
      </div>
      <figcaption>{label ?? labels.caption}</figcaption>
    </figure>
  );
}
