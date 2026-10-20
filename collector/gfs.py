"""
NOAA GFS 공개 예보(0.25°)에서 한국 영역만 잘라 격자점별 JSON으로 만든다. collect.py(ECMWF)와 같은 모양.

- 원본: NOAA Open Data Dissemination AWS 버킷 noaa-gfs-bdp-pds (미국 정부 자료, 상업 이용 가능).
  .idx 파일로 필요한 변수만 바이트 범위로 받는다.
- 결과: out/gfs/{run}/{lat}_{lon}.json, out/gfs/latest.json
- 값: collect.py와 같고 시정 vis(m)가 더 있다. 3시간 간격으로 384시간(16일)까지.

사용: python collector/gfs.py [--run 2026101912] [--steps 0,3,6] [--out out]
"""

import argparse
import concurrent.futures as cf
import datetime as dt
import json
import math
import os
import sys

import eccodes

from collect import LAT_MAX, LAT_MIN, LON_MAX, LON_MIN, RES, http, r1, retry
from overseas import POINTS, pick

BASE = "https://noaa-gfs-bdp-pds.s3.amazonaws.com"
STEPS = list(range(0, 385, 3))
# idx의 "변수:층" → 이름. APCP는 0시부터 누적한 값을 고른다(fields 참고)
WANT = {
    "TMP:2 m above ground": "2t",
    "DPT:2 m above ground": "2d",
    "UGRD:10 m above ground": "10u",
    "VGRD:10 m above ground": "10v",
    "GUST:surface": "gust",
    "TCDC:entire atmosphere": "tcc",
    "CAPE:surface": "cape",
    "CSNOW:surface": "csnow",
    "VIS:surface": "vis",
    "APCP:surface": "tp",
}


def run_path(run):
    return f"{BASE}/gfs.{run[:8]}/{run[8:10]}/atmos/gfs.t{run[8:10]}z.pgrb2.0p25"


def latest_run():
    """마지막 step(384h)까지 올라온 가장 최근 run (00·06·12·18 UTC)"""
    now = dt.datetime.now(dt.timezone.utc)
    for back in range(0, 48, 6):
        t = now - dt.timedelta(hours=back)
        run = f"{t:%Y%m%d}{t.hour // 6 * 6:02d}"
        try:
            http(f"{run_path(run)}.f384.idx", rng=(0, 10))
            return run
        except Exception:
            continue
    raise SystemExit("올라온 run을 찾지 못함")


def pick_ranges(lines, step):
    """idx 줄에서 받을 메시지 {이름: (시작, 끝)}"""
    out = {}
    for i, line in enumerate(lines):
        p = line.split(":")
        key = f"{p[3]}:{p[4]}"
        name = WANT.get(key) or ("z" if key == "HGT:surface" and step == 0 else None)
        if not name:
            continue
        kind = p[5]
        if name == "tp":
            # 같은 시각에 구간 누적(6-9 hour acc)과 0시부터 누적(0-9 hour acc, 0-16 day acc)이 함께 온다
            if not kind.startswith("0-"):
                continue
        elif name in out or "ave" in kind:
            # 평균값(0-6 hour ave)이 아닌 순간값만
            continue
        start = int(p[1])
        end = int(lines[i + 1].split(":")[1]) - 1 if i + 1 < len(lines) else None
        out[name] = (start, end)
    return out


def fields(run, step):
    lines = http(f"{run_path(run)}.f{step:03d}.idx").decode().splitlines()
    want = set(WANT.values()) - ({"tp"} if step == 0 else set()) | ({"z"} if step == 0 else set())
    # step 0에는 강수·돌풍 같은 값이 없을 수 있다
    rngs = pick_ranges(lines, step)
    # 해외 여행지 둘레 격자점은 out["@x"][이름] (1, n)
    out = {"@x": {}}
    for name, (o, e) in rngs.items():
        msg = eccodes.codes_new_from_message(http(f"{run_path(run)}.f{step:03d}", rng=(o, e) if e else (o, o + 50_000_000)))
        try:
            nj = eccodes.codes_get(msg, "Nj")
            ni = eccodes.codes_get(msg, "Ni")
            lat0 = eccodes.codes_get(msg, "latitudeOfFirstGridPointInDegrees")
            lon0 = eccodes.codes_get(msg, "longitudeOfFirstGridPointInDegrees")
            vals = eccodes.codes_get_values(msg).reshape(nj, ni)
        finally:
            eccodes.codes_release(msg)
        r0 = int(round((lat0 - LAT_MAX) / RES))
        r1_ = int(round((lat0 - LAT_MIN) / RES))
        c0 = int(round(((LON_MIN - lon0) % 360) / RES))
        c1 = int(round(((LON_MAX - lon0) % 360) / RES))
        out[name] = vals[r0 : r1_ + 1, c0 : c1 + 1]
        out["@x"][name] = pick(vals, lat0, lon0, RES)
    missing = want - out.keys() - ({"gust", "cape", "csnow", "tcc", "vis"} if step == 0 else set())
    if missing:
        raise RuntimeError(f"step {step}: {sorted(missing)} 없음")
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

    folder = os.path.join(a.out, "gfs", run)
    os.makedirs(folder, exist_ok=True)
    data_x = {s: data[s].pop("@x") for s in steps}
    n = write(folder, run, steps, data, lambda r, c: (LAT_MAX - r * RES, LON_MIN + c * RES))
    # 해외 여행지: (1, n) 배열을 한 줄짜리 격자처럼 쓴다
    n += write(folder, run, steps, data_x, lambda r, c: POINTS[c])
    with open(os.path.join(a.out, "gfs", "latest.json"), "w") as fp:
        json.dump({"run": run, "lat": [LAT_MIN, LAT_MAX], "lon": [LON_MIN, LON_MAX], "res": RES}, fp)
    print("points", n, flush=True)


def write(folder, run, steps, data, coord):
    """data[step][이름][r, c] → 격자점별 JSON. coord(r, c) = (lat, lon)"""
    nlat, nlon = data[steps[0]]["2t"].shape
    elev = data[0].get("z") if 0 in data else None

    def at(f, k, r, c):
        return float(f[k][r, c]) if k in f else None

    for r in range(nlat):
        for c in range(nlon):
            lat, lon = coord(r, c)
            series = {k: [] for k in ["temp", "dew", "wind", "dir", "gust", "precip", "snow", "cloud", "cape", "vis"]}
            prev_tp = 0.0
            for s in steps:
                f = data[s]
                u, v = f["10u"][r, c], f["10v"][r, c]
                tp = at(f, "tp", r, c) or 0.0
                rain = max(0.0, tp - prev_tp) if s else 0.0
                prev_tp = tp
                series["temp"].append(r1(f["2t"][r, c] - 273.15))
                series["dew"].append(r1(f["2d"][r, c] - 273.15))
                series["wind"].append(r1(math.hypot(u, v)))
                series["dir"].append(round((math.degrees(math.atan2(-u, -v)) + 360) % 360))
                series["gust"].append(r1(at(f, "gust", r, c)))
                series["precip"].append(r1(rain))
                # 눈 여부(CSNOW)가 켜진 시각의 강수를 눈(물당량)으로 본다
                series["snow"].append(r1(rain if (at(f, "csnow", r, c) or 0) >= 0.5 else 0.0))
                tcc = at(f, "tcc", r, c)
                series["cloud"].append(None if tcc is None else round(tcc))
                cape = at(f, "cape", r, c)
                series["cape"].append(None if cape is None else round(cape))
                vis = at(f, "vis", r, c)
                series["vis"].append(None if vis is None else round(vis))
            point = {
                "model": "gfs025",
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
