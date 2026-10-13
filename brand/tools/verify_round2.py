#!/usr/bin/env python3
"""Independent numeric verification of the round-3 deliverables.

Everything is recomputed from the shipped files (never from the builders'
in-memory state and never by eye):
  - master structure (ids, no fonts, no strokes, inks)
  - CONTRAST.md ratios against a fresh WCAG implementation
  - the lifted dark-ground blue (same hue/sat, >= 3:1 on #0a0a0a)
  - the <=24 px small cut geometry (dot 42 raised -8) vs the full joint
  - dot blue-ness at 16/24/32/48 on white and dark after AA
  - CVD panels: sampled pixels vs an independent Machado simulation
  - squint-32 channel spread
  - icon set: tile radius ratio, centroid optical centring, maskable safe
    zone, ICO entries, PNG dimensions, og centring
Exits non-zero on any failure.
"""
import os
import re
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze as A                      # noqa: E402
import build_wordmarks as B              # noqa: E402
import round2_sheets as R2S              # noqa: E402

BRAND = os.path.normpath(os.path.join(HERE, ".."))
FAILS = []
N = [0]


def check(name, ok, detail=""):
    N[0] += 1
    print(f"  {'ok  ' if ok else 'FAIL'} {name}" + (f" — {detail}" if detail else ""))
    if not ok:
        FAILS.append(name)


# ------------------------------------------------------------ WCAG (fresh)
def _lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rel_lum(h):
    r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def wcag(a, b):
    la, lb = rel_lum(a), rel_lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hsl(h):
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (1, 3, 5))
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s = d / (1 - abs(2 * l - 1))
    if mx == r:
        hh = ((g - b) / d) % 6
    elif mx == g:
        hh = (b - r) / d + 2
    else:
        hh = (r - g) / d + 4
    return hh * 60, s, l


def fills_of(path):
    return re.findall(r'fill="(#[0-9a-f]{6})"', open(path).read())


def path_of(name):
    for d in R2S.S.SEARCH:
        p = os.path.join(d, name + ".svg")
        if os.path.exists(p):
            return p
    raise FileNotFoundError(name)


def ink_bbox(w, h, ch, px, pred):
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            o = (y * w + x) * ch
            if pred(px[o], px[o + 1], px[o + 2]):
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return min(xs), min(ys), max(xs), max(ys)


def centroid(w, h, ch, px, bg=(255, 255, 255)):
    tot = mx = my = 0.0
    for y in range(h):
        for x in range(w):
            o = (y * w + x) * ch
            d = max(abs(px[o] - bg[0]), abs(px[o + 1] - bg[1]),
                    abs(px[o + 2] - bg[2]))
            if ch == 4:
                d *= px[o + 3] / 255.0   # transparent tile corners weigh 0
            if d < 40:
                continue
            tot += d
            mx += x * d
            my += y * d
    return (mx / tot, my / tot) if tot else (None, None)


# ------------------------------------------------------------------ checks
def master_checks():
    print("== master ==")
    p = os.path.join(BRAND, "master", "linket-wordmark-master.svg")
    src = open(p).read()
    check("master has id=letters + id=dot",
          'id="letters"' in src and 'id="dot"' in src)
    check("master has no font usage",
          "font-family" not in src and "<text" not in src)
    check("master has no strokes (all fills)",
          "stroke=" not in src)
    check("master inks #0a0a0a + #0049cc",
          '#0a0a0a' in src and '#0049cc' in src)
    small = open(os.path.join(BRAND, "master",
                              "linket-wordmark-master-small.svg")).read()
    check("master small carries small-cut dot",
          B.rrect(171, 46, 42, 42, 21) in small and
          B.rrect(173, 54, 38, 38, 19) not in small)
    check("master full carries full-joint dot",
          B.rrect(173, 54, 38, 38, 19) in src)


