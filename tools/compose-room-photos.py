"""
Build the move-in / move-out demo pair from one stock photograph.

No stock library has a genuine matched pair — that is the whole point of the
product — so the move-out frame is composited. The rules it follows are the
product's own semantics:

  * the hairline crack appears in BOTH frames, identically. It is the
    "already there at move-in" finding, so it must genuinely be there.
  * the water stain appears only in move-out. That is the new damage.
  * skirting scuff is faint at move-in and a little heavier at move-out.
  * move-out carries a slightly different exposure and white balance, because
    "ignores changes that are only lighting" is a claim the demo should
    actually be exercising rather than asserting.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops
import random

# Run from the repo root:  python3 tools/compose-room-photos.py
# Needs Pillow, and the source photo kept alongside the output.
SRC = "public/rooms/source-room.jpg"
OUT = "public/rooms"
W, H = 1280, 960          # 4:3, matching the UI's aspect-[4/3]

random.seed(7)            # deterministic output

base = Image.open(SRC).convert("RGB")
# crop 1600x1067 -> 4:3, keeping the doorway at left and the window at right
ch = base.height
cw = int(ch * 4 / 3)
left = (base.width - cw) // 2
base = base.crop((left, 0, left + cw, ch)).resize((W, H), Image.LANCZOS)


def crack(img, seed=3):
    """A hairline crack on the left-hand wall. Identical in both frames."""
    rnd = random.Random(seed)
    layer = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(layer)
    x, y = int(W * 0.235), int(H * 0.205)
    pts = [(x, y)]
    for _ in range(26):
        x += rnd.randint(-5, 5)
        y += rnd.randint(7, 13)
        pts.append((x, y))
    d.line(pts, fill=150, width=2, joint="curve")
    # a short branch, which is what makes a crack read as a crack
    bx, by = pts[15]
    d.line([(bx, by), (bx + 16, by + 13), (bx + 24, by + 30)], fill=110, width=2)
    layer = layer.filter(ImageFilter.GaussianBlur(0.7))
    dark = Image.new("RGB", (W, H), (38, 34, 32))
    return Image.composite(dark, img, layer.point(lambda v: int(v * 0.72)))


def stain(img):
    """Water staining spreading up from the skirting. Move-out only."""
    rnd = random.Random(11)
    cx, cy = int(W * 0.395), int(H * 0.555)

    # body: overlapping ellipses read as an organic edge, one ellipse reads
    # as a sticker
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    for _ in range(30):
        ox = cx + rnd.randint(-66, 66)
        oy = cy + rnd.randint(-40, 58)
        rx = rnd.randint(26, 62)
        ry = rnd.randint(18, 44)
        d.ellipse([ox - rx, oy - ry, ox + rx, oy + ry], fill=rnd.randint(110, 205))
    mask = mask.filter(ImageFilter.GaussianBlur(18))

    # tide line: damp dries to a darker rim at its high-water mark, and it is
    # the single cue that separates a stain from a shadow
    rim = Image.new("L", (W, H), 0)
    rd = ImageDraw.Draw(rim)
    for _ in range(30):
        ox = cx + rnd.randint(-64, 64)
        oy = cy + rnd.randint(-38, 20)
        rx = rnd.randint(30, 66)
        ry = rnd.randint(20, 46)
        rd.ellipse([ox - rx, oy - ry, ox + rx, oy + ry], outline=190, width=5)
    rim = rim.filter(ImageFilter.GaussianBlur(7))
    mask = ImageChops.lighter(mask, rim)

    tint = Image.new("RGB", (W, H), (116, 82, 48))
    stained = ImageChops.multiply(
        img, Image.blend(Image.new("RGB", (W, H), "white"), tint, 0.85)
    )
    out = Image.composite(stained, img, mask)

    # a denser core, applied after, so the middle is unmistakably discoloured
    core = Image.new("L", (W, H), 0)
    ImageDraw.Draw(core).ellipse([cx - 52, cy - 16, cx + 56, cy + 48], fill=150)
    core = core.filter(ImageFilter.GaussianBlur(22))
    deep = ImageChops.multiply(out, Image.new("RGB", (W, H), (196, 168, 132)))
    return Image.composite(deep, out, core)


def scuff(img, strength):
    """Foot-height abrasion along the skirting board."""
    rnd = random.Random(5)
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    y = int(H * 0.672)
    for _ in range(90):
        x = rnd.randint(int(W * 0.30), int(W * 0.72))
        w = rnd.randint(10, 46)
        h = rnd.randint(2, 6)
        y0 = y + rnd.randint(-7, 7)
        d.ellipse([x, y0, x + w, y0 + h], fill=rnd.randint(40, 110))
    mask = mask.filter(ImageFilter.GaussianBlur(4)).point(lambda v: int(v * strength))
    dark = Image.new("RGB", (W, H), (96, 88, 80))
    return Image.composite(dark, img, mask)


# ── move-in ────────────────────────────────────────────────────────
movein = crack(base)
movein = scuff(movein, 0.35)
movein.save(f"{OUT}/living-movein.jpg", quality=86, optimize=True, progressive=True)

# ── move-out: same crack, plus the stain, plus a lighting difference ──
moveout = crack(base)
moveout = scuff(moveout, 0.75)
moveout = stain(moveout)
moveout = ImageEnhance.Brightness(moveout).enhance(0.94)
moveout = ImageEnhance.Color(moveout).enhance(1.06)
# cooler cast, as though shot at a different hour
r, g, b = moveout.split()
moveout = Image.merge("RGB", (r.point(lambda v: max(0, v - 5)), g, b.point(lambda v: min(255, v + 7))))
moveout.save(f"{OUT}/living-moveout.jpg", quality=86, optimize=True, progressive=True)

print("wrote living-movein.jpg and living-moveout.jpg")
