#!/usr/bin/env python3
"""
Scan photos/ folder, read EXIF GPS + date, match to stadiums/trips,
and output photos.json for the Ward Baseball Journey app.

Usage: python scan_photos.py
"""

import json
import math
import os
import re
import sys
from datetime import datetime

from PIL import Image

# Try HEIC support
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

Image.MAX_IMAGE_PIXELS = None  # disable decompression bomb check for large photos

PHOTOS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "photos")
OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "photos.json")

# Stadium data — same as index.html
STADIUMS = [
    {"name": "Astrodome", "lat": 29.6850, "lng": -95.4101, "trip": "home"},
    {"name": "Minute Maid Park", "lat": 29.7573, "lng": -95.3556, "trip": "home"},
    {"name": "Qualcomm Stadium", "lat": 32.7831, "lng": -117.1196, "trip": "1992-sd"},
    {"name": "Camden Yards", "lat": 39.2838, "lng": -76.6215, "trip": "1999-bal"},
    {"name": "Chase Field", "lat": 33.4453, "lng": -112.0667, "trip": "2006-az"},
    {"name": "Yankee Stadium (Old)", "lat": 40.8296, "lng": -73.9272, "trip": "2008-nyc"},
    {"name": "Globe Life Park", "lat": 32.7512, "lng": -97.0832, "trip": "2009-tex"},
    {"name": "Angel Stadium", "lat": 33.8003, "lng": -117.8827, "trip": "2014-ana"},
    {"name": "Turner Field", "lat": 33.7350, "lng": -84.3897, "trip": "2014-atl"},
    {"name": "Petco Park", "lat": 32.7076, "lng": -117.1570, "trip": "solo-sd"},
    {"name": "Target Field", "lat": 44.9817, "lng": -93.2781, "trip": "2015-min"},
    {"name": "Rogers Centre", "lat": 43.6414, "lng": -79.3894, "trip": "2015-tor"},
    {"name": "Fenway Park", "lat": 42.3467, "lng": -71.0972, "trip": "2016-bos"},
    {"name": "Coors Field", "lat": 39.7559, "lng": -104.9942, "trip": "coors"},
    {"name": "T-Mobile Park", "lat": 47.5914, "lng": -122.3325, "trip": "2016-sea"},
    {"name": "PNC Park", "lat": 40.4469, "lng": -80.0057, "trip": "2017"},
    {"name": "Great American Ball Park", "lat": 39.0979, "lng": -84.5081, "trip": "2017"},
    {"name": "Truist Park", "lat": 33.8908, "lng": -84.4678, "trip": "2017"},
    {"name": "Dodger Stadium", "lat": 34.0739, "lng": -118.2400, "trip": "2018-west"},
    {"name": "Oakland Coliseum", "lat": 37.7516, "lng": -122.2006, "trip": "2018-west"},
    {"name": "Oracle Park", "lat": 37.7786, "lng": -122.3893, "trip": "2018-west"},
    {"name": "Tropicana Field", "lat": 27.7682, "lng": -82.6534, "trip": "2019-fla"},
    {"name": "loanDepot Park", "lat": 25.7781, "lng": -80.2196, "trip": "2019-fla"},
    {"name": "Kauffman Stadium", "lat": 39.0517, "lng": -94.4803, "trip": "2019-kc"},
    {"name": "Busch Stadium", "lat": 38.6226, "lng": -90.1928, "trip": "2019-kc"},
    {"name": "Nationals Park", "lat": 38.8731, "lng": -77.0074, "trip": "2019-ws"},
    {"name": "Citi Field", "lat": 40.7571, "lng": -73.8458, "trip": "2022-ne"},
    {"name": "Citizens Bank Park", "lat": 39.9061, "lng": -75.1665, "trip": "2022-ne"},
    {"name": "American Family Field", "lat": 43.0280, "lng": -87.9712, "trip": "2023-mil"},
    {"name": "Estadio Alfredo Harp Hel\u00fa", "lat": 19.4036, "lng": -99.0853, "trip": "2024-mex"},
    {"name": "Comerica Park", "lat": 42.3390, "lng": -83.0485, "trip": "2024-det"},
    {"name": "Progressive Field", "lat": 41.4962, "lng": -81.6852, "trip": "2026-final"},
    {"name": "Guaranteed Rate Field", "lat": 41.8299, "lng": -87.6338, "trip": "2026-final"},
    {"name": "Wrigley Field", "lat": 41.9484, "lng": -87.6553, "trip": "2026-final"},
]

