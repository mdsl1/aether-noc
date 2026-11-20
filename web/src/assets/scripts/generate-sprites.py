"""
Deterministic 32-bit Dark Fantasy Pixel Art Sprite Generator for A.E.T.H.E.R.
Generates lossless WebP sprites with transparent backgrounds and crisp nearest-neighbor scaling.
"""

from pathlib import Path
from PIL import Image, ImageDraw

OUT_DIR = Path(__file__).resolve().parent.parent / "src" / "assets" / "sprites"

# Palette (Dark Fantasy Obsidian + Moss)
TRANSPARENT = (0, 0, 0, 0)
OUTLINE = (7, 8, 16, 255)          # #070810
ROCK_DEEP = (13, 15, 26, 255)      # #0D0F1A
ROCK_DARK = (21, 24, 39, 255)      # #151827
ROCK_MID = (27, 31, 48, 255)       # #1B1F30
ROCK_LIGHT = (40, 46, 70, 255)     # #282E46
ROCK_HIGHLIGHT = (58, 66, 98, 255) # #3A4262

MOSS_DARK = (19, 38, 31, 255)      # #13261F
MOSS_MID = (30, 58, 47, 255)       # #1E3A2F
MOSS_LIGHT = (45, 90, 63, 255)     # #2D5A3F
MOSS_TIP = (64, 122, 84, 255)      # #407A54

TOP_FLOOR_DARK = (16, 19, 32, 255) # #101320
TOP_FLOOR_MID = (22, 26, 42, 255)  # #161A2A

RUIN_DARK = (23, 27, 42, 255)      # #171B2A
RUIN_MID = (34, 39, 59, 255)       # #22273B
RUIN_LIGHT = (47, 54, 80, 255)     # #2F3650


def hash2d(x: int, y: int, seed: int = 0) -> int:
    n = (x * 374761393 + y * 668265263 + seed * 1442695041) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return (n ^ (n >> 16)) & 0xFF


def add_outline(img: Image.Image) -> Image.Image:
    """Add 1px dark outline around non-transparent pixels."""
    w, h = img.size
    src = img.load()
    out = img.copy()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] == 0:
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] > 0:
                        dst[x, y] = OUTLINE
                        break
    return out


def draw_vine(px, x: int, y_start: int, length: int, seed: int, max_h: int):
    cur_x = x
    for i in range(length):
        y = y_start + i
        if y >= max_h:
            break
        if i > 0 and hash2d(x, i, seed) % 5 == 0:
            cur_x += -1 if (hash2d(x, i, seed + 7) % 2 == 0) else 1
        color = MOSS_MID if i % 2 == 0 else MOSS_DARK
        if i == length - 1:
            color = MOSS_LIGHT
        px[cur_x, y] = color
        if i < length - 2 and hash2d(cur_x, y, seed + 3) % 3 == 0:
            px[cur_x + 1, y] = MOSS_LIGHT if i % 4 == 0 else MOSS_DARK


def draw_broken_pillar(px, x: int, y_base: int, height: int, width: int = 4):
    """Draw a subtle weathered stone pillar stump with moss."""
    for dy in range(height):
        y = y_base - dy
        for dx in range(width):
            # Jagged broken top
            if dy == height - 1 and dx == width - 1:
                continue
            if dx == 0:
                px[x + dx, y] = RUIN_LIGHT if dy % 2 == 0 else RUIN_MID
            elif dx == width - 1:
                px[x + dx, y] = RUIN_DARK
            else:
                px[x + dx, y] = RUIN_MID
        # Moss creeping up the base
        if dy < 2:
            px[x, y] = MOSS_MID
            px[x + width - 1, y] = MOSS_DARK


def draw_flagstones(px, x: int, y: int, count: int, seed: int):
    """Draw subtle cracked ancient flagstones on the top platform."""
    for i in range(count):
        fx = x + i * 4
        if hash2d(fx, y, seed) % 3 == 0:
            continue
        px[fx, y] = RUIN_MID
        px[fx + 1, y] = RUIN_LIGHT if i % 2 == 0 else RUIN_MID
        px[fx + 2, y] = RUIN_DARK
        px[fx + 1, y + 1] = RUIN_DARK


