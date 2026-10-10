#!/usr/bin/env python3
"""Round 3: production deliverables - outlined master + color versions.

- master/linket-wordmark-master[-small].svg  letters #0a0a0a, dot #0049cc,
  path ids (g#letters / path#dot), all strokes converted to filled paths.
- color/linket-{color-light,color-dark,mono-black,mono-white,on-blue}
  [-small].svg  each valid on its documented ground.
- brand/CONTRAST.md  WCAG 2.1 contrast ratios computed in code (no hand math).

Round-3 system (concept A, flat cuts - user pick): stroke 32, joints r10
(0.31 x stroke, inner corners filleted), 45 deg chamfered L-i link with the
foot reaching the i column, e-bowl/bar 26, t-crossbar 27, round tittle O38
(small cut O42 raised -8). All geometry lives in build_v3.py.
The dark-ground dot uses a lighter blue at the SAME hue and saturation as
#0049cc (HSL H, S kept; L lifted minimally) until it clears 3:1 on #0a0a0a.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze as A          # noqa: E402
import build_v3 as V3        # noqa: E402  round-3 geometry + engine setup

BRAND = os.path.normpath(os.path.join(HERE, ".."))
MASTER = os.path.join(BRAND, "master")
COLOR = os.path.join(BRAND, "color")
os.makedirs(MASTER, exist_ok=True)
os.makedirs(COLOR, exist_ok=True)

INK = "#0a0a0a"    # production near-black: letters on light ground
WHITE = "#ffffff"
BLUE = "#0049cc"   # brand blue: the tittle, and blue grounds
DARK_BG = "#0a0a0a"
BLUE_BG = "#0049cc"
LIGHT_BG = "#ffffff"

LINK = "chamfer"              # concept A link (round-3, locked)
DOT_W, DOT_DY = 38.0, 0.0     # full joint: circle O38 @ y54, gap 16
DOT_W_S, DOT_DY_S = 42.0, -8.0  # small cut, <=24 px: O42 raised -8, gap 20


# --------------------------------------------------------------- contrast
def _lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(hexcol):
    r, g, b = (int(hexcol[i:i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def rgb_hex(r, g, b):
    return "#%02x%02x%02x" % (max(0, min(255, round(r))),
                              max(0, min(255, round(g))),
                              max(0, min(255, round(b))))


def rgb_to_hsl(rgb):
    r, g, b = (v / 255.0 for v in rgb)
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s = d / (1 - abs(2 * l - 1))
    if mx == r:
        h = ((g - b) / d) % 6
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60, s, l


def hsl_to_hex(h, s, l):
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60.0) % 2 - 1))
    m = l - c / 2
    seg = int(h // 60) % 6
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x),
               (0, x, c), (x, 0, c), (c, 0, x)][seg]
    return rgb_hex((r + m) * 255, (g + m) * 255, (b + m) * 255)


def lifted_blue():
    """Same hue/saturation as #0049cc, minimal lightness lift to >=3:1 on dark."""
    h, s, l0 = rgb_to_hsl(hex_rgb(BLUE))
    l = l0
    while l < 0.95:
        cand = hsl_to_hex(h, s, l)
        if contrast(cand, DARK_BG) >= 3.0:
            # verify the rounded hex itself still clears the bar
            if contrast(cand, DARK_BG) >= 3.0:
                return cand, l0, l
        l += 0.0005
    raise RuntimeError("no lift found")


# ------------------------------------------------------------ file writing
def write(path, svg):
    with open(path, "w") as f:
        f.write(svg)
    return path


