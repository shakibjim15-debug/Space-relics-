#!/usr/bin/env python3
"""Serve the atlas locally with HTTP byte-range support.

This server adds HTTP Range support for the local PMTiles archives and serves
the folder as a static site. It needs only the Python standard library. The
browser app also works with simpler static servers, but Range support is useful
for future PMTiles clients and for inspecting archives.

    python serve.py
    python serve.py --port 8080
"""

from __future__ import annotations

import argparse
import mimetypes
import os
import posixpath
import re
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent

mimetypes.add_type("application/vnd.pmtiles", ".pmtiles")
mimetypes.add_type("application/geo+json", ".geojson")
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("text/markdown; charset=utf-8", ".md")

RANGE_RE = re.compile(r"^bytes=(\d*)-(\d*)$")


class AtlasHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "LeftBehind/1.0"

    def do_GET(self) -> None:  # noqa: N802 - stdlib API
        self._serve(send_body=True)

    def do_HEAD(self) -> None:  # noqa: N802 - stdlib API
        self._serve(send_body=False)

    def _resolve(self) -> Path | None:
        path = unquote(urlsplit(self.path).path)
        path = posixpath.normpath(path)
        if path in ("", "/"):
            path = "/index.html"
        candidate = (ROOT / path.lstrip("/")).resolve()
        try:
            candidate.relative_to(ROOT)
        except ValueError:
            return None
        if candidate.is_dir():
            candidate = candidate / "index.html"
        if not candidate.is_file():
            return None
        return candidate

    def _serve(self, send_body: bool) -> None:
        file_path = self._resolve()
        if file_path is None:
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        try:
            stat = file_path.stat()
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        size = stat.st_size
        start = 0
        end = size - 1
        status = HTTPStatus.OK
        range_header = self.headers.get("Range")
        if range_header:
            match = RANGE_RE.match(range_header.strip())
            if not match:
                self.send_error(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE, "Invalid range")
                return
            first, last = match.groups()
            if first == "" and last == "":
                self.send_error(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE, "Invalid range")
                return
            if first == "":
                suffix = int(last)
                start = max(0, size - suffix)
                end = size - 1
            else:
                start = int(first)
                end = int(last) if last else size - 1
            if start >= size or start > end:
                self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                self.send_header("Content-Range", f"bytes */{size}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            end = min(end, size - 1)
            status = HTTPStatus.PARTIAL_CONTENT

        etag = f'"{stat.st_mtime_ns:x}-{size:x}"'
        if self.headers.get("If-None-Match") == etag and status == HTTPStatus.OK:
            self.send_response(HTTPStatus.NOT_MODIFIED)
            self.send_header("ETag", etag)
            self.end_headers()
            return

        content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        length = end - start + 1 if size else 0

        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Last-Modified", self.date_time_string(stat.st_mtime))
        self.send_header("ETag", etag)
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        if status == HTTPStatus.PARTIAL_CONTENT:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()

        if not send_body:
            return

        try:
            with file_path.open("rb") as handle:
                handle.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = handle.read(min(64 * 1024, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve Left Behind with PMTiles byte-range support.")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    parser.add_argument("--bind", default="127.0.0.1", help="Address to bind (default: 127.0.0.1)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    server = ThreadingHTTPServer((args.bind, args.port), AtlasHandler)
    url_host = "127.0.0.1" if args.bind in ("0.0.0.0", "127.0.0.1") else args.bind
    print(f"Left Behind is running at http://{url_host}:{args.port}/")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
