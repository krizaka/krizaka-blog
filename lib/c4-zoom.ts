/* Pure data model for the C4Zoom interactive figure: a fictional system drawn at four C4 levels (Context, Containers,
   Components, Code). The user clicks to zoom in C1 → C4; the state is a path of selected parent node ids. The system
   is entirely FICTIONAL (a local florist booking tool, "Floricel") — it does not describe Krizaka. Pure data and state,
   no React, no I/O — tested in tests/c4-zoom.test.mjs. */

export const LEVELS = ["c1", "c2", "c3", "c4"] as const;
export type Level = (typeof LEVELS)[number];

export type C4Node = {
  id: string;
  label: string;
  tech?: string;
  /** True when this node has children to zoom into. */
  zoomable: boolean;
};

/** The state of the zoom: which level we are on and the ids of the selected parent nodes at each prior level. */
export type ZoomState = { level: Level; path: readonly string[] };

export const INITIAL_STATE: ZoomState = { level: "c1", path: [] };

/** The nodes visible at the current state. */
export function nodesAt(state: ZoomState): readonly C4Node[] {
  const { level, path } = state;
  if (level === "c1") return C1_NODES;
  if (level === "c2") return C2_NODES;
  if (level === "c3") return C3_BY_CONTAINER[path[1]] ?? [];
  if (level === "c4") return C4_BY_COMPONENT[path[2]] ?? [];
  return [];
}

/** Zoom into a node (move to the next level, adding nodeId to the path). */
export function zoomIn(state: ZoomState, nodeId: string): ZoomState {
  const idx = LEVELS.indexOf(state.level);
  if (idx >= LEVELS.length - 1) return state;
  return { level: LEVELS[idx + 1], path: [...state.path, nodeId] };
}

/** Go back one level. */
export function zoomOut(state: ZoomState): ZoomState {
  const idx = LEVELS.indexOf(state.level);
  if (idx <= 0) return state;
  return { level: LEVELS[idx - 1], path: state.path.slice(0, -1) };
}

/** The label of the selected parent at a given path index, for breadcrumb display. */
export function pathLabel(state: ZoomState, depth: number): string | undefined {
  const id = state.path[depth];
  if (!id) return undefined;
  if (depth === 0) return C1_NODES.find((n) => n.id === id)?.label;
  if (depth === 1) return C2_NODES.find((n) => n.id === id)?.label;
  if (depth === 2) {
    const parentId = state.path[1];
    return C3_BY_CONTAINER[parentId]?.find((n) => n.id === id)?.label;
  }
  return undefined;
}

// ── Fictional data: Floricel, a local florist booking tool ───────────────────

const C1_NODES: readonly C4Node[] = [
  { id: "floricel", label: "Floricel", tech: "Système principal", zoomable: true },
  { id: "client", label: "Client web", tech: "Navigateur", zoomable: false },
  { id: "catalogue", label: "Fournisseur catalogue", tech: "API externe", zoomable: false },
];

const C2_NODES: readonly C4Node[] = [
  { id: "web", label: "Application web", tech: "Next.js", zoomable: false },
  { id: "api", label: "API", tech: "Node.js", zoomable: true },
  { id: "worker", label: "Worker", tech: "Node.js (tâches)", zoomable: false },
  { id: "db", label: "Base de données", tech: "PostgreSQL", zoomable: false },
  { id: "cache", label: "Cache", tech: "Redis", zoomable: false },
];

const C3_BY_CONTAINER: Record<string, readonly C4Node[]> = {
  api: [
    { id: "auth", label: "Auth", tech: "JWT + sessions", zoomable: false },
    { id: "catalogue-svc", label: "Catalogue", tech: "REST interne", zoomable: false },
    { id: "bookings", label: "Réservations", tech: "Domaine métier", zoomable: true },
    { id: "notifications", label: "Notifications", tech: "E-mail + push", zoomable: false },
  ],
};

const C4_BY_COMPONENT: Record<string, readonly C4Node[]> = {
  bookings: [
    { id: "ctrl", label: "BookingController", tech: "Entrée HTTP", zoomable: false },
    { id: "svc", label: "BookingService", tech: "Logique métier", zoomable: false },
    { id: "repo", label: "BookingRepository", tech: "SQL (pg)", zoomable: false },
    { id: "pricing", label: "PricingEngine", tech: "Règles tarifaires", zoomable: false },
  ],
};

/** Problems in the C4 data: consistency checks. Empty when the data is sound. */
export function c4Problems(): string[] {
  const out: string[] = [];
  if (C1_NODES.length === 0) out.push("C1 has no nodes");
  if (C2_NODES.length === 0) out.push("C2 has no nodes");
  for (const [id, nodes] of Object.entries(C3_BY_CONTAINER)) {
    if (!C2_NODES.some((n) => n.id === id)) out.push(`C3 parent "${id}" not in C2`);
    if (nodes.length === 0) out.push(`C3 container "${id}" has no components`);
  }
  for (const [id, nodes] of Object.entries(C4_BY_COMPONENT)) {
    const allC3 = Object.values(C3_BY_CONTAINER).flat();
    if (!allC3.some((n) => n.id === id)) out.push(`C4 parent "${id}" not in any C3`);
    if (nodes.length === 0) out.push(`C4 component "${id}" has no code elements`);
  }
  const zoomableC2 = C2_NODES.filter((n) => n.zoomable).map((n) => n.id);
  for (const id of zoomableC2) {
    if (!C3_BY_CONTAINER[id]) out.push(`C2 node "${id}" is zoomable but has no C3 children`);
  }
  return out;
}
