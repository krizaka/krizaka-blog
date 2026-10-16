/* GET /api/oauth/callback — GitHub returns here with a code: it is exchanged for a token, handed to the editor window. */
const { checkState, resultPage } = require("./oauth.js");

async function main(args) {
  const id = process.env.AUTH_GITHUB_CLIENT_ID;
  const secret = process.env.AUTH_GITHUB_CLIENT_SECRET;
  const html = (status, body, code = 200) => ({ statusCode: code, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }, body: resultPage(status, body) });
  if (!id || !secret) return html("error", { message: "not configured" }, 503);
  if (!checkState(args.state, secret)) return html("error", { message: "invalid state" }, 400);
  if (!args.code) return html("error", { message: "no code" }, 400);
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: id, client_secret: secret, code: args.code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) return html("error", { message: data.error || "no token" }, 400);
  return html("success", { token: data.access_token, provider: "github" });
}
exports.main = main;
