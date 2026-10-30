import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";
import { MODELS, MODEL_BY_ID, mentionsOf, modelLinkProblems, modelUrl } from "../lib/models.ts";
import { linkModels } from "../scripts/link-models.mjs";
import { homeCoverProblems, mediaProblems } from "../scripts/content-rules.mjs";

/* A post names a model with a link to its official page the first time (lib/models.ts, <Model id>), and the home's first
   cards carry at most one diagram as cover. */

test("every model has a unique id, an official https page (Hugging Face, or its own site), a family and patterns that compile", () => {
  assert.equal(new Set(MODELS.map((m) => m.id)).size, MODELS.length);
  for (const m of MODELS) {
    assert.match(m.url, /^https:\/\/(huggingface\.co|github\.com)\/[\w.-]+(\/[\w.-]+)?$/, m.id);
    assert.ok(
      MODELS.some((x) => x.group === m.group),
      m.id,
    );
    assert.ok(m.patterns.length > 0, m.id);
    for (const p of m.patterns) new RegExp(p, "g");
  }
  assert.equal(modelUrl("wan22-t2v-a14b"), "https://huggingface.co/Wan-AI/Wan2.2-T2V-A14B");
  assert.throws(() => modelUrl("wan9"));
});

test("names are told apart: the most specific model wins its words", () => {
  const ids = (s) => mentionsOf(s).map((m) => m.id);
  assert.deepEqual(ids("Wan 2.2 A14B, then Wan 2.2 TI2V 5B, then Wan 2.2 I2V A14B and Wan 2.2."), [
    "wan22-t2v-a14b",
    "wan22-ti2v-5b",
    "wan22-i2v-a14b",
    "wan",
  ]);
  assert.deepEqual(ids("FLUX.2 [klein] 4B is not FLUX, nor Stable Diffusion 1.5, SD 3.5 Large or Stable Diffusion."), [
    "flux2-klein-4b",
    "flux",
    "sd15",
    "sd35-large",
    "stable-diffusion",
  ]);
  assert.deepEqual(ids("Ollama runs Qwen 2.5 7B, llama.cpp too."), ["qwen25-7b"]);
});

test("the first mention must be linked; later ones need not be; code, headings, props and link targets are not prose", () => {
  assert.match(modelLinkProblems("I used Wan 2.2 A14B.").join(), /first mention of Wan 2\.2 T2V A14B/);
  assert.deepEqual(
    modelLinkProblems('I used <Model id="wan22-t2v-a14b">Wan 2.2 A14B</Model>, then Wan 2.2 A14B again.'),
    [],
  );
  assert.deepEqual(
    modelLinkProblems(
      '## Wan 2.2 A14B\n\n```bash\nrun Wan 2.2 A14B\n```\n\n`Wan 2.2 A14B` <Num hint="Wan 2.2 A14B" /> [x](https://x.y/Wan 2.2 A14B)',
    ),
    [],
  );
  assert.match(modelLinkProblems('<Model id="nope">Wan</Model>').join(), /names no model/);
  assert.match(modelLinkProblems('<Model id="sd15">Wan 2.2 A14B</Model>').join(), /names wan22-t2v-a14b/);
});

test("a family named after one of its models is covered by that model's link", () => {
  assert.deepEqual(modelLinkProblems('<Model id="flux2-klein-4b">FLUX.2 [klein] 4B</Model> … FLUX again.'), []);
  assert.match(modelLinkProblems("FLUX first, then FLUX.2 [klein] 4B").join("\n"), /first mention of FLUX /);
});

test("the codemod links each first mention once, and its output passes the rule", () => {
  const out = linkModels("Qwen 2.5 7B and Qwen 2.5 7B; Wan 2.2 then Wan 2.2 A14B.");
  assert.equal(
    out,
    '<Model id="qwen25-7b">Qwen 2.5 7B</Model> and Qwen 2.5 7B; <Model id="wan">Wan 2.2</Model> then <Model id="wan22-t2v-a14b">Wan 2.2 A14B</Model>.',
  );
  assert.deepEqual(modelLinkProblems(out), []);
  assert.equal(linkModels(out), out);
});

