"""
NOAA GEFS 앙상블(0.5°, 31개 멤버)로 6시간 강수 확률을 만들어 격자점별 JSON으로 남긴다.

- 원본: NOAA Open Data Dissemination AWS 버킷 noaa-gefs-pds (미국 정부 자료, 상업 이용 가능).
  멤버마다 .idx로 APCP(6시간 누적)만 받는다.
- 결과: out/gefs/{run}/{lat}_{lon}.json, out/gefs/latest.json (격자는 collect.py와 같은 0.25°. 0.5° 값을 선형 보간)
- 값: prob = 그 6시간 동안 THRESHOLD mm 이상 내릴 멤버 비율(%). step은 6~384시간.

사용: python collector/gefs.py [--run 2026101918] [--steps 6,12] [--out out]
"""

import argparse
import concurrent.futures as cf
import datetime as dt
import json
import os
import sys

import eccodes
import numpy as np

from collect import LAT_MAX, LAT_MIN, LON_MAX, LON_MIN, RES, http, retry
from overseas import POINTS

BASE = "https://noaa-gefs-pds.s3.amazonaws.com"
MEMBERS = ["gec00"] + [f"gep{i:02d}" for i in range(1, 31)]
STEPS = list(range(6, 385, 6))
# 6시간에 이만큼 이상이면 "비가 온다"로 센다 (mm)
THRESHOLD = 0.2


def path(run, member, step):
    return f"{BASE}/gefs.{run[:8]}/{run[8:10]}/atmos/pgrb2ap5/{member}.t{run[8:10]}z.pgrb2a.0p50.f{step:03d}"


def latest_run():
    """마지막 멤버의 384h까지 올라온 가장 최근 run"""
    now = dt.datetime.now(dt.timezone.utc)
    for back in range(0, 48, 6):
        t = now - dt.timedelta(hours=back)
        run = f"{t:%Y%m%d}{t.hour // 6 * 6:02d}"
        try:
            http(f"{path(run, MEMBERS[-1], 384)}.idx", rng=(0, 10), tries=2)
            return run
        except Exception:
            continue
    raise SystemExit("올라온 run을 찾지 못함")


def x_index(lat0, lon0, ni, res=0.5):
    """해외 지점(0.25°)마다 둘러싼 0.5° 칸 네 개의 (행, 열, 가중치), 모양 (n, 4)"""
    y = np.array([(lat0 - la) / res for la, _ in POINTS])
    x = np.array([((lo - lon0) % 360) / res for _, lo in POINTS])
    y0, x0 = np.floor(y).astype(int), np.floor(x).astype(int)
    fy, fx = y - y0, x - x0
    rows = np.stack([y0, y0 + 1, y0, y0 + 1], 1)
    cols = np.stack([x0, x0, x0 + 1, x0 + 1], 1) % ni
    w = np.stack([(1 - fy) * (1 - fx), fy * (1 - fx), (1 - fy) * fx, fy * fx], 1)
    return rows, cols, w


