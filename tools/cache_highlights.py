#!/usr/bin/env python3
"""
Fetch MLB game highlights for every game the Wards attended.
Outputs highlights.json — the app loads this file to show video clips.

Usage: python cache_highlights.py

Uses the free MLB Stats API (statsapi.mlb.com).
"""

import json
import time
import urllib.request
from datetime import datetime

# Known games attended — (date, home_team_id, away_team_id) or (date, team_abbr vs team_abbr)
# MLB team IDs: https://statsapi.mlb.com/api/v1/teams?sportId=1
TEAM_IDS = {
    'HOU': 117, 'NYY': 147, 'NYM': 121, 'PHI': 143, 'ATL': 144,
    'PIT': 134, 'CIN': 113, 'LAD': 119, 'OAK': 133, 'SF': 137,
    'TB': 139, 'MIA': 146, 'KC': 118, 'STL': 138, 'WSH': 120,
    'MIL': 158, 'DET': 116, 'CLE': 114, 'CWS': 145, 'CHC': 112,
    'MIN': 142, 'TOR': 141, 'BOS': 111, 'SEA': 136, 'COL': 115,
    'LAA': 108, 'TEX': 140, 'ARI': 109, 'BAL': 110, 'SD': 135,
}

# Games attended — each entry: { stadium, date, home, away, trip, notes }
# Dates in YYYY-MM-DD format. Some dates are approximate.
GAMES = [
    # 2014 - Angel Stadium (Mike Trout walk-off HR)
    {'stadium': 'Angel Stadium', 'date': '2014-07-04', 'home': 'LAA', 'away': 'HOU', 'trip': '2014-ana',
     'notes': 'Mike Trout walk-off homer on July 4th'},

    # 2008 - Old Yankee Stadium
    {'stadium': 'Yankee Stadium (Old)', 'date': '2008-08-15', 'home': 'NYY', 'away': 'KC', 'trip': '2008-nyc',
     'notes': 'Mariano Rivera blows save, Royals win 4-3'},

    # 2015 - Toronto (swept)
    {'stadium': 'Rogers Centre', 'date': '2015-06-05', 'home': 'TOR', 'away': 'HOU', 'trip': '2015-tor',
     'notes': 'Blue Jays 6-2'},
    {'stadium': 'Rogers Centre', 'date': '2015-06-06', 'home': 'TOR', 'away': 'HOU', 'trip': '2015-tor',
     'notes': 'Blue Jays 7-2'},
    {'stadium': 'Rogers Centre', 'date': '2015-06-07', 'home': 'TOR', 'away': 'HOU', 'trip': '2015-tor',
     'notes': 'Blue Jays 7-6'},

    # 2015 - Boston
    {'stadium': 'Fenway Park', 'date': '2015-07-03', 'home': 'BOS', 'away': 'HOU', 'trip': '2015-bos',
     'notes': 'Astros 12-8, Correa HR over Monster'},
    {'stadium': 'Fenway Park', 'date': '2015-07-04', 'home': 'BOS', 'away': 'HOU', 'trip': '2015-bos',
     'notes': 'Red Sox 6-1'},
    {'stadium': 'Fenway Park', 'date': '2015-07-05', 'home': 'BOS', 'away': 'HOU', 'trip': '2015-bos',
     'notes': 'Red Sox 5-4'},

    # 2015 - Minneapolis
    {'stadium': 'Target Field', 'date': '2015-08-28', 'home': 'MIN', 'away': 'HOU', 'trip': '2015-min',
     'notes': 'Twins 3-0'},
    {'stadium': 'Target Field', 'date': '2015-08-29', 'home': 'MIN', 'away': 'HOU', 'trip': '2015-min',
     'notes': 'Astros 4-1'},
    {'stadium': 'Target Field', 'date': '2015-08-30', 'home': 'MIN', 'away': 'HOU', 'trip': '2015-min',
     'notes': 'Twins 7-5'},

    # 2017 - PIT/CIN/ATL road trip
    {'stadium': 'PNC Park', 'date': '2017-07-01', 'home': 'PIT', 'away': 'SF', 'trip': '2017',
     'notes': 'Pirates vs Giants'},
    {'stadium': 'Great American Ball Park', 'date': '2017-06-30', 'home': 'CIN', 'away': 'CHC', 'trip': '2017',
     'notes': 'Reds 5-0'},
    {'stadium': 'Great American Ball Park', 'date': '2017-07-01', 'home': 'CIN', 'away': 'CHC', 'trip': '2017',
     'notes': 'Cubs 6-2'},
    {'stadium': 'Truist Park', 'date': '2017-07-04', 'home': 'ATL', 'away': 'HOU', 'trip': '2017',
     'notes': 'Astros 16-4'},
    {'stadium': 'Truist Park', 'date': '2017-07-05', 'home': 'ATL', 'away': 'HOU', 'trip': '2017',
     'notes': 'Astros 10-4'},

    # 2018 - LA/Oakland/SF
    {'stadium': 'Dodger Stadium', 'date': '2018-08-03', 'home': 'LAD', 'away': 'HOU', 'trip': '2018-west',
     'notes': 'Astros 2-1, Verlander 14 Ks'},
    {'stadium': 'Dodger Stadium', 'date': '2018-08-04', 'home': 'LAD', 'away': 'HOU', 'trip': '2018-west',
     'notes': 'Astros 14-0'},
    {'stadium': 'Oakland Coliseum', 'date': '2018-08-05', 'home': 'OAK', 'away': 'DET', 'trip': '2018-west',
     'notes': "A's 6-0"},
    {'stadium': 'Oracle Park', 'date': '2018-08-06', 'home': 'SF', 'away': 'HOU', 'trip': '2018-west',
     'notes': 'Astros 3-1'},
    {'stadium': 'Oracle Park', 'date': '2018-08-07', 'home': 'SF', 'away': 'HOU', 'trip': '2018-west',
     'notes': 'Astros 2-1'},

    # 2019 - Florida (Opening Day)
    {'stadium': 'Tropicana Field', 'date': '2019-03-28', 'home': 'TB', 'away': 'HOU', 'trip': '2019-fla',
     'notes': 'Opening Day, Astros 5-1 (Verlander)'},
    {'stadium': 'Tropicana Field', 'date': '2019-03-29', 'home': 'TB', 'away': 'HOU', 'trip': '2019-fla',
     'notes': 'Rays 4-2'},
    {'stadium': 'Tropicana Field', 'date': '2019-03-30', 'home': 'TB', 'away': 'HOU', 'trip': '2019-fla',
     'notes': 'Rays 3-1'},
    {'stadium': 'loanDepot Park', 'date': '2019-03-31', 'home': 'MIA', 'away': 'COL', 'trip': '2019-fla',
     'notes': 'Marlins 3-0'},

    # 2019 - KC/STL
    {'stadium': 'Kauffman Stadium', 'date': '2019-07-25', 'home': 'KC', 'away': 'CLE', 'trip': '2019-kc',
     'notes': 'Indians vs Royals'},
    {'stadium': 'Busch Stadium', 'date': '2019-07-26', 'home': 'STL', 'away': 'HOU', 'trip': '2019-kc',
     'notes': 'Cardinals 5-3'},
    {'stadium': 'Busch Stadium', 'date': '2019-07-27', 'home': 'STL', 'away': 'HOU', 'trip': '2019-kc',
     'notes': 'Astros 8-2'},
    {'stadium': 'Busch Stadium', 'date': '2019-07-28', 'home': 'STL', 'away': 'HOU', 'trip': '2019-kc',
     'notes': 'Astros 6-2'},

    # 2019 - World Series
    {'stadium': 'Nationals Park', 'date': '2019-10-25', 'home': 'WSH', 'away': 'HOU', 'trip': '2019-ws',
     'notes': 'WS Game 3: Astros 4-1 (Greinke)'},
    {'stadium': 'Nationals Park', 'date': '2019-10-26', 'home': 'WSH', 'away': 'HOU', 'trip': '2019-ws',
     'notes': 'WS Game 4: Astros 8-1 (Bregman grand slam)'},
    {'stadium': 'Nationals Park', 'date': '2019-10-27', 'home': 'WSH', 'away': 'HOU', 'trip': '2019-ws',
     'notes': 'WS Game 5: Astros 7-1 (Cole 9 Ks)'},

    # 2022 - NY/Philly
    {'stadium': 'Citi Field', 'date': '2022-06-28', 'home': 'NYM', 'away': 'HOU', 'trip': '2022-ne',
     'notes': 'Astros 9-1 (Kyle Tucker 3-run HR)'},
    {'stadium': 'Citi Field', 'date': '2022-06-29', 'home': 'NYM', 'away': 'HOU', 'trip': '2022-ne',
     'notes': 'Astros 2-0'},
    {'stadium': 'Citizens Bank Park', 'date': '2022-06-28', 'home': 'PHI', 'away': 'ATL', 'trip': '2022-ne',
     'notes': 'Braves 5-3'},
    {'stadium': 'Citizens Bank Park', 'date': '2022-06-29', 'home': 'PHI', 'away': 'ATL', 'trip': '2022-ne',
     'notes': 'Braves 4-1'},
    {'stadium': 'Citizens Bank Park', 'date': '2022-06-30', 'home': 'PHI', 'away': 'ATL', 'trip': '2022-ne',
     'notes': 'Phillies 14-4'},

    # 2023 - Milwaukee
    {'stadium': 'American Family Field', 'date': '2023-05-22', 'home': 'MIL', 'away': 'HOU', 'trip': '2023-mil',
     'notes': 'Astros 12-2'},
    {'stadium': 'American Family Field', 'date': '2023-05-23', 'home': 'MIL', 'away': 'HOU', 'trip': '2023-mil',
     'notes': 'Brewers 6-0'},
    {'stadium': 'American Family Field', 'date': '2023-05-24', 'home': 'MIL', 'away': 'HOU', 'trip': '2023-mil',
     'notes': 'Brewers 4-0'},

    # 2024 - Detroit
    {'stadium': 'Comerica Park', 'date': '2024-05-10', 'home': 'DET', 'away': 'HOU', 'trip': '2024-det',
     'notes': 'Astros 5-2 (Valdez, 4-run 8th rally)'},
    {'stadium': 'Comerica Park', 'date': '2024-05-11', 'home': 'DET', 'away': 'HOU', 'trip': '2024-det',
     'notes': 'Tigers 8-2 (Canha grand slam)'},
    {'stadium': 'Comerica Park', 'date': '2024-05-12', 'home': 'DET', 'away': 'HOU', 'trip': '2024-det',
     'notes': 'Astros 9-3'},
]


