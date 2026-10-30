#!/usr/bin/env python3
"""A contact sheet of the series, in chapter order (to be validated by the founder): python3 scripts/contact-sheet.py <dir> <out.png>
Needs Pillow (the Orazaka media worker's venv has it)."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

src, out = Path(sys.argv[1]), Path(sys.argv[2])
chapters = json.loads((Path(__file__).resolve().parent.parent / "content/image-series/series.json").read_text())["chapters"]
cols, w, h, pad, label = 4, 480, 270, 12, 22
rows = -(-len(chapters) // cols)
sheet = Image.new("RGB", (cols * (w + pad) + pad, rows * (h + label + pad) + pad), (14, 14, 18))
draw = ImageDraw.Draw(sheet)
for i, c in enumerate(chapters):
    f = src / f"{i + 1:02d}-{c['post']}.png"
    x, y = pad + (i % cols) * (w + pad), pad + (i // cols) * (h + label + pad)
    if f.exists():
        sheet.paste(Image.open(f).convert("RGB").resize((w, h)), (x, y + label))
    draw.text((x, y + 4), f"{i + 1}. {c['post']}", fill=(220, 220, 230))
sheet.save(out)
