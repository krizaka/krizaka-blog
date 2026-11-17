/* The cookieless visit count, the page's side (krizaka-internal#4122): one small request to our own function, `/api/visits/count`,
   with the page's path and the host the reader came from, nothing else. No cookie is sent or set (`credentials: "omit"`), no
   identifier exists, the answer is ignored and an error is swallowed: counting never touches reading. The function drops
   robots, keeps one row per (page, day, referrer domain) and stores nothing about the person. */

export const VISIT_URL = "/api/visits/count";

/** The host of a referrer, or "" when there is none, it is not a web address, or it is this site. Never the path nor the query. */
export function referrerHost(referrer: string, ownHost: string): string {
  try {
    const { protocol, hostname } = new URL(referrer);
    return (protocol === "https:" || protocol === "http:") && hostname !== ownHost ? hostname : "";
  } catch {
    return "";
  }
}

/** What leaves the page: the path (never the query or the fragment) and the referring host. */
export function visitPayload(pathname: string, referrer: string, ownHost: string): { path: string; ref: string } {
  return { path: pathname, ref: referrerHost(referrer, ownHost) };
}

/** Sends one count. Fire and forget: `keepalive` lets it outlive the page, the result is never read. */
export function sendVisit(pathname: string, referrer: string, ownHost: string): void {
  fetch(VISIT_URL, {
    method: "POST",
    credentials: "omit",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(visitPayload(pathname, referrer, ownHost)),
  }).catch(() => undefined);
}
