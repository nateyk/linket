#!/usr/bin/env python3
"""Verify generated sheets by pixels (never by looking at an image viewer).

For every logo placement logged by sheets.py:
  - crop the cell from the sheet PNG
  - compare ink against a standalone render of the same file at the same size
  - mirrored cells must match the horizontally flipped render better than the
    unflipped one
  - blurred cells must show soft (partial-coverage) pixels vs a crisp render
Also: background colour, edge bleed (text overflow), title text ink, and the
label strings inside each sheet's SVG source.
"""
import json
import os
import re
import sys

import analyze as A

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "source"))
PNG = os.path.normpath(os.path.join(HERE, "..", "png"))
SEARCH = [SRC,
          os.path.normpath(os.path.join(HERE, "..", "master")),
          os.path.normpath(os.path.join(HERE, "..", "color")),
          os.path.normpath(os.path.join(HERE, "..", "icon"))]


def find_logo(name):
    for d in SEARCH:
        p = os.path.join(d, name + ".svg")
        if os.path.exists(p):
            return p
    raise FileNotFoundError(f"logo {name!r} not in {SEARCH}")

BLUR_SIGMA = {0: 1.2, 1: 2.4, 2: 2.4, 3: 4.0}
BG = {
    "roundness-sheet": (255, 255, 255),
    "spacing-before-after": (255, 255, 255),
    "coldread-light": (255, 255, 255),
    "coldread-dark": (10, 10, 10),
    "coldread-blue": (0, 73, 204),
    "coldread-blur-mirror": (255, 255, 255),
    "variants-link-cuts": (255, 255, 255),
    "context-header": (255, 255, 255),
    "context-sidebar": (255, 255, 255),
    "context-profile": (255, 255, 255),
    "color-versions": (255, 255, 255),
    "cvd-check": (255, 255, 255),
    "small-sizes": (255, 255, 255),
    "favicon-tabs": (255, 255, 255),
    "icon-preview": (255, 255, 255),
    "squint-32": (255, 255, 255),
}
LABELS = {
    "roundness-sheet": ["R0 · current", "R1 · medium", "R2 · sharp",
                        "Linked Li", "Linkline", "37.1", "butt cuts",
                        "square dot"],
    "spacing-before-after": ["BEFORE — R0 (current)", "AFTER — R2 (re-spaced)",
                             "37.1", "32.0", "23.0", "a-r0", "a-r2"],
    "coldread-light": ["16 px", "24 px", "32 px", "48 px", "64 px",
                       "black on white", "A · R1", "B · R2", "small cut"],
    "coldread-dark": ["Counter Ink", "#0a0a0a", "white on"],
    "coldread-blue": ["#0049cc", "brand blue"],
    "coldread-blur-mirror": ["σ1.2", "σ2.4", "σ4", "Mirror", "squint"],
    "variants-link-cuts": ["15° angled cuts", "arc r48", "45° chamfer", "h16"],
    "context-header": ["H1 · fixed-name surface", "H2 · dark navbar",
                       "H3 · configurable surface", "Login", "Register",
                       "Linket"],
    "context-sidebar": ["Resources", "Tracking pixels", "Sales &amp; Payouts",
                        "logo slot", "site_name", "alt="],
    "context-profile": ["Copyright © 2026 Linket, All Rights Reserved",
                        "Developers", "Contact Us", "P1 · wordmark h16"],
    "color-versions": ["colour versions", "color-light", "color-dark",
                       "mono-black", "mono-white", "on-blue", "19.80:1",
                       "3.02:1"],
    "cvd-check": ["CVD check", "Grayscale", "Protanopia", "Deuteranopia",
                  "Tritanopia", "No-colour control", "as shipped"],
    "small-sizes": ["16 px", "24 px", "32 px", "48 px", "small cut", "B−R",
                    "Verdict:", "must read with no colour"],
    "favicon-tabs": ["light chrome", "dark chrome", "white tile",
                     "#0a0a0a tile", "linket.app", "Pick:"],
    "icon-preview": ["optically centred", "favicon.ico", "maskable",
                     "safe circle", "og-image.png", "icon-512.png",
                     "centroid−bbox"],
    "squint-32": ["32 px", "σ1.2", "squint", "Min white channel", "Verdict"],
}

