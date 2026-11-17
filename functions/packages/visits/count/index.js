/* POST /api/visits/count — the cookieless visit count of the blog (krizaka-internal#4122, @krizaka/visits). The page sends its own
   path and the domain it was reached from; this action adds one to the row (site, page, day, referrer domain) and answers 204,
   whatever happens: a count that fails is never an error for the reader. Nothing is stored about the person: no cookie, no
   identifier, no address, no browser description (the agent header is read to refuse robots and dropped), no query string. The
   table is capped per day in the same statement. The database is krizaka_visits on the production cluster (its runtime role,
   through its pool): DATABASE_VISITS_URL + DATABASE_VISITS_CA_CERT. */
const SITE = "blog";
const OWN_HOSTS = ["blog.krizaka.com", "krizaka.com", "www.krizaka.com"];
const STATEMENT_TIMEOUT_MS = 3000; // @fixed: a count is one short statement; past three seconds the reader's page has moved on

const done = { statusCode: 204, headers: { "Cache-Control": "no-store" }, body: "" };
const present = (value) => typeof value === "string" && value.trim() !== "" && value.trim() !== "unset";

/** A query function that opens one connection, runs one statement and closes it (the pool is the database's own). */
function connect(env) {
  const { Client } = require("pg");
  const url = new URL(env.DATABASE_VISITS_URL);
  url.searchParams.delete("sslmode");
  const ca = present(env.DATABASE_VISITS_CA_CERT) ? env.DATABASE_VISITS_CA_CERT.replace(/\\n/g, "\n") : undefined;
  return async (text, params = []) => {
    const client = new Client({
      connectionString: url.toString(),
      connectionTimeoutMillis: 3000,
      statement_timeout: STATEMENT_TIMEOUT_MS,
      ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true },
    });
    await client.connect();
    try {
      return (await client.query(text, params)).rows;
    } finally {
      await client.end().catch(() => undefined);
    }
  };
}

const header = (args, name) => String((args.__ow_headers ?? {})[name] ?? "");
/** What the page sent: a path, and the referrer's host only (the page already cut it; anything else is cut here again). */
const referrerOf = (ref) => (typeof ref === "string" && ref !== "" ? `https://${ref.slice(0, 253)}/` : "");

async function handle(args = {}, env = process.env, query = null, now = new Date()) {
  try {
    if (String(args.__ow_method ?? "post").toLowerCase() !== "post" || !present(env.DATABASE_VISITS_URL)) return done;
    const { dbVisitStore, recordVisit } = await import("./visits.mjs");
    const store = dbVisitStore(query ?? connect(env));
    await recordVisit(
      store,
      { site: SITE, path: args.path, referer: referrerOf(args.ref), userAgent: header(args, "user-agent") },
      now,
      { ownHosts: OWN_HOSTS, onError: () => undefined },
    );
  } catch {
    // never an error for the reader
  }
  return done;
}
/* The platform calls main(args); the injections (environment, query, clock) only go through handle(), which the tests call. */
const main = (args) => handle(args);
module.exports = { main, handle };
