"""
골프장 소개 카드에 쓰는 사실 자료를 모아 src/data/golf-facts.json에 저장한다. 한 번 만들면 되는 자료라 필요할 때만 돌린다.

- 코스 범위·홀 수·해저드: OpenStreetMap(leisure=golf_course, golf=hole, golf=*water_hazard), ODbL 출처 표기
- 고도·고저차: Copernicus DEM GLO-90 (약 90m), 코스 범위 안 화소의 5·50·95 백분위
- 가까운 호수·강·바다: OpenStreetMap (이름 있는 호수·저수지 2km, 강 1.5km, 해안선 5km 안)
- 평년 기후: NASA POWER 월별 기후값(climatology), 격자 고도와 코스 고도 차이만큼 0.0065°C/m 보정

사용: python collector/golf_facts.py
"""

import concurrent.futures as cf
import io
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request

import numpy as np
import rasterio
from shapely import contains_xy
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import polygonize, unary_union

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "src", "data", "golf.json")
OUT = os.path.join(ROOT, "src", "data", "golf-facts.json")
BBOX = "33.0,124.5,38.7,131.0"
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
DEM = "https://copernicus-dem-90m.s3.amazonaws.com"
LAPSE = 0.0065
UA = {"User-Agent": "tripnalc-golf-facts/1.0 (weather site data build)"}


def get(url, data=None, tries=6, timeout=300):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            if i == tries - 1:
                raise
            print("retry", url[:60], e, flush=True)
            time.sleep(min(60, 3 * 2**i))


def overpass(q):
    body = urllib.parse.urlencode({"data": q}).encode()
    last = None
    for i in range(8):
        url = OVERPASS[i % len(OVERPASS)]
        try:
            return json.loads(get(url, body, tries=1, timeout=400))
        except Exception as e:
            last = e
            print("overpass retry", i, e, flush=True)
            time.sleep(10 * (i + 1))
    raise last


# 위경도 → 지점 근처 평면(m)
def proj(lat0):
    k = math.cos(math.radians(lat0))
    return lambda lon, lat: ((lon) * 111320 * k, lat * 110540)


def to_xy(geom_pts, f):
    return [f(p["lon"], p["lat"]) for p in geom_pts]


def course_polygons(data):
    """golf_course way·relation → (위경도 Polygon, tags) 목록"""
    out = []
    for el in data["elements"]:
        tags = el.get("tags", {})
        if el["type"] == "way" and el.get("geometry"):
            pts = [(p["lon"], p["lat"]) for p in el["geometry"]]
            if len(pts) >= 4 and pts[0] == pts[-1]:
                out.append((Polygon(pts), tags))
        elif el["type"] == "relation":
            lines = [
                LineString([(p["lon"], p["lat"]) for p in m["geometry"]])
                for m in el.get("members", [])
                if m.get("role") in ("outer", "") and m.get("geometry") and len(m["geometry"]) >= 2
            ]
            polys = list(polygonize(unary_union(lines))) if lines else []
            if polys:
                out.append((unary_union(polys), tags))
    return [(g if g.is_valid else g.buffer(0), t) for g, t in out]


def centers(data):
    res = []
    for el in data["elements"]:
        c = el.get("center") or ({"lat": el["lat"], "lon": el["lon"]} if "lat" in el else None)
        if c:
            res.append((c["lon"], c["lat"], el.get("tags", {})))
    return res


_tiles = {}


def tile(lat, lon):
    key = (lat, lon)
    if key not in _tiles:
        name = f"Copernicus_DSM_COG_30_N{lat:02d}_00_E{lon:03d}_00_DEM"
        try:
            data = get(f"{DEM}/{name}/{name}.tif", tries=3)
            with rasterio.MemoryFile(data) as f, f.open() as ds:
                a = ds.read(1).astype(np.float32)
                _tiles[key] = (a, ds.transform)
        except Exception as e:
            print("dem tile", key, e, flush=True)
            _tiles[key] = None
    return _tiles[key]