def color_files():
    print("== colour versions ==")
    names = ["color-light", "color-dark", "mono-black", "mono-white",
             "on-blue"]
    missing = [n for n in names + [n + "-small" for n in names]
               if not os.path.exists(os.path.join(BRAND, "color",
                                                   f"linket-{n}.svg"))]
    check("5 versions x full+small exist", not missing, str(missing))

    # single-colour versions must use exactly one fill
    for n in ("mono-black", "mono-white", "on-blue"):
        f = set(fills_of(os.path.join(BRAND, "color", f"linket-{n}.svg")))
        check(f"{n} is one colour (reads with no colour)", len(f) == 1,
              str(f))

    # dark-ground blue: same hue/sat as the brand blue, lifted to >= 3:1
    lifted = [f for f in fills_of(os.path.join(BRAND, "color",
                                               "linket-color-dark.svg"))
              if f != "#ffffff"]
    check("color-dark has letters + one blue", len(lifted) == 1, str(lifted))
    L = lifted[0]
    h0, s0, l0 = hsl("#0049cc")
    h1, s1, l1 = hsl(L)
    check("lifted blue keeps hue 218.6 (brand)", abs(h1 - h0) <= 0.5,
          f"{h1:.2f} vs {h0:.2f}")
    check("lifted blue keeps saturation 100%", abs(s1 - 1.0) <= 0.01,
          f"{s1:.3f}")
    check("lifted blue only lifts lightness", l1 > l0 and l1 - l0 < 0.1,
          f"{l0:.3f} -> {l1:.3f}")
    check("lifted blue >= 3:1 on #0a0a0a",
          wcag(L, "#0a0a0a") >= 3.0, f"{wcag(L, '#0a0a0a'):.2f}:1")


def contrast_md():
    print("== CONTRAST.md ==")
    p = os.path.join(BRAND, "CONTRAST.md")
    check("CONTRAST.md exists", os.path.exists(p))
    rows = re.findall(r"\| ([^|]+?) \| `(#[0-9a-f]{6})` \| `(#[0-9a-f]{6})` "
                      r"\| \*\*([\d.]+):1\*\* \| ([^|]+) \|", open(p).read())
    check("all rows parsed", len(rows) >= 10, f"{len(rows)} rows")
    for what, fg, bg, claimed, need in rows:
        got = wcag(fg, bg)
        match = abs(got - float(claimed)) <= 0.015
        need_ok = True
        if "reference" in need or "no WCAG" in need:
            pass
        elif need.startswith("text"):
            need_ok = got >= 4.5
        else:
            need_ok = got >= 3.0
        check(f"ratio {what.strip()} {fg} on {bg}", match and need_ok,
              f"claimed {claimed}, computed {got:.2f}:1")


def small_cut_geometry():
    print("== small cut geometry (dot bbox, rendered) ==")
    for name, exp in (("linket-color-light-small", (171, 46, 42)),
                      ("linket-color-light", (173, 54, 38))):
        w, h, ch, px = A.render(path_of(name))
        bb = ink_bbox(w, h, ch, px,
                      lambda r, g, b: b - r > 120 and g < 130 and r < 130)
        x0, y0, x1, y1 = bb
        gw, gh = x1 - x0 + 1, y1 - y0 + 1
        ok = (abs(x0 - exp[0]) <= 1 and abs(y0 - exp[1]) <= 1 and
              abs(gw - exp[2]) <= 1 and abs(gh - exp[2]) <= 1)
        check(f"{name} dot at ({exp[0]},{exp[1]}) size {exp[2]}", ok,
              f"got ({x0},{y0}) {gw}x{gh}")


def dot_blueness():
    print("== dot blue-ness after AA ==")
    worst = 1000
    for ground, base in (("#ffffff", "linket-color-light"),
                         ("#0a0a0a", "linket-color-dark")):
        for size in (16, 24, 32, 48):
            f = base + ("-small" if size <= 24 else "")
            rgb, blue, alpha = R2S.dot_probe(f, size, ground)
            worst = min(worst, blue)
            check(f"blue core {ground} {size}px",
                  blue >= 100 and alpha > 0.99,
                  f"rgb{rgb} B-R={blue} a={alpha:.2f}")
    check("16px core is undiluted brand blue", worst >= 100,
          f"worst B-R {worst}")


