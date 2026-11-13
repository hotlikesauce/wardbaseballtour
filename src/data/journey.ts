/**
 * Every trip, ballpark visit and travel leg, in chronological order.
 *
 * Coordinates are [lat, lng]. Drive/train legs look up real road geometry in
 * road_routes.json by their exact from/to coordinates, so keep those numbers
 * identical to tools/cache_routes.py when editing.
 *
 * Photos are attached by trip id from photos.json (tools/scan_photos.py).
 * Box scores come from games.json (tools/cache_games.py), keyed by gamePk.
 */

export type LatLng = [number, number];
export type Mode = 'flight' | 'drive' | 'train';
export type TripKind = 'home' | 'quest' | 'bonus' | 'epilogue';

export interface Park {
  id: string;
  name: string;
  city: string;
  team?: string;
  abbr?: string;
  lat: number;
  lng: number;
  /** Shown when the building no longer hosts its team */
  status?: string;
}

export interface GameRef {
  pk: number;
  note?: string;
}

export interface Visit {
  park: string;
  /** Quest number: one park per franchise, in order of first visit */
  q?: number;
  final?: boolean;
  who?: string;
  how?: string;
  notes: string;
  games?: GameRef[];
}

export interface Segment {
  from: LatLng;
  to: LatLng;
  mode: Mode;
  label?: string;
}

export interface Trip {
  id: string;
  kind: TripKind;
  title: string;
  when: string;
  year: number;
  who: string;
  summary?: string;
  /** Photo filename (no folder) used as the lead image */
  cover?: string;
  coverPosition?: string;
  /** Photos to leave out of the gallery */
  hide?: string[];
  quote?: { text: string; cite: string };
  visits: Visit[];
  segments: Segment[];
}

export const HOU: LatLng = [29.7573, -95.3556];
export const DEN: LatLng = [39.7559, -104.9942];