def dem_stats(poly):
    """코스 범위 안 고도 화소 (5·50·95 백분위, m)"""
    minx, miny, maxx, maxy = poly.bounds
    vals = []
    for la in range(int(math.floor(miny)), int(math.floor(maxy)) + 1):
        for lo in range(int(math.floor(minx)), int(math.floor(maxx)) + 1):
            t = tile(la, lo)
            if not t:
                continue
            a, tr = t
            # 화소 중심 좌표
            c0 = max(0, int((minx - tr.c) / tr.a) - 1)
            c1 = min(a.shape[1], int((maxx - tr.c) / tr.a) + 2)
            r0 = max(0, int((maxy - tr.f) / tr.e) - 1)
            r1 = min(a.shape[0], int((miny - tr.f) / tr.e) + 2)
            if c0 >= c1 or r0 >= r1:
                continue
            cols = np.arange(c0, c1)
            rows = np.arange(r0, r1)
            xs = tr.c + (cols + 0.5) * tr.a
            ys = tr.f + (rows + 0.5) * tr.e
            X, Y = np.meshgrid(xs, ys)
            m = contains_xy(poly, X, Y)
            v = a[r0:r1, c0:c1][m]
            vals.append(v[v > -100])
    if not vals:
        return None
    v = np.concatenate(vals)
    if v.size < 5:
        return None
    p5, p50, p95 = np.percentile(v, [5, 50, 95])
    return [round(float(p5)), round(float(p50)), round(float(p95))]


def water_near(lat, lon, shape_xy, f):
    q = f"""[out:json][timeout:120];
(
  nwr(around:2000,{lat},{lon})["natural"="water"]["name"];
  way(around:1500,{lat},{lon})["waterway"="river"]["name"];
  way(around:5000,{lat},{lon})["natural"="coastline"];
);
out geom;"""
    data = overpass(q)
    lakes, rivers, coast = {}, {}, None
    for el in data["elements"]:
        tags = el.get("tags", {})
        geoms = []
        if el.get("geometry"):
            geoms.append(el["geometry"])
        for m in el.get("members", []):
            if m.get("geometry"):
                geoms.append(m["geometry"])
        d = None
        for g in geoms:
            pts = to_xy(g, f)
            if len(pts) < 2:
                continue
            dd = shape_xy.distance(LineString(pts))
            if len(pts) >= 4 and pts[0] == pts[-1] and Polygon(pts).is_valid and Polygon(pts).intersects(shape_xy):
                dd = 0
            d = dd if d is None else min(d, dd)
        if d is None:
            continue
        name = tags.get("name")
        if tags.get("natural") == "coastline":
            coast = d if coast is None else min(coast, d)
        elif tags.get("waterway") == "river":
            rivers[name] = min(rivers.get(name, 1e9), d)
        else:
            # 골프장 안 연못(이름이 골프장 이름인 것)·아주 작은 못은 뺀다
            area = 0
            if el.get("geometry"):
                pts = to_xy(el["geometry"], f)
                if len(pts) >= 4:
                    area = Polygon(pts).area
            elif el.get("bounds"):
                b = el["bounds"]
                x0, y0 = f(b["minlon"], b["minlat"])
                x1, y1 = f(b["maxlon"], b["maxlat"])
                area = abs(x1 - x0) * abs(y1 - y0) * 0.5
            if area >= 50000:  # 5ha 이상
                lakes[name] = min(lakes.get(name, 1e9), d)
    pick = lambda d: [{"name": k, "m": round(v)} for k, v in sorted(d.items(), key=lambda x: x[1])[:2]]
    return {"lakes": pick(lakes), "rivers": pick(rivers), "coastM": None if coast is None else round(coast)}


def climate(lat, lon, elev):
    url = (
        "https://power.larc.nasa.gov/api/temporal/climatology/point"
        f"?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR,WS2M&community=AG&longitude={lon}&latitude={lat}&format=JSON"
    )
    j = json.loads(get(url, timeout=120))
    p = j["properties"]["parameter"]
    gz = j["geometry"]["coordinates"][2] if len(j["geometry"]["coordinates"]) > 2 else None
    adj = (gz - elev) * LAPSE if (gz is not None and elev is not None) else 0
    mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    days = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return {
        "hi": [round(p["T2M_MAX"][m] + adj, 1) for m in mon],
        "lo": [round(p["T2M_MIN"][m] + adj, 1) for m in mon],
        "rain": [round(p["PRECTOTCORR"][m] * d) for m, d in zip(mon, days)],
        "wind": [round(p["WS2M"][m], 1) for m in mon],
    }


