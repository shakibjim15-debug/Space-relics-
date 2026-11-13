# Left Behind

**A scrollytelling atlas of NASA hardware still on the Moon and Mars.**

Fifteen curated landing sites, two local planetary basemaps, a year scrubber, and
English/Bangla stories. Every map tile, photograph, script, font choice and data
file is local. Nothing is fetched from the internet at runtime.

![Left Behind desktop view](docs/screenshot-desktop.png)

*Desktop overview. A Bangla mobile view is in
[`docs/screenshot-mobile-bn.png`](docs/screenshot-mobile-bn.png); an open
story panel is shown in
[`docs/screenshot-panel-desktop.png`](docs/screenshot-panel-desktop.png) and
[`docs/screenshot-panel-bn.png`](docs/screenshot-panel-bn.png).*

## Run it

There is no build step. The site is plain HTML, CSS and JavaScript.

```bash
python serve.py
```

Open **<http://127.0.0.1:8000>**. `serve.py` uses only the Python standard
library and adds HTTP Range support for the local PMTiles archives.

The browser code does **not** require Range support: it downloads each
`.pmtiles` archive once and serves tile slices from memory. That means VS Code
Live Server and plain `python -m http.server` also work. `serve.py` remains the
simplest, most predictable option.

Do **not** open `index.html` with `file://`: browsers block the JSON and map
requests from that origin.

Any static host (GitHub Pages, Netlify, S3/CloudFront, nginx, Caddy, VS Code Live
Server) can serve the folder as-is.

### Open in VS Code

1. Unzip the download and choose **File → Open Folder…** in VS Code.
2. Open the integrated terminal and run `python serve.py`, **or** use
   **Terminal → Run Task… → Serve Left Behind**, or press `F5` and choose
   **Run Left Behind server** (requires the Python extension).
3. Open **<http://127.0.0.1:8000>** in your browser.

The `.vscode/` folder contains both a task and a debug launch configuration.
No npm install, extension except Python, or internet connection is needed.

## What you can do

- **Scroll the story.** The map follows each chapter, switching worlds and
  focusing on a site. The narrative is in the right pane on desktop and below the
  map on mobile.
- **Switch Moon / Mars.** Each body has its own local PMTiles basemap and marker
  set.
- **Scrub the timeline.** The single-year slider shows only hardware left behind
  in or before the selected year. It works with mouse, touch and arrow keys.
- **Open a marker or site index entry.** A side panel (a bottom sheet on narrow
  screens) opens with the story, local NASA photograph and credit, plus a visible
  citation containing the full `source_url` and `dataset_id`.
- **Toggle English / বাংলা.** UI strings come from `data/strings.json`; object
  names, stories, image alt text and dates are localised from the GeoJSON.
- **Use the keyboard.** Tab reaches the skip link, world/language switches,
  timeline, map controls, every marker and every site index button. Enter or
  Space opens a story. Escape closes the native dialog and focus returns to the
  control that opened it.

## Accessibility and responsive behaviour

- Native `<dialog>` with modal focus handling, Escape to close, and focus return.
- Marker buttons have descriptive accessible names and open with Enter/Space.
- Complete site index below the story gives every object a keyboard path,
  independent of panning the map.
- Visible focus rings; minimum 44 px controls where practical.
- `prefers-reduced-motion: reduce` disables animated camera flights, marker
  pulses, loading spin, smooth scrolling and panel transitions.
- Tested layout target: **360 px wide**. The interface is a two-pane split on
  desktop and a map-over-story split on mobile; no horizontal scrolling.
- Colour contrast is designed for the dark theme; all text uses system fonts
  (no remote font requests).

## Data

`data/objects.geojson` is a curated FeatureCollection. Every feature has the
requested fields:

