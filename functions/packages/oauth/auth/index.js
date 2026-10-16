/* GET /api/oauth/auth — sends the editor to GitHub to sign in. Needs AUTH_GITHUB_CLIENT_ID and AUTH_GITHUB_CLIENT_SECRET. */
const { makeState, authorizeUrl } = require("./oauth.js");

function main() {
  const id = process.env.AUTH_GITHUB_CLIENT_ID;
  const secret = process.env.AUTH_GITHUB_CLIENT_SECRET;
  if (!id || !secret) return { statusCode: 503, headers: { "Content-Type": "text/plain" }, body: "The editor's sign-in is not configured." };
  return { statusCode: 302, headers: { Location: authorizeUrl(id, makeState(secret)), "Cache-Control": "no-store" }, body: "" };
}
exports.main = main;
