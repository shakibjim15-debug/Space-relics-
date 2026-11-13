"""Build the two local PMTiles basemaps from NASA Solar System Treks WMTS tiles.

This is an offline-maintenance script, not a build step for the app. The generated
archives are committed under assets/tiles/, so serving the site never needs a
network connection or Python. Requires numpy + Pillow.

Data source:
  Moon: NASA Moon Trek, LRO WAC global mosaic (303 ppd)
  Mars: NASA Mars Trek, Viking MDIM 2.1 colour mosaic (232 m)
"""

from __future__ import annotations

import concurrent.futures
import io
import json
import math
import os
import struct
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "tiles"
CACHE = Path(os.environ.get("TEMP", "/tmp")) / "dsh-planetary-basemap-cache"

BODIES = {
    "moon": {
        "product": "Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02",
        "title": "Moon · LRO WAC global mosaic",
        "attribution": "NASA / LRO LROC WAC · NASA Moon Trek",
        "source": "https://trek.nasa.gov/moon/",
    },
    "mars": {
        "product": "Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m",
        "title": "Mars · Viking MDIM 2.1 color mosaic",
        "attribution": "NASA / JPL / USGS / Viking MDIM 2.1 · NASA Mars Trek",
        "source": "https://trek.nasa.gov/mars/",
    },
}

FETCH_ZOOM = 5  # 32 x 16 tiles, each 256 px -> 8192 x 4096 equirectangular mosaic
TILE_ZOOM_MAX = 4
TILE_SIZE = 512


def trek_url(product: str, z: int, x: int, y: int) -> str:
    return (
        f"https://trek.nasa.gov/tiles/{product}/1.0.0/default/default028mm/"
        f"{z}/{y}/{x}.jpg"
    )


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "dsh-planetary-map/1.0"})
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as response:
                return response.read()
        except Exception as exc:  # noqa: BLE001 - retry all transient failures
            last = exc
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"Could not fetch {url}: {last}")


def build_equirectangular(body: str, product: str) -> Image.Image:
    cache_dir = CACHE / body / str(FETCH_ZOOM)
    cache_dir.mkdir(parents=True, exist_ok=True)
    width = 2**FETCH_ZOOM
    height = 2 ** (FETCH_ZOOM - 1)
    jobs = [(x, y) for y in range(height) for x in range(width)]

    def get(job: tuple[int, int]) -> tuple[int, int, bytes | None]:
        x, y = job
        path = cache_dir / f"{y}-{x}.jpg"
        if path.exists() and path.stat().st_size > 100:
            return x, y, path.read_bytes()
        data = fetch_bytes(trek_url(product, FETCH_ZOOM, x, y))
        path.write_bytes(data)
        return x, y, data

    print(f"[{body}] downloading {len(jobs)} NASA Trek tiles at z{FETCH_ZOOM}…", flush=True)
    tiles: dict[tuple[int, int], bytes] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        for index, (x, y, data) in enumerate(pool.map(get, jobs), 1):
            if data:
                tiles[(x, y)] = data
            if index % 128 == 0:
                print(f"[{body}] {index}/{len(jobs)} tiles", flush=True)

    mosaic = Image.new("RGB", (width * 256, height * 256))
    for y in range(height):
        for x in range(width):
            tile = Image.open(io.BytesIO(tiles[(x, y)])).convert("RGB")
            mosaic.paste(tile, (x * 256, y * 256))
    print(f"[{body}] stitched {mosaic.size[0]}x{mosaic.size[1]} mosaic", flush=True)
    return mosaic


def mercator_lat(world_y: np.ndarray) -> np.ndarray:
    return np.degrees(np.arctan(np.sinh(np.pi * (1.0 - 2.0 * world_y))))


def sample_bilinear(source: np.ndarray, u: np.ndarray, v: np.ndarray) -> np.ndarray:
    height, width = source.shape[:2]
    u = np.clip(u, 0, width - 1)
    v = np.clip(v, 0, height - 1)
    x0 = np.floor(u).astype(np.int32)
    y0 = np.floor(v).astype(np.int32)
    x1 = np.minimum(x0 + 1, width - 1)
    y1 = np.minimum(y0 + 1, height - 1)
    fx = (u - x0)[..., None]
    fy = (v - y0)[..., None]
    top = source[y0, x0].astype(np.float32) * (1 - fx) + source[y0, x1] * fx
    bottom = source[y1, x0].astype(np.float32) * (1 - fx) + source[y1, x1] * fx
    return (top * (1 - fy) + bottom * fy).clip(0, 255).astype(np.uint8)


def render_tile(mosaic: Image.Image, z: int, x: int, y: int) -> bytes:
    source = np.asarray(mosaic)
    src_h, src_w = source.shape[:2]
    n = 2**z
    px = (np.arange(TILE_SIZE, dtype=np.float64) + 0.5) / TILE_SIZE
    world_x = (x + px) / n
    world_y = (y + px) / n
    lon = world_x * 360.0 - 180.0
    lat = mercator_lat(world_y)
    uu, vv = np.meshgrid(
        (lon + 180.0) / 360.0 * (src_w - 1),
        (90.0 - lat) / 180.0 * (src_h - 1),
    )
    tile = sample_bilinear(source, uu, vv)
    image = Image.fromarray(tile, "RGB")
    out = io.BytesIO()
    image.save(out, "JPEG", quality=86, optimize=True, progressive=True)
    return out.getvalue()


