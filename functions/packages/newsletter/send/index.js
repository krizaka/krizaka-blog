/* POST /api/newsletter/send {slug, versions: {en?, fr?: {title, description, url}}} — Authorization: Bearer MAIL_SEND_TOKEN.
   Called by the Newsletter workflow (scripts/newsletter-send.mjs) once the post is live. The row newsletter_posts(slug)
   is the lock: a post is sent once, whatever calls this again. Answers {sent, failed, total} or {already: true}. */
const nl = require("./newsletter.js");

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const versionOk = (v) => v && typeof v.title === "string" && typeof v.description === "string" && typeof v.url === "string" && v.url.startsWith(`${nl.SITE}/`);

async function main(args = {}, env = process.env, sql = null, send = undefined) {
  if (String(args.__ow_method ?? "post").toLowerCase() !== "post") return nl.json(405, { error: "method" });
  const bearer = String(args.__ow_headers?.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!nl.sameSecret(bearer, env.MAIL_SEND_TOKEN)) return nl.json(401, { error: "unauthorized" });
  if (!nl.mailConfigured(env) || !nl.dbConfigured(env)) return nl.json(503, { error: "unavailable" });
  const versions = Object.fromEntries(nl.LOCALES.filter((l) => versionOk(args.versions?.[l])).map((l) => [l, args.versions[l]]));
  if (!SLUG.test(String(args.slug ?? "")) || !Object.keys(versions).length) return nl.json(400, { error: "invalid" });
  const db = sql ?? nl.connect(env);
  if (!(await nl.claimPost(db, args.slug))) return nl.json(200, { already: true });
  const result = await nl.sendPostToAll(db, versions, env, send);
  await nl.recordSent(db, args.slug, result.sent, result.failed);
  return nl.json(200, result);
}
exports.main = main;
