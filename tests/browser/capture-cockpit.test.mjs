/* The cockpit capture's guard (scripts/capture-cockpit.mjs): each kind of sensitive value is replaced by a placeholder of the
   same length before the shot, and what masking misses is refused, never written. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  findings,
  shoot,
  stripPng,
  mediaEntry,
  clipEntry,
  loopFrames,
  runSteps,
  clipOfBox,
  guardedShot,
  SCREENS,
  LOOP,
  GUARD,
  MASK,
} from "../../scripts/capture-cockpit.mjs";

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
  "secret-name-lower": "auth_github_client_secret",
  "key-id-name": "BUNNY_KEY_ID",
  "production-path": "production-path: team kridoc's session touche",
  "prod-key-name": "prod-key-name: un nom de clé cité",
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
/* The command is run against a plain page: the screen without a step that needs the cockpit's own buttons. */
const STILL = SCREENS.find((x) => x.id === "cockpit-alertes");
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

test("the guard refuses and writes nothing when a value keeps coming back", async () => {
  await withPage("<p>rien ici</p>", async (page) => {
    /* A value drawn again and again AFTER each masking pass (a page that re-renders): the guard must still see it. */
    await page.evaluate(() =>
      setInterval(() => {
        document.querySelector("#late")?.remove();
        document.body.insertAdjacentHTML("beforeend", '<p id="late">jeton 4374296412845</p>');
      }, 40),
    );
    const out = join(tmp(), "refused.png");
    await assert.rejects(shoot(page, { out }), /guard: .*(still visible|appeared during the shot), nothing written/);
    assert.equal(existsSync(out), false);
  });
});

