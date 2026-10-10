#!/usr/bin/env python3
"""Round 3: "Li" crop icon set.

favicon tile (white or #0a0a0a, corner radius = the mark's r10 ratio),
favicon.svg/.ico (16/32/48), apple-touch-icon 180, icon-192/512, maskable
512 (80% safe zone), og image 1200x630. The mark is optically centered by
coverage centroid - not bbox.

Small cut (O42 raised -8) in favicon svg/ico per the <=24px rule; full joint
everywhere larger. Platform-masked PNGs are full-bleed squares (no radius);
only the favicon tile carries the rj-consistent corner.
"""
import os
import re
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_wordmarks as B  # noqa: E402
import analyze as A          # noqa: E402
import build_round2 as R2     # noqa: E402  (contrast maths + lifted blue)
import build_v3 as V3        # noqa: E402  (round-3 geometry)

BRAND = os.path.normpath(os.path.join(HERE, ".."))
ICON = os.path.join(BRAND, "icon")
os.makedirs(ICON, exist_ok=True)

INK, WHITE, BLUE = R2.INK, R2.WHITE, R2.BLUE
LIFTED, L0, L1 = R2.lifted_blue()
DARK = "#0a0a0a"

TILE = 512
FILL = 0.66          # longest crop edge as fraction of the tile
SAFE_R = 0.4 * TILE  # maskable safe zone radius (80% circle)


# ------------------------------------------------------------- mark pieces
def mark_paths(dot_w, dot_dy):
    """Filled paths of the Li crop: L, i stem, tittle (viewBox 711x256)."""
    l_d = B.outline(V3.l_prims("chamfer", False), rj=V3.RJ)
    i_d = B.outline([B.Line((V3.I_X, V3.X_TOP), (V3.I_X, V3.BASE))], rj=V3.RJ)
    dot_d = B.rrect(V3.I_X - dot_w / 2, V3.DOT_Y + dot_dy, dot_w, dot_w,
                    dot_w / 2)
    return l_d, i_d, dot_d


def measure_crop(w, h, ch, px, crop_box):
    """Ink bbox + coverage centroid inside crop_box (viewBox units at render)."""
    x0, y0, x1, y1 = crop_box
    sx = w / B.W_CANVAS
    sy = h / B.H_CANVAS
    rx0, ry0, rx1, ry1 = (int(x0 * sx), int(y0 * sy),
                          int(round(x1 * sx)), int(round(y1 * sy)))
    n = sx * sy
    tot = mx = my = 0.0
    bx0, by0, bx1, by1 = 1e9, 1e9, -1e9, -1e9
    for y in range(max(0, ry0), min(h, ry1)):
        for x in range(max(0, rx0), min(w, rx1)):
            a = px[(y * w + x) * ch + 3]
            if a < 40:
                continue
            tot += a
            mx += x * a
            my += y * a
            bx0, by0 = min(bx0, x), min(by0, y)
            bx1, by1 = max(bx1, x), max(by1, y)
    return {
        "bbox": (bx0 / sx, by0 / sy, (bx1 + 1) / sx, (by1 + 1) / sy),
        "centroid": (mx / tot / sx, my / tot / sy),
        "weight": tot / (n * n),
    }


def xform(gx, gy, k):
    """translate/scale putting viewBox point (gx,gy) at tile center."""
    return f"translate({TILE/2 - gx*k:g} {TILE/2 - gy*k:g}) scale({k:g})"


# ------------------------------------------------------------------ emitters
def tile_svg(bg, letter_fill, dot_fill, l_d, i_d, dot_d, gx, gy, k, rx):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" role="img" '
        f'aria-label="Linket" viewBox="0 0 {TILE} {TILE}" '
        f'width="{TILE}" height="{TILE}">\n'
        f'  <title>Linket</title>\n'
        f'  <rect width="{TILE}" height="{TILE}" rx="{rx:g}" fill="{bg}"/>\n'
        f'  <g transform="{xform(gx, gy, k)}">\n'
        f'    <g fill="{letter_fill}"><path d="{l_d}"/><path d="{i_d}"/></g>\n'
        f'    <path fill="{dot_fill}" d="{dot_d}"/>\n'
        f'  </g>\n</svg>\n')


