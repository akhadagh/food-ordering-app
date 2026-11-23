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
    ("banku-okra-soup", "File:Banku and Okro stew.jpg",
     [("food/banku-okra-soup.jpg", 1200, 900)]),
    ("banku-grilled-tilapia", "File:Banku and Grilled Tilapia.jpg",
     [("food/banku-grilled-tilapia.jpg", 1200, 900)]),
    ("fufu-light-soup", "File:Fufu with light soup and chicken.jpg",
     [("food/fufu-light-soup.jpg", 1200, 900)]),
    ("fufu-groundnut-soup", "File:Fufu with groundnut soup.jpg",
     [("food/fufu-groundnut-soup.jpg", 1200, 900)]),
    ("omotuo-groundnut-soup", "File:Omo tuo with groundnut soup and meat.jpg",
     [("food/omotuo-groundnut-soup.jpg", 1200, 900)]),
    ("kokonte-groundnut-soup", "File:Kokonte Dish.jpg",
     [("food/kokonte-groundnut-soup.jpg", 1200, 900)]),
    ("jollof-rice", "File:Ghana Jollof Rice with Chicken.jpg",
     [("food/jollof-rice.jpg", 1200, 900),
      ("food/rice/jollof-chicken-1.jpg", 1200, 1500)]),
    ("fried-rice", "File:Ghanaian fried rice 1.jpg",
     [("food/fried-rice.jpg", 1200, 900),
      ("food/rice/fried-rice-2.jpg", 1200, 900)]),
    # --- additional dish views (multi-photo cards) -------------------------
    ("banku-okra-2", "File:Banku and okro.jpg",
     [("food/banku/banku-okra-2.jpg", 1200, 900)]),
    ("banku-okra-3", "File:Banku and okro stew 1.jpg",
     [("food/banku/banku-okra-3.jpg", 1200, 900)]),
    ("banku-okra-4", "File:Banku with okro stew and anchovies.jpg",
     [("food/banku/banku-okra-4.jpg", 1200, 900)]),
    ("banku-tilapia-2", "File:Banku and tilapia 1.jpg",
     [("food/banku/banku-tilapia-2.jpg", 1200, 900)]),
    ("banku-tilapia-3", "File:Grilled tilapia with banku.jpg",
     [("food/banku/banku-tilapia-3.jpg", 1200, 900)]),
    ("banku-groundnut-1", "File:Banku and groundnut soup 01.jpg",
     [("food/banku/banku-groundnut-1.jpg", 1200, 900)]),
    ("banku-groundnut-2", "File:Banku with Groundnut Soup.jpg",
     [("food/banku/banku-groundnut-2.jpg", 1200, 900)]),
    ("fufu-light-2", "File:Fufu and Light Soup with meat.jpg",
     [("food/fufu/fufu-light-2.jpg", 1200, 900)]),
    ("fufu-light-3", "File:Fufu and light soup in asanka.jpg",
     [("food/fufu/fufu-light-3.jpg", 1200, 900)]),
    ("fufu-groundnut-2", "File:Fufu with groundnut soup 1.jpg",
     [("food/fufu/fufu-groundnut-2.jpg", 1200, 900)]),
    ("fufu-groundnut-3", "File:Fufu in groundnut soup with fish.jpg",
     [("food/fufu/fufu-groundnut-3.jpg", 1200, 900)]),
    ("fufu-palmnut-1", "File:Fufu and palm nut soup.jpg",
     [("food/fufu/fufu-palmnut-1.jpg", 1200, 900)]),
    ("fufu-palmnut-2", "File:Fufu with palm nut soup, snail and tilapia.JPG",
     [("food/fufu/fufu-palmnut-2.jpg", 1200, 900)]),
    ("omotuo-2", "File:Omo Tuo at a Ghanaian restaurant in Colorado.jpg",
     [("food/omotuo/omotuo-2.jpg", 1200, 900)]),
    ("kokonte-2", "File:Kokonte 01 04.jpg",
     [("food/kokonte/kokonte-2.jpg", 1200, 900)]),
    ("kokonte-3", "File:Kokonte 11.jpg",
     [("food/kokonte/kokonte-3.jpg", 1200, 900)]),
    ("fried-rice-3", "File:Ghanaian fried rice 2.jpg",
     [("food/rice/fried-rice-3.jpg", 1200, 900)]),
    ("jollof-3", "File:Jollof Rice 2.jpg",
     [("food/rice/jollof-3.jpg", 1200, 900)]),
    ("jollof-4", "File:Jollof rice and tomato stew.jpg",
     [("food/rice/jollof-4.jpg", 1200, 900)]),
    ("jollof-fish", "File:Jollof and Fish.jpg",
     [("food/rice/jollof-fish-1.jpg", 1200, 900)]),
    ("rice-stew", "File:A plate of cooked rice with stew.jpg",
     [("food/rice/rice-stew-1.jpg", 1200, 900)]),
    # --- category banners ---------------------------------------------------
    ("banku-cat", "File:Banku 07.jpg",
     [("banners/category-banku.jpg", 800, 800)]),
    ("fufu-cat", "File:Fufu plantain Ghana 1.jpg",
     [("banners/category-fufu.jpg", 800, 800)]),
    ("omotuo-cat", "File:Rice ball (Omotuo).jpeg",
     [("banners/category-omotuo.jpg", 800, 800),
      ("food/omotuo/omotuo-3.jpg", 1200, 900)]),
    ("kokonte-cat", "File:Kokonte Dish.jpg",
     [("banners/category-kokonte.jpg", 800, 800)]),
    ("rice-cat", "File:Jollof Rice Ghana.jpg",
     [("banners/category-rice-dishes.jpg", 800, 800)]),
    # --- story / promotional banners ---------------------------------------
    ("about", "File:Ghanaian women cooking jollof.jpg",
     [("banners/about-kitchen-1200x800.jpg", 1200, 800)]),
    ("street-food", "File:Street Food Vendor - Kumasi - Ghana (4756201284).jpg",
     [("banners/promo-delivery-1600x600.jpg", 1600, 600)]),
    # --- hero banner --------------------------------------------------------
    ("hero", "File:Jollof rice in Ghana.jpg",
     [("banners/hero-home-1600x900.jpg", 1600, 900),
      ("banners/hero-home-1200x1200.jpg", 1200, 1200),
      ("banners/hero-home-800x1200.jpg", 800, 1200)]),
    ("hero-fufu", "File:Fufu in Palm Nut Soup.jpg",
     [("banners/hero-fufu-palmnut.jpg", 1600, 900)]),
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
            meta["_outputs"] = []
            credits.append(meta)

        meta["_outputs"].extend(rel for rel, _w, _h in targets)

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
        "Every photograph under `frontend/public/brand/` is sourced from Wikimedia",
        "Commons under a Creative Commons (or CC0) licence that permits commercial",
        "use with attribution. The local path, author, licence and source page are",
        "listed below. Where one source produced several crops, all local files are",
        "listed together.",
        "",
        "Attribution requirements must be honoured wherever these images are published.",
        "Derived assets (social card, icons) are crops or composites of these photos.",
        "",
        "| Local asset(s) | Author | Licence | Source |",
        "|---|---|---|---|",
    ]
    for m in credits:
        lic = f"[{m['licence']}]({m['licence_url']})" if m.get("licence_url") else m["licence"]
        assets = ", ".join(f"`{path}`" for path in m.get("_outputs", []))
        lines.append(f"| {assets} | {m['artist']} | {lic} | [Commons]({m['page']}) |")
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