export const PARKS: Record<string, Park> = {
  astrodome: { id: 'astrodome', name: 'Astrodome', city: 'Houston, TX', team: 'Astros', abbr: 'HOU', lat: 29.685, lng: -95.4101, status: 'Astros left after 1999' },
  mmp: { id: 'mmp', name: 'Minute Maid Park', city: 'Houston, TX', team: 'Astros', abbr: 'HOU', lat: 29.7573, lng: -95.3556 },
  qualcomm: { id: 'qualcomm', name: 'Qualcomm Stadium', city: 'San Diego, CA', team: 'Padres', abbr: 'SD', lat: 32.7831, lng: -117.1196, status: 'Demolished 2021' },
  camden: { id: 'camden', name: 'Camden Yards', city: 'Baltimore, MD', team: 'Orioles', abbr: 'BAL', lat: 39.2838, lng: -76.6215 },
  chase: { id: 'chase', name: 'Chase Field', city: 'Phoenix, AZ', team: 'D-backs', abbr: 'ARI', lat: 33.4453, lng: -112.0667 },
  'yankee-old': { id: 'yankee-old', name: 'Yankee Stadium (old)', city: 'Bronx, NY', team: 'Yankees', abbr: 'NYY', lat: 40.8296, lng: -73.9272, status: 'Demolished 2010' },
  yankee: { id: 'yankee', name: 'Yankee Stadium', city: 'Bronx, NY', team: 'Yankees', abbr: 'NYY', lat: 40.8296, lng: -73.9261 },
  'globe-life-park': { id: 'globe-life-park', name: 'Globe Life Park', city: 'Arlington, TX', team: 'Rangers', abbr: 'TEX', lat: 32.7512, lng: -97.0832, status: 'Rangers moved out 2020' },
  angel: { id: 'angel', name: 'Angel Stadium', city: 'Anaheim, CA', team: 'Angels', abbr: 'LAA', lat: 33.8003, lng: -117.8827 },
  turner: { id: 'turner', name: 'Turner Field', city: 'Atlanta, GA', team: 'Braves', abbr: 'ATL', lat: 33.735, lng: -84.3897, status: 'Braves left after 2016' },
  rogers: { id: 'rogers', name: 'Rogers Centre', city: 'Toronto, ON', team: 'Blue Jays', abbr: 'TOR', lat: 43.6414, lng: -79.3894 },
  fenway: { id: 'fenway', name: 'Fenway Park', city: 'Boston, MA', team: 'Red Sox', abbr: 'BOS', lat: 42.3467, lng: -71.0972 },
  target: { id: 'target', name: 'Target Field', city: 'Minneapolis, MN', team: 'Twins', abbr: 'MIN', lat: 44.9817, lng: -93.2781 },
  coors: { id: 'coors', name: 'Coors Field', city: 'Denver, CO', team: 'Rockies', abbr: 'COL', lat: 39.7559, lng: -104.9942 },
  tmobile: { id: 'tmobile', name: 'T-Mobile Park', city: 'Seattle, WA', team: 'Mariners', abbr: 'SEA', lat: 47.5914, lng: -122.3325 },
  pnc: { id: 'pnc', name: 'PNC Park', city: 'Pittsburgh, PA', team: 'Pirates', abbr: 'PIT', lat: 40.4469, lng: -80.0057 },
  gabp: { id: 'gabp', name: 'Great American Ball Park', city: 'Cincinnati, OH', team: 'Reds', abbr: 'CIN', lat: 39.0979, lng: -84.5081 },
  truist: { id: 'truist', name: 'Truist Park', city: 'Atlanta, GA', team: 'Braves', abbr: 'ATL', lat: 33.8908, lng: -84.4678 },
  dodger: { id: 'dodger', name: 'Dodger Stadium', city: 'Los Angeles, CA', team: 'Dodgers', abbr: 'LAD', lat: 34.0739, lng: -118.24 },
  coliseum: { id: 'coliseum', name: 'Oakland Coliseum', city: 'Oakland, CA', team: "A's", abbr: 'OAK', lat: 37.7516, lng: -122.2006, status: "A's left after 2024" },
  oracle: { id: 'oracle', name: 'Oracle Park', city: 'San Francisco, CA', team: 'Giants', abbr: 'SF', lat: 37.7786, lng: -122.3893 },
  tropicana: { id: 'tropicana', name: 'Tropicana Field', city: 'St. Petersburg, FL', team: 'Rays', abbr: 'TB', lat: 27.7682, lng: -82.6534 },
  loandepot: { id: 'loandepot', name: 'loanDepot Park', city: 'Miami, FL', team: 'Marlins', abbr: 'MIA', lat: 25.7781, lng: -80.2196 },
  kauffman: { id: 'kauffman', name: 'Kauffman Stadium', city: 'Kansas City, MO', team: 'Royals', abbr: 'KC', lat: 39.0517, lng: -94.4803 },
  busch: { id: 'busch', name: 'Busch Stadium', city: 'St. Louis, MO', team: 'Cardinals', abbr: 'STL', lat: 38.6226, lng: -90.1928 },
  nationals: { id: 'nationals', name: 'Nationals Park', city: 'Washington, DC', team: 'Nationals', abbr: 'WSH', lat: 38.8731, lng: -77.0074 },
  citi: { id: 'citi', name: 'Citi Field', city: 'Queens, NY', team: 'Mets', abbr: 'NYM', lat: 40.7571, lng: -73.8458 },
  cbp: { id: 'cbp', name: 'Citizens Bank Park', city: 'Philadelphia, PA', team: 'Phillies', abbr: 'PHI', lat: 39.9061, lng: -75.1665 },
  amfam: { id: 'amfam', name: 'American Family Field', city: 'Milwaukee, WI', team: 'Brewers', abbr: 'MIL', lat: 43.028, lng: -87.9712 },
  petco: { id: 'petco', name: 'Petco Park', city: 'San Diego, CA', team: 'Padres', abbr: 'SD', lat: 32.7076, lng: -117.157 },
  'harp-helu': { id: 'harp-helu', name: 'Estadio Alfredo Harp Helú', city: 'Mexico City', lat: 19.4036, lng: -99.0853 },
  comerica: { id: 'comerica', name: 'Comerica Park', city: 'Detroit, MI', team: 'Tigers', abbr: 'DET', lat: 42.339, lng: -83.0485 },
  progressive: { id: 'progressive', name: 'Progressive Field', city: 'Cleveland, OH', team: 'Guardians', abbr: 'CLE', lat: 41.4962, lng: -81.6852 },
  'rate-field': { id: 'rate-field', name: 'Guaranteed Rate Field', city: 'Chicago, IL', team: 'White Sox', abbr: 'CWS', lat: 41.8299, lng: -87.6338 },
  wrigley: { id: 'wrigley', name: 'Wrigley Field', city: 'Chicago, IL', team: 'Cubs', abbr: 'CHC', lat: 41.9484, lng: -87.6553 },
};

