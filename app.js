/* global maplibregl, pmtiles */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const dom = {
    html: document.documentElement,
    mapStage: $(".map-stage"),
    mapEl: $("#map"),
    mapTitle: $("#mapTitle"),
    mapSummary: $("#mapSummary"),
    basemapLink: $("#basemapLink"),
    mapEmpty: $("#mapEmpty"),
    mapLoading: $("#mapLoading"),
    mapError: $("#mapError"),
    mapInstructions: $("#mapInstructions"),
    story: $("#story"),
    yearRange: $("#yearRange"),
    yearOutput: $("#yearOutput"),
    visibleCount: $("#visibleCount"),
    timelineNote: $("#timelineNote"),
    heroMeta: $("#heroMeta"),
    siteIndex: $("#siteIndex"),
    dialog: $("#objectPanel"),
    panelKicker: $("#panelKicker"),
    panelContent: $("#panelContent"),
    panelClose: $("#panelClose"),
    zoomIn: $("#zoomIn"),
    zoomOut: $("#zoomOut"),
    resetView: $("#resetView"),
    resetTimeline: $("#resetTimeline"),
  };

  const state = {
    lang: "en",
    strings: null,
    features: [],
    geo: null,
    map: null,
    mapReady: false,
    mapErrorShown: false,
    body: "moon",
    minYear: 1966,
    maxYear: 2024,
    year: 2024,
    markers: [],
    markerEls: new Map(),
    activeChapterEl: null,
    activeFocusId: null,
    selectedId: null,
    panelTrigger: null,
    scrollRaf: 0,
    loadingTimer: 0,
  };

  const supportedLangs = ["en", "bn"];

  function t(key, vars = {}) {
    const pack = state.strings && state.strings[state.lang] ? state.strings[state.lang] : {};
    const fallback = state.strings && state.strings.en ? state.strings.en : {};
    let value = pack[key] ?? fallback[key] ?? key;
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
    return value;
  }

  function locale() {
    return state.lang === "bn" ? "bn-BD" : "en-GB";
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(locale()).format(value);
  }

  function formatDecimal(value, digits = 3) {
    return new Intl.NumberFormat(locale(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  function formatYear(value) {
    return new Intl.NumberFormat(locale(), { useGrouping: false }).format(value);
  }

  function formatDate(iso) {
    if (!iso) return "";
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) return iso;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return new Intl.DateTimeFormat(locale(), {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function localized(feature, field) {
    const key = `${field}_${state.lang}`;
    return feature.properties[key] || feature.properties[field] || "";
  }

  function normalizeBody(body) {
    return String(body).toLowerCase() === "mars" ? "mars" : "moon";
  }

  function bodyName(body) {
    return t(`body.${normalizeBody(body)}`);
  }

  function bodyFeatures(body = state.body) {
    return state.features.filter(
      (feature) => normalizeBody(feature.properties.body) === normalizeBody(body)
    );
  }

  function visibleFeatures(body = state.body) {
    return bodyFeatures(body).filter((feature) => feature.properties.left_behind <= state.year);
  }

  function featureById(id) {
    return state.features.find((feature) => feature.properties.dataset_id === id);
  }

  function coordinates(feature) {
    const lat = Number(feature.properties.lat);
    const lon = Number(feature.properties.lon);
    const ns = t(lat >= 0 ? "coord.n" : "coord.s");
    const ew = t(lon >= 0 ? "coord.e" : "coord.w");
    return `${formatDecimal(Math.abs(lat))}Â° ${ns}, ${formatDecimal(Math.abs(lon))}Â° ${ew}`;
  }

  /* ---------- Localisation ---------- */

  function applyStrings() {
    $$("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    $$("[data-i18n-aria]").forEach((node) => {
      node.setAttribute("aria-label", t(node.dataset.i18nAria));
    });

    dom.html.lang = state.lang;
    document.title = t("meta.title");
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", t("meta.description"));

    const brand = $(".brand");
    if (brand) brand.setAttribute("aria-label", t("brand.aria"));

    const mapControls = $(".map-controls");
    if (mapControls) mapControls.setAttribute("aria-label", t("map.controls"));

    dom.story.setAttribute("aria-label", t("story.aria"));

    $$(".world-switch [data-body]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.body === state.body));
      button.classList.toggle("is-active", button.dataset.body === state.body);
    });
    $$("[data-lang]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.lang === state.lang));
      button.classList.toggle("is-active", button.dataset.lang === state.lang);
    });
  }

  function setLang(lang, { persist = true } = {}) {
    if (!supportedLangs.includes(lang)) return;
    state.lang = lang;
    if (persist) {
      try {
        localStorage.setItem("left-behind:lang", lang);
      } catch {
        /* localStorage can be unavailable in private contexts */
      }
    }
    applyStrings();
    updateTimelineUI();
    updateMapCopy();
    updateHeroMeta();
    renderMarkers();
    renderSiteIndex();
    if (dom.dialog.open && state.selectedId) {
      const scroll = $(".panel-scroll");
      const top = scroll ? scroll.scrollTop : 0;
      const selected = featureById(state.selectedId);
      if (selected) renderPanel(selected);
      const nextScroll = $(".panel-scroll");
      if (nextScroll) nextScroll.scrollTop = top;
    }
    requestAnimationFrame(updateActiveChapter);
  }

  /* ---------- Data and UI ---------- */

  function updateHeroMeta() {
    const years = state.features.map((feature) => feature.properties.left_behind);
    if (!years.length) return;
    dom.heroMeta.textContent = t("story.meta", {
      count: formatNumber(state.features.length),
      start: formatYear(Math.min(...years)),
      end: formatYear(Math.max(...years)),
    });
  }

  function updateTimelineUI() {
    const span = Math.max(1, state.maxYear - state.minYear);
    const pct = ((state.year - state.minYear) / span) * 100;
    dom.yearRange.style.setProperty("--pct", `${Math.max(0, Math.min(100, pct))}%`);
    dom.yearOutput.textContent = formatYear(state.year);
    const visible = visibleFeatures().length;
    const total = bodyFeatures().length;
    const countKey = visible === 1 ? "timeline.visibleOne" : "timeline.visibleMany";
    dom.visibleCount.textContent = t(countKey, {
      count: formatNumber(visible),
      total: formatNumber(total),
    });
    dom.yearRange.setAttribute(
      "aria-valuetext",
      t("timeline.aria", {
        year: formatYear(state.year),
        count: formatNumber(visible),
        total: formatNumber(total),
      })
    );
    dom.mapEmpty.hidden = visible !== 0;
    updateMapCopy();
  }

  function updateMapCopy() {
    if (!dom.mapTitle) return;
    dom.mapTitle.textContent = bodyName(state.body);

    const all = bodyFeatures();
    const visible = visibleFeatures();
    const years = all.map((feature) => feature.properties.left_behind);
    const start = years.length ? formatYear(Math.min(...years)) : "â€”";
    const end = years.length ? formatYear(Math.max(...years)) : "â€”";
    const summaryKey = visible.length === 1 ? "map.summaryOne" : "map.summaryMany";
    dom.mapSummary.textContent = t(summaryKey, {
      count: formatNumber(visible.length),
      body: bodyName(state.body),
      start,
      end,
    });

    const isMars = state.body === "mars";
    dom.basemapLink.href = isMars ? "https://trek.nasa.gov/mars/" : "https://trek.nasa.gov/moon/";
    dom.basemapLink.textContent = t(isMars ? "map.creditMars" : "map.creditMoon");
    dom.mapStage.dataset.body = state.body;
  }

  function setYear(year) {
    state.year = Math.max(state.minYear, Math.min(state.maxYear, Number(year)));
    dom.yearRange.value = String(state.year);
    updateTimelineUI();
    renderMarkers();
    renderSiteIndex();
  }

  function renderSiteIndex() {
    if (!dom.siteIndex) return;
    dom.siteIndex.replaceChildren();

    let any = false;
    for (const body of ["moon", "mars"]) {
      const visible = visibleFeatures(body).sort(
        (a, b) => a.properties.left_behind - b.properties.left_behind
      );
      if (!visible.length) continue;
      any = true;

      const group = document.createElement("section");
      group.className = "index-group";
      const heading = document.createElement("h3");
      heading.textContent = t(body === "moon" ? "index.moon" : "index.mars");
      group.append(heading);

      const list = document.createElement("ul");
      for (const feature of visible) {
        const props = feature.properties;
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "site-link";
        button.dataset.open = props.dataset_id;

        const name = document.createElement("span");
        name.className = "site-link-name";
        name.textContent = localized(feature, "name");

        const meta = document.createElement("span");
        meta.className = "site-link-meta";
        meta.textContent = `${localized(feature, "mission")} Â· ${formatYear(props.left_behind)}`;

        button.setAttribute("aria-haspopup", "dialog");
        button.append(name, meta);
        item.append(button);
        list.append(item);
      }
      group.append(list);
      dom.siteIndex.append(group);
    }

    if (!any) {
      const empty = document.createElement("p");
      empty.className = "index-empty";
      empty.textContent = t("index.empty");
      dom.siteIndex.append(empty);
    }
  }

  /* ---------- Map ---------- */

  function sourceUrl(name) {
    const base = new URL(".", document.baseURI).href;
    return `pmtiles://${new URL(`assets/tiles/${name}.pmtiles`, base).href}/{z}/{x}/{y}`;
  }

  function installLocalPmtilesProtocol() {
    // Load each archive once as an ArrayBuffer and serve tile slices in memory.
    // This deliberately avoids requiring HTTP Range support, so the atlas also
    // works with VS Code Live Server, `python -m http.server` and simple static
    // hosts that return a normal 200 response for the .pmtiles file.
    const archives = new Map();

    function loadArchive(url) {
      if (!archives.has(url)) {
        const pending = fetch(url)
          .then((response) => {
            if (!response.ok) throw new Error(`PMTiles request failed (${response.status}): ${url}`);
            return response.arrayBuffer();
          })
          .then((buffer) => {
            const source = {
              getKey: () => url,
              getBytes: async (offset, length) => ({
                data: buffer.slice(offset, offset + length),
              }),
            };
            return new pmtiles.PMTiles(source);
          })
          .catch((error) => {
            archives.delete(url);
            console.error("Could not load local PMTiles archive", error);
            showMapError();
            throw error;
          });
        archives.set(url, pending);
      }
      return archives.get(url);
    }

    maplibregl.addProtocol("pmtiles", async (request) => {
      const match = /^pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)$/.exec(request.url);
      if (!match) throw new Error(`Invalid PMTiles protocol URL: ${request.url}`);
      const archive = await loadArchive(match[1]);
      const tile = await archive.getZxy(Number(match[2]), Number(match[3]), Number(match[4]));
      if (!tile) return { data: new Uint8Array(0) };
      return { data: new Uint8Array(tile.data) };
    });
  }

  function initMap() {
    if (!window.maplibregl || !window.pmtiles) {
      showMapError();
      return;
    }

    try {
      installLocalPmtilesProtocol();
    } catch {
      /* Protocol registration can be skipped if a hot reload already added it. */
    }

    const style = {
      version: 8,
      sources: {
        moon: {
          type: "raster",
          tiles: [sourceUrl("moon")],
          tileSize: 512,
          minzoom: 0,
          maxzoom: 4,
          bounds: [-180, -85, 180, 85],
          attribution: "NASA Moon Trek / LRO WAC",
        },
        mars: {
          type: "raster",
          tiles: [sourceUrl("mars")],
          tileSize: 512,
          minzoom: 0,
          maxzoom: 4,
          bounds: [-180, -85, 180, 85],
          attribution: "NASA Mars Trek / Viking MDIM 2.1",
        },
      },
      layers: [
        {
          id: "space",
          type: "background",
          paint: { "background-color": "#05070c" },
        },
        {
          id: "moon-base",
          type: "raster",
          source: "moon",
          paint: { "raster-opacity": 0.96, "raster-resampling": "linear" },
        },
        {
          id: "mars-base",
          type: "raster",
          source: "mars",
          layout: { visibility: "none" },
          paint: { "raster-opacity": 0.96, "raster-resampling": "linear" },
        },
      ],
    };

    try {
      state.map = new maplibregl.Map({
        container: dom.mapEl,
        style,
        center: [8, 0],
        zoom: 0.7,
        minZoom: -0.3,
        maxZoom: 4.5,
        renderWorldCopies: false,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        keyboard: true,
        fadeDuration: 0,
        antialias: true,
      });
    } catch (error) {
      console.error("Map initialisation failed", error);
      showMapError();
      return;
    }

    state.map.on("load", () => {
      state.mapReady = true;
      state.mapErrorShown = false;
      dom.mapError.hidden = true;
      hideMapLoading();
      setBody(state.body, { camera: true });
      requestAnimationFrame(() => {
        state.map.resize();
        moveToOverview(state.body, 0);
      });
    });

    state.map.on("idle", hideMapLoading);
    state.map.on("error", (event) => {
      console.error("Map error", event && event.error ? event.error : event);
      if (!state.mapReady) {
        window.clearTimeout(state.loadingTimer);
        state.loadingTimer = window.setTimeout(() => {
          if (!state.mapReady) showMapError();
        }, 5000);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (state.map) state.map.resize();
    });
    resizeObserver.observe(dom.mapStage);

    state.loadingTimer = window.setTimeout(() => {
      if (!state.mapReady) showMapError();
    }, 14000);
  }

  function showMapError() {
    if (state.mapErrorShown) return;
    state.mapErrorShown = true;
    dom.mapError.hidden = false;
    hideMapLoading();
  }

  function hideMapLoading() {
    window.clearTimeout(state.loadingTimer);
    dom.mapLoading.classList.add("is-hidden");
  }

  function setBody(body, { camera = false } = {}) {
    if (body !== "moon" && body !== "mars") return;
    state.body = body;
    dom.mapStage.dataset.body = body;
    $$(".world-switch [data-body]").forEach((button) => {
      const selected = button.dataset.body === body;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    if (state.mapReady && state.map) {
      state.map.setLayoutProperty("moon-base", "visibility", body === "moon" ? "visible" : "none");
      state.map.setLayoutProperty("mars-base", "visibility", body === "mars" ? "visible" : "none");
    }

    renderMarkers();
    renderSiteIndex();
    updateMapCopy();
    updateTimelineUI();

    if (camera && state.mapReady) {
      moveToOverview(body, 900);
    }
  }

  function overviewTarget(body) {
    const width = Math.max(dom.mapStage.clientWidth || 800, 240);
    const height = Math.max(dom.mapStage.clientHeight || 600, 240);
    const zoom = Math.max(
      -0.25,
      Math.min(1.4, Math.min(Math.log2(width / 620), Math.log2(height / 500)))
    );
    return {
      center: body === "mars" ? [25, 0] : [8, 0],
      zoom,
    };
  }

  function moveToOverview(body, duration = 1000) {
    if (!state.map) return;
    const target = overviewTarget(body);
    state.map.stop();
    if (reduceMotion.matches || duration === 0) {
      state.map.jumpTo(target);
    } else {
      state.map.flyTo({ ...target, duration, curve: 1.35, essential: false });
    }
  }

  function moveToFeature(feature, zoom) {
    if (!state.mapReady || !state.map) return;
    state.map.stop();
    const target = {
      center: [Number(feature.properties.lon), Number(feature.properties.lat)],
      zoom: Math.min(4.5, Math.max(-0.3, Number(zoom) || 4.2)),
    };
    if (reduceMotion.matches) {
      state.map.jumpTo(target);
    } else {
      state.map.flyTo({ ...target, duration: 1400, curve: 1.45, essential: false });
    }
  }

  function createMarker(feature) {
    const props = feature.properties;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "site-marker";
    button.dataset.id = props.dataset_id;
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute(
      "aria-label",
      t("marker.aria", {
        name: localized(feature, "name"),
        mission: localized(feature, "mission"),
        year: formatYear(props.left_behind),
      })
    );

    const label = document.createElement("span");
    label.className = "marker-label";
    label.textContent = localized(feature, "name");
    button.append(label);

    if (state.selectedId === props.dataset_id) button.classList.add("is-selected");
    if (state.activeFocusId === props.dataset_id) button.classList.add("is-chapter-focus");

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openFeature(props.dataset_id, button);
    });

    return button;
  }

  function renderMarkers() {
    if (!state.mapReady || !state.map) return;

    for (const marker of state.markers) marker.remove();
    state.markers = [];
    state.markerEls.clear();

    const markerColor = state.body === "mars" ? "#ff8a5b" : "#b9d1ff";
    dom.mapStage.style.setProperty("--marker", markerColor);

    for (const feature of visibleFeatures(state.body)) {
      const element = createMarker(feature);
      const marker = new maplibregl.Marker({
        element,
        anchor: "center",
        pitchAlignment: "viewport",
        rotationAlignment: "viewport",
      })
        .setLngLat([Number(feature.properties.lon), Number(feature.properties.lat)])
        .addTo(state.map);
      state.markers.push(marker);
      state.markerEls.set(feature.properties.dataset_id, { marker, element });
    }
  }

  function applyMarkerFocus() {
    for (const [id, entry] of state.markerEls.entries()) {
      entry.element.classList.toggle("is-chapter-focus", id === state.activeFocusId);
      entry.element.classList.toggle("is-selected", id === state.selectedId);
    }
  }

  /* ---------- Scrollytelling ---------- */

  function updateActiveChapter() {
    const root = dom.story;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const trigger = rootRect.top + rootRect.height * 0.42;
    const chapters = $$(".chapter", root);
    let best = null;
    let bestDistance = Infinity;

    for (const chapter of chapters) {
      const rect = chapter.getBoundingClientRect();
      if (rect.top <= trigger && rect.bottom >= trigger) {
        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - trigger);
        if (distance < bestDistance) {
          best = chapter;
          bestDistance = distance;
        }
      }
    }

    if (best) activateChapter(best);
  }

  function activateChapter(chapter) {
    if (state.activeChapterEl === chapter) return;
    if (state.activeChapterEl) {
      state.activeChapterEl.classList.remove("is-active");
      state.activeChapterEl.removeAttribute("aria-current");
    }
    state.activeChapterEl = chapter;
    chapter.classList.add("is-active");
    chapter.setAttribute("aria-current", "step");

    if (chapter.dataset.body && chapter.dataset.body !== state.body) {
      setBody(chapter.dataset.body, { camera: false });
    }

    const feature = chapter.dataset.focus ? featureById(chapter.dataset.focus) : null;
    if (feature) {
      state.activeFocusId = feature.properties.dataset_id;
      applyMarkerFocus();
      moveToFeature(feature, Number(chapter.dataset.zoom));
    }
  }

  function scheduleChapterCheck() {
    if (state.scrollRaf) return;
    state.scrollRaf = requestAnimationFrame(() => {
      state.scrollRaf = 0;
      updateActiveChapter();
    });
  }

  /* ---------- The object panel ---------- */

  function renderPanel(feature) {
    const props = feature.properties;
    const name = localized(feature, "name");
    const mission = localized(feature, "mission");
    const why = localized(feature, "why_left");
    const science = localized(feature, "science_enabled");
    const note = localized(feature, "last_contact_note");
    const contact = props.last_contact ? formatDate(props.last_contact) : "â€”";
    const image = props.image || "";
    const imageAlt = localized(feature, "image_alt");

    dom.panelKicker.textContent = `${mission} Â· ${bodyName(props.body)}`;
    dom.panelContent.innerHTML = `
      <figure class="panel-figure">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(imageAlt)}" decoding="async">
        <figcaption>${t("panel.image")}: ${escapeHtml(props.image_credit || "NASA")}</figcaption>
      </figure>
      <h2 class="panel-title" id="panelTitle">${escapeHtml(name)}</h2>
      <dl class="panel-meta">
        <div>
          <dt>${t("panel.mission")}</dt>
          <dd>${escapeHtml(mission)}</dd>
        </div>
        <div>
          <dt>${t("panel.world")}</dt>
          <dd>${escapeHtml(bodyName(props.body))}</dd>
        </div>
        <div>
          <dt>${t("panel.left")}</dt>
          <dd>${formatYear(props.left_behind)}</dd>
        </div>
        <div>
          <dt>${t("panel.last")}</dt>
          <dd>${escapeHtml(contact)}${note ? `<span class="meta-note">${escapeHtml(note)}</span>` : ""}</dd>
        </div>
        <div>
          <dt>${t("panel.coordinates")}</dt>
          <dd>${escapeHtml(coordinates(feature))}<span class="meta-note">${t("panel.approx")}</span></dd>
        </div>
      </dl>
      <section class="panel-section">
        <h3>${t("panel.why")}</h3>
        <p>${escapeHtml(why)}</p>
      </section>
      <section class="panel-section">
        <h3>${t("panel.science")}</h3>
        <p>${escapeHtml(science)}</p>
      </section>
      <footer class="panel-citation">
        <h3>${t("panel.citation")}</h3>
        <dl>
          <dt>${t("panel.source")}</dt>
          <dd><a href="${escapeHtml(props.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(props.source_url)}</a></dd>
          <dt>${t("panel.dataset")}</dt>
          <dd><code>${escapeHtml(props.dataset_id)}</code></dd>
        </dl>
        <a class="panel-source-link" href="${escapeHtml(props.source_url)}" target="_blank" rel="noopener noreferrer">${t("panel.openSource")} <span aria-hidden="true">â†—</span></a>
      </footer>
    `;

    if (dom.dialog.open) {
      // aria-labelledby points at the title that was just replaced.
      dom.dialog.setAttribute("aria-labelledby", "panelTitle");
    }
  }

  function openFeature(id, trigger) {
    const feature = featureById(id);
    if (!feature) return;

    state.panelTrigger = trigger || document.activeElement;

    const yearChanged = feature.properties.left_behind > state.year;
    if (yearChanged) {
      state.year = feature.properties.left_behind;
      dom.yearRange.value = String(state.year);
      updateTimelineUI();
    }

    const featureBody = normalizeBody(feature.properties.body);
    if (featureBody !== state.body) {
      setBody(featureBody, { camera: false });
    } else if (yearChanged) {
      renderMarkers();
    }

    state.selectedId = id;
    state.activeFocusId = id;
    applyMarkerFocus();
    moveToFeature(feature, 4.2);
    renderPanel(feature);

    if (!dom.dialog.open) {
      dom.dialog.showModal();
    }
    requestAnimationFrame(() => dom.panelClose.focus());
  }

  function closePanel() {
    if (dom.dialog.open) dom.dialog.close();
  }

  function onDialogClosed() {
    const closedId = state.selectedId;
    state.selectedId = null;
    state.activeFocusId = state.activeChapterEl?.dataset.focus || null;
    applyMarkerFocus();

    const trigger = state.panelTrigger;
    state.panelTrigger = null;
    if (trigger && trigger.isConnected) {
      trigger.focus();
      return;
    }
    const marker = closedId ? state.markerEls.get(closedId) : null;
    if (marker && marker.element && marker.element.isConnected) {
      marker.element.focus();
      return;
    }
    dom.story.focus();
  }

  /* ---------- Wiring ---------- */

  function wireEvents() {
    $$(".world-switch [data-body]").forEach((button) => {
      button.addEventListener("click", () => setBody(button.dataset.body, { camera: true }));
    });

    $$("[data-lang]").forEach((button) => {
      button.addEventListener("click", () => setLang(button.dataset.lang));
    });

    dom.yearRange.addEventListener("input", () => {
      setYear(dom.yearRange.value);
    });

    dom.resetTimeline.addEventListener("click", () => {
      setYear(state.maxYear);
    });

    dom.zoomIn.addEventListener("click", () => {
      if (!state.map) return;
      state.map.zoomIn({ duration: reduceMotion.matches ? 0 : 240 });
    });

    dom.zoomOut.addEventListener("click", () => {
      if (!state.map) return;
      state.map.zoomOut({ duration: reduceMotion.matches ? 0 : 240 });
    });

    dom.resetView.addEventListener("click", () => moveToOverview(state.body, 500));

    $$(".chapter-link[data-open]").forEach((button) => {
      button.setAttribute("aria-haspopup", "dialog");
      button.addEventListener("click", () => openFeature(button.dataset.open, button));
    });

    dom.siteIndex.addEventListener("click", (event) => {
      const button = event.target.closest("[data-open]");
      if (button) openFeature(button.dataset.open, button);
    });

    dom.panelClose.addEventListener("click", closePanel);
    dom.dialog.addEventListener("close", onDialogClosed);
    dom.dialog.addEventListener("click", (event) => {
      if (event.target === dom.dialog) closePanel();
    });

    dom.story.addEventListener("scroll", scheduleChapterCheck, { passive: true });
    window.addEventListener("resize", scheduleChapterCheck);

    const skip = $(".skip-link");
    if (skip) {
      skip.addEventListener("click", (event) => {
        event.preventDefault();
        dom.story.focus();
        dom.story.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
      });
    }

    const brand = $(".brand");
    if (brand) {
      brand.addEventListener("click", (event) => {
        event.preventDefault();
        dom.story.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
        dom.story.focus();
      });
    }

    const scrollCue = $(".scroll-cue");
    if (scrollCue) {
      scrollCue.addEventListener("click", (event) => {
        event.preventDefault();
        const target = $("#chapter-1");
        if (target) {
          target.scrollIntoView({
            behavior: reduceMotion.matches ? "auto" : "smooth",
            block: "start",
          });
          const heading = target.querySelector("h2");
          if (heading) {
            heading.setAttribute("tabindex", "-1");
            heading.focus({ preventScroll: true });
          }
        }
      });
    }
  }

  async function loadData() {
    const [geoResponse, stringsResponse] = await Promise.all([
      fetch("data/objects.geojson"),
      fetch("data/strings.json"),
    ]);
    if (!geoResponse.ok || !stringsResponse.ok) {
      throw new Error("Could not load the atlas data.");
    }
    const [geo, strings] = await Promise.all([geoResponse.json(), stringsResponse.json()]);
    const required = [
      "dataset_id",
      "name",
      "mission",
      "body",
      "lat",
      "lon",
      "left_behind",
      "last_contact",
      "why_left",
      "science_enabled",
      "image",
      "image_credit",
      "source_url",
    ];

    state.geo = geo;
    state.strings = strings;
    state.features = (geo.features || []).filter((feature) => {
      const props = feature && feature.properties;
      if (!props || !required.every((key) => props[key] !== undefined && props[key] !== "")) {
        console.warn("Skipping incomplete feature", feature);
        return false;
      }
      return props.body === "Moon" || props.body === "Mars";
    });

    if (!state.features.length) throw new Error("The atlas has no valid features.");

    const years = state.features.map((feature) => Number(feature.properties.left_behind));
    state.minYear = Math.min(...years);
    state.maxYear = Math.max(...years);
    state.year = state.maxYear;

    // Optional deep links: ?body=mars&year=1997&lang=bn
    const params = new URLSearchParams(window.location.search);
    const bodyParam = String(params.get("body") || "").toLowerCase();
    if (bodyParam === "moon" || bodyParam === "mars") state.body = bodyParam;
    const yearParam = Number(params.get("year"));
    if (Number.isFinite(yearParam) && yearParam >= state.minYear && yearParam <= state.maxYear) {
      state.year = Math.round(yearParam);
    }

    dom.yearRange.min = String(state.minYear);
    dom.yearRange.max = String(state.maxYear);
    dom.yearRange.value = String(state.year);
    const mid = Math.round((state.minYear + state.maxYear) / 2);
    const midLabel = $(".timeline-scale-mid");
    if (midLabel) midLabel.textContent = formatYear(mid);
  }

  function chooseInitialLanguage() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("lang");
    if (supportedLangs.includes(requested)) return requested;
    try {
      const saved = localStorage.getItem("left-behind:lang");
      if (supportedLangs.includes(saved)) return saved;
    } catch {
      /* ignore */
    }
    const preferred = navigator.languages || [navigator.language || "en"];
    return preferred.some((language) => String(language).toLowerCase().startsWith("bn")) ? "bn" : "en";
  }

  async function init() {
    wireEvents();
    try {
      await loadData();
    } catch (error) {
      console.error(error);
      dom.mapStage.setAttribute("aria-busy", "false");
      dom.mapLoading.classList.add("is-hidden");
      dom.mapError.hidden = false;
      dom.mapError.querySelector(".map-error-title").textContent = "The atlas data could not load";
      dom.mapError.querySelector(".map-error-body").textContent =
        "Serve this folder with the included serve.py and reload the page.";
      return;
    }

    state.lang = chooseInitialLanguage();
    applyStrings();
    updateHeroMeta();
    updateTimelineUI();
    renderSiteIndex();
    initMap();
    requestAnimationFrame(() => {
      updateActiveChapter();
      dom.mapStage.setAttribute("aria-busy", "false");
    });
  }

  init();
})();
