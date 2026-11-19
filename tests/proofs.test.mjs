import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROOFS_DIR, isSynced, proofProblems, readSources, sha256, sourceBytes } from "../scripts/proofs.mjs";
import {
  consoleSteps,
  kindCounts,
  parseRunCases,
  parseRunLog,
  publicText,
  RUN_KINDS,
  RunLogError,
} from "../lib/run-log.ts";

/* The chapter « two agent teams on the same files » (krizaka-internal#4433) shows a real run: its console and its figures are the
   proof's own files, copied by scripts/proofs.mjs, never typed. */
const root = new URL("..", import.meta.url).pathname;
const sources = readSources(root);
const proof = (id) => sources.proofs.find((p) => p.id === id);
const copy = (id) => readFileSync(join(root, PROOFS_DIR, proof(id).file), "utf8");

test("every copy is its source, byte for byte (its recorded sha256), and a pending proof has no copy", () => {
  assert.deepEqual(proofProblems(root, sources), []);
  assert.ok(isSynced(proof("overlap-live-2026-11-19-log")));
  assert.ok(isSynced(proof("overlap-live-2026-11-19-cases")));
});

/* With a checkout of the source's repository (APP_PROOFS_SOURCE), the copy is compared with the file at its commit. */
test(
  "the copy equals the file of the source repository at its commit",
  { skip: !process.env.APP_PROOFS_SOURCE },
  () => {
    for (const p of sources.proofs.filter(isSynced))
      assert.equal(
        sha256(sourceBytes(process.env.APP_PROOFS_SOURCE, p.commit, p.path)),
        sha256(readFileSync(join(root, PROOFS_DIR, p.file))),
        p.id,
      );
  },
);

test("a copy edited by hand is refused", () => {
  const dir = mkdtempSync(join(tmpdir(), "proofs-"));
  mkdirSync(join(dir, PROOFS_DIR), { recursive: true });
  const p = { id: "x", repo: "r", path: "a.json", commit: "a".repeat(40), file: "x.json", sha256: sha256("[1]\n") };
  writeFileSync(join(dir, PROOFS_DIR, "x.json"), "[2]\n");
  assert.match(proofProblems(dir, { proofs: [p] })[0], /never edit a copy by hand/);
  writeFileSync(join(dir, PROOFS_DIR, "x.json"), "[1]\n");
  assert.deepEqual(proofProblems(dir, { proofs: [p] }), []);
  const pending = { ...p, commit: null, sha256: null };
  assert.match(proofProblems(dir, { proofs: [pending] })[0], /has no commit/);
});

test("the run's log: 36 events, every kind known, in time order", () => {
  const events = parseRunLog(copy("overlap-live-2026-11-19-log"));
  assert.equal(events.length, 36);
  const times = events.map((e) => e.at);
  assert.deepEqual(times, [...times].sort());
  assert.ok(events.every((e) => RUN_KINDS.includes(e.kind)));
  assert.throws(
    () => parseRunLog('{"at":"2026-11-19T16:18:00Z","kind":"other","actor":"a","text":"t","tone":"muted"}'),
    RunLogError,
  );
});

test("the console shows every event once, under the part of the run it belongs to", () => {
  const events = parseRunLog(copy("overlap-live-2026-11-19-log"));
  const steps = consoleSteps(events, [
    { from: "16:44", command: "b" },
    { from: "16:18", command: "a" },
  ]);
  assert.deepEqual(
    steps.map((s) => s.command),
    ["a", "b"],
  );
  assert.equal(
    steps.reduce((n, s) => n + s.output.length, 0),
    events.length,
  );
  assert.match(steps[1].output[0].text, /^16:44 {2}guard {3}/);
  assert.throws(() => consoleSteps(events, [{ from: "17:00", command: "late" }]), RunLogError);
});

test("the console says our internals in public words and carries no amount", () => {
  const text = parseRunLog(copy("overlap-live-2026-11-19-log"))
    .map((e) => publicText(e.text))
    .join("\n");
  for (const internal of [/krizaka-internal/, /codegraph/, /pr-open/, /wip\//, /USD|\$/, /opus|sonnet/i])
    assert.doesNotMatch(text, internal);
  assert.equal(
    publicText("team B closes: success, 71 min, 81 turns, 1.50 USD"),
    "team B closes: success, 71 min, 81 turns",
  );
  assert.equal(publicText("the gate sees wip/verikora-4056 share a.ts"), "the gate sees the branch share a.ts");
});

test("the figures the chapter tells are the cases' own: S1 passed with 0 conflict, S2 met one", () => {
  const cases = parseRunCases(copy("overlap-live-2026-11-19-cases"));
  const byPr = Object.fromEntries(cases.map((c) => [c.pr, c]));
  assert.deepEqual([byPr[889].verdict, byPr[890].verdict, byPr[891].verdict], ["pass", "pass", "fail"]);
  assert.equal(byPr[889].conflicts + byPr[890].conflicts + byPr[889].rework_pushes + byPr[890].rework_pushes, 0);
  assert.deepEqual([byPr[891].conflicts, byPr[891].stacked_on, byPr[891].replayed], [1, 889, false]);
  const counts = kindCounts(parseRunLog(copy("overlap-live-2026-11-19-log")));
  assert.equal(counts.merged, 3);
  assert.equal(counts.conflict, 3);
});
