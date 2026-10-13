#!/usr/bin/env python3
"""Pixel verification for the Linket wordmarks.

The session image viewer is unreliable, so every claim here is measured from
decoded PNG pixels: ink bbox, adjacent-letter white channels, engine-vs-miter
pixel diff, R1-vs-R2 localization, and dot/gap survival at 16-64px heights.
"""
import math
import os
import re
import struct
import subprocess
import sys
import tempfile
import zlib
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "source"))


# --------------------------------------------------------------- png decode
def decode_png(path):
    with open(path, "rb") as f:
        data = f.read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a png"
    pos, idat, meta = 8, b"", None
    while pos < len(data):
        ln, typ = struct.unpack(">I4s", data[pos:pos + 8])
        chunk = data[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            meta = struct.unpack(">IIBBBBB", chunk)
        elif typ == b"IDAT":
            idat += chunk
        elif typ == b"IEND":
            break
        pos += 12 + ln
    w, h, depth, ctype, comp, filt, inter = meta
    assert depth == 8 and inter == 0, f"unsupported png depth={depth} interlace={inter}"
    ch = {0: 1, 2: 3, 4: 2, 6: 4}.get(ctype)
    assert ch, f"unsupported color type {ctype}"
    raw = zlib.decompress(idat)
    stride = w * ch
    out = bytearray(stride * h)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        ft = raw[p]; p += 1
        line = bytearray(raw[p:p + stride]); p += stride
        if ft == 1:
            for i in range(ch, stride):
                line[i] = (line[i] + line[i - ch]) & 255
        elif ft == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif ft == 3:
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif ft == 4:
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                b = prev[i]
                c = prev[i - ch] if i >= ch else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return w, h, ch, bytes(out)


def render(svg_path, width=None, height=None, tag="r"):
    if (width is None) != (height is None):
        # derive the missing dimension from the svg aspect (shim stretches if -1)
        txt = open(svg_path, "rb").read(600).decode("utf-8", "replace")
        m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', txt)
        vw, vh = (float(m.group(1)), float(m.group(2))) if m else (711.0, 256.0)
        if height is None:
            height = max(1, round(vh * width / vw))
        else:
            width = max(1, round(vw * height / vh))
    tmp = tempfile.mktemp(suffix=f"_{tag}.png")
    cmd = ["rsvg-convert", "-o", tmp]
    if width:
        cmd += ["-w", str(width)]
    if height:
        cmd += ["-h", str(height)]
    cmd.append(svg_path)
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode:
        raise RuntimeError(r.stderr.decode())
    w, h, ch, px = decode_png(tmp)
    os.unlink(tmp)
    return w, h, ch, px


def coverage(w, h, ch, px):
    """Per-pixel ink coverage 0..255 (alpha, or darkness on opaque bg)."""
    if ch == 4:
        return [px[i] for i in range(3, 4 * w * h, 4)]
    if ch == 2:
        return [px[i] for i in range(1, 2 * w * h, 2)]
    # rgb: darkness
    return [max(0, 255 - (px[i] + px[i + 1] + px[i + 2]) // 3) for i in range(0, 3 * w * h, 3)]


def ink_points(w, h, cov, thr=110, x0=0, x1=None, y0=0, y1=None):
    x1 = w if x1 is None else x1
    y1 = h if y1 is None else y1
    pts = []
    for y in range(max(0, y0), min(h, y1)):
        row = y * w
        for x in range(max(0, x0), min(w, x1)):
            if cov[row + x] >= thr:
                pts.append((x, y))
    return pts


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def min_dist(a_pts, b_pts, cell=4):
    """Exact min euclidean distance between two point sets (grid accelerated)."""
    buckets = defaultdict(list)
    for x, y in a_pts:
        buckets[(x // cell, y // cell)].append((x, y))
    best = float("inf")
    pair = None
    for x, y in b_pts:
        cx, cy = x // cell, y // cell
        local = float("inf")
        R = 0
        while True:
            for gx in range(cx - R, cx + R + 1):
                for gy in range(cy - R, cy + R + 1):
                    if max(abs(gx - cx), abs(gy - cy)) != R:
                        continue  # already checked in earlier rings
                    for (ax, ay) in buckets.get((gx, gy), ()):
                        d = math.hypot(ax - x, ay - y)
                        if d < local:
                            local = d
                            pair = ((ax, ay), (x, y))
            if R * cell >= min(best, local) or R >= 120:
                break
            R += 1
        if local < best:
            best = local
    return best, pair


def ascii_art(w, h, cov, cols=100, rows=24, thr=90):
    sx, sy = max(1, w // cols), max(1, h // rows)
    lines = []
    for gy in range(0, h, sy):
        row = ""
        for gx in range(0, w, sx):
            tot = n = 0
            for y in range(gy, min(h, gy + sy), 2):
                for x in range(gx, min(w, gx + sx), 2):
                    tot += cov[y * w + x]
                    n += 1
            m = tot / max(1, n)
            row += "#" if m > 160 else ("+" if m > 70 else ("." if m > 25 else " "))
        lines.append(row)
    return "\n".join(lines)


# ------------------------------------------------------------------ checks
def check_bbox(name, w, h, cov, expect):
    pts = ink_points(w, h, cov)
    x0, y0, x1, y1 = bbox(pts)
    ok = abs(x0 - expect[0]) <= 1 and abs(y0 - expect[1]) <= 1 and \
         abs(x1 - expect[2]) <= 1 and abs(y1 - expect[3]) <= 1
    print(f"  bbox {name:14s} got=({x0},{y0},{x1},{y1}) expected={expect} "
          f"{'OK' if ok else 'FAIL'}")
    return ok


def engine_vs_miter():
    """rj=0 engine outline must pixel-match a miter/butt stroke of same path."""
    d_engine = os.path.join(SRC, "..", "tools", "_t_engine.svg")
    d_stroke = os.path.join(SRC, "..", "tools", "_t_stroke.svg")
    sys.path.insert(0, HERE)
    from build_wordmarks import outline, l_prims
    L = outline(l_prims("a", "chamfer"), rj=0.0)
    with open(d_engine, "w") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 711 256" '
                f'width="711" height="256"><path fill="#111" d="{L}"/></svg>')
    with open(d_stroke, "w") as f:
        f.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 711 256" '
                'width="711" height="256"><path fill="none" stroke="#111" stroke-width="24" '
                'stroke-linecap="butt" stroke-linejoin="miter" '
                'd="M60 52 V192 H164 L192 164 V108"/></svg>')
    w, h, ch, px = render(str(d_engine), width=1422, height=512, tag="e")
    w2, h2, ch2, px2 = render(str(d_stroke), width=1422, height=512, tag="s")
    c1, c2 = coverage(w, h, ch, px), coverage(w2, h2, ch2, px2)
    diffs = sum(1 for a, b in zip(c1, c2) if abs(a - b) > 90)
    ink = sum(1 for a in c1 if a > 110)
    pct = 100.0 * diffs / max(1, ink)
    print(f"  engine-vs-miter  differing px={diffs} ({pct:.3f}% of ink) "
          f"{'OK' if pct < 1.0 else 'FAIL'}")
    for p in (d_engine, d_stroke):
        os.unlink(p)
    return pct < 1.0


def r1_vs_r2_localized():
    """a-r1-chamfer vs a-r2: differences only at L elbow + dot + e bar joint.

    Round 2 moved R1 rounding to EVERY drawn join, so the e bowl-to-bar corner
    (round 1 left it miter-sharp) now differs between R1 and R2 as well.
    """
    w, h, ch, p1 = render(os.path.join(SRC, "a-r1-chamfer.svg"))
    w2, h2, ch2, p2 = render(os.path.join(SRC, "a-r2.svg"))
    c1, c2 = coverage(w, h, ch, p1), coverage(w2, h2, ch2, p2)
    diff = [(i % w, i // w) for i in range(len(c1)) if abs(c1[i] - c2[i]) > 60]
    if not diff:
        print("  r1-vs-r2         NO differences -> FAIL")
        return False
    x0, y0, x1, y1 = bbox(diff)
    zones = [(44, 60, 194, 210), (174, 210, 60, 96), (548, 566, 156, 176)]  # elbow, dot, e-joint
    inside = all(any(zx0 <= x <= zx1 and zy0 <= y <= zy1 for zx0, zx1, zy0, zy1 in zones)
                 for x, y in diff)
    print(f"  r1-vs-r2         {len(diff)} px differ, bbox=({x0},{y0},{x1},{y1}) "
          f"zones=elbow+dot+e-joint -> {'OK' if inside else 'FAIL'}")
    return inside


def channels(name, splits=None, ymax=None):
    """Min white channel between adjacent letter segments of a wordmark file."""
    w, h, ch, px = render(os.path.join(SRC, name + ".svg"))
    cov = coverage(w, h, ch, px)
    if splits is None:
        if name == "b-r0":
            # b-r0 letters sit in a scale(0.86) group -> scaled positions
            splits = [("L", 0, 120), ("i", 120, 190), ("n", 190, 300),
                      ("k", 300, 400), ("e", 400, 500), ("t", 500, w)]
        else:
            splits = {"a": [("Li", 0, 217), ("n", 217, 351), ("k", 351, 455),
                            ("e", 455, 575), ("t", 575, w)],
                      "b": [("L", 0, 130), ("i", 130, 217), ("n", 217, 351),
                            ("k", 351, 455), ("e", 455, 575), ("t", 575, w)]}[name[0]]
    if ymax is None:
        ymax = 195 if name.startswith("b-r") and name != "b-r0" else (195 if name == "b-r0" else h)
    segs = [(lbl, ink_points(w, h, cov, x0=x0, x1=x1, y1=ymax)) for lbl, x0, x1 in splits]
    print(f"  channels ({name}):")
    out = []
    for i in range(len(segs) - 1):
        la, pa = segs[i]
        lb, pb = segs[i + 1]
        if not pa or not pb:
            continue
        d, pr = min_dist(pa, pb)
        structural = la in ("L",) or (la == "Li" and False)
        note = "  [structural: L counter, not a spacing pair]" if la == "L" else ""
        out.append((f"{la}-{lb}", round(d, 1)))
        print(f"    {la:>3s} -> {lb:<3s} min white channel = {d:5.1f}px{note}")
    return out


def dot_survival(name, dot_y=78.0, gap_y=100.0, stem_y=140.0,
                 scale_heights=(16, 24, 32, 48, 64)):
    """Dot must stay dark AND separated from the stem at every size.

    Samples the single rendered row that contains the original-space point:
    dot center (78), mid-gap (100), stem (140) - avoids counting straddling
    edge rows as gap ink.
    """
    results = []
    for H in scale_heights:
        w, h, ch, px = render(os.path.join(SRC, name + ".svg"), height=H)
        cov = coverage(w, h, ch, px)
        s = H / 256.0

        def sample(oy, x0=186, x1=198):
            r = min(h - 1, max(0, int(oy * s)))
            xs = range(max(0, int(x0 * s)), min(w, int(math.ceil(x1 * s))))
            vals = [cov[r * w + x] for x in xs]
            return max(vals) if vals else 0

        dot, gap, stem = sample(dot_y), sample(gap_y), sample(stem_y)
        ok = dot >= 120 and gap <= 110 and stem >= 120
        results.append((H, dot, gap, stem, ok))
        print(f"  {name} @{H:>2}px: dot={dot:3d} gap={gap:3d} stem={stem:3d} "
              f"-> {'OK' if ok else 'WEAK'}")
    return results


def main():
    print("== bbox checks (ink extents in viewBox units) ==")
    ok = True
    w, h, ch, px = render(os.path.join(SRC, "a-r2.svg"))
    ok &= check_bbox("a-r2", w, h, coverage(w, h, ch, px), (48, 52, 663, 204))
    w, h, ch, px = render(os.path.join(SRC, "b-r2.svg"))
    ok &= check_bbox("b-r2", w, h, coverage(w, h, ch, px), (48, 27, 663, 229))
    w, h, ch, px = render(os.path.join(SRC, "a-r0.svg"))
    ok &= check_bbox("a-r0", w, h, coverage(w, h, ch, px), (48, 52, 674, 204))

    print("== engine vs miter (rj=0) ==")
    ok &= engine_vs_miter()
    print("== r1 vs r2 difference localization ==")
    ok &= r1_vs_r2_localized()
    print("== spacing channels (R2) ==")
    channels("a-r2")
    channels("b-r2")
    print("== spacing channels (R0 reference) ==")
    channels("a-r0")
    channels("b-r0", ymax=195)
    print("== dot survival ==")
    dot_survival("a-r2")
    dot_survival("a-r1")
    dot_survival("b-r2", dot_y=53, gap_y=75, stem_y=130)
    dot_survival("b-r1", dot_y=53, gap_y=75, stem_y=130)
    print("ALL:", "PASS" if ok else "SOME FAILURES")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