def main():
    golf = json.load(open(SRC, encoding="utf-8"))
    print("courses", len(golf), flush=True)
    cdata = overpass(f'[out:json][timeout:300];(way["leisure"="golf_course"]({BBOX});relation["leisure"="golf_course"]({BBOX}););out geom;')
    polys = course_polygons(cdata)
    print("osm polygons", len(polys), flush=True)
    holes = centers(overpass(f'[out:json][timeout:300];way["golf"="hole"]({BBOX});out tags center;'))
    hazards = centers(overpass(f'[out:json][timeout:300];nwr["golf"~"^(water_hazard|lateral_water_hazard)$"]({BBOX});out tags center;'))
    print("holes", len(holes), "hazards", len(hazards), flush=True)
    hx = np.array([h[0] for h in holes]) if holes else np.zeros(0)
    hy = np.array([h[1] for h in holes]) if holes else np.zeros(0)
    wx = np.array([h[0] for h in hazards]) if hazards else np.zeros(0)
    wy = np.array([h[1] for h in hazards]) if hazards else np.zeros(0)

    facts = {}
    for i, g in enumerate(golf):
        pt = Point(g["lon"], g["lat"])
        best = None
        for poly, tags in polys:
            if poly.contains(pt):
                best = (poly, tags)
                break
        if best is None:
            # 좌표가 범위 밖이면 800m 안의 가장 가까운 범위
            cand = [(poly.distance(pt), poly, tags) for poly, tags in polys if poly.distance(pt) < 0.009]
            if cand:
                cand.sort(key=lambda x: x[0])
                best = (cand[0][1], cand[0][2])
        f = proj(g["lat"])
        rec = {}
        if best:
            poly, tags = best
            # 면적(ha)
            xy = Polygon([f(x, y) for x, y in poly.exterior.coords]) if poly.geom_type == "Polygon" else unary_union(
                [Polygon([f(x, y) for x, y in p.exterior.coords]) for p in poly.geoms]
            )
            rec["areaHa"] = round(xy.area / 10000)
            n = int(contains_xy(poly, hx, hy).sum()) if hx.size else 0
            tag_holes = tags.get("holes")
            if tag_holes and tag_holes.isdigit():
                rec["holes"] = int(tag_holes)
            elif n >= 9 and n % 9 == 0:
                rec["holes"] = n
            rec["holesMapped"] = n
            rec["hazards"] = int(contains_xy(poly, wx, wy).sum()) if wx.size else 0
            rec["elev"] = dem_stats(poly)
            shape_xy = xy
        else:
            shape_xy = Point(*f(g["lon"], g["lat"]))
            rec["elev"] = dem_stats(pt.buffer(0.004))
        try:
            rec.update(water_near(g["lat"], g["lon"], shape_xy, f))
        except Exception as e:
            print("water fail", g["slug"], e, flush=True)
        time.sleep(1)
        facts[g["slug"]] = rec
        if i % 20 == 0:
            print(i, g["slug"], rec, flush=True)

    def clim(g):
        e = facts[g["slug"]].get("elev")
        try:
            return g["slug"], climate(g["lat"], g["lon"], e[1] if e else None)
        except Exception as ex:
            print("climate fail", g["slug"], ex, flush=True)
            return g["slug"], None

    with cf.ThreadPoolExecutor(4) as ex:
        for slug, c in ex.map(clim, golf):
            if c:
                facts[slug]["clim"] = c
    with open(OUT, "w", encoding="utf-8") as fp:
        fp.write("{\n" + ",\n".join(f'"{k}": {json.dumps(v, ensure_ascii=False, separators=(",", ":"))}' for k, v in facts.items()) + "\n}\n")
    ok = lambda k: sum(1 for v in facts.values() if v.get(k))
    print("done", len(facts), {k: ok(k) for k in ["areaHa", "holes", "elev", "lakes", "rivers", "coastM", "clim"]}, flush=True)


if __name__ == "__main__":
    sys.exit(main())
