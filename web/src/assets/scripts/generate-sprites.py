"""
Deterministic 32-bit Dark Fantasy 2D Pixel Art Sprite Generator for A.E.T.H.E.R.
Generates Terraria-style flat-top floating islands sized by totem capacity
(sm: 1-2, md: 3-4, lg: 5-6, core: imposing central spire) plus totem-base.webp.
All sprites use a consistent 2x nearest-neighbor pixel grid and transparent backgrounds.
"""

from pathlib import Path
from PIL import Image

OUT_DIR = Path(__file__).resolve().parent.parent / "sprites"

# Palette (Dark Fantasy Obsidian + Moss)
TRANSPARENT = (0, 0, 0, 0)
OUTLINE = (7, 8, 16, 255)           # #070810
ROCK_DEEP = (13, 15, 26, 255)       # #0D0F1A
ROCK_DARK = (21, 24, 39, 255)       # #151827
ROCK_MID = (27, 31, 48, 255)        # #1B1F30
ROCK_LIGHT = (40, 46, 70, 255)      # #282E46
ROCK_HIGHLIGHT = (58, 66, 98, 255)  # #3A4262

DIRT_DARK = (18, 22, 34, 255)       # #121622
DIRT_MID = (26, 32, 46, 255)        # #1A202E

MOSS_DARK = (19, 38, 31, 255)       # #13261F
MOSS_MID = (30, 58, 47, 255)        # #1E3A2F
MOSS_LIGHT = (45, 90, 63, 255)      # #2D5A3F
MOSS_TIP = (64, 122, 84, 255)       # #407A54

ARCANE_DIM = (56, 40, 96, 255)      # Subtle violet vein on Core island
ARCANE_GLOW = (109, 68, 186, 255)   # Subtle arcane core vein highlight

# Decorações orgânicas de borda (cogumelos bioluminescentes e pedras rúnicas)
MUSH_STEM = (148, 163, 184, 255)    # #94A3B8
MUSH_CYAN_DARK = (14, 116, 144, 255)
MUSH_CYAN_GLOW = (56, 189, 248, 255)
MUSH_VIOLET_DARK = (107, 33, 168, 255)
MUSH_VIOLET_GLOW = (192, 132, 252, 255)
RUNE_STONE_LIGHT = (71, 85, 105, 255)
RUNE_STONE_DARK = (30, 41, 59, 255)
RUNE_GLINT = (94, 234, 212, 255)    # #5EEAD4

# Fixed ground line in native pixels (upscaled 2x -> 12px from top of sprite)
GROUND_Y = 6


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


def draw_mushrooms(px, x: int, ground_y: int, variant: str, max_w: int):
    """Draw a tiny cluster of 2 bioluminescent pixel mushrooms sitting on the grass."""
    cap_glow = MUSH_CYAN_GLOW if variant == "cyan" else MUSH_VIOLET_GLOW
    cap_dark = MUSH_CYAN_DARK if variant == "cyan" else MUSH_VIOLET_DARK

    if x < 3 or x + 5 >= max_w - 2 or ground_y < 4:
        return

    # Taller mushroom
    px[x + 1, ground_y - 1] = MUSH_STEM
    px[x + 1, ground_y - 2] = MUSH_STEM
    px[x, ground_y - 3] = cap_dark
    px[x + 1, ground_y - 3] = cap_glow
    px[x + 2, ground_y - 3] = cap_dark
    px[x + 1, ground_y - 4] = cap_glow

    # Smaller companion mushroom
    px[x + 4, ground_y - 1] = MUSH_STEM
    px[x + 3, ground_y - 2] = cap_dark
    px[x + 4, ground_y - 2] = cap_glow


def draw_rune_stone(px, x: int, ground_y: int, max_w: int):
    """Draw a tiny weathered rune-stone tucked on the outer shoulder of the island."""
    if x < 3 or x + 4 >= max_w - 2 or ground_y < 5:
        return

    # 3x4 weathered stone with a 1-2px glowing rune mark
    for dy in range(1, 5):
        y = ground_y - dy
        if dy == 4:
            px[x + 1, y] = RUNE_STONE_LIGHT
        else:
            px[x, y] = RUNE_STONE_LIGHT if dy >= 2 else MOSS_MID
            px[x + 1, y] = RUNE_STONE_DARK
            px[x + 2, y] = RUNE_STONE_DARK
    px[x + 1, ground_y - 2] = RUNE_GLINT
    px[x + 1, ground_y - 3] = ARCANE_GLOW


def draw_vine(px, x: int, y_start: int, length: int, seed: int, max_w: int, max_h: int):
    cur_x = x
    for i in range(length):
        y = y_start + i
        if y >= max_h - 1 or cur_x <= 1 or cur_x >= max_w - 2:
            break
        if i > 1 and hash2d(x, i, seed) % 5 == 0:
            cur_x += -1 if (hash2d(x, i, seed + 7) % 2 == 0) else 1
            cur_x = max(2, min(max_w - 3, cur_x))
        color = MOSS_MID if i % 2 == 0 else MOSS_DARK
        if i == length - 1:
            color = MOSS_LIGHT
        px[cur_x, y] = color
        if i < length - 2 and hash2d(cur_x, y, seed + 3) % 3 == 0:
            side = 1 if i % 2 == 0 else -1
            if 1 < cur_x + side < max_w - 2:
                px[cur_x + side, y] = MOSS_LIGHT if i % 4 == 0 else MOSS_DARK