| Field | Meaning |
|---|---|
| `name`, `mission`, `body` | Identity and world (`Moon` or `Mars`) |
| `lat`, `lon` | Mean body-fixed latitude/longitude, east-positive, −180° to 180° |
| `left_behind` | Four-digit year the hardware was left behind; drives the timeline |
| `last_contact` | ISO date of the last contact / mission end |
| `why_left` | Why the hardware stayed |
| `science_enabled` | What it still enables or enabled |
| `image` | Local image path under `assets/images/` |
| `image_credit` | NASA image credit |
| `source_url` | NASA mission source page |
| `dataset_id` | Stable identifier used in the citation line |

Additional fields support the atlas: `last_contact_note`, `image_alt`, and the
Bangla variants `name_bn`, `mission_bn`, `why_left_bn`,
`science_enabled_bn`, `last_contact_note_bn`, `image_alt_bn`.

### Editorial notes

- A feature represents a **curated landing-site object or hardware group**. For
  example, Apollo 12's entry covers the Intrepid descent stage, its ALSEP and the
  nearby Surveyor 3 site. Dates for grouped records refer to the principal
  Apollo hardware; the text names the other equipment.
- Coordinates are **approximate landing-site centres**, not survey-grade
  positions. They are intended for a global atlas.
- `last_contact` is a mission-end or last-signal date. For Apollo sites, ALSEP
  operations ended in 1977 while some retroreflectors remain useful; the note
  explains the distinction.
- `left_behind` is the year used by the scrubber. This is an editorial "left
  behind by" filter, not a claim that every item at a site was deposited on the
  same day.

## Local assets and offline audit

| Asset | Location |
|---|---|
| Moon raster basemap | `assets/tiles/moon.pmtiles` (NASA Moon Trek, LRO WAC) |
| Mars raster basemap | `assets/tiles/mars.pmtiles` (NASA Mars Trek, Viking MDIM 2.1) |
| 15 local photographs | `assets/images/*.jpg` |
| Vendor libraries | `vendor/maplibre-gl.js`, `vendor/maplibre-gl.css`, `vendor/pmtiles.js` |
| UI strings | `data/strings.json` |
| Data | `data/objects.geojson` |

There are no CDN, Google Fonts, analytics, external image or remote API requests
in the runtime page. External `source_url` links open only when the user chooses
them.

The PMTiles basemaps were generated offline from NASA Solar System Treks WMTS
tiles with `tools/build_basemaps.py` and are checked into `assets/tiles/`. The
script is optional and needs network access, Pillow and NumPy; the web app does
not. Images were fetched and resized once with `tools/fetch_images.py`.

## NASA sources used

All sources below were accessed **29 October 2026**. The atlas is an independent
educational project and is not affiliated with or endorsed by NASA.

### Basemaps

| Source | NASA URL |
|---|---|
| Moon Trek portal | <https://trek.nasa.gov/moon/> |
| Moon WMTS product: LRO WAC Mosaic Global 303 ppd v02 | <https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/0/0/0.jpg> |
| Mars Trek portal | <https://trek.nasa.gov/mars/> |
| Mars WMTS product: Viking MDIM 2.1 color mosaic, 232 m | <https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/0/0/0.jpg> |
| NASA Solar System Treks WMTS API documentation | <https://trek.nasa.gov/tiles/apidoc/trekAPI.html> |
| NASA Image and Video Library API (used to locate and download photographs) | <https://images-api.nasa.gov/> |

### Object photographs

