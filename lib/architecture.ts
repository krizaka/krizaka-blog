/* The architecture diagrams of a post, drawn from a checked model. The model is LikeC4 written against
   the org's base (content/diagrams/*.c4); `scripts/gen-architecture.mjs --tool <org architecture tool>` checks it with the org's
   own rules, lays it out and writes lib/architecture.json (the layout in each language, the hashes of its sources, the check's
   verdict). This module only draws that layout: one tree of SVG elements, turned into React elements by the page
   (ArchitectureView) and into a standalone file per theme by `gen-architecture.mjs svg`. Pure: no I/O, no React; tested in
   tests/architecture.test.mjs. */

export type Point = readonly [number, number];
export type Box = { x: number; y: number; width: number; height: number };

export type ArchNode = Box & {
  id: string;
  parent: string | null;
  kind: string;
  shape: string;
  title: string;
  technology: string | null;
  description: string | null;
  compound: boolean;
};

export type ArchEdge = {
  id: string;
  source: string;
  target: string;
  label: string | null;
  points: readonly Point[];
  labelBBox: Box | null;
  step: number | null;
  /** Graphviz drew the edge against its rank: the points run from the target to the source. */
  back: boolean;
};

export type ArchView = {
  id: string;
  title: string;
  dynamic: boolean;
  bounds: Box;
  nodes: ArchNode[];
  edges: ArchEdge[];
};

/** The colours a drawing uses: CSS custom properties on the page, concrete values in an exported file. */
export type Palette = {
  paper: string;
  sheet: string;
  ink: string;
  inkSoft: string;
  muted: string;
  rule: string;
  ruleStrong: string;
  accent: string;
  sans: string;
  mono: string;
};

export const PAGE_PALETTE: Palette = {
  paper: "var(--kz-surface-0)",
  sheet: "var(--kz-surface-1)",
  ink: "var(--kz-text-primary)",
  inkSoft: "var(--kz-text-secondary)",
  muted: "var(--kz-text-muted)",
  rule: "var(--kz-border-default)",
  ruleStrong: "var(--kz-border-strong)",
  accent: "var(--kz-accent-text)",
  sans: "var(--kz-font-sans)",
  mono: "var(--kz-font-mono)",
};

/** The token each colour of the palette reads, to export a file per theme from @krizaka/tokens. */
export const PALETTE_TOKENS: Readonly<Record<keyof Palette, string>> = {
  paper: "--kz-surface-0",
  sheet: "--kz-surface-1",
  ink: "--kz-text-primary",
  inkSoft: "--kz-text-secondary",
  muted: "--kz-text-muted",
  rule: "--kz-border-default",
  ruleStrong: "--kz-border-strong",
  accent: "--kz-accent-text",
  sans: "--kz-font-sans",
  mono: "--kz-font-mono",
};

export type SvgElement = { tag: string; attrs: Record<string, string | number>; children: (SvgElement | string)[] };

const el = (tag: string, attrs: SvgElement["attrs"], children: SvgElement["children"] = []): SvgElement => ({
  tag,
  attrs,
  children,
});

/* Sizes in layout units (LikeC4's): the page scales the drawing to its column. */
const TITLE = 21;
const TECH = 15;
const LABEL = 14;
const SHADOW = 5;
const SANS_EM = 0.54;
const MONO_EM = 0.6;

