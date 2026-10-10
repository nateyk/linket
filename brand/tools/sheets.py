#!/usr/bin/env python3
"""Compose the refinement-round comparison sheets (SVG -> PNG via the shim).

Every sheet is a plain SVG whose units are pixels, rendered 1:1. Logos are
embedded as nested <svg> elements with the INK colour (#111111) replaced as
needed, so light/dark/blue variants come from the same source files.
"""
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "source"))
PNG = os.path.normpath(os.path.join(HERE, "..", "png"))
os.makedirs(PNG, exist_ok=True)

INK = "#111111"
FONT = ("ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "
        "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif")
UI = {
    "bg": "#ffffff", "fg": "#212121", "muted": "#737373", "border": "#e5e5e5",
    "blue": "#0049cc", "blue_fg": "#fcfcfc", "dark": "#0a0a0a",
    "sidebar": "#fafafa", "accent": "#ebebec",
}


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# placement log consumed by verify_sheets.py
LOG = []
SHEET_TAG = {"name": "?"}
SEARCH = [SRC,
          os.path.normpath(os.path.join(HERE, "..", "master")),
          os.path.normpath(os.path.join(HERE, "..", "color")),
          os.path.normpath(os.path.join(HERE, "..", "icon"))]


def sheet(name):
    SHEET_TAG["name"] = name


def load(name):
    txt = None
    for d in SEARCH:
        p = os.path.join(d, name + ".svg")
        if os.path.exists(p):
            txt = open(p).read()
            break
    if txt is None:
        raise FileNotFoundError(f"logo {name!r} not in {SEARCH}")
    vb = re.search(r'viewBox="([^"]+)"', txt).group(1)
    inner = txt[txt.index(">", txt.index("<svg")) + 1:txt.rindex("</svg>")]
    inner = re.sub(r"<title>.*?</title>", "", inner, flags=re.S)
    return vb, inner


_logo_cache = {}

def logo(name, x, y, w=None, h=None, color=None, transform=None, filt=None,
         swatch=None):
    if name not in _logo_cache:
        _logo_cache[name] = load(name)
    vb, inner = _logo_cache[name]
    vw, vh = [float(v) for v in vb.split()[2:4]]
    if h is None:
        h = vh * w / vw
    if w is None:
        w = vw * h / vh
    if color:
        inner = inner.replace(INK, color).replace("#111111", color)
    attrs = f'x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" viewBox="{vb}"'
    if transform:
        attrs += f' transform="{transform}"'
    LOG.append({"sheet": SHEET_TAG["name"], "logo": name, "x": x, "y": y,
                "w": w, "h": h, "color": color or INK, "recolor": color,
                "filt": filt or "", "transform": transform or "",
                "swatch": swatch})
    frag = f"<svg {attrs}>{inner}</svg>"
    if filt:
        # rsvg bug: a filter attribute directly on a nested <svg> renders only
        # the FIRST such element; wrapping in a <g> renders every one.
        return f'<g filter="{filt}">{frag}</g>'
    return frag


def logo_h(name, w):
    vb, _ = load(name)
    vw, vh = [float(v) for v in vb.split()[2:4]]
    return vh * w / vw


def logo_w(name, h):
    vb, _ = load(name)
    vw, vh = [float(v) for v in vb.split()[2:4]]
    return vw * h / vh


def text(x, y, s, size=14, weight=400, fill=None, anchor="start", ls=None):
    fill = fill or UI["fg"]
    extra = f' letter-spacing="{ls}"' if ls else ""
    return (f'<text x="{x:g}" y="{y:g}" font-family="{FONT}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}"{extra}>'
            f"{esc(s)}</text>")


def rect(x, y, w, h, fill="none", stroke=None, rx=None, sw=1):
    s = f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" fill="{fill}"'
    if stroke:
        s += f' stroke="{stroke}" stroke-width="{sw}"'
    if rx:
        s += f' rx="{rx:g}"'
    return s + "/>"


def line(x1, y1, x2, y2, stroke, sw=1, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" '
            f'stroke="{stroke}" stroke-width="{sw}"{d}/>')