def generate_island(
    w: int,
    h: int,
    top_y: int,
    rx: int,
    ry: int,
    depth: int,
    seed: int,
    taper_bias: float = 0.0,
    vine_positions: list[tuple[int, int]] | None = None,
) -> Image.Image:
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    px = img.load()
    cx = w // 2

    # 1. Under-rock body (faceted obsidian)
    for y in range(top_y, min(h - 2, top_y + depth)):
        t = (y - top_y) / max(1, depth)
        # Tapered width with faceted crags
        crag = ((hash2d(y // 3, seed, 11) % 7) - 3) * (1.0 - t * 0.5)
        half_w = int(rx * (1.0 - t ** 1.35) + crag)
        if half_w <= 0:
            continue
        x_center = cx + int(taper_bias * t * 14)
        for x in range(max(1, x_center - half_w), min(w - 1, x_center + half_w + 1)):
            rel_x = (x - x_center) / max(1, half_w)
            n = hash2d(x // 2, y // 2, seed)
            # Lighting from top-left
            if rel_x < -0.35 and t < 0.7:
                c = ROCK_LIGHT if n % 3 == 0 else ROCK_MID
            elif rel_x > 0.35 or t > 0.75:
                c = ROCK_DEEP if n % 2 == 0 else ROCK_DARK
            else:
                c = ROCK_MID if n % 4 == 0 else ROCK_DARK
            # Vertical facet cracks
            if abs((x + hash2d(0, y // 4, seed)) % 11) == 0 and t > 0.15:
                c = ROCK_DEEP
            px[x, y] = c

    # 2. Flat top platform (ellipse)
    for y in range(max(1, top_y - ry), min(h - 1, top_y + ry + 1)):
        for x in range(1, w - 1):
            dx = (x - cx) / rx
            dy = (y - top_y) / ry
            dist = dx * dx + dy * dy
            if dist <= 1.0:
                n = hash2d(x, y, seed + 99)
                if dist > 0.66:
                    # Richer mossy rim creeping inward
                    if n % 5 == 0:
                        px[x, y] = MOSS_TIP
                    elif n % 2 == 0:
                        px[x, y] = MOSS_LIGHT
                    else:
                        px[x, y] = MOSS_MID
                elif dist > 0.54:
                    if n % 4 == 0:
                        px[x, y] = MOSS_MID
                    elif n % 2 == 0:
                        px[x, y] = MOSS_DARK
                    else:
                        px[x, y] = ROCK_MID
                else:
                    # Flat dark obsidian floor with occasional sprouting moss tufts
                    if n % 19 == 0:
                        px[x, y] = MOSS_DARK
                    elif n % 7 == 0:
                        px[x, y] = TOP_FLOOR_MID
                    else:
                        px[x, y] = TOP_FLOOR_DARK

    # 3. Front rim thickness & moss overhang
    for x in range(cx - rx, cx + rx + 1):
        dx = (x - cx) / rx
        if abs(dx) <= 1.0:
            rim_y = top_y + int(ry * (1.0 - dx * dx) ** 0.5)
            if 0 <= rim_y < h - 2:
                px[x, rim_y] = MOSS_DARK
                if hash2d(x, rim_y, seed + 5) % 3 == 0:
                    px[x, rim_y + 1] = MOSS_MID

    # 4. Hanging vines
    if vine_positions:
        for vx_off, vlen in vine_positions:
            vx = cx + vx_off
            dx = vx_off / rx
            if abs(dx) < 0.95:
                vy = top_y + int(ry * (1.0 - dx * dx) ** 0.5)
                draw_vine(px, vx, vy, vlen, seed + vx_off, h - 2)

    return add_outline(img)


def generate_totem_base() -> Image.Image:
    # 32x48 grid -> upscaled 2x to 64x96
    w, h = 32, 48
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    px = img.load()
    cx = w // 2

    # Obelisk body
    for y in range(6, 42):
        # Slight taper toward top
        if y < 10:
            half_w = 3 + (y - 6)
        else:
            half_w = 7 + (y - 10) // 16
        for x in range(cx - half_w, cx + half_w + 1):
            rel_x = x - cx
            n = hash2d(x, y, 42)
            if rel_x == -half_w:
                px[x, y] = ROCK_HIGHLIGHT if y < 34 else ROCK_LIGHT
            elif rel_x == half_w:
                px[x, y] = ROCK_DEEP
            elif rel_x < 0:
                px[x, y] = ROCK_LIGHT if n % 5 == 0 else ROCK_MID
            else:
                px[x, y] = ROCK_DARK if n % 3 == 0 else ROCK_MID

    # Recessed dark rune panel in center (y: 16..31, x: cx-4..cx+4)
    for y in range(16, 32):
        for x in range(cx - 4, cx + 5):
            if y == 16 or x == cx - 4:
                px[x, y] = OUTLINE
            elif y == 31 or x == cx + 4:
                px[x, y] = ROCK_LIGHT
            else:
                px[x, y] = (10, 12, 22, 255)  # Smooth dark recessed area

    # Base stones & dark green moss
    for y in range(38, 45):
        span = 9 + (y - 38) // 2
        for x in range(cx - span, cx + span + 1):
            n = hash2d(x, y, 77)
            if y >= 42:
                px[x, y] = MOSS_DARK if n % 2 == 0 else ROCK_DEEP
            elif n % 3 == 0:
                px[x, y] = MOSS_LIGHT
            elif n % 2 == 0:
                px[x, y] = MOSS_MID
            else:
                px[x, y] = ROCK_DARK

    return add_outline(img)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. island-core.webp (170x130 -> 340x260)
    core = generate_island(
        w=170,
        h=130,
        top_y=32,
        rx=72,
        ry=22,
        depth=88,
        seed=101,
        taper_bias=0.0,
        vine_positions=[
            (-60, 14), (-52, 22), (-40, 18), (-34, 28), (-20, 16),
            (-12, 20), (6, 15), (22, 26), (36, 18), (48, 22), (60, 14),
        ],
    )
    core_px = core.load()
    draw_broken_pillar(core_px, 34, 24, 9, width=4)
    draw_broken_pillar(core_px, 130, 26, 7, width=4)
    draw_flagstones(core_px, 58, 30, 7, seed=101)
    core_up = core.resize((340, 260), Image.Resampling.NEAREST)
    core_up.save(OUT_DIR / "island-core.webp", format="WEBP", lossless=True, quality=100)

    # 2. island-satellite-a.webp (120x95 -> 240x190)
    sat_a = generate_island(
        w=120,
        h=95,
        top_y=24,
        rx=48,
        ry=16,
        depth=62,
        seed=202,
        taper_bias=-0.35,
        vine_positions=[(-38, 14), (-32, 20), (-22, 16), (-18, 24), (-6, 14), (16, 12)],
    )
    sat_a_px = sat_a.load()
    draw_broken_pillar(sat_a_px, 24, 19, 7, width=3)
    draw_flagstones(sat_a_px, 46, 22, 5, seed=202)
    sat_a_up = sat_a.resize((240, 190), Image.Resampling.NEAREST)
    sat_a_up.save(OUT_DIR / "island-satellite-a.webp", format="WEBP", lossless=True, quality=100)

    # 3. island-satellite-b.webp (120x95 -> 240x190)
    sat_b = generate_island(
        w=120,
        h=95,
        top_y=24,
        rx=46,
        ry=15,
        depth=64,
        seed=309,
        taper_bias=0.45,
        vine_positions=[(-24, 12), (4, 16), (10, 20), (24, 26), (35, 18), (40, 13)],
    )
    sat_b_px = sat_b.load()
    draw_broken_pillar(sat_b_px, 88, 19, 6, width=4)
    draw_flagstones(sat_b_px, 40, 23, 4, seed=309)
    sat_b_up = sat_b.resize((240, 190), Image.Resampling.NEAREST)
    sat_b_up.save(OUT_DIR / "island-satellite-b.webp", format="WEBP", lossless=True, quality=100)

    # 4. totem-base.webp (32x48 -> 64x96)
    totem = generate_totem_base()
    totem_up = totem.resize((64, 96), Image.Resampling.NEAREST)
    totem_up.save(OUT_DIR / "totem-base.webp", format="WEBP", lossless=True, quality=100)

    for name in ("island-core.webp", "island-satellite-a.webp", "island-satellite-b.webp", "totem-base.webp"):
        im = Image.open(OUT_DIR / name)
        print(f"{name}: {im.size[0]}x{im.size[1]}px, mode={im.mode}")


if __name__ == "__main__":
    main()
