#!/usr/bin/env node
/* The run proofs a chapter shows (krizaka-internal#4433): files of krizaka-agents' docs/proofs/, copied byte for byte into
   content/proofs/ at a recorded commit, never typed by hand. content/proofs/sources.json says, per proof, where it comes from
   (repository, path, commit) and the sha256 of the copy. A proof whose run is not over has no commit and no copy yet: the chapter
   shows « en cours » until it is synced.
   Usage:
     node scripts/proofs.mjs sync <id> --from <krizaka-agents checkout> [--commit <sha>] [--path <docs/proofs/…>]
     node scripts/proofs.mjs check    (npm run lint: every copy matches its recorded hash; a pending proof has no copy) */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const PROOFS_DIR = "content/proofs";
const SOURCES = join(PROOFS_DIR, "sources.json");
// An absolute path, not a lookup in PATH: /usr/bin/git is where the CI runner and macOS both keep it (as newsletter-send.mjs).
const GIT = "/usr/bin/git";

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export const readSources = (root = ROOT) => JSON.parse(readFileSync(join(root, SOURCES), "utf8"));

/** A proof is synced when it names its commit; a pending one names none (its run is not over). */
export const isSynced = (proof) => typeof proof.commit === "string" && proof.commit.length > 0;

/** What is wrong with the copies against sources.json (empty when every copy is the recorded source, byte for byte). */
export function proofProblems(root = ROOT, sources = readSources(root)) {
  const problems = [];
  const ids = new Set();
  for (const p of sources.proofs) {
    if (ids.has(p.id)) problems.push(`proof ${p.id}: the id is used twice`);
    ids.add(p.id);
    const copy = join(root, PROOFS_DIR, p.file);
    if (!isSynced(p)) {
      if (existsSync(copy)) problems.push(`proof ${p.id}: ${p.file} exists but the proof has no commit (sync it)`);
      continue;
    }
    if (!/^[0-9a-f]{40}$/.test(p.commit)) problems.push(`proof ${p.id}: commit must be a full sha`);
    if (!existsSync(copy)) {
      problems.push(`proof ${p.id}: ${p.file} is missing (node scripts/proofs.mjs sync ${p.id} --from …)`);
      continue;
    }
    if (sha256(readFileSync(copy)) !== p.sha256)
      problems.push(
        `proof ${p.id}: ${p.file} is not the source of ${p.repo}@${p.commit.slice(0, 7)} — never edit a copy by hand`,
      );
  }
  return problems;
}

/** The source's bytes at its commit, read from a local checkout of its repository. */
export const sourceBytes = (checkout, commit, path) =>
  execFileSync(GIT, ["-C", checkout, "show", `${commit}:${path}`], { maxBuffer: 16 * 1024 * 1024 });

function sync(id, args) {
  const arg = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const from = arg("from");
  if (!from) throw new Error("sync needs --from <checkout of the proof's repository>");
  const sources = readSources();
  const proof = sources.proofs.find((p) => p.id === id);
  if (!proof) throw new Error(`no proof ${id} in ${SOURCES}`);
  const path = arg("path") ?? proof.path;
  if (!path) throw new Error(`proof ${id} names no path yet: pass --path docs/proofs/…`);
  const commit = execFileSync(GIT, ["-C", from, "rev-parse", arg("commit") ?? "origin/main"], {
    encoding: "utf8",
  }).trim();
  const bytes = sourceBytes(from, commit, path);
  writeFileSync(join(ROOT, PROOFS_DIR, proof.file), bytes);
  Object.assign(proof, { path, commit, sha256: sha256(bytes) });
  writeFileSync(join(ROOT, SOURCES), `${JSON.stringify(sources, null, 2)}\n`);
  console.log(`proofs: ${id} ← ${proof.repo}@${commit.slice(0, 7)}:${path} (${bytes.length} bytes)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, id, ...rest] = process.argv.slice(2);
  if (cmd === "sync") sync(id, rest);
  else if (cmd === "check") {
    const problems = proofProblems();
    if (problems.length) {
      console.error(problems.join("\n"));
      process.exit(1);
    }
    console.log(`proofs: ${readSources().proofs.length} proofs, every copy is its source`);
  } else {
    console.error("usage: proofs.mjs sync <id> --from <checkout> [--commit <sha>] [--path <path>] | check");
    process.exit(2);
  }
}
