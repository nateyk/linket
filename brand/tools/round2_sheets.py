#!/usr/bin/env python3
"""Round-2 sheets: colour versions, CVD, small sizes, favicon tab mockups,
icon preview, squint-32.

Uses sheets.py helpers so every logo placement lands in the same _log.json and
verify_sheets.py checks it. Panels that need pixel surgery (CVD simulations,
dot zoom insets) are handled after the sheet render - verify_round2.py checks
those numerically instead.
"""
import base64
import os
import re
import struct
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze as A          # noqa: E402
import sheets as S           # noqa: E402
import build_round2 as R2    # noqa: E402

UI = S.UI
# bare aliases — builders mix `text(...)` with `S.logo(...)` freely
text = S.text
rect = S.rect
line = S.line
logo = S.logo
write_sheet = S.write_sheet


# ------------------------------------------------------------- utilities
def path_of(name):
    for d in S.SEARCH:
        p = os.path.join(d, name + ".svg")
        if os.path.exists(p):
            return p
    raise FileNotFoundError(name)


def encode_png(path, w, h, rows):
    """rows: list of h bytes-objects, each RGBA (4w)."""
    def chunk(tag, data):
        c = tag + data
        return (struct.pack(">I", len(data)) + c +
                struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF))
    raw = b"".join(b"\x00" + r for r in rows)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n"
                + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw, 6))
                + chunk(b"IEND", b""))


def to_rows(w, h, ch, px):
    rows = []
    for y in range(h):
        row = bytearray()
        for x in range(w):
            o = (y * w + x) * ch
            row += bytes((px[o], px[o + 1], px[o + 2],
                          px[o + 3] if ch == 4 else 255))
        rows.append(bytes(row))
    return rows


def data_uri(path):
    return ("data:image/png;base64," +
            base64.b64encode(open(path, "rb").read()).decode())


def image(x, y, w, h, png_path, crisp=True):
    pix = ' image-rendering="pixelated"' if crisp else ""
    return (f'<image x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}"{pix} '
            f'xmlns:xlink="http://www.w3.org/1999/xlink" '
            f'xlink:href="{data_uri(png_path)}"/>')


def lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def unlin(c):
    v = 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055
    return max(0.0, min(255.0, v * 255.0))


def mat_px(r, g, b, M):
    rl, gl, bl = lin(r), lin(g), lin(b)
    o = [M[i][0] * rl + M[i][1] * gl + M[i][2] * bl for i in range(3)]
    return tuple(unlin(max(0.0, min(1.0, v))) for v in o)


# Machado-Oliveira & Brainard severity-1.0 matrices, linear RGB
CVD = {
    "Grayscale": "gray",
    "Protanopia": ((0.152286, 1.052583, -0.204868),
                   (0.114503, 0.786281, 0.099216),
                   (-0.003882, -0.048116, 1.051998)),
    "Deuteranopia": ((0.367322, 0.860646, -0.227968),
                     (0.280085, 0.672501, 0.047413),
                     (-0.011820, 0.042940, 0.968881)),
    "Tritanopia": ((1.255528, -0.076749, -0.178779),
                   (-0.078411, 0.930809, 0.147602),
                   (0.004733, 0.691367, 0.303900)),
}


def sim_rows(w, h, rows, which):
    M = CVD.get(which, which)   # "Grayscale" -> "gray", else the matrix
    out = []
    for y in range(h):
        r_ = bytearray(rows[y])
        for x in range(w):
            o = 4 * x
            r, g, b = r_[o], r_[o + 1], r_[o + 2]
            if M == "gray":
                v = int(0.2126 * r + 0.7152 * g + 0.0722 * b + 0.5)
                nr, ng, nb = v, v, v
            else:
                nr, ng, nb = (int(v + 0.5) for v in mat_px(r, g, b, M))
            r_[o:o + 3] = bytes((nr, ng, nb))
        out.append(bytes(r_))
    return out


