"""Compare local vision models on a few known before/after changes.

Usage:  .venv/bin/python eval_models.py qwen2.5vl:3b qwen3-vl:4b
"""

from __future__ import annotations

import sys
import time

from PIL import Image, ImageDraw

import agent
import vision

EXPECTED_DAMAGE = {"NEW_DAMAGE"}
EXPECTED_HARMLESS = {"NOT_DAMAGE", "WEAR_AND_TEAR", "NO_CHANGE"}


def room(draw_extra=None) -> Image.Image:
    img = Image.new("RGB", (1200, 900), (232, 226, 210))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 700, 1200, 900], fill=(160, 130, 100))  # floor
    d.rectangle([820, 220, 1030, 700], fill=(122, 82, 52))  # door
    d.ellipse([985, 450, 1005, 470], fill=(200, 170, 60))  # handle
    d.rectangle([120, 180, 420, 420], outline=(90, 90, 90), width=10)  # window frame
    if draw_extra:
        draw_extra(d)
    return img


CASES = [
    ("stain on wall", lambda d: d.ellipse([480, 300, 640, 420], fill=(80, 65, 40)), EXPECTED_DAMAGE),
    ("crack in wall", lambda d: d.line([(500, 150), (540, 260), (520, 340), (575, 470)], fill=(40, 40, 40), width=7), EXPECTED_DAMAGE),
    ("hole in door", lambda d: d.ellipse([890, 380, 960, 450], fill=(20, 15, 10)), EXPECTED_DAMAGE),
    ("box placed on floor", lambda d: d.rectangle([300, 560, 520, 740], fill=(196, 150, 90)), EXPECTED_HARMLESS),
]


def main(models: list[str]) -> None:
    before = room()
    for model in models:
        agent.MODEL_ID = model
        correct, started = 0, time.time()
        print(f"\n== {model}")
        for name, draw, expected in CASES:
            after = room(draw)
            analysis = vision.analyse_pair("b", before, "a", after)
            if not analysis.regions:
                print(f"  {name}: no change detected")
                continue
            label = agent.label_region(vision.side_by_side(before, after, analysis.regions[0]), "Bedroom")
            ok = label.status in expected
            correct += ok
            print(f"  {'OK ' if ok else 'BAD'} {name}: {label.status} ({label.item}) - {label.description}")
        print(f"  score {correct}/{len(CASES)} in {time.time() - started:.0f}s")


if __name__ == "__main__":
    main(sys.argv[1:] or [agent.MODEL_ID])
