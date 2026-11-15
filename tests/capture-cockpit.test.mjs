/* The cockpit capture's guard (scripts/capture-cockpit.mjs): each kind of sensitive value is replaced by a placeholder of the
   same length before the shot, and what masking misses is refused, never written. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { findings, shoot, stripPng, mediaEntry, SCREENS, GUARD, MASK } from "../scripts/capture-cockpit.mjs";

const FIXTURE = {
  money: "Dépensé : 1 234,56 $",
  "money-prefix": "Total USD 99.50 et €12",
  email: "écrire à fondateur@exemple.com",
  phone: "Tél. 514-555-0199",
  postal: "Code postal H4C 1A1",
  address: "12 rue Sainte-Marguerite",
  "tax-id": "NEQ 1234567890",
  token: `jeton ${["gh", "p_"].join("")}${"abcdefghijklmnopqrstuvwxyz0123456789"}`,
  hex: "empreinte 0123456789abcdef0123456789abcdef01234567",
  base64: "clé Zm9vQmFyQmF6MTIzNDU2Nzg5MFF3ZXJ0eVV",
  "secret-name": "MAIL_SEND_TOKEN",
  "private-path": "/Users/quelquun/krizaka/vault/x",
  person: "demande de Mme Tremblay",
  sensitive: "Grand livre — rapprochement bancaire",
};
const PUBLIC = [
  "Session verikora-reservations",
  "krizaka-ui#1038",
  "train krizaka-blog : 3 PR vertes",
  "alerte watchdog 2026-11-15T19:15:00Z",
];
const tmp = () => mkdtempSync(join(tmpdir(), "kz-cap-"));

async function withPage(html, fn) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    await page.setContent(`<!doctype html><html lang="fr"><body>${html}</body></html>`);
    return await fn(page);
  } finally {
    await browser.close();
  }
}

test("every kind of the fixture is matched by the guard's net", () => {
  for (const [kind, text] of Object.entries(FIXTURE))
    assert.ok(findings(text, GUARD).length > 0, `${kind} is not detected`);
});

test("public values are not matched", () => {
  for (const text of PUBLIC) assert.deepEqual(findings(text, GUARD), [], text);
});

for (const [kind, text] of Object.entries(FIXTURE)) {
  test(`masked before the shot: ${kind}`, async () => {
    await withPage(`<p>${text}</p><p>${PUBLIC[0]}</p>`, async (page) => {
      const out = join(tmp(), "x.png");
      await shoot(page, { out, names: [] });
      const visible = await page.evaluate(() => document.body.innerText);
      assert.ok(existsSync(out));
      assert.deepEqual(findings(visible, GUARD), [], `${kind} still readable`);
      assert.ok(visible.includes(PUBLIC[0]), "public text stays sharp");
      assert.ok((await page.$$("[data-kz-masked]")).length > 0, "a placeholder was drawn");
    });
  });
}

test("the placeholder has the length of what it replaces and none of its letters", async () => {
  await withPage("<p>mail a@b.com fin</p>", async (page) => {
    await shoot(page, { out: join(tmp(), "x.png") });
    const text = await page.evaluate(() => document.querySelector("[data-kz-masked]").textContent);
    assert.equal(text.length, "a@b.com".length);
    assert.match(text, /^•+$/);
    assert.ok(!(await page.evaluate(() => document.body.innerText)).includes("a@b.com"));
  });
});

test("a value written into a field or an attribute is replaced too", async () => {
  await withPage(`<input value="moi@exemple.com"><img alt="214-555-0100" src="data:,">`, async (page) => {
    await shoot(page, { out: join(tmp(), "x.png") });
    assert.ok(!(await page.inputValue("input")).includes("@"));
    assert.equal(await page.$eval("img", (i) => i.getAttribute("alt")), null);
  });
});

test("the guard refuses and writes nothing when something is left", async () => {
  await withPage("<p>rien ici</p>", async (page) => {
    /* A value drawn AFTER the masking pass (a late render): the guard must still see it. */
    await page.evaluate(() => setTimeout(() => (document.body.innerHTML += "<p>jeton 4374296412845</p>"), 60));
    const out = join(tmp(), "refused.png");
    await assert.rejects(shoot(page, { out }), /guard: .*still visible, nothing written/);
    assert.equal(existsSync(out), false);
  });
});

test("a named real person is replaced", async () => {
  await withPage("<p>Jeanne Dupont a validé</p>", async (page) => {
    await shoot(page, { out: join(tmp(), "x.png"), names: ["Jeanne Dupont"] });
    assert.ok(!(await page.evaluate(() => document.body.innerText)).includes("Dupont"));
  });
});

