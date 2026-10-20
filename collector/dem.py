"""
한국 영역 지형 고도 격자를 만든다. 예보 기온을 그 지점 고도로 보정할 때 쓴다 (src/lib/weather/collected.ts).

- 원본: Copernicus DEM GLO-90 (약 90m, AWS 공개 버킷 copernicus-dem-90m). 상업 이용 가능, 출처 표기.
- 결과: out/dem/korea.bin — 북→남, 서→동 순서의 int16(리틀엔디언) 격자. 바다는 0.
  범위·해상도는 collect.py와 같은 영역에 RES_DEM(15초, 약 400m) 간격. 칸 값은 그 칸 안 90m 화소 평균.
- 한 번 만들면 바뀌지 않으므로 .github/workflows/dem.yml 로 필요할 때만 돌린다.

사용: python collector/dem.py [--out out]
"""

import argparse
import concurrent.futures as cf
import json
import os
import sys

import numpy as np
import rasterio

from collect import LAT_MAX, LAT_MIN, LON_MAX, LON_MIN, http

BASE = "https://copernicus-dem-90m.s3.amazonaws.com"
# 15초. 90m(3초) 화소 5×5를 평균한다
CELLS_PER_DEG = 240
PX_PER_CELL = 5


def tile(lat, lon):
    """남서쪽 모서리가 (lat, lon)인 1° 타일. 바다만 있는 곳은 타일이 없다"""
    name = f"Copernicus_DSM_COG_30_N{lat:02d}_00_E{lon:03d}_00_DEM"
    try:
        data = http(f"{BASE}/{name}/{name}.tif", tries=3)
    except Exception:
        return None
    with rasterio.MemoryFile(data) as f, f.open() as ds:
        a = ds.read(1).astype(np.float32)
    n = CELLS_PER_DEG * PX_PER_CELL
    if a.shape != (n, n):
        raise RuntimeError(f"{name}: 예상과 다른 크기 {a.shape}")
    a[a < -100] = 0
    return a.reshape(CELLS_PER_DEG, PX_PER_CELL, CELLS_PER_DEG, PX_PER_CELL).mean(axis=(1, 3))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="out")
    a = ap.parse_args()
    lat0, lat1 = int(np.floor(LAT_MIN)), int(np.ceil(LAT_MAX))
    lon0, lon1 = int(np.floor(LON_MIN)), int(np.ceil(LON_MAX))
    jobs = [(la, lo) for la in range(lat0, lat1) for lo in range(lon0, lon1)]
    grid = np.zeros(((lat1 - lat0) * CELLS_PER_DEG, (lon1 - lon0) * CELLS_PER_DEG), dtype=np.float32)
    with cf.ThreadPoolExecutor(8) as ex:
        for (la, lo), t in zip(jobs, ex.map(lambda j: tile(*j), jobs)):
            if t is None:
                continue
            r = (lat1 - 1 - la) * CELLS_PER_DEG
            c = (lo - lon0) * CELLS_PER_DEG
            grid[r : r + CELLS_PER_DEG, c : c + CELLS_PER_DEG] = t
            print("tile", la, lo, int(t.max()), flush=True)
    # 영역(LAT_MIN~LAT_MAX, LON_MIN~LON_MAX)만 남긴다. 칸 중심 좌표 = 모서리 + 반 칸
    top = int(round((lat1 - LAT_MAX) * CELLS_PER_DEG))
    rows = int(round((LAT_MAX - LAT_MIN) * CELLS_PER_DEG))
    left = int(round((LON_MIN - lon0) * CELLS_PER_DEG))
    cols = int(round((LON_MAX - LON_MIN) * CELLS_PER_DEG))
    out = np.round(grid[top : top + rows, left : left + cols]).astype("<i2")
    os.makedirs(os.path.join(a.out, "dem"), exist_ok=True)
    out.tofile(os.path.join(a.out, "dem", "korea.bin"))
    meta = {"lat": [LAT_MIN, LAT_MAX], "lon": [LON_MIN, LON_MAX], "cellsPerDeg": CELLS_PER_DEG, "rows": rows, "cols": cols}
    with open(os.path.join(a.out, "dem", "korea.json"), "w") as fp:
        json.dump(meta, fp)
    print("dem", meta, "max", int(out.max()), flush=True)


if __name__ == "__main__":
    sys.exit(main())
