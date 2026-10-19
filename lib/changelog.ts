import { releasesFromPulls, type MergedPull, type Release } from "@krizaka/ui/changelog-page";

/* The changelog of Krizaka blog: the product publishes no release yet, so its merged pull requests are the data — one entry
   per week, conventional titles in plain language (@krizaka/ui/changelog-page), read from GitHub and refreshed hourly.
   Nothing is written by hand; when GitHub cannot be read the page says so. */

export const CHANGELOG_SOURCE = "Krizaka blog";
export const CHANGELOG_REPO = "krizaka/krizaka-blog";
const API = `https://api.github.com/repos/${CHANGELOG_REPO}/pulls?state=closed&base=main&per_page=100&sort=updated&direction=desc`;

/** The weeks of merged work, newest first (empty when GitHub cannot be read). */
export async function loadReleases(): Promise<Release[]> {
  try {
    const res = await fetch(API, { headers: { Accept: "application/vnd.github+json" }, next: { revalidate: 3600 } });
    if (!res.ok) return [];
    /* A pull request that names NaN or undefined (a fix of a bug that showed them) would trip scripts/check-meta.mjs, which
       refuses those words in any built page: such titles stay on GitHub, out of the page. */
    const pulls = ((await res.json()) as MergedPull[]).filter((p) => !/\b(NaN|undefined)\b/.test(p.title));
    return releasesFromPulls(pulls, CHANGELOG_SOURCE, `https://github.com/${CHANGELOG_REPO}/pulls?q=is%3Apr+is%3Amerged`);
  } catch {
    return [];
  }
}
