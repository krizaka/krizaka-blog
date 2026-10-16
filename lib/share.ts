/* Sharing a post: plain links to each network's own share page — no script, no pixel, no counter, nothing loaded from
   them until the reader clicks. The words (network names) are messages; this module keeps the addresses only. */

export type ShareTarget = "x" | "linkedin" | "hackernews" | "reddit" | "email";

/** The networks, in the order the bar shows them (developers first: X, LinkedIn, Hacker News, Reddit; then e-mail). */
export const SHARE_TARGETS: readonly ShareTarget[] = ["x", "linkedin", "hackernews", "reddit", "email"];

const enc = encodeURIComponent;

/** The share address of a post on one network. `url` is the post's canonical URL, `title` its title. */
export function shareUrl(target: ShareTarget, url: string, title: string): string {
  switch (target) {
    case "x":
      return `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;
    case "hackernews":
      return `https://news.ycombinator.com/submitlink?u=${enc(url)}&t=${enc(title)}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`;
    case "email":
      return `mailto:?subject=${enc(title)}&body=${enc(`${title}\n\n${url}`)}`;
  }
}

/** Every share address of a post, in bar order. */
export function shareLinks(url: string, title: string): { target: ShareTarget; href: string }[] {
  return SHARE_TARGETS.map((target) => ({ target, href: shareUrl(target, url, title) }));
}