def write_sheet(filename, w, h, body, bg=None):
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
             f'viewBox="0 0 {w} {h}">']
    if bg:
        parts.append(rect(0, 0, w, h, fill=bg))
    parts.extend(body)
    parts.append("</svg>")
    svg_path = os.path.join(PNG, filename.replace(".png", ".svg"))
    with open(svg_path, "w") as f:
        f.write("\n".join(parts))
    png_path = os.path.join(PNG, filename)
    r = subprocess.run(["rsvg-convert", "-o", png_path, "-w", str(w),
                        "-h", str(h), svg_path], capture_output=True)
    if r.returncode:
        raise RuntimeError(r.stderr.decode())
    print(f"  wrote {png_path} ({w}x{h})")
    return png_path


# --------------------------------------------------------------- sheet 1+2
def roundness_sheet():
    sheet("roundness-sheet")
    rows = [
        ("A", "Linked Li  (L foot becomes the i, one stroke)",
         ["a-r0", "a-r1-chamfer", "a-r2"]),
        ("B", "Linkline  (L stem becomes the rule)", ["b-r0", "b-r1", "b-r2"]),
    ]
    cols = [
        ("R0 · current", "round caps + joins, r = 0.5×stroke (12)"),
        ("R1 · medium", "butt cuts, 45° chamfer link, corners r = 3.6 "
                        "(0.15×stroke)"),
        ("R2 · sharp", "butt cuts, 45° chamfer link, corners r = 0, square dot"),
    ]
    labelW, cellW, cellH = 150, 440, 214
    pad = 40
    W = pad * 2 + labelW + 3 * cellW
    top = 132
    H = top + 2 * cellH + 92
    b = []
    b.append(text(pad, 48, "Linket wordmark — roundness levels", 24, 600))
    b.append(text(pad, 76, "Stroke 24 on a 256 grid. One roundness system, three "
                           "levels; everything else (proportions, spacing) held constant.",
                  14, 400, UI["muted"]))
    for j, (title, sub) in enumerate(cols):
        x = pad + labelW + j * cellW
        b.append(text(x + 16, top - 44, title, 15, 600))
        b.append(text(x + 16, top - 24, sub, 12, 400, UI["muted"]))
    for i, (letter, desc, files) in enumerate(rows):
        y = top + i * cellH
        b.append(text(pad, y + 44, letter, 40, 600))
        b.append(text(pad, y + 68, desc, 12, 400, UI["muted"]))
        for j, name in enumerate(files):
            x = pad + labelW + j * cellW
            b.append(rect(x + 8, y, cellW - 16, cellH - 24, fill="#ffffff",
                          stroke=UI["border"], rx=6))
            cw = cellW - 16 - 44
            lh = logo_h(name, cw)
            b.append(logo(name, x + 8 + 22, y + (cellH - 24 - lh) / 2, w=cw))
    note = ("Measured min white channels (A): R0 27.3 / 27.0 / 37.1 / 30.0  "
            "->  R1 & R2 27.0 / 27.0 / 26.4 / 26.9  (i-n, n-k, k-e, e-t)")
    b.append(text(pad, H - 44, note, 13, 500))
    b.append(text(pad, H - 24, "R1 vs R2 differ only at the L elbow and the dot "
                               "corners (measured: 15 px at full size) — butt cuts "
                               "carry the sharpness.", 12, 400, UI["muted"]))
    return write_sheet("roundness-sheet.png", W, H, b, bg=UI["bg"])


