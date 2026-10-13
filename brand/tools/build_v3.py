#!/usr/bin/env python3
"""Round 3 concepts: heavy wordmark + round tittle, two edge treatments.

Accepted direction: concept A (chamfer link), heavy like the reference,
round tittle, tight spacing. User feedback: k / e / t cuts not good,
corners should be rounds not sharp edges, L-in flow.

Per feedback:
  rj       4.8 -> 10           (0.31 * stroke: visible rounds everywhere)
  ROUND_CONCAVE on             (inner corners filleted, not sharp - engine
                                flag added to build_wordmarks._junction)
  e cut    45 deg -> vertical  (no more wedge-shaped aperture)
  k        cuts stay perpendicular to the stroke but land exactly on
           x-height / baseline (no diagonal chops in the air)
Both edge treatments are built so the user can pick:
  flat     butt cuts (reference-like, horizontal/vertical/perpendicular)
  round    semicircular caps at every terminal (engine caps="round",
           endpoints pulled back by the half-width)
Shared heavy system: stroke 32, e-bowl/bar 26, t-crossbar 27, tittle
38 circle @ y54, channels ~18, cuts horizontal/vertical/45.

Writes brand/source/round3-{chamfer,arc,plain}[-round].svg (solid black)
and probes every rendered file's bbox + pixels.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_wordmarks as B  # noqa: E402
import analyze as A          # noqa: E402

B.ROUND_CONCAVE = True

BRAND = os.path.normpath(os.path.join(HERE, ".."))
SOURCE = os.path.join(BRAND, "source")

STROKE = 32.0
HW = STROKE / 2.0
RJ = 10.0                   # 0.31 * stroke - the requested visible rounds
E_HW = 26.0 / 2.0           # e-bowl + e-bar: optical thinning
T_HW = 27.0 / 2.0           # t-crossbar thinned
BASE = 204.0
FOOT_Y = BASE - HW          # 188 - horizontals whose bottom edge hits baseline
X_TOP = 108.0               # x-height line
DOT_W = 38.0
DOT_Y = 54.0                # circle top; gap to X_TOP = 16
INK = "#000000"

# letters (centreline coordinates, stroke 32)
I_X, K_X, T_X = 192.0, 376.0, 621.0
N_L, N_R, N_ARCH_Y = 242.0, 326.0, 162.0
K_ELBOW = (388.0, 166.0)
T_STEM_TOP = 76.0
E_CX, E_R = 513.0, 37.0
E_CY = BASE - E_R - E_HW     # 154
_EA = math.atan2(32.6, 15.2)  # aperture at 65.04 deg below horizontal
E_P1 = (E_CX + E_R, E_CY)
E_P2 = (E_CX - E_R, E_CY)
E_BAR_Y = E_CY
T_BAR_L, T_BAR_R = 583.0, 663.0
T_BAR_Y = X_TOP + T_HW       # 121.5, top edge on the x-height line

# L
L_X, L_TOP = 60.0, 52.0
# Foot reaches the i column (176 = I_X-HW) so the chamfer closes the
# baseline nick between L-foot and i-stem - the "L-in flow" fix.
CHAMFER_X = 174.0
CHAMFER_Y = FOOT_Y - (I_X - CHAMFER_X)        # (174,188) -> (192,170), 45 deg
ARC_FOOT_X, ARC_LINK_R = 162.0, 30.0
PLAIN_FOOT_END = 160.0                          # flat ink end; round = -HW

W_CANVAS = int(T_BAR_R + 48)   # 711
H_CANVAS = 256

B.STROKE = STROKE
B.HW = HW


def k_arm_top(round_):
    if round_:
        # cap centre: cap top lands on X_TOP
        y = X_TOP + HW
        return (K_ELBOW[0] + K_ELBOW[1] - y, y)
    # butt cut perpendicular to the arm: top corner lands on X_TOP
    kc = HW * 0.70710678
    y = X_TOP + kc
    return (K_ELBOW[0] + K_ELBOW[1] - X_TOP - kc, y)


def k_leg_end(round_):
    if round_:
        # cap centre: cap bottom lands on BASE
        y = BASE - HW
        return (K_ELBOW[0] + y - K_ELBOW[1], y)
    kc = HW * 0.70710678
    y = BASE - kc
    return (K_ELBOW[0] + y - K_ELBOW[1], y)


def e_a_p0(round_):
    a = _EA - (E_HW / E_R if round_ else 0.0)
    return (E_CX + E_R * math.cos(a), E_CY + E_R * math.sin(a))


def l_prims(link, round_):
    stem_top = L_TOP + (HW if round_ else 0.0)
    i_top = X_TOP + (HW if round_ else 0.0)
    stem = B.Line((L_X, stem_top), (L_X, FOOT_Y))
    if link == "chamfer":
        return [stem,
                B.Line((L_X, FOOT_Y), (CHAMFER_X, FOOT_Y)),
                B.Line((CHAMFER_X, FOOT_Y), (I_X, CHAMFER_Y)),
                B.Line((I_X, CHAMFER_Y), (I_X, i_top))]
    if link == "arc":
        return [stem,
                B.Line((L_X, FOOT_Y), (ARC_FOOT_X, FOOT_Y)),
                B.Arc((ARC_FOOT_X, FOOT_Y), (I_X, FOOT_Y - ARC_LINK_R),
                      ARC_LINK_R, 0, 0),
                B.Line((I_X, FOOT_Y - ARC_LINK_R), (I_X, i_top))]
    end = PLAIN_FOOT_END - (HW if round_ else 0.0)
    return [stem, B.Line((L_X, FOOT_Y), (end, FOOT_Y))]


def stroke_prims(round_):
    """(prims, start_phi, angled_arc, outline_half_width, caps)"""
    pull_in = HW if round_ else 0.0
    cap = "round" if round_ else "butt"
    y0, y1 = X_TOP + pull_in, BASE - pull_in
    items = [
        ([B.Line((I_X, y0), (I_X, y1))], None, False, HW, cap),    # i stem
        ([B.Line((K_X, L_TOP + pull_in), (K_X, y1))], None, False, HW, cap),
        ([B.Line((T_X, T_STEM_TOP + pull_in), (T_X, y1))], None, False,
         HW, cap),                                                  # t stem
        ([B.Line((N_L, y1), (N_L, N_ARCH_Y)),                      # n
          B.Arc((N_L, N_ARCH_Y), (N_R, N_ARCH_Y), 42.0, 0, 1),
          B.Line((N_R, N_ARCH_Y), (N_R, y1))], None, False, HW, cap),
        ([B.Line(k_arm_top(round_), K_ELBOW),                      # k arm+leg
          B.Line(K_ELBOW, k_leg_end(round_))], None, False, HW, cap),
        ([B.Arc(e_a_p0(round_), E_P1, E_R, 1, 1),                  # e
          B.Line(E_P1, (E_P2[0], E_BAR_Y))],
         None if round_ else 90.0, True, E_HW, cap),
        ([B.Line((T_BAR_L + pull_in, T_BAR_Y),
                 (T_BAR_R - pull_in, T_BAR_Y))], None, False, T_HW, cap),
    ]
    return items


def build_svg(link, round_, title, ink=INK, dot_ink=None, ids=True,
              dot_w=DOT_W, dot_dy=0.0):
    """Outlined wordmark on the round-3 geometry (single source of truth).

    ids=True splits g#letters / path#dot so production can colour the tittle
    separately; dot_w/dot_dy select the full joint or the <=24 px small cut.
    """
    ds = [B.outline(l_prims(link, round_), rj=RJ,
                    caps="round" if round_ else "butt")]
    for prims, phi, angled, d, cap in stroke_prims(round_):
        B.HW = d
        ds.append(B.outline(prims, rj=RJ, start_phi=phi, angled_arc=angled,
                            caps=cap))
    B.HW = HW
    dot_d = B.rrect(I_X - dot_w / 2, DOT_Y + dot_dy, dot_w, dot_w, dot_w / 2)
    if ids:
        body = ['  <title>{}</title>'.format(title),
                '  <g id="letters" fill="{}">'.format(ink)]
        body += ['    <path d="{}"/>'.format(d) for d in ds]
        body += ['  </g>',
                 '  <path id="dot" fill="{}" d="{}"/>'.format(dot_ink or ink,
                                                              dot_d)]
    else:
        body = ['  <title>{}</title>'.format(title)]
        body += ['  <path fill="{}" d="{}"/>'.format(ink, d) for d in ds]
        body += ['  <path fill="{}" d="{}"/>'.format(dot_ink or ink, dot_d)]
    return ('<svg xmlns="http://www.w3.org/2000/svg" role="img" '
            f'aria-label="Linket" viewBox="0 0 {W_CANVAS} {H_CANVAS}" '
            f'width="{W_CANVAS}" height="{H_CANVAS}">\n'
            + "\n".join(body) + "\n</svg>\n")


CONCEPTS = ("chamfer", "arc", "plain")


def main():
    os.makedirs(SOURCE, exist_ok=True)
    expected = (L_X - HW, L_TOP, T_BAR_R, BASE)
    for link in CONCEPTS:
        for round_ in (False, True):
            name = f"round3-{link}{'-round' if round_ else ''}.svg"
            path = os.path.join(SOURCE, name)
            suffix = " (round caps)" if round_ else " (flat cuts)"
            with open(path, "w") as f:
                f.write(build_svg(link, round_, f"Linket round3 {link}{suffix}"))
            w, h, ch, px = A.render(path)
            cov = A.coverage(w, h, ch, px)
            pts = A.ink_points(w, h, cov, thr=110)
            x0, y0, x1, y1 = A.bbox(pts)
            # round-cap tips are tangent points: AA makes them read 2-3px
            # light at thr=110 while the geometry is exact (centreline+HW)
            tol = 4 if round_ else 1
            ok = all(abs(a - b) <= tol for a, b in zip((x0, y0, x1, y1), expected))
            i = ((73 * w + 192) * ch)
            dot = px[i:i + 3]
            print(f"{name:34s} bbox=({x0},{y0},{x1},{y1}) "
                  f"{'OK' if ok else 'BBOX-CHECK (want %s)' % (expected,)} "
                  f"dot#{dot[0]:02x}{dot[1]:02x}{dot[2]:02x}")
            if not ok:
                raise SystemExit(f"bbox drifted in {path}")
    print(f"stroke={STROKE} rj={RJ} concave_fillet=on e_hw={E_HW * 2} "
          f"t_hw={T_HW * 2} dot={DOT_W}@y{DOT_Y}")


if __name__ == "__main__":
    main()