| Atlas object | NASA asset | Credit | NASA source |
|---|---|---|---|
| Apollo 11 / Eagle | `as11-40-5902` | NASA / JSC | <https://images.nasa.gov/details/as11-40-5902> |
| Apollo 12 / Intrepid | `as12-46-6726` | NASA / JSC | <https://images.nasa.gov/details/as12-46-6726> |
| Apollo 14 / Antares | `PIA14003` | NASA / GSFC / Arizona State University | <https://images.nasa.gov/details/PIA14003> · <https://science.nasa.gov/photojournal/new-view-of-apollo-14/> |
| Apollo 15 / Falcon | `as15-86-11603` | NASA / JSC | <https://images.nasa.gov/details/as15-86-11603> |
| Apollo 16 / Orion | `as16-115-18549` | NASA / JSC | <https://images.nasa.gov/details/as16-115-18549> |
| Apollo 17 / Challenger | `S72-55421` | NASA / JSC | <https://images.nasa.gov/details/S72-55421> |
| Surveyor 1 | `PIA02976` | NASA / JPL | <https://images.nasa.gov/details/PIA02976> |
| Viking 1 | NSSDC `vl1_p17428` | NASA / JPL | <https://nssdc.gsfc.nasa.gov/imgcat/html/object_page/vl1_p17428.html> |
| Viking 2 | NSSDC `vl2_p17686` | NASA / JPL | <https://nssdc.gsfc.nasa.gov/imgcat/html/object_page/vl2_p17686.html> |
| Mars Pathfinder / Sojourner | `PIA00621` | NASA / JPL | <https://images.nasa.gov/details/PIA00621> |
| Spirit | `PIA05248` | NASA / JPL / Malin Space Science Systems | <https://images.nasa.gov/details/PIA05248> |
| Opportunity | `PIA17759` | NASA / JPL-Caltech / Cornell University / Arizona State University | <https://images.nasa.gov/details/PIA17759> |
| Phoenix | `PIA11718` | NASA / JPL-Caltech / University of Arizona / Texas A&M University | <https://images.nasa.gov/details/PIA11718> |
| InSight | `PIA22876` | NASA / JPL-Caltech | <https://images.nasa.gov/details/PIA22876> |
| Ingenuity | `PIA24542` | NASA / JPL-Caltech / MSSS | <https://images.nasa.gov/details/PIA24542> |

### Mission and factual sources

| Mission / object | NASA source |
|---|---|
| Apollo 11 | <https://www.nasa.gov/mission/apollo-11/> |
| Apollo 12 | <https://www.nasa.gov/mission/apollo-12/> |
| Apollo 14 | <https://www.nasa.gov/mission/apollo-14/> |
| Apollo 15 | <https://www.nasa.gov/mission/apollo-15/> |
| Apollo 16 | <https://www.nasa.gov/mission/apollo-16/> |
| Apollo 17 | <https://www.nasa.gov/mission/apollo-17/> |
| Surveyor 1 | <https://science.nasa.gov/mission/surveyor-1/> |
| Viking 1 | <https://science.nasa.gov/mission/viking-1/> |
| Viking 2 | <https://science.nasa.gov/mission/viking-2/> |
| Mars Pathfinder | <https://science.nasa.gov/mission/mars-pathfinder/> |
| Spirit (MER-A) | <https://science.nasa.gov/mission/mer-spirit/> |
| Opportunity (MER-B) | <https://science.nasa.gov/mission/mer-opportunity/> |
| Phoenix | <https://science.nasa.gov/mission/phoenix/> |
| InSight | <https://science.nasa.gov/mission/insight/> |
| Ingenuity | <https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/> |

The `source_url` field in each GeoJSON feature is the mission page above; the
image source and credit are shown both in the local image and in this README.

## Project structure

```text
.
├── index.html
├── serve.py                 # static server with Range support for PMTiles
├── css/styles.css
├── js/app.js
├── data/
│   ├── objects.geojson
│   └── strings.json
├── assets/
│   ├── favicon.svg
│   ├── images/              # 15 optimized local NASA photographs
│   └── tiles/
│       ├── moon.pmtiles
│       └── mars.pmtiles
├── vendor/                  # MapLibre GL + PMTiles + licence copies
├── tools/                   # optional offline asset-generation scripts
├── LICENSE                  # Apache-2.0
├── THIRD_PARTY_NOTICES.md
└── README.md
```

## Licences

- **Code and original editorial content:** Apache License 2.0 — see `LICENSE`.
- **MapLibre GL JS 5.9.0:** BSD-3-Clause — `vendor/LICENSE-maplibre.txt`.
- **PMTiles 4.3.0:** BSD-3-Clause — `vendor/LICENSE-pmtiles.txt`.
- **NASA photographs and basemaps:** NASA-produced material, credited above.
  NASA does not endorse this project.

See `THIRD_PARTY_NOTICES.md` for details.
