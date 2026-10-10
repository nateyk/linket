#!/usr/bin/env python3
"""Linket symbol candidates — derived from the wordmark system.

All three candidates are literal derivations of the wordmark geometry, drawn
pre-scale at wordmark metrics (stroke 24, r = 0.15xstroke = 3.6, butt cuts,
square dot 28) and wrapped in transform="scale(2)" so every ratio is the
wordmark's ratio at stroke 48 on a 512 canvas:

  s1  "Linked Li"   concept A's fused L-i ligature + tittle, as a mark
  s2  "Linkline"    concept B: L and i standing on a cropped rule
  s3  "The Heel"    concept A's signature joint: chamfered L heel + the dot
                    floating where the i would rise

Each exists at r1 (r = 7.2 = 0.15x48) and r2 (r = 0) so the roundness choice
applies to the symbol too.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_wordmarks import (B_SHIFT, INK, STROKE, Line, _fmt, letters,
                             l_prims, outline, rrect)

SIZE = 512


def _sym_svg(title, g_transform, paths, fills, strokes):
    body = [f"  <title>{title}</title>"]
    inner = []
    for d in fills:
        inner.append(f'    <path fill="{INK}" d="{d}"/>')
    for d in strokes:
        inner.append(f'    <path fill="none" stroke="{INK}" stroke-width='
                     f'"{_fmt(STROKE)}" stroke-linecap="butt" '
                     f'stroke-linejoin="miter" d="{d}"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" role="img" '
            f'aria-label="Linket" viewBox="0 0 {SIZE} {SIZE}" '
            f'width="{SIZE}" height="{SIZE}">\n'
            + "\n".join(body) + "\n"
            + f'  <g transform="{g_transform}">\n'
            + "\n".join(paths + inner) + "\n"
            + "  </g>\n</svg>\n")


def s1(rj, dot_r, name):
    """Fused L-i ligature (concept A) scaled 2x."""
    L = outline(l_prims("a", "chamfer"), rj=rj)
    fills, strokes = letters(dot_r=dot_r)
    i_stem, dot = strokes[0], fills[0]
    return _sym_svg(f"Linket symbol ({name})", "translate(2 0) scale(2)",
                    [f'    <path fill="{INK}" d="{L}"/>'], [dot], [i_stem])


def s2(rj, dot_r, name):
    """L and i standing on a cropped rule (concept B) scaled 2x."""
    prims = [Line((60.0, 52.0 + B_SHIFT), (60.0, 217.0)),
             Line((60.0, 217.0), (228.0, 217.0))]
    L = outline(prims, rj=rj)
    fills, strokes = letters(s=B_SHIFT, dot_r=dot_r)
    i_stem, dot = strokes[0], fills[0]
    return _sym_svg(f"Linket symbol ({name})", "translate(-20 0) scale(2)",
                    [f'    <path fill="{INK}" d="{L}"/>'], [dot], [i_stem])


def s3(rj, dot_r, name):
    """Chamfered L heel + floating tittle (concept A's joint) scaled 2x."""
    prims = [Line((60.0, 52.0), (60.0, 192.0)),
             Line((60.0, 192.0), (164.0, 192.0)),
             Line((164.0, 192.0), (192.0, 164.0))]
    L = outline(prims, rj=rj)
    dot = rrect(178.0, 64.0, 28.0, 28.0, dot_r)
    return _sym_svg(f"Linket symbol ({name})", "translate(2 0) scale(2)",
                    [f'    <path fill="{INK}" d="{L}"/>'], [dot], [])


BUILDERS = {"s1": s1, "s2": s2, "s3": s3}
LEVELS = {"r1": (3.6, 3.6), "r2": (0.0, 0.0)}


def main():
    out = os.path.join(HERE, "..", "source")
    os.makedirs(out, exist_ok=True)
    for cand in ("s1", "s2", "s3"):
        for lvl, (rj, dot_r) in LEVELS.items():
            name = f"{cand}-{lvl}"
            svg = BUILDERS[cand](rj, dot_r, name)
            with open(os.path.join(out, name + ".svg"), "w") as f:
                f.write(svg)
            print(f"{name:10s} {SIZE}x{SIZE}  {len(svg):5d} bytes")


if __name__ == "__main__":
    main()
