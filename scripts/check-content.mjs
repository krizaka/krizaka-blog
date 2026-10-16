#!/usr/bin/env node
/* `npm run lint`: every post in content/posts follows the rules (scripts/content-rules.mjs); the admin's config names the same fields. */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import { checkDir, mediaProblems, readContext } from "./content-rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = readContext(root);
const { files, problems } = checkDir(join(root, "content/posts"), ctx);
problems.push(...mediaProblems(ctx.media));
/* No media in the repository (they live on the CDN): an image file under content/ or public/ fails. */
const IMAGE = /\.(png|jpe?g|gif|webp|avif|mp4|webm|mov)$/i;
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
for (const dir of ["content", "public"]) for (const f of walk(join(root, dir))) if (IMAGE.test(f)) problems.push(`${f.replace(root + "/", "")}: media are never committed — upload to Bunny (blog/) and use its URL`);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`check-content: ${files.length} posts ok`);
