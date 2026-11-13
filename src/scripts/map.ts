import {
  Map as MapLibre,
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  AttributionControl,
  setWorkerUrl,
  type GeoJSONSource,
  type StyleSpecification,
  type MapLayerMouseEvent,
} from 'maplibre-gl';
import type * as GeoJSON from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../styles/map.css';
// The ESM build resolves its worker relative to its own URL, which bundling breaks; point it at the copied file.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

setWorkerUrl(workerUrl);

type LngLat = [number, number];
type Mode = 'flight' | 'drive' | 'train';

export interface RouteFeature {
  type: 'Feature';
  id: string;
  properties: { trip: string; mode: Mode; phase: number; label: string | null; miles: number };
  geometry: { type: 'LineString'; coordinates: LngLat[] };
}
export interface ParkPoint {
  id: string;
  name: string;
  city: string;
  lng: number;
  lat: number;
  q: number | null;
  final: boolean;
  trips: string[];
}
export interface ChapterInfo {
  id: string;
  title: string;
  year: number;
  when: string;
  kind: 'home' | 'quest' | 'bonus' | 'epilogue';
  parks: string[];
  q: number[];
  bounds: [number, number, number, number];
  phases: number;
}
export interface MapData {
  routes: { type: 'FeatureCollection'; features: RouteFeature[] };
  parks: ParkPoint[];
  chapters: ChapterInfo[];
}

export interface Hooks {
  onPark(park: ParkPoint): void;
  onTrip(tripId: string): void;
  onUserMove(): void;
}

export interface JourneyMap {
  /** Frame a trip and draw its route. Returns how long the drawing takes (ms). */
  focus(id: string): number;
  replay(): number;
  flyToPark(id: string): void;
  overview(): void;
}

const ESRI = 'https://services.arcgisonline.com/ArcGIS/rest/services/';
const ROUTE = '#ff7d33';
const EMPTY = { type: 'FeatureCollection' as const, features: [] as GeoJSON.Feature[] };

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isWide = () => matchMedia('(min-width: 1024px)').matches;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface AnimLeg {
  coords: LngLat[];
  cum: number[];
  total: number;
  phase: number;
  mode: Mode;
}

function prepLeg(f: RouteFeature): AnimLeg {
  const coords = f.geometry.coordinates;
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0];
    const dy = coords[i][1] - coords[i - 1][1];
    cum.push(cum[i - 1] + Math.hypot(dx, dy));
  }
  return { coords, cum, total: cum[cum.length - 1] || 1, phase: f.properties.phase, mode: f.properties.mode };
}

function slice(leg: AnimLeg, t: number): LngLat[] {
  if (t >= 1) return leg.coords;
  const target = leg.total * t;
  let i = 1;
  while (i < leg.cum.length - 1 && leg.cum[i] < target) i++;
  const a = leg.coords[i - 1];
  const b = leg.coords[i];
  const span = leg.cum[i] - leg.cum[i - 1] || 1;
  const f = Math.min(1, Math.max(0, (target - leg.cum[i - 1]) / span));
  return [...leg.coords.slice(0, i), [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]];
}