test("a value drawn once after the first pass is masked on the next try, and the shot is written", async () => {
  await withPage("<p>rien ici</p>", async (page) => {
    await page.evaluate(() => setTimeout(() => (document.body.innerHTML += "<p>jeton 4374296412845</p>"), 60));
    const out = join(tmp(), "second-try.png");
    await shoot(page, { out });
    assert.ok(existsSync(out));
    assert.ok(!(await page.evaluate(() => document.body.innerText)).includes("4374296412845"));
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
const SCRIPT = fileURLToPath(new URL("../../scripts/capture-cockpit.mjs", import.meta.url));

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
  await withServer(
    "<!doctype html><body><table><tr><td>Total 12 $ pour a@b.com</td><td>krizaka-ui#1</td></tr></table></body>",
    async (base) => {
      const { stdout } = await run("node", [SCRIPT, "--out", dir, "--base", base, "--only", STILL.id]);
      assert.match(stdout, new RegExp(`${STILL.id}: \\d+ bytes, masked`));
      assert.ok(existsSync(join(dir, `${STILL.id}.png`)));
    },
  );
});

test("the command exits 1 and writes nothing when the guard refuses", async () => {
  const dir = tmp();
  const late =
    "<!doctype html><body><table><tr><td>ok</td></tr></table><script>new MutationObserver(()=>setTimeout(()=>document.body.append('4374296412845'),50)).observe(document.head,{childList:true})</script></body>";
  await withServer(late, async (base) => {
    await assert.rejects(run("node", [SCRIPT, "--out", dir, "--base", base, "--only", STILL.id]), (e) => {
      assert.equal(e.code, 1);
      assert.match(e.stderr, /REFUSED — guard/);
      return true;
    });
    assert.equal(existsSync(join(dir, `${STILL.id}.png`)), false);
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

test("the screens of the post: the opened sessions are the cover's, and the refresh is a loop", () => {
  assert.equal(SCREENS[0].id, "cockpit-equipes");
  assert.ok(SCREENS[0].steps.some((x) => x.click?.includes("Équipes, trains")));
  assert.equal(
    SCREENS.some((x) => x.id === "cockpit-sante"),
    false,
  );
  assert.match(LOOP.button, /Rafraîchir/);
});

test("the alerts screen leaves the two overlapping date columns out, and Livraison is only the clip", () => {
  const alerts = SCREENS.find((x) => x.id === "cockpit-alertes");
  assert.ok(alerts.steps.some((x) => x.hide?.includes("nth-child(5)") && x.hide.includes("nth-child(6)")));
  assert.equal(
    SCREENS.some((x) => x.id === "cockpit-livraison"),
    false,
    "Livraison is the clip's, not a figure",
  );
});

test("the figures are taken at 720 px so their text is read at a phone's 390 px (krizaka-internal#3905)", () => {
  for (const s of SCREENS) assert.equal(s.width, 720, s.id);
});

test("a style step restyles, and a box is cropped to what its scrolling parent shows", async () => {
  await withPage(
    '<style>body{margin:0}</style><div id="s" style="overflow-x:auto;width:200px;margin:20px"><table id="t" style="width:600px"><tr><td>a</td></tr></table></div>',
    async (page) => {
      await runSteps(page, [{ style: "#t{height:300px}" }]);
      const area = await clipOfBox(page, { selector: "#t", height: 100, pad: 0 });
      assert.deepEqual(area, { x: 20, y: 20, width: 200, height: 100 });
      assert.equal(await clipOfBox(page, { selector: "#nope", height: 100 }), null);
    },
  );
});

test("the crop is measured after the masking, which changes the height of the blocks above it", async () => {
  await withPage('<style>body{margin:0}</style><p id="a">écrire à fondateur@exemple.com</p>', async (page) => {
    let seen;
    await guardedShot(page, {
      area: async () => {
        seen = await page.evaluate(() => document.getElementById("a").textContent);
        return { x: 0, y: 0, width: 50, height: 20 };
      },
    });
    assert.ok(seen.startsWith("écrire à "), seen);
    assert.doesNotMatch(seen, /@/, "the crop is measured on the masked page");
  });
});

test("a step hides a column and clicks a button; a missing button is an error, not a silent pass", async () => {
  await withPage(
    '<table><tr><th>a</th><th class="x">b</th></tr></table><button onclick="document.title=1">Go</button>',
    async (page) => {
      await runSteps(page, [{ hide: ".x" }, { click: "button:has-text('Go')" }]);
      assert.equal(await page.title(), "1");
      assert.equal(await page.isVisible(".x"), false);
      await assert.rejects(runSteps(page, [{ click: "button:has-text('Nope')" }]));
    },
  );
});

const LOOP_PAGE = (after) =>
  `<p id="d">À jour · 15 nov. 2026, 17:49</p><button onclick="setTimeout(()=>{document.getElementById('d').textContent='À jour · 15 nov. 2026, 18:34';${after}},300)">Rafraîchir</button>`;
const FAST = {
  ...LOOP,
  steps: [],
  clip: { x: 0, y: 0, width: 300, height: 120 },
  holdBefore: 100,
  holdAfter: 100,
  frameMs: 50,
  frames: 2,
  waitMax: 5000,
};

test("the refresh loop: frames before and after the click, the date moved, the wait cut and counted", async () => {
  await withPage(LOOP_PAGE(""), async (page) => {
    const frames = await loopFrames(page, { spec: FAST });
    assert.equal(frames.length, 4);
    assert.ok(
      frames.every((f) => f.png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))),
    );
    assert.ok(frames.waitedMs > 0);
  });
});

test("the refresh loop refuses when a sensitive value keeps coming back after the click", async () => {
  await withPage(
    "<p id=\"d\">À jour · 1</p><button onclick=\"setTimeout(()=>{document.getElementById('d').textContent='À jour · 2'},50)\">Rafraîchir</button><script>setInterval(()=>{const p=document.createElement('p');p.id='leak';p.textContent='a'+'@b.com';document.querySelector('#leak')?.remove();document.body.append(p)},5)</script>",
    async (page) => {
      await assert.rejects(loopFrames(page, { spec: { ...FAST, badge: /À jour · \d/ } }), /guard|did not finish/);
    },
  );
});

test("the clip entry: webm, mp4 and poster are made from the frames, with the numbers of the clip and its provenance", async () => {
  const dir = tmp();
  const calls = [];
  const { default: sharp } = await import("sharp");
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } })
    .png()
    .toBuffer();
  const frames = [
    { png, ms: 1000 },
    { png, ms: 2000 },
  ];
  frames.waitedMs = 16000;
  const fakeRun = (cmd, args) => {
    calls.push([cmd, args]);
    writeFileSync(args.at(-1), `${cmd}:${args.at(-1)}`);
  };
  const entry = await clipEntry({ frames, spec: LOOP, slug: "a-post", dir, takenOn: "2026-11-15", run: fakeRun });
  assert.equal(entry.kind, "video");
  assert.equal(calls.length, 2);
  assert.ok(calls.every(([c, a]) => c === "ffmpeg" && a.includes("-t") && a[a.indexOf("-t") + 1] === "3.00"));
  for (const k of ["poster", "mp4", "webm"])
    assert.match(
      entry[k],
      /^https:\/\/krizaka-assets\.b-cdn\.net\/sites\/blog\/posts\/a-post\/cockpit-rafraichir(-poster)?\.[0-9a-f]{10}\.(webp|mp4|webm)$/,
    );
  assert.match(entry.made.note, /refresh itself took about 16 seconds, the wait is cut out/);
  assert.match(entry.made.model, /^none/);
});