/** Words wrapped to lines no wider than `width`, for a font of `size` whose average glyph is `em` of it. */
export function wrap(text: string, width: number, size: number, em: number): string[] {
  const max = Math.max(4, Math.floor(width / (size * em)));
  const lines: string[] = [];
  /* French quotes stay with their word: a line never starts with « » » nor ends with « « ». */
  const glued = text.replace(/« /g, "«\u00a0").replace(/ »/g, "\u00a0»");
  for (const word of glued.split(/[ \t\n]+/).filter(Boolean)) {
    const last = lines.at(-1);
    if (last !== undefined && last.length + 1 + word.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

function lines(texts: string[], x: number, y: number, size: number, leading: number, attrs: SvgElement["attrs"]) {
  return texts.map((t, i) =>
    el("text", { x, y: Math.round(y + i * size * leading), "font-size": size, ...attrs }, [t]),
  );
}

function shapeOf(n: ArchNode, p: Palette): SvgElement[] {
  const { x, y, width: w, height: h } = n;
  const external = n.kind === "external";
  const body = { fill: external ? p.paper : p.sheet, stroke: external ? p.muted : p.ink, "stroke-width": 2 };
  const shadow = el("rect", { x: x + SHADOW, y: y + SHADOW, width: w, height: h, fill: p.rule });
  switch (n.shape) {
    case "person":
      return [
        shadow,
        el("rect", { x, y, width: w, height: h, ...body }),
        el("circle", { cx: x + w / 2, cy: y, r: 11, ...body }),
      ];
    case "browser":
      return [
        shadow,
        el("rect", { x, y, width: w, height: h, ...body }),
        el("line", { x1: x, y1: y + 20, x2: x + w, y2: y + 20, stroke: body.stroke, "stroke-width": 1.5 }),
        ...[14, 28, 42].map((dx) => el("circle", { cx: x + dx, cy: y + 10, r: 3.5, fill: body.stroke })),
      ];
    case "storage": {
      const ry = 14;
      const d = `M${x},${y + ry} A${w / 2},${ry} 0 0 1 ${x + w},${y + ry} V${y + h - ry} A${w / 2},${ry} 0 0 1 ${x},${y + h - ry} Z`;
      return [
        el("path", { d, transform: `translate(${SHADOW},${SHADOW})`, fill: p.rule }),
        el("path", { d, ...body }),
        el("path", {
          d: `M${x},${y + ry} A${w / 2},${ry} 0 0 0 ${x + w},${y + ry}`,
          fill: "none",
          stroke: body.stroke,
          "stroke-width": 1.5,
        }),
      ];
    }
    case "queue": {
      const rx = 16;
      const d = `M${x + rx},${y} H${x + w - rx} A${rx},${h / 2} 0 0 1 ${x + w - rx},${y + h} H${x + rx} A${rx},${h / 2} 0 0 1 ${x + rx},${y} Z`;
      return [
        el("path", { d, transform: `translate(${SHADOW},${SHADOW})`, fill: p.rule }),
        el("path", { d, ...body }),
        el("path", {
          d: `M${x + w - rx},${y} A${rx},${h / 2} 0 0 0 ${x + w - rx},${y + h}`,
          fill: "none",
          stroke: body.stroke,
          "stroke-width": 1.5,
        }),
      ];
    }
    case "component":
      return [
        shadow,
        el("rect", { x, y, width: w, height: h, ...body }),
        ...[0.3, 0.55].map((k) =>
          el("rect", { x: x - 10, y: y + h * k, width: 20, height: 14, ...body, "stroke-width": 1.5 }),
        ),
      ];
    default:
      return [shadow, el("rect", { x, y, width: w, height: h, ...body })];
  }
}

function nodeOf(n: ArchNode, p: Palette): SvgElement {
  if (n.compound) {
    return el("g", { "data-node": n.id }, [
      el("rect", {
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        fill: "none",
        stroke: p.ruleStrong,
        "stroke-width": 2,
        "stroke-dasharray": "10 7",
      }),
      el(
        "text",
        { x: n.x + 18, y: n.y + 30, "font-size": TECH, "font-family": p.mono, fill: p.muted, "letter-spacing": 1 },
        [n.title.toUpperCase()],
      ),
    ]);
  }
  /* A queue's rounded ends and a cylinder's lid take room from the words. */
  const pad = n.shape === "queue" ? 30 : 12;
  const title = wrap(n.title, n.width - 2 * pad, TITLE, SANS_EM);
  const tech = n.technology ? wrap(n.technology, n.width - 2 * pad, TECH, MONO_EM) : [];
  const block = title.length * TITLE * 1.2 + (tech.length ? 10 + tech.length * TECH * 1.3 : 0);
  /* A cylinder's lid takes the top of its box: the words sit under it. */
  const lid = n.shape === "storage" ? 18 : 0;
  const top = n.y + lid + (n.height - lid - block) / 2 + TITLE * 0.85;
  const cx = n.x + n.width / 2;
  const titleFill = n.kind === "external" ? p.inkSoft : p.ink;
  return el("g", { "data-node": n.id }, [
    ...shapeOf(n, p),
    ...lines(title, cx, top, TITLE, 1.2, {
      "text-anchor": "middle",
      "font-family": p.sans,
      "font-weight": 700,
      fill: titleFill,
    }),
    ...lines(tech, cx, top + title.length * TITLE * 1.2 + 10, TECH, 1.3, {
      "text-anchor": "middle",
      "font-family": p.mono,
      fill: p.muted,
    }),
  ]);
}

/** The SVG path of LikeC4's edge points: a start, then cubic Bézier segments of three points each. */
export function pathOf(points: readonly Point[]): string {
  if (points.length < 2) return "";
  const [first, ...rest] = points;
  const parts = [`M${first[0]},${first[1]}`];
  if (rest.length % 3 === 0) {
    for (let i = 0; i < rest.length; i += 3)
      parts.push(`C${rest[i].join(",")} ${rest[i + 1].join(",")} ${rest[i + 2].join(",")}`);
  } else {
    for (const pt of rest) parts.push(`L${pt[0]},${pt[1]}`);
  }
  return parts.join(" ");
}

function arrowOf(points: readonly Point[], fill: string): SvgElement | null {
  if (points.length < 2) return null;
  const [tx, ty] = points[points.length - 1];
  const [fx, fy] = points[points.length - 2];
  const a = Math.atan2(ty - fy, tx - fx);
  const at = (da: number, r: number) =>
    `${(tx - r * Math.cos(a + da)).toFixed(1)},${(ty - r * Math.sin(a + da)).toFixed(1)}`;
  return el("polygon", { points: `${tx},${ty} ${at(0.42, 16)} ${at(-0.42, 16)}`, fill });
}

function edgeOf(e: ArchEdge, p: Palette, dynamic: boolean): SvgElement {
  const arrow = arrowOf(e.back ? [...e.points].reverse() : e.points, p.inkSoft);
  const children: SvgElement[] = [
    el("path", {
      d: pathOf(e.points),
      fill: "none",
      stroke: p.inkSoft,
      "stroke-width": 1.75,
      "stroke-dasharray": dynamic ? "0" : "7 5",
    }),
    ...(arrow ? [arrow] : []),
  ];
  if (e.label && e.labelBBox) {
    const text = dynamic && e.step !== null ? `${e.step}. ${e.label}` : e.label;
    const b = e.labelBBox;
    const width = b.width + 8;
    const rows = wrap(text, width, LABEL, MONO_EM);
    const height = rows.length * LABEL * 1.3 + 8;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    children.push(
      el("rect", { x: cx - width / 2 - 4, y: cy - height / 2, width: width + 8, height, fill: p.sheet, opacity: 0.92 }),
      ...lines(rows, cx, cy - height / 2 + 4 + LABEL * 0.95, LABEL, 1.3, {
        "text-anchor": "middle",
        "font-family": p.mono,
        fill: dynamic ? p.accent : p.inkSoft,
      }),
    );
  }
  return el("g", { "data-edge": e.id }, children);
}

/** One view as a tree of SVG elements: compounds first, then the edges, then the nodes and the labels on top. */
export function svgTree(view: ArchView, palette: Palette, opts: { standalone?: boolean } = {}): SvgElement {
  const m = 24;
  const { x, y, width, height } = view.bounds;
  const vb = `${x - m} ${y - m} ${width + 2 * m + SHADOW} ${height + 2 * m + SHADOW}`;
  const compounds = view.nodes.filter((n) => n.compound);
  const leaves = view.nodes.filter((n) => !n.compound);
  const edges = view.edges.map((e) => edgeOf(e, palette, view.dynamic));
  const labels = edges.map((g) => ({
    ...g,
    children: g.children.filter((c) => typeof c !== "string" && c.tag !== "path" && c.tag !== "polygon"),
  }));
  const strokes = edges.map((g) => ({
    ...g,
    children: g.children.filter((c) => typeof c !== "string" && (c.tag === "path" || c.tag === "polygon")),
  }));
  const attrs: SvgElement["attrs"] = { viewBox: vb, role: "img", "aria-label": view.title };
  if (opts.standalone) {
    Object.assign(attrs, {
      xmlns: "http://www.w3.org/2000/svg",
      width: width + 2 * m + SHADOW,
      height: height + 2 * m + SHADOW,
    });
  }
  return el("svg", attrs, [
    ...(opts.standalone
      ? [
          el("title", {}, [view.title]),
          el("rect", { x: x - m, y: y - m, width: "100%", height: "100%", fill: palette.paper }),
        ]
      : []),
    ...compounds.map((n) => nodeOf(n, palette)),
    ...strokes,
    ...leaves.map((n) => nodeOf(n, palette)),
    ...labels,
  ]);
}

const ESCAPES: Readonly<Record<string, string>> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/** The tree as SVG text (an exported file). */
export function svgString(tree: SvgElement | string): string {
  if (typeof tree === "string") return escape(tree);
  const attrs = Object.entries(tree.attrs)
    .map(([k, v]) => ` ${k}="${escape(String(v))}"`)
    .join("");
  return tree.children.length
    ? `<${tree.tag}${attrs}>${tree.children.map(svgString).join("")}</${tree.tag}>`
    : `<${tree.tag}${attrs}/>`;
}

/** The view in words, for a reader who cannot see the drawing: its elements, then its relations or its numbered steps. */
export function textVersion(view: ArchView): { elements: string[]; relations: string[] } {
  const title = new Map(view.nodes.map((n) => [n.id, n.title]));
  const elements = view.nodes
    .filter((n) => !n.compound)
    .map((n) =>
      [n.title, n.technology ? ` (${n.technology})` : "", n.description ? `: ${n.description}` : ""].join(""),
    );
  const relations = view.edges.map(
    (e) => `${title.get(e.source) ?? e.source} → ${title.get(e.target) ?? e.target}${e.label ? `: ${e.label}` : ""}`,
  );
  return { elements, relations };
}

/** The palette of one theme, read from the tokens' CSS (`:root, .theme-dark { … }` and `.theme-light { … }`). */
export function paletteFromCss(css: string, selector: string): Palette {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`tokens: no block ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  const value = (name: string) => {
    const m = new RegExp(`${name}:\\s*([^;]+);`).exec(block) ?? new RegExp(`${name}:\\s*([^;]+);`).exec(css);
    if (!m) throw new Error(`tokens: no ${name}`);
    return m[1].trim();
  };
  return Object.fromEntries(Object.entries(PALETTE_TOKENS).map(([k, token]) => [k, value(token)])) as Palette;
}
