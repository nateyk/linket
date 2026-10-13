#!/usr/bin/env python3
"""Transparent Li mark (symbol) — the square-crop companion to the wordmark.

Built at the small cut (tittle 42, dy -8) with transparent ground so it sits
beside live text at 16-42 px; the full wordmark stays the identity on
fixed-name surfaces (og, print, docs).

Outputs (measured, not hand-placed):
  brand/symbol/linket-mark-dark.svg   #ink #0a0a0a + #0049cc  (light grounds)
  brand/symbol/linket-mark-light.svg  #fff + lifted #0050de    (dark grounds)
viewBox = tight ink bbox of the Li crop at the small cut (tittle 42, dy -8).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze as A                       # noqa: E402
import build_icons as BI                  # noqa: E402
import build_round2 as R2                 # noqa: E402

BRAND = os.path.normpath(os.path.join(HERE, ".."))
SYM = os.path.join(BRAND, "symbol")
CROP = (40, 40, 225, 210)                 # Li crop search box (viewBox units;
                                          # x1 clears the n stem at 226)
INK = "#0a0a0a"
BLUE = "#0049cc"
LIFTED, _, _ = R2.lifted_blue()

DOT_W, DOT_DY = R2.DOT_W_S, R2.DOT_DY_S   # round-3 small cut (<=24 px rule)


def measure():
    """Tight ink bbox of the small-cut Li mark, in viewBox units."""
    l_d, i_d, dot_d = BI.mark_paths(DOT_W, DOT_DY)
    tmp = os.path.join(BRAND, "png", "_mark-measure.svg")
    with open(tmp, "w") as f:
        f.write(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 711 256">\n'
            f'  <g fill="{INK}"><path d="{l_d}"/><path d="{i_d}"/></g>\n'
            f'  <path fill="{BLUE}" d="{dot_d}"/>\n</svg>\n')
    w, h, ch, px = A.render(tmp, width=2844)     # 4x
    os.unlink(tmp)
    c = BI.measure_crop(w, h, ch, px, CROP)
    return c


def mark_svg(bbox, letter_fill, dot_fill):
    x0, y0, x1, y1 = bbox
    # viewBox: integers, rounded OUTWARD so the ink touches the edge exactly
    import math
    vx0, vy0 = math.floor(x0 + 1e-6), math.floor(y0 + 1e-6)
    vx1, vy1 = math.ceil(x1 - 1e-6), math.ceil(y1 - 1e-6)
    l_d, i_d, dot_d = BI.mark_paths(DOT_W, DOT_DY)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" role="img" '
        f'aria-label="Linket" '
        f'viewBox="{vx0} {vy0} {vx1 - vx0} {vy1 - vy0}" '
        f'width="{vx1 - vx0}" height="{vy1 - vy0}">\n'
        f'  <title>Linket</title>\n'
        f'  <g fill="{letter_fill}"><path d="{l_d}"/><path d="{i_d}"/></g>\n'
        f'  <path fill="{dot_fill}" d="{dot_d}"/>\n</svg>\n')


def verify(path, letter_hex, dot_hex):
    """Render the emitted file: ink fills the viewBox, colours exact,
    background transparent."""
    w, h, ch, px = A.render(path)
    xs, ys = [], []
    has_letter = has_dot = False
    for y in range(h):
        for x in range(w):
            o = (y * w + x) * ch
            a = px[o + 3] if ch == 4 else 255
            if a < 40:
                continue
            xs.append(x)
            ys.append(y)
            rgb = (px[o], px[o + 1], px[o + 2])
            if rgb == tuple(int(letter_hex[i:i + 2], 16) for i in (1, 3, 5)):
                has_letter = True
            if rgb == tuple(int(dot_hex[i:i + 2], 16) for i in (1, 3, 5)):
                has_dot = True
    ok_bbox = (min(xs) == 0 and min(ys) == 0 and
               max(xs) == w - 1 and max(ys) == h - 1)
    # transparent background (no tile): sample the top-right corner, which
    # sits above the raised small-cut tittle and must be empty
    transparent = ch == 4 and px[(w - 1) * ch + 3] == 0
    return ok_bbox, has_letter, has_dot, transparent, (w, h)


def main():
    os.makedirs(SYM, exist_ok=True)
    c = measure()
    bbox = c["bbox"]
    print(f"Li small-cut ink bbox: "
          f"({bbox[0]:.1f},{bbox[1]:.1f})-({bbox[2]:.1f},{bbox[3]:.1f})")
    for name, letters, dot in (
        ("linket-mark-dark", INK, BLUE),
        ("linket-mark-light", "#ffffff", LIFTED),
    ):
        p = os.path.join(SYM, name + ".svg")
        BI.write(p, mark_svg(bbox, letters, dot))
        ok_bbox, has_l, has_d, transp, (w, h) = verify(p, letters, dot)
        print(f"  {name}: {w}x{h} bbox-fills={ok_bbox} letters={has_l} "
              f"dot={has_d} transparent={transp}")
        assert ok_bbox and has_l and has_d and transp, name
    print("marks OK ->", SYM)


if __name__ == "__main__":
    main()
