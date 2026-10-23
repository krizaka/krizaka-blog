import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { searchParams, searchQuery, searchResults } from "../lib/search.ts";

/* The topic is a filter of the search results: it keeps the query, is carried by `?topic=`, and never leaves the search. */
const entries = [
  { href: "/posts/a/", title: "Measuring a GPU hour", description: "What a run costs", tags: ["measured"], text: "gpu hour cost" },
  { href: "/posts/b/", title: "Measuring the queue", description: "Waiting time", tags: ["measured", "ops"], text: "queue wait" },
  { href: "/story/c/", title: "Hour one", description: "The first hour", tags: ["story"], text: "gpu first" },
];

test("a topic keeps the query and keeps only the entries of that topic", () => {
  assert.deepEqual(searchResults(entries, "measuring", "measured").map((e) => e.href), ["/posts/a/", "/posts/b/"]);
  assert.deepEqual(searchResults(entries, "hour", "measured").map((e) => e.href), ["/posts/a/"]);
  assert.deepEqual(searchResults(entries, "hour", "ops").map((e) => e.href), []);
});

test("without a query, a topic lists its entries; with neither, nothing", () => {
  assert.deepEqual(searchResults(entries, "", "story").map((e) => e.href), ["/story/c/"]);
  assert.deepEqual(searchResults(entries, "   ", ""), []);
  assert.deepEqual(searchResults(entries, "gpu", "").map((e) => e.href), ["/posts/a/", "/story/c/"]);
});

test("the URL carries the query and the topic, and reads them back", () => {
  assert.deepEqual(searchParams("?q=gpu&topic=measured"), { query: "gpu", topic: "measured" });
  assert.deepEqual(searchParams(""), { query: "", topic: "" });
  assert.equal(searchQuery("gpu", "measured"), "?q=gpu&topic=measured");
  assert.equal(searchQuery("  ", "measured"), "?topic=measured");
  assert.equal(searchQuery("gpu", ""), "?q=gpu");
  assert.equal(searchQuery("", ""), "");
});

test("the search box writes the topic into the URL and never navigates", () => {
  const box = readFileSync(new URL("../app/components/SearchBox.tsx", import.meta.url), "utf8");
  assert.match(box, /window\.history\.replaceState/);
  assert.match(box, /aria-pressed=\{topic === tp\.tag\}/);
  assert.doesNotMatch(box, /router\.push|<Link[^>]*href=\{[^}]*topic/);
});