const at = (id: string): LatLng => [PARKS[id].lat, PARKS[id].lng];

/** Out from home, legs between parks, then home again. Dad flies from Houston, Taylor from Denver. */
function roundTrip(stops: string[], legs: Mode[] = []): Segment[] {
  const first = at(stops[0]);
  const last = at(stops[stops.length - 1]);
  const segs: Segment[] = [
    { from: HOU, to: first, mode: 'flight', label: 'Dad' },
    { from: DEN, to: first, mode: 'flight', label: 'Taylor' },
  ];
  for (let i = 1; i < stops.length; i++) {
    segs.push({ from: at(stops[i - 1]), to: at(stops[i]), mode: legs[i - 1] ?? 'drive' });
  }
  segs.push({ from: last, to: HOU, mode: 'flight', label: 'Dad home' });
  segs.push({ from: last, to: DEN, mode: 'flight', label: 'Taylor home' });
  return segs;
}

export const TRIPS: Trip[] = [
  {
    id: 'home',
    kind: 'home',
    title: 'Houston',
    when: 'Fifty-plus seasons',
    year: 1975,
    who: 'Taylor + Dad',
    summary: 'Fifty years of season tickets. Never missed an Opening Day.',
    cover: '20221020_184442.jpg',
    visits: [
      {
        park: 'astrodome',
        notes: 'Birth stadium. Home from Day 1. The Eighth Wonder of the World.',
      },
      {
        park: 'mmp',
        q: 1,
        notes: 'Opening Day 2000. Hundreds of visits since. Home. Every October game attended is in the ledger at the bottom of the page.',
      },
    ],
    segments: [],
  },
  {
    id: '1992-sd',
    kind: 'quest',
    title: 'San Diego',
    when: '1992',
    year: 1992,
    who: 'Taylor + Dad',
    summary: 'Astros at Padres. Flew from Houston to Qualcomm. The first road park.',
    cover: 'San_Diego_1993.jpg',
    quote: {
      text: 'This is my son Taylor, age 3, in San Diego last year at an Astros game. He wanted to show off his Art Howe haircut.',
      cite: 'Rhonda Ward, Houston — newspaper clipping, 1993',
    },
    visits: [
      {
        park: 'qualcomm',
        q: 2,
        notes: 'Astros vs Padres. First road trip stadium. This is the visit that checks the Padres off the list.',
      },
    ],
    segments: [{ from: HOU, to: at('qualcomm'), mode: 'flight' }],
  },
  {
    id: '1999-bal',
    kind: 'quest',
    title: 'Baltimore',
    when: '1999',
    year: 1999,
    who: 'Whole family',
    visits: [{ park: 'camden', q: 3, notes: 'Whole family trip to Camden Yards.' }],
    segments: [{ from: HOU, to: at('camden'), mode: 'flight' }],
  },
  {
    id: '2006-az',
    kind: 'quest',
    title: 'Phoenix',
    when: 'May 2007',
    year: 2007,
    who: 'Whole family',
    visits: [
      { park: 'chase', q: 4, notes: 'Astros vs D-backs. Whole family went. Astros got crushed every single game.' },
    ],
    segments: [{ from: HOU, to: at('chase'), mode: 'flight' }],
  },
  {
    id: '2008-nyc',
    kind: 'quest',
    title: 'New York',
    when: 'August 15, 2008',
    year: 2008,
    who: 'Taylor + Dad',
    visits: [
      {
        park: 'yankee-old',
        q: 5,
        notes:
          'Yankees vs Royals. Tied 3-3 in the 9th, the Royals scored off Mariano Rivera and won 4-3. Taylor and Dad went alone. It was the old stadium’s last season. This is the visit that checks the Yankees off the list.',
        games: [{ pk: 235585 }],
      },
    ],
    segments: [{ from: HOU, to: at('yankee-old'), mode: 'flight' }],
  },
  {
    id: '2011-az',
    kind: 'bonus',
    title: 'Phoenix, again',
    when: 'August 2011',
    year: 2011,
    who: 'Taylor + Dad',
    visits: [
      {
        park: 'chase',
        how: 'Drove from Houston',
        notes: 'Drove out from Houston while moving Taylor to ASU, and caught a game on the way in. Second visit to Chase Field.',
      },
    ],
    segments: [{ from: HOU, to: [33.4453, -112.0667], mode: 'drive' }],
  },
  {
    id: '2014-ana',
    kind: 'quest',
    title: 'Anaheim',
    when: 'July 4, 2014',
    year: 2014,
    who: 'Taylor + Dad',
    cover: 'IMG_0323.JPG',
    visits: [
      {
        park: 'angel',
        q: 7,
        notes: 'Astros vs Angels on the Fourth of July. Mike Trout walked it off with a home run.',
        games: [{ pk: 381828, note: 'Trout walk-off HR' }],
      },
    ],
    segments: [
      { from: HOU, to: at('angel'), mode: 'flight', label: 'Dad' },
      { from: DEN, to: at('angel'), mode: 'flight', label: 'Taylor' },
    ],
  },
  {
    id: '2014-atl',
    kind: 'bonus',
    title: 'Atlanta',
    when: 'August 29, 2014',
    year: 2014,
    who: 'Taylor + James (friend)',
    cover: 'IMG_0500.JPG',
    visits: [
      {
        park: 'turner',
        notes:
          "Braves home game at Turner Field, their park from 1997 through 2016. Taylor went with a friend, James, not Dad. The Braves count at Truist Park in 2017, so this one's a bonus.",
        games: [{ pk: 382547 }],
      },
    ],
    segments: [{ from: DEN, to: at('turner'), mode: 'flight', label: 'Taylor' }],
  },
  {
    id: '2015-tor',
    kind: 'quest',
    title: 'Toronto',
    when: 'June 2015',
    year: 2015,
    who: 'Whole family',
    cover: 'IMG_3100.JPG',
    visits: [
      {
        park: 'rogers',
        q: 8,
        notes: 'Blue Jays vs Astros. Jays swept. Tough series. Whole family trip.',
        games: [{ pk: 414465 }, { pk: 414480 }, { pk: 414495 }],
      },
    ],
    segments: [
      { from: HOU, to: at('rogers'), mode: 'flight', label: 'Family' },
      { from: DEN, to: at('rogers'), mode: 'flight', label: 'Taylor' },
    ],
  },
  {
    id: '2015-bos',
    kind: 'quest',
    title: 'Boston',
    when: 'July 3–5, 2015',
    year: 2015,
    who: 'Taylor + Dad',
    cover: 'BOS_IMG_20260313_083348 (1).jpg',
    visits: [
      {
        park: 'fenway',
        q: 9,
        notes: 'Red Sox vs Astros over the Fourth. Carlos Correa put one over the Green Monster. One of the great cathedrals of baseball.',
        games: [
          { pk: 414851, note: 'Correa go-ahead HR over the Monster' },
          { pk: 414866 },
          { pk: 414881, note: 'Correa HR in the 7th' },
        ],
      },
    ],
    segments: [
      { from: HOU, to: at('fenway'), mode: 'flight', label: 'Dad' },
      { from: DEN, to: at('fenway'), mode: 'flight', label: 'Taylor' },
    ],
  },
  {
    id: 'nyc-new',
    kind: 'bonus',
    title: 'New York',
    when: 'August 26, 2015',
    year: 2015,
    who: 'Mom + Dad',
    cover: 'IMG_1652.JPG',
    visits: [
      {
        park: 'yankee',
        notes:
          'Mom and Dad went to the new Yankee Stadium, which opened in 2009 across the street from the original, then flew straight to Minneapolis to meet Taylor. Taylor has never been to this one.',
      },
    ],
    segments: [
      { from: HOU, to: at('yankee'), mode: 'flight', label: 'Mom & Dad' },
      { from: at('yankee'), to: at('target'), mode: 'flight', label: 'Mom & Dad to Minneapolis' },
    ],
  },
  {
    id: '2015-min',
    kind: 'quest',
    title: 'Minneapolis',
    when: 'August 28–30, 2015',
    year: 2015,
    who: 'Taylor, Mom, Dad + James Lagrasta',
    cover: 'IMG_1678.JPG',
    visits: [
      {
        park: 'target',
        q: 10,
        notes: 'Twins vs Astros. Mom and Dad came straight from New York; Taylor flew in from Denver. James Lagrasta came along.',
        games: [{ pk: 415565 }, { pk: 415580 }, { pk: 415595 }],
      },
    ],
    segments: [{ from: DEN, to: at('target'), mode: 'flight', label: 'Taylor' }],
  },
  {
    id: 'coors',
    kind: 'quest',
    title: 'Denver',
    when: 'Since 2016',
    year: 2016,
    who: 'Taylor (lives here)',
    cover: '20250801_201255.jpg',
    visits: [
      {
        park: 'coors',
        q: 11,
        notes:
          'First visit May 2016. Taylor lives in Denver now and has been here a million times. Mom and Dad came up on July 4, 2021, and again when the Astros were in town July 1–3, 2025.',
        games: [{ pk: 777285 }, { pk: 777269 }, { pk: 777264 }],
      },
    ],
    segments: [],
  },
  {
    id: '2016-sea',
    kind: 'quest',
    title: 'Seattle',
    when: 'July 2016',
    year: 2016,
    who: 'Whole family',
    cover: 'IMG_2967.JPG',
    visits: [
      {
        park: 'tmobile',
        q: 12,
        notes: 'Whole family trip to Seattle. Taylor went back on June 8, 2017 with Molly.',
      },
    ],
    segments: [
      { from: HOU, to: at('tmobile'), mode: 'flight', label: 'Family' },
      { from: DEN, to: at('tmobile'), mode: 'flight', label: 'Taylor' },
    ],
  },
  {
    id: '2017',
    kind: 'quest',
    title: 'Pittsburgh, Cincinnati, Atlanta',
    when: 'July 1–5, 2017',
    year: 2017,
    who: 'Taylor + Dad',
    summary: 'Flew into Pittsburgh, drove to Cincinnati, then down to Atlanta to meet the whole family for the Fourth.',
    cover: 'IMG_1301.JPG',
    visits: [
      { park: 'pnc', q: 13, how: 'Flew to Pittsburgh', notes: 'Pirates vs Giants. Start of the road trip.', games: [{ pk: 491318 }] },
      { park: 'gabp', q: 14, how: 'Drove from Pittsburgh', notes: 'Reds vs Cubs, Sunday afternoon.', games: [{ pk: 491325 }] },
      {
        park: 'truist',
        q: 15,
        how: 'Drove from Cincinnati',
        notes: 'Astros vs Braves. Absolute demolition. The whole family met up for the Fourth of July.',
        games: [{ pk: 491353 }, { pk: 491368 }],
      },
    ],
    segments: roundTrip(['pnc', 'gabp', 'truist']),
  },
  {
    id: '2018-west',
    kind: 'quest',
    title: 'Los Angeles, Oakland, San Francisco',
    when: 'August 3–7, 2018',
    year: 2018,
    who: 'Taylor + Dad + Whitney (+ Mom in LA)',
    summary: 'The World Series rematch road trip. Whitney came the whole way; Mom joined for LA.',
    visits: [
      {
        park: 'dodger',
        q: 16,
        how: 'Flew to LA',
        notes: 'Astros vs Dodgers, a World Series rematch.',
        games: [{ pk: 531055, note: "Verlander 14 K's" }, { pk: 531070 }],
      },
      { park: 'coliseum', q: 17, how: 'Drove from LA', notes: "Tigers at the A's. Drove up from LA.", games: [{ pk: 531084 }] },
      {
        park: 'oracle',
        q: 18,
        how: 'Drove from Oakland',
        notes: 'Astros vs Giants. Clean sweep. Sick seats.',
        games: [{ pk: 531097 }, { pk: 531110 }],
      },
    ],
    segments: roundTrip(['dodger', 'coliseum', 'oracle']),
  },
  {
    id: '2019-fla',
    kind: 'quest',
    title: 'Tampa, Miami',
    when: 'March 28–31, 2019',
    year: 2019,
    who: 'Taylor + Dad',
    summary: 'Astros Opening Day on the road: three in St. Petersburg, then down to Miami.',
    cover: '20190328_155922.jpg',
    visits: [
      {
        park: 'tropicana',
        q: 19,
        how: 'Flew to Tampa',
        notes: 'Astros Opening Day on the road.',
        games: [{ pk: 566664, note: 'Opening Day' }, { pk: 566665, note: 'Morton vs his old team' }, { pk: 566666 }],
      },
      { park: 'loandepot', q: 20, how: 'Drove from Tampa', notes: 'Rockies vs Marlins. Drove down from Tampa.', games: [{ pk: 567362 }] },
    ],
    segments: roundTrip(['tropicana', 'loandepot']),
  },
  {
    id: '2019-tex',
    kind: 'quest',
    title: 'Arlington',
    when: '2019',
    year: 2019,
    who: 'Dad',
    visits: [
      {
        park: 'globe-life-park',
        q: 6,
        notes: "Dad went in 2019, the park's last season. The Rangers moved across the street to Globe Life Field in 2020.",
      },
    ],
    segments: [{ from: HOU, to: at('globe-life-park'), mode: 'flight' }],
  },
  {
    id: '2019-kc',
    kind: 'quest',
    title: 'Kansas City, St. Louis',
    when: 'July 25–28, 2019',
    year: 2019,
    who: 'Taylor + Dad (+ Mom in St. Louis)',
    cover: 'IMG_4090.jpg',
    // EXIF says Oct 9, 2015 (ALDS at Kauffman), not this trip. Hidden until it has a home.
    hide: ['IMG_1817.JPG'],
    visits: [
      {
        park: 'kauffman',
        q: 21,
        how: 'Flew to KC',
        notes: 'Indians vs Royals, then across the state for the Astros series.',
        games: [{ pk: 565753 }],
      },
      {
        park: 'busch',
        q: 22,
        how: 'Drove from KC',
        notes: 'Astros vs Cardinals. Mom met them in St. Louis.',
        games: [{ pk: 566616 }, { pk: 566617 }, { pk: 566618 }],
      },
    ],
    segments: roundTrip(['kauffman', 'busch']),
  },
  {
    id: '2019-ws',
    kind: 'quest',
    title: 'Washington',
    when: 'October 25–27, 2019',
    year: 2019,
    who: 'Taylor + Dad',
    summary:
      'World Series, Astros vs Nationals. Games 3, 4 and 5 in DC: three Astros wins. Games 6 and 7 back home: two heartbreaking losses. The road team won all seven.',
    cover: '20191027_233335.jpg',
    visits: [
      {
        park: 'nationals',
        q: 23,
        notes: 'World Series Games 3–5. Then back to Minute Maid for 6 and 7. Heartbreak.',
        games: [{ pk: 599373 }, { pk: 599374, note: 'Bregman grand slam' }, { pk: 599375, note: "Cole, 9 K's" }],
      },
    ],
    segments: [
      { from: HOU, to: at('nationals'), mode: 'flight', label: 'Dad' },
      { from: DEN, to: at('nationals'), mode: 'flight', label: 'Taylor' },
    ],
  },
  {
    id: '2022-ne',
    kind: 'quest',
    title: 'New York, Philadelphia',
    when: 'June 28–30, 2022',
    year: 2022,
    who: 'Taylor + Dad + the in-laws',
    summary: 'Two Astros wins in Queens, then the train to Philly.',
    cover: 'IMG_0789.jpg',
    visits: [
      {
        park: 'citi',
        q: 24,
        how: 'Flew to New York',
        notes: 'Astros vs Mets. Dominated.',
        games: [{ pk: 662521, note: 'Kyle Tucker 3-run HR' }, { pk: 662440 }],
      },
      {
        park: 'cbp',
        q: 25,
        how: 'Train from New York',
        notes: 'Phillies vs Braves. Took the train down from New York.',
        games: [{ pk: 661579 }],
      },
    ],
    segments: roundTrip(['citi', 'cbp'], ['train']),
  },
  {
    id: '2023-mil',
    kind: 'quest',
    title: 'Milwaukee',
    when: 'May 22–24, 2023',
    year: 2023,
    who: 'Taylor + Dad',
    visits: [
      {
        park: 'amfam',
        q: 26,
        notes: 'Astros vs Brewers. Brewers took the series 2-1.',
        games: [{ pk: 718068 }, { pk: 718056 }, { pk: 718046 }],
      },
    ],
    segments: roundTrip(['amfam']),
  },
  {
    id: 'solo-sd',
    kind: 'bonus',
    title: 'San Diego, again',
    when: 'July 9, 2023',
    year: 2023,
    who: 'Taylor (solo)',
    visits: [
      {
        park: 'petco',
        notes: 'Padres home game at Petco Park, solo. The Padres were checked off at Qualcomm back in 1992, so this one is a bonus.',
        games: [{ pk: 717423 }],
      },
    ],
    segments: [{ from: DEN, to: at('petco'), mode: 'flight', label: 'Taylor' }],
  },
  {
    id: '2024-mex',
    kind: 'bonus',
    title: 'Mexico City',
    when: 'April 27–28, 2024',
    year: 2024,
    who: 'Taylor + Molly',
    cover: '20240428_150146.jpg',
    visits: [
      {
        park: 'harp-helu',
        notes: "MLB Mexico City Series, Astros vs Rockies. Neutral site, so it doesn't tick anyone off the list.",
        games: [{ pk: 746560 }, { pk: 746561 }],
      },
    ],
    segments: [{ from: DEN, to: at('harp-helu'), mode: 'flight', label: 'Taylor + Molly' }],
  },
  {
    id: '2024-det',
    kind: 'quest',
    title: 'Detroit',
    when: 'May 10–12, 2024',
    year: 2024,
    who: 'Taylor + Dad',
    cover: '20240512_114945.jpg',
    visits: [
      {
        park: 'comerica',
        q: 27,
        notes: 'Astros vs Tigers. Astros took the series 2-1.',
        games: [
          { pk: 746479, note: 'Valdez, 4-run 8th-inning rally' },
          { pk: 746480, note: 'Canha grand slam' },
          { pk: 746476 },
        ],
      },
    ],
    segments: roundTrip(['comerica']),
  },
  {
    id: '2025-final',
    kind: 'quest',
    title: 'Cleveland, Chicago',
    when: 'April 30 – May 5, 2025',
    year: 2025,
    who: 'Taylor + Dad',
    summary: 'Cleveland, a flight to Chicago, three Astros games on the South Side, then Wrigley.',
    cover: '20250502_145318.jpg',
    coverPosition: 'center 30%',
    visits: [
      { park: 'progressive', q: 28, how: 'Flew to Cleveland', notes: 'First stop on the final trip.', games: [{ pk: 778116 }] },
      {
        park: 'rate-field',
        q: 29,
        how: 'Flew from Cleveland',
        notes: 'Astros vs White Sox, three games.',
        games: [{ pk: 778079 }, { pk: 778066 }, { pk: 778055 }],
      },
      {
        park: 'wrigley',
        q: 30,
        final: true,
        notes: 'Cubs vs Giants. The final MLB stadium. The quest is complete. Father and son. What a ride.',
        games: [{ pk: 778044 }],
      },
    ],
    segments: [
      { from: HOU, to: at('progressive'), mode: 'flight', label: 'Dad' },
      { from: DEN, to: at('progressive'), mode: 'flight', label: 'Taylor' },
      { from: at('progressive'), to: at('rate-field'), mode: 'flight' },
      { from: at('rate-field'), to: at('wrigley'), mode: 'drive' },
      { from: at('wrigley'), to: HOU, mode: 'flight', label: 'Dad home' },
      { from: at('wrigley'), to: DEN, mode: 'flight', label: 'Taylor home' },
    ],
  },
  {
    id: '2026-wbc',
    kind: 'epilogue',
    title: 'Houston, World Baseball Classic',
    when: 'March 9–15, 2026',
    year: 2026,
    who: 'Taylor, Mom + Dad',
    cover: 'IMG_20260313_210242 (1).jpg',
    visits: [
      {
        park: 'mmp',
        notes:
          'Six games of the World Baseball Classic Super Round at Minute Maid. Opened with USA vs Mexico, closed with Puerto Rico vs Italy. Taylor flew in from Denver; Mom and Dad were already home. All three in Team USA jerseys.',
      },
    ],
    segments: [
      { from: DEN, to: HOU, mode: 'flight', label: 'Taylor' },
      { from: HOU, to: DEN, mode: 'flight', label: 'Taylor home' },
    ],
  },
];

