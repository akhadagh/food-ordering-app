#!/usr/bin/env python3
"""Generate the Afia Food Hub brand logo system as SVG.

Design: "The Afia Bowl" - a bold geometric A whose crossbar becomes the rim of
a bowl, with a single rising steam stroke. Monoline geometric wordmark.
"""
import os, math

OUT = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "brand", "logo")
ICONS = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "brand", "icons")
os.makedirs(OUT, exist_ok=True)
os.makedirs(ICONS, exist_ok=True)

CLAY = "#C4422B"
CLAY_300 = "#F2A493"
GOLD = "#DE9710"
GOLD_400 = "#F0B824"
INK = "#26221E"
WHITE = "#FFFFFF"

# ---------------------------------------------------------------- emblem ----
# 64x64 space. Bowl rim + bowl body, an A rising from it, a steam stroke.
EMB_BOWL = "M11 41 L53 41"
EMB_BOWL_ARC = "M11 41 A21 16 0 0 0 53 41"
EMB_A = "M18 41 L32 14 L46 41"
EMB_BAR = "M22.7 32 L41.3 32"
EMB_STEAM = "M32 14 C27 10 37 7 32 2"


def emblem(ink, steam, sw=5.0, sw_a=5.4, sw_bar=4.6, sw_steam=3.4):
    """Return the emblem as SVG markup (no viewBox wrapper)."""
    return f"""  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="{EMB_STEAM}" stroke="{steam}" stroke-width="{sw_steam}"/>
    <path d="{EMB_A}" stroke="{ink}" stroke-width="{sw_a}"/>
    <path d="{EMB_BAR}" stroke="{ink}" stroke-width="{sw_bar}"/>
    <path d="{EMB_BOWL}" stroke="{ink}" stroke-width="{sw}"/>
    <path d="{EMB_BOWL_ARC}" stroke="{ink}" stroke-width="{sw}"/>
  </g>"""


def emblem_simplified(ink, sw=3.4):
    """Legend-safe variant: no steam, no tile."""
    return f"""  <g fill="none" stroke="{ink}" stroke-linecap="round" stroke-linejoin="round">
    <path d="{EMB_A}" stroke-width="4.6"/>
    <path d="{EMB_BAR}" stroke-width="3.8"/>
    <path d="{EMB_BOWL}" stroke-width="3.4"/>
    <path d="{EMB_BOWL_ARC}" stroke-width="3.4"/>
  </g>"""


# -------------------------------------------------------------- wordmark ----
# Monoline geometric letterforms. Baseline y=40, cap top y=12, x-height top y=20.
STROKE = 4.2
XL = "round"
CAP = 28


class Pen:
    def __init__(self):
        self.x = 0.0

    def adv(self, n):
        self.x += n


def _circle(cx, cy, r):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}"/>'


def glyph(ch, x):
    """Return (markup, advance) for a character at pen position x."""
    if ch == "A":  # cap A
        w = 25.0
        return (f'<path d="M{x} 40 L{x + w / 2:.1f} 12 L{x + w:.1f} 40"/>'
                f'<path d="M{x + 6.7:.1f} 30 L{x + w - 6.7:.1f} 30"/>'), w
    if ch == "F":  # cap F
        w = 19.0
        return (f'<path d="M{x + 2} 12 L{x + 2} 40"/>'
                f'<path d="M{x + 2} 12 L{x + w:.1f} 12"/>'
                f'<path d="M{x + 2} 25 L{x + 15} 25"/>'), w
    if ch == "H":  # cap H
        w = 23.0
        return (f'<path d="M{x + 2} 12 L{x + 2} 40"/>'
                f'<path d="M{x + w - 2:.1f} 12 L{x + w - 2:.1f} 40"/>'
                f'<path d="M{x + 2} 26 L{x + w - 2:.1f} 26"/>'), w
    if ch == "a":  # single-storey a
        w = 22.0
        return (_circle(x + 10.5, 30, 9.5) + f'<path d="M{x + 20} 20 L{x + 20} 40"/>'), w
    if ch == "b":
        w = 23.0
        return (f'<path d="M{x + 2} 12 L{x + 2} 40"/>' + _circle(x + 12.5, 30, 9.5)), w
    if ch == "d":
        w = 22.0
        return (_circle(x + 10.5, 30, 9.5) + f'<path d="M{x + 20} 12 L{x + 20} 40"/>'), w
    if ch == "f":
        w = 14.0
        return (f'<path d="M{x + 6} 40 L{x + 6} 18 A6 6 0 0 1 {x + 12} 12"/>'
                f'<path d="M{x} 22 L{x + 13} 22"/>'), w
    if ch == "i":
        w = 8.0
        return (f'<path d="M{x + 4} 20 L{x + 4} 40"/>'
                f'<circle cx="{x + 4}" cy="11" r="2.4" fill="currentColor" stroke="none"/>'), w
    if ch == "o":
        w = 22.0
        return (_circle(x + 11, 30, 9.5)), w
    if ch == "u":
        w = 22.0
        return (f'<path d="M{x + 2} 20 L{x + 2} 31 A9.5 9 0 0 0 {x + 21} 31 L{x + 21} 20"/>'), w
    if ch == " ":
        return "", 11.0
    raise ValueError(f"unsupported glyph {ch!r}")


