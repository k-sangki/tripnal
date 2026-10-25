"""임시: diag/golf-osm.json의 이름 있는 골프장을 Nominatim으로 역지오코딩 → diag/golf-geo.json"""
import json, time, urllib.parse, urllib.request

UA = {"User-Agent": "tripnalc-golf-list/1.0 (contact@tripnalc.com)"}
rows = json.load(open("diag/golf-osm.json", encoding="utf-8"))
out = {}
for r in rows:
    b = r.get("bounds")
    if not b or not r["tags"].get("name"):
        continue
    lat, lon = (b["minlat"] + b["maxlat"]) / 2, (b["minlon"] + b["maxlon"]) / 2
    q = urllib.parse.urlencode({"lat": lat, "lon": lon, "format": "jsonv2", "zoom": 14, "accept-language": "ko"})
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(f"https://nominatim.openstreetmap.org/reverse?{q}", headers=UA), timeout=60) as f:
                out[r["id"]] = json.load(f).get("address", {})
            break
        except Exception as e:
            print("retry", r["id"], e, flush=True)
            time.sleep(5 * (i + 1))
    time.sleep(1.1)
json.dump(out, open("diag/golf-geo.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print("done", len(out))
