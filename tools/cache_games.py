#!/usr/bin/env python3
"""
Fetch line scores for every game the Wards attended and write src/data/games.json.

Sources of games:
  1. Every entry in src/data/highlights.json that has a gamePk
  2. EXTRA_GAMES below (games without highlight clips)
  3. POSTSEASON below — Astros home playoff games, looked up by season/round/game

Uses the free MLB Stats API (statsapi.mlb.com). Run from the repo root:
    python tools/cache_games.py
"""

import json
import os
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIGHLIGHTS = os.path.join(ROOT, "src", "data", "highlights.json")
OUTPUT = os.path.join(ROOT, "src", "data", "games.json")
API = "https://statsapi.mlb.com/api/v1/schedule"
HYDRATE = "linescore,team,decisions"
ASTROS = 117

# Games with no cached highlights, each matched to photo timestamps.
EXTRA_GAMES = [
    382547,  # 2014-08-29 MIA @ ATL, Turner Field
    491325,  # 2017-07-02 CHC @ CIN, Great American Ball Park (1:10 start; photos 12:36)
    717423,  # 2023-07-09 NYM @ SD, Petco Park
    746560,  # 2024-04-27 HOU @ COL, Mexico City Series
    746561,  # 2024-04-28 HOU @ COL, Mexico City Series
    777285,  # 2025-07-01 HOU @ COL, Coors Field (parents in town)
    777269,  # 2025-07-02 HOU @ COL
    777264,  # 2025-07-03 HOU @ COL
    778116,  # 2025-04-30 MIN @ CLE, Progressive Field
    778079,  # 2025-05-02 HOU @ CWS
    778066,  # 2025-05-03 HOU @ CWS
    778055,  # 2025-05-04 HOU @ CWS
    778044,  # 2025-05-05 SF @ CHC, Wrigley Field (No. 30)
]

# Astros home postseason games attended: (season, gameType, seriesGameNumber)
# gameType: D = Division Series, L = League Championship, W = World Series
POSTSEASON = [
    (2004, "L", 5),
    (2005, "D", 4),
    (2005, "L", 5),
    (2005, "W", 3),
    (2017, "L", 1), (2017, "L", 2),
    (2017, "W", 3), (2017, "W", 4),
    (2019, "L", 1), (2019, "L", 2),
    (2019, "W", 6), (2019, "W", 7),
    (2021, "W", 6),
    (2022, "L", 1), (2022, "L", 2),
    (2022, "W", 6),
    (2023, "L", 6), (2023, "L", 7),
]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ballpark-tour-cache/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def last_name(person):
    if not person:
        return None
    if person.get("lastName"):
        return person["lastName"]
    parts = person.get("fullName", "").split(" ")
    if len(parts) > 2 and parts[-1].rstrip(".") in ("Jr", "Sr", "II", "III", "IV"):
        return " ".join(parts[-2:])
    return parts[-1] or None


def side(game, key):
    team = game["teams"][key]["team"]
    ls_team = game.get("linescore", {}).get("teams", {}).get(key, {})
    innings = []
    for inn in game.get("linescore", {}).get("innings", []):
        runs = inn.get(key, {}).get("runs")
        innings.append(runs)  # None = not batted (home team, walk-off or ahead)
    return {
        "id": team["id"],
        "abbr": team.get("abbreviation"),
        "name": team.get("teamName") or team.get("name"),
        "r": ls_team.get("runs", game["teams"][key].get("score")),
        "h": ls_team.get("hits"),
        "e": ls_team.get("errors"),
        "innings": innings,
    }


def shape(game):
    dec = game.get("decisions", {})
    return {
        "pk": game["gamePk"],
        "date": game.get("officialDate") or game["gameDate"][:10],
        "type": game.get("gameType"),
        "series": game.get("seriesDescription"),
        "seriesGame": game.get("seriesGameNumber"),
        "venue": game.get("venue", {}).get("name"),
        "away": side(game, "away"),
        "home": side(game, "home"),
        "w": last_name(dec.get("winner")),
        "l": last_name(dec.get("loser")),
        "sv": last_name(dec.get("save")),
    }


def main():
    highlights = json.load(open(HIGHLIGHTS, encoding="utf-8"))
    pks = sorted({g["gamePk"] for g in highlights.values() if g.get("gamePk")} | set(EXTRA_GAMES))

    games = {}
    for i in range(0, len(pks), 20):
        batch = pks[i:i + 20]
        data = get(f"{API}?gamePks={','.join(map(str, batch))}&hydrate={HYDRATE}")
        for d in data.get("dates", []):
            for g in d["games"]:
                if g.get("status", {}).get("detailedState") == "Postponed":
                    continue
                games[str(g["gamePk"])] = shape(g)
        time.sleep(0.4)
    print(f"Regular lookups: {len(games)} of {len(pks)}")

    postseason = {}
    seasons = sorted({s for s, _, _ in POSTSEASON})
    for season in seasons:
        data = get(f"{API}?sportId=1&teamId={ASTROS}&season={season}&gameType=D,L,W&hydrate={HYDRATE}")
        for d in data.get("dates", []):
            for g in d["games"]:
                if g["teams"]["home"]["team"]["id"] != ASTROS:
                    continue
                if g.get("status", {}).get("abstractGameState") != "Final":
                    continue
                key = (season, g.get("gameType"), g.get("seriesGameNumber"))
                if key in POSTSEASON:
                    games[str(g["gamePk"])] = shape(g)
                    postseason[f"{season}-{key[1]}-{key[2]}"] = g["gamePk"]
        time.sleep(0.4)

    missing = [k for k in POSTSEASON if f"{k[0]}-{k[1]}-{k[2]}" not in postseason]
    print(f"Postseason: {len(postseason)} of {len(POSTSEASON)}" + (f" (missing {missing})" if missing else ""))

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump({"games": games, "postseason": postseason}, f, indent=1, ensure_ascii=False)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
