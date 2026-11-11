/* « The basics »: the reading path. One ordered list of slugs, the easiest way in, 1 → N (krizaka-blog#229).
   A basic that is not on the path (a new one) comes last, in date order; one that is listed but not published is skipped. */
import type { Post } from "./posts";

export const BASICS_PATH = [
  "understanding-ai-before-you-start",
  "anatomy-of-an-ai-prompt",
  "ai-model-families-and-why-you-need-a-gpu",
  "is-that-ai-model-really-open-source",
] as const;

/** A basic: on the path, or a new post tagged `basics`. Every post lives under /basics/, so the path never takes them all:
    a weekly or an integration post is not a way in (krizaka-blog#320: seven rows, over the one screen of four). */
export const isBasic = (post: Pick<Post, "slug" | "tags">): boolean =>
  (BASICS_PATH as readonly string[]).includes(post.slug) || post.tags.includes("basics");

/** The posts split in two, each in its given order: the basics (the path) and the others. */
export function splitBasics<P extends Pick<Post, "slug" | "tags">>(posts: P[]): { basics: P[]; others: P[] } {
  return { basics: posts.filter(isBasic), others: posts.filter((p) => !isBasic(p)) };
}

export function basicsInOrder(posts: Post[]): Post[] {
  const rank = (slug: string) => {
    const i = (BASICS_PATH as readonly string[]).indexOf(slug);
    return i < 0 ? BASICS_PATH.length : i;
  };
  return [...posts].sort((a, b) => rank(a.slug) - rank(b.slug) || a.date.localeCompare(b.date));
}
