/* POST /api/newsletter/subscribe {email, locale, captchaToken, website} — checks the CAPTCHA, then e-mails a signed
   confirmation link. Nothing is stored here: the address joins the list only when the link is opened (double opt-in).
   The answer is the same whether the address is new or already subscribed (nobody learns who is on the list). */
const nl = require("./newsletter.js");
const designed = require("./confirmation-emails.json"); // @krizaka/email, rendered once per language (scripts/bundle-functions.mjs)

/** True when Turnstile accepts the token (fails closed). The library is an ES module bundled next to this file; a
    dynamic import loads it from CommonJS on the platform's Node 18. */
let verifier = null; // kept while the container is warm: the library remembers the tokens it saw (replay)
async function captchaOk(args, env, fetchImpl, now) {
  const { createTurnstileVerifier } = await import("./turnstile.mjs");
  if (!verifier || verifier.fetchImpl !== fetchImpl || verifier.secret !== env.ABUSE_CAPTCHA_SECRET_KEY) {
    verifier = { fetchImpl, secret: env.ABUSE_CAPTCHA_SECRET_KEY, clock: { now }, check: createTurnstileVerifier({ secret: env.ABUSE_CAPTCHA_SECRET_KEY, now: () => new Date(verifier.clock.now), fetch: fetchImpl }) };
  }
  verifier.clock.now = now;
  return (await verifier.check({ token: args.captchaToken, remoteIp: nl.clientIp(args) })).ok;
}

async function handle(args = {}, env = process.env, fetchImpl = fetch, now = Date.now()) {
  if (args.__ow_method && args.__ow_method.toLowerCase() !== "post") return nl.json(405, { error: "method" });
  if (!nl.mailConfigured(env) || !nl.dbConfigured(env) || !nl.captchaConfigured(env)) return nl.json(503, { error: "unavailable" });
  // The honeypot: a field people never see. Filled = a robot; answer as if all went well.
  if (typeof args.website === "string" && args.website.trim()) return nl.json(202, { ok: true });
  const email = nl.normalizeEmail(args.email);
  if (!nl.validEmail(email)) return nl.json(400, { error: "invalid", field: "email" });
  const locale = nl.pickLocale(args.locale);
  if (!(await captchaOk(args, env, fetchImpl, now))) return nl.json(400, { error: "captcha" });
  try {
    await nl.sendEmail(nl.confirmationEmail({ email, locale }, env, now, designed), env, fetchImpl);
  } catch {
    return nl.json(502, { error: "send" });
  }
  return nl.json(202, { ok: true });
}
/* The platform calls main(args) — and may pass a context object second — so the injections (environment, database,
   fetch, clock) only go through handle(), which the tests call. */
const main = (args) => handle(args);
module.exports = { main, handle };
