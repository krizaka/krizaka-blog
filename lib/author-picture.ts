import { defaultFor, defaultUrl } from "@krizaka/org";

/* The picture beside an author's name (krizaka-internal#2002). The company's default pictures come from the org JSON
   (`@krizaka/org`, Bunny, versioned): `defaultFor("person", seed)` picks one deterministically, so a person keeps the same
   picture on every Krizaka site. The team has no person: its byline wears the company mark (Byline). Never a URL typed here. */
export function authorPicture(author: string, size: number): string | null {
  if (author === "krizaka") return null;
  const item = defaultFor("person", author);
  return item ? defaultUrl(item, size * 2, "webp") : null;
}