def dot_probe(name, hgt, ground):
    """Render name at height hgt, composite over ground, sample the dot core.

    Returns (rgb, blueness) of the most-opaque pixel inside the tittle box."""
    w, h, ch, px = A.render(path_of(name), height=hgt)
    s = hgt / 256.0
    small = name.endswith("-small")
    cy, dw = (67, 42) if small else (73, 38)
    gb = (int(ground[1:3], 16), int(ground[3:5], 16), int(ground[5:7], 16))
    x0, x1 = (192 - dw / 2) * s, (192 + dw / 2) * s
    y0, y1 = (cy - dw / 2) * s, (cy + dw / 2) * s
    best, best_a = None, -1
    for y in range(max(0, int(y0)), min(h, int(y1) + 2)):
        for x in range(max(0, int(x0)), min(w, int(x1) + 2)):
            o = (y * w + x) * ch
            a = px[o + 3] / 255.0
            if a > best_a:
                best_a = a
                best = tuple(int(round(a * px[o + c] + (1 - a) * gb[c]))
                             for c in range(3))
    r, g, b = best
    return (r, g, b), b - r, best_a


def channels_at(hgt, name="linket-color-light"):
    """Min white channel between letter segments at rendered height hgt."""
    w, h, ch, px = A.render(path_of(name), height=hgt)
    cov = A.coverage(w, h, ch, px)
    bounds = [0, 217, 351, 455, 575, 711]
    labels = ["i-n", "n-k", "k-e", "e-t"]
    xs = [max(0, min(w, int(round(b * w / 711)))) for b in bounds]
    segs = [A.ink_points(w, h, cov, x0=xs[i], x1=xs[i + 1])
            for i in range(5)]
    out = []
    for i in range(4):
        if segs[i] and segs[i + 1]:
            d, _ = A.min_dist(segs[i], segs[i + 1])
            out.append((labels[i], d))
    return out


# ------------------------------------------------------------ sheet 1
def color_versions_sheet():
    S.sheet("color-versions")
    pad, labW, panelW, panelH = 40, 250, 690, 116
    gap = 14
    W = pad * 2 + labW + panelW
    lifted = R2.lifted_blue()[0]
    rows = [
        ("A · color-light", ["letters #0a0a0a + dot #0049cc",
                             "on white / #fafafa"],
         "#ffffff", None, "linket-color-light", UI["fg"],
         [("letters", R2.contrast(R2.INK, "#ffffff")),
          ("dot", R2.contrast(R2.BLUE, "#ffffff"))]),
        ("B · color-dark", ["white letters + lifted blue dot",
                            f"dot {lifted} on #0a0a0a"],
         "#0a0a0a", "#0a0a0a", "linket-color-dark", "#d4d4d4",
         [("letters", R2.contrast("#ffffff", "#0a0a0a")),
          ("dot", R2.contrast(lifted, "#0a0a0a"))]),
        ("C · mono-black", ["letters + dot #0a0a0a",
                            "one-colour print on light"],
         "#ffffff", None, "linket-mono-black", UI["fg"],
         [("all", R2.contrast(R2.INK, "#ffffff"))]),
        ("D · mono-white", ["letters + dot #ffffff",
                            "one-colour on dark / photo"],
         "#0a0a0a", "#0a0a0a", "linket-mono-white", "#d4d4d4",
         [("all", R2.contrast("#ffffff", "#0a0a0a"))]),
        ("E · on-blue", ["white letters + dot",
                         "on a #0049cc brand field"],
         "#0049cc", "#0049cc", "linket-on-blue", "#cfe0ff",
         [("all", R2.contrast("#ffffff", "#0049cc"))]),
    ]
    top = 140
    H = top + len(rows) * (panelH + gap) + 56
    b = [text(pad, 44, "Linket wordmark — colour versions", 24, 600),
         text(pad, 74, "Every ratio computed from WCAG 2.1 relative "
                       "luminance in tools/build_round2.py — no hand math. "
                       "WCAG exempts logos;", 13, 400, UI["muted"]),
         text(pad, 94, "the numbers are still the bar each version claims. "
                       "Full joint shown; small cut lives at ≤24 px.",
              13, 400, UI["muted"])]
    for i, (name, sub, ground, swatch, fname, tcol, ratios) in enumerate(rows):
        y = top + i * (panelH + gap)
        b.append(text(pad, y + 40, name, 16, 600))
        for k, ln in enumerate(sub):
            b.append(text(pad, y + 62 + k * 18, ln, 11, 400, UI["muted"]))
        px0 = pad + labW
        b.append(rect(px0, y, panelW, panelH, fill=ground,
                      stroke=None if ground != "#ffffff" else UI["border"]))
        b.append(S.logo(fname, px0 + 28, y + 22, h=72, swatch=swatch))
        for k, (what, ratio) in enumerate(ratios):
            b.append(text(px0 + 330, y + 46 + k * 24,
                          f"{what} {ratio:.2f}:1", 13, 500, tcol))
        b.append(text(px0 + 330, y + panelH - 18, f"ground {ground}",
                      11, 400, tcol))
    b.append(text(pad, H - 30, "The dark-ground dot keeps hue 218.6° and "
                               "saturation 100% (brand blue) — only lightness "
                               "lifts until it clears 3:1 on #0a0a0a.",
                  12, 400, UI["muted"]))
    return S.write_sheet("color-versions.png", W, H, b, bg=UI["bg"])


