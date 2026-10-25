"""임시: OSM 골프장(leisure=golf_course) 목록 + Nominatim 역지오코딩 시·도/시·군·구. 결과 diag/golf-osm.json"""
import json, time, urllib.parse, urllib.request

UA = {"User-Agent": "tripnalc-golf-list/1.0 (contact@tripnalc.com)"}
Q = """[out:json][timeout:900];
area["ISO3166-1"="KR"][admin_level=2]->.kr;
(way["leisure"="golf_course"](area.kr); relation["leisure"="golf_course"](area.kr););
out tags center bb;"""


def get(url, data=None):
    for i in range(5):
        try:
            req = urllib.request.Request(url, data=data, headers=UA)
            with urllib.request.urlopen(req, timeout=900) as r:
                return json.load(r)
        except Exception as e:
            print("retry", i, e, flush=True)
            time.sleep(10 * (i + 1))
    raise SystemExit("fail " + url)


els = None
for ep in ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]:
    try:
        els = get(ep, urllib.parse.urlencode({"data": Q}).encode())["elements"]
        break
    except SystemExit as e:
        print(e)
print("osm", len(els), flush=True)
out = []
for e in els:
    t = e.get("tags", {})
    c = e.get("center") or {}
    b = e.get("bounds") or {}
    item = {"id": f'{e["type"]}/{e["id"]}', "lat": c.get("lat"), "lon": c.get("lon"), "tags": t, "bounds": b}
    if c and (t.get("name") or t.get("name:ko")):
        q = urllib.parse.urlencode({"lat": c["lat"], "lon": c["lon"], "format": "jsonv2", "zoom": 14, "accept-language": "ko"})
        try:
            item["addr"] = get(f"https://nominatim.openstreetmap.org/reverse?{q}").get("address", {})
        except SystemExit:
            item["addr"] = {}
        time.sleep(1.1)
    out.append(item)
with open("diag/golf-osm.json", "w", encoding="utf-8") as fp:
    json.dump(out, fp, ensure_ascii=False, indent=0)
print("done", len(out))
