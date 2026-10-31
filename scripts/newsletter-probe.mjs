#!/usr/bin/env node
/* Post-deploy guard of the newsletter's database path: asks the live send action to claim a sentinel slug twice and give
   it back (nobody is e-mailed). Fails with the action's status and error code (never a secret) when the env, the CA
   certificate, the role's grants or the table are wrong — the failure that once only showed at the first real send.
   Usage: MAIL_SEND_TOKEN=… node scripts/newsletter-probe.mjs [--site https://blog.krizaka.com] */
const site = process.argv.includes("--site") ? process.argv[process.argv.indexOf("--site") + 1] : "https://blog.krizaka.com";
const bearer = process.env.MAIL_SEND_TOKEN;
if (!bearer) throw new Error("newsletter-probe: MAIL_SEND_TOKEN is required");
const res = await fetch(`${site}/api/newsletter/send`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
  body: JSON.stringify({ probe: true }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok || body.probe !== true) throw new Error(`newsletter-probe: the database claim failed: ${res.status} ${body.error ?? ""} ${body.code ?? ""}`.trim());
console.log("newsletter-probe: the database claim works (claimed, refused twice, released)");
