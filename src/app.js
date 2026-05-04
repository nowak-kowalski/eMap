// ── MAP ──────────────────────────────────────────
maptilersdk.config.apiKey = 'gSXSPkeM3926xJRmw1X3';

const PERM_KRAI_BOUNDS = [
  [51.7723768, 56.1052433],
  [59.482505, 61.663234],
];

function getPolygonOuterRings(geojson) {
  const rings = [];
  geojson.features.forEach(feature => {
    const geom = feature.geometry;
    if (!geom) return;
    if (geom.type === 'Polygon') rings.push(geom.coordinates[0]);
    if (geom.type === 'MultiPolygon') geom.coordinates.forEach(poly => rings.push(poly[0]));
  });
  return rings;
}

function createOutsideBoundaryMask(geojson) {
  const worldRing = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [worldRing, ...getPolygonOuterRings(geojson)],
      },
    }],
  };
}

function createDitherPattern() {
  const canvas = document.createElement('canvas');
  canvas.width = 12;
  canvas.height = 12;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.beginPath();
  ctx.arc(2.5, 2.5, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8.5, 8.5, 0.9, 0, Math.PI * 2);
  ctx.fill();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

const map = new maptilersdk.Map({
  container: 'map',
  style: maptilersdk.MapStyle.PASTEL,
  center: [56.2267825910626, 58.01031658708361],   // MapTiler: [lng, lat]
  zoom: 13.5,
  minZoom: 6,
  maxBounds: PERM_KRAI_BOUNDS,
  renderWorldCopies: false,
  pitch: 30,
  bearing: 15,
  navigationControl: false,
  geolocateControl: false,
  fullscreenControl: false,
  attributionControl: true,
});

map.on('load', () => {
  map.resize();
  map.setLanguage(maptilersdk.Language.RUSSIAN);

  const P = {
    land:       '#FDEBD0',   // самый светлый — основа, земля
    land_sub:   '#FDEBD0',   // кварталы — тот же тон
    water:      '#7EC8E3',   // вода — голубой (тест)
    waterway:   '#5BAED0',   // реки
    park:       '#F7CAC9',   // парки — тот же светлый розовый
    forest:     '#F7CAC9',   // леса
    building:   '#FDEBD0',   // здания — сливаются с землёй, тихо
    road_hw:    '#DC143C',   // магистрали — насыщенный кримсон, главный акцент
    road_major: '#DC143C',   // первичные — тот же кримсон
    road_sec:   '#F75270',   // вторичные — средний розово-красный
    road_minor: '#F7CAC9',   // переулки — самый тихий розовый
    road_case:  '#FDEBD0',   // обводка — цвет земли
    boundary:   '#DC143C',   // границы — кримсон
    deep:       '#DC143C',
  };

  map.getStyle().layers.forEach(layer => {
    try {
      const id  = layer.id.toLowerCase();
      const sl  = (layer['source-layer'] || '').toLowerCase();

      // ── Скрыть иконки POI ──────────────────────────
      if (layer.type === 'symbol' && layer.layout?.['icon-image'] !== undefined) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
        return;
      }

      // ── Фон земли ──────────────────────────────────
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', P.land);
        return;
      }

      if (layer.type === 'fill') {
        // Вода
        if (sl === 'water' || id.includes('water')) {
          map.setPaintProperty(layer.id, 'fill-color', P.water);
          map.setPaintProperty(layer.id, 'fill-opacity', 1);
        }
        // Парки, газоны, зелень
        else if (sl === 'park' || id.includes('park') || id.includes('grass')
              || id.includes('garden') || id.includes('pitch') || id.includes('recreation')) {
          map.setPaintProperty(layer.id, 'fill-color', P.park);
        }
        // Леса, кустарники
        else if (id.includes('wood') || id.includes('forest') || id.includes('scrub')
              || id.includes('vegetation')) {
          map.setPaintProperty(layer.id, 'fill-color', P.forest);
        }
        // Покров земли (landcover)
        else if (sl === 'landcover') {
          const color = id.includes('wood') || id.includes('forest') ? P.forest : P.park;
          map.setPaintProperty(layer.id, 'fill-color', color);
        }
        // Здания
        else if (sl === 'building' || id.includes('building')) {
          map.setPaintProperty(layer.id, 'fill-color', P.building);
          map.setPaintProperty(layer.id, 'fill-opacity', 0.85);
        }
        // Общий landuse — жилые кварталы чуть светлее земли
        else if (sl === 'landuse' || id.includes('landuse')) {
          map.setPaintProperty(layer.id, 'fill-color', P.land_sub);
          map.setPaintProperty(layer.id, 'fill-opacity', 1);
        }
        // Песок, пляж
        else if (id.includes('sand') || id.includes('beach')) {
          map.setPaintProperty(layer.id, 'fill-color', P.land_sub);
        }
      }

      if (layer.type === 'line') {
        // Вода — берег, русла
        if (sl === 'waterway' || id.includes('waterway')) {
          map.setPaintProperty(layer.id, 'line-color', P.waterway);
        }
        // Граница воды
        else if (id.includes('water') && !id.includes('road') && !id.includes('transport')) {
          map.setPaintProperty(layer.id, 'line-color', P.waterway);
        }
        // Магистрали — оранжевый акцент
        else if (id.includes('motorway') || id.includes('trunk')) {
          map.setPaintProperty(layer.id, 'line-color',
            id.includes('case') || id.includes('outline') ? P.road_case : P.road_hw);
        }
        // Первичные улицы — глубокий красный
        else if (id.includes('primary')) {
          map.setPaintProperty(layer.id, 'line-color',
            id.includes('case') || id.includes('outline') ? P.road_case : P.road_major);
        }
        // Вторичные — средний красный
        else if (id.includes('secondary')) {
          map.setPaintProperty(layer.id, 'line-color',
            id.includes('case') || id.includes('outline') ? P.road_case : P.road_sec);
        }
        // Переулки и жилые — тихий розовый
        else if (sl === 'transportation' || id.includes('road') || id.includes('street')
              || id.includes('residential')) {
          map.setPaintProperty(layer.id, 'line-color',
            id.includes('case') || id.includes('outline') ? P.road_case : P.road_minor);
        }
        // Границы
        else if (sl === 'boundary' || id.includes('boundary') || id.includes('border')) {
          map.setPaintProperty(layer.id, 'line-color', P.boundary);
          map.setPaintProperty(layer.id, 'line-opacity', 0.5);
        }
      }
      // ── 3D здания всегда объёмные на максимум ───────
      if (layer.type === 'fill-extrusion') {
        try {
          // Видны с любого зума
          map.setLayerZoomRange(layer.id, 0, 24);
          // Высота — всегда реальная из данных, без зависимости от зума
          // Минимум 12м чтобы даже маленькие здания были заметны
          map.setPaintProperty(layer.id, 'fill-extrusion-height', [
            'max',
            ['coalesce', ['get', 'render_height'], ['get', 'height'], 0],
            12
          ]);
          map.setPaintProperty(layer.id, 'fill-extrusion-base',
            ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0]);
          map.setPaintProperty(layer.id, 'fill-extrusion-color', P.building);
          map.setPaintProperty(layer.id, 'fill-extrusion-opacity', 0.92);
        } catch(_) {}
      }

    } catch(_) { /* пропускаем несовместимые слои */ }
  });

  if (window.PERM_KRAI_GEOJSON && !map.getSource('perm-krai-boundary')) {
    map.addSource('perm-krai-boundary', {
      type: 'geojson',
      data: window.PERM_KRAI_GEOJSON,
    });

    map.addSource('perm-krai-outside-mask', {
      type: 'geojson',
      data: createOutsideBoundaryMask(window.PERM_KRAI_GEOJSON),
    });

    if (!map.hasImage('outside-dither-pattern')) {
      map.addImage('outside-dither-pattern', createDitherPattern(), { pixelRatio: 1 });
    }

    map.addLayer({
      id: 'perm-krai-outside-mask',
      type: 'fill',
      source: 'perm-krai-outside-mask',
      paint: {
        'fill-color': '#e5ddd2',
        'fill-opacity': 1,
      },
    });

    map.addLayer({
      id: 'perm-krai-outside-dither',
      type: 'fill',
      source: 'perm-krai-outside-mask',
      paint: {
        'fill-pattern': 'outside-dither-pattern',
        'fill-opacity': 1,
      },
    });

    map.addLayer({
      id: 'perm-krai-boundary-line',
      type: 'line',
      source: 'perm-krai-boundary',
      paint: {
        'line-color': '#ff4e50',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.2, 10, 2, 14, 4],
        'line-opacity': 0.95,
      },
    });
  }

  // ── Скрыть малые реки + убрать Пермянку ─────────
  const HIDE_NAMES   = ['Пермянка', 'Permyanka', 'Permjanka'];
  const MINOR_CLASSES = ['stream', 'stream_intermittent', 'drain', 'ditch', 'minor'];

  map.getStyle().layers.forEach(layer => {
    const sl = (layer['source-layer'] || '').toLowerCase();
    const id = layer.id.toLowerCase();
    try {
      // Waterway слои — оставляем только крупные реки, без туннелей
      if (sl === 'waterway' || id.includes('waterway')) {
        const onlyMajor   = ['!', ['in', ['get', 'class'], ['literal', MINOR_CLASSES]]];
        const noTunnel    = ['!=', ['get', 'brunnel'], 'tunnel'];
        const noNames     = HIDE_NAMES.map(n => ['!=', ['get', 'name'], n]);
        map.setFilter(layer.id, ['all', onlyMajor, noTunnel, ...noNames]);
        if (layer.type === 'symbol') {
          map.setPaintProperty(layer.id, 'text-color', '#DC143C');
          map.setPaintProperty(layer.id, 'text-halo-color', '#FDEBD0');
          map.setPaintProperty(layer.id, 'text-halo-width', 1.5);
        }
      }
      // Остальные symbol-слои не трогаем — их фильтры несовместимы с простым merge
    } catch(_) {}
  });

  // ── 3D MODELS (GLB) ─────────────────────────────────
  // Добавь сюда свои точки с моделями:
  //  - `model`: путь (для сервера это обычно `models/<file>.glb`)
  //  - `scale`: множитель к базовому масштабу "под карту"
  //  - `rotationDeg`: [x, y, z] в градусах
  //  - `altitude`: высота в "условных метрах" (обычно 0)
  const modelPOIs = [
    // Пример:
    // { lat: 58.0135, lng: 56.2390, model: 'models/example-1.glb', scale: 1, rotationDeg: [0, 0, 0], altitude: 0 },
  ];

  const modelLayer = {
    id: 'poi-3d-models',
    type: 'custom',
    renderingMode: '3d',
    onAdd(map, gl) {
      if (modelPOIs.length === 0) return;
      this.camera = new THREE.Camera();
      this.scene = new THREE.Scene();
      this._matrix = new THREE.Matrix4();

      this.renderer = new THREE.WebGLRenderer({
        canvas: gl.canvas,
        context: gl,
        antialias: true,
        alpha: true,
      });
      this.renderer.autoClear = false;

      this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const dir = new THREE.DirectionalLight(0xffffff, 0.95);
      dir.position.set(100, 200, 100);
      this.scene.add(dir);

      // ── Волна над Камой ──────────────────────────

      // ── GLB модели (если есть) ───────────────────
      if (modelPOIs.length > 0) {
        const loader = new THREE.GLTFLoader();
        loader.setCrossOrigin('anonymous');
        modelPOIs.forEach((poi) => {
          if (!poi?.model) return;
          loader.load(poi.model, (gltf) => {
            const obj = gltf.scene;
            const mc = maptilersdk.MercatorCoordinate.fromLngLat([poi.lng, poi.lat], poi.altitude ?? 0);
            const s = mc.meterInMercatorCoordinateUnits();
            obj.scale.setScalar(s * (poi.scale ?? 1));
            obj.position.set(mc.x, mc.y, mc.z);
            const r = poi.rotationDeg || [0, 0, 0];
            const toRad = (d) => (d * Math.PI) / 180;
            obj.rotateX(toRad(r[0])); obj.rotateY(toRad(r[1])); obj.rotateZ(toRad(r[2]));
            this.scene.add(obj);
          }, undefined, (err) => console.error('GLB load failed:', poi.model, err));
        });
      }
    },
    render(gl, matrix) {
      if (!this.renderer) return;
      this._matrix.fromArray(matrix);
      this.camera.projectionMatrix = this._matrix;
      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);
    }
  };

  map.addLayer(modelLayer);

  // ── WATER FILLS ─────────────────────────────────
  map.once('idle', () => {
    try {
      map.setLayoutProperty('Water', 'visibility', 'none');
      map.setLayoutProperty('Water intermittent', 'visibility', 'none');
    } catch(_) {}

    // Вставляем перед первым дорожным слоем чтобы мосты были поверх
    const firstRoadLayer = map.getStyle().layers.find(l => {
      const sl = (l['source-layer'] || '').toLowerCase();
      const id = l.id.toLowerCase();
      return sl === 'transportation' || id === 'road' || id.includes('bridge') || id.includes('tunnel');
    });

    const BIG_WATER = ['in', ['get', 'class'], ['literal', ['river', 'lake', 'ocean', 'reservoir']]];
    const SMALL_WATER = ['!', BIG_WATER];

    if (!map.getLayer('water-small')) {
      map.addLayer({
        id: 'water-small',
        type: 'fill',
        source: 'maptiler_planet',
        'source-layer': 'water',
        filter: SMALL_WATER,
        paint: { 'fill-color': '#7EC8E3', 'fill-opacity': 1 }
      }, firstRoadLayer?.id);
    }

    if (!map.getLayer('water-big-base')) {
      map.addLayer({
        id: 'water-big-base',
        type: 'fill',
        source: 'maptiler_planet',
        'source-layer': 'water',
        filter: BIG_WATER,
        paint: { 'fill-color': '#7EC8E3', 'fill-opacity': 1 }
      }, firstRoadLayer?.id);
    }
  });
});

