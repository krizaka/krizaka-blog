/* GET /api/newsletter/confirm?t=<token> — the link of the confirmation e-mail. A valid, fresh token adds the address to
   the list (with the date and source of the consent) and lands on /newsletter/confirmed/; clicking it again, or confirming an
   address that is already on the list, lands there too (idempotent). Each failure says what it is, never « expired » by
   default (krizaka-blog#192): only a genuine signed token past its date lands on /newsletter/expired/ (the form can be filled
   again); a forged or damaged one lands on /newsletter/link-invalid/; a missing configuration or an unreachable list answers
   503 « try again » and is logged, because the reader did nothing wrong. */
const nl = require("./newsletter.js");

const RETRY = {
  en: "The subscription could not be recorded just now. Your link is still valid: please open it again in a few minutes.",
  fr: "L'inscription n'a pas pu être enregistrée à l'instant. Votre lien est toujours valide : rouvrez-le dans quelques minutes.",
};

/** A page that is neither « expired » nor « invalid »: the service, not the link, is at fault. */
const unavailable = (lang) => ({
  statusCode: 503,
  headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "300" },
  body: `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Krizaka</title></head><body style="font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem"><p>${RETRY[lang]}</p></body></html>`,
});

async function handle(args = {}, env = process.env, sql = null, now = Date.now()) {
  const lang = nl.pickLocale(args.l);
  if (!nl.configured(env.MAIL_TOKEN_SECRET) || !nl.dbConfigured(env)) {
    console.error("newsletter confirm: not configured (MAIL_TOKEN_SECRET or DATABASE_URL missing)");
    return unavailable(lang);
  }
  const who = nl.readToken(args.t, "c", env.MAIL_TOKEN_SECRET, now);
  if (!who) {
    // The signature alone (the date set aside) tells a genuine link past its date from a forged or damaged one.
    const genuine = nl.readToken(args.t, "c", env.MAIL_TOKEN_SECRET, 0);
    return nl.redirect(nl.pageUrl(genuine ? genuine.locale : lang, genuine ? "/newsletter/expired/" : "/newsletter/link-invalid/"));
  }
  try {
    await nl.addSubscriber(sql ?? nl.connect(env), who, new Date(now));
  } catch (error) {
    console.error("newsletter confirm: the list refused the write:", error instanceof Error ? error.message : "unknown");
    return unavailable(who.locale);
  }
  return nl.redirect(nl.pageUrl(who.locale, "/newsletter/confirmed/"));
}
/* The platform calls main(args) — and may pass a context object second — so the injections (environment, database,
   fetch, clock) only go through handle(), which the tests call. */
const main = (args) => handle(args);
module.exports = { main, handle };