def apcp(run, member, step):
    """한국 영역(0.5°, 북→남) 6시간 강수 mm, 영역 북·서 끝 좌표, 해외 지점 둘레 칸 값 (n, 4)"""
    url = path(run, member, step)
    lines = http(f"{url}.idx").decode().splitlines()
    for i, line in enumerate(lines):
        p = line.split(":")
        # 6시간 버킷: "N-6 to N hour acc" 중 시작이 step-6인 것만
        if p[3] == "APCP" and p[5].startswith(f"{step - 6}-{step} hour acc"):
            start = int(p[1])
            end = int(lines[i + 1].split(":")[1]) - 1 if i + 1 < len(lines) else start + 5_000_000
            break
    else:
        raise RuntimeError(f"{member} f{step}: APCP {step - 6}-{step} 없음")
    msg = eccodes.codes_new_from_message(http(url, rng=(start, end)))
    try:
        nj = eccodes.codes_get(msg, "Nj")
        ni = eccodes.codes_get(msg, "Ni")
        lat0 = eccodes.codes_get(msg, "latitudeOfFirstGridPointInDegrees")
        lon0 = eccodes.codes_get(msg, "longitudeOfFirstGridPointInDegrees")
        vals = eccodes.codes_get_values(msg).reshape(nj, ni)
    finally:
        eccodes.codes_release(msg)
    res = 0.5
    # 0.25° 격자를 덮도록 0.5° 칸을 한 칸씩 더 받는다
    r0 = int(np.floor((lat0 - LAT_MAX) / res))
    r1 = int(np.ceil((lat0 - LAT_MIN) / res))
    c0 = int(np.floor(((LON_MIN - lon0) % 360) / res))
    c1 = int(np.ceil(((LON_MAX - lon0) % 360) / res))
    rows, cols, _ = x_index(lat0, lon0, ni)
    return vals[r0 : r1 + 1, c0 : c1 + 1], lat0 - r0 * res, lon0 + c0 * res, vals[rows, cols], (lat0, lon0, ni)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run")
    ap.add_argument("--steps")
    ap.add_argument("--out", default="out")
    a = ap.parse_args()
    run = a.run or latest_run()
    steps = [int(s) for s in a.steps.split(",")] if a.steps else STEPS
    print("run", run, "steps", len(steps), "members", len(MEMBERS), flush=True)

    jobs = [(m, s) for s in steps for m in MEMBERS]
    with cf.ThreadPoolExecutor(16) as ex:
        res = list(ex.map(lambda j: retry(apcp, run, *j), jobs))
    north, west = res[0][1], res[0][2]
    # step별 멤버 비율(0.5° 격자)
    prob = {}
    for s in steps:
        stack = np.stack([res[i][0] for i, (_, js) in enumerate(jobs) if js == s])
        prob[s] = (stack >= THRESHOLD).mean(axis=0) * 100

    lats = np.arange(LAT_MAX, LAT_MIN - RES / 2, -RES)
    lons = np.arange(LON_MIN, LON_MAX + RES / 2, RES)
    folder = os.path.join(a.out, "gefs", run)
    os.makedirs(folder, exist_ok=True)
    for lat in lats:
        for lon in lons:
            # 0.5° 격자 위 쌍선형 보간
            y = (north - lat) / 0.5
            x = (lon - west) / 0.5
            y0, x0 = int(np.floor(y)), int(np.floor(x))
            fy, fx = y - y0, x - x0
            values = []
            for s in steps:
                g = prob[s]
                y1, x1 = min(y0 + 1, g.shape[0] - 1), min(x0 + 1, g.shape[1] - 1)
                v = (g[y0, x0] * (1 - fy) + g[y1, x0] * fy) * (1 - fx) + (g[y0, x1] * (1 - fy) + g[y1, x1] * fy) * fx
                values.append(int(round(v)))
            point = {"model": "gefs05", "run": run, "lat": float(lat), "lon": float(lon), "step": steps, "prob": values}
            with open(os.path.join(folder, f"{lat:.2f}_{lon:.2f}.json"), "w") as fp:
                json.dump(point, fp, separators=(",", ":"))
    with open(os.path.join(a.out, "gefs", "latest.json"), "w") as fp:
        json.dump({"run": run, "lat": [LAT_MIN, LAT_MAX], "lon": [LON_MIN, LON_MAX], "res": RES}, fp)
    # 해외 여행지: 둘레 0.5° 칸 네 개의 확률을 가중 평균
    _, _, w = x_index(*res[0][4])
    for i, (lat, lon) in enumerate(POINTS):
        values = []
        for s in steps:
            stack = np.stack([res[k][3][i] for k, (_, js) in enumerate(jobs) if js == s])
            p = (stack >= THRESHOLD).mean(axis=0) * 100
            values.append(int(round(float((p * w[i]).sum()))))
        point = {"model": "gefs05", "run": run, "lat": lat, "lon": lon, "step": steps, "prob": values}
        with open(os.path.join(folder, f"{lat:.2f}_{lon:.2f}.json"), "w") as fp:
            json.dump(point, fp, separators=(",", ":"))
    print("points", len(lats) * len(lons) + len(POINTS), flush=True)


if __name__ == "__main__":
    sys.exit(main())