test("the PNG keeps only its critical chunks", async () => {
  await withPage("<p>ok</p>", async (page) => {
    const out = join(tmp(), "x.png");
    await shoot(page, { out });
    const buf = readFileSync(out);
    const types = [];
    for (let i = 8; i < buf.length; i += 12 + buf.readUInt32BE(i)) types.push(buf.toString("ascii", i + 4, i + 8));
    assert.deepEqual(
      [...new Set(types)].filter((t) => !["IHDR", "PLTE", "tRNS", "IDAT", "IEND"].includes(t)),
      [],
    );
  });
});

test("stripPng drops text and time chunks and refuses a non-PNG", () => {
  const chunk = (type, data) => {
    const b = Buffer.alloc(12 + data.length);
    b.writeUInt32BE(data.length, 0);
    b.write(type, 4, "ascii");
    data.copy(b, 8);
    return b;
  };
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const png = Buffer.concat([
    sig,
    chunk("IHDR", Buffer.alloc(13)),
    chunk("tEXt", Buffer.from("Author\0someone")),
    chunk("tIME", Buffer.alloc(7)),
    chunk("IDAT", Buffer.alloc(4)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  const out = stripPng(png);
  assert.ok(!out.includes("tEXt") && !out.includes("tIME") && !out.includes("someone"));
  assert.throws(() => stripPng(Buffer.from("nope")), /not a PNG/);
});

test("the masking and the guard share every pattern", () => {
  const names = new Set(GUARD.map((g) => g.name));
  for (const m of MASK) assert.ok(names.has(m.name), m.name);
});

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL("../scripts/capture-cockpit.mjs", import.meta.url));

async function withServer(html, fn) {
  const server = createServer((_req, res) => res.writeHead(200, { "content-type": "text/html" }).end(html));
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

test("the command writes the image of a page once masked, and exits 0", async () => {
  const dir = tmp();
  await withServer("<!doctype html><body><p>Total 12 $ pour a@b.com</p><p>krizaka-ui#1</p></body>", async (base) => {
    const { stdout } = await run("node", [SCRIPT, "--out", dir, "--base", base, "--only", SCREENS[0].id]);
    assert.match(stdout, /cockpit-sante: \d+ bytes, masked/);
    assert.ok(existsSync(join(dir, `${SCREENS[0].id}.png`)));
  });
});

test("the command exits 1 and writes nothing when the guard refuses", async () => {
  const dir = tmp();
  const late =
    "<!doctype html><body><p>ok</p><script>new MutationObserver(()=>setTimeout(()=>document.body.append('4374296412845'),50)).observe(document.head,{childList:true})</script></body>";
  await withServer(late, async (base) => {
    await assert.rejects(run("node", [SCRIPT, "--out", dir, "--base", base, "--only", SCREENS[0].id]), (e) => {
      assert.equal(e.code, 1);
      assert.match(e.stderr, /REFUSED/);
      return true;
    });
    assert.equal(existsSync(join(dir, `${SCREENS[0].id}.png`)), false);
  });
});

test("the command without --out prints its usage and exits 2", async () => {
  await assert.rejects(run("node", [SCRIPT]), (e) => e.code === 2 && /usage/.test(e.stderr));
});

test("the media entry has the sizes, the blur, both formats at each width and its provenance", async () => {
  const dir = tmp();
  await withPage("<p>ok</p>", async (page) => {
    await shoot(page, { out: join(dir, "shot.png") });
  });
  const entry = await mediaEntry({
    png: join(dir, "shot.png"),
    id: "x-shot",
    slug: "a-post",
    dir,
    note: "A test.",
    takenOn: "2026-11-15",
  });
  assert.equal(entry.kind, "image");
  assert.match(entry.blur, /^data:image\/webp;base64,/);
  assert.deepEqual(
    entry.renditions.avif.map((r) => r.w),
    entry.renditions.webp.map((r) => r.w),
  );
  assert.match(
    entry.renditions.webp[0].url,
    /^https:\/\/krizaka-assets\.b-cdn\.net\/sites\/blog\/posts\/a-post\/x-shot-\d+\.[0-9a-f]{10}\.webp$/,
  );
  assert.ok(existsSync(join(dir, "a-post", `x-shot-${entry.renditions.webp[0].w}.webp`)));
  assert.match(entry.made.note, /sensitive values replaced then blurred/);
});
