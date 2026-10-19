import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const json = (file: string) => JSON.parse(readFileSync(path.join(process.cwd(), file), "utf8")) as { version: string };

/** The installed version of @krizaka/ui, read at build (server only): what this site runs on. Empty when it cannot be read. */
export function uiVersion(): string {
  try {
    return json("node_modules/@krizaka/ui/package.json").version;
  } catch {
    return "";
  }
}

/** The version of this build: package.json, then the short commit (`APP_COMMIT_SHA` on the builder, else git). */
export function buildVersion(): string {
  const base = json("package.json").version;
  let sha = process.env.APP_COMMIT_SHA?.trim().slice(0, 7) ?? "";
  if (!sha) {
    try {
      sha = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      /* no git on the builder */
    }
  }
  return sha ? `${base}+${sha}` : base;
}
