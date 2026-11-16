/* The props of @krizaka/ui/sketch as the CTO fixed them on krizaka-internal#4006, so the chapters' drawings can be written
   before the block ships. TODO(krizaka-internal#4006): when @krizaka/ui publishes the block, replace these types with
   `import type { SketchSpec, … } from "@krizaka/ui/sketch"` and delete this file; a drawing that no longer type-checks
   then shows where the published API differs. */
export type Pt = [number, number];

export type SketchShape =
  | { kind: "box"; x: number; y: number; w: number; h: number; fill?: "none" | "soft" | "accent"; dashed?: boolean }
  | { kind: "button"; x: number; y: number; w: number; h: number; variant: "primary" | "secondary"; label?: string }
  | { kind: "lines"; x: number; y: number; w: number; count: number }
  | { kind: "text"; x: number; y: number; text: string; size?: "sm" | "md" }
  | { kind: "line" | "arrow"; from: Pt; to: Pt }
  | { kind: "icon"; x: number; y: number; name: string }
  | { kind: "hatch"; x: number; y: number; w: number; h: number };

/** A circled number at `from` (or at `at`), with a line or an arrow to `at`. */
export type SketchCallout = { n: number; at: Pt; from?: Pt; arrow?: boolean };

export type SketchSpec = {
  width: number;
  height: number;
  frame?: "desktop" | "phone" | "none";
  seed?: number;
  shapes: SketchShape[];
  callouts?: SketchCallout[];
};

export type SketchLegendItem = { n: number; label: string; text: string };

/** One drawing of a chapter: one screen, or a before / after pair whose callouts are numbered 1 to n across both. */
export type SketchEntry = { spec: SketchSpec } | { before: SketchSpec; after: SketchSpec };
