/* GET or POST /api/newsletter/unsubscribe?t=<token> — one click: the link at the bottom of every e-mail (GET, lands on
   /newsletter/unsubscribed/) and the mail client's own button (RFC 8058: POST with List-Unsubscribe=One-Click, answers
   200). The address is removed from the list; nothing about it is kept. */
const nl = require("./newsletter.js");

async function main(args = {}, env = process.env, fetchImpl = fetch) {
  const post = String(args.__ow_method ?? "get").toLowerCase() === "post";
  const who = nl.mailConfigured(env) ? nl.readToken(args.t, "u", env.MAIL_TOKEN_SECRET) : null;
  if (!who) return post ? nl.json(400, { error: "invalid" }) : nl.redirect(nl.pageUrl("en", "/newsletter/"));
  try {
    await nl.removeMember(who.email, env, fetchImpl);
  } catch {
    return post ? nl.json(502, { error: "list" }) : nl.redirect(nl.pageUrl(who.locale, "/newsletter/"));
  }
  return post ? nl.json(200, { ok: true }) : nl.redirect(nl.pageUrl(who.locale, "/newsletter/unsubscribed/"));
}
exports.main = main;
