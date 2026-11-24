"""
명산 정상 평년 기후를 모아 src/data/mountain-climate.json에 저장한다 (산마다 다른 숫자 자료, 2026-11-24).
한 번 만들면 되는 자료라 필요할 때만 돌린다.

- NASA POWER 월별 기후값(climatology): 평균 기온·일교차로 낮·밤 평균 기온, 강수량, 풍속
- 격자 고도와 정상 고도 차이만큼 0.0065°C/m 보정 (golf_facts.py와 같은 방식)

사용: python collector/mountain_climate.py 산목록.json
  산목록.json = [{"slug", "lat", "lon", "elevation"}, ...] (src/data/mountain-intro.ts에 있는 산)
"""

import concurrent.futures as cf
import json
import os
import sys
import time
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "src", "data", "mountain-climate.json")
LAPSE = 0.0065
UA = {"User-Agent": "tripnalc-mountain-climate/1.0 (weather site data build)"}


def get(url, tries=6, timeout=120):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read()
        except Exception as e:
            if i == tries - 1:
                raise
            print("retry", e, flush=True)
            time.sleep(min(60, 3 * 2**i))


def climate(lat, lon, elev):
    """golf_facts_patch.climate와 같은 계산. T2M_MAX/MIN은 달의 극값이라 평균 기온±일교차/2로 낮·밤 평균을 만든다"""
    url = (
        "https://power.larc.nasa.gov/api/temporal/climatology/point"
        f"?parameters=T2M,T2M_RANGE,PRECTOTCORR,WS2M&community=AG&longitude={lon}&latitude={lat}&format=JSON"
    )
    j = json.loads(get(url))
    p = j["properties"]["parameter"]
    gz = j["geometry"]["coordinates"][2] if len(j["geometry"]["coordinates"]) > 2 else None
    adj = (gz - elev) * LAPSE if (gz is not None and elev is not None) else 0
    mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    days = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return {
        "hi": [round(p["T2M"][m] + p["T2M_RANGE"][m] / 2 + adj, 1) for m in mon],
        "lo": [round(p["T2M"][m] - p["T2M_RANGE"][m] / 2 + adj, 1) for m in mon],
        "rain": [round(p["PRECTOTCORR"][m] * d) for m, d in zip(mon, days)],
        "wind": [round(p["WS2M"][m], 1) for m in mon],
        "gridElev": gz,
    }


def main():
    mountains = json.load(open(sys.argv[1], encoding="utf-8"))
    out = {}
    with cf.ThreadPoolExecutor(4) as ex:
        futs = {ex.submit(climate, m["lat"], m["lon"], m["elevation"]): m["slug"] for m in mountains}
        for f in cf.as_completed(futs):
            slug = futs[f]
            try:
                out[slug] = f.result()
            except Exception as e:
                print("fail", slug, e, flush=True)
    json.dump(dict(sorted(out.items())), open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("saved", len(out), "/", len(mountains), flush=True)


if __name__ == "__main__":
    main()
