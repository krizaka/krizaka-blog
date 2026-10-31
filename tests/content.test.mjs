import test from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDir, confidentialityProblems, linkProblems, postProblems } from "../scripts/content-rules.mjs";

const ok = { title: "T", description: "D", date: "2026-10-16", tags: ["ai"], draft: true };

test("a well-formed post has no problem", () => assert.deepEqual(postProblems("a-post.en.mdx", ok, "text"), []));
test("the file name must carry slug and language", () => assert.equal(postProblems("A Post.mdx", ok, "").length, 1));
test("reserved slugs are refused", () => assert.match(postProblems("site.en.mdx", ok, "")[0], /reserved/));
test("title, description and a real date are required", () => {
  assert.equal(postProblems("x.en.mdx", { ...ok, title: "" }, "").length, 1);
  assert.equal(postProblems("x.en.mdx", { ...ok, description: undefined }, "").length, 1);
  assert.equal(postProblems("x.en.mdx", { ...ok, date: "16/10/2026" }, "").length, 1);
});
test("an image must be on the media CDN, in the cover and in the text", () => {
  assert.equal(postProblems("x.en.mdx", { ...ok, image: "/local.png" }, "").length, 1);
  assert.deepEqual(
    postProblems(
      "x.en.mdx",
      { ...ok, image: "https://krizaka-assets.b-cdn.net/site/blog/x/cover.webp" },
      "![a](https://krizaka-assets.b-cdn.net/site/blog/x/a.webp)",
    ),
    [],
  );
  assert.equal(postProblems("x.en.mdx", ok, "![a](/a.png)").length, 1);
});
test("a link between posts leads to a post of that language, never from a published post to a draft", () => {
  const post = (file, draft, body = "") => ({ file, data: { draft }, body });
  const posts = [
    post("a.en.mdx", false, "See [b](/posts/b/) and [c](/fr/posts/c)."),
    post("b.en.mdx", false),
    post("c.fr.mdx", false),
  ];
  assert.deepEqual(linkProblems(posts), []);
  assert.match(linkProblems([post("a.en.mdx", false, "[gone](/posts/gone)")])[0], /not a post/);
  assert.match(linkProblems([post("a.en.mdx", false, "[b](/fr/posts/b)"), post("b.en.mdx", false)])[0], /not a post/);
  assert.match(linkProblems([post("a.fr.mdx", false, "[d](/fr/posts/d/)"), post("d.fr.mdx", true)])[0], /draft/);
  assert.deepEqual(linkProblems([post("a.fr.mdx", true, "[d](/fr/posts/d/)"), post("d.fr.mdx", true)]), []);
});
test("Mermaid is refused", () => assert.equal(postProblems("x.en.mdx", ok, "```mermaid\ngraph TD\n```").length, 1));
test("the posts of the repository follow the rules, and no post is published without a draft decision", () => {
  const { files, problems } = checkDir(join(dirname(fileURLToPath(import.meta.url)), "../content/posts"));
  assert.deepEqual(problems, []);
  assert.ok(files.length >= 6);
});

test("the preview build is private: token-gated, under /preview/<token>, never indexable", async () => {
  const { readFileSync } = await import("node:fs");
  const r = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  assert.match(r("package.json"), /"build": "npm run gen && node scripts\/build\.mjs"/);
  assert.match(r("scripts/build.mjs"), /out\/preview\/\$\{token\}|preview\/\$\{token\}/);
  assert.match(r("next.config.ts"), /APP_PREVIEW_PATH/);
  assert.match(r("lib/site.ts"), /APP_INDEXING_ENABLED === "true" && !process\.env\.APP_PREVIEW_PATH/);
  assert.match(r(".do/app.yaml"), /APP_PREVIEW_TOKEN[\s\S]*type: SECRET[\s\S]*value: unset/);
  assert.doesNotMatch(r("app/sitemap.ts"), /preview/);
});

