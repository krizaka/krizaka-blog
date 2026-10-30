import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { buildInfo } from "../scripts/build-info.mjs";

const SHA = "a".repeat(40);

test("the build carries the commit it was made from, lower-cased", () => {
  assert.deepEqual(buildInfo(SHA.toUpperCase()), { commit: SHA });
});

test("anything that is not a full commit says « local » (never a half-id the poll could match by accident)", () => {
  for (const v of [undefined, "", "abc123", "${_self.COMMIT_HASH}", SHA + "0"])
    assert.deepEqual(buildInfo(v), { commit: "local" });
});

test("the postbuild writes out/build.json from APP_COMMIT, and DigitalOcean binds that variable to the commit", () => {
  assert.match(readFileSync("scripts/postbuild.mjs", "utf8"), /build\.json/);
  assert.match(
    readFileSync(".do/app.yaml", "utf8"),
    /key: APP_COMMIT\n\s+scope: BUILD_TIME\n\s+value: \$\{_self\.COMMIT_HASH\}/,
  );
});

test("the post-deploy caller waits for that commit, pins the org workflow to a SHA and holds one IndexNow key file", () => {
  const wf = readFileSync(".github/workflows/post-deploy.yml", "utf8");
  assert.match(wf, /krizaka\/\.github\/\.github\/workflows\/post-deploy\.yml@[0-9a-f]{40}/);
  assert.match(wf, /version-url: https:\/\/blog\.krizaka\.com\/build\.json/);
  assert.match(wf, /expect: \$\{\{ github\.sha \}\}/);
  const key = wf.match(/indexnow-key: ([0-9a-f]{32})/)?.[1];
  assert.ok(key, "the workflow names the IndexNow key");
  assert.equal(readFileSync(`public/${key}.txt`, "utf8").trim(), key, "public/<key>.txt serves the key");
  assert.equal(readdirSync("public").filter((f) => /^[0-9a-f]{32}\.txt$/.test(f)).length, 1);
});
