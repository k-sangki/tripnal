"""
golf-facts.json 보강: 평년 기온(일 평균 최고·최저), 바다까지 거리(지형 고도 0m 화소), 근처 호수·저수지.
Overpass가 바쁠 때 코스별 질의가 너무 느려, 호수는 영역을 4조각으로 나눠 한 번씩만 받는다.

사용: python collector/golf_facts_patch.py
"""

import concurrent.futures as cf
import json
import math
import sys

import numpy as np
from shapely.geometry import Point
from shapely.ops import unary_union

import golf_facts as gf

TILES = ["33.0,124.5,35.0,131.0", "35.0,124.5,36.5,131.0", "36.5,124.5,37.5,131.0", "37.5,124.5,38.7,131.0"]


def climate(lat, lon, elev):
    url = (
        "https://power.larc.nasa.gov/api/temporal/climatology/point"
        f"?parameters=T2M,T2M_RANGE,PRECTOTCORR,WS2M&community=AG&longitude={lon}&latitude={lat}&format=JSON"
    )
    j = json.loads(gf.get(url, timeout=120))
    p = j["properties"]["parameter"]
    c = j["geometry"]["coordinates"]
    gz = c[2] if len(c) > 2 else None
    adj = (gz - elev) * gf.LAPSE if (gz is not None and elev is not None) else 0
    mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    days = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return {
        "hi": [round(p["T2M"][m] + p["T2M_RANGE"][m] / 2 + adj, 1) for m in mon],
        "lo": [round(p["T2M"][m] - p["T2M_RANGE"][m] / 2 + adj, 1) for m in mon],
        "rain": [round(p["PRECTOTCORR"][m] * d) for m, d in zip(mon, days)],
        "wind": [round(p["WS2M"][m], 1) for m in mon],
    }


def coast_m(shape, lat):
    """5km 안 바다(지형 고도 0m) 화소까지 거리. 바다 화소가 50개(약 0.4km²) 미만이면 없음"""
    k = math.cos(math.radians(lat))
    b = shape.buffer(0.06).bounds
    best = None
    count = 0
    for la in range(int(math.floor(b[1])), int(math.floor(b[3])) + 1):
        for lo in range(int(math.floor(b[0])), int(math.floor(b[2])) + 1):
            t = gf.tile(la, lo)
            if not t:
                # 타일이 없으면 바다만 있는 칸
                continue
            a, tr = t
            c0 = max(0, int((b[0] - tr.c) / tr.a))
            c1 = min(a.shape[1], int((b[2] - tr.c) / tr.a) + 1)
            r0 = max(0, int((b[3] - tr.f) / tr.e))
            r1 = min(a.shape[0], int((b[1] - tr.f) / tr.e) + 1)
            if c0 >= c1 or r0 >= r1:
                continue
            sub = a[r0:r1, c0:c1]
            rr, cc = np.nonzero(sub <= 0)
            if rr.size == 0:
                continue
            xs = tr.c + (cc + c0 + 0.5) * tr.a
            ys = tr.f + (rr + r0 + 0.5) * tr.e
            # 코스 중심 기준 거리(m) 후 코스 반경만큼 빼 근사
            cx, cy = shape.centroid.x, shape.centroid.y
            d = np.hypot((xs - cx) * 111320 * k, (ys - cy) * 110540)
            m = d <= 5000 + 1500
            count += int(m.sum())
            if m.any():
                dm = float(d[m].min())
                best = dm if best is None else min(best, dm)
    if best is None or count < 50:
        return None
    # 중심에서 잰 값이라 코스 반경(넓이로 근사)만큼 빼 준다
    r = math.sqrt(shape.area * 111320 * k * 110540 / math.pi)
    v = max(0, best - r)
    return round(v) if v <= 5000 else None


def main():
    golf = json.load(open(gf.SRC, encoding="utf-8"))
    facts = json.load(open(gf.OUT, encoding="utf-8"))
    cdata = gf.overpass(f'[out:json][timeout:300];(way["leisure"="golf_course"]({gf.BBOX});relation["leisure"="golf_course"]({gf.BBOX}););out geom;')
    polys = gf.course_polygons(cdata)
    print("osm polygons", len(polys), flush=True)
    lakes = []
    for t in TILES:
        try:
            d = gf.overpass(f'[out:json][timeout:600];nwr["natural"="water"]["water"~"^(reservoir|lake)$"]["name"]({t});out geom;')
            for el in d["elements"]:
                gs = gf.geoms_of(el)
                if gs:
                    lakes.append((el.get("tags", {}).get("name"), gs))
            print("lakes tile", t, len(lakes), flush=True)
        except Exception as e:
            print("lakes fail", t, e, flush=True)
    feats = {"lake": lakes, "river": [], "coast": []}
    shapes = {}
    for i, g in enumerate(golf):
        pt = Point(g["lon"], g["lat"])
        best = next(((p, t) for p, t in polys if p.contains(pt)), None)
        if best is None:
            cand = sorted(((p.distance(pt), p, t) for p, t in polys if p.distance(pt) < 0.009), key=lambda x: x[0])
            best = (cand[0][1], cand[0][2]) if cand else None
        if best:
            poly, tags = best
            name = tags.get("name")
            parts = [q for q, t in polys if q is not poly and name and t.get("name") == name and q.distance(poly) < 0.0005]
            shape = unary_union([poly, *parts]) if parts else poly
        else:
            shape = pt.buffer(0.004)
        shapes[g["slug"]] = shape
        rec = facts[g["slug"]]
        f = gf.proj(g["lat"])
        try:
            w = gf.water_near(shape, f, feats)
            rec["lakes"] = w["lakes"]
        except Exception as e:
            print("lake fail", g["slug"], e, flush=True)
        rec["coastM"] = coast_m(shape, g["lat"])
        rec.pop("rivers", None)
        if i % 40 == 0:
            print(i, g["slug"], rec.get("lakes"), rec.get("coastM"), flush=True)

    def clim(g):
        e = facts[g["slug"]].get("elev")
        try:
            return g["slug"], climate(g["lat"], g["lon"], e[1] if e else None)
        except Exception as ex:
            print("climate fail", g["slug"], ex, flush=True)
            return g["slug"], None

    with cf.ThreadPoolExecutor(6) as ex:
        for slug, c in ex.map(clim, golf):
            if c:
                facts[slug]["clim"] = c
            else:
                facts[slug].pop("clim", None)
    with open(gf.OUT, "w", encoding="utf-8") as fp:
        fp.write("{\n" + ",\n".join(f'"{k}": {json.dumps(v, ensure_ascii=False, separators=(",", ":"))}' for k, v in facts.items()) + "\n}\n")
    ok = lambda k: sum(1 for v in facts.values() if v.get(k))
    print("done", {k: ok(k) for k in ["lakes", "coastM", "clim"]}, flush=True)
    print("sample", json.dumps(facts[golf[0]["slug"]], ensure_ascii=False), flush=True)


if __name__ == "__main__":
    sys.exit(main())