def spacing_sheet():
    sheet("spacing-before-after")
    # gap centers measured from the actual renders (midpoint of the closest
    # ink pair between adjacent letters, viewBox coords)
    C = {
        "a-r0": [215.5, 352.0, 458.5, 586.0],
        "a-r1": [217.0, 352.0, 452.0, 575.5],
        "a-r2": [217.0, 352.0, 452.0, 575.5],
        "b-r0": [187.0, 302.5, 394.0, 504.0],
        "b-r1": [217.0, 352.0, 452.0, 575.5],
        "b-r2": [217.0, 352.0, 452.0, 575.5],
    }
    V = {  # baseline centreline y in viewBox coords (all viewBoxes are 256 tall)
        "a-r0": 204.0, "a-r1": 204.0, "a-r2": 204.0,
        "b-r0": 175.44, "b-r1": 179.0, "b-r2": 179.0,
    }
    GAPLBL = ["i·n", "n·k", "k·e", "e·t"]
    pairs = [
        ("A", "a-r0", "a-r2", ["27.3", "27.0", "37.1", "30.0"],
         ["27.0", "27.0", "26.4", "26.9"]),
        ("B", "b-r0", "b-r2", ["23.0", "23.0", "32.0", "25.9"],
         ["27.0", "27.0", "26.4", "26.9"]),
    ]
    labW, logoW = 96, 640
    colGap = 56
    pad = 40
    W = pad * 2 + labW + 2 * logoW + colGap
    top = 116
    rowH = 306
    H = top + 2 * rowH + 74
    b = []
    b.append(text(pad, 46, "Spacing: before / after, side by side", 24, 600))
    b.append(text(pad, 74, "Same wordmarks, only letter positions changed. "
                           "Ticks mark the four measured white channels; both "
                           "logos sit on one aligned baseline.", 14, 400,
                  UI["muted"]))
    b.append(text(pad + labW, top - 16, "BEFORE — R0 (current)", 13, 600, UI["muted"]))
    b.append(text(pad + labW + logoW + colGap, top - 16, "AFTER — R2 (re-spaced)",
                  13, 600, UI["muted"]))
    for i, (letter, f0, f2, v0, v2) in enumerate(pairs):
        y = top + i * rowH
        b.append(text(pad, y + 40, letter, 36, 600))
        cols = [(f0, v0, pad + labW), (f2, v2, pad + labW + logoW + colGap)]
        lhs = [logo_h(nm, logoW) for nm, _, _ in cols]
        yb = max(lh * V[nm] / 256.0 for lh, (nm, _, _) in zip(lhs, cols))
        for k, ((name, vals, colx), lh) in enumerate(zip(cols, lhs)):
            vby = y + yb - lh * V[name] / 256.0
            b.append(logo(name, colx, vby, w=logoW))
            vw = float(load(name)[0].split()[2])
            for cx, val in zip(C[name], vals):
                sx = colx + cx / vw * logoW
                b.append(line(sx, vby, sx, y + yb + 14, UI["border"], 1, "3 3"))
                bold = float(val) >= 30
                b.append(text(sx, y + yb + 34, val, 13, 700 if bold else 500,
                              UI["fg"] if bold else UI["muted"], anchor="middle"))
                b.append(text(sx, y + yb + 52, GAPLBL[
                    C[name].index(cx)], 10, 400, UI["muted"], anchor="middle"))
            lbl = ("R0 · current" if k == 0 else "R2 · re-spaced") + "  " + name
            b.append(text(colx, y + yb + 72, lbl, 11, 500, UI["muted"]))
    return write_sheet("spacing-before-after.png", W, H, b, bg=UI["bg"])