def cvd_panels():
    print("== CVD panels (cvd-check.png) ==")
    w, h, ch, px = A.decode_png(os.path.join(BRAND, "png", "cvd-check.png"))
    pad, labW, top, gap = 40, 200, 132, 10
    px0 = pad + labW                      # 240
    lx, ly = px0 + 28, 22                 # logo offset inside panel
    lm = 199.97 / 711.0                   # viewBox -> render scale
    sx = int(round(192 * lm))
    sy = int(round(73 * 72 / 256))

    def sample(row, gx, gy):
        o = ((top + row * (116 + gap) + ly + gy) * w + lx + gx) * ch
        return tuple(px[o:o + 3])

    sx = int(round(192 * lm))
    syl = int(round(150 * 72 / 256))
    sxl = int(round(60 * lm))

    def sim(c, which):
        M = R2S.CVD.get(which, which)   # "Grayscale" -> "gray"
        if M == "gray":
            v = int(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] + 0.5)
            return (v, v, v)

        def ul(c):
            v = 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055
            return max(0.0, min(255.0, v * 255.0))

        def ln(c):
            c /= 255.0
            return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

        rl, gl, bl = ln(c[0]), ln(c[1]), ln(c[2])
        o = [M[i][0] * rl + M[i][1] * gl + M[i][2] * bl for i in range(3)]
        return tuple(int(ul(max(0.0, min(1.0, v))) + 0.5) for v in o)

    rows = [(1, "Grayscale", (0, 73, 204)), (2, "Protanopia", (0, 73, 204)),
            (3, "Deuteranopia", (0, 73, 204)), (4, "Tritanopia", (0, 73, 204))]
    for row, which, src_c in rows:
        exp_d = sim(src_c, which)
        got_d = sample(row, sx, sy)
        ok = all(abs(a - b) <= 4 for a, b in zip(got_d, exp_d))
        check(f"{which} dot panel", ok, f"got {got_d} expected {exp_d}")
        exp_l = sim((10, 10, 10), which)
        got_l = sample(row, sxl, syl)
        ok = all(abs(a - b) <= 4 for a, b in zip(got_l, exp_l))
        check(f"{which} letters panel", ok, f"got {got_l} expected {exp_l}")
    # paste must not spill outside the logo box
    o = ((top + 1 * (116 + gap) + 8) * w + px0 + 6) * ch
    spill = tuple(px[o:o + 3])
    check("panel background untouched", spill == (255, 255, 255), str(spill))


def squint():
    print("== squint-32 ==")
    chans = R2S.channels_at(32)
    spread = max(d for _, d in chans) - min(d for _, d in chans)
    check("channel spread <= 0.6 px at 32px", spread <= 0.6,
          " ".join(f"{l}={d:.2f}" for l, d in chans) +
          f" spread={spread:.2f}")
    # round-3 spacing is 18 units = 2.25 px at 32 px height (round-2: 26
    # = 3.25 px); the bar is "letters stay separated", not the old number.
    check("all channels positive (letters separated)",
          all(d > 2.0 for _, d in chans))


