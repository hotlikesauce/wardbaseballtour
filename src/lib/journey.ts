/**
 * Build-time joins: trips + photos + box scores + highlight clips + route geometry.
 * Nothing here ships to the browser except what pages choose to serialize.
 */
import type { ImageMetadata } from 'astro';
import {
  TRIPS, PARKS, OCTOBER, HOU, DEN,
  type Trip, type Visit, type Park, type Segment, type LatLng, type Mode,
} from '../data/journey';
import photosJson from '../data/photos.json';
import gamesJson from '../data/games.json';
import highlightsJson from '../data/highlights.json';
import roadsJson from '../data/road_routes.json';
import { CAPTIONS } from '../data/captions';
import { haversine, pathLength, greatCircle, simplify, roadKey, round5 } from './geo';

/* ---------- photos ---------- */

// Every glob match gets bundled, so leave out the stray duplicates that aren't in photos.json
const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  [
    '../assets/photos/*.{jpg,jpeg,JPG,JPEG,png,PNG}',
    '!../assets/photos/20220628_171229.jpg',
    '!../assets/photos/20250502_153616(0).jpg',
  ],
  { eager: true },
);
const IMAGES = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(imageModules)) {
  IMAGES.set(decodeURIComponent(path.split('/').pop()!), mod.default);
}

export interface Photo {
  file: string;
  img: ImageMetadata;
  date: string | null;
  stadium: string;
  alt: string;
  caption?: string;
  /** width / height after EXIF rotation */
  ratio: number;
}

const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });

export const shortDate = (iso: string) => fmtDate(iso, { month: 'short', day: 'numeric' });
export const longDate = (iso: string) => fmtDate(iso);

type RawPhoto = { file: string; stadium: string; trip: string; date: string | null };

const photosByTrip = new Map<string, Photo[]>();
for (const raw of photosJson as RawPhoto[]) {
  const file = raw.file.split('/').pop()!;
  const img = IMAGES.get(file);
  if (!img) {
    if (/\.heic$/i.test(file)) continue; // browsers can't show HEIC; a .jpg copy sits beside it
    throw new Error(`photos.json lists ${file}, but it isn't in src/assets/photos (check case and that it's committed)`);
  }
  const caption = CAPTIONS[file];
  // Uncaptioned photos get the park name only: several stadium tags are "nearest park" guesses
  const alt = caption ?? raw.stadium.replace(/ \(WBC 2026\)/, '');
  const list = photosByTrip.get(raw.trip) ?? [];
  list.push({ file, img, date: raw.date, stadium: raw.stadium, alt, caption, ratio: img.width / img.height });
  photosByTrip.set(raw.trip, list);
}

export function getImage(file: string): ImageMetadata {
  const img = IMAGES.get(file);
  if (!img) throw new Error(`Missing photo: ${file}`);
  return img;
}

/* ---------- games ---------- */

export interface TeamLine {
  id: number;
  abbr: string;
  name: string;
  r: number;
  h: number | null;
  e: number | null;
  innings: (number | null)[];
}

export interface Game {
  pk: number;
  date: string;
  type: string;
  series: string;
  seriesGame: number;
  venue: string;
  away: TeamLine;
  home: TeamLine;
  w: string | null;
  l: string | null;
  sv: string | null;
  note?: string;
  clips: number;
}

export interface Clip {
  title: string;
  desc?: string;
  duration?: string;
  thumb?: string;
  url: string;
}

const GAMES = (gamesJson as unknown as { games: Record<string, Omit<Game, 'note' | 'clips'>> }).games;
const POSTSEASON = (gamesJson as unknown as { postseason: Record<string, number> }).postseason;

