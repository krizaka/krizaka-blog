/* Pure data model for the CockpitTour interactive figure: the cockpit's screens grouped as its menu, each with a small
   simulated snapshot so the figure renders without touching the real cockpit. All values are SIMULATED. Pure data, no
   React, no I/O — tested in tests/cockpit-tour.test.mjs. */

export const SCREEN_IDS = [
  "today",
  "board",
  "costs",
  "automation",
  "company",
  "business",
  "organisation",
  "architecture",
  "conformance",
  "quality",
  "workspace",
  "documents",
  "storage",
  "commands",
  "secrets",
  "kpi",
  "community",
] as const;
export type ScreenId = (typeof SCREEN_IDS)[number];

export const GROUP_IDS = ["pilotage", "entreprise", "produits", "machine"] as const;
export type GroupId = (typeof GROUP_IDS)[number];

export type Screen = { id: ScreenId; group: GroupId };

export const SCREENS: readonly Screen[] = [
  { id: "today", group: "pilotage" },
  { id: "board", group: "produits" },
  { id: "costs", group: "entreprise" },
  { id: "automation", group: "produits" },
  { id: "company", group: "entreprise" },
  { id: "business", group: "entreprise" },
  { id: "organisation", group: "produits" },
  { id: "architecture", group: "produits" },
  { id: "conformance", group: "produits" },
  { id: "quality", group: "produits" },
  { id: "workspace", group: "machine" },
  { id: "documents", group: "pilotage" },
  { id: "storage", group: "machine" },
  { id: "commands", group: "machine" },
  { id: "secrets", group: "machine" },
  { id: "kpi", group: "produits" },
  { id: "community", group: "entreprise" },
];

export type MockRow = { label: string; value: string };

/** Simulated snapshot for each screen: 2–3 rows of fictional data. */
export const MOCK_DATA: Record<ScreenId, readonly MockRow[]> = {
  today: [
    { label: "Actions", value: "2" },
    { label: "Bloqueurs", value: "1" },
    { label: "Décisions", value: "3" },
  ],
  board: [
    { label: "Sessions", value: "5" },
    { label: "Pull requests", value: "8" },
    { label: "Bloquées", value: "1" },
  ],
  costs: [
    { label: "Aujourd'hui", value: "—" },
    { label: "Cette semaine", value: "—" },
    { label: "Modèles actifs", value: "3" },
  ],
  automation: [
    { label: "Tâches actives", value: "4" },
    { label: "Dernière exécution", value: "il y a 12 min" },
    { label: "Prochaine", value: "dans 48 min" },
  ],
  company: [
    { label: "Statut légal", value: "Actif" },
    { label: "Documents", value: "12" },
    { label: "Dernière mise à jour", value: "2026-11-01" },
  ],
  business: [
    { label: "Devis ouverts", value: "2" },
    { label: "En attente de réponse", value: "1" },
    { label: "Acceptés ce mois", value: "1" },
  ],
  organisation: [
    { label: "Membres", value: "3" },
    { label: "Équipes actives", value: "6" },
    { label: "Accès revus", value: "2026-11-01" },
  ],
  architecture: [
    { label: "Niveau affiché", value: "C2 — Conteneurs" },
    { label: "Nœuds", value: "7" },
    { label: "Liens", value: "9" },
  ],
  conformance: [
    { label: "Règles actives", value: "24" },
    { label: "Conformes", value: "22" },
    { label: "En attente", value: "2" },
  ],
  quality: [
    { label: "Score", value: "A" },
    { label: "Issues", value: "3" },
    { label: "Dette technique", value: "12 min" },
  ],
  workspace: [
    { label: "Worktrees actifs", value: "3" },
    { label: "Pull requests ouvertes", value: "5" },
    { label: "Branches obsolètes", value: "1" },
  ],
  documents: [
    { label: "Fichiers indexés", value: "147" },
    { label: "Ajoutés cette semaine", value: "4" },
    { label: "Cherchables", value: "147" },
  ],
  storage: [
    { label: "Buckets", value: "2" },
    { label: "Objets", value: "1 843" },
    { label: "Taille totale", value: "2,4 Go" },
  ],
  commands: [
    { label: "Commandes disponibles", value: "8" },
    { label: "Dernière exécutée", value: "npm run process" },
    { label: "Statut", value: "Terminée" },
  ],
  secrets: [
    { label: "Noms de clés (cloud)", value: "14" },
    { label: "Noms de clés (dev)", value: "9" },
    { label: "Valeurs visibles", value: "0" },
  ],
  kpi: [
    { label: "Étoiles GitHub", value: "12" },
    { label: "Téléchargements npm", value: "84" },
    { label: "Couverture", value: "91 %" },
  ],
  community: [
    { label: "Abonnés", value: "47" },
    { label: "Nouveaux ce mois", value: "6" },
    { label: "Langues", value: "FR / EN" },
  ],
};

export type ScreenGroup = { id: GroupId; screens: readonly Screen[] };

export const GROUPS: readonly ScreenGroup[] = GROUP_IDS.map((id) => ({
  id,
  screens: SCREENS.filter((s) => s.group === id),
}));

/** Problems in the tour data: every screen in SCREENS must be in a group, every group must have screens, and every
    SCREEN_ID must have a mock. Empty when the data is sound. */
export function tourProblems(): string[] {
  const out: string[] = [];
  for (const id of SCREEN_IDS) {
    if (!SCREENS.some((s) => s.id === id)) out.push(`screen "${id}" missing from SCREENS`);
    if (!MOCK_DATA[id]) out.push(`screen "${id}" missing from MOCK_DATA`);
  }
  for (const g of GROUPS) {
    if (g.screens.length === 0) out.push(`group "${g.id}" has no screens`);
  }
  return out;
}
