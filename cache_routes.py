#!/usr/bin/env python3
"""
Fetch all drive/train routes from OSRM and cache as road_routes.json.
Run once — the app will load this file instead of hitting the API every page load.

Usage: python cache_routes.py
"""

import json
import time
import urllib.request

# All drive/train segments from the app (from/to as [lat, lng])
HOU = [29.7573, -95.3556]
DEN = [39.7559, -104.9942]

SEGMENTS = [
    # 2011-az: HOU -> Chase Field
    {"from": HOU, "to": [33.4453, -112.0667], "mode": "drive"},
    # 2009-tex: HOU -> Globe Life
    {"from": HOU, "to": [32.7512, -97.0832], "mode": "drive"},
    # 2015-kc: DEN -> Kauffman (round trip)
    {"from": DEN, "to": [39.0517, -94.4803], "mode": "drive"},
    # 2017: PIT -> CIN -> ATL
    {"from": [40.4469, -80.0057], "to": [39.0979, -84.5081], "mode": "drive"},
    {"from": [39.0979, -84.5081], "to": [33.8908, -84.4678], "mode": "drive"},
    # 2018-west: LA -> Oakland -> SF
    {"from": [34.0739, -118.2400], "to": [37.7516, -122.2006], "mode": "drive"},
    {"from": [37.7516, -122.2006], "to": [37.7786, -122.3893], "mode": "drive"},
    # 2019-fla: Tampa -> Miami
    {"from": [27.7682, -82.6534], "to": [25.7781, -80.2196], "mode": "drive"},
    # 2019-kc: KC -> STL
    {"from": [39.0517, -94.4803], "to": [38.6226, -90.1928], "mode": "drive"},
    # 2022-ne: NYC -> Philly (train)
    {"from": [40.7571, -73.8458], "to": [39.9061, -75.1665], "mode": "train"},
    # 2026-final: Guaranteed Rate -> Wrigley
    {"from": [41.8299, -87.6338], "to": [41.9484, -87.6553], "mode": "drive"},
]


def fetch_route(from_pt, to_pt):
    """Fetch route from OSRM and return list of [lat, lng] points."""
    url = (
        f"https://router.project-osrm.org/route/v1/driving/"
        f"{from_pt[1]},{from_pt[0]};{to_pt[1]},{to_pt[0]}"
        f"?overview=full&geometries=geojson"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "BaseballJourney/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())

    if data.get("routes") and data["routes"][0]:
        coords = data["routes"][0]["geometry"]["coordinates"]
        # GeoJSON is [lng, lat] -> convert to [lat, lng] for Leaflet
        return [[c[1], c[0]] for c in coords]
    return None


def cache_key(from_pt, to_pt):
    return f"{from_pt[0]},{from_pt[1]}-{to_pt[0]},{to_pt[1]}"


def main():
    routes = {}
    total = len(SEGMENTS)

    for i, seg in enumerate(SEGMENTS):
        key = cache_key(seg["from"], seg["to"])
        print(f"[{i+1}/{total}] {seg['mode']}: {key} ... ", end="", flush=True)

        try:
            pts = fetch_route(seg["from"], seg["to"])
            if pts:
                routes[key] = pts
                print(f"OK ({len(pts)} points)")
            else:
                print("NO ROUTE")
        except Exception as e:
            print(f"ERROR: {e}")

        # Be polite to the free OSRM server
        if i < total - 1:
            time.sleep(0.5)

    output = "road_routes.json"
    with open(output, "w") as f:
        json.dump(routes, f)

    size_kb = len(json.dumps(routes)) / 1024
    print(f"\nWrote {output}: {len(routes)} routes, {size_kb:.0f} KB")


if __name__ == "__main__":
    main()
