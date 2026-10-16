/* The GitHub OAuth handshake of the editor (Decap CMS), as pure functions: a signed `state` (no session, no database)
   and the page that hands the token back to the editor window. Shared by the two actions (copied next to each). */
const crypto = require("node:crypto");

const sign = (nonce, secret) => crypto.createHmac("sha256", secret).update(nonce).digest("hex");
const makeState = (secret, now = Date.now()) => {
  const nonce = `${now.toString(36)}.${crypto.randomBytes(12).toString("hex")}`;
  return `${nonce}.${sign(nonce, secret)}`;
};
/** A state is valid when its signature matches and it is under ten minutes old. */
const checkState = (state, secret, now = Date.now()) => {
  if (typeof state !== "string") return false;
  const i = state.lastIndexOf(".");
  const nonce = state.slice(0, i);
  const given = Buffer.from(state.slice(i + 1));
  const expected = Buffer.from(sign(nonce, secret));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;
  const issued = parseInt(nonce.split(".")[0], 36);
  return Number.isFinite(issued) && now - issued < 10 * 60 * 1000 && now >= issued - 1000;
};
const authorizeUrl = (clientId, state) =>
  `https://github.com/login/oauth/authorize?${new URLSearchParams({ client_id: clientId, scope: "public_repo,user", state })}`;
/** The page Decap's popup runs: it tells the editor window the result (the protocol of Decap's GitHub backend). */
const resultPage = (status, content) => `<!doctype html><meta charset="utf-8"><title>Krizaka Blog — sign in</title><script>
(function () {
  function receive(e) { window.opener.postMessage("authorization:github:${status}:" + ${JSON.stringify(JSON.stringify(content))}, e.origin); }
  window.addEventListener("message", receive, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>`;

module.exports = { makeState, checkState, authorizeUrl, resultPage };
