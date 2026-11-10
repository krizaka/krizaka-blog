// node --test — a download in the CI survives a hiccup of the host (krizaka-internal#2962: GitHub answered 504 on epubcheck after eight
// minutes of Verify, main went red and the repository froze). This file runs in the first minute of the job, not after the build.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const ROOT = join(import.meta.dirname, "..");

/** The curl commands of a shell text that reach a remote host and do not retry. A local probe (localhost) has its own wait loop. */
export function unretriedDownloads(text) {
  return text
    .split("\n")
    .filter((line) => /(^|[\s;&|(])curl\s/.test(line) && !line.trimStart().startsWith("#"))
    .filter((line) => !/localhost|127\.0\.0\.1/.test(line))
    .filter((line) => !/--retry\s+[1-9]/.test(line));
}

test("the rule refuses a remote curl without retries and accepts one with them", () => {
  assert.equal(unretriedDownloads('curl -fsSL -o /tmp/a.zip "https://github.com/a/b.zip"').length, 1);
  assert.equal(unretriedDownloads('  curl --retry 0 -fsSL -o /tmp/a "$url"').length, 1);
  assert.equal(unretriedDownloads('curl --retry 5 -fsSL -o /tmp/a "$url"').length, 0);
  assert.equal(unretriedDownloads("curl -sf http://localhost:3000/robots.txt").length, 0);
  assert.equal(unretriedDownloads("# curl https://example.com, a comment").length, 0);
});

test("every remote download of the CI scripts and workflows retries", () => {
  const dirs = [
    ["scripts", /\.sh$/],
    [".github/workflows", /\.ya?ml$/],
  ];
  for (const [dir, kind] of dirs) {
    for (const name of readdirSync(join(ROOT, dir)).filter((f) => kind.test(f))) {
      const bad = unretriedDownloads(readFileSync(join(ROOT, dir, name), "utf8"));
      assert.deepEqual(
        bad,
        [],
        `${dir}/${name}: a remote curl without --retry fails the whole run on one hiccup of the host`,
      );
    }
  }
});
