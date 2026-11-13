# Third-party notices

The application code in this repository is licensed under the Apache License 2.0
(see `LICENSE`). The following third-party libraries are redistributed locally
in `vendor/` so the atlas can run without a network connection.

## MapLibre GL JS 5.9.0

- Project: <https://maplibre.org/>
- Source: <https://github.com/maplibre/maplibre-gl-js>
- License: BSD 3-Clause
- Local files: `vendor/maplibre-gl.js`, `vendor/maplibre-gl.css`
- License copy: `vendor/LICENSE-maplibre.txt`

## PMTiles 4.3.0

- Project: <https://github.com/protomaps/PMTiles>
- License: BSD 3-Clause (the PMTiles specification itself is public domain / CC0)
- Local file: `vendor/pmtiles.js`
- License copy: `vendor/LICENSE-pmtiles.txt`

## NASA imagery and data

NASA mission pages, NASA Image and Video Library assets, NASA NSSDC images and
NASA Solar System Treks basemap tiles are credited individually in the README
and in the object stories. NASA-produced imagery is generally not subject to
copyright in the United States; the original credits are retained. This project
does not claim ownership of NASA material.

## Development-only tools

The optional scripts in `tools/` use Python, Pillow and NumPy to fetch and render
the local basemaps. Those tools are not required to run the site and are not
redistributed as part of the web application.
