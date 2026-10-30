import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CLIENT_NAMESPACES, clientMessages } from "../lib/client-messages.ts";

/* Performance: the browser gets only the words its components read, and no client component bundles the catalogues
   (lib/i18n.ts imports messages/en.json and fr.json, ~32 KB; a client file imports lib/locale.ts instead). */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const walk = (d) =>
  readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const clientFiles = walk(join(root, "app")).filter(
  (f) => /\.tsx?$/.test(f) && /^\s*"use client"/.test(readFileSync(f, "utf8").slice(0, 300)),
);
const en = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8"));

test("there are client components to check", () => assert.ok(clientFiles.length >= 8));

/** `{ type A, type B }`: only types, checked without a backtracking pattern. */
function isTypeOnlyBraces(names) {
  const t = names.trim();
  if (!t.startsWith("{") || !t.endsWith("}")) return false;
  const parts = t.slice(1, -1).split(",");
  if (parts.at(-1)?.trim() === "") parts.pop();
  return parts.length > 0 && parts.every((x) => /^type \S+$/.test(x.trim()));
}

test("no client component imports the catalogues (lib/i18n or messages/*) as a value", () => {
  for (const f of clientFiles) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/import\s+(type\s+)?([^;]*?)\s+from\s+"([^"]+)"/g)) {
      if (m[1]) continue;
      const names = m[2];
      if (
        /^(@\/lib\/i18n|\.\.?\/.*\/?i18n)$/.test(m[3]) &&
        !isTypeOnlyBraces(names)
      )
        assert.fail(`${f} imports ${names} from ${m[3]}: use @/lib/locale`);
      assert.ok(!/messages\/(en|fr)(\.json)?$/.test(m[3]), `${f} imports the catalogue ${m[3]}`);
    }
  }
});

test("every namespace a client component reads is sent to the browser", () => {
  const top = new Set(Object.keys(en));
  for (const f of clientFiles) {
    const src = readFileSync(f, "utf8");
    const used = new Set(
      [...src.matchAll(/\bt\.(\w+)/g)]
        .map((m) => m[1])
        .concat([...src.matchAll(/(?:const|let) \w+ = t\.(\w+)/g)].map((m) => m[1])),
    );
    for (const k of used)
      if (top.has(k))
        assert.ok(CLIENT_NAMESPACES.includes(k), `${f} reads t.${k}, which lib/client-messages.ts does not send`);
  }
});

test("clientMessages keeps those namespaces only, and is much lighter than the catalogue", () => {
  const sent = clientMessages(en);
  assert.deepEqual(Object.keys(sent).sort(), [...CLIENT_NAMESPACES].sort());
  assert.ok(JSON.stringify(sent).length < JSON.stringify(en).length * 0.6, "the slice is under 60% of the catalogue");
  for (const k of CLIENT_NAMESPACES) assert.ok(k in en, `${k} exists in messages/en.json`);
});
