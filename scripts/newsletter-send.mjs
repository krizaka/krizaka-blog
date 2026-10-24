#!/usr/bin/env node
/* The "new post" e-mail. When a post goes from draft to published (or arrives published), each confirmed subscriber gets
   one e-mail, in their language when the post exists in it (else in the language it has).

   This script finds the posts a push published, waits until they are live, then asks the send action
   (POST /api/newsletter/send, Authorization: Bearer MAIL_SEND_TOKEN) to e-mail the list. The action claims the post first
   (table newsletter_posts, primary key = slug): a re-run, a manual run or two pushes in a row never send it twice.

   Usage (.github/workflows/newsletter.yml runs the first form after a push to main):
     node scripts/newsletter-send.mjs --before <sha> --after <sha>      the posts published by these commits
     node scripts/newsletter-send.mjs --slug <slug>                     one post, by hand (still at most once)
     node scripts/newsletter-send.mjs --slug <slug> --test-to <address> [--locale fr|en]
                                                                        ONE test e-mail to that address only: the list is
                                                                        not read and the post is not claimed
     add --dry-run to print what would be sent without calling the action.

   The e-mail itself is designed with @krizaka/email (scripts/newsletter-email.mjs) and rendered here, once per language. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { coverOf, withRenderedEmails } from "./newsletter-email.mjs";

const SITE = "https://blog.krizaka.com";
const LOCALES = ["en", "fr"];
const pageUrl = (locale, path) => `${SITE}${locale === "fr" ? "/fr" : ""}${path}`;
const FILE = /^content\/posts\/([a-z0-9]+(?:-[a-z0-9]+)*)\.(en|fr)\.mdx$/;
const ZERO = /^0+$/;

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const show = (rev, path) => {
  if (!rev || ZERO.test(rev)) return null;
  try {
    return git("show", `${rev}:${path}`);
  } catch {
    return null;
  }
};
const isPublished = (source) => source !== null && matter(source).data.draft !== true;

/** The slugs published between two commits: a post file that is published after and was a draft (or absent) before. */
export function publishedBetween(changed, read) {
  const slugs = new Set();
  for (const path of changed) {
    const m = path.match(FILE);
    if (!m) continue;
    if (isPublished(read.after(path)) && !isPublished(read.before(path))) slugs.add(m[1]);
  }
  return [...slugs].sort();
}

/** The post's versions at a commit: { en?, fr? } with title, description, the public URL and the cover. Only published
    versions. `media` is lib/media.json (the cover's e-mail-sized WebP). */
export function versionsOf(slug, read, media = {}, { drafts = false } = {}) {
  const out = {};
  for (const locale of LOCALES) {
    const source = read(`content/posts/${slug}.${locale}.mdx`);
    if (source === null || (!drafts && !isPublished(source))) continue;
    const { data } = matter(source);
    out[locale] = { title: String(data.title), description: String(data.description), url: pageUrl(locale, `/basics/${slug}/`) };
    const coverUrl = data.cover ? coverOf(media, data.cover) : undefined;
    if (coverUrl) Object.assign(out[locale], { coverUrl, coverAlt: typeof data.coverAlt === "string" ? data.coverAlt : undefined });
  }
  return out;
}

/** Asks the send action to e-mail the list; it answers {sent, failed, total} or {already: true}. */
export async function requestSend(slug, versions, token, fetchImpl = fetch, extra = {}) {
  const res = await fetchImpl(`${SITE}/api/newsletter/send`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ slug, versions, ...extra }) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`newsletter: the send action answered ${res.status} ${body.error ?? ""}`.trim());
  return body;
}

async function waitLive(url, minutes = 20) {
  for (let i = 0; i < minutes * 2; i++) {
    const res = await fetch(url, { redirect: "follow" }).catch(() => null);
    if (res?.ok) return true;
    await new Promise((r) => setTimeout(r, 30_000));
  }
  return false;
}

async function cli() {
  const arg = (n) => {
    const i = process.argv.indexOf(n);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const dry = process.argv.includes("--dry-run");
  const testTo = arg("--test-to");
  const before = arg("--before");
  const after = arg("--after") ?? "HEAD";
  let slugs;
  if (arg("--slug")) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(arg("--slug"))) throw new Error("newsletter: --slug must be a post's slug");
    slugs = [arg("--slug")];
  }
  else {
    // No "before" (a new branch, a forced history): nothing can be told apart, so nothing is sent automatically.
    if (!before || ZERO.test(before)) return console.log("newsletter: no previous commit to compare with; use --slug to send by hand");
    const changed = git("diff", "--name-only", before, after, "--", "content/posts").split("\n");
    slugs = publishedBetween(changed.filter(Boolean), { before: (p) => show(before, p), after: (p) => show(after, p) });
  }
  if (!slugs.length) return console.log("newsletter: no post published by these commits");
  const media = JSON.parse(readFileSync("lib/media.json", "utf8"));
  const token = process.env.MAIL_SEND_TOKEN;
  if (!dry && !token) throw new Error("newsletter: MAIL_SEND_TOKEN is not set");
  for (const slug of slugs) {
    /* A test may preview a draft (the working tree); a real send reads the published commit. */
    const read = testTo ? (p) => { try { return readFileSync(p, "utf8"); } catch { return null; } } : (p) => show(after, p);
    const versions = versionsOf(slug, read, media, { drafts: Boolean(testTo) });
    if (!Object.keys(versions).length) {
      console.log(`newsletter: ${slug} is not published at ${after}`);
      continue;
    }
    const rendered = await withRenderedEmails(versions);
    if (dry) {
      console.log(`newsletter (dry run): would send ${slug}`, JSON.stringify(Object.fromEntries(Object.entries(rendered).map(([l, v]) => [l, { title: v.title, url: v.url, subject: v.subject, cover: v.coverUrl ?? null, htmlBytes: v.html.length }]))));
      continue;
    }
    if (testTo) {
      const locale = arg("--locale");
      const r = await requestSend(slug, rendered, token, fetch, { test: testTo, locale });
      console.log(`newsletter: test e-mail of ${slug} (${r.locale}) sent to ${r.to} only`);
      continue;
    }
    for (const v of Object.values(versions)) if (!(await waitLive(v.url))) throw new Error(`newsletter: ${v.url} is not live after 20 minutes; nothing sent`);
    const r = await requestSend(slug, rendered, token);
    console.log(r.already ? `newsletter: ${slug} was already sent` : `newsletter: ${slug} sent to ${r.sent} of ${r.total}${r.failed ? ` (${r.failed} not reached)` : ""}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
