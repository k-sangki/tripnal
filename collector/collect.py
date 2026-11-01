"""
ECMWF IFS 공개 예보(0.25°)에서 한국 영역만 잘라 격자점별 JSON으로 만든다.

- 원본: ECMWF Open Data (CC-BY-4.0) AWS 미러. .index 파일로 필요한 변수만 바이트 범위로 받는다.
- 결과: out/ecmwf/{run}/{lat}_{lon}.json (격자점 하나), out/ecmwf/latest.json (최신 run)
  해외 여행지 둘레 격자점(overseas.py)도 같은 폴더에 같은 모양으로 남긴다.
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
import random
import sys
import time
import urllib.request

import eccodes
import numpy as np

from overseas import POINTS, pick

# 같은 파일을 두는 공개 미러들. AWS S3가 "Slow Down"(503)을 오래 돌려줄 때가 있어(2026-10-31·11-01)
# 같은 경로를 ECMWF 자체 서버·Azure 미러에서도 받아 본다. 파일과 .index 바이트 위치는 셋 다 같다.
MIRRORS = [
    "https://ecmwf-forecasts.s3.eu-central-1.amazonaws.com",
    "https://data.ecmwf.int/forecasts",
    "https://ai4edataeuwest.blob.core.windows.net/ecmwf",
]
ECMWF_PREFIX = "ecmwf:"
# 한국 영역 (제주·울릉·독도 포함)
LAT_MIN, LAT_MAX = 32.5, 39.5
LON_MIN, LON_MAX = 124.0, 132.0
RES = 0.25
PARAMS = ["2t", "2d", "10u", "10v", "10fg", "tp", "sf", "tcc", "mucape"]
# 돌풍은 step에 따라 10fg(지난 1·6시간 최대) 또는 10fg3(지난 3시간 최대)으로 온다
ALIAS = {"10fg3": "10fg", "10fg6": "10fg"}
STEPS = list(range(0, 145, 3)) + list(range(150, 361, 6))


def _get(url, rng):
    req = urllib.request.Request(url, headers={"Range": f"bytes={rng[0]}-{rng[1]}"} if rng else {})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def http(url, rng=None, tries=7):
    """주소 하나를 받는다. "ecmwf:경로"면 미러를 돌아가며 받는다.
    일시 오류(503·타임아웃 등)는 점점 길게(무작위 섞어) 쉬었다가 다시 시도한다."""
    urls = [m + url[len(ECMWF_PREFIX):] for m in MIRRORS] if url.startswith(ECMWF_PREFIX) else [url]
    for i in range(tries):
        errs = []
        # 미러는 시도마다 시작점을 바꿔 한 곳에 몰리지 않게 한다
        for u in urls[i % len(urls) :] + urls[: i % len(urls)]:
            try:
                return _get(u, rng)
            except Exception as e:  # 404(아직 안 올라온 미러)·503·연결 끊김 모두 다음 미러로
                errs.append(e)
        # ECMWF 미러가 모두 404면 아직 없는 파일이라 기다려도 소용없다 (latest_run이 바로 이전 run으로 넘어가게)
        # 다른 수집기(GFS·ICON 등)는 덜 올라온 파일을 기다리던 예전 동작 그대로 둔다
        all404 = len(urls) > 1 and all(getattr(e, "code", None) == 404 for e in errs)
        if i == tries - 1 or all404:
            raise errs[0]
        # S3가 "Slow Down"(503)으로 막으면 잠시 쉬었다 다시 (1·2·4·8·16·30초 + 흔들기)
        time.sleep(min(30, 2**i) * random.uniform(0.7, 1.3))


def run_path(run):
    return f"{ECMWF_PREFIX}/{run[:8]}/{run[8:10]}z/ifs/0p25/oper/{run}0000"


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
    """step 하나에서 PARAMS를 받아 {param: 한국 영역 2차원 배열}, 해외 지점은 out["@x"][param] (1, n)"""
    idx = http(f"{run_path(run)}-{step}h-oper-fc.index").decode().splitlines()
    want = set(PARAMS) | ({"z"} if step == 0 else set())
    out = {"@x": {}}
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
        out["@x"][name] = pick(vals, lat0, lon0, RES)
    missing = want - out.keys()
    if missing:
        raise RuntimeError(f"step {step}: {sorted(missing)} 없음")
    return out


def retry(fn, *args, tries=3, quiet=False):
    """step 하나가 실패하면(일시적인 S3 오류·덜 올라온 파일) 잠시 뒤 통째로 다시 받는다"""
    for i in range(tries):
        try:
            return fn(*args)
        except Exception as e:
            if i == tries - 1:
                if quiet:
                    raise
                # GitHub Actions 주석으로 남겨 API로도 원인을 볼 수 있게 한다
                print(f"::error::{fn.__name__}{args}: {type(e).__name__}: {e}", flush=True)
                raise
            time.sleep(20 * (i + 1))


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

    def first_try(s):
        try:
            return retry(fields, run, s, quiet=True)
        except Exception as e:
            print(f"step {s} 미룸: {type(e).__name__}: {e}", flush=True)
            return None

    with cf.ThreadPoolExecutor(4) as ex:
        data = dict(zip(steps, ex.map(first_try, steps)))
    # 서버가 한동안 503을 내던 step은 다른 step을 다 받은 뒤 쉬었다가 하나씩 다시 받는다
    late = [s for s in steps if data[s] is None]
    if late:
        print("다시 받을 step", late, flush=True)
        time.sleep(90)
        for s in late:
            data[s] = retry(fields, run, s)

    folder = os.path.join(a.out, "ecmwf", run)
    os.makedirs(folder, exist_ok=True)
    n = write(folder, run, steps, data, lambda r, c: (LAT_MAX - r * RES, LON_MIN + c * RES))
    # 해외 여행지: (1, n) 배열을 한 줄짜리 격자처럼 쓴다
    data_x = {s: data[s].pop("@x") for s in steps}
    n += write(folder, run, steps, data_x, lambda r, c: POINTS[c])
    with open(os.path.join(a.out, "ecmwf", "latest.json"), "w") as fp:
        json.dump({"run": run, "lat": [LAT_MIN, LAT_MAX], "lon": [LON_MIN, LON_MAX], "res": RES}, fp)
    print("points", n, flush=True)


def write(folder, run, steps, data, coord):
    """data[step][param][r, c] → 격자점별 JSON. coord(r, c) = (lat, lon)"""
    data = {s: {k: v for k, v in f.items() if k != "@x"} for s, f in data.items()}
    nlat, nlon = data[steps[0]]["2t"].shape
    elev = data[0]["z"] / 9.80665 if 0 in data else None
    for r in range(nlat):
        for c in range(nlon):
            lat, lon = coord(r, c)
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
    return nlat * nlon


if __name__ == "__main__":
    sys.exit(main())
