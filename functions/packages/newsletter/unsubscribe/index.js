/* GET or POST /api/newsletter/unsubscribe?t=<token> — one click: the link at the bottom of every e-mail (GET, lands on
   /newsletter/unsubscribed/) and the mail client's own button (RFC 8058: POST with List-Unsubscribe=One-Click, answers
   200). The row is deleted; nothing about the address is kept. */
const nl = require("./newsletter.js");

async function handle(args = {}, env = process.env, sql = null) {
  const post = String(args.__ow_method ?? "get").toLowerCase() === "post";
  const ready = nl.configured(env.MAIL_TOKEN_SECRET) && nl.dbConfigured(env);
  const who = ready ? nl.readToken(args.t, "u", env.MAIL_TOKEN_SECRET) : null;
  if (!who) return post ? nl.json(400, { error: "invalid" }) : nl.redirect(nl.pageUrl(nl.pickLocale(args.l), "/newsletter/link-invalid/"));
  try {
    await nl.removeSubscriber(sql ?? nl.connect(env), who.email);
  } catch {
    return post ? nl.json(502, { error: "list" }) : nl.redirect(nl.pageUrl(who.locale, "/newsletter/link-invalid/"));
  }
  return post ? nl.json(200, { ok: true }) : nl.redirect(nl.pageUrl(who.locale, "/newsletter/unsubscribed/"));
}
/* The platform calls main(args) — and may pass a context object second — so the injections (environment, database,
   fetch, clock) only go through handle(), which the tests call. */
const main = (args) => handle(args);
module.exports = { main, handle };