type RawHighlight = { gamePk?: number; highlights: Clip[] };
const CLIPS = new Map<number, Clip[]>();
for (const g of Object.values(highlightsJson as Record<string, RawHighlight>)) {
  if (!g.gamePk || !g.highlights?.length) continue;
  CLIPS.set(
    g.gamePk,
    g.highlights.map((c) => ({
      title: c.title,
      desc: c.desc,
      duration: c.duration?.replace(/^00:0?/, ''),
      // MLB's image CDN takes resize params in the path; 1920px thumbs are overkill
      thumb: c.thumb?.replace(/w_\d+,h_\d+/, 'w_480,h_270'),
      url: c.url,
    })),
  );
}

export function getGame(pk: number, note?: string): Game | undefined {
  const g = GAMES[String(pk)];
  if (!g) return undefined;
  return { ...g, note, clips: CLIPS.get(pk)?.length ?? 0 };
}

export function getClips(): Record<number, Clip[]> {
  return Object.fromEntries(CLIPS);
}

export const ROUND_NAMES: Record<string, string> = {
  F: 'Wild Card', D: 'Division Series', L: 'LCS', W: 'World Series',
};

export function getOctober() {
  return OCTOBER.map(({ key, note }) => {
    const [season, type, num] = key.split('-');
    const game = getGame(POSTSEASON[key], note);
    if (!game) throw new Error(`Missing postseason game ${key}`);
    const league = game.series?.startsWith('AL') ? 'AL' : game.series?.startsWith('NL') ? 'NL' : '';
    const round = type === 'W' ? 'WS' : `${league}${type === 'L' ? 'CS' : 'DS'}`;
    return { key, season: Number(season), round, num: Number(num), game };
  });
}

/* ---------- routes ---------- */

const ROADS = roadsJson as unknown as Record<string, LatLng[]>;
const isOrigin = (p: LatLng) => (p[0] === HOU[0] && p[1] === HOU[1]) || (p[0] === DEN[0] && p[1] === DEN[1]);

interface Leg {
  seg: Segment;
  path: LatLng[];
  miles: number;
  phase: number;
}

function buildLegs(trip: Trip): Leg[] {
  const middle = trip.segments.filter((s, i) => !(i > 0 && isOrigin(s.to)) && !isOrigin(s.from));
  return trip.segments.map((seg, i) => {
    let path: LatLng[];
    let miles: number;
    if (seg.mode === 'flight') {
      const d = haversine(seg.from, seg.to);
      path = greatCircle(seg.from, seg.to, Math.max(24, Math.round(d / 25)));
      miles = d;
    } else {
      const road = ROADS[roadKey(seg.from, seg.to)];
      path = road ? simplify(road, 0.004) : [seg.from, seg.to];
      miles = road ? pathLength(road) : haversine(seg.from, seg.to);
    }
    const inbound = i > 0 && isOrigin(seg.to);
    const phase = inbound ? middle.length + 1 : isOrigin(seg.from) ? 0 : middle.indexOf(seg) + 1;
    return { seg, path, miles, phase };
  });
}

/* ---------- chapters ---------- */

export interface Stop {
  visit: Visit;
  park: Park;
  games: Game[];
}

export interface Chapter extends Omit<Trip, 'segments'> {
  index: number;
  photos: Photo[];
  coverPhoto?: Photo;
  stops: Stop[];
  miles: number;
  flights: number;
  modes: Mode[];
  legs: Leg[];
}

const byDate = (a: Photo, b: Photo) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.file.localeCompare(b.file);