def generate_island_2d(
    w: int,
    h: int,
    flat_half_w: int,
    depth: int,
    seed: int,
    taper_bias: float = 0.0,
    is_core: bool = False,
) -> Image.Image:
    """
    Generate a 2D side-view (Terraria-style) dark fantasy floating island.
    Top flat surface sits cleanly at y = GROUND_Y so totems stand side-by-side.
    """
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    px = img.load()
    cx = w // 2
    left_edge = cx - flat_half_w
    right_edge = cx + flat_half_w

    # 1. Under-rock obsidian cliff body (Terraria-style stratified tapered crag)
    rock_start_y = GROUND_Y + 4
    max_y = min(h - 2, GROUND_Y + depth)
    total_rock_h = max(1, max_y - rock_start_y)

    # Multi-peak Terraria bottom profile (1 main central spire + subtle side crags)
    bottom_profile: dict[int, int] = {}
    for x in range(left_edge, right_edge + 1):
        nx = (x - cx) / max(1, flat_half_w)  # -1..1
        # Main inverted cone + subtle secondary peaks on wider islands
        base_curve = max(0.0, 1.0 - abs(nx) ** 1.45)
        side_crag = 0.14 * max(0.0, 1.0 - ((abs(nx) - 0.58) / 0.24) ** 2)
        if flat_half_w < 60:
            side_crag *= 0.45
        # Asymmetric lean via taper_bias
        bias_factor = 1.0 + taper_bias * nx * 0.18
        jitter = ((hash2d(x // 3, seed, 19) % 7) - 3) / max(1, total_rock_h)
        col_t = max(0.06, min(1.0, (base_curve + side_crag) * bias_factor + jitter))
        bottom_profile[x] = rock_start_y + int(col_t * total_rock_h)

    for x in range(left_edge, right_edge + 1):
        col_bottom = min(h - 2, bottom_profile[x])
        col_h = max(1, col_bottom - rock_start_y)
        rel_x = (x - left_edge) / max(1, right_edge - left_edge)  # 0 left, 1 right

        for y in range(rock_start_y, col_bottom + 1):
            t_col = (y - rock_start_y) / col_h
            t_glob = (y - rock_start_y) / total_rock_h
            n = hash2d(x // 2, y // 2, seed)
            fine = hash2d(x, y, seed + 53)
            strata = (y // 4 + hash2d(x // 6, 0, seed) % 2) % 3

            # Directional top-left lighting with rocky texture
            if rel_x < 0.22 and t_glob < 0.65:
                if fine % 5 == 0 and t_glob < 0.3:
                    c = ROCK_HIGHLIGHT
                elif n % 2 == 0:
                    c = ROCK_LIGHT
                else:
                    c = ROCK_MID
            elif rel_x < 0.42 and t_glob < 0.55:
                c = ROCK_LIGHT if n % 4 == 0 else (ROCK_MID if n % 3 != 0 else ROCK_DARK)
            elif rel_x > 0.78 or t_col > 0.78:
                c = ROCK_DEEP if n % 2 == 0 else ROCK_DARK
            else:
                if strata == 0:
                    c = ROCK_MID if n % 3 != 0 else ROCK_DARK
                elif strata == 1:
                    c = ROCK_DARK if n % 4 != 0 else ROCK_MID
                else:
                    c = ROCK_DARK if n % 2 == 0 else ROCK_DEEP

            # Sub-soil transition right below the turf
            if y < rock_start_y + 3 and fine % 3 == 0:
                c = DIRT_MID if rel_x < 0.5 else DIRT_DARK

            # Vertical obsidian facet cracks
            crack_x = (x + hash2d(0, y // 5, seed + 17) % 3) % 14
            if crack_x == 0 and 0.14 < t_col < 0.85 and 0.12 < rel_x < 0.88:
                c = ROCK_DEEP

            px[x, y] = c

    # 2. Subtle embedded arcane crystal accents on the Core island
    if is_core:
        crystals = [
            (cx - 18, rock_start_y + 14, 5),
            (cx + 14, rock_start_y + 20, 4),
            (cx - 2, rock_start_y + 32, 6),
        ]
        for cr_x, cr_y, cr_h in crystals:
            for dy in range(cr_h):
                w_span = 1 if dy in (0, cr_h - 1) else 2
                for dx in range(-w_span + 1, w_span):
                    px_x, px_y = cr_x + dx, cr_y + dy
                    if 2 <= px_x < w - 2 and rock_start_y < px_y < h - 3:
                        px[px_x, px_y] = ARCANE_GLOW if dx <= 0 and dy < cr_h - 1 else ARCANE_DIM

    # 3. Flat 2D Grass / Moss Top Layer (y = GROUND_Y .. GROUND_Y + 4)
    # Slight rounded overhang at both ends (+2px) like Terraria grass blocks
    turf_left = max(2, left_edge - 2)
    turf_right = min(w - 3, right_edge + 2)

    for x in range(turf_left, turf_right + 1):
        n = hash2d(x, GROUND_Y, seed + 99)
        is_corner = x <= turf_left + 1 or x >= turf_right - 1

        # Top surface line (y = GROUND_Y) — crisp and flat!
        if not is_corner:
            px[x, GROUND_Y] = MOSS_TIP if n % 3 == 0 else MOSS_LIGHT
        else:
            px[x, GROUND_Y + 1] = MOSS_MID

        # Lush turf thickness (3..5px deep with irregular mossy overhang)
        overhang = 3 + (hash2d(x // 2, 1, seed + 13) % 3)
        if is_corner:
            overhang = 2

        for dy in range(1, overhang + 1):
            y = GROUND_Y + dy
            if y >= h - 2:
                break
            m = hash2d(x, y, seed + 41)
            if dy == 1:
                px[x, y] = MOSS_LIGHT if m % 3 != 0 else MOSS_MID
            elif dy == 2:
                px[x, y] = MOSS_MID if m % 2 == 0 else MOSS_DARK
            else:
                px[x, y] = MOSS_DARK if m % 3 != 0 else MOSS_MID

        # Subtle grass blades sticking 1-2px above GROUND_Y (mostly near edges so center stays clean)
        dist_from_edge = min(x - turf_left, turf_right - x)
        if not is_corner and ((dist_from_edge < 10 and n % 4 == 0) or (n % 11 == 0)):
            px[x, GROUND_Y - 1] = MOSS_TIP if n % 2 == 0 else MOSS_LIGHT
            if dist_from_edge < 6 and n % 8 == 0:
                px[x, GROUND_Y - 2] = MOSS_TIP

    # 4. Hanging pixel vines along the underside of the grass lip
    vine_step = 18 if flat_half_w >= 80 else 15
    for vx in range(turf_left + 8, turf_right - 8, vine_step):
        v_hash = hash2d(vx, 7, seed + 211)
        if v_hash % 3 == 0:
            continue
        vlen = 7 + (v_hash % 12)
        vx_jitter = vx + ((v_hash % 5) - 2)
        draw_vine(px, vx_jitter, GROUND_Y + 4, vlen, seed + vx, w, h)

    # 5. Subtle edge decorations on outer shoulders (bioluminescent mushrooms & rune stones)
    # Placed strictly on outer margins so they never overlap centered totems
    draw_mushrooms(px, turf_left + 3, GROUND_Y, "cyan" if seed % 2 == 0 else "violet", w)
    if is_core or flat_half_w >= 60:
        draw_rune_stone(px, turf_right - 7, GROUND_Y, w)
    else:
        draw_mushrooms(px, turf_right - 8, GROUND_Y, "violet" if seed % 2 == 0 else "cyan", w)

    return add_outline(img)


def generate_totem_base() -> Image.Image:
    # 32x48 grid -> upscaled 2x to 64x96
    w, h = 32, 48
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    px = img.load()
    cx = w // 2

    # Obelisk body
    for y in range(6, 42):
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
                px[x, y] = (10, 12, 22, 255)

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


def save_2x(img: Image.Image, filename: str) -> None:
    up = img.resize((img.width * 2, img.height * 2), Image.Resampling.NEAREST)
    path = OUT_DIR / filename
    up.save(path, format="WEBP", lossless=True, quality=100)
    print(f"{filename}: {up.width}x{up.height}px (native {img.width}x{img.height}), mode={up.mode}")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Core island — imposing central spire (296x156px, flat top ~252px -> fits 1-3 totens)
    core = generate_island_2d(
        w=148,
        h=78,
        flat_half_w=63,
        depth=68,
        seed=101,
        taper_bias=0.0,
        is_core=True,
    )
    save_2x(core, "island-core.webp")

    # 2. Small island (1-2 totens) — 224x124px, flat top ~184px
    island_sm = generate_island_2d(
        w=112,
        h=62,
        flat_half_w=46,
        depth=52,
        seed=202,
        taper_bias=-0.22,
    )
    save_2x(island_sm, "island-sm.webp")

    # 3. Medium island (3-4 totens) — 356x140px, flat top ~316px
    island_md = generate_island_2d(
        w=178,
        h=70,
        flat_half_w=79,
        depth=60,
        seed=309,
        taper_bias=0.25,
    )
    save_2x(island_md, "island-md.webp")

    # 4. Large island (5-6 totens) — 496x156px, flat top ~452px
    island_lg = generate_island_2d(
        w=248,
        h=78,
        flat_half_w=113,
        depth=68,
        seed=417,
        taper_bias=-0.18,
    )
    save_2x(island_lg, "island-lg.webp")

    # 5. Totem base — 64x96px
    totem = generate_totem_base()
    save_2x(totem, "totem-base.webp")


if __name__ == "__main__":
    main()
