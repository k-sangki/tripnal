"""
독일 기상청(DWD) ICON 전지구 예보에서 한국 영역 값을 뽑아 격자점별 JSON으로 만든다. collect.py(ECMWF)와 같은 모양.

- 원본: DWD Open Data (opendata.dwd.de, 출처 표기 시 상업 이용 가능). 정이십면체 격자(약 13km)라
  격자 중심 좌표(CLAT·CLON)로 0.25° 격자점마다 가장 가까운 칸을 고른다.
- 결과: out/icon/{run}/{lat}_{lon}.json, out/icon/latest.json
- 시각: 3시간 간격으로 180시간(7.5일)까지. 돌풍은 그 3시간 동안의 최대값.

사용: python collector/icon.py [--run 2026101912] [--steps 0,3,6] [--out out]
"""

import argparse
import bz2
import concurrent.futures as cf
import datetime as dt
import json
import math
import os
import sys

import eccodes
import numpy as np

from collect import LAT_MAX, LAT_MIN, LON_MAX, LON_MIN, RES, http, r1, retry

BASE = "https://opendata.dwd.de/weather/nwp/icon/grib"
STEPS = list(range(0, 181, 3))
# 1시간 간격 출력은 78시간까지라, 그 안에서는 돌풍을 매시간 받아 3시간 최대를 낸다
HOURLY_UNTIL = 78
VARS = ["T_2M", "TD_2M", "U_10M", "V_10M", "TOT_PREC", "SNOW_GSP", "SNOW_CON", "CLCT", "CAPE_ML"]


def url(run, var, step=None):
    hh = run[8:10]
    if step is None:
        return f"{BASE}/{hh}/{var.lower()}/icon_global_icosahedral_time-invariant_{run}_{var}.grib2.bz2"
    return f"{BASE}/{hh}/{var.lower()}/icon_global_icosahedral_single-level_{run}_{step:03d}_{var}.grib2.bz2"


def values(u):
    msg = eccodes.codes_new_from_message(bz2.decompress(http(u)))
    try:
        return eccodes.codes_get_values(msg)
    finally:
        eccodes.codes_release(msg)


def latest_run():
    """마지막 step(180h)까지 올라온 가장 최근 00·12 UTC run"""
    now = dt.datetime.now(dt.timezone.utc)
    for back in range(0, 48, 6):
        t = now - dt.timedelta(hours=back)
        run = f"{t:%Y%m%d}{0 if t.hour < 12 else 12:02d}"
        try:
            http(url(run, "T_2M", 180), rng=(0, 10), tries=2)
            return run
        except Exception:
            continue
    raise SystemExit("올라온 run을 찾지 못함")


def nearest_cells(run):
    """0.25° 격자점(북→남, 서→동 순서)마다 가장 가까운 ICON 칸 번호와 그 칸의 고도"""
    clat, clon = values(url(run, "CLAT")), values(url(run, "CLON"))
    # 영역 근처 칸만 추려서 비교한다
    near = np.where((clat > LAT_MIN - 0.5) & (clat < LAT_MAX + 0.5) & (clon > LON_MIN - 0.5) & (clon < LON_MAX + 0.5))[0]
    la, lo = np.radians(clat[near]), np.radians(clon[near])
    lats = np.arange(LAT_MAX, LAT_MIN - RES / 2, -RES)
    lons = np.arange(LON_MIN, LON_MAX + RES / 2, RES)
    idx = np.empty((len(lats), len(lons)), dtype=np.int64)
    for r, lat in enumerate(lats):
        for c, lon in enumerate(lons):
            p, q = math.radians(lat), math.radians(lon)
            d = np.sin((la - p) / 2) ** 2 + np.cos(p) * np.cos(la) * np.sin((lo - q) / 2) ** 2
            idx[r, c] = near[int(np.argmin(d))]
    hsurf = values(url(run, "HSURF"))
    return idx, hsurf[idx]


def fields(run, step, idx):
    out = {v: values(url(run, v, step))[idx] for v in VARS}
    # 돌풍(VMAX_10M)은 step 0에 없다. 78시간까지는 지난 3시간의 매시간 값 중 최대
    if step:
        hours = range(step - 2, step + 1) if step <= HOURLY_UNTIL else [step]
        out["VMAX_10M"] = np.max([values(url(run, "VMAX_10M", h))[idx] for h in hours], axis=0)
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

    idx, elev = retry(nearest_cells, run)
    with cf.ThreadPoolExecutor(6) as ex:
        data = dict(zip(steps, ex.map(lambda s: retry(fields, run, s, idx), steps)))

    nlat, nlon = idx.shape
    folder = os.path.join(a.out, "icon", run)
    os.makedirs(folder, exist_ok=True)
    for r in range(nlat):
        for c in range(nlon):
            lat = LAT_MAX - r * RES
            lon = LON_MIN + c * RES
            series = {k: [] for k in ["temp", "dew", "wind", "dir", "gust", "precip", "snow", "cloud", "cape"]}
            prev_tp = prev_sn = 0.0
            for s in steps:
                f = data[s]
                u, v = float(f["U_10M"][r, c]), float(f["V_10M"][r, c])
                tp = float(f["TOT_PREC"][r, c])
                sn = float(f["SNOW_GSP"][r, c]) + float(f["SNOW_CON"][r, c])
                series["temp"].append(r1(f["T_2M"][r, c] - 273.15))
                series["dew"].append(r1(f["TD_2M"][r, c] - 273.15))
                series["wind"].append(r1(math.hypot(u, v)))
                series["dir"].append(round((math.degrees(math.atan2(-u, -v)) + 360) % 360))
                series["gust"].append(r1(f["VMAX_10M"][r, c]) if "VMAX_10M" in f else None)
                # 누적값을 구간 값으로
                series["precip"].append(r1(max(0.0, tp - prev_tp)) if s else 0.0)
                series["snow"].append(r1(max(0.0, sn - prev_sn)) if s else 0.0)
                prev_tp, prev_sn = tp, sn
                series["cloud"].append(round(float(f["CLCT"][r, c])))
                series["cape"].append(round(float(f["CAPE_ML"][r, c])))
            point = {
                "model": "icon_global",
                "run": run,
                "lat": lat,
                "lon": lon,
                "elevation": round(float(elev[r, c])),
                "step": steps,
                **series,
            }
            with open(os.path.join(folder, f"{lat:.2f}_{lon:.2f}.json"), "w") as fp:
                json.dump(point, fp, separators=(",", ":"))
    with open(os.path.join(a.out, "icon", "latest.json"), "w") as fp:
        json.dump({"run": run, "lat": [LAT_MIN, LAT_MAX], "lon": [LON_MIN, LON_MAX], "res": RES}, fp)
    print("points", nlat * nlon, flush=True)


if __name__ == "__main__":
    sys.exit(main())