def build():
    lifted, l0, l1 = lifted_blue()
    print(f"lifted blue: {BLUE} (L={l0:.3f}) -> {lifted} (L={l1:.3f})  "
          f"ratio on {DARK_BG} = {contrast(lifted, DARK_BG):.2f}:1")

    out = []
    # --- master: ids for programmatic colour swap, production inks
    p = write(os.path.join(MASTER, "linket-wordmark-master.svg"),
              V3.build_svg(LINK, False, "Linket wordmark (master)",
                           ink=INK, dot_ink=BLUE, ids=True,
                           dot_w=DOT_W, dot_dy=DOT_DY))
    out.append(p)
    p = write(os.path.join(MASTER, "linket-wordmark-master-small.svg"),
              V3.build_svg(LINK, False,
                           "Linket wordmark (master, small cut for 24px and below)",
                           ink=INK, dot_ink=BLUE, ids=True,
                           dot_w=DOT_W_S, dot_dy=DOT_DY_S))
    out.append(p)

    # --- colour versions: name -> (letters, dot, ground, when-to-use)
    versions = [
        ("color-light", INK, BLUE, LIGHT_BG,
         "primary on light grounds (white / #fafafa)"),
        ("color-dark", WHITE, lifted, DARK_BG,
         "on #0a0a0a and dark surfaces; dot lifted to clear 3:1"),
        ("mono-black", INK, INK, LIGHT_BG,
         "one-colour print, fax, engraving on light"),
        ("mono-white", WHITE, WHITE, DARK_BG,
         "one-colour on dark / photo overlays"),
        ("on-blue", WHITE, WHITE, BLUE_BG,
         "white on a #0049cc brand-blue field"),
    ]
    for name, letters, dot, ground, use in versions:
        for suffix, dw, ddy, cut in (("", DOT_W, DOT_DY, "full joint"),
                                     ("-small", DOT_W_S, DOT_DY_S,
                                      "small cut for 24px and below")):
            svg = V3.build_svg(LINK, False,
                               f"Linket wordmark ({name}{suffix})",
                               ink=letters, dot_ink=dot, ids=False,
                               dot_w=dw, dot_dy=ddy)
            p = write(os.path.join(COLOR, f"linket-{name}{suffix}.svg"), svg)
            out.append(p)
        print(f"  {name:12s} letters={letters} dot={dot} ground={ground} "
              f"- {use}")

    # --- probes: sample real rendered pixels of every written file
    print("probe (rendered):")
    for p in out:
        w, h, ch, px = A.render(p)
        cov = A.coverage(w, h, ch, px)
        pts = A.ink_points(w, h, cov, thr=110)
        x0, y0, x1, y1 = A.bbox(pts)
        small = p.endswith("-small.svg") and "/color/" in p or p.endswith(
            "master-small.svg")
        dc = (192, 67) if small else (192, 73)
        dot = px[((dc[1] * w + dc[0]) * ch):((dc[1] * w + dc[0]) * ch) + 3]
        st = (60, 150)
        let = px[((st[1] * w + st[0]) * ch):((st[1] * w + st[0]) * ch) + 3]
        # full: L top 52, dot top 54; small cut raises the dot to y46
        exp = (44, 46, 663, 204) if small else (44, 52, 663, 204)
        bbox_ok = all(abs(a - b) <= 1 for a, b in zip((x0, y0, x1, y1), exp))
        print(f"  {os.path.basename(p):36s} bbox=({x0},{y0},{x1},{y1}) "
              f"{'OK' if bbox_ok else 'BBOX-CHECK'} "
              f"dot#{dot[0]:02x}{dot[1]:02x}{dot[2]:02x} "
              f"stem#{let[0]:02x}{let[1]:02x}{let[2]:02x}")
        if not bbox_ok:
            raise SystemExit(f"bbox drifted in {p}")
    return out, lifted


# ----------------------------------------------------------- contrast table
def contrast_md(lifted):
    rows = [
        ("letters", INK, LIGHT_BG, "text 4.5 / graphics 3", "color-light"),
        ("dot", BLUE, LIGHT_BG, "graphics 3", "color-light"),
        ("letters", WHITE, DARK_BG, "text 4.5 / graphics 3", "color-dark"),
        ("dot (lifted)", lifted, DARK_BG, "graphics 3", "color-dark"),
        ("letters + dot", INK, LIGHT_BG, "text 4.5 / graphics 3", "mono-black"),
        ("letters + dot", WHITE, DARK_BG, "text 4.5 / graphics 3", "mono-white"),
        ("letters + dot", WHITE, BLUE_BG, "text 4.5 / graphics 3", "on-blue"),
        ("UI text (app fg)", "#212121", LIGHT_BG, "reference", "-"),
        ("dot vs letters (light)", BLUE, INK, "logo-adjacent, no WCAG min",
         "reference"),
        ("favicon white tile: letters", INK, LIGHT_BG, "graphics 3",
         "favicon.svg"),
        ("favicon white tile: dot", BLUE, LIGHT_BG, "graphics 3", "favicon.svg"),
        ("favicon dark tile: letters", WHITE, DARK_BG, "graphics 3",
         "favicon-dark.svg"),
        ("favicon dark tile: dot (lifted)", lifted, DARK_BG, "graphics 3",
         "favicon-dark.svg"),
    ]
    lines = ["# Linket wordmark - WCAG contrast (computed)", "",
             "Ratios from WCAG 2.1 relative luminance, computed in "
             "`tools/build_round2.py` (no hand math). WCAG exempts logos, but "
             "the ratios are still reported so every version clears the bar "
             "it claims to clear.", "",
             "| element | fg | bg | ratio | needs | version |", "|---|---|---|"
             "---|---|---|"]
    detail = []
    for what, fg, bg, need, ver in rows:
        r = contrast(fg, bg)
        ok = ("pass" if "reference" in need or "no WCAG" in need or
              r >= (7 if need.startswith("text 4.5") and False else 0) else "")
        if "reference" in need or "no WCAG" in need:
            verdict = "reference"
        elif need.startswith("text"):
            verdict = f"{'AAA' if r >= 7 else 'AA' if r >= 4.5 else 'FAIL'} text, " \
                     f"{'pass' if r >= 3 else 'FAIL'} graphics"
        else:
            verdict = f"{'pass' if r >= 3 else 'FAIL'} graphics"
        lines.append(f"| {what} | `{fg}` | `{bg}` | **{r:.2f}:1** | {need} | "
                     f"{verdict} |")
        detail.append((what, fg, bg, r, verdict))
    lines += ["",
              f"Dark-ground blue: `{BLUE}` (HSL H/S kept, L {l0str()}) was "
              f"lifted to `{lifted}` at the same hue and saturation until it "
              f"reached 3:1 on `{DARK_BG}` - same brand blue, only as light as "
              f"legibility requires.", ""]
    md = "\n".join(lines)
    path = os.path.join(BRAND, "CONTRAST.md")
    with open(path, "w") as f:
        f.write(md)
    print(f"  wrote {path}")
    for what, fg, bg, r, verdict in detail:
        print(f"    {what:32s} {fg} on {bg} = {r:5.2f}:1  ({verdict})")
    return detail


def l0str():
    return "40%"


if __name__ == "__main__":
    _, lifted = build()
    contrast_md(lifted)