def fetch_json(url):
    """Fetch JSON from URL."""
    req = urllib.request.Request(url, headers={'User-Agent': 'BaseballJourney/1.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def find_game_pk(date_str, home_abbr, away_abbr):
    """Find the gamePk for a specific game by date and teams."""
    home_id = TEAM_IDS.get(home_abbr)
    away_id = TEAM_IDS.get(away_abbr)
    if not home_id:
        return None

    url = f"https://statsapi.mlb.com/api/v1/schedule?date={date_str}&sportId=1&teamId={home_id}"
    try:
        data = fetch_json(url)
    except Exception as e:
        print(f"  Schedule error: {e}")
        return None

    for date_obj in data.get('dates', []):
        for game in date_obj.get('games', []):
            game_home = game.get('teams', {}).get('home', {}).get('team', {}).get('id')
            game_away = game.get('teams', {}).get('away', {}).get('team', {}).get('id')
            if game_home == home_id and (not away_id or game_away == away_id):
                return game['gamePk']

    return None


def fetch_highlights(game_pk):
    """Fetch video highlights for a game."""
    url = f"https://statsapi.mlb.com/api/v1/game/{game_pk}/content"
    try:
        data = fetch_json(url)
    except Exception as e:
        print(f"  Content error: {e}")
        return []

    highlights = []
    hl = data.get('highlights', {})
    if not hl:
        hl = {}
    hl2 = hl.get('highlights', {})
    if not hl2:
        hl2 = {}
    items = hl2.get('items', [])

    for item in items:
        # Get the best quality playback URL
        playbacks = item.get('playbacks', [])
        video_url = None
        for pb in playbacks:
            if 'mp4' in pb.get('url', '') and 'Avc' in pb.get('name', ''):
                video_url = pb['url']
                break
        if not video_url:
            for pb in playbacks:
                if 'mp4' in pb.get('url', ''):
                    video_url = pb['url']
                    break

        if video_url:
            highlights.append({
                'title': item.get('title', item.get('headline', 'Highlight')),
                'desc': item.get('description', ''),
                'duration': item.get('duration', ''),
                'url': video_url,
                'thumb': item.get('image', {}).get('cuts', [{}])[0].get('src', '') if item.get('image') else '',
            })

    return highlights


def main():
    results = {}  # keyed by "trip|stadium|date"
    total = len(GAMES)

    for i, game in enumerate(GAMES):
        key = f"{game['trip']}|{game['stadium']}|{game['date']}"
        print(f"[{i+1}/{total}] {game['date']} {game['away']}@{game['home']} ({game['stadium']}) ... ", end='', flush=True)

        game_pk = find_game_pk(game['date'], game['home'], game['away'])
        if not game_pk:
            print("NO GAME FOUND")
            time.sleep(0.3)
            continue

        print(f"gamePk={game_pk} ... ", end='', flush=True)

        highlights = fetch_highlights(game_pk)
        if highlights:
            results[key] = {
                'gamePk': game_pk,
                'date': game['date'],
                'stadium': game['stadium'],
                'trip': game['trip'],
                'matchup': f"{game['away']} @ {game['home']}",
                'notes': game['notes'],
                'highlights': highlights[:8],  # limit to top 8 per game
            }
            print(f"OK ({len(highlights)} highlights, kept {min(len(highlights), 8)})")
        else:
            # Still save game info even without highlights
            results[key] = {
                'gamePk': game_pk,
                'date': game['date'],
                'stadium': game['stadium'],
                'trip': game['trip'],
                'matchup': f"{game['away']} @ {game['home']}",
                'notes': game['notes'],
                'highlights': [],
            }
            print("OK (no highlights)")

        time.sleep(0.3)

    output = 'highlights.json'
    with open(output, 'w') as f:
        json.dump(results, f)

    total_highlights = sum(len(r['highlights']) for r in results.values())
    size_kb = len(json.dumps(results)) / 1024
    print(f"\nWrote {output}: {len(results)} games, {total_highlights} highlights, {size_kb:.0f} KB")


if __name__ == '__main__':
    main()