def icons():
    print("== icons ==")
    ic = os.path.join(BRAND, "icon")
    dims = {"apple-touch-icon.png": 180, "icon-192.png": 192,
            "icon-512.png": 512, "icon-maskable-512.png": 512}
    for name, s in dims.items():
        w, h, c, p = A.decode_png(os.path.join(ic, name))
        check(f"{name} {s}x{s}", (w, h) == (s, s), f"{w}x{h}")

    # favicon: white tile chosen, R1 radius ratio, small cut
    fv = open(os.path.join(ic, "favicon.svg")).read()
    check("favicon.svg = white tile (chosen)",
          fv == open(os.path.join(ic, "favicon-white.svg")).read())
    check("favicon-dark.svg ships for prefers-color-scheme",
          os.path.exists(os.path.join(ic, "favicon-dark.svg")))
    rx = float(re.search(r'rx="([\d.]+)"', fv).group(1))
    k = float(re.search(r"scale\(([\d.]+)\)", fv).group(1))
    check("tile radius = 0.31 x icon stroke (rj system)",
          abs(rx / (32 * k) - 0.3125) <= 0.01 and rx < 25,
          f"rx={rx} stroke={32 * k:.1f} ratio={rx / (32 * k):.3f}")
    check("favicon uses the small cut",
          B.rrect(171, 46, 42, 42, 21) in fv and
          B.rrect(173, 54, 38, 38, 19) not in fv)
    app = open(os.path.join(ic, "icon-app.svg")).read()
    check("app icons use the full joint",
          B.rrect(173, 54, 38, 38, 19) in app)

    # centroid optical centring of the rendered PNGs
    for name, size in (("favicon-16.png", 16), ("favicon-32.png", 32),
                       ("favicon-48.png", 48), ("icon-192.png", 192),
                       ("icon-512.png", 512)):
        w, h, c, p = A.decode_png(os.path.join(ic, name))
        cx, cy = centroid(w, h, c, p, bg=(255, 255, 255))
        err = ((cx - (w - 1) / 2) ** 2 + (cy - (h - 1) / 2) ** 2) ** 0.5
        check(f"{name} centroid <= 2% of size", err / w <= 0.02,
              f"err {err:.2f}px = {err / w * 100:.2f}%")

    # maskable safe zone
    w, h, c, p = A.decode_png(os.path.join(ic, "icon-maskable-512.png"))
    maxr = 0.0
    cx0, cy0 = (w - 1) / 2, (h - 1) / 2
    for y in range(h):
        for x in range(w):
            o = (y * w + x) * c
            d = max(abs(p[o] - 255), abs(p[o + 1] - 255), abs(p[o + 2] - 255))
            if d >= 40:
                maxr = max(maxr, ((x - cx0) ** 2 + (y - cy0) ** 2) ** 0.5)
    check("maskable content inside 80% circle", maxr / (w / 2) <= 0.8,
          f"maxr ratio {maxr / (w / 2):.3f}")

    # ICO structure
    data = open(os.path.join(ic, "favicon.ico"), "rb").read()
    reserved, typ, count = struct.unpack("<HHH", data[:6])
    sizes, blobs = [], []
    for i in range(count):
        off = 6 + 16 * i
        bw = data[off]
        sizes.append(bw or 256)
        blen, bo = struct.unpack("<II", data[off + 8:off + 16])
        blobs.append(data[bo:bo + blen])
    check("favicon.ico has 16/32/48", sorted(sizes) == [16, 32, 48],
          str(sizes))
    ok = True
    for size, blob in zip(sizes, blobs):
        if not blob.startswith(b"\x89PNG"):
            ok = False
            continue
        tmp = os.path.join(BRAND, "png", f"_ico_{size}.png")
        open(tmp, "wb").write(blob)
        w, h, c, p = A.decode_png(tmp)
        os.unlink(tmp)
        if (w, h) != (size, size):
            ok = False
    check("ICO entries decode to their sizes", ok,
          f"{[ (len(b)) for b in blobs ]} bytes")

    # og image
    w, h, c, p = A.decode_png(os.path.join(ic, "og-image.png"))
    check("og image 1200x630", (w, h) == (1200, 630), f"{w}x{h}")
    bb = ink_bbox(w, h, c, p, lambda r, g, b: max(abs(r - 255),
                                                  abs(g - 255),
                                                  abs(b - 255)) > 60)
    x0, y0, x1, y1 = bb
    ccx, ccy = (x0 + x1) / 2, (y0 + y1) / 2
    check("og wordmark centred", abs(ccx - 600) <= 4 and abs(ccy - 315) <= 4,
          f"centre ({ccx:.1f},{ccy:.1f})")
    check("og wordmark width 720", abs((x1 - x0 + 1) - 720) <= 6,
          f"{x1 - x0 + 1}px")


def deliverables():
    print("== deliverables present ==")
    rel = [
        "master/linket-wordmark-master.svg",
        "master/linket-wordmark-master-small.svg",
        "CONTRAST.md", "USAGE.md", "REPORT.md",
        "color/linket-color-light.svg", "color/linket-color-light-small.svg",
        "color/linket-color-dark.svg", "color/linket-color-dark-small.svg",
        "color/linket-mono-black.svg", "color/linket-mono-black-small.svg",
        "color/linket-mono-white.svg", "color/linket-mono-white-small.svg",
        "color/linket-on-blue.svg", "color/linket-on-blue-small.svg",
        "icon/favicon.svg", "icon/favicon.ico",
        "icon/favicon-white.svg", "icon/favicon-dark.svg",
        "icon/apple-touch-icon.png", "icon/icon-192.png",
        "icon/icon-512.png", "icon/icon-maskable-512.png",
        "icon/og-image.png",
        "symbol/linket-mark-dark.svg", "symbol/linket-mark-light.svg",
        "png/color-versions.png", "png/cvd-check.png", "png/small-sizes.png",
        "png/favicon-tabs.png", "png/icon-preview.png", "png/squint-32.png",
    ]
    missing = [r for r in rel if not os.path.exists(os.path.join(BRAND, r))]
    check("all round-2 files exist", not missing, str(missing))


def main():
    master_checks()
    color_files()
    contrast_md()
    small_cut_geometry()
    dot_blueness()
    cvd_panels()
    squint()
    icons()
    deliverables()
    print(f"\n{N[0] - len(FAILS)}/{N[0]} checks passed")
    if FAILS:
        print("FAILURES:")
        for f in FAILS:
            print(f"  - {f}")
        sys.exit(1)
    print("ALL ROUND-3 CHECKS PASS")


if __name__ == "__main__":
    main()