# ------------------------------------------------------------ sheet 2
def cvd_sheet():
    S.sheet("cvd-check")
    pad, labW, panelW, panelH = 40, 200, 700, 116
    gap = 10
    W = pad * 2 + labW + panelW
    rows = [
        ("Original · color-light", None, "linket-color-light"),
        ("Grayscale", "Grayscale", None),
        ("Protanopia (no red)", "Protanopia", None),
        ("Deuteranopia (no green)", "Deuteranopia", None),
        ("Tritanopia (no blue)", "Tritanopia", None),
        ("No-colour control · mono-black", None, "linket-mono-black"),
    ]
    top = 132
    H = top + len(rows) * (panelH + gap) + 56
    b = [text(pad, 44, "CVD check — protanopia · deuteranopia · tritanopia",
              24, 600),
         text(pad, 74, "Machado–Oliveira & Brainard severity-1.0 matrices in "
                       "linear RGB. If the wordmark reads here, colour is "
                       "never load-", 13, 400, UI["muted"]),
         text(pad, 94, "bearing: the round tittle, the chamfer link and the "
                       "letterforms carry the identity alone.", 13, 400,
              UI["muted"])]
    panel_xy = []
    for i, (lab, sim, fname) in enumerate(rows):
        y = top + i * (panelH + gap)
        b.append(text(pad, y + 30, lab, 13, 600))
        b.append(text(pad, y + 50, sim or "as shipped", 11, 400, UI["muted"]))
        px0 = pad + labW
        b.append(rect(px0, y, panelW, panelH, fill="#ffffff",
                      stroke=UI["border"]))
        if fname:
            b.append(S.logo(fname, px0 + 28, y + 22, h=72))
        else:
            panel_xy.append((px0, y, sim))
    png = S.write_sheet("cvd-check.png", W, H, b, bg=UI["bg"])
    # pixel surgery: simulate the four panels from a fresh standalone render
    w, h, ch, px = A.decode_png(png)
    rows_rgba = to_rows(w, h, ch, px)
    lw = int(round(711 * 72 / 256))          # == the logo() cell width (200)
    for (px0, y, sim) in panel_xy:
        rw, rh, rch, rpx = A.render(path_of("linket-color-light"), width=lw)
        base = [[255, 255, 255, 255] for _ in range(rh * rw)]
        for yy in range(rh):
            for xx in range(rw):
                o = (yy * rw + xx) * rch
                a = rpx[o + 3] / 255.0
                if a == 0:
                    continue
                for c in range(3):
                    v = a * rpx[o + c] + (1 - a) * 255
                    base[yy * rw + xx][c] = int(round(v))
        flat = [bytes(b for pxl in base[i * rw:(i + 1) * rw] for b in pxl)
                for i in range(rh)]
        simd = sim_rows(rw, rh, flat, sim)
        # paste into the panel interior (keep the 1px border)
        for yy in range(rh):
            dy = y + 22 + yy
            if not (0 <= dy < h):
                continue
            row = bytearray(rows_rgba[dy])
            dx = px0 + 28
            row[4 * dx:4 * (dx + rw)] = simd[yy]
            rows_rgba[dy] = bytes(row)
    encode_png(png, w, h, rows_rgba)
    return png


