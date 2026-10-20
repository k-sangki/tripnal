"""
해외 여행지(src/data/overseas.json)의 평년 월별 날씨를 NASA POWER 일별 자료(2001~2020)로 계산해
src/data/climate.json에 저장한다. 한 번 만들어 두면 되는 자료라 필요할 때만 손으로 돌린다.

- 출처: NASA POWER (MERRA-2 기반, 공공 자료로 상업적 이용 가능, 출처 표기)
- 값(월별): hi·lo 일 최고·최저 기온 평균(°C), rain 월 강수량(mm), rainDays 1mm 이상 내린 날 수, hum 상대습도(%)
- 격자(약 0.5°) 고도와 여행지 고도가 다르면 기온을 0.0065°C/m로 보정한다.

사용: python collector/climate.py [--only osaka,tokyo]
"""

import argparse
import json
import os
import sys
import time
import urllib.request
from collections import defaultdict

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "src", "data", "overseas.json")
OUT = os.path.join(ROOT, "src", "data", "climate.json")
START, END = 2001, 2020
PARAMS = "T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M"
LAPSE = 0.0065


def fetch(lat, lon):
    url = (
        "https://power.larc.nasa.gov/api/temporal/daily/point"
        f"?parameters={PARAMS}&community=RE&longitude={lon}&latitude={lat}"
        f"&start={START}0101&end={END}1231&format=JSON"
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001 - 네트워크 오류는 잠시 뒤 다시
            print("  retry", attempt + 1, e, flush=True)
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"POWER 실패 {lat},{lon}")


def monthly(j, elevation):
    p = j["properties"]["parameter"]
    grid_elev = j["geometry"]["coordinates"][2] if len(j["geometry"]["coordinates"]) > 2 else None
    corr = 0.0 if grid_elev is None or elevation is None else -(elevation - grid_elev) * LAPSE
    hi, lo, hum = defaultdict(list), defaultdict(list), defaultdict(list)
    rain = defaultdict(float)
    rain_days = defaultdict(int)
    years = set()
    for day, v in p["T2M_MAX"].items():
        y, m = int(day[:4]), int(day[4:6])
        years.add(y)
        if v > -900:
            hi[m].append(v)
        lv = p["T2M_MIN"][day]
        if lv > -900:
            lo[m].append(lv)
        rv = p["PRECTOTCORR"][day]
        if rv > -900:
            rain[m] += rv
            rain_days[m] += rv >= 1.0
        hv = p["RH2M"][day]
        if hv > -900:
            hum[m].append(hv)
    n = len(years)
    out = []
    for m in range(1, 13):
        out.append(
            {
                "hi": round(sum(hi[m]) / len(hi[m]) + corr, 1),
                "lo": round(sum(lo[m]) / len(lo[m]) + corr, 1),
                "rain": round(rain[m] / n),
                "rainDays": round(rain_days[m] / n, 1),
                "hum": round(sum(hum[m]) / len(hum[m])),
            }
        )
    return out, grid_elev


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    with open(SRC, encoding="utf-8") as fp:
        places = json.load(fp)
    old = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fp:
            old = json.load(fp).get("places", {})
    only = set(filter(None, a.only.split(",")))
    result = dict(old)
    for d in places:
        slug = d["slug"]
        if only and slug not in only:
            continue
        if not only and slug in old:
            continue
        print(slug, flush=True)
        months, grid_elev = monthly(fetch(d["lat"], d["lon"]), d.get("elevation"))
        result[slug] = {"months": months, "gridElevation": grid_elev}
        time.sleep(1)
    # 목록에서 빠진 곳은 지운다
    slugs = {d["slug"] for d in places}
    result = {k: v for k, v in result.items() if k in slugs}
    with open(OUT, "w", encoding="utf-8") as fp:
        json.dump({"source": "NASA POWER", "years": [START, END], "places": result}, fp, ensure_ascii=False, separators=(",", ":"))
    print("done", len(result), file=sys.stderr)


if __name__ == "__main__":
    main()
