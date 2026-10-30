/* « The basics »: the reading path. One ordered list of slugs, the easiest way in, 1 → N (krizaka-blog#229).
   A basic that is not on the path (a new one) comes last, in date order; one that is listed but not published is skipped. */
import type { Post } from "./posts";

export const BASICS_PATH = [
  "understanding-ai-before-you-start",
  "anatomy-of-an-ai-prompt",
  "ai-model-families-and-why-you-need-a-gpu",
  "is-that-ai-model-really-open-source",
  "payments-and-high-risk-industries",
] as const;

export function basicsInOrder(posts: Post[]): Post[] {
  const rank = (slug: string) => {
    const i = (BASICS_PATH as readonly string[]).indexOf(slug);
    return i < 0 ? BASICS_PATH.length : i;
  };
  return [...posts].sort((a, b) => rank(a.slug) - rank(b.slug) || a.date.localeCompare(b.date));
}
