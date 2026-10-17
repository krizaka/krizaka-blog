/* GET /api/newsletter/confirm?t=<token> — the link of the confirmation e-mail. A valid, fresh token adds the address to
   the list (with the date and source of the consent) and lands on /newsletter/confirmed/; an expired or forged one lands
   on /newsletter/expired/, where the form can be filled again. */
const nl = require("./newsletter.js");

async function main(args = {}, env = process.env, fetchImpl = fetch, now = Date.now()) {
  if (!nl.mailConfigured(env)) return nl.redirect(nl.pageUrl("en", "/newsletter/expired/"));
  const who = nl.readToken(args.t, "c", env.MAIL_TOKEN_SECRET, now);
  if (!who) return nl.redirect(nl.pageUrl(nl.pickLocale(args.l), "/newsletter/expired/"));
  try {
    await nl.addMember(who, env, new Date(now), fetchImpl);
  } catch {
    return nl.redirect(nl.pageUrl(who.locale, "/newsletter/expired/"));
  }
  return nl.redirect(nl.pageUrl(who.locale, "/newsletter/confirmed/"));
}
exports.main = main;