// ── PLACES ───────────────────────────────────────
const places = window.PLACES || [];

places.forEach((p, i) => {
  const el = document.createElement('div');
  el.className = `map-pin ${p.cls}`;
  el.id = `pin-${i}`;
  el.textContent = p.emoji;

el.addEventListener('click', (e) => { e.stopPropagation(); showPopup(p, i); });

  new maptilersdk.Marker({
    element: el,
    anchor: 'center',
    pitchAlignment: 'viewport',
    rotationAlignment: 'viewport',
  })
    .setLngLat([p.lng, p.lat])
    .addTo(map);
});

// ── POPUP ─────────────────────────────────────────
const popup = document.getElementById('placePopup');
let activePin = null;

function showPopup(place, idx) {
  document.getElementById('popupImg').src = place.img;
  const badge = document.getElementById('popupBadge');
  const badgeImg = document.getElementById('popupBadgeImg');
  if (place.badgeImg) {
    badge.style.display = 'none';
    badgeImg.src = place.badgeImg;
    badgeImg.style.display = 'block';
  } else {
    badge.style.display = 'inline-block';
    badge.textContent = place.type;
    badge.style.background = place.color;
    badgeImg.style.display = 'none';
  }
  document.getElementById('popupName').textContent = place.name;
  document.getElementById('popupVenue').textContent = place.venue;
  document.getElementById('popupDate').textContent = place.date;
  document.getElementById('popupPrice').textContent = place.price;
  document.getElementById('popupBtn').href = place.url;
  popup.classList.add('show');

  if (activePin !== null) document.getElementById('pin-' + activePin)?.classList.remove('pulse');
  activePin = idx;
  document.getElementById('pin-' + idx)?.classList.add('pulse');
}

