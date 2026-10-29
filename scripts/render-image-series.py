#!/usr/bin/env python3
"""Renders the blog's image series (krizaka-blog#193) with Orazaka's media worker engine (mflux, FLUX.2 [klein] 4B).

  python3 scripts/render-image-series.py --worker <orazaka-worker-media dir> --anchor <brand picture> --out <dir> [--only N]

Chapter N is made from the brand picture and chapter N-1 (reference images), so the series builds. The prompts and seeds are
content/image-series/series.json; nothing is rendered into the repository (the pictures go to Bunny, see docs/image-series.md).
Resumable: a chapter whose file exists is skipped. Run it through heavy-lock.sh with HEAVY_SLOTS_ALL=1 (GPU).
"""
import argparse, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def prompt_of(series: dict, index: int) -> str:
    chapter = series["chapters"][index]
    looks = ", ".join(series["birdLooks"][b] for b in chapter["birds"])
    parts = [series["style"], chapter["beat"], f"Birds in the picture: exactly one of each, never two of the same bird, small and round and friendly, and no others: {looks}."]
    if index > 0:
        parts.insert(1, series["continuity"])
    return " ".join(parts)


def sprites(series: dict, anchor: Path, out: Path) -> dict[str, Path]:
    """One crop of the brand picture per bird: the reference that carries a bird's look into the chapter where it arrives
    (an edit model copies every bird of a whole reference picture, so the whole brand picture is never a reference)."""
    from PIL import Image
    image = Image.open(anchor).convert("RGB")
    made = {}
    for bird, box in series["sprites"].items():
        made[bird] = out / f"sprite-{bird}.png"
        image.crop(tuple(box)).resize((512, round(512 * (box[3] - box[1]) / (box[2] - box[0])))).save(made[bird])
    return made


def command(series: dict, index: int, sprite: dict[str, Path], previous: Path | None, target: Path, worker: Path) -> list[str]:
    chapter = series["chapters"][index]
    arrived = [b for b in chapter["birds"] if index == 0 or b not in series["chapters"][index - 1]["birds"]]
    refs = ([str(previous)] if previous else []) + [str(sprite[b]) for b in arrived]
    return [
        str(worker / ".venv/bin/mflux-generate-flux2-edit"),
        "--model", series["model"],
        "--prompt", prompt_of(series, index),
        "--seed", str(series["chapters"][index]["seed"]),
        "--steps", str(series["steps"]),
        "--width", str(series["size"]["width"]),
        "--height", str(series["size"]["height"]),
        "--image-paths", *refs,
        "--output", str(target),
    ]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--worker", required=True, type=Path)
    ap.add_argument("--anchor", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--only", type=int)
    args = ap.parse_args()
    series = json.loads((ROOT / "content/image-series/series.json").read_text())
    args.out.mkdir(parents=True, exist_ok=True)
    sprite = sprites(series, args.anchor, args.out)
    previous = None
    for index, chapter in enumerate(series["chapters"]):
        target = args.out / f"{index + 1:02d}-{chapter['post']}.png"
        if (args.only is None or args.only == index + 1) and not target.exists():
            print(f"[{index + 1}/{len(series['chapters'])}] {chapter['post']}", flush=True)
            if subprocess.run(command(series, index, sprite, previous, target, args.worker)).returncode != 0:
                return 1
        previous = target if target.exists() else previous
    return 0


if __name__ == "__main__":
    sys.exit(main())
