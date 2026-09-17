"""Change detection between move-in and move-out photos, without AI.

The photos are compared on a coarse grid after normalising size and
brightness. Cells that differ a lot are grouped into regions, and only
those regions are shown to the vision model. This keeps a small local
model fast and focused, and gives the report boxes to draw.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

Image.MAX_IMAGE_PIXELS = 40_000_000  # refuse decompression bombs

WORK_SIZE = (320, 240)
GRID = (16, 12)  # columns, rows
CELL_THRESHOLD = 0.12  # mean absolute difference (0..1) for a changed cell
MISALIGNED_SHARE = 0.55  # more than this share of changed cells: probably a different view
MAX_REGIONS = 3
CROP_EDGE = 448


@dataclass
class Region:
    # Normalised box (0..1) in image coordinates.
    x: float
    y: float
    w: float
    h: float
    score: float


@dataclass
class PairAnalysis:
    before_id: str
    after_id: str
    similarity: float  # 1 = identical
    changed_share: float
    misaligned: bool
    regions: list[Region]


def load(data: bytes) -> Image.Image:
    return ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")


def _features(image: Image.Image) -> np.ndarray:
    gray = ImageOps.grayscale(image.resize(WORK_SIZE)).filter(ImageFilter.GaussianBlur(2))
    arr = np.asarray(gray, dtype=np.float32) / 255.0
    # Normalise exposure so a lamp switched on isn't reported as damage.
    return (arr - arr.mean()) / (arr.std() + 1e-6) * 0.2 + 0.5


def _cell_diffs(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    cols, rows = GRID
    h, w = a.shape
    diff = np.abs(a - b)
    cells = diff[: h - h % rows, : w - w % cols].reshape(rows, h // rows, cols, w // cols)
    return cells.mean(axis=(1, 3))


def similarity(a: Image.Image, b: Image.Image) -> float:
    return float(1.0 - np.abs(_features(a) - _features(b)).mean() * 2)


def analyse_pair(before_id: str, before: Image.Image, after_id: str, after: Image.Image) -> PairAnalysis:
    fa, fb = _features(before), _features(after)
    cells = _cell_diffs(fa, fb)
    changed = cells > CELL_THRESHOLD
    share = float(changed.mean())
    misaligned = share > MISALIGNED_SHARE
    regions = [] if misaligned else _group(changed, cells)
    return PairAnalysis(
        before_id=before_id,
        after_id=after_id,
        similarity=float(1.0 - np.abs(fa - fb).mean() * 2),
        changed_share=share,
        misaligned=misaligned,
        regions=regions,
    )


def _group(changed: np.ndarray, cells: np.ndarray) -> list[Region]:
    rows, cols = changed.shape
    seen = np.zeros_like(changed)
    regions: list[Region] = []
    for r in range(rows):
        for c in range(cols):
            if not changed[r, c] or seen[r, c]:
                continue
            stack, members = [(r, c)], []
            seen[r, c] = True
            while stack:
                y, x = stack.pop()
                members.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < rows and 0 <= nx < cols and changed[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
            ys = [m[0] for m in members]
            xs = [m[1] for m in members]
            score = float(sum(cells[y, x] for y, x in members))
            # Pad by one cell so the crop shows context around the change.
            x0, x1 = max(min(xs) - 1, 0), min(max(xs) + 2, cols)
            y0, y1 = max(min(ys) - 1, 0), min(max(ys) + 2, rows)
            regions.append(Region(x0 / cols, y0 / rows, (x1 - x0) / cols, (y1 - y0) / rows, score))
    regions.sort(key=lambda reg: reg.score, reverse=True)
    return regions[:MAX_REGIONS]


def _crop(image: Image.Image, region: Region) -> Image.Image:
    w, h = image.size
    box = (
        int(region.x * w),
        int(region.y * h),
        int((region.x + region.w) * w),
        int((region.y + region.h) * h),
    )
    crop = image.crop(box)
    crop.thumbnail((CROP_EDGE, CROP_EDGE))
    return crop


def side_by_side(before: Image.Image, after: Image.Image, region: Region | None = None) -> bytes:
    """One image with BEFORE on the left and AFTER on the right, labelled.

    Putting both in a single image avoids small models mixing up which
    photo came first.
    """
    left = _crop(before, region) if region else before.copy()
    right = _crop(after, region) if region else after.copy()
    if not region:
        left.thumbnail((CROP_EDGE, CROP_EDGE))
        right.thumbnail((CROP_EDGE, CROP_EDGE))
    right = right.resize(left.size)
    label_h, gap = 28, 12
    canvas = Image.new("RGB", (left.width * 2 + gap, left.height + label_h), "white")
    canvas.paste(left, (0, label_h))
    canvas.paste(right, (left.width + gap, label_h))
    draw = ImageDraw.Draw(canvas)
    draw.text((6, 6), "BEFORE (move-in)", fill="black")
    draw.text((left.width + gap + 6, 6), "AFTER (move-out)", fill="black")
    out = io.BytesIO()
    canvas.save(out, format="JPEG", quality=88)
    return out.getvalue()