# ----------------------------------------------------------------- sheet 3
def coldread_sheet(kind):
    sheet(f"coldread-{kind}")
    files = ["a-r1-chamfer", "a-r2", "b-r1", "b-r2"]
    labels = {"a-r1-chamfer": "A · R1", "a-r2": "A · R2",
              "b-r1": "B · R1", "b-r2": "B · R2"}
    if kind == "light":
        files += ["a-r1-dot32", "b-r1-dot32"]
        labels["a-r1-dot32"] = "A · R1 small cut"
        labels["b-r1-dot32"] = "B · R1 small cut"
    sizes = [16, 24, 32, 48, 64]
    if kind == "light":
        bg, ink, fg, muted = UI["bg"], "#000000", UI["fg"], UI["muted"]
        title = "Cold read — black on white (true pixel heights, 1:1)"
    elif kind == "dark":
        bg, ink, fg, muted = UI["dark"], "#ffffff", "#fafafa", "#8a8a8a"
        title = "Cold read — white on Counter Ink #0a0a0a"
    else:
        bg, ink, fg, muted = UI["blue"], "#ffffff", "#ffffff", "#bcd2f7"
        title = "Cold read — white on brand blue #0049cc"
    labW, cellW, rowH = 96, 214, 104
    pad = 36
    W = pad * 2 + labW + cellW * len(sizes)
    top = 104
    H = top + rowH * len(files) + 56
    sub = "Sizes are logo HEIGHT in px. Judge the first two letters and the dot."
    if kind == "light":
        sub = ("Sizes = logo HEIGHT (px) — judge the first two letters and "
               "the dot. Small cut: tittle 28→32 raised 8 (gap 16→20), "
               "use ≤24px.")
    b = [text(pad, 44, title, 20, 600, fg),
         text(pad, 70, sub, 13, 400, muted)]
    for j, s in enumerate(sizes):
        b.append(text(pad + labW + j * cellW + cellW / 2, top - 12, f"{s} px",
                      12, 600, muted, anchor="middle"))
    for i, name in enumerate(files):
        y = top + i * rowH
        b.append(text(pad, y + rowH / 2 + 4, labels[name], 14, 600, fg))
        for j, s in enumerate(sizes):
            lw = logo_w(name, s)
            cx = pad + labW + j * cellW + (cellW - lw) / 2
            b.append(logo(name, cx, y + (rowH - s) / 2, h=s, color=ink))
    return write_sheet(f"coldread-{kind}.png", W, H, b, bg=bg)


# ----------------------------------------------------------------- sheet 4
def blur_mirror_sheet():
    sheet("coldread-blur-mirror")
    files = ["a-r1-chamfer", "a-r2", "b-r1", "b-r2"]
    labels = {"a-r1-chamfer": "A · R1", "a-r2": "A · R2",
              "b-r1": "B · R1", "b-r2": "B · R2"}
    blur_cols = [(24, 1.2), (24, 2.4), (48, 2.4), (48, 4.0)]
    mir_cols = [24, 48, 64]
    labW, cellW, rowH = 96, 214, 104
    pad = 36
    W = pad * 2 + labW + cellW * max(len(blur_cols), len(mir_cols))
    top1 = 132
    top2 = top1 + rowH * len(files) + 96
    H = top2 + rowH * len(files) + 48
    b = [text(pad, 44, "Cold read, degraded: blur (squint) and mirror", 20, 600),
         text(pad, 70, "Blur sigma in px at the rendered size. Mirror flips the "
                        "word so letter memory cannot help.", 13, 400, UI["muted"])]
    for k, (hgt, sig) in enumerate(blur_cols):
        b.append(f'<defs><filter id="blur{k}" x="-30%" y="-30%" width="160%" '
                 f'height="160%"><feGaussianBlur stdDeviation="{sig}"/>'
                 f'</filter></defs>')
        b.append(text(pad + labW + k * cellW + cellW / 2, top1 - 14,
                      f"h{hgt} · σ{sig}", 12, 600, UI["muted"], anchor="middle"))
    for i, name in enumerate(files):
        y = top1 + i * rowH
        b.append(text(pad, y + rowH / 2 + 4, labels[name], 14, 600))
        for k, (hgt, sig) in enumerate(blur_cols):
            fid = f"blur{k}"
            lw = logo_w(name, hgt)
            cx = pad + labW + k * cellW + (cellW - lw) / 2
            b.append(logo(name, cx, y + (rowH - hgt) / 2, h=hgt,
                          color=INK, filt=f"url(#{fid})"))
    b.append(text(pad, top2 - 44, "Mirror", 16, 600))
    for j, s in enumerate(mir_cols):
        b.append(text(pad + labW + j * cellW + cellW / 2, top2 - 14, f"h{s}",
                      12, 600, UI["muted"], anchor="middle"))
    for i, name in enumerate(files):
        y = top2 + i * rowH
        b.append(text(pad, y + rowH / 2 + 4, labels[name], 14, 600))
        for j, s in enumerate(mir_cols):
            lw = logo_w(name, s)
            cx = pad + labW + j * cellW + (cellW - lw) / 2
            b.append(logo(name, cx, y + (rowH - s) / 2, h=s,
                          transform=f"translate({2 * (cx + lw / 2):g} 0) scale(-1 1)"))
    return write_sheet("coldread-blur-mirror.png", W, H, b, bg=UI["bg"])


