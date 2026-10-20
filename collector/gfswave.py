"""
NOAA GFS-Wave(0.25°) 바다 예보에서 한국 영역 파고를 뽑아 바다 격자점별 JSON으로 만든다.

- 원본: NOAA Open Data Dissemination AWS 버킷 noaa-gfs-bdp-pds (미국 정부 자료, 상업 이용 가능).
- 결과: out/wave/{run}/{lat}_{lon}.json (바다인 점만), out/wave/{run}/sea.json (바다인 점 목록), out/wave/latest.json
- 값: wave 유의파고 m, windwave 풍랑 m, period 주기 s. 3시간 간격으로 384시간(16일)까지.

사용: python collector/gfswave.py [--run 2026101918] [--steps 0,3,6] [--out out]
"""

import argparse
import concurrent.futures as cf
import datetime as dt
import json
import os
import sys

import eccodes
import numpy as np

from collect import LAT_MAX, LAT_MIN, LON_MAX, LON_MIN, RES, http, r1, retry

BASE = "https://noaa-gfs-bdp-pds.s3.amazonaws.com"
STEPS = list(range(0, 385, 3))
WANT = {"HTSGW:surface": "wave", "WVHGT:surface": "windwave", "PERPW:surface": "period"}


def run_path(run):
    return f"{BASE}/gfs.{run[:8]}/{run[8:10]}/wave/gridded/gfswave.t{run[8:10]}z.global.0p25"


def latest_run():
    """마지막 step(384h)까지 올라온 가장 최근 run (00·06·12·18 UTC)"""
    now = dt.datetime.now(dt.timezone.utc)
    for back in range(0, 48, 6):
        t = now - dt.timedelta(hours=back)
        run = f"{t:%Y%m%d}{t.hour // 6 * 6:02d}"
        try:
            http(f"{run_path(run)}.f384.grib2.idx", rng=(0, 10))
            return run
        except Exception:
            continue
    raise SystemExit("올라온 run을 찾지 못함")


def fields(run, step):
    url = f"{run_path(run)}.f{step:03d}.grib2"
    lines = http(f"{url}.idx").decode().splitlines()
    out = {}
    for i, line in enumerate(lines):
        p = line.split(":")
        name = WANT.get(f"{p[3]}:{p[4]}")
        if not name:
            continue
        start = int(p[1])
        end = int(lines[i + 1].split(":")[1]) - 1 if i + 1 < len(lines) else start + 50_000_000
        msg = eccodes.codes_new_from_message(http(url, rng=(start, end)))
        try:
            nj = eccodes.codes_get(msg, "Nj")
            ni = eccodes.codes_get(msg, "Ni")
            lat0 = eccodes.codes_get(msg, "latitudeOfFirstGridPointInDegrees")
            lon0 = eccodes.codes_get(msg, "longitudeOfFirstGridPointInDegrees")
            dlat = eccodes.codes_get(msg, "jDirectionIncrementInDegrees")
            south_first = eccodes.codes_get(msg, "jScansPositively") == 1
            missing = eccodes.codes_get(msg, "missingValue")
            vals = eccodes.codes_get_values(msg).reshape(nj, ni)
        finally:
            eccodes.codes_release(msg)
        vals = np.where(vals == missing, np.nan, vals)
        if south_first:
            # 남→북으로 저장된 격자는 북→남으로 뒤집는다
            vals = vals[::-1]
            lat0 = lat0 + (nj - 1) * dlat
        r0 = int(round((lat0 - LAT_MAX) / RES))
        r1_ = int(round((lat0 - LAT_MIN) / RES))
        c0 = int(round(((LON_MIN - lon0) % 360) / RES))
        c1 = int(round(((LON_MAX - lon0) % 360) / RES))
        out[name] = vals[r0 : r1_ + 1, c0 : c1 + 1]
    if "wave" not in out:
        raise RuntimeError(f"step {step}: HTSGW 없음")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run")
    ap.add_argument("--steps")
    ap.add_argument("--out", default="out")
    a = ap.parse_args()
    run = a.run or latest_run()
    steps = [int(s) for s in a.steps.split(",")] if a.steps else STEPS
    print("run", run, "steps", len(steps), flush=True)

    with cf.ThreadPoolExecutor(8) as ex:
        data = dict(zip(steps, ex.map(lambda s: retry(fields, run, s), steps)))

    nlat, nlon = data[steps[0]]["wave"].shape
    folder = os.path.join(a.out, "wave", run)
    os.makedirs(folder, exist_ok=True)
    sea = []
    for r in range(nlat):
        for c in range(nlon):
            series = {k: [] for k in ["wave", "windwave", "period"]}
            for s in steps:
                for k in series:
                    v = data[s].get(k)
                    x = None if v is None or np.isnan(v[r, c]) else float(v[r, c])
                    series[k].append(None if x is None else r1(x))
            # 한 번도 값이 없는 점은 육지
            if all(x is None for x in series["wave"]):
                continue
            lat = LAT_MAX - r * RES
            lon = LON_MIN + c * RES
            sea.append(f"{lat:.2f}_{lon:.2f}")
            point = {"model": "gfswave025", "run": run, "lat": lat, "lon": lon, "step": steps, **series}
            with open(os.path.join(folder, f"{lat:.2f}_{lon:.2f}.json"), "w") as fp:
                json.dump(point, fp, separators=(",", ":"))
    with open(os.path.join(folder, "sea.json"), "w") as fp:
        json.dump(sea, fp, separators=(",", ":"))
    with open(os.path.join(a.out, "wave", "latest.json"), "w") as fp:
        json.dump({"run": run, "lat": [LAT_MIN, LAT_MAX], "lon": [LON_MIN, LON_MAX], "res": RES}, fp)
    print("sea points", len(sea), "of", nlat * nlon, flush=True)


if __name__ == "__main__":
    sys.exit(main())
