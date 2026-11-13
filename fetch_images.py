"""Fetch and locally optimize the NASA photographs used by the atlas.

This is a provenance/maintenance script only. The app never runs it and never
needs a network connection. Images are NASA public-domain assets; see README.md
for per-image source links and credits.
"""

from __future__ import annotations

import io
import json
import os
import ssl
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "images"
OUT.mkdir(parents=True, exist_ok=True)

# (NASA image id or direct key, output filename, direct URL or None)
IMAGES = [
    ("as11-40-5902", "apollo11-eagle.jpg", None),
    ("as12-46-6726", "apollo12-intrepid.jpg", None),
    ("PIA14003", "apollo14-antares.jpg", None),
    ("as15-86-11603", "apollo15-falcon.jpg", None),
    ("as16-115-18549", "apollo16-orion.jpg", None),
    ("S72-55421", "apollo17-challenger.jpg", None),
    ("PIA02976", "surveyor1.jpg", None),
    (
        "vl1_p17428",
        "viking1.jpg",
        "https://nssdc.gsfc.nasa.gov/imgcat/hires/vl1_p17428.jpg",
    ),
    (
        "vl2_p17686",
        "viking2.jpg",
        "https://nssdc.gsfc.nasa.gov/imgcat/hires/vl2_p17686.jpg",
    ),
    ("PIA00621", "pathfinder-sojourner.jpg", None),
    ("PIA05248", "spirit.jpg", None),
    ("PIA17759", "opportunity.jpg", None),
    ("PIA11718", "phoenix.jpg", None),
    ("PIA22876", "insight.jpg", None),
    ("PIA24542", "ingenuity.jpg", None),
]

CTX = ssl.create_default_context()
# The JPL press image host occasionally presents a chains issue in this build
# environment; the NASA-hosted images API endpoint below is used for those.
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def read(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=90, context=CTX).read()


def nasa_image_url(image_id: str) -> str:
    query = urllib.parse.quote(image_id)
    data = json.loads(read(f"https://images-api.nasa.gov/search?nasa_id={query}"))
    items = data["collection"]["items"]
    if not items:
        raise RuntimeError(f"No NASA image metadata for {image_id}")
    item = items[0]
    collection = json.loads(read(item["href"]))
    for suffix in ("~large.jpg", "~orig.jpg", "~medium.jpg"):
        for asset in collection:
            if asset.endswith(suffix):
                return asset
    raise RuntimeError(f"No JPEG asset for {image_id}")


def main() -> int:
    for image_id, filename, direct in IMAGES:
        url = direct or nasa_image_url(image_id)
        raw = read(url)
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        img.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
        dest = OUT / filename
        img.save(dest, "JPEG", quality=84, optimize=True, progressive=True)
        print(f"{filename:28s} {img.width:4d}x{img.height:<4d} {dest.stat().st_size/1000:7.1f} kB  {url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