/** Astros home playoff games attended. Keys match games.json "postseason". */
export const OCTOBER: { key: string; note?: string }[] = [
  { key: '2004-L-5', note: 'Jeff Kent walk-off 3-run HR off Isringhausen. Iconic.' },
  { key: '2005-D-4', note: 'Chris Burke walk-off HR in the 18th. Longest playoff game ever. Clinched the series.' },
  { key: '2005-L-5', note: 'Pujols MONSTER 3-run HR off Brad Lidge in the 9th. Worst/best/most epic thing ever. Broke Lidge.' },
  { key: '2005-W-3', note: 'Geoff Blum HR in the 14th. Painful.' },
  { key: '2017-L-1' },
  { key: '2017-L-2' },
  { key: '2017-W-3' },
  { key: '2017-W-4' },
  { key: '2019-L-1' },
  { key: '2019-L-2', note: 'Correa walk-off HR in the 11th.' },
  { key: '2019-W-6' },
  { key: '2019-W-7', note: 'Heartbreak.' },
  { key: '2021-W-6', note: 'Braves clinch. Painful.' },
  { key: '2022-L-1' },
  { key: '2022-L-2' },
  { key: '2022-W-6', note: 'Yordan Alvarez 3-run HR. Champions.' },
  { key: '2023-L-6', note: 'Adolis García grand slam.' },
  { key: '2023-L-7', note: 'Eliminated. Rough ending.' },
];
