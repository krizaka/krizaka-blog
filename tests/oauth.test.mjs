import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { makeState, checkState, authorizeUrl, resultPage } = require("../functions/packages/oauth/auth/oauth.js");
const { main: auth } = require("../functions/packages/oauth/auth/auth.js");
const { main: callback } = require("../functions/packages/oauth/callback/callback.js");

test("the two copies of the handshake are identical", async () => {
  const { readFileSync } = await import("node:fs");
  const a = readFileSync(new URL("../functions/packages/oauth/auth/oauth.js", import.meta.url), "utf8");
  const b = readFileSync(new URL("../functions/packages/oauth/callback/oauth.js", import.meta.url), "utf8");
  assert.equal(a, b);
});
test("a state signed with the secret is accepted while fresh, refused when forged, foreign or old", () => {
  const s = makeState("secret", 1_000_000);
  assert.ok(checkState(s, "secret", 1_000_000 + 5_000));
  assert.ok(!checkState(s, "other", 1_000_000 + 5_000));
  assert.ok(!checkState(s, "secret", 1_000_000 + 11 * 60_000));
  assert.ok(!checkState(s.slice(0, -1) + (s.endsWith("0") ? "1" : "0"), "secret", 1_000_000));
  assert.ok(!checkState(undefined, "secret"));
});
test("the authorize URL names the client, the scope and the state", () => {
  const u = new URL(authorizeUrl("cid", "st"));
  assert.equal(u.origin + u.pathname, "https://github.com/login/oauth/authorize");
  assert.equal(u.searchParams.get("client_id"), "cid");
  assert.equal(u.searchParams.get("state"), "st");
  assert.match(u.searchParams.get("scope"), /public_repo/);
});
test("the result page speaks Decap's protocol", () => {
  const html = resultPage("success", { token: "t", provider: "github" });
  assert.match(html, /authorization:github:success:/);
  assert.match(html, /authorizing:github/);
});
test("without its configuration the sign-in fails closed (503)", async () => {
  delete process.env.AUTH_GITHUB_CLIENT_ID;
  delete process.env.AUTH_GITHUB_CLIENT_SECRET;
  assert.equal(auth().statusCode, 503);
  assert.equal((await callback({ state: "x", code: "y" })).statusCode, 503);
});
test("the sign-in redirects to GitHub when configured; a callback with a bad state is refused", async () => {
  process.env.AUTH_GITHUB_CLIENT_ID = "cid";
  process.env.AUTH_GITHUB_CLIENT_SECRET = "sec";
  const r = auth();
  assert.equal(r.statusCode, 302);
  assert.match(r.headers.Location, /^https:\/\/github\.com\/login\/oauth\/authorize\?/);
  assert.equal((await callback({ state: "forged.state", code: "c" })).statusCode, 400);
  delete process.env.AUTH_GITHUB_CLIENT_ID;
  delete process.env.AUTH_GITHUB_CLIENT_SECRET;
});