FAIL = []


def check(cond, msg):
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        FAIL.append(msg)


def cell_ink(px, w, h, ch, x0, y0, cw, chh, bg):
    out = []
    for j in range(chh):
        yy = min(h - 1, max(0, y0 + j))
        for i in range(cw):
            xx = min(w - 1, max(0, x0 + i))
            o = (yy * w + xx) * ch
            r, g, b = px[o], px[o + 1], px[o + 2]
            out.append(max(abs(r - bg[0]), abs(g - bg[1]), abs(b - bg[2])))
    return out


def crop_cov(cov, w, h, pad):
    """Return cov with `pad` px of zero border on all sides (clamped)."""
    if pad <= 0:
        return cov, w, h
    nw, nh = w + 2 * pad, h + 2 * pad
    out = [0] * (nw * nh)
    for j in range(h):
        for i in range(w):
            out[(j + pad) * nw + i + pad] = cov[j * w + i]
    return out, nw, nh


def verify_entry(e, sheet_w, sheet_h, bg, sheet_png_cov):
    name = e["logo"]
    x0, y0 = int(round(e["x"])), int(round(e["y"]))
    cw, chh = int(round(e["w"])), int(round(e["h"]))
    cw = max(1, min(cw, sheet_w - x0))
    chh = max(1, min(chh, sheet_h - y0))
    crop_bg = bg
    if e.get("swatch"):
        s = e["swatch"]
        crop_bg = (int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16))
    cell = cell_ink(sheet_png_cov["px"], sheet_w, sheet_h, sheet_png_cov["ch"],
                    x0, y0, cw, chh, crop_bg)
    blur = re.search(r"blur(\d)", e["filt"])
    mirror = "scale(-1 1)" in e["transform"]
    pad = int(BLUR_SIGMA[int(blur.group(1))] * 2.5 + 2) if blur else 0
    if pad:
        cell = cell_ink(sheet_png_cov["px"], sheet_w, sheet_h, sheet_png_cov["ch"],
                        x0 - pad, y0 - pad, cw + 2 * pad, chh + 2 * pad, crop_bg)

    w2, h2, ch2, px2 = A.render(find_logo(name), width=cw)
    recolor = e.get("recolor")
    rc = ((int(recolor[1:3], 16), int(recolor[3:5], 16),
           int(recolor[5:7], 16)) if recolor else None)

    def exp_at(lx, ly):
        """Expected cell metric: the standalone pixel's max-channel distance
        from crop_bg scaled by alpha - exactly what cell_ink measures on the
        sheet (composite over crop_bg). Handles recoloured placements and
        opaque icon tiles alike; zero outside the render (blur padding)."""
        if lx < 0 or ly < 0 or lx >= w2 or ly >= h2:
            return 0.0
        o = (ly * w2 + lx) * ch2
        a = px2[o + 3] / 255.0
        r, g, b = rc if rc else (px2[o], px2[o + 1], px2[o + 2])
        return a * max(abs(r - crop_bg[0]), abs(g - crop_bg[1]),
                       abs(b - crop_bg[2]))

    ow = min(cw + 2 * pad, w2 + 2 * pad)
    oh = min(chh + 2 * pad, h2 + 2 * pad)

    cstr = cw + 2 * pad
    cell_m = [cell[j * cstr + i] for j in range(oh) for i in range(ow)]
    exp_m = [exp_at(i - pad, j - pad) for j in range(oh) for i in range(ow)]
    ink_c = sum(1 for v in cell_m if v > 60)
    ink_e = sum(1 for v in exp_m if v > 60)
    tag = f"{os.path.basename(sheet_png_cov['path'])} {name} @{e['x']:.0f}"

    if e.get("swatch"):
        # crop is white symbol on a solid swatch: ink == the symbol itself,
        # and most of the cell must still be the swatch colour
        sw_bg_px = sum(1 for v in cell_m if v <= 30)
        ratio = ink_c / max(1, ink_e)
        check(0.6 <= ratio <= 1.6 and sw_bg_px >= 0.25 * ow * oh,
              f"{tag}: symbol on swatch {e['swatch']} "
              f"(ink {ink_c}/{ink_e} = {ratio:.2f})")
        return
    if blur:
        c40 = sum(1 for v in cell_m if v > 40)
        e40 = sum(1 for v in exp_m if v > 40)
        soft_c = sum(1 for v in cell_m if 30 <= v < 235)
        hard_c = sum(1 for v in cell_m if v >= 235)
        soft_e = sum(1 for v in exp_m if 30 <= v < 235)
        hard_e = sum(1 for v in exp_m if v >= 235)
        rc = soft_c / max(1, hard_c)
        re_ = soft_e / max(1, hard_e)
        check(rc >= max(1.0, 1.4 * re_) and c40 >= 0.3 * max(1, e40),
              f"{tag}: blurred (soft/hard {rc:.1f} vs crisp {re_:.1f}, "
              f"ink {c40}/{e40})")
        return
    ratio = ink_c / max(1, ink_e)
    diff = sum(abs(a - b) for a, b in zip(cell_m, exp_m)) / max(1, ow * oh)
    if mirror:
        flip = []
        for j in range(oh):
            row = exp_m[j * ow:(j + 1) * ow]
            flip += list(reversed(row))[:ow]
        diff_f = sum(abs(a - b) for a, b in zip(cell_m, flip)) / max(1, ow * oh)
        check(diff_f < diff and diff_f < 50,
              f"{tag}: mirror matches flipped render "
              f"(flip {diff_f:.1f} < normal {diff:.1f})")
        return
    check(0.7 <= ratio <= 1.4 and diff < 50,
          f"{tag}: matches standalone render (ink ratio {ratio:.2f}, "
          f"mean diff {diff:.1f})")