test("every published post links its models (the same check as npm run lint)", () => {
  for (const f of readdirSync("content/posts").filter((x) => x.endsWith(".mdx"))) {
    const { content } = matter(readFileSync(`content/posts/${f}`, "utf8"));
    assert.deepEqual(modelLinkProblems(content), [], f);
    for (const m of content.matchAll(/<Model id="([^"]+)"/g)) assert.ok(MODEL_BY_ID.has(m[1]), `${f}: ${m[1]}`);
  }
});

test("the home's first three cards carry at most one diagram cover", () => {
  const media = { d: { style: "diagram" }, p: {} };
  const post = (slug, at, cover, extra = {}) => ({
    file: `${slug}.en.mdx`,
    data: { date: at.slice(0, 10), publishedAt: at, cover, ...extra },
    body: "",
  });
  const two = [
    post("a", "2026-10-17T12:00:00-04:00", "d"),
    post("b", "2026-10-17T11:00:00-04:00", "d"),
    post("c", "2026-10-17T10:00:00-04:00", "p"),
  ];
  assert.match(homeCoverProblems(two, media).join(), /home \(en\): 2 of the first 3 cards/);
  assert.deepEqual(
    homeCoverProblems(
      [...two, post("e", "2026-10-17T13:00:00-04:00", "p"), post("f", "2026-10-17T14:00:00-04:00", "p")],
      media,
    ),
    [],
  );
  assert.deepEqual(
    homeCoverProblems(
      [...two.slice(0, 1), post("x", "2026-10-17T11:30:00-04:00", "d", { draft: true }), two[2]],
      media,
    ),
    [],
  );
  const lib = JSON.parse(readFileSync("lib/media.json", "utf8"));
  const posts = readdirSync("content/posts")
    .filter((x) => x.endsWith(".mdx"))
    .map((f) => {
      const { data, content } = matter(readFileSync(`content/posts/${f}`, "utf8"));
      return { file: f, data, body: content };
    });
  assert.deepEqual(homeCoverProblems(posts, lib), []);
});

test("a picture without provenance is a diagram drawn from code, said so", () => {
  const base = {
    kind: "image",
    width: 10,
    height: 10,
    blur: "data:image/webp;base64,AA",
    srcs: [{ w: 10, url: "https://krizaka-assets.b-cdn.net/site/blog/x/a.webp" }],
  };
  assert.match(mediaProblems({ a: base }).join(), /without provenance/);
  assert.deepEqual(mediaProblems({ a: { ...base, style: "diagram" } }), []);
  assert.match(mediaProblems({ a: { ...base, style: "chart" } }).join(), /style is "diagram"/);
});

test("the licence models are told apart from their siblings, and each has its checked page", () => {
  const ids = (s) => mentionsOf(s).map((m) => m.id);
  assert.deepEqual(ids("FLUX.1 [schnell], FLUX.1 [dev], FLUX.2 [klein] 9B and FLUX.2 [klein] 4B."), [
    "flux1-schnell",
    "flux1-dev",
    "flux2-klein-9b",
    "flux2-klein-4b",
  ]);
  assert.deepEqual(ids("HunyuanVideo, XTTS-v2, Kokoro, Piper and Stable Audio Open."), [
    "hunyuanvideo",
    "xtts",
    "kokoro",
    "piper",
    "stable-audio-open",
  ]);
  assert.equal(modelUrl("hunyuanvideo"), "https://huggingface.co/tencent/HunyuanVideo");
  assert.equal(modelUrl("xtts"), "https://huggingface.co/coqui/XTTS-v2");
});

test("the voice and audio-judge models of the film post are known by their names (checked 200 on 2026-10-21)", () => {
  const ids = (s) => mentionsOf(s).map((m) => m.id);
  assert.deepEqual(ids("Zonos v0.1, Chatterbox, F5-TTS and Qwen2-Audio, not Qwen 2.5 7B."), [
    "zonos",
    "chatterbox",
    "f5-tts",
    "qwen2-audio",
    "qwen25-7b",
  ]);
  assert.equal(modelUrl("zonos"), "https://huggingface.co/Zyphra/Zonos-v0.1-transformer");
});
