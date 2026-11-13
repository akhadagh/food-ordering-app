#!/usr/bin/env python3
"""Download, crop and resize the Afia Food Hub brand photography.

Sources are Wikimedia Commons files with freely reusable licences (CC BY-SA /
CC BY / CC0). Every downloaded file is recorded in brand/PHOTO-CREDITS.md with
its author, licence and source page.

Run:  python3 tools/fetch-brand-photos.py
"""
import json, os, re, sys, textwrap, urllib.parse, urllib.request
from io import BytesIO

from PIL import Image, ImageFilter, ImageEnhance

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BRAND = os.path.join(ROOT, "frontend", "public", "brand")
CACHE = os.path.join(ROOT, ".brand-cache")
API = "https://commons.wikimedia.org/w/api.php"
UA = "AfiaFoodHubBrandAssets/1.0 (https://github.com/akhadagh/food-ordering-app)"

# slug, Commons file title, [(output relative path, width, height), ...]
MANIFEST = [
    # --- dish photography (menu cards) -------------------------------------
    ("jollof-rice", "File:Ghana Jollof Rice with Chicken.jpg",
     [("food/jollof-rice.jpg", 1200, 900)]),
    ("jollof-stew", "File:Jollof rice and tomato stew.jpg",
     [("food/jollof-rice-stew.jpg", 1200, 900)]),
    ("banku", "File:Banku 03.jpg",
     [("food/banku.jpg", 1200, 900)]),
    ("banku-okra", "File:Banku and Okro stew.jpg",
     [("food/banku-okra-soup.jpg", 1200, 900)]),
    ("waakye", "File:Waakye101.jpg",
     [("food/waakye.jpg", 1200, 900)]),
    ("waakye-leaf", "File:Waakye in a leaf.jpg",
     [("food/waakye-leaf.jpg", 1200, 900)]),
    ("fufu-light-soup", "File:Fufu with light soup and chicken.jpg",
     [("food/fufu-light-soup.jpg", 1200, 900)]),
    ("fufu-tilapia", "File:Fufu with tilapia, meat and light soup.jpg",
     [("food/fufu-tilapia.jpg", 1200, 900)]),
    ("kenkey", "File:Kenkey (Ghana Food).jpg",
     [("food/kenkey.jpg", 1200, 900)]),
    ("light-soup", "File:Ghana light soup and fufu 01.jpg",
     [("food/light-soup.jpg", 1200, 900)]),
    ("grilled-fish", "File:Fish jollof rice.jpg",
     [("food/jollof-grilled-fish.jpg", 1200, 900)]),
    ("ghana-market", "File:Food items market Ghana.jpg",
     [("food/ghana-market.jpg", 1200, 900)]),
    ("smoked-fish", "File:Market Stall with Display of Smoked Fish.jpg",
     [("food/smoked-fish.jpg", 1200, 900)]),
    # --- banners -----------------------------------------------------------
    ("hero", "File:Jollof rice in Ghana.jpg",
     [("banners/hero-home-1600x900.jpg", 1600, 900),
      ("banners/hero-home-1200x1200.jpg", 1200, 1200),
      ("banners/hero-home-800x1200.jpg", 800, 1200)]),
    ("about", "File:Ghanaian women cooking jollof.jpg",
     [("banners/about-kitchen-1200x800.jpg", 1200, 800)]),
    ("street-food", "File:Street Food Vendor - Kumasi - Ghana (4756201284).jpg",
     [("banners/promo-delivery-1600x600.jpg", 1600, 600)]),
    ("market", "File:Market Stalls.jpg",
     [("banners/promo-fresh-market-1600x600.jpg", 1600, 600)]),
    ("north", "File:Different kinds of food in northern Ghana 01.jpg",
     [("banners/category-local-800x800.jpg", 800, 800)]),
    ("banku-cat", "File:Banku 03.jpg",
     [("banners/category-banku-800x800.jpg", 800, 800)]),
    ("chef-cat", "File:Jollof Rice 2.jpg",
     [("banners/category-chef-800x800.jpg", 800, 800)]),
    ("rice-cat", "File:Ghana Jollof Rice with Chicken.jpg",
     [("banners/category-rice-800x800.jpg", 800, 800)]),
    ("waakye-cat", "File:Waakye101.jpg",
     [("banners/category-waakye-800x800.jpg", 800, 800)]),
    ("kenkey-cat", "File:Kenkey (Ghana Food).jpg",
     [("banners/category-kenkey-800x800.jpg", 800, 800)]),
    ("fufu-cat", "File:Fufu with light soup and chicken.jpg",
     [("banners/category-fufu-800x800.jpg", 800, 800)]),
    ("drinks-cat", "File:Palm Wine in Its Traditional Pot.jpg",
     [("banners/category-drinks-800x800.jpg", 800, 800),
      ("food/palm-wine.jpg", 1200, 900)]),
    ("sides-cat", "File:Beans, Palm oil, Gari and Fried Plantains.jpg",
     [("banners/category-sides-800x800.jpg", 800, 800),
      ("food/beans-plantain-gari.jpg", 1200, 900)]),
]


