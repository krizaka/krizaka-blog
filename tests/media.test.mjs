import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { CDN, mediaProblems, postProblems, readContext } from "../scripts/content-rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = readContext(root);
const ok = { title: "T", description: "D", date: "2026-10-16", tags: ["ai"], draft: true };
const image = { kind: "image", width: 960, height: 1200, blur: "data:image/webp;base64,AAAA", srcs: [{ w: 480, url: `${CDN}shared/a-480.0123456789.webp` }], made: { model: "M", runId: "25948442-7c68-4e66-94d6-39cd8b96438d" } };

test("the media library of the repository follows its rules", () => assert.deepEqual(mediaProblems(ctx.media), []));
test("an image needs its size (no layout shift), a blur placeholder and CDN urls", () => {
  assert.deepEqual(mediaProblems({ "a-b": image }), []);
  assert.equal(mediaProblems({ "a-b": { ...image, width: 0 } }).length, 1);
  assert.equal(mediaProblems({ "a-b": { ...image, blur: "" } }).length, 1);
  assert.equal(mediaProblems({ "a-b": { ...image, srcs: [{ w: 480, url: "https://example.com/a.webp" }] } }).length, 1);
});
test("a clip needs a poster, an mp4 and a webm on the CDN", () => {
  const clip = { kind: "video", width: 832, height: 480, blur: image.blur, poster: `${CDN}x.webp`, mp4: `${CDN}x.mp4`, webm: `${CDN}x.webm` };
  assert.deepEqual(mediaProblems({ clip }), []);
  assert.equal(mediaProblems({ clip: { ...clip, webm: "/x.webm" } }).length, 1);
});
test("provenance names the model, and a run id looks like one", () => {
  assert.equal(mediaProblems({ "a-b": { ...image, made: { runId: "x" } } }).length, 2);
});
test("a cover, a figure or a clip must exist in the library, and a clip is not a figure", () => {
  const c = { media: { "pic": image, "mov": { ...image, kind: "video" } }, series: ["measured"] };
  assert.deepEqual(postProblems("x.en.mdx", { ...ok, cover: "pic" }, 'text', c), []);
  assert.deepEqual(postProblems("x.en.mdx", ok, '<Figure id="pic" alt="a" />', c), []);
  assert.equal(postProblems("x.en.mdx", { ...ok, cover: "nope" }, "", c).length, 1);
  assert.equal(postProblems("x.en.mdx", ok, '<Figure id="nope" alt="a" />', c).length, 1);
  assert.equal(postProblems("x.en.mdx", ok, '<Figure id="mov" alt="a" />', c).length, 1);
  assert.equal(postProblems("x.en.mdx", ok, '<Clip id="pic" alt="a" />', c).length, 1);
  assert.equal(postProblems("x.en.mdx", ok, '<Figure id="pic" alt="" />', c).length, 1);
});
test("a series must be named in the messages, a part needs a series and a whole number", () => {
  const c = { media: {}, series: ["measured"] };
  assert.deepEqual(postProblems("x.en.mdx", { ...ok, series: "measured", part: 2 }, "", c), []);
  assert.equal(postProblems("x.en.mdx", { ...ok, series: "other" }, "", c).length, 1);
  assert.equal(postProblems("x.en.mdx", { ...ok, part: 1 }, "", c).length, 1);
  assert.equal(postProblems("x.en.mdx", { ...ok, series: "measured", part: 1.5 }, "", c).length, 1);
});
test("in a series, two posts of a language never take the same place; every post is in both languages with the same series", () => {
  const dir = join(root, "content/posts");
  const seen = new Map();
  const meta = new Map();
  for (const f of readdirSync(dir)) {
    const [, slug, loc] = f.match(/^(.*)\.(en|fr)\.mdx$/);
    const { data } = matter(readFileSync(join(dir, f), "utf8"));
    if (data.series) {
      const k = `${loc}/${data.series}/${data.part}`;
      assert.ok(!seen.has(k), `${f} and ${seen.get(k)} share place ${data.part} of ${data.series}`);
      seen.set(k, f);
    }
    meta.set(f, { slug, series: data.series, part: data.part, cover: data.cover });
  }
  for (const [f, m] of meta) {
    const other = meta.get(f.replace(/\.(en|fr)\.mdx$/, (_, l) => `.${l === "en" ? "fr" : "en"}.mdx`));
    if (other) assert.deepEqual({ s: other.series, p: other.part, c: other.cover }, { s: m.series, p: m.part, c: m.cover }, `${f}: its translation has other series, part or cover`);
  }
});
test("every post that names a media wears it in both languages", () => {
  const dir = join(root, "content/posts");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".en.mdx"))) {
    const fr = join(dir, f.replace(".en.", ".fr."));
    const ids = (s) => [...s.matchAll(/<(?:Figure|Clip)\b[^>]*?\bid="([^"]+)"/g)].map((m) => m[1]).sort();
    assert.deepEqual(ids(readFileSync(fr, "utf8")), ids(readFileSync(join(dir, f), "utf8")), f);
  }
});
