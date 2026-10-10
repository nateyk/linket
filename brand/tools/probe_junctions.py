#!/usr/bin/env python3
"""Zoom-probe the junctions the critique flagged: k arm, e bowl/bar + aperture.

Renders a-r1-chamfer at 4x and prints ascii crops of the L-i joint (the
"refined" reference), the k junctions and the e junctions, plus numeric edge
probes (row/column scans) to find notches, slivers or lumps.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SRC = os.path.normpath(os.path.join(HERE, "..", "source"))
import analyze as A  # noqa: E402


def crop(cov, w, x0, y0, x1, y1):
    return [cov[y * w + x] for y in range(y0, y1) for x in range(x0, x1)], x1 - x0, y1 - y0


def probes(name):
    # render at 4x viewBox units (711x256 -> 2844x1024)
    w, h, ch, px = A.render(os.path.join(SRC, name + ".svg"), width=711 * 4, height=256 * 4)
    cov = A.coverage(w, h, ch, px)
    print(f"{name} rendered {w}x{h}")

    regions = {
        # viewBox coords x0,y0,x1,y1 -> *4
        "L-i joint (reference)": (40, 40, 226, 216),
        "k arm + stem": (348, 96, 466, 216),
        "e bowl/bar + aperture": (462, 96, 578, 216),
    }
    for label, (x0, y0, x1, y1) in regions.items():
        c, cw, chh = crop(cov, w, x0 * 4, y0 * 4, x1 * 4, y1 * 4)
        print(f"\n== {label}  viewBox ({x0},{y0})-({x1},{y1}) ==")
        # ascii ~2px per char at 4x => ~0.5 viewBox unit per char
        art = A.ascii_art(cw, chh, _pad(c, cw, chh), cols=min(110, cw // 2),
                          rows=44, thr=110)
        for line in art.splitlines():
            print(line)


def _pad(c, w, h):
    # ascii_art indexes cov[y*w+x]; c is already a flat w*h list
    assert len(c) == w * h
    return c


def edge_scan(name):
    """Numeric: walk the k arm's outline edges and the e aperture edge at 1-unit
    resolution to spot concave notches (edge direction flips)."""
    w, h, ch, px = A.render(os.path.join(SRC, name + ".svg"), width=711 * 4, height=256 * 4)
    cov = A.coverage(w, h, ch, px)

    def ink(x, y):  # viewBox coords -> bool
        return cov[int(y) * w + int(x)] >= 128

    # 1) stem right edge x=388 where arm joins: scan y at x=388 (4x: 1552)
    print("\n== k stem edge scan at x=388 (ink runs, viewBox y) ==")
    X = 388 * 4
    runs = []
    cur = None
    for y in range(40 * 4, 216 * 4):
        if ink(X + 2, y):  # just right of the stem edge
            if cur is None:
                cur = y
        else:
            if cur is not None:
                runs.append((cur / 4, (y - 1) / 4))
                cur = None
    if cur is not None:
        runs.append((cur / 4, 215.75))
    print("  ink runs right of stem edge:", [(round(a, 1), round(b, 1)) for a, b in runs])

    # 2) e aperture: scan columns through the aperture region for edge x positions
    print("== e lower-right region: per-row ink spans (viewBox) ==")
    for vy in range(176, 206, 2):
        y = vy * 4
        spans = []
        s = None
        for x in range(500 * 4, 578 * 4):
            if ink(x, y):
                if s is None:
                    s = x
            else:
                if s is not None:
                    spans.append((round(s / 4, 1), round((x - 1) / 4, 1)))
                    s = None
        if s is not None:
            spans.append((round(s / 4, 1), 577.75))
        print(f"  y={vy:3d}: {spans}")

    # 3) e bowl right edge / bar junction: per-row spans upper right
    print("== e bowl right side + bar (viewBox) ==")
    for vy in range(140, 178, 2):
        y = vy * 4
        spans = []
        s = None
        for x in range(520 * 4, 578 * 4):
            if ink(x, y):
                if s is None:
                    s = x
            else:
                if s is not None:
                    spans.append((round(s / 4, 1), round((x - 1) / 4, 1)))
                    s = None
        if s is not None:
            spans.append((round(s / 4, 1), 577.75))
        print(f"  y={vy:3d}: {spans}")


if __name__ == "__main__":
    nm = sys.argv[1] if len(sys.argv) > 1 else "a-r1-chamfer"
    probes(nm)
    edge_scan(nm)