def varint(value: int) -> bytes:
    if value < 0:
        raise ValueError("varint must be non-negative")
    out = bytearray()
    while value >= 0x80:
        out.append((value & 0x7F) | 0x80)
        value >>= 7
    out.append(value)
    return bytes(out)


def tile_id(z: int, x: int, y: int) -> int:
    """PMTiles v3 tile IDs are Hilbert-curve indices, not Z-order indices."""
    base = (4**z - 1) // 3
    acc = 0
    level = 2 ** (z - 1) if z else 0
    px, py = x, y
    while level >= 1:
        xb = 1 if (px & level) else 0
        yb = 1 if (py & level) else 0
        acc += level * level * ((3 * xb) ^ yb)
        if yb == 0:
            if xb == 1:
                px = level - 1 - px
                py = level - 1 - py
            px, py = py, px
        level //= 2
    return base + acc


def serialize_directory(entries: list[tuple[int, int, int]]) -> bytes:
    # entries: (tile_id, tile_data_offset, byte_length)
    out = bytearray(varint(len(entries)))
    previous = 0
    for tile, _, _ in entries:
        out += varint(tile - previous)
        previous = tile
    for _, _, _ in entries:
        out += varint(1)  # run length
    for _, _, length in entries:
        out += varint(length)
    for _, offset, _ in entries:
        # The PMTiles v3 index uses 0 as "after previous tile", so absolute
        # offsets are emitted as offset + 1.
        out += varint(offset + 1)
    return bytes(out)


def write_pmtiles(
    path: Path,
    entries: list[tuple[int, int, int]],
    tile_data: bytes,
    metadata: dict,
) -> None:
    root = serialize_directory(entries)
    meta = json.dumps(metadata, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    header_len = 127
    root_offset = header_len
    metadata_offset = root_offset + len(root)
    tile_offset = metadata_offset + len(meta)
    tile_count = len(entries)

    header = bytearray(header_len)
    header[0:7] = b"PMTiles"
    header[7] = 3
    struct.pack_into("<Q", header, 8, root_offset)
    struct.pack_into("<Q", header, 16, len(root))
    struct.pack_into("<Q", header, 24, metadata_offset)
    struct.pack_into("<Q", header, 32, len(meta))
    struct.pack_into("<Q", header, 40, 0)  # leaf directory offset
    struct.pack_into("<Q", header, 48, 0)  # leaf directory length
    struct.pack_into("<Q", header, 56, tile_offset)
    struct.pack_into("<Q", header, 64, len(tile_data))
    struct.pack_into("<Q", header, 72, tile_count)
    struct.pack_into("<Q", header, 80, tile_count)
    struct.pack_into("<Q", header, 88, tile_count)
    header[96] = 1  # clustered
    header[97] = 1  # internal compression: none
    header[98] = 1  # tile compression: none
    header[99] = 3  # tile type: JPEG
    header[100] = 0  # min zoom
    header[101] = TILE_ZOOM_MAX
    struct.pack_into("<i", header, 102, -180_000_000)
    struct.pack_into("<i", header, 106, -85_000_000)
    struct.pack_into("<i", header, 110, 180_000_000)
    struct.pack_into("<i", header, 114, 85_000_000)
    header[118] = 2
    struct.pack_into("<i", header, 119, 0)
    struct.pack_into("<i", header, 123, 0)

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as fh:
        fh.write(header)
        fh.write(root)
        fh.write(meta)
        fh.write(tile_data)
    print(f"[pmtiles] wrote {path} ({path.stat().st_size / 1_000_000:.1f} MB)", flush=True)


def build_body(body: str, info: dict) -> None:
    mosaic = build_equirectangular(body, info["product"])
    rendered: list[tuple[int, bytes]] = []
    total = sum(4**z for z in range(TILE_ZOOM_MAX + 1))
    done = 0
    for z in range(TILE_ZOOM_MAX + 1):
        for x in range(2**z):
            for y in range(2**z):
                data = render_tile(mosaic, z, x, y)
                # Make sure every encoded tile is readable before it is written
                # into the archive.
                Image.open(io.BytesIO(data)).verify()
                rendered.append((tile_id(z, x, y), data))
                done += 1
        print(f"[{body}] rendered {done}/{total} Mercator tiles", flush=True)

    # The directory and the data section must share the same order. PMTiles
    # tile IDs are in Morton order, which is not the same as the x/y loop
    # above, so sort the (id, bytes) pairs before assigning byte offsets.
    rendered.sort(key=lambda item: item[0])
    entries: list[tuple[int, int, int]] = []
    chunks: list[bytes] = []
    offset = 0
    for tile, data in rendered:
        entries.append((tile, offset, len(data)))
        chunks.append(data)
        offset += len(data)

    metadata = {
        "name": info["title"],
        "description": "Local NASA planetary basemap, rendered to Web Mercator tiles.",
        "attribution": info["attribution"],
        "source": info["source"],
        "generated": "offline from NASA Solar System Treks WMTS",
    }
    write_pmtiles(OUT_DIR / f"{body}.pmtiles", entries, b"".join(chunks), metadata)


def main() -> int:
    print(f"Using Python {sys.version.split()[0]}, cache {CACHE}", flush=True)
    for body, info in BODIES.items():
        build_body(body, info)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
