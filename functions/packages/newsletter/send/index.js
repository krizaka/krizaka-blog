/* POST /api/newsletter/send {slug, versions: {en?, fr?: {title, description, url, subject?, html?, text?}}, test?: address, locale?} — Authorization: Bearer MAIL_SEND_TOKEN.
   `html` / `text` / `subject` are the designed e-mail rendered by the workflow with @krizaka/email (placeholders for the
   reader's unsubscribe token and the postal address, filled here); without them the plain e-mail is sent.
   `test: address` sends ONE e-mail, to that address only, with « [Test] » in the subject: it never touches the list and never
   claims the post (so the real send still happens once, later).
   Called by the Newsletter workflow (scripts/newsletter-send.mjs) once the post is live. The row newsletter_posts(slug)
   is the lock: a post is sent once, whatever calls this again. Answers {sent, failed, total} or {already: true}. */
const nl = require("./newsletter.js");

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_HTML = 200_000;
const optionalText = (x, max) => x === undefined || (typeof x === "string" && x.length > 0 && x.length <= max);
const versionOk = (v) =>
  v && typeof v.title === "string" && typeof v.description === "string" && typeof v.url === "string" && v.url.startsWith(`${nl.SITE}/`) && optionalText(v.subject, 300) && optionalText(v.html, MAX_HTML) && optionalText(v.text, MAX_HTML) && (v.html === undefined) === (v.text === undefined);

async function handle(args = {}, env = process.env, sql = null, send = undefined) {
  if (String(args.__ow_method ?? "post").toLowerCase() !== "post") return nl.json(405, { error: "method" });
  const bearer = String(args.__ow_headers?.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!nl.sameSecret(bearer, env.MAIL_SEND_TOKEN)) return nl.json(401, { error: "unauthorized" });
  const isTest = args.test !== undefined;
  if (!nl.mailConfigured(env) || (!isTest && !nl.dbConfigured(env))) return nl.json(503, { error: "unavailable" });
  const versions = Object.fromEntries(nl.LOCALES.filter((l) => versionOk(args.versions?.[l])).map((l) => [l, args.versions[l]]));
  if (!SLUG.test(String(args.slug ?? "")) || !Object.keys(versions).length) return nl.json(400, { error: "invalid" });
  if (isTest) {
    const to = nl.normalizeEmail(args.test);
    if (!nl.validEmail(to)) return nl.json(400, { error: "invalid" });
    const locale = versions[args.locale] ? args.locale : Object.keys(versions)[0];
    const message = nl.newPostEmail({ email: to, locale, consentedAt: null }, versions[locale], env);
    try {
      await (send ?? nl.sendEmail)({ ...message, subject: `[Test] ${message.subject}` }, env);
    } catch {
      return nl.json(502, { error: "mail" });
    }
    return nl.json(200, { test: true, sent: 1, to, locale });
  }
  const db = sql ?? nl.connect(env);
  if (!(await nl.claimPost(db, args.slug))) return nl.json(200, { already: true });
  const result = await nl.sendPostToAll(db, versions, env, send);
  await nl.recordSent(db, args.slug, result.sent, result.failed);
  return nl.json(200, result);
}
/* The platform calls main(args) — and may pass a context object second — so the injections (environment, database,
   fetch, clock) only go through handle(), which the tests call. */
const main = (args) => handle(args);
module.exports = { main, handle };