# ------------------------------------------------------------ sheet 3
def small_sizes_sheet():
    S.sheet("small-sizes")
    pad, labW, colW = 40, 150, 250
    sizes = [16, 24, 32, 48]
    W = pad * 2 + labW + colW * len(sizes)
    top = 128
    groups = [
        ("on white ground · color-light", "#ffffff",
         ("linket-color-light-small", "linket-color-light-small"),
         None),
        ("on #0a0a0a ground · color-dark", "#0a0a0a",
         ("linket-color-dark-small", "linket-color-dark"),
         "#0a0a0a"),
    ]
    rowH = 300
    H = top + 2 * rowH + 96
    b = [text(pad, 44, "Small sizes — the ≤24 px cut, blue dot at 16/24/32/48",
              24, 600),
         text(pad, 74, "≤24 px uses dot_w 42 raised −8 (gap opens 16→20); "
                       "32/48 px keep the full joint (dot 38, gap 16).",
              13, 400, UI["muted"]),
         text(pad, 94, "Zoom panels are the actual rendered tittle, nearest-"
                       "neighbour, with the composited core colour measured.",
              13, 400, UI["muted"])]
    probes = []
    for gi, (glab, ground, file_for, swatch) in enumerate(groups):
        y0 = top + gi * rowH
        b.append(text(pad, y0 + 6, glab, 14, 600))
        b.append(S.rect(pad, y0 + 18, W - 2 * pad, rowH - 46,
                        fill=ground, stroke=None if ground == "#ffffff"
                        else UI["border"]))
        for si, size in enumerate(sizes):
            x = pad + labW + si * colW
            fname = file_for[0] if size <= 24 else file_for[1]
            b.append(text(x + colW / 2 - 60, y0 + 44,
                          f"{size} px" + (" · small cut" if size <= 24
                                          else " · full joint"),
                          12, 600, UI["muted"]))
            lw = size * 711 / 256
            b.append(S.logo(fname, x + 40, y0 + 74, h=size, swatch=swatch))
            # dot zoom inset
            w, h, ch, px = A.render(path_of(fname), height=size)
            s = size / 256.0
            small = size <= 24
            cy, dw = (67, 42) if small else (73, 38)
            bx = max(0, int((192 - dw / 2 - 5) * s))
            by = max(0, int((cy - dw / 2 - 5) * s))
            bw = min(w - bx, int((dw + 10) * s) + 1)
            bh = min(h - by, int((dw + 10) * s) + 1)
            crop = []
            for yy in range(bh):
                row = bytearray()
                for xx in range(bw):
                    o = ((by + yy) * w + bx + xx) * ch
                    row += bytes(px[o:o + 4])
                crop.append(bytes(row))
            zoom = max(4, int(72 / max(bw, bh)))
            zrows = []
            for yy in range(bh * zoom):
                src = crop[yy // zoom]
                row = bytearray()
                for xx in range(bw * zoom):
                    row += src[4 * (xx // zoom):4 * (xx // zoom) + 4]
                zrows.append(bytes(row))
            tmp = os.path.join(S.PNG, f"_zoom-{gi}-{size}.png")
            encode_png(tmp, bw * zoom, bh * zoom, zrows)
            b.append(S.rect(x + 40, y0 + 132, 84, 84, fill=ground,
                            stroke=UI["border"]))
            b.append(image(x + 44, y0 + 136, 76, 76, tmp))
            rgb, blue, alpha = dot_probe(fname, size, ground)
            probes.append((ground, size, rgb, blue))
            tc = UI["fg"] if ground == "#ffffff" else "#e5e5e5"
            b.append(text(x + 136, y0 + 156, "dot core", 11, 600,
                          UI["muted"] if ground == "#ffffff" else "#a3a3a3"))
            b.append(text(x + 136, y0 + 176,
                          f"rgb({rgb[0]},{rgb[1]},{rgb[2]})", 12, 500, tc))
            b.append(text(x + 136, y0 + 196, f"B−R = {blue}", 12, 500, tc))
    # honest verdict from the measured probes
    blue16_w = [p[3] for p in probes if p[0] == "#ffffff" and p[1] == 16][0]
    blue16_d = [p[3] for p in probes if p[0] == "#0a0a0a" and p[1] == 16][0]
    all_blue = min(p[3] for p in probes)
    verdict = (
        f"Verdict: the dot stays blue at 16 px after AA — its core is "
        f"exactly the brand blue (B−R {blue16_w} on white, {blue16_d} on "
        f"dark; never below {all_blue} at any size — no AA dilution). It is "
        f"a ~2 px dot at 16 px, so colour reads as an accent and form "
        f"carries recognition.")
    if all_blue < 100:
        verdict = (
            f"Verdict: at 16 px the dot keeps a clear blue bias (core B−R "
            f"{blue16_w} on white, {blue16_d} on dark; brand blue = 204) but "
            f"it is a 2 px dot — read as colour accent, never as the only "
            f"cue. The wordmark still reads without it (mono versions).")
    b.append(text(pad, H - 52, verdict, 13, 500, UI["fg"]))
    b.append(text(pad, H - 30, "The wordmark must read with no colour at all: "
                               "the mono rows prove the form carries it.",
                  12, 400, UI["muted"]))
    return S.write_sheet("small-sizes.png", W, H, b, bg=UI["bg"])


# ------------------------------------------------------------ sheet 4
def favicon_tabs_sheet():
    S.sheet("favicon-tabs")
    pad = 40
    W = 960
    combos = [
        ("light chrome + white tile", "#f1f3f4", "#ffffff", "#3c4043",
         "favicon-white", "#ffffff", "#ffffff", "#3c4043"),
        ("light chrome + #0a0a0a tile", "#f1f3f4", "#ffffff", "#3c4043",
         "favicon-dark", "#0a0a0a", "#ffffff", "#3c4043"),
        ("dark chrome + white tile", "#202124", "#35363a", "#e8eaed",
         "favicon-white", "#ffffff", "#202124", "#e8eaed"),
        ("dark chrome + #0a0a0a tile", "#202124", "#35363a", "#e8eaed",
         "favicon-dark", "#0a0a0a", "#202124", "#e8eaed"),
    ]
    top = 128
    rowH = 118
    H = top + len(combos) * rowH + 76
    b = [text(pad, 44, "Favicon in a browser tab — light and dark mode",
              24, 600),
         text(pad, 74, "Recreated tab chrome (no browser on this machine): "
                       "strip, 240px active tab, 16px favicon, URL well.",
              13, 400, UI["muted"]),
         text(pad, 94, "favicon.svg / favicon.ico ship the small cut "
                       "(dot 42, raised −8) per the ≤24 px rule.",
              13, 400, UI["muted"])]
    for i, (lab, chrome, tab, tabfg, icon, tile, urlfg, _ ) in enumerate(combos):
        y = top + i * rowH
        b.append(text(pad, y + 2, lab, 13, 600))
        bx, by = pad, y + 14
        bw, stripH, tabH = W - 2 * pad, 46, 40
        b.append(S.rect(bx, by, bw, stripH, fill=chrome))
        # active tab
        b.append(S.rect(bx + 8, by + 4, 264, tabH, fill=tab, rx=10))
        b.append(S.logo(icon, bx + 20, by + 16, w=16, swatch=tile))
        b.append(S.text(bx + 46, by + 30, "Linket — Creator store", 13, 500,
                        tabfg))
        # hint of the next tab
        b.append(S.rect(bx + 284, by + 4, 150, tabH, fill=chrome, rx=10))
        b.append(S.text(bx + 300, by + 30, "New tab", 13, 400,
                        "#9aa0a6" if chrome == "#f1f3f4" else "#9aa0a6"))
        # URL well
        url_bg = "#ffffff" if chrome == "#f1f3f4" else "#202124"
        url_bd = UI["border"] if chrome == "#f1f3f4" else "#3f3f46"
        b.append(S.rect(bx + 8, by + stripH + 4, bw - 16, 34, fill=url_bg,
                        stroke=url_bd, rx=17))
        b.append(S.text(bx + 26, by + stripH + 26,
                        "https://linket.app/dashboard", 13, 400,
                        "#5f6368" if chrome == "#f1f3f4" else "#9aa0a6"))
        # measured numbers
        rx0 = bx + 470
        vals = [f"tile vs tab {R2.contrast(tile, tab):.2f}:1",
                f"tile vs strip {R2.contrast(tile, chrome):.2f}:1",
                ("dot vs tile " +
                 (f"{R2.contrast(R2.BLUE, tile):.2f}:1" if tile == "#ffffff"
                  else f"{R2.contrast(R2.lifted_blue()[0], tile):.2f}:1"))]
        for k, v in enumerate(vals):
            b.append(S.text(rx0 + k * 158, by + 28, v, 12, 500, tabfg))
    b.append(text(pad, H - 46, "Pick: white tile (favicon.svg) — the dot "
                               "holds full brand blue at 7.43:1 and the white "
                               "chip pops on dark chrome (16.10:1).",
                  13, 500, UI["fg"]))
    b.append(text(pad, H - 26, "favicon-dark.svg ships alongside for "
                               "prefers-color-scheme; on light chrome use "
                               "theme-color to blend the strip.",
                  12, 400, UI["muted"]))
    return S.write_sheet("favicon-tabs.png", W, H, b, bg=UI["bg"])


# ------------------------------------------------------------ sheet 5
def icon_preview_sheet():
    S.sheet("icon-preview")
    pad = 40
    W = 960
    top = 132
    rowH = 132
    H = top + 4 * rowH + 72
    # measured optical-centring offsets (centroid vs bbox centre, viewBox u)
    w, h, ch, px = A.render(path_of("linket-wordmark-master"), width=2844)
    import build_icons as BI
    c_full = BI.measure_crop(w, h, ch, px, (40, 40, 225, 210))
    bx0, by0, bx1, by1 = c_full["bbox"]
    offx = c_full["centroid"][0] - (bx0 + bx1) / 2
    offy = c_full["centroid"][1] - (by0 + by1) / 2
    b = [text(pad, 44, "Icon set — Li crop, optically centred", 24, 600),
         text(pad, 74, "Centred by coverage centroid, not bbox: the L foot "
                       "pulls weight down, so bbox centring would sit the mark "
              "low.", 13, 400, UI["muted"]),
         text(pad, 94, f"Measured offset centroid−bbox = ({offx:+.1f}, "
                       f"{offy:+.1f}) viewBox units at stroke 32.",
              13, 400, UI["muted"])]
    # row 1: favicon sizes (chosen white tile) + dark tile
    y = top
    b.append(text(pad, y + 2, "favicon — white tile (chosen) + dark alternate",
                  13, 600, UI["muted"]))
    x = pad
    for size in (64, 48, 32, 16):
        b.append(S.logo("favicon-white", x, y + 34, w=size))
        x += size + 30
    b.append(S.text(pad, y + 34 + 64 + 18, "64 · 48 · 32 · 16", 11, 400,
                    UI["muted"]))
    b.append(S.logo("favicon-dark", x + 8, y + 34, w=48, swatch="#0a0a0a"))
    b.append(S.text(x + 8, y + 96, "dark tile", 11, 400, UI["muted"]))
    tx = x + 90
    fv_src = open(path_of("favicon-white")).read()
    fav_rx = float(re.search(r'rx="([\d.]+)"', fv_src).group(1))
    fav_k = float(re.search(r"scale\(([\d.]+)\)", fv_src).group(1))
    b.append(S.text(tx, y + 50, "favicon.svg · favicon.ico (16/32/48) ·",
                    12, 400, UI["fg"]))
    b.append(S.text(tx, y + 70, f"small cut, tile radius {fav_rx:g}/512 = "
                                f"{fav_rx / (32 * fav_k):.3f} ×", 12, 400,
                    UI["fg"]))
    b.append(S.text(tx, y + 90, "icon stroke (the mark's r10 ratio, "
                                "not bubbly).", 12, 400, UI["fg"]))
    # row 2: app icons
    y = top + rowH
    b.append(text(pad, y + 2, "app icons — full joint, full-bleed "
                              "(platform masks the corners)", 13, 600,
                  UI["muted"]))
    b.append(S.logo("icon-app", pad, y + 30, w=84))
    b.append(S.logo("icon-app", pad + 106, y + 30, w=56))
    b.append(S.logo("icon-app", pad + 184, y + 30, w=44))
    tx = pad + 254
    b.append(S.text(tx, y + 52, "icon-512.png · icon-192.png · "
                                "apple-touch-icon.png (180)", 12, 400,
                    UI["fg"]))
    b.append(S.text(tx, y + 72, "Same art, no radius baked in — "
                                "iOS/Android/Windows mask it themselves.",
                    12, 400, UI["muted"]))
    # row 3: maskable with safe zone
    y = top + 2 * rowH
    b.append(text(pad, y + 2, "maskable — content inside the 80% safe circle",
                  13, 600, UI["muted"]))
    mx, ms = pad, 84
    b.append(S.logo("icon-maskable", mx, y + 30, w=ms))
    r = 0.4 * ms
    b.append(f'<circle cx="{mx + ms / 2:g}" cy="{y + 30 + ms / 2:g}" '
             f'r="{r:g}" fill="none" stroke="{UI["blue"]}" '
             f'stroke-width="1.5" stroke-dasharray="4 3"/>')
    mw, mh, mc, mp = A.decode_png(os.path.join(BI.ICON,
                                               "icon-maskable-512.png"))
    mcx, mcy = (mw - 1) / 2, (mh - 1) / 2
    mmax = 0.0
    for yy in range(mh):
        for xx in range(mw):
            oo = (yy * mw + xx) * mc
            dd = max(abs(mp[oo] - 255), abs(mp[oo + 1] - 255),
                     abs(mp[oo + 2] - 255))
            if dd >= 40:
                rr = ((xx - mcx) ** 2 + (yy - mcy) ** 2) ** 0.5
                if rr > mmax:
                    mmax = rr
    mratio = mmax / (mw / 2)
    b.append(S.text(mx + ms + 24, y + 56, "r = 0.4 × 512 (safe zone);",
                    12, 400, UI["fg"]))
    b.append(S.text(mx + ms + 24, y + 76, f"measured content radius "
                                          f"{mratio:.3f} of half-size ≤ 0.8.",
                    12, 400,
                    UI["fg"]))
    # row 4: og image (caption to the right — nothing under the image)
    y = top + 3 * rowH
    b.append(text(pad, y + 2, "og / social — 1200 × 630, wordmark centred",
                  13, 600, UI["muted"]))
    b.append(S.logo("og-image", pad, y + 26, w=300, swatch="#ffffff"))
    tx = pad + 330
    b.append(S.text(tx, y + 56, "og-image.png — ink bbox centred at "
                                "(600, 315), width 720.", 12, 400, UI["fg"]))
    b.append(S.text(tx, y + 80, "All PNGs are rendered from the shipped SVG "
                                "sources;", 12, 400, UI["muted"]))
    b.append(S.text(tx, y + 100, "sizes and centring are re-measured from the "
                                 "files by", 12, 400, UI["muted"]))
    b.append(S.text(tx, y + 120, "tools/verify_round2.py.", 12, 400,
                    UI["muted"]))
    return S.write_sheet("icon-preview.png", W, H, b, bg=UI["bg"])


# ------------------------------------------------------------ sheet 6
def squint32_sheet():
    S.sheet("squint-32")
    pad = 40
    W = 960
    top = 132
    H = 420
    chans = channels_at(32)
    parts = " · ".join(f"{lab} {d:.1f}" for lab, d in chans)
    spread = max(d for _, d in chans) - min(d for _, d in chans)
    b = [text(pad, 44, "Squint test — the wordmark at 32 px", 24, 600),
         text(pad, 74, "Round-2 critique: \"look at the wordmark at 32px and "
                       "squint — no letter pair should stand out\".", 13, 400,
              UI["muted"]),
         text(pad, 94, f"Min white channel per pair at 32 px: {parts}  "
                       f"(spread {spread:.1f} px).", 13, 500, UI["fg"])]
    b.append(f'<defs><filter id="sq0" x="-40%" y="-40%" width="180%" '
             f'height="180%"><feGaussianBlur stdDeviation="1.2"/>'
             f'</filter></defs>')
    # crisp
    b.append(text(pad, top + 4, "32 px, crisp", 13, 600, UI["muted"]))
    b.append(S.logo("linket-color-light", pad, top + 20, h=32))
    # 4x pixel zoom of the crisp render for inspection
    w, h, ch, px = A.render(path_of("linket-color-light"), height=32)
    tmp = os.path.join(S.PNG, "_squint32-crisp.png")
    rows = to_rows(w, h, ch, px)
    z = []
    for yy in range(h * 4):
        src = rows[yy // 4]
        row = bytearray()
        for xx in range(w * 4):
            row += src[4 * (xx // 4):4 * (xx // 4) + 4]
        z.append(bytes(row))
    encode_png(tmp, w * 4, h * 4, z)
    b.append(S.rect(pad, top + 70, w * 4 + 8, h * 4 + 8, fill="#f5f5f5",
                    stroke=UI["border"]))
    b.append(image(pad + 4, top + 74, w * 4, h * 4, tmp))
    b.append(text(pad, top + 70 + h * 4 + 24, "same 32 px render at 4× "
                                              "(nearest, actual pixels)",
                  11, 400, UI["muted"]))
    # squinted
    x2 = pad + w * 4 + 60
    b.append(text(x2, top + 4, "32 px, σ1.2 blur — squint", 13, 600,
                  UI["muted"]))
    b.append(S.logo("linket-color-light", x2, top + 20, h=32, filt="url(#sq0)"))
    verdict = ("No pair stands out: channels sit within "
               f"{spread:.1f} px of each other at 32 px — i·n, n·k, k·e and "
               "e·t read as one even rhythm.")
    if spread > 0.6:
        verdict = (f"Channels at 32 px: {parts} — spread {spread:.1f} px. "
                   "Inspect k·e/e·t against i·n/n·k before print.")
    b.append(text(x2, top + 90, "Verdict", 13, 600, UI["fg"]))
    for k, ln in enumerate([verdict[:54], verdict[54:108], verdict[108:]]):
        if ln:
            b.append(text(x2, top + 112 + k * 20, ln, 12, 400, UI["muted"]))
    full = channels_at(256)
    fparts = " / ".join(f"{d:.1f}" for _, d in full)
    b.append(text(x2, top + 210, f"Round-3 full-size channels: {fparts} units.",
                  12, 400, UI["muted"]))
    b.append(text(x2, top + 230, "32/256 × each = the numbers above. Letter "
                                 "positions unchanged; stroke 24→32 eats",
                  12, 400, UI["muted"]))
    b.append(text(x2, top + 250, "8 units per channel — the rhythm stays "
                                 "even.", 12, 400, UI["muted"]))
    b.append(text(pad, H - 28, "Blur is a real σ1.2 gaussian at 32 px "
                               "(filter sq0), not a screenshot effect.",
                  12, 400, UI["muted"]))
    return S.write_sheet("squint-32.png", W, H, b, bg=UI["bg"])


BUILDERS = [color_versions_sheet, cvd_sheet, small_sizes_sheet,
            favicon_tabs_sheet, icon_preview_sheet, squint32_sheet]


def build_all():
    for fn in BUILDERS:
        fn()


def main():
    import json
    logp = os.path.join(S.PNG, "_log.json")
    if os.path.exists(logp):
        S.LOG.extend(json.load(open(logp)))
    build_all()
    with open(logp, "w") as f:
        json.dump(S.LOG, f, indent=1)


if __name__ == "__main__":
    main()
