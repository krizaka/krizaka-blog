// « Take the story with you » (krizaka-blog#225) and the covers of the image series (krizaka-blog#193).
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import matter from "gray-matter";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const json = (p) => JSON.parse(read(p));
const media = json("lib/media.json");
const downloads = json("lib/downloads.json").books;
const series = json("content/image-series/series.json");
const KEEPS = "a-curve-that-climbs"; // chapter 10 keeps its cover (founder, krizaka-blog#193)
const CDN_HOSTS = /^https:\/\/krizaka-assets\.b-cdn\.net\/sites?\/blog\//;

test("every chapter of the series but the 10th wears its series cover, and each cover is a media entry sold in every size", () => {
  const picked = series.chapters.map((c, i) => ({ ...c, id: `series-${String(i + 1).padStart(2, "0")}-${c.post}` }));
  for (const c of picked) {
    if (c.post === KEEPS) continue;
    for (const loc of ["en", "fr"]) {
      const fm = matter(read(`content/chapters/${c.post}.${loc}.mdx`)).data;
      assert.equal(fm.cover, c.id, `${c.post}.${loc} cover`);
      assert.ok(fm.coverAlt && fm.coverAlt.length > 20, `${c.post}.${loc} has its own alt text`);
    }
    const m = media[c.id];
    assert.ok(m, `${c.id} is in lib/media.json`);
    assert.deepEqual(
      m.srcs.map((s) => s.w),
      [480, 960, 1280],
    );
    assert.ok(m.renditions.avif.length > 0 && m.renditions.webp.length > 0, `${c.id} has renditions`);
    for (const u of [...m.srcs, ...m.renditions.avif, ...m.renditions.webp]) assert.match(u.url, CDN_HOSTS);
    /* A series batch run in Orazaka Studio, or (chapter 21 on) a render on the Mac with the media worker's model, which says
       so in its note (lib/media.json: a result made outside an Orazaka run says so). */
    const studio = /Studio run [0-9a-f]{8}\)/.test(m.made.note) && m.made.model === "FLUX.1 [schnell]";
    const local =
      m.made.via === "local" &&
      /^FLUX\.2 \[klein\]/.test(m.made.model) &&
      /outside an Orazaka Studio run/.test(m.made.note);
    assert.ok(studio || local, `${c.id} says how it was made`);
  }
});

test("chapter 10 keeps its current cover", () => {
  assert.equal(matter(read(`content/chapters/${KEEPS}.en.mdx`)).data.cover, "workshop-table");
});

test("the covers are the founder's picks: no two chapters share a picture, none is a candidate left unpicked", () => {
  const urls = Object.entries(media)
    .filter(([k]) => k.startsWith("series-") && !k.startsWith("series-10"))
    .map(([, m]) => m.srcs[2].url);
  assert.equal(new Set(urls).size, urls.length);
});

test("every download link of the card resolves to a manifest entry, for the story and each chapter, in both languages", () => {
  const chapters = readdirSync(new URL("../content/chapters", import.meta.url))
    .filter((f) => f.endsWith(".en.mdx"))
    .map((f) => f.replace(".en.mdx", ""));
  for (const loc of ["en", "fr"]) {
    for (const key of ["story", ...chapters]) {
      const files = downloads[`${loc}/${key}`]?.files;
      assert.ok(files?.epub?.hash && files?.pdf?.hash, `${loc}/${key} has an EPUB and a PDF in lib/downloads.json`);
      assert.ok(files.epub.bytes > 0 && files.pdf.bytes > 0);
    }
  }
});

test("the home's bookplate: no box, no picture, small ghost Krizaka UI buttons, a quiet offline link (krizaka-blog#228)", () => {
  const src = read("app/components/TakeStory.tsx");
  assert.match(src, /from "@krizaka\/ui\/button"/);
  assert.match(src, /<Button asChild variant="ghost" size="sm"/);
  assert.ok(!/variant="primary"|shape="cut"|CoverImage|coverOf/.test(src), "no heavy button, no cover thumbnail");
  assert.match(src, /<SaveSeries quiet/);
  assert.ok(!/<button|className="[^"]*btn/.test(src), "no hand-made button");
  const css = read("app/globals.css");
  const take = css.slice(css.indexOf("/* « Take the story with you »"), css.indexOf(".bl-offline {"));
  assert.match(
    take,
    /\.bl-take \{[^}]*flex-basis: 100%[^}]*border-block: 1px solid/,
    "a full-width strip between hairlines",
  );
  assert.ok(!/border-radius|box-shadow|background:/.test(take), "never a boxed card");
  assert.match(read("app/components/pages/HomePage.tsx"), /<TakeStory locale=\{locale\} \/>/);
});

test("the chapter's end block: typographic links with mono sizes, no button grid, Read offline per scope", () => {
  const src = read("app/components/TakeStory.tsx");
  const compact = src.slice(src.indexOf("if (compact)"), src.indexOf('return (\n    <aside className="bl-take"'));
  assert.match(compact, /className="bl-take-line"/);
  assert.match(compact, /<FileLink /);
  assert.match(compact, /<SaveChapter /);
  assert.match(compact, /<SaveSeries quiet/);
  assert.match(compact, /<OfflineHelp \/>/);
  assert.ok(!/<FileButton|<Button/.test(compact), "no download button at the end of a chapter");
});

test("the card's words exist in both languages, and no colour is hard-coded in its styles", () => {
  for (const loc of ["en", "fr"]) {
    const d = json(`messages/${loc}.json`).downloads;
    for (const k of [
      "takeTitle",
      "takeMeta",
      "epubShort",
      "pdfShort",
      "epubHint",
      "pdfHint",
      "takeChapter",
      "takeStory",
    ])
      assert.ok(d[k], `${loc}.downloads.${k}`);
    assert.match(d.takeMeta, /\{n\}/);
    assert.match(d.takeMeta, /FR\/EN/);
  }
  const css = read("app/globals.css");
  const block = css.slice(css.indexOf(".bl-take {"), css.indexOf(".bl-offline {"));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgb\(/.test(block.replace(/var\(--kz-fg, #000\)/, "")), "tokens only");
});