def write(path, txt):
    with open(path, "w") as f:
        f.write(txt)
    return path


def render_png(svg_path, size, out_png):
    import subprocess
    r = subprocess.run(["rsvg-convert", "-o", out_png, "-w", str(size),
                        "-h", str(size), svg_path], capture_output=True)
    if r.returncode:
        raise RuntimeError(r.stderr.decode(errors="replace"))
    return out_png


def pack_ico(pngs_sizes):
    """Minimal PNG-in-ICO writer (32bpp entries)."""
    blobs = []
    for size, path in pngs_sizes:
        blobs.append((size, open(path, "rb").read()))
    count = len(blobs)
    out = struct.pack("<HHH", 0, 1, count)
    offset = 6 + 16 * count
    for size, data in blobs:
        dim = 0 if size >= 256 else size
        out += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32,
                           len(data), offset)
        offset += len(data)
    for _, data in blobs:
        out += data
    return out


def main():
    print("== measure crop (coverage centroid, 4x render of the master) ==")
    w, h, ch, px = A.render(os.path.join(BRAND, "master",
                                         "linket-wordmark-master.svg"),
                            width=B.W_CANVAS * 4)
    crop_full = measure_crop(w, h, ch, px, (40, 40, 225, 210))
    w2, h2, ch2, px2 = A.render(os.path.join(BRAND, "master",
                                             "linket-wordmark-master-small.svg"),
                                width=B.W_CANVAS * 4)
    crop_small = measure_crop(w2, h2, ch2, px2, (40, 40, 225, 210))
    for tag, c in (("full joint", crop_full), ("small cut", crop_small)):
        bx0, by0, bx1, by1 = c["bbox"]
        print(f"  {tag:11s} bbox=({bx0:.1f},{by0:.1f})-({bx1:.1f},{by1:.1f}) "
              f"size {bx1-bx0:.1f}x{by1-by0:.1f}  "
              f"centroid=({c['centroid'][0]:.2f},{c['centroid'][1]:.2f})  "
              f"bbox-center=({(bx0+bx1)/2:.2f},{(by0+by1)/2:.2f})  "
              f"(offset {(c['centroid'][0]-(bx0+bx1)/2):+.2f},"
              f"{(c['centroid'][1]-(by0+by1)/2):+.2f})")

    l_full, i_full, d_full = mark_paths(R2.DOT_W, R2.DOT_DY)
    l_sm, i_sm, d_sm = mark_paths(R2.DOT_W_S, R2.DOT_DY_S)

    # scale: longest crop edge fills FILL of the tile
    k_full = FILL * TILE / max(crop_full["bbox"][2] - crop_full["bbox"][0],
                               crop_full["bbox"][3] - crop_full["bbox"][1])
    k_sm = FILL * TILE / max(crop_small["bbox"][2] - crop_small["bbox"][0],
                             crop_small["bbox"][3] - crop_small["bbox"][1])
    stroke_tile = V3.STROKE * k_sm
    rx = (V3.RJ / V3.STROKE) * stroke_tile  # rj ratio (10/32) on the tile
    print(f"  k full={k_full:.4f} k small={k_sm:.4f}  "
          f"stroke@512={stroke_tile:.1f} -> tile rx={rx:.2f} "
          f"({100*rx/TILE:.2f}% of tile)")

    gx_sm, gy_sm = crop_small["centroid"]
    gx_fl, gy_fl = crop_full["centroid"]

    # ---- favicon tiles (small cut)
    fav_w = write(os.path.join(ICON, "favicon-white.svg"),
                  tile_svg(WHITE, INK, BLUE, l_sm, i_sm, d_sm,
                           gx_sm, gy_sm, k_sm, rx))
    fav_d = write(os.path.join(ICON, "favicon-dark.svg"),
                  tile_svg(DARK, WHITE, LIFTED, l_sm, i_sm, d_sm,
                           gx_sm, gy_sm, k_sm, rx))

    # ---- verdict from measured numbers (tab mockups show both)
    chrome_l, chrome_d = "#f1f3f4", "#202124"
    v = {
        "white tile: dot vs tile": R2.contrast(BLUE, WHITE),
        "dark tile: dot vs tile": R2.contrast(LIFTED, DARK),
        "white tile vs light chrome": R2.contrast(WHITE, chrome_l),
        "white tile vs dark chrome": R2.contrast(WHITE, chrome_d),
        "dark tile vs light chrome": R2.contrast(DARK, chrome_l),
        "dark tile vs dark chrome": R2.contrast(DARK, chrome_d),
    }
    for k_, val in v.items():
        print(f"  {k_:28s} {val:5.2f}:1")
    winner = "white"  # brand blue dot at full strength (7.43:1); dark chrome
    # still shows a strong white chip (17.6:1). Both shipped; white = default.
    print(f"  verdict: {winner} tile wins (dot at full brand blue "
          f"{v['white tile: dot vs tile']:.2f}:1 vs lifted "
          f"{v['dark tile: dot vs tile']:.2f}:1; white also pops on dark "
          f"chrome). favicon-dark.svg ships for prefers-color-scheme.")
    fav = write(os.path.join(ICON, "favicon.svg"), open(fav_w).read())

    # ---- app icons (full joint, full bleed - platform masks the corners)
    app = tile_svg(WHITE, INK, BLUE, l_full, i_full, d_full,
                   gx_fl, gy_fl, k_full, rx=0)
    app_src = write(os.path.join(ICON, "icon-app.svg"), app)

    # ---- maskable: keep every crop corner inside the 80% safe circle
    bx0, by0, bx1, by1 = crop_full["bbox"]
    corners = [(x - gx_fl, y - gy_fl)
               for x in (bx0, bx1) for y in (by0, by1)]
    maxr = max((dx * dx + dy * dy) ** 0.5 for dx, dy in corners)
    k_mask = SAFE_R / maxr
    mask_src = write(os.path.join(ICON, "icon-maskable.svg"),
                     tile_svg(WHITE, INK, BLUE, l_full, i_full, d_full,
                              gx_fl, gy_fl, k_mask, rx=0))
    print(f"  maskable k={k_mask:.4f} (content radius <= {SAFE_R:g})")

    # ---- og image 1200x630, FULL wordmark ink bbox centred
    OW, OH = 1200, 630
    wm = open(os.path.join(BRAND, "color", "linket-color-light.svg")).read()
    inner = wm[wm.index(">", wm.index("<svg")) + 1:wm.rindex("</svg>")]
    inner = re.sub(r"<title>.*?</title>", "", inner, flags=re.S).strip("\n")
    ib = (44, 52, 663, 204)
    k_og = 720.0 / (ib[2] - ib[0])
    cx, cy = (ib[0] + ib[2]) / 2, (ib[1] + ib[3]) / 2
    og_svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" role="img" '
        f'aria-label="Linket" width="{OW}" height="{OH}" '
        f'viewBox="0 0 {OW} {OH}">\n  <title>Linket</title>\n'
        f'  <rect width="{OW}" height="{OH}" fill="{WHITE}"/>\n'
        f'  <g transform="translate({OW / 2 - cx * k_og:g} '
        f'{OH / 2 - cy * k_og:g}) scale({k_og:g})">\n'
        + "\n".join("    " + ln for ln in inner.splitlines())
        + "\n  </g>\n</svg>\n")
    og_src = write(os.path.join(ICON, "og-image.svg"), og_svg)

    # ---- renders
    print("render:")
    fav16 = render_png(fav, 16, os.path.join(ICON, "favicon-16.png"))
    fav32 = render_png(fav, 32, os.path.join(ICON, "favicon-32.png"))
    fav48 = render_png(fav, 48, os.path.join(ICON, "favicon-48.png"))
    ico = os.path.join(ICON, "favicon.ico")
    with open(ico, "wb") as f:
        f.write(pack_ico([(16, fav16), (32, fav32), (48, fav48)]))
    render_png(app_src, 180, os.path.join(ICON, "apple-touch-icon.png"))
    render_png(app_src, 192, os.path.join(ICON, "icon-192.png"))
    render_png(app_src, 512, os.path.join(ICON, "icon-512.png"))
    render_png(mask_src, 512, os.path.join(ICON, "icon-maskable-512.png"))
    import subprocess
    r = subprocess.run(["rsvg-convert", "-o", os.path.join(ICON, "og-image.png"),
                        "-w", str(OW), "-h", str(OH), og_src],
                       capture_output=True)
    if r.returncode:
        raise RuntimeError(r.stderr.decode(errors="replace"))

    # ---- measurements of the rendered PNGs (never by eye)
    print("verify (rendered pixels):")
    for name, size in (("favicon-16.png", 16), ("favicon-32.png", 32),
                       ("favicon-48.png", 48), ("icon-192.png", 192),
                       ("icon-512.png", 512), ("icon-maskable-512.png", 512),
                       ("apple-touch-icon.png", 180)):
        w, h, c, p = A.decode_png(os.path.join(ICON, name))
        tot = mx = my = 0.0
        maxr = 0.0
        cx0, cy0 = (w - 1) / 2, (h - 1) / 2
        for y in range(h):
            for x in range(w):
                o = (y * w + x) * c
                # "not the white tile": differs from bg white or is blue dot
                r_, g_, b_ = p[o], p[o + 1], p[o + 2]
                ink = max(abs(r_ - 255), abs(g_ - 255), abs(b_ - 255))
                if ink < 40:
                    continue
                wgt = ink
                tot += wgt
                mx += x * wgt
                my += y * wgt
                maxr = max(maxr, ((x - cx0) ** 2 + (y - cy0) ** 2) ** 0.5)
        gx_, gy_ = mx / tot, my / tot
        err = ((gx_ - cx0) ** 2 + (gy_ - cy0) ** 2) ** 0.5
        safe = "" if "maskable" not in name else (
            f" max-content-r={maxr/(w/2):.3f} of half-size "
            f"({'OK <=0.8' if maxr/(w/2) <= 0.8 else 'FAIL >0.8'})")
        print(f"  {name:24s} {w}x{h} centroid err {err:.2f}px "
              f"({err/w*100:.2f}% of size){safe}")
        if "maskable" in name and maxr / (w / 2) > 0.8:
            raise SystemExit("maskable safe zone violated")
        if err / w > 0.02:
            raise SystemExit(f"centroid off-center in {name}")
    # ICO structure
    data = open(ico, "rb").read()
    n = struct.unpack("<H", data[4:6])[0]
    sizes = []
    for i in range(n):
        wbyte = data[6 + 16 * i]
        sizes.append(wbyte or 256)
    print(f"  favicon.ico: {n} entries, sizes {sizes}, {len(data)} bytes "
          f"{'OK' if sorted(sizes) == [16, 32, 48] else 'FAIL'}")
    # og
    w, h, c, p = A.decode_png(os.path.join(ICON, "og-image.png"))
    print(f"  og-image.png: {w}x{h} {'OK' if (w, h) == (OW, OH) else 'FAIL'}")
    if n != 3 or sorted(sizes) != [16, 32, 48] or (w, h) != (OW, OH):
        raise SystemExit("icon deliverable failed structure check")
    return v, winner


if __name__ == "__main__":
    main()
