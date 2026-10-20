"""
Copernicus CAMS 전지구 대기질 예보(0.4°)에서 한국 영역 미세먼지(PM10·PM2.5)를 받아 격자점별 JSON으로 만든다.

- 원본: Copernicus Atmosphere Data Store "cams-global-atmospheric-composition-forecasts"
  (Copernicus 라이선스, 출처 표기 시 상업 이용 가능). 요청은 ADS 대기열을 거쳐 30초~몇 분 걸린다.
- 결과: out/cams/{run}/{lat}_{lon}.json, out/cams/latest.json (격자는 collect.py와 같은 0.25°. 0.4° 값을 선형 보간)
- 값: pm10·pm25 µg/m³, 3시간 간격으로 120시간(5일)까지

환경 변수: ADS_API_KEY
사용: python collector/cams.py [--run 2026102000] [--out out]
"""

import argparse
import datetime as dt
import json
import os
import sys
import tempfile

import cdsapi
import eccodes
import numpy as np

from collect import LAT_MAX, LAT_MIN, LON_MAX, LON_MIN, RES

STEPS = list(range(0, 121, 3))
NAMES = {"pm10": "pm10", "pm2p5": "pm25"}


def candidates():
    """00·12 UTC run은 약 10시간 뒤에 다 올라온다. 최근 것부터"""
    now = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=10)
    t = now.replace(hour=now.hour // 12 * 12, minute=0, second=0, microsecond=0)
    return [f"{t - dt.timedelta(hours=12 * i):%Y%m%d%H}" for i in range(3)]


def retrieve(client, run, target):
    client.retrieve(
        "cams-global-atmospheric-composition-forecasts",
        {
            "variable": ["particulate_matter_10um", "particulate_matter_2.5um"],
            "date": [f"{run[:4]}-{run[4:6]}-{run[6:8]}/{run[:4]}-{run[4:6]}-{run[6:8]}"],
            "time": [f"{run[8:10]}:00"],
            "leadtime_hour": [str(s) for s in STEPS],
            "type": ["forecast"],
            "area": [LAT_MAX, LON_MIN, LAT_MIN, LON_MAX],
            "data_format": "grib",
        },
        target,
    )


def read(path):
    """{(이름, step): 북→남 격자 µg/m³}, 첫 점 위경도, 간격"""
    out = {}
    with open(path, "rb") as fp:
        while (msg := eccodes.codes_grib_new_from_file(fp)) is not None:
            try:
                name = NAMES.get(eccodes.codes_get(msg, "shortName"))
                if not name:
                    continue
                step = int(eccodes.codes_get(msg, "endStep"))
                nj = eccodes.codes_get(msg, "Nj")
                ni = eccodes.codes_get(msg, "Ni")
                lat0 = eccodes.codes_get(msg, "latitudeOfFirstGridPointInDegrees")
                lon0 = eccodes.codes_get(msg, "longitudeOfFirstGridPointInDegrees")
                dlat = eccodes.codes_get(msg, "jDirectionIncrementInDegrees")
                dlon = eccodes.codes_get(msg, "iDirectionIncrementInDegrees")
                vals = eccodes.codes_get_values(msg).reshape(nj, ni)
                if eccodes.codes_get(msg, "jScansPositively") == 1:
                    vals = vals[::-1]
                    lat0 = lat0 + (nj - 1) * dlat
                # kg/m³ → µg/m³
                out[(name, step)] = vals * 1e9
            finally:
                eccodes.codes_release(msg)
    return out, lat0, lon0, dlat, dlon


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run")
    ap.add_argument("--out", default="out")
    a = ap.parse_args()
    client = cdsapi.Client(url="https://ads.atmosphere.copernicus.eu/api", key=os.environ["ADS_API_KEY"], quiet=True)

    with tempfile.TemporaryDirectory() as tmp:
        target = os.path.join(tmp, "cams.grib")
        for run in [a.run] if a.run else candidates():
            try:
                retrieve(client, run, target)
                break
            except Exception as e:
                print(f"run {run} 실패: {type(e).__name__}: {e}", flush=True)
        else:
            raise SystemExit("받을 수 있는 run이 없음")
        data, north, west, dlat, dlon = read(target)
    steps = sorted({s for (_, s) in data})
    print("run", run, "steps", len(steps), flush=True)

    lats = np.arange(LAT_MAX, LAT_MIN - RES / 2, -RES)
    lons = np.arange(LON_MIN, LON_MAX + RES / 2, RES)
    folder = os.path.join(a.out, "cams", run)
    os.makedirs(folder, exist_ok=True)
    shape = next(iter(data.values())).shape
    for lat in lats:
        for lon in lons:
            # 0.4° 격자 위 쌍선형 보간. 영역 끝(0.4° 격자 밖)은 가장자리 값
            y = min(max((north - lat) / dlat, 0), shape[0] - 1)
            x = min(max((lon - west) / dlon, 0), shape[1] - 1)
            y0, x0 = int(np.floor(y)), int(np.floor(x))
            y1, x1 = min(y0 + 1, shape[0] - 1), min(x0 + 1, shape[1] - 1)
            fy, fx = y - y0, x - x0
            point = {"model": "cams", "run": run, "lat": float(lat), "lon": float(lon), "step": steps}
            for name in NAMES.values():
                values = []
                for s in steps:
                    g = data.get((name, s))
                    if g is None:
                        values.append(None)
                        continue
                    v = (g[y0, x0] * (1 - fy) + g[y1, x0] * fy) * (1 - fx) + (g[y0, x1] * (1 - fy) + g[y1, x1] * fy) * fx
                    values.append(int(round(v)))
                point[name] = values
            with open(os.path.join(folder, f"{lat:.2f}_{lon:.2f}.json"), "w") as fp:
                json.dump(point, fp, separators=(",", ":"))
    with open(os.path.join(a.out, "cams", "latest.json"), "w") as fp:
        json.dump({"run": run, "lat": [LAT_MIN, LAT_MAX], "lon": [LON_MIN, LON_MAX], "res": RES}, fp)
    print("points", len(lats) * len(lons), flush=True)


if __name__ == "__main__":
    sys.exit(main())