test("a search title is at most 60 characters and a search description at most 155", () => {
  assert.deepEqual(
    postProblems("x.en.mdx", { ...ok, seoTitle: "a".repeat(60), seoDescription: "b".repeat(155) }, ""),
    [],
  );
  assert.match(postProblems("x.en.mdx", { ...ok, seoTitle: "a".repeat(61) }, "")[0], /seoTitle/);
  assert.match(postProblems("x.en.mdx", { ...ok, seoDescription: "b".repeat(156) }, "")[0], /seoDescription/);
});

test("a component prop written as a JS expression is refused: the renderer drops it silently (the calculator showed NaN)", () => {
  assert.match(
    postProblems("x.en.mdx", ok, "<Utilization hourly={3.99} seconds={175} hosted={0.6} />")[0],
    /expression/,
  );
  assert.deepEqual(
    postProblems(
      "x.en.mdx",
      ok,
      '<Utilization hourly="3.99" seconds="175" hosted="0.6" />\n\n```js\nconst a = {b: 1};\n```',
    ),
    [],
  );
});

test("a cover is shown once: never again in the body, by id or by URL", () => {
  const ctx = {
    media: {
      a: { kind: "image", srcs: [{ w: 480, url: "https://krizaka-assets.b-cdn.net/site/blog/x/a-480.webp" }] },
      b: { kind: "image" },
    },
    series: [],
  };
  assert.match(
    postProblems("x.en.mdx", { ...ok, cover: "a" }, '<Figure id="a" alt="A picture" />', ctx).join(" "),
    /cover "a" is also in the body/,
  );
  assert.match(
    postProblems(
      "x.en.mdx",
      { ...ok, cover: "a" },
      "![a](https://krizaka-assets.b-cdn.net/site/blog/x/a-480.webp)",
      ctx,
    ).join(" "),
    /also in the body/,
  );
  assert.deepEqual(postProblems("x.en.mdx", { ...ok, cover: "a" }, '<Figure id="b" alt="Another picture" />', ctx), []);
});
test("every code fence declares its language (highlighting needs it; `text` for plain output)", () => {
  assert.match(postProblems("x.en.mdx", ok, "Intro\n\n```\nnpm ci\n```\n")[0], /language/);
  assert.deepEqual(postProblems("x.en.mdx", ok, "```bash\nnpm ci\n```\n\n```text\nok\n```\n"), []);
});

test("a published post has a publishedAt (date, time, offset) on its date, and a cover with its words", () => {
  const pub = {
    ...ok,
    draft: false,
    date: "2026-10-16",
    publishedAt: "2026-10-16T21:44:17-04:00",
    cover: "a",
    coverAlt: "A picture",
  };
  const ctx = { media: { a: { kind: "image" } }, series: [] };
  assert.deepEqual(postProblems("x.en.mdx", pub, "text", ctx), []);
  assert.match(postProblems("x.en.mdx", { ...pub, publishedAt: undefined }, "text", ctx).join(" "), /publishedAt/);
  assert.match(
    postProblems("x.en.mdx", { ...pub, publishedAt: "2026-10-17T01:00:00Z" }, "text", ctx).join(" "),
    /publishedAt/,
  );
  assert.match(postProblems("x.en.mdx", { ...pub, cover: undefined }, "text", ctx).join(" "), /cover/);
  assert.match(postProblems("x.en.mdx", { ...pub, coverAlt: " " }, "text", ctx).join(" "), /coverAlt/);
  assert.deepEqual(postProblems("x.en.mdx", { ...ok, draft: true }, "", ctx), []);
});
test("the cover's picture under another id (same run, or another rendition of the same file) is refused in the body too", () => {
  const u = (n) => `https://krizaka-assets.b-cdn.net/site/blog/x/${n}`;
  const ctx = {
    series: [],
    media: {
      a: {
        kind: "image",
        srcs: [{ w: 480, url: u("terminal-480.0123456789.webp") }],
        made: { runId: "11111111-1111-1111-1111-111111111111" },
      },
      crop: { kind: "image", srcs: [{ w: 960, url: u("terminal-960.abcdefabcd.webp") }] },
      rerun: {
        kind: "image",
        srcs: [{ w: 960, url: u("other-960.abcdefabcd.webp") }],
        made: { runId: "11111111-1111-1111-1111-111111111111" },
      },
      other: {
        kind: "image",
        srcs: [{ w: 960, url: u("ledger-960.abcdefabcd.webp") }],
        made: { runId: "22222222-2222-2222-2222-222222222222" },
      },
    },
  };
  assert.match(
    postProblems("x.en.mdx", { ...ok, cover: "a" }, '<Figure id="crop" alt="A" />', ctx).join(" "),
    /under another id/,
  );
  assert.match(
    postProblems("x.en.mdx", { ...ok, cover: "a" }, '<Figure id="rerun" alt="A" />', ctx).join(" "),
    /under another id/,
  );
  assert.deepEqual(postProblems("x.en.mdx", { ...ok, cover: "a" }, '<Figure id="other" alt="A" />', ctx), []);
});