window.closePopup = closePopup;
function closePopup() {
  popup.classList.remove('show');
  if (activePin !== null) {
    document.getElementById('pin-' + activePin)?.classList.remove('pulse');
    activePin = null;
  }
}

map.on('click', closePopup);

// ── SHOW ON MAP ────────────────────────────────────
window.showOnMap = showOnMap;
function showOnMap(lat, lng) {
  closeSheet();
  closePopup();
  map.flyTo({ center: [lng, lat], zoom: 16, duration: 800, essential: true });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

function eventBadgeMarkup(event) {
  if (event.badgeImg) {
    return `<img src="${escapeHtml(event.badgeImg)}" class="${escapeHtml(event.badgeImgClass)}" alt="${escapeHtml(event.badgeAlt || '')}">`;
  }

  return `<span class="badge-left ${escapeHtml(event.badgeClass)}">${escapeHtml(event.badge)}</span>`;
}

function renderEvents(events) {
  evList.innerHTML = events.map((event, index) => `
    <div class="ecard">
      <div class="ecard-thumb">
        <img src="${escapeHtml(event.img)}" alt="${escapeHtml(event.imgAlt || event.title)}">
        ${eventBadgeMarkup(event)}
      </div>
      <div class="ecard-body">
        <div class="ecard-top">
          <div class="ecard-title">${escapeHtml(event.title)}</div>
          <span class="ecard-date-chip">${escapeHtml(event.date)}</span>
        </div>
        <div class="ecard-desc">${escapeHtml(event.desc)}</div>
        <div class="ecard-footer">
          <div class="ecard-venue">
            <span class="venue-name">${escapeHtml(event.venue)}</span>
            <span class="venue-addr">${escapeHtml(event.addr)}</span>
          </div>
          <div class="ecard-actions">
            <span class="price-tag">${escapeHtml(event.price)}</span>
            <button class="btn-map" type="button" data-event-index="${index}">📍</button>
          </div>
        </div>
      </div>
    </div>`).join('');

  evList.querySelectorAll('[data-event-index]').forEach(button => {
    button.addEventListener('click', () => {
      const event = events[Number(button.dataset.eventIndex)];
      if (event) showOnMap(event.lat, event.lng);
    });
  });
}

// ── BOTTOM SHEET ───────────────────────────────────
const sheet    = document.getElementById('sheet');
const handle   = document.getElementById('sheetHandle');
const hint     = document.getElementById('sheetHint');
const evList   = document.getElementById('eventsList');
renderEvents(window.EVENTS || []);
let isOpen     = false;
let dragging   = false;
let startY     = 0;
let startTY    = 0;

function getTY() {
  const m = new DOMMatrix(getComputedStyle(sheet).transform);
  return m.m42;
}

handle.addEventListener('click', () => {
  if (!dragging) isOpen ? closeSheet() : openSheet();
});

handle.addEventListener('touchstart', e => {
  dragging = false;
  startY  = e.touches[0].clientY;
  startTY = getTY();
  sheet.style.transition = 'none';
}, { passive: true });

handle.addEventListener('touchmove', e => {
  const dy = e.touches[0].clientY - startY;
  if (Math.abs(dy) > 5) dragging = true;
  const ny = Math.max(0, startTY + dy);
  sheet.style.transform = `translateY(${ny}px)`;
}, { passive: true });

handle.addEventListener('touchend', () => {
  sheet.style.transition = '';
  const cur = getTY();
  cur < sheet.offsetHeight * 0.35 ? openSheet() : closeSheet();
  setTimeout(() => { dragging = false; }, 60);
});

evList.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });

document.querySelector('.popup-close')?.addEventListener('click', closePopup);

const afishaArrow = document.querySelector('.afisha-arrow');

function openSheet() {
  isOpen = true;
  sheet.style.transform = '';
  sheet.classList.add('is-open');
  if (hint) hint.textContent = '↓ свернуть';
  if (afishaArrow) afishaArrow.style.opacity = '0';
  if (afishaArrow) afishaArrow.style.pointerEvents = 'none';
}

function closeSheet() {
  isOpen = false;
  sheet.style.transform = '';
  sheet.classList.remove('is-open');
  if (hint) hint.textContent = '↑ события недели';
  if (afishaArrow) afishaArrow.style.opacity = '1';
  if (afishaArrow) afishaArrow.style.pointerEvents = 'all';
}

// ── FILTER CHIPS ───────────────────────────────────
window.filterChip = filterChip;
function filterChip(el, type) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

// Fix map size on desktop frame
setTimeout(() => map.resize(), 100);