# ----------------------------------------------------------------- sheet 5
def variants_sheet():
    sheet("variants-link-cuts")
    cols = [
        ("a-r0", "R0 · arc r48, round caps"),
        ("a-r1", "R1 · arc r30, r3.6 corners"),
        ("a-r1-chamfer", "R1 · 45° chamfer"),
        ("a-r2", "R2 · 45° chamfer (sharp)"),
        ("a-r2-arc", "R2 · arc r30 (sharp)"),
        ("a-r2-cut15", "R2 · 15° angled cuts"),
    ]
    labW, cellW = 36, 236
    pad = 36
    W = pad * 2 + cellW * len(cols)
    top = 120
    H = top + 300 + 150
    b = [text(pad, 44, "Concept A — the L→i link and the terminal cuts", 20, 600),
         text(pad, 70, "Top row at h110, bottom row at h36 (what survives small).",
               13, 400, UI["muted"])]
    for j, (name, lab) in enumerate(cols):
        x = pad + j * cellW
        words = lab.split(" · ")
        b.append(text(x + cellW / 2, top - 34, words[0], 13, 600, UI["fg"],
                      anchor="middle"))
        b.append(text(x + cellW / 2, top - 16, "· ".join(words[1:]), 11, 400,
                      UI["muted"], anchor="middle"))
        lw = logo_w(name, 110)
        b.append(logo(name, x + (cellW - lw) / 2, top, h=110))
        lw2 = logo_w(name, 36)
        b.append(logo(name, x + (cellW - lw2) / 2, top + 170, h=36))
        lw3 = logo_w(name, 16)
        b.append(logo(name, x + (cellW - lw3) / 2, top + 250, h=16))
        b.append(text(x + cellW / 2, top + 292, "h16", 11, 400, UI["muted"],
                      anchor="middle"))
    b.append(text(pad, H - 40, "Pick: chamfer vs arc — see report. cut15 = stems "
                               "topped with a 15° knife cut (baseline stays flat).",
                  13, 500))
    return write_sheet("variants-link-cuts.png", W, H, b, bg=UI["bg"])


# ----------------------------------------------------------------- sheet 7
def context_header():
    sheet("context-header")
    W, pad, barH = 1100, 40, 64
    top, gh = 120, 112
    groups = [
        ("H1 · fixed-name surface — wordmark alone (recommended lockup)",
         "wm_a"),
        ("H2 · dark navbar — color-dark version on #0a0a0a", "wm_dark"),
        ("H3 · configurable surface — logo image + site_name text "
         "(wordmark never replaces the name)", "logo_text"),
    ]
    H = top + gh * len(groups) + 56
    b = [text(pad, 44, "Context test — header", 24, 600),
         text(pad, 74, "Recreated from navbar.tsx: mark h-8 (32px), gap-2 (8px), "
                       "site name 24/600 tracking-tight, Login / Register pills "
                       "h-9 r24 14/500.", 14, 400, UI["muted"])]
    for i, (label, mode) in enumerate(groups):
        gy = top + i * gh
        b.append(text(pad, gy + 12, label, 13, 600, UI["muted"]))
        by = gy + 22
        dark = mode == "wm_dark"
        bar_bg = UI["dark"] if dark else "#ffffff"
        fg = "#fafafa" if dark else UI["fg"]
        b.append(rect(pad, by, W - 2 * pad, barH, fill=bar_bg,
                      stroke=UI["border"]))
        x = pad + 24
        if mode == "wm_a":
            b.append(logo("linket-color-light", x, by + (barH - 34) / 2, h=34))
        elif mode == "wm_dark":
            b.append(logo("linket-color-dark", x, by + (barH - 34) / 2, h=34,
                          swatch=UI["dark"]))
        elif mode == "logo_text":
            # admin logo image slot (neutral placeholder, not a candidate mark)
            b.append(rect(x, by + 16, 32, 32, fill="none", stroke=UI["muted"],
                          rx=8, sw=2))
            b.append(rect(x + 10, by + 26, 12, 12, fill=UI["muted"], rx=2))
            b.append(text(x + 44, by + 40, "Linket", 24, 600, fg, ls="-0.6"))
        # buttons
        reg_x, reg_w, btn_w = W - pad - 24 - 110, 110, 96
        b.append(rect(reg_x, by + 14, reg_w, 36, fill=UI["blue"], rx=18))
        b.append(text(reg_x + reg_w / 2, by + 37, "Register", 14, 500,
                      UI["blue_fg"], anchor="middle"))
        log_x = reg_x - 12 - btn_w
        b.append(rect(log_x, by + 14, btn_w, 36,
                      fill="none" if dark else "#ffffff",
                      stroke="#3f3f46" if dark else UI["border"], rx=18))
        b.append(text(log_x + btn_w / 2, by + 37, "Login", 14, 500, fg,
                      anchor="middle"))
    b.append(text(pad, H - 30, "Type renders in this machine's DejaVu Sans — the "
                               "app uses the system UI stack (documented "
                               "disclosure).", 12, 400, UI["muted"]))
    return write_sheet("context-header.png", W, H, b, bg=UI["bg"])