test("confidentiality: no registration number, company e-mail, private folder name, path or key-looking value in any post", () => {
  const bad = [
    "NEQ 1182652231",
    "1182 652 231",
    "write to contact@krizaka.com",
    "copy env/dev.env",
    "see vault/02_finances",
    "drop it in inbox/prive",
    "/Users/someone/Documents/krizaka",
    "the file secrets.map",
    "sk-ant-api03abcdefghijklmnopqrstu",
    "my TVQ number",
  ];
  for (const text of bad) assert.ok(confidentialityProblems("x.en.mdx", { draft: true }, text).length >= 1, text);
  assert.deepEqual(
    confidentialityProblems(
      "x.en.mdx",
      { draft: true },
      "A private folder, a script `./couts`, about 60 % GPU. Version 3.29.0 on 2026-10-20.",
    ),
    [],
  );
});

test("confidentiality: a post declaring sensitive: true also refuses amounts, key and variable names, supplier names and ledger words", () => {
  const sensitive = { draft: true, sensitive: true };
  const bad = [
    "it cost $12.50",
    "it cost 12 $",
    "about 40 USD",
    "MAIL_API_KEY=unset",
    "the API_KEY",
    "AI_GPU_RUNPOD_API_KEY",
    "on RunPod",
    "the ledger is sorted",
    "le grand livre",
  ];
  for (const text of bad) assert.ok(confidentialityProblems("x.en.mdx", sensitive, text).length >= 1, text);
  // the same words are fine in an ordinary post (the costs posts name their suppliers and amounts)
  for (const text of ["it cost $12.50", "MAIL_API_KEY=unset", "on RunPod"])
    assert.deepEqual(confidentialityProblems("x.en.mdx", { draft: true }, text), [], text);
  // the front matter is read too
  assert.ok(
    confidentialityProblems("x.en.mdx", { ...sensitive, description: "Paid 99 $ per month" }, "text").length >= 1,
  );
  // and `postProblems` runs it
  assert.match(postProblems("x.en.mdx", ok, "write to me@krizaka.com").join("\n"), /confidential/);
});

test("the chapter about building with agents (the company's running) is sensitive in both languages, shows no screenshot of real files, and uses the page components", async () => {
  const { readFileSync } = await import("node:fs");
  const r = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  for (const l of ["fr", "en"]) {
    const f = r(`content/chapters/building-with-agents.${l}.mdx`);
    assert.match(f, /^sensitive: true$/m);
    assert.doesNotMatch(f, /!\[/, "no screenshot of real files");
    for (const c of ["<Numbers>", "<Steps>", "<Compare ", "<CodeTabs>"]) assert.ok(f.includes(c), `${l}: ${c}`);
  }
  const mdx = r("app/components/pages/mdx.tsx");
  for (const c of ["Steps:", "Step:", "Compare:", "Case:", "CodeTabs:", "Tab:", "NumberTicker", "ComparisonTable"])
    assert.ok(mdx.includes(c), c);
});
