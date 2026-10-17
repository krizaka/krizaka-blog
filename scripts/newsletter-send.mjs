#!/usr/bin/env node
/* The "new post" e-mail. When a post goes from draft to published (or arrives published), each confirmed subscriber gets
   one e-mail, in their language when the post exists in it (else in the language it has).

   Never twice: before sending anything for a post, the script pushes the git tag `newsletter/<slug>` to origin. A tag
   cannot be created twice, so a second run (a re-run of the workflow, a manual run, two pushes in a row) finds it and
   sends nothing. If the sending fails after the tag, nothing is retried automatically: the log says who was not reached.

   Usage (.github/workflows/newsletter.yml runs the first form after a push to main):
     node scripts/newsletter-send.mjs --before <sha> --after <sha>      the posts published by these commits
     node scripts/newsletter-send.mjs --slug <slug>                     one post, by hand (still at most once)
     add --dry-run to print what would be sent without tagging or sending.
   Needs MAIL_API_KEY, MAIL_DOMAIN, MAIL_FROM, MAIL_NEWSLETTER_LIST, MAIL_TOKEN_SECRET (+ MAIL_API_URL, MAIL_SENDER_ADDRESS). */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";

const require = createRequire(import.meta.url);
const nl = require("../functions/packages/newsletter/subscribe/newsletter.js");
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

/** The post's versions at a commit: { en?, fr? } with title, description and the public URL. Only published versions. */
export function versionsOf(slug, read) {
  const out = {};
  for (const locale of nl.LOCALES) {
    const source = read(`content/posts/${slug}.${locale}.mdx`);
    if (!isPublished(source)) continue;
    const { data } = matter(source);
    out[locale] = { title: String(data.title), description: String(data.description), url: nl.pageUrl(locale, `/posts/${slug}/`) };
  }
  return out;
}

/** The version a subscriber gets: their language, else the other one. */
export const versionFor = (versions, locale) => versions[locale] ?? versions[nl.LOCALES.find((l) => versions[l])];

/** Claims the post: true the first time, false when the tag already exists on origin. */
export function claim(slug, run = git) {
  const tag = `newsletter/${slug}`;
  try {
    run("tag", tag);
  } catch {
    /* a local tag from an earlier fetch: the push decides */
  }
  try {
    run("push", "origin", `refs/tags/${tag}`);
    return true;
  } catch (e) {
    // Refused: either the tag is already on origin (sent before) or the push itself failed (rights, network) — ask origin.
    const remote = run("ls-remote", "--tags", "origin", `refs/tags/${tag}`);
    if (String(remote).trim()) return false;
    throw e;
  }
}

async function waitLive(url, minutes = 20) {
  for (let i = 0; i < minutes * 2; i++) {
    const res = await fetch(url, { redirect: "follow" }).catch(() => null);
    if (res?.ok) return true;
    await new Promise((r) => setTimeout(r, 30_000));
  }
  return false;
}

export async function sendPost(slug, versions, env, { members, send, log = console.log }) {
  let sent = 0;
  const failed = [];
  for (const m of members) {
    const post = versionFor(versions, m.locale);
    try {
      await send(nl.newPostEmail({ email: m.email, locale: m.locale, consentedAt: m.consentedAt }, post, env), env);
      sent++;
    } catch (e) {
      failed.push(`${m.email.replace(/^(.).*@/, "$1…@")}: ${e.message}`);
    }
  }
  log(`newsletter: ${slug} sent to ${sent} of ${members.length}${failed.length ? `; not reached: ${failed.join(", ")}` : ""}`);
  return { sent, failed };
}

async function cli() {
  const arg = (n) => {
    const i = process.argv.indexOf(n);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const dry = process.argv.includes("--dry-run");
  const before = arg("--before");
  const after = arg("--after") ?? "HEAD";
  let slugs;
  if (arg("--slug")) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(arg("--slug"))) throw new Error("newsletter: --slug must be a post's slug");
    slugs = [arg("--slug")];
  }
  else {
    const changed = ZERO.test(before ?? "0") ? git("ls-tree", "-r", "--name-only", after, "content/posts").split("\n") : git("diff", "--name-only", before, after, "--", "content/posts").split("\n");
    slugs = publishedBetween(changed.filter(Boolean), { before: (p) => show(before, p), after: (p) => show(after, p) });
  }
  if (!slugs.length) return console.log("newsletter: no post published by these commits");
  const env = process.env;
  if (!dry && !nl.mailConfigured(env)) throw new Error("newsletter: MAIL_* is not configured");
  for (const slug of slugs) {
    const versions = versionsOf(slug, (p) => show(after, p));
    if (!Object.keys(versions).length) {
      console.log(`newsletter: ${slug} is not published at ${after}`);
      continue;
    }
    if (dry) {
      console.log(`newsletter (dry run): would send ${slug}`, JSON.stringify(versions));
      continue;
    }
    for (const v of Object.values(versions)) if (!(await waitLive(v.url))) throw new Error(`newsletter: ${v.url} is not live after 20 minutes; nothing sent`);
    if (!claim(slug)) {
      console.log(`newsletter: ${slug} was already sent (tag newsletter/${slug} exists)`);
      continue;
    }
    const members = await nl.listMembers(env);
    await sendPost(slug, versions, env, { members, send: (m, e) => nl.sendEmail(m, e) });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