# Trip date ranges for fallback matching when GPS is missing
TRIP_DATES = {
    "home": None,  # skip
    "1992-sd": (datetime(1992, 1, 1), datetime(1992, 12, 31)),
    "1999-bal": (datetime(1999, 1, 1), datetime(1999, 12, 31)),
    "2006-az": (datetime(2005, 1, 1), datetime(2007, 12, 31)),
    "2008-nyc": (datetime(2008, 8, 10), datetime(2008, 8, 20)),
    "2009-tex": (datetime(2009, 1, 1), datetime(2009, 12, 31)),
    "2014-ana": (datetime(2014, 7, 1), datetime(2014, 7, 10)),
    "2014-atl": (datetime(2014, 1, 1), datetime(2014, 12, 31)),
    "solo-sd": None,  # multiple years
    "2015-tor": (datetime(2015, 6, 3), datetime(2015, 6, 9)),
    "2015-min": (datetime(2015, 8, 26), datetime(2015, 9, 1)),
    "2016-bos": (datetime(2016, 5, 10), datetime(2016, 5, 17)),
    "coors": None,  # ongoing
    "2016-sea": (datetime(2016, 1, 1), datetime(2016, 12, 31)),
    "2017": (datetime(2017, 6, 28), datetime(2017, 7, 7)),
    "2018-west": (datetime(2018, 8, 1), datetime(2018, 8, 10)),
    "2019-fla": (datetime(2019, 3, 26), datetime(2019, 4, 7)),
    "2019-kc": (datetime(2019, 7, 23), datetime(2019, 7, 30)),
    "2019-ws": (datetime(2019, 10, 23), datetime(2019, 10, 29)),
    "2022-ne": (datetime(2022, 6, 25), datetime(2022, 7, 3)),
    "2023-mil": (datetime(2023, 5, 20), datetime(2023, 5, 26)),
    "2024-mex": (datetime(2024, 4, 25), datetime(2024, 4, 30)),
    "2024-det": (datetime(2024, 5, 8), datetime(2024, 5, 14)),
    "2026-final": (datetime(2026, 5, 1), datetime(2026, 5, 31)),
}

MAX_DISTANCE_MILES = 10  # max radius to match a photo to a stadium

# Manual overrides for photos with no GPS/date that can't be auto-matched
MANUAL_OVERRIDES = {
    "IMG_1074.jpg":             {"stadium": "Minute Maid Park", "trip": "home", "date": "2022-10-20"},
    "IMG_1144.jpg":             {"stadium": "Minute Maid Park", "trip": "home", "date": "2022-11-05"},
    "IMG_20221020_181312_024.jpg": {"stadium": "Minute Maid Park", "trip": "home", "date": "2022-10-20"},
    "IMG_20250519_181834.heic": {"stadium": "Coors Field", "trip": "coors", "date": "2025-05-19"},
    "IMG_20250702_211914.jpg":  {"stadium": "Coors Field", "trip": "coors", "date": "2025-07-02"},
    "IMG_2967.JPG":             {"stadium": "T-Mobile Park", "trip": "2016-sea", "date": None},
    "IMG_3101.JPG":             {"stadium": "Coors Field", "trip": "coors", "date": None},
    "IMG_4090.jpg":             {"stadium": "Busch Stadium", "trip": "2019-kc", "date": None},
    "IMG_1652.JPG":             {"stadium": "Yankee Stadium (Old)", "trip": "2008-nyc", "date": "2008-08-15"},
    "IMG_7779.jpg":             {"stadium": "Minute Maid Park", "trip": "home", "date": None},
    "imagejpeg_0(10).jpg":      {"stadium": "Estadio Alfredo Harp Hel\u00fa", "trip": "2024-mex", "date": None},
    "IMG_0789.jpg":             {"stadium": "Citi Field", "trip": "2022-ne", "date": "2022-06-28"},
}


def find_best_stadium_with_date(lat, lng, dt):
    """Find nearest stadium, but cross-reference with date to break ties in metro areas."""
    candidates = []
    for s in STADIUMS:
        d = haversine(lat, lng, s["lat"], s["lng"])
        if d <= MAX_DISTANCE_MILES:
            candidates.append((s, d))

    if not candidates:
        return None, float("inf")

    if len(candidates) == 1:
        return candidates[0]

    # Multiple stadiums within range — use date to disambiguate
    if dt:
        for s, d in candidates:
            trip_id = s["trip"]
            rng = TRIP_DATES.get(trip_id)
            if rng and rng[0] <= dt <= rng[1]:
                return s, d

    # No date match — return the closest
    candidates.sort(key=lambda x: x[1])
    return candidates[0]


def haversine(lat1, lng1, lat2, lng2):
    R = 3959
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_exif_gps(exif):
    gps = exif.get(34853)
    if not gps:
        return None, None
    try:
        def to_deg(v):
            d, m, s = v
            return float(d) + float(m) / 60 + float(s) / 3600
        lat = to_deg(gps[2])
        if gps.get(1) == "S":
            lat = -lat
        lng = to_deg(gps[4])
        if gps.get(3) == "W":
            lng = -lng
        return lat, lng
    except (KeyError, TypeError, ValueError):
        return None, None


def get_exif_date(exif):
    dt_str = exif.get(36867) or exif.get(36868) or exif.get(306)
    if dt_str:
        try:
            return datetime.strptime(dt_str, "%Y:%m:%d %H:%M:%S")
        except ValueError:
            pass
    return None


