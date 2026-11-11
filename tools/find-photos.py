#!/usr/bin/env python3
"""Query Wikimedia Commons for candidate brand photography."""
import json, sys, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "AfiaFoodHubBrandAssets/1.0 (brand asset research)"


def search(query, limit=8):
    params = {
        "action": "query", "generator": "search", "gsrsearch": query,
        "gsrnamespace": "6", "gsrlimit": str(limit), "prop": "imageinfo",
        "iiprop": "url|size|extmetadata|mime", "iiurlwidth": "2000", "format": "json",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as fh:
        data = json.load(fh)
    out = []
    for p in data.get("query", {}).get("pages", {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png"):
            continue
        em = ii.get("extmetadata", {})
        out.append({
            "title": p["title"],
            "w": ii.get("width"), "h": ii.get("height"),
            "url": ii.get("thumburl") or ii.get("url"),
            "lic": em.get("LicenseShortName", {}).get("value", "?"),
            "artist": (em.get("Artist", {}).get("value") or "").replace("\n", " ")[:80],
            "desc": (em.get("ImageDescription", {}).get("value") or "")[:90],
        })
    return out


for q in sys.argv[1:]:
    print(f"\n########## {q}")
    try:
        for r in search(q):
            orient = "LAND" if (r["w"] or 0) > (r["h"] or 0) else ("SQUARE" if r["w"] == r["h"] else "PORT")
            print(f"  [{orient}] {r['w']}x{r['h']}  {r['title']}")
            print(f"        {r['lic']} | {r['artist']}")
            print(f"        {r['desc']}")
    except Exception as exc:
        print("  ERROR", exc)