def wordmark(text, x, y_offset=0.0, colour="currentColor", extra=""):
    """Return (markup, total_width) for a run of text starting at x."""
    parts = [f'<g transform="translate(0 {y_offset})" fill="none" stroke="{colour}" '
             f'stroke-width="{STROKE}" stroke-linecap="{XL}" stroke-linejoin="{XL}">{extra}']
    pen = x
    for ch in text:
        if ch == " ":
            pen += 11.0
            continue
        markup, adv = glyph(ch, pen)
        parts.append(markup)
        pen += adv
    parts.append("</g>")
    return "\n    ".join(parts), pen - x


def wordmark_two_colour(x, first, second):
    """'Afia' in the brand colour, 'Food Hub' in the ink colour."""
    m1, w1 = wordmark(first, x, colour=CLAY)
    m2, w2 = wordmark(second, x + w1 + 13, colour=INK)
    return m1 + "\n    " + m2, w1 + 13 + w2


def svg(width, height, body, title, desc, bg=None):
    bgrect = f'\n  <rect width="{width}" height="{height}" fill="{bg}"/>' if bg else ""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img" aria-label="{title}">
  <title>{title}</title>
  <desc>{desc}</desc>{bgrect}
{body}
</svg>
"""


def write(path, content):
    with open(path, "w") as fh:
        fh.write(content)
    print(f"  {os.path.relpath(path, os.path.join(os.path.dirname(__file__), '..'))}")


# ------------------------------------------------------ horizontal lockup ---
# Part metrics (in their own drawing space):
#   emblem  : y 2..57  (height 55)
#   wordmark: y 11..40 (height 29), baseline 40
EMB_SCALE = 0.72
WM_SCALE = 0.94
EMB_H = 55 * EMB_SCALE
WM_H = 29 * WM_SCALE
LOCKUP_H = 64
# centre each part on the canvas centre-line
EMB_TY = (LOCKUP_H - EMB_H) / 2 - 2 * EMB_SCALE
WM_TY = (LOCKUP_H - WM_H) / 2 - 11 * WM_SCALE


def build_horizontal(colour_ink, colour_afia, colour_food, steam, mono=False):
    em = emblem(colour_ink, steam)
    if mono:
        wm, wwidth = wordmark("Afia Food Hub", 0, colour=colour_ink)
    else:
        m1, w1 = wordmark("Afia", 0, colour=colour_afia)
        m2, w2 = wordmark("Food Hub", w1 + 13, colour=colour_food)
        wm = m1 + "\n    " + m2
        wwidth = w1 + 13 + w2
    emblem_w = 64 * EMB_SCALE
    gap = 20
    x0 = 4
    tx = x0 + emblem_w + gap
    width = int(tx + wwidth * WM_SCALE + 6)
    body = f"""  <g transform="translate({x0} {EMB_TY:.2f}) scale({EMB_SCALE})">
{em}
  </g>
  <g transform="translate({tx} {WM_TY:.2f}) scale({WM_SCALE})">
    {wm}
  </g>"""
    return svg(width, LOCKUP_H, body, "Afia Food Hub", "Afia Food Hub logo")


# --------------------------------------------------------------- stacked ----
def build_stacked(colour_ink, colour_afia, colour_food, steam, mono=False):
    """Symbol above a two-line wordmark: 'Afia' then 'Food Hub'."""
    em = emblem(colour_ink, steam)
    if mono:
        line1, w1 = wordmark("Afia", 0, colour=colour_ink)
        line2, w2 = wordmark("Food Hub", 0, colour=colour_ink)
    else:
        line1, w1 = wordmark("Afia", 0, colour=colour_afia)
        line2, w2 = wordmark("Food Hub", 0, colour=colour_food)
    text_w = max(w1, w2) * WM_SCALE
    emblem_w = 64 * EMB_SCALE
    canvas_w = int(max(text_w, emblem_w) + 24)
    cx = canvas_w / 2

    top = 6
    gap = 12
    line_gap = 10
    emb_y = top - 2 * EMB_SCALE
    # a wordmark line drawn at translate y occupies y+11*s .. y+40*s
    l1_y = top + EMB_H + gap - 11 * WM_SCALE
    l2_y = l1_y + 40 * WM_SCALE + line_gap - 11 * WM_SCALE
    canvas_h = int(l2_y + 40 * WM_SCALE + 10)

    body = f"""  <g transform="translate({cx - emblem_w / 2:.2f} {emb_y:.2f}) scale({EMB_SCALE})">
{em}
  </g>
  <g transform="translate({cx - w1 * WM_SCALE / 2:.2f} {l1_y:.2f}) scale({WM_SCALE})">
    {line1}
  </g>
  <g transform="translate({cx - w2 * WM_SCALE / 2:.2f} {l2_y:.2f}) scale({WM_SCALE})">
    {line2}
  </g>"""
    return svg(canvas_w, canvas_h, body, "Afia Food Hub", "Afia Food Hub stacked logo")



# ----------------------------------------------------------------- icon ----
def build_icon(tile, ink, steam, mono=False):
    if mono:
        body = emblem_simplified(ink, sw=4.6)
        return svg(64, 64, body, "Afia Food Hub", "Afia Food Hub emblem")
    body = f"""  <rect width="64" height="64" rx="14" fill="{tile}"/>
  <g transform="translate(0 2)">
{emblem(ink, steam)}
  </g>"""
    return svg(64, 64, body, "Afia Food Hub", "Afia Food Hub app icon")


# ---------------------------------------------------------------- write ----
print("Generating brand assets...")

# 1. Primary horizontal - light background
write(os.path.join(OUT, "afia-logo-horizontal.svg"),
      build_horizontal(CLAY, CLAY, INK, GOLD))

# 2. Primary horizontal - dark background
write(os.path.join(OUT, "afia-logo-horizontal-dark.svg"),
      build_horizontal(WHITE, CLAY_300, WHITE, GOLD_400))

# 3. Primary horizontal - monochrome
write(os.path.join(OUT, "afia-logo-horizontal-mono.svg"),
      build_horizontal(INK, INK, INK, INK, mono=True))

# 4. Secondary stacked - light
write(os.path.join(OUT, "afia-logo-stacked.svg"),
      build_stacked(CLAY, CLAY, INK, GOLD))

# 5. Secondary stacked - dark
write(os.path.join(OUT, "afia-logo-stacked-dark.svg"),
      build_stacked(WHITE, CLAY_300, WHITE, GOLD_400))

# 6. Secondary stacked - monochrome
write(os.path.join(OUT, "afia-logo-stacked-mono.svg"),
      build_stacked(INK, INK, INK, INK, mono=True))

# 7-9. Icon only
write(os.path.join(OUT, "afia-icon.svg"),
      build_icon(CLAY, WHITE, GOLD))
write(os.path.join(OUT, "afia-icon-dark.svg"),
      build_icon(INK, WHITE, GOLD_400))
write(os.path.join(OUT, "afia-icon-mono.svg"),
      build_icon(None, INK, INK, mono=True))

# 10. Wordmark only
m, w = wordmark("Afia", 0, colour=CLAY)
m2, w2 = wordmark("Food Hub", w + 13, colour=INK)
write(os.path.join(OUT, "afia-wordmark.svg"),
      svg(int(w + 13 + w2 + 4), 56, f'  <g transform="translate(2 12)">\n    {m}\n    {m2}\n  </g>',
          "Afia Food Hub", "Afia Food Hub wordmark"))

# Favicon SVG - simplified silhouette, guaranteed legible at 16px
fav_body = f"""  <rect width="32" height="32" rx="7" fill="{CLAY}"/>
  <g transform="translate(0 0.5) scale(0.5)" fill="none" stroke="{WHITE}"
     stroke-linecap="round" stroke-linejoin="round">
    <path d="{EMB_A}" stroke-width="9"/>
    <path d="{EMB_BAR}" stroke-width="7.6"/>
    <path d="{EMB_BOWL}" stroke-width="8"/>
    <path d="{EMB_BOWL_ARC}" stroke-width="8"/>
  </g>"""
write(os.path.join(ICONS, "favicon.svg"),
      svg(32, 32, fav_body, "Afia Food Hub", "Afia Food Hub"))

# Apple touch icon - iOS applies its own mask, so the background must be
# a full-bleed square with no transparency and no rounded corners.
apple_body = f"""  <rect width="180" height="180" fill="{CLAY}"/>
  <g transform="translate(40 40) scale(1.5625)">
{emblem(WHITE, GOLD)}
  </g>"""
write(os.path.join(ICONS, "apple-touch-icon.svg"),
      svg(180, 180, apple_body, "Afia Food Hub", "Afia Food Hub"))

# PWA standard icon - full bleed
pwa_body = f"""  <rect width="512" height="512" fill="{CLAY}"/>
  <g transform="translate(112 112) scale(4.5)">
{emblem(WHITE, GOLD)}
  </g>"""
write(os.path.join(ICONS, "icon-app.svg"),
      svg(512, 512, pwa_body, "Afia Food Hub", "Afia Food Hub"))

# Maskable icon - the emblem sits inside the 80% safe zone so platform
# masks never crop it.
mask_body = f"""  <rect width="512" height="512" fill="{CLAY}"/>
  <g transform="translate(153 153) scale(3.2)">
{emblem(WHITE, GOLD)}
  </g>"""
write(os.path.join(ICONS, "icon-maskable.svg"),
      svg(512, 512, mask_body, "Afia Food Hub", "Afia Food Hub"))

print("done")
