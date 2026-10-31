import { defaultFor, defaultUrl } from "@krizaka/org";

/* The picture beside an author's name. An author who has his own picture keeps it everywhere his byline appears (founder
   2026-10-31: Oussama's is the Wu-sama « W » mark, `app/components/about/WuSamaMark.tsx`, the one his story page wears) — the
   default pictures are only for authors without one. Those come from the org JSON (`@krizaka/org`, Bunny, versioned):
   `defaultFor("person", seed)` picks one deterministically, so a person keeps the same picture on every Krizaka site
   (krizaka-internal#2002). The team has no person: its byline wears the company mark (Byline). Never a URL typed here. */
export const CUSTOM_PICTURES = ["oussama"] as const;

/** The authors whose story page exists (/about/): their name in a byline leads to it. */
export const STORY_AUTHORS = ["oussama"] as const;

export type AuthorPicture = { kind: "team" } | { kind: "custom"; author: string } | { kind: "default"; src: string };

export function authorPicture(author: string, size: number): AuthorPicture | null {
  if (author === "krizaka") return { kind: "team" };
  if ((CUSTOM_PICTURES as readonly string[]).includes(author)) return { kind: "custom", author };
  const item = defaultFor("person", author);
  return item ? { kind: "default", src: defaultUrl(item, size * 2, "webp") } : null;
}

export const hasStory = (author: string) => (STORY_AUTHORS as readonly string[]).includes(author);

/** The founder signs his chapters (the Signature block at their end, founder 2026-10-31). */
export const SIGNING_AUTHORS = ["oussama"] as const;
export const signs = (author: string) => (SIGNING_AUTHORS as readonly string[]).includes(author);
