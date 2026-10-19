"""
ECMWF IFS 공개 예보(0.25°)에서 한국 영역만 잘라 격자점별 JSON으로 만든다.

- 원본: ECMWF Open Data (CC-BY-4.0) AWS 미러. .index 파일로 필요한 변수만 바이트 범위로 받는다.
- 결과: out/ecmwf/{run}/{lat}_{lon}.json (격자점 하나), out/ecmwf/latest.json (최신 run)
- 값: temp·dew °C, wind·gust m/s, dir °, precip mm(구간 합), snow mm 물당량(구간 합), cloud %, cape J/kg
- 시각: run 기준 시간(step). 0~144h는 3시간, 그 뒤 360h까지 6시간 간격.

사용: python collector/collect.py [--run 2026101900] [--steps 0,3,6] [--out out]
"""

import argparse
import concurrent.futures as cf
import datetime as dt
import json
import math
import os
import sys
import time
import urllib.request

import eccodes
import numpy as np

BASE = "https://ecmwf-forecasts.s3.eu-central-1.amazonaws.com"
# 한국 영역 (제주·울릉·독도 포함)
LAT_MIN, LAT_MAX = 32.5, 39.5
LON_MIN, LON_MAX = 124.0, 132.0
RES = 0.25
PARAMS = ["2t", "2d", "10u", "10v", "10fg", "tp", "sf", "tcc", "mucape"]
# 돌풍은 step에 따라 10fg(지난 1·6시간 최대) 또는 10fg3(지난 3시간 최대)으로 온다
ALIAS = {"10fg3": "10fg", "10fg6": "10fg"}
STEPS = list(range(0, 145, 3)) + list(range(150, 361, 6))


def http(url, rng=None, tries=7):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"Range": f"bytes={rng[0]}-{rng[1]}"} if rng else {})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception:
            if i == tries - 1:
                raise
            # S3가 "Slow Down"(503)으로 막으면 잠시 쉬었다 다시
            time.sleep(min(30, 2**i))


def run_path(run):
    return f"{BASE}/{run[:8]}/{run[8:10]}z/ifs/0p25/oper/{run}0000"


def latest_run():
    """마지막 step(360h)까지 올라온 가장 최근 00/12 UTC run"""
    now = dt.datetime.now(dt.timezone.utc)
    for back in range(0, 72, 6):
        t = now - dt.timedelta(hours=back)
        h = 0 if t.hour < 12 else 12
        run = f"{t:%Y%m%d}{h:02d}"
        try:
            http(f"{run_path(run)}-360h-oper-fc.index", rng=(0, 10))
            return run
        except Exception:
            continue
    raise SystemExit("올라온 run을 찾지 못함")


def fields(run, step):
    """step 하나에서 PARAMS를 받아 {param: 한국 영역 2차원 배열}"""
    idx = http(f"{run_path(run)}-{step}h-oper-fc.index").decode().splitlines()
    want = set(PARAMS) | ({"z"} if step == 0 else set())
    out = {}
    for line in idx:
        j = json.loads(line)
        name = ALIAS.get(j["param"], j["param"])
        if j.get("levtype") != "sfc" or name not in want or name in out:
            continue
        o, n = j["_offset"], j["_length"]
        msg = eccodes.codes_new_from_message(http(f"{run_path(run)}-{step}h-oper-fc.grib2", rng=(o, o + n - 1)))
        try:
            nj = eccodes.codes_get(msg, "Nj")
            ni = eccodes.codes_get(msg, "Ni")
            lat0 = eccodes.codes_get(msg, "latitudeOfFirstGridPointInDegrees")
            lon0 = eccodes.codes_get(msg, "longitudeOfFirstGridPointInDegrees")
            vals = eccodes.codes_get_values(msg).reshape(nj, ni)
        finally:
            eccodes.codes_release(msg)
        # 위도는 북→남, 경도는 lon0부터 동쪽으로 (0~360 또는 -180~180)
        r0 = int(round((lat0 - LAT_MAX) / RES))
        r1 = int(round((lat0 - LAT_MIN) / RES))
        c0 = int(round(((LON_MIN - lon0) % 360) / RES))
        c1 = int(round(((LON_MAX - lon0) % 360) / RES))
        out[name] = vals[r0 : r1 + 1, c0 : c1 + 1]
    missing = want - out.keys()
    if missing:
        raise RuntimeError(f"step {step}: {sorted(missing)} 없음")
    return out


def r1(x):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run")
    ap.add_argument("--steps")
    ap.add_argument("--out", default="out")
    a = ap.parse_args()
    run = a.run or latest_run()
    steps = [int(s) for s in a.steps.split(",")] if a.steps else STEPS
    print("run", run, "steps", len(steps), flush=True)

    with cf.ThreadPoolExecutor(4) as ex:
        data = dict(zip(steps, ex.map(lambda s: fields(run, s), steps)))

    nlat, nlon = data[steps[0]]["2t"].shape
    elev = data[0]["z"] / 9.80665 if 0 in data else None
    folder = os.path.join(a.out, "ecmwf", run)
    os.makedirs(folder, exist_ok=True)
    for r in range(nlat):
        for c in range(nlon):
            lat = LAT_MAX - r * RES
            lon = LON_MIN + c * RES
            series = {k: [] for k in ["temp", "dew", "wind", "dir", "gust", "precip", "snow", "cloud", "cape"]}
            prev_tp = prev_sf = 0.0
            for s in steps:
                f = data[s]
                u, v = f["10u"][r, c], f["10v"][r, c]
                tp, sf = f["tp"][r, c] * 1000, f["sf"][r, c] * 1000
                series["temp"].append(r1(f["2t"][r, c] - 273.15))
                series["dew"].append(r1(f["2d"][r, c] - 273.15))
                series["wind"].append(r1(math.hypot(u, v)))
                series["dir"].append(round((math.degrees(math.atan2(-u, -v)) + 360) % 360))
                series["gust"].append(r1(f["10fg"][r, c]))
                # 누적값을 구간 값으로
                series["precip"].append(r1(max(0.0, tp - prev_tp)) if s else 0.0)
                series["snow"].append(r1(max(0.0, sf - prev_sf)) if s else 0.0)
                prev_tp, prev_sf = tp, sf
                series["cloud"].append(round(float(f["tcc"][r, c]) * 100))
                series["cape"].append(round(float(f["mucape"][r, c])))
            point = {
                "model": "ecmwf_ifs025",
                "run": run,
                "lat": lat,
                "lon": lon,
                "elevation": None if elev is None else round(float(elev[r, c])),
                "step": steps,
                **series,
            }
            with open(os.path.join(folder, f"{lat:.2f}_{lon:.2f}.json"), "w") as fp:
                json.dump(point, fp, separators=(",", ":"))
    with open(os.path.join(a.out, "ecmwf", "latest.json"), "w") as fp:
        json.dump({"run": run, "lat": [LAT_MIN, LAT_MAX], "lon": [LON_MIN, LON_MAX], "res": RES}, fp)
    print("points", nlat * nlon, flush=True)


if __name__ == "__main__":
    sys.exit(main())
