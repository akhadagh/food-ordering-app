#!/usr/bin/env python3
"""Compose the Afia Food Hub social / share graphics.

Social cover (Open Graph / Twitter / LinkedIn) and avatar are rendered from an
HTML template with headless Chrome so the brand logo and typography are
pixel-accurate.
"""
import os, subprocess, sys, textwrap

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BRAND = os.path.join(ROOT, "frontend", "public", "brand")
WORK = os.path.join(os.path.expanduser("~"), "brand-social")
BROWSER = os.environ.get("BROWSER", "/snap/bin/brave")

COVER_W, COVER_H = 1200, 630

TAGLINE = "Real Ghanaian food, cooked to order and delivered hot."


def logo_svg():
    with open(os.path.join(BRAND, "logo", "afia-logo-horizontal-dark.svg")) as fh:
        svg = fh.read()
    return svg.split("?>", 1)[1]


def emblem_svg():
    with open(os.path.join(BRAND, "logo", "afia-icon.svg")) as fh:
        svg = fh.read()
    return svg.split("?>", 1)[1]


COVER_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Inter:wght@400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:__W__px;height:__H__px;overflow:hidden;}
  .wrap{position:relative;width:__W__px;height:__H__px;display:flex;
         background:#26221E;font-family:Inter,system-ui,sans-serif;}}
  .copy{width:54%;padding:64px 56px;display:flex;flex-direction:column;justify-content:center;}
  .logo svg{height:58px;width:auto;display:block;}
  .eyebrow{margin-top:38px;font-size:14px;letter-spacing:.16em;text-transform:uppercase;
            color:#DE9710;font-weight:600;}
  h1{margin-top:14px;font-family:Fraunces,Georgia,serif;font-weight:900;font-size:52px;
     line-height:1.08;color:#fff;letter-spacing:-.01em;}
  p{margin-top:20px;font-size:20px;line-height:1.5;color:#D5CEC3;max-width:420px;}
  .rule{margin-top:32px;width:96px;height:4px;background:#C4422B;border-radius:99px;}
  .photo{width:46%;position:relative;overflow:hidden;}
  .photo img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;}
  .scrim{position:absolute;inset:0;
          background:linear-gradient(90deg,#26221E 0%,rgba(38,34,30,.45) 26%,rgba(38,34,30,0) 60%);}
</style></head>
<body>
  <div class="wrap">
    <div class="copy">
      <div class="logo">__LOGO__</div>
      <div class="eyebrow">Accra &middot; Ghana</div>
      <h1>Real Ghanaian food,<br>cooked to order.</h1>
      <p>__TAGLINE__</p>
      <div class="rule"></div>
    </div>
    <div class="photo">
      <img src="file://__PHOTO__">
      <div class="scrim"></div>
    </div>
  </div>
</body></html>
"""

AVATAR_HTML = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;}html,body{width:__S__px;height:__S__px;overflow:hidden;background:#C4422B;}
  svg{display:block;width:__S__px;height:__S__px;}
</style></head><body>__MARKUP__</body></html>
"""


def render(html, width, height, out_path):
    os.makedirs(WORK, exist_ok=True)
    page = os.path.join(WORK, "page.html")
    with open(page, "w") as fh:
        fh.write(html)
    tmp = os.path.join(WORK, os.path.basename(out_path))
    cmd = [BROWSER, "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
           f"--screenshot={tmp}", f"--window-size={width},{height}", f"file://{page}"]
    subprocess.run(cmd, check=False, capture_output=True, timeout=180)
    if not os.path.exists(tmp):
        print(f"  ! failed to render {out_path}")
        return False
    os.replace(tmp, out_path)
    print(f"  {os.path.relpath(out_path, ROOT)}  {width}x{height}")
    return True


def main():
    banners = os.path.join(BRAND, "banners")
    icons = os.path.join(BRAND, "icons")
    os.makedirs(banners, exist_ok=True)
    os.makedirs(icons, exist_ok=True)

    hero = os.path.join(banners, "hero-home-1600x900.jpg")
    print("Composing social assets...")

    cover = (COVER_HTML
             .replace("__W__", str(COVER_W)).replace("__H__", str(COVER_H))
             .replace("__LOGO__", logo_svg()).replace("__PHOTO__", hero)
             .replace("__TAGLINE__", TAGLINE))
    render(cover, COVER_W, COVER_H, os.path.join(banners, "social-cover-1200x630.jpg"))

    render(AVATAR_HTML.replace("__S__", "400").replace("__MARKUP__", emblem_svg()), 400, 400,
           os.path.join(icons, "social-avatar-400x400.png"))

    print("done")


if __name__ == "__main__":
    main()
