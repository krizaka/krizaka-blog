#!/usr/bin/env node
/* `npm run build`: the site into out/. When APP_PREVIEW_TOKEN is set (a build-time secret of the app, never in the repository),
   the same site is built a second time with the drafts in, under a private path — out/preview/<token>/ — and out/ gets that
   folder too: not linked, not in the sitemap or the feeds of the real site, noindex, for the editors to read drafts before
   they are published. Without the token this is plain `next build` + postbuild. */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const raw = process.env.APP_PREVIEW_TOKEN;
const token = raw === "unset" ? "" : raw;
if (token && !/^[A-Za-z0-9]{16,64}$/.test(token)) {
  console.error("APP_PREVIEW_TOKEN must be 16 to 64 letters or digits");
  process.exit(1);
}
run("npx", ["next", "build"], { APP_PREVIEW_PATH: "" });
run("node", ["scripts/postbuild.mjs"]);
if (token) {
  rmSync("out-main", { recursive: true, force: true });
  cpSync("out", "out-main", { recursive: true });
  run("npx", ["next", "build"], { APP_SHOW_DRAFTS: "1", APP_PREVIEW_PATH: `/preview/${token}` });
  run("node", ["scripts/postbuild.mjs"]);
  mkdirSync(`out-main/preview`, { recursive: true });
  cpSync("out", `out-main/preview/${token}`, { recursive: true });
  rmSync("out", { recursive: true, force: true });
  cpSync("out-main", "out", { recursive: true });
  rmSync("out-main", { recursive: true, force: true });
  console.log(`preview: out/preview/<token>/ (${token.length} characters)`);
}