def main():
    log = json.load(open(os.path.join(PNG, "_log.json")))
    by_sheet = {}
    for e in log:
        by_sheet.setdefault(e["sheet"], []).append(e)

    for sname in sorted(BG):
        png = os.path.join(PNG, sname + ".png")
        svg = os.path.join(PNG, sname + ".svg")
        print(f"{sname}:")
        check(os.path.exists(png), f"{sname}: png exists")
        if not os.path.exists(png):
            continue
        w, h, ch, px = A.decode_png(png)
        check((w, h) != (0, 0), f"{sname}: decodes ({w}x{h})")
        bg = BG[sname]
        o = (3 * w + 3) * ch
        got = (px[o], px[o + 1], px[o + 2])
        check(got == bg, f"{sname}: background {got} == {bg}")
        cov = {"px": px, "ch": ch, "path": png}
        # edge bleed: nothing may touch the outer 2px (text overflow)
        edge = 0
        for y in range(h):
            for x in list(range(0, 2)) + list(range(w - 2, w)):
                oo = (y * w + x) * ch
                edge += (max(abs(px[oo] - bg[0]), abs(px[oo + 1] - bg[1]),
                             abs(px[oo + 2] - bg[2])) > 40)
        for x in range(w):
            for y in list(range(0, 2)) + list(range(h - 2, h)):
                oo = (y * w + x) * ch
                edge += (max(abs(px[oo] - bg[0]), abs(px[oo + 1] - bg[1]),
                             abs(px[oo + 2] - bg[2])) > 40)
        check(edge == 0, f"{sname}: no ink bleeding off the sheet edges ({edge})")
        # title text actually rendered (ink in the top band, left third)
        band = cell_ink(px, w, h, ch, 0, 20, w // 3, 70, bg)
        check(sum(1 for v in band if v > 60) > 150,
              f"{sname}: title/heading text rendered")
        src = open(svg).read() if os.path.exists(svg) else ""
        for s in LABELS.get(sname, []):
            check(s in src, f"{sname}: label present in svg: {s!r}")
        for e in by_sheet.get(sname, []):
            verify_entry(e, w, h, bg, cov)
        print()

    print("FAILURES:" if FAIL else "ALL SHEET CHECKS PASS")
    for f in FAIL:
        print("  - " + f)
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()
