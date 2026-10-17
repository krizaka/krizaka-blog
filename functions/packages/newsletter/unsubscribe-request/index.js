/* POST /api/newsletter/unsubscribe-request {email, locale, captchaToken, website} — the « Already subscribed? Unsubscribe »
   page. Checks the CAPTCHA and the limits, then e-mails a one-click unsubscribe link (signed, 48 h) **only if** the address
   is on the list. The answer is always the same neutral 202: nobody learns who is subscribed. */
const nl = require("./newsletter.js");

const NEUTRAL = { ok: true };

async function handle(args = {}, env = process.env, sql = null, fetchImpl = fetch, now = Date.now()) {
  if (String(args.__ow_method ?? "post").toLowerCase() !== "post") return nl.json(405, { error: "method" });
  if (!nl.mailConfigured(env) || !nl.dbConfigured(env) || !nl.captchaConfigured(env)) return nl.json(503, { error: "unavailable" });
  if (typeof args.website === "string" && args.website.trim()) return nl.json(202, NEUTRAL);
  const email = nl.normalizeEmail(args.email);
  if (!nl.validEmail(email)) return nl.json(400, { error: "invalid", field: "email" });
  const locale = nl.pickLocale(args.locale);
  const ip = nl.clientIp(args);
  if (!(await nl.verifyCaptcha(args.captchaToken, ip, env, fetchImpl))) return nl.json(400, { error: "captcha" });
  const db = sql ?? nl.connect(env);
  try {
    if (ip && !(await nl.underLimit(db, "ip", ip, nl.LIMIT_PER_IP_PER_HOUR, 3600))) return nl.json(429, { error: "rate_limited" });
    // Over the per-address limit, or not subscribed: the same answer, and nothing is sent.
    if (!(await nl.underLimit(db, "address", email, nl.LIMIT_PER_ADDRESS_PER_DAY, 86400))) return nl.json(202, NEUTRAL);
    if (!(await nl.isSubscribed(db, email))) return nl.json(202, NEUTRAL);
    await nl.sendEmail(nl.unsubscribeRequestEmail({ email, locale }, env, now), env, fetchImpl);
  } catch {
    return nl.json(502, { error: "unavailable" });
  }
  return nl.json(202, NEUTRAL);
}

const main = (args) => handle(args);
module.exports = { main, handle };
