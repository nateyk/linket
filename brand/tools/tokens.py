"""Exact design tokens extracted from the Linket repo (DESIGN.md + config/themes.php).

oklch -> sRGB conversion done here so the mockups use the app's real values.
"""
import math

# --- from config/themes.php 'light' / DESIGN.md colors ----------------------
PRIMARY = "#0049cc"          # oklch(46% 0.214 259.815) == logo blue, verified
PRIMARY_FG = "#fcfcfc"       # oklch(0.9911 0 190.05)

_S = [
    ("background", "oklch(1 0 0)"),
    ("foreground", "oklch(0.2478 0 0)"),
    ("muted", "oklch(0.97 0 0)"),
    ("muted_fg", "oklch(0.556 0 0)"),
    ("border", "oklch(0.922 0 0)"),
    ("secondary", "oklch(0.967 0.001 286.375)"),
    ("sidebar", "oklch(0.985 0 0)"),
    ("sidebar_fg", "oklch(0.145 0 0)"),
    ("sidebar_accent", "oklch(0.94 0.001 286.37)"),
    ("dark_background", "oklch(0.145 0 0)"),
]


def oklch_to_hex(L, C, H):
    h = math.radians(H)
    a, b = C * math.cos(h), C * math.sin(h)
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

    def f(c):
        c = max(0.0, min(1.0, c))
        return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055

    return "#%02x%02x%02x" % (round(f(r) * 255), round(f(g) * 255), round(f(bb) * 255))


def _parse(v):
    inner = v[len("oklch("):-1]
    parts = [p.rstrip("%") for p in inner.replace("/", " ").split()]
    L = float(parts[0])
    if "%" in inner.split()[0]:
        L /= 100.0
    return L, float(parts[1]), float(parts[2])


for _name, _val in _S:
    globals()[_name.upper()] = oklch_to_hex(*_parse(_val))

# Typography (DESIGN.md): system UI stack, page title 600/24px/tracking-tight
UI_FONT = ("ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "
           "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif")

# DESIGN.md type roles
PAGE_TITLE = dict(size=24, weight=600, tracking="-0.025em")   # text-2xl font-semibold tracking-tight
LABEL = dict(size=14, weight=400)
LABEL_STRONG = dict(size=14, weight=500)
CAPTION = dict(size=12, weight=500)

if __name__ == "__main__":
    for k in [n.upper() for n, _ in _S] + ["PRIMARY", "PRIMARY_FG"]:
        print(k, globals()[k])