export async function createMap(container: HTMLElement, shell: HTMLElement, data: MapData, hooks: Hooks): Promise<JourneyMap> {
  const chapters = new Map(data.chapters.map((c) => [c.id, c]));
  const parks = new Map(data.parks.map((p) => [p.id, p]));
  const legsByTrip = new Map<string, AnimLeg[]>();
  for (const f of data.routes.features) {
    const list = legsByTrip.get(f.properties.trip) ?? [];
    list.push(prepLeg(f));
    legsByTrip.set(f.properties.trip, list);
  }

  const all = data.routes.features.flatMap((f) => f.geometry.coordinates).concat(data.parks.map((p) => [p.lng, p.lat] as LngLat));
  const allBounds: [LngLat, LngLat] = [
    [Math.min(...all.map((c) => c[0])), Math.min(...all.map((c) => c[1]))],
    [Math.max(...all.map((c) => c[0])), Math.max(...all.map((c) => c[1]))],
  ];

  const style: StyleSpecification = {
    version: 8,
    projection: { type: 'globe' },
    sky: {
      'sky-color': '#0b1218',
      'horizon-color': '#24343d',
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 0.6, 7, 0],
    },
    sources: {
      imagery: {
        type: 'raster',
        tiles: [`${ESRI}World_Imagery/MapServer/tile/{z}/{y}/{x}`],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
      },
      labels: {
        type: 'raster',
        tiles: [`${ESRI}Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`],
        tileSize: 256,
        maxzoom: 19,
      },
      routes: { type: 'geojson', data: data.routes as GeoJSON.FeatureCollection },
      active: { type: 'geojson', data: EMPTY },
      heads: { type: 'geojson', data: EMPTY },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#0b1218' } },
      {
        id: 'imagery',
        type: 'raster',
        source: 'imagery',
        paint: { 'raster-saturation': -0.3, 'raster-brightness-max': 0.8, 'raster-contrast': 0.06, 'raster-fade-duration': 200 },
      },
      { id: 'labels', type: 'raster', source: 'labels', paint: { 'raster-opacity': 0.8 } },
      {
        id: 'routes-all',
        type: 'line',
        source: 'routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#f3eee4',
          'line-opacity': 0.55,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.9, 6, 1.6, 10, 2.4],
        },
      },
      {
        id: 'routes-hit',
        type: 'line',
        source: 'routes',
        paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 14 },
      },
      {
        id: 'active-casing',
        type: 'line',
        source: 'active',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#0a0d10',
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.55, 15, 0.1],
          'line-width': ['match', ['get', 'mode'], 'flight', 5, 7],
        },
      },
      {
        id: 'active-solid',
        type: 'line',
        source: 'active',
        filter: ['!=', ['get', 'mode'], 'train'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ROUTE,
          'line-width': ['match', ['get', 'mode'], 'flight', 2.4, 3.6],
          // down at a ballpark, a flight path is just a stripe across the field
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 12, 1, 15, ['match', ['get', 'mode'], 'flight', 0.15, 0.6]],
        },
      },
      {
        id: 'active-train',
        type: 'line',
        source: 'active',
        filter: ['==', ['get', 'mode'], 'train'],
        paint: { 'line-color': ROUTE, 'line-width': 3.6, 'line-dasharray': [1.2, 1.4] },
      },
      {
        id: 'heads',
        type: 'circle',
        source: 'heads',
        paint: { 'circle-radius': 4.5, 'circle-color': '#fff', 'circle-stroke-color': ROUTE, 'circle-stroke-width': 2.5 },
      },
    ],
  };

  const wide = isWide();
  const map = new MapLibre({
    container,
    style,
    bounds: allBounds,
    fitBoundsOptions: { padding: wide ? 80 : 30 },
    attributionControl: false,
    cooperativeGestures: true,
    dragRotate: wide,
    pitchWithRotate: wide,
    touchPitch: false,
    maxPitch: 60,
    fadeDuration: 0,
    locale: {
      'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl + scroll to zoom the map',
      'CooperativeGesturesHandler.MacHelpText': '⌘ + scroll to zoom the map',
      'CooperativeGesturesHandler.MobileHelpText': 'Two fingers to move the map',
    },
  });

  map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
  if (wide) map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new FullscreenControl({ container: shell }), 'top-right');

  // A failed tile fires 'error' too, so only 'load' gates startup.
  await new Promise<void>((resolve) => map.once('load', () => resolve()));
  // the compact attribution starts expanded; fold it so it doesn't sit on the buttons
  container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');

  /* ---------- pins ---------- */
  const pins = new Map<string, HTMLButtonElement>();
  const hoverPopup = new Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'map-tip' });

  for (const p of data.parks) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `pin${p.q ? ' q' : ' extra'}${p.final ? ' final' : ''}`;
    el.setAttribute('aria-label', `${p.name}${p.q ? `, park number ${p.q}` : ''}`);
    el.innerHTML = p.q ? `<span>${p.q}</span>` : '<span></span>';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      hooks.onPark(p);
    });
    el.addEventListener('mouseenter', () => {
      hoverPopup.setLngLat([p.lng, p.lat]).setHTML(`<strong>${p.name}</strong><span>${p.city}</span>`).addTo(map);
    });
    el.addEventListener('mouseleave', () => hoverPopup.remove());
    new Marker({ element: el, anchor: 'center' }).setLngLat([p.lng, p.lat]).addTo(map);
    pins.set(p.id, el);
  }

  const setPins = (on: string[] | null, target?: string) => {
    for (const [id, el] of pins) {
      el.classList.toggle('is-on', !!on && on.includes(id));
      el.classList.toggle('is-off', !!on && !on.includes(id));
      el.classList.toggle('is-target', id === target);
    }
  };

  const syncZoom = () => shell.classList.toggle('is-close', map.getZoom() > 13.5);
  map.on('zoom', syncZoom);

  /* ---------- route hover / click ---------- */
  map.on('mousemove', 'routes-hit', (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) return;
    map.getCanvas().style.cursor = 'pointer';
    const c = chapters.get(f.properties.trip as string);
    const label = f.properties.label ? `${f.properties.label} · ` : '';
    hoverPopup
      .setLngLat(e.lngLat)
      .setHTML(`<strong>${c?.title ?? ''}</strong><span>${c?.when ?? ''} · ${label}${Number(f.properties.miles).toLocaleString()} mi</span>`)
      .addTo(map);
  });
  map.on('mouseleave', 'routes-hit', () => {
    map.getCanvas().style.cursor = '';
    hoverPopup.remove();
  });
  map.on('click', 'routes-hit', (e: MapLayerMouseEvent) => {
    const trip = e.features?.[0]?.properties.trip as string | undefined;
    if (trip) hooks.onTrip(trip);
  });

  map.on('dragstart', () => hooks.onUserMove());

  /* ---------- drawing ---------- */
  const activeSrc = map.getSource('active') as GeoJSONSource;
  const headsSrc = map.getSource('heads') as GeoJSONSource;
  let raf = 0;
  let current: string | null = null;

  function draw(id: string, delay = 0): number {
    cancelAnimationFrame(raf);
    const legs = legsByTrip.get(id) ?? [];
    if (!legs.length) {
      activeSrc.setData(EMPTY);
      headsSrc.setData(EMPTY);
      return 0;
    }
    const phases = Math.max(...legs.map((l) => l.phase)) + 1;
    const per = Math.min(850, Math.max(480, 2300 / phases));
    const total = phases * per;

    const frame = (elapsed: number) => {
      const lines: GeoJSON.Feature[] = [];
      const heads: GeoJSON.Feature[] = [];
      for (const leg of legs) {
        const t = Math.min(1, Math.max(0, (elapsed - leg.phase * per) / per));
        if (t <= 0) continue;
        const coords = slice(leg, ease(t));
        lines.push({ type: 'Feature', properties: { mode: leg.mode }, geometry: { type: 'LineString', coordinates: coords } });
        if (t < 1) heads.push({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: coords[coords.length - 1] } });
      }
      activeSrc.setData({ type: 'FeatureCollection', features: lines });
      headsSrc.setData({ type: 'FeatureCollection', features: heads });
    };

    if (reducedMotion()) {
      frame(Infinity);
      return 0;
    }
    activeSrc.setData(EMPTY);
    headsSrc.setData(EMPTY);
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= 0) frame(elapsed);
      if (elapsed < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return total + delay;
  }

  const padding = () =>
    isWide() ? { top: 100, bottom: 80, left: 70, right: 70 } : { top: 62, bottom: 52, left: 26, right: 26 };

  function frameChapter(c: ChapterInfo) {
    const [w, s, e, n] = c.bounds;
    const duration = reducedMotion() ? 0 : 1700;
    if (e - w < 0.25 && n - s < 0.25) {
      map.flyTo({ center: [(w + e) / 2, (s + n) / 2], zoom: c.parks.length > 1 ? 11.3 : 12.2, pitch: 0, bearing: 0, duration, essential: true });
    } else {
      map.fitBounds([[w, s], [e, n]], { padding: padding(), maxZoom: 8.5, pitch: 0, bearing: 0, duration, essential: true });
    }
  }

  function focus(id: string): number {
    const c = chapters.get(id);
    if (!c) return 0;
    current = id;
    setPins(c.parks);
    map.setPaintProperty('routes-all', 'line-opacity', ['case', ['==', ['get', 'trip'], id], 0, 0.2]);
    frameChapter(c);
    return draw(id, 300);
  }

  function replay(): number {
    if (!current) return 0;
    const c = chapters.get(current)!;
    frameChapter(c);
    return draw(current, 300);
  }

  function flyToPark(id: string) {
    const p = parks.get(id);
    if (!p) return;
    setPins(current ? chapters.get(current)!.parks : [id], id);
    map.flyTo({
      center: [p.lng, p.lat],
      zoom: 16.3,
      pitch: isWide() ? 55 : 40,
      bearing: -20,
      duration: reducedMotion() ? 0 : 2600,
      curve: 1.5,
      essential: true,
    });
  }

  function overview() {
    cancelAnimationFrame(raf);
    current = null;
    activeSrc.setData(EMPTY);
    headsSrc.setData(EMPTY);
    setPins(null);
    map.setPaintProperty('routes-all', 'line-opacity', 0.55);
    map.fitBounds(allBounds, { padding: isWide() ? 80 : 30, pitch: 0, bearing: 0, duration: reducedMotion() ? 0 : 1600, essential: true });
  }

  return { focus, replay, flyToPark, overview };
}