def _sidebar_icon(kind, x, y, color):
    """16x16 monoline icons, butt caps — same geometry language."""
    p = {
        "home": '<path d="M2.5 7.5 L8 2.5 L13.5 7.5 V13.5 H2.5 Z"/>',
        "store": '<path d="M3 6.5 H13 V13.5 H3 Z"/>'
                 '<path d="M2.5 6.5 L4 3 H12 L13.5 6.5"/>',
        "box": '<path d="M8 2.5 L13.5 5.5 V11 L8 14 L2.5 11 V5.5 Z"/>'
               '<path d="M2.5 5.5 L8 8.5 L13.5 5.5"/><path d="M8 8.5 V14"/>',
        "dollar": '<path d="M8 2.5 V13.5"/>'
                  '<path d="M10.6 5 H6.9 A1.9 1.9 0 0 0 6.9 8.8 H9.1 '
                  'A1.9 1.9 0 0 1 9.1 12.6 H5.4"/>',
        "chart": '<path d="M3 13.5 V9.5"/><path d="M6.3 13.5 V6"/>'
                 '<path d="M9.6 13.5 V8"/><path d="M12.9 13.5 V4"/>',
        "target": '<circle cx="8" cy="8" r="5.5" fill="none"/>'
                  '<circle cx="8" cy="8" r="1.8" fill="COLOR" stroke="none"/>',
    }[kind].replace("COLOR", color)
    return (f'<g transform="translate({x:g} {y:g})" fill="none" stroke="{color}" '
            f'stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="miter">'
            f'{p}</g>')