export const CHAPTERS: Chapter[] = TRIPS.map((trip, index) => {
  const all = (photosByTrip.get(trip.id) ?? []).filter((p) => !trip.hide?.includes(p.file)).sort(byDate);
  const coverPhoto = trip.cover ? all.find((p) => p.file === trip.cover) : all[0];
  const photos = coverPhoto ? [coverPhoto, ...all.filter((p) => p !== coverPhoto)] : all;
  const legs = buildLegs(trip);
  const stops = trip.visits.map((visit) => {
    const park = PARKS[visit.park];
    if (!park) throw new Error(`Unknown park ${visit.park}`);
    const games = (visit.games ?? []).map((g) => getGame(g.pk, g.note)).filter((g): g is Game => !!g);
    games.sort((a, b) => a.date.localeCompare(b.date));
    return { visit, park, games };
  });
  const modes = [...new Set(trip.segments.map((s) => s.mode))];
  const { segments: _segments, ...rest } = trip;
  return {
    ...rest,
    index,
    photos,
    coverPhoto,
    stops,
    legs,
    modes,
    miles: Math.round(legs.reduce((sum, l) => sum + l.miles, 0)),
    flights: legs.filter((l) => l.seg.mode === 'flight').length,
  };
});

/** The thirty, in quest order */
export const QUEST = CHAPTERS.flatMap((c) =>
  c.stops.filter((s) => s.visit.q).map((s) => ({ q: s.visit.q!, park: s.park, chapter: c, final: !!s.visit.final })),
).sort((a, b) => a.q - b.q);

const questYears = QUEST.filter((x) => x.chapter.kind !== 'home').map((x) => x.chapter.year);

export const STATS = {
  parks: QUEST.length,
  firstYear: Math.min(...questYears),
  lastYear: Math.max(...questYears),
  miles: CHAPTERS.reduce((s, c) => s + c.miles, 0),
  flights: CHAPTERS.reduce((s, c) => s + c.flights, 0),
  october: OCTOBER.length,
  games: new Set([
    ...CHAPTERS.flatMap((c) => c.stops.flatMap((s) => s.games.map((g) => g.pk))),
    ...Object.values(POSTSEASON),
  ]).size,
};

/* ---------- map payload ---------- */

const ll = (p: LatLng): [number, number] => [round5(p[1]), round5(p[0])];

export function mapPayload() {
  const routes = {
    type: 'FeatureCollection' as const,
    features: CHAPTERS.flatMap((c) =>
      c.legs.map((leg, i) => ({
        type: 'Feature' as const,
        id: `${c.id}-${i}`,
        properties: { trip: c.id, mode: leg.seg.mode, phase: leg.phase, label: leg.seg.label ?? null, miles: Math.round(leg.miles) },
        geometry: { type: 'LineString' as const, coordinates: leg.path.map(ll) },
      })),
    ),
  };

  const parkTrips = new Map<string, { trips: string[]; q?: number; final?: boolean }>();
  for (const c of CHAPTERS) {
    for (const s of c.stops) {
      const entry = parkTrips.get(s.park.id) ?? { trips: [] };
      entry.trips.push(c.id);
      if (s.visit.q) entry.q = s.visit.q;
      if (s.visit.final) entry.final = true;
      parkTrips.set(s.park.id, entry);
    }
  }
  const parks = [...parkTrips.entries()].map(([id, e]) => {
    const p = PARKS[id];
    return { id, name: p.name, city: p.city, lng: p.lng, lat: p.lat, q: e.q ?? null, final: !!e.final, trips: e.trips };
  });

  const chapters = CHAPTERS.map((c) => {
    const pts: LatLng[] = [...c.legs.flatMap((l) => l.path), ...c.stops.map((s) => [s.park.lat, s.park.lng] as LatLng)];
    const lngs = pts.map((p) => p[1]);
    const lats = pts.map((p) => p[0]);
    return {
      id: c.id,
      title: c.title,
      year: c.year,
      when: c.when,
      kind: c.kind,
      parks: c.stops.map((s) => s.park.id),
      q: c.stops.map((s) => s.visit.q).filter(Boolean),
      bounds: [round5(Math.min(...lngs)), round5(Math.min(...lats)), round5(Math.max(...lngs)), round5(Math.max(...lats))],
      phases: Math.max(0, ...c.legs.map((l) => l.phase)) + (c.legs.length ? 1 : 0),
    };
  });

  return { routes, parks, chapters };
}
