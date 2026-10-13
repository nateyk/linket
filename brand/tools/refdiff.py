#!/usr/bin/env python3
"""Snapshot renders of all source variants (2x) before the round-2 edit, and
diff a regenerated variant against its snapshot (locality + magnitude)."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SRC = os.path.normpath(os.path.join(HERE, "..", "source"))
REF = os.path.join(HERE, "_ref1")
import analyze as A  # noqa: E402

NAMES = ["a-r0", "a-r1", "a-r1-chamfer", "a-r1-dot32", "a-r2", "a-r2-arc",
         "a-r2-cut15", "b-r0", "b-r1", "b-r1-dot32", "b-r2"]


def snap():
    os.makedirs(REF, exist_ok=True)
    for n in NAMES:
        w, h, ch, px = A.render(os.path.join(SRC, n + ".svg"), width=711 * 2, height=256 * 2)
        cov = A.coverage(w, h, ch, px)
        # store as raw 8bit grayscale rows (simple, exact)
        import struct
        with open(os.path.join(REF, n + ".cov"), "wb") as f:
            f.write(struct.pack(">II", w, h))
            f.write(bytes(cov))
        print(f"ref {n}: {w}x{h}")


def diff(name):
    import struct
    w, h, ch, px = A.render(os.path.join(SRC, name + ".svg"), width=711 * 2, height=256 * 2)
    cov = A.coverage(w, h, ch, px)
    with open(os.path.join(REF, name + ".cov"), "rb") as f:
        rw, rh = struct.unpack(">II", f.read(8))
        ref = f.read()
    assert (rw, rh) == (w, h), f"size drift {(rw, rh)} vs {(w, h)}"
    diffs = [(i % w, i // w) for i in range(len(cov)) if abs(cov[i] - ref[i]) > 90]
    ink = sum(1 for v in ref if v > 110)
    if not diffs:
        print(f"  {name:14s} IDENTICAL (0 differing px of {ink} ink)")
        return
    xs = [p[0] for p in diffs]
    ys = [p[1] for p in diffs]
    # regions in viewBox units (2x scale)
    regions = {
        "e-aperture": (500, 1050, 340, 430),      # x*2 500..1050, y*2 340..430
        "e-bar-joint": (1080, 1150, 300, 360),
    }
    zones = []
    for x, y in diffs:
        where = "OTHER"
        for zn, (x0, x1, y0, y1) in regions.items():
            if x0 <= x <= x1 and y0 <= y <= y1:
                where = zn
                break
        zones.append(where)
    from collections import Counter
    c = Counter(zones)
    pct = 100.0 * len(diffs) / max(1, ink)
    print(f"  {name:14s} {len(diffs):5d} differing px ({pct:.3f}% of ink) "
          f"bbox=({min(xs)},{min(ys)})-({max(xs)},{max(ys)}) zones={dict(c)}")


if __name__ == "__main__":
    if sys.argv[1:2] == ["snap"]:
        snap()
    else:
        for n in (sys.argv[1:] or NAMES):
            diff(n)
