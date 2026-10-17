/* POST /api/newsletter/subscribe {email, locale, captchaToken, website} — checks the CAPTCHA, then e-mails a signed
   confirmation link. Nothing is stored here: the address joins the list only when the link is opened (double opt-in).
   The answer is the same whether the address is new or already subscribed (nobody learns who is on the list). */
const nl = require("./newsletter.js");

async function main(args = {}, env = process.env, fetchImpl = fetch) {
  if (args.__ow_method && args.__ow_method.toLowerCase() !== "post") return nl.json(405, { error: "method" });
  if (!nl.mailConfigured(env) || !nl.captchaConfigured(env)) return nl.json(503, { error: "unavailable" });
  // The honeypot: a field people never see. Filled = a robot; answer as if all went well.
  if (typeof args.website === "string" && args.website.trim()) return nl.json(202, { ok: true });
  const email = nl.normalizeEmail(args.email);
  if (!nl.validEmail(email)) return nl.json(400, { error: "invalid", field: "email" });
  const locale = nl.pickLocale(args.locale);
  if (!(await nl.verifyCaptcha(args.captchaToken, nl.clientIp(args), env, fetchImpl))) return nl.json(400, { error: "captcha" });
  try {
    await nl.sendEmail(nl.confirmationEmail({ email, locale }, env), env, fetchImpl);
  } catch {
    return nl.json(502, { error: "send" });
  }
  return nl.json(202, { ok: true });
}
exports.main = main;