# ----------------------------------------------------------------- sheet 8
def context_sidebar():
    sheet("context-sidebar")
    W, pad, top = 640, 40, 130
    sbw, sbh = 256, 548
    H = top + sbh + 66
    menu = [("Home", "home", True), ("My Store", "store", False),
            ("My Products", "box", False), ("Sales & Payouts", "dollar", False),
            ("Insights", "chart", False), ("Tracking pixels", "target", False)]
    b = [text(pad, 44, "Context test — sidebar", 24, 600),
         text(pad, 74, "Recreated from the app: 256px, bg #fafafa, items h-9 "
                       "pill (24), 14px, icon 16,", 14, 400, UI["muted"]),
         text(pad, 94, "gap-2; active = accent fill + font-medium.",
              14, 400, UI["muted"])]
    b.append(text(pad, top - 14, "A · wordmark in the logo slot (max-w-40)",
                  13, 600, UI["muted"]))
    x = pad
    b.append(rect(x, top, sbw, sbh, fill=UI["sidebar"]))
    b.append(line(x + sbw, top, x + sbw, top + sbh, UI["border"], 1))
    b.append(logo("linket-color-light", x + 24, top + 26, w=140))
    my = top + 112
    order = menu[:5] + [("__section__", None, None)] + menu[5:]
    for j, (label, icon, active) in enumerate(order):
        if label == "__section__":
            b.append(text(x + 24, my + 16, "Resources", 12, 500,
                          UI["muted"]))
            my += 30
            continue
        if active:
            b.append(rect(x + 12, my, sbw - 24, 36, fill=UI["accent"],
                          rx=18))
        b.append(_sidebar_icon(icon, x + 24, my + 10,
                               UI["fg"] if active else UI["muted"]))
        b.append(text(x + 48, my + 23, label, 14,
                      600 if active else 400, UI["fg"]))
        my += 44
    # annotation column: where the wordmark may and may not stand in
    ax = pad + sbw + 48
    b.append(text(ax, top + 14, "Logo slot rules", 14, 600))
    for k, ln in enumerate([
            "The slot is an image",
            "(branding.logo_light):",
            "the wordmark is the",
            "default asset there.",
            "",
            "The site name beside it",
            "is branding.site_name —",
            "admin-configurable.",
            "The wordmark never",
            "replaces that text.",
            "",
            "Wordmark-only lockup:",
            "carry alt=\"Linket\".",
            "min 24px, clear space",
            "= 1x stroke (24).",
    ]):
        b.append(text(ax, top + 42 + k * 22, ln, 13,
                      600 if k in (0, 10) else 400,
                      UI["fg"] if k in (0, 10) else UI["muted"]))
    b.append(text(pad, H - 28, "Logo slot = max-w-40 (160px wide) per the app's "
                               "`<Logo className=\"max-w-40\">`.", 12, 400,
                  UI["muted"]))
    return write_sheet("context-sidebar.png", W, H, b, bg=UI["bg"])


# ----------------------------------------------------------------- sheet 9
def context_profile():
    sheet("context-profile")
    W, pad, top = 760, 40, 120
    bh = 128
    H = top + bh + 76
    cx = W / 2
    links = [("Developers", 66), ("Privacy Policy", 92),
             ("Terms of Service", 106), ("Contact Us", 66)]
    b = [text(pad, 44, "Context test — public profile footer", 24, 600),
         text(pad, 74, "Recreated from creator-profile-layout.tsx + "
                       "footer.tsx (copyright, menu).", 14, 400, UI["muted"])]
    lab = "P1 · wordmark h16 above the Linket footer (fixed-name surface)"
    by = top
    b.append(text(pad, by + 14, lab, 13, 600, UI["muted"]))
    cy = by + 46
    b.append(logo("linket-color-light", cx - 22.2, cy - 8, h=16))
    b.append(text(cx, by + 78, "Copyright © 2026 Linket, All Rights Reserved",
                  12, 400, UI["muted"], anchor="middle"))
    lx = cx - (sum(w for _, w in links) + 16 * (len(links) - 1)) / 2
    for name, wdt in links:
        b.append(text(lx, by + 102, name, 12, 400, UI["muted"]))
        lx += wdt + 16
    b.append(text(pad, H - 48, "The copyright line stays text: it renders "
                               "branding.site_name (admin-configurable), "
                               "not a fixed name.", 12, 400, UI["muted"]))
    b.append(text(pad, H - 28, "The wordmark above is the fixed brand mark "
                               "and must carry alt=\"Linket\".", 12, 400,
                  UI["muted"]))
    return write_sheet("context-profile.png", W, H, b, bg=UI["bg"])


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which in ("all", "roundness"):
        roundness_sheet()
    if which in ("all", "spacing"):
        spacing_sheet()
    if which in ("all", "coldread"):
        for k in ("light", "dark", "blue"):
            coldread_sheet(k)
    if which in ("all", "blur"):
        blur_mirror_sheet()
    if which in ("all", "variants"):
        variants_sheet()
    if which in ("all", "context"):
        context_header()
        context_sidebar()
        context_profile()
    if which in ("all", "round2"):
        # round2_sheets imports this module back (safe: main runs after the
        # whole module is executed) and appends its placements to the same LOG.
        from round2_sheets import build_all
        build_all()
    import json
    with open(os.path.join(PNG, "_log.json"), "w") as f:
        json.dump(LOG, f, indent=1)


if __name__ == "__main__":
    main()