def parse_date_from_filename(filename):
    """Try to extract date from filenames like 20190328_155922.jpg or IMG_20191026_155821.jpg"""
    m = re.search(r'(\d{4})(\d{2})(\d{2})', filename)
    if m:
        try:
            return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            pass
    return None


def find_nearest_stadium(lat, lng):
    best = None
    best_dist = float("inf")
    for s in STADIUMS:
        d = haversine(lat, lng, s["lat"], s["lng"])
        if d < best_dist:
            best_dist = d
            best = s
    if best_dist <= MAX_DISTANCE_MILES:
        return best, best_dist
    return None, best_dist


def find_trip_by_date(dt):
    """Fallback: match photo date to a trip date range."""
    if not dt:
        return None
    for trip_id, rng in TRIP_DATES.items():
        if rng is None:
            continue
        start, end = rng
        if start <= dt <= end:
            return trip_id
    return None


def scan():
    results = []
    unmatched = []

    extensions = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".tiff", ".tif"}
    files = []
    for root, _, filenames in os.walk(PHOTOS_DIR):
        for f in filenames:
            if os.path.splitext(f)[1].lower() in extensions:
                files.append(os.path.join(root, f))

    files.sort()
    print(f"Scanning {len(files)} photos...\n")

    for filepath in files:
        filename = os.path.basename(filepath)
        rel_path = os.path.relpath(filepath, os.path.dirname(PHOTOS_DIR)).replace("\\", "/")

        lat, lng, dt, stadium, trip = None, None, None, None, None

        # Check manual overrides first
        if filename in MANUAL_OVERRIDES:
            ov = MANUAL_OVERRIDES[filename]
            print(f"  MANUAL {filename} -> {ov['stadium']} ({ov['trip']})")
            results.append({
                "file": rel_path,
                "stadium": ov["stadium"],
                "trip": ov["trip"],
                "date": ov["date"],
                "lat": None,
                "lng": None,
            })
            continue

        try:
            img = Image.open(filepath)
            exif = {}
            if hasattr(img, '_getexif') and img._getexif():
                exif = img._getexif()
            elif hasattr(img, 'getexif'):
                raw = img.getexif()
                if raw:
                    exif = dict(raw)
                    # getexif() nests GPS in an IFD
                    gps_ifd = raw.get_ifd(0x8825)
                    if gps_ifd:
                        exif[34853] = dict(gps_ifd)
        except Exception as e:
            print(f"  SKIP {filename}: {e}")
            unmatched.append({"file": rel_path, "reason": f"read error: {e}"})
            continue

        lat, lng = get_exif_gps(exif)
        dt = get_exif_date(exif)

        # Fallback date from filename
        if not dt:
            dt = parse_date_from_filename(filename)

        # Match by GPS (cross-reference with date for metro areas with multiple stadiums)
        if lat is not None:
            matched, dist = find_best_stadium_with_date(lat, lng, dt)
            if matched:
                stadium = matched["name"]
                trip = matched["trip"]
                print(f"  GPS  {filename} -> {stadium} ({dist:.1f} mi)")
            else:
                nearest, nearest_dist = find_nearest_stadium(lat, lng)
                print(f"  GPS  {filename} -> no stadium within {MAX_DISTANCE_MILES} mi (nearest {nearest_dist:.1f} mi at {lat:.3f},{lng:.3f})")

        # Fallback: match by date if no GPS match
        if not stadium and dt:
            trip = find_trip_by_date(dt)
            if trip:
                # Find the primary stadium for this trip
                trip_stadiums = [s for s in STADIUMS if s["trip"] == trip]
                if len(trip_stadiums) == 1:
                    stadium = trip_stadiums[0]["name"]
                else:
                    stadium = trip_stadiums[0]["name"] if trip_stadiums else None
                print(f"  DATE {filename} -> {stadium or trip} (date={dt.strftime('%Y-%m-%d')})")
            else:
                print(f"  ???  {filename} -> no match (date={dt.strftime('%Y-%m-%d') if dt else 'none'}, gps={'yes' if lat else 'no'})")
                unmatched.append({"file": rel_path, "reason": "no GPS or date match", "date": dt.strftime("%Y-%m-%d") if dt else None})
                continue

        if not stadium and not trip:
            print(f"  ???  {filename} -> no match (no GPS, no date)")
            unmatched.append({"file": rel_path, "reason": "no GPS, no date"})
            continue

        results.append({
            "file": rel_path,
            "stadium": stadium,
            "trip": trip,
            "date": dt.strftime("%Y-%m-%d") if dt else None,
            "lat": round(lat, 4) if lat else None,
            "lng": round(lng, 4) if lng else None,
        })

    # Sort by date
    results.sort(key=lambda x: x.get("date") or "")

    print(f"\n{'='*50}")
    print(f"Matched: {len(results)}/{len(files)}")
    print(f"Unmatched: {len(unmatched)}")

    if unmatched:
        print(f"\nUnmatched files:")
        for u in unmatched:
            print(f"  {u['file']}: {u['reason']}")

    # Write output
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {OUTPUT}")


if __name__ == "__main__":
    scan()