def api(params):
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as fh:
        return json.load(fh)


def resolve(title):
    data = api({
        "action": "query", "titles": title, "prop": "imageinfo",
        "iiprop": "url|size|extmetadata", "iiurlwidth": "2600", "format": "json",
    })
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        if "imageinfo" in page:
            ii = page["imageinfo"][0]
            em = ii.get("extmetadata", {})
            artist = re.sub(r"<[^>]+>", "", em.get("Artist", {}).get("value", "") or "").strip()
            credit = re.sub(r"<[^>]+>", "", em.get("Credit", {}).get("value", "") or "").strip()
            lic = em.get("LicenseShortName", {}).get("value", "unknown")
            licurl = em.get("LicenseUrl", {}).get("value", "")
            return {
                "url": ii.get("thumburl") or ii.get("url"),
                "page": ii.get("descriptionurl"),
                "artist": artist or "Unknown",
                "credit": credit,
                "licence": lic,
                "licence_url": licurl,
                "title": page["title"],
                "index": ii.get("index", {}).get("page", ""),
            }
    return None


def download(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return True
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=120) as fh:
            data = fh.read()
    except Exception as exc:
        print(f"    ! download failed: {exc}")
        return False
    with open(dest, "wb") as fh:
        fh.write(data)
    return True


def grade(img):
    """Consistent warm, appetising grade across the whole library."""
    img = ImageEnhance.Color(img).enhance(1.12)
    img = ImageEnhance.Contrast(img).enhance(1.06)
    img = ImageEnhance.Brightness(img).enhance(1.03)
    # subtle warm tint
    r, g, b = img.split()
    r = r.point(lambda v: min(255, int(v * 1.035)))
    b = b.point(lambda v: int(v * 0.965))
    img = Image.merge("RGB", (r, g, b))
    return img


def crop_resize(img, w, h):
    """Centre crop to the target aspect, then resize."""
    img = img.convert("RGB")
    target = w / h
    sw, sh = img.size
    cur = sw / sh
    if cur > target:                      # too wide -> crop sides
        nw = int(sh * target)
        left = (sw - nw) // 2
        img = img.crop((left, 0, left + nw, sh))
    else:                                 # too tall -> crop top/bottom
        nh = int(sw / target)
        top = int((sh - nh) * 0.42)       # bias slightly above centre
        img = img.crop((0, top, sw, top + nh))
    return img.resize((w, h), Image.LANCZOS)


def main():
    os.makedirs(CACHE, exist_ok=True)
    credits = []
    seen = {}
    failures = []

    for slug, title, targets in MANIFEST:
        if slug in seen:
            meta = seen[slug]
        else:
            meta = resolve(title)
            if not meta:
                print(f"  [skip] not found: {title}")
                failures.append(title)
                continue
            seen[slug] = meta
            cached = os.path.join(CACHE, re.sub(r"[^A-Za-z0-9]+", "_", title) + ".img")
            if not download(meta["url"], cached):
                failures.append(title)
                continue
            meta["_cache"] = cached
            credits.append(meta)

        try:
            src = Image.open(meta["_cache"])
        except Exception as exc:
            print(f"  [fail] open {title}: {exc}")
            failures.append(title)
            continue
        src.load()

        for rel, w, h in targets:
            out = os.path.join(BRAND, rel)
            os.makedirs(os.path.dirname(out), exist_ok=True)
            img = crop_resize(grade(src.copy()), w, h)
            img.save(out, "JPEG", quality=84, optimize=True, progressive=True)
            print(f"  {rel}  {w}x{h}")

    write_credits(credits)
    if failures:
        print("\nFAILED:", failures)
    print(f"\n{len(credits)} sources, credits written to brand/PHOTO-CREDITS.md")


def write_credits(credits):
    lines = [
        "# Afia Food Hub — Photography Credits",
        "",
        "All photography in `frontend/public/brand/` is sourced from Wikimedia Commons",
        "under a Creative Commons (or CC0) licence that permits commercial use with",
        "attribution. Each file below lists its author, licence and source page.",
        "",
        "Attribution requirements must be honoured wherever these images are published.",
        "",
        "| Asset source | Author | Licence | Source |",
        "|---|---|---|---|",
    ]
    for m in credits:
        lic = f"[{m['licence']}]({m['licence_url']})" if m.get("licence_url") else m["licence"]
        lines.append(f"| {m['title'].replace('File:', '')} | {m['artist']} | {lic} | [Commons]({m['page']}) |")
    lines += [
        "",
        "---",
        "",
        "Regenerate with `python3 tools/fetch-brand-photos.py`.",
        "",
    ]
    with open(os.path.join(BRAND, "PHOTO-CREDITS.md"), "w") as fh:
        fh.write("\n".join(lines))


if __name__ == "__main__":
    main()
