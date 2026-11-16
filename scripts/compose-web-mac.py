#!/usr/bin/env python3
"""Sets a web capture and the Mac capture(s) of the same choice side by side in ONE figure image (krizaka-internal#3912).

  python3 scripts/compose-web-mac.py --web <web.webp> --mac <mac.png>[,<mac2.png>] [--crop <px>] [--stack] --out <dir>/<stem>

The Mac captures come from the Mac journey of verikora (`scripts/desktop-journey.mjs`, artifact `desktop-journey` of the Desktop workflow):
each one is cut to its first `--crop` px (the empty lower part of a window says nothing), stacked when there are two, scaled to the
web capture's height and set on its right (`--stack`: scaled to the web capture's width and set under it, for a wide web capture that side by side would shrink to nothing). Writes `<stem>-{480,960,full}.webp` and prints the blur placeholder, the sizes and the file
names as JSON for `lib/media.json`. Needs Pillow.
"""
import argparse, base64, io, json
from PIL import Image

GAP, INK = 16, (154, 160, 166)

def main():
    a = argparse.ArgumentParser()
    a.add_argument("--web", required=True)
    a.add_argument("--mac", required=True)
    a.add_argument("--crop", type=int, default=0)
    a.add_argument("--stack", action="store_true")
    a.add_argument("--out", required=True)
    o = a.parse_args()
    web = Image.open(o.web).convert("RGB")
    macs = []
    for f in o.mac.split(","):
        m = Image.open(f).convert("RGB")
        macs.append(m.crop((0, 0, m.width, min(m.height, o.crop))) if o.crop else m)
    col = Image.new("RGB", (macs[0].width, sum(m.height for m in macs) + GAP * (len(macs) - 1)), INK)
    y = 0
    for m in macs:
        col.paste(m, (0, y))
        y += m.height + GAP
    if o.stack:
        col = col.resize((web.width, round(col.height * web.width / col.width)), Image.LANCZOS)
        sheet = Image.new("RGB", (web.width, web.height + GAP + col.height), INK)
        sheet.paste(web, (0, 0))
        sheet.paste(col, (0, web.height + GAP))
    else:
        col = col.resize((round(col.width * web.height / col.height), web.height), Image.LANCZOS)
        sheet = Image.new("RGB", (web.width + GAP + col.width, web.height), INK)
        sheet.paste(web, (0, 0))
        sheet.paste(col, (web.width + GAP, 0))
    sizes = {}
    for label, w in (("480", 480), ("960", 960), ("full", sheet.width)):
        w = min(w, sheet.width)
        im = sheet.resize((w, round(sheet.height * w / sheet.width)), Image.LANCZOS)
        im.save(f"{o.out}-{label}.webp", "WEBP", quality=82, method=6)
        sizes[label] = [w, im.height]
    blur = sheet.resize((24, max(1, round(24 * sheet.height / sheet.width))), Image.LANCZOS)
    buf = io.BytesIO()
    blur.save(buf, "WEBP", quality=40)
    print(json.dumps({"width": sheet.width, "height": sheet.height, "sizes": sizes,
                      "blur": "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()}))

main()
