"""
해외 여행지(src/data/overseas.json, 사이트의 /overseas 목록과 같은 파일)를 둘러싼 0.25° 격자점.

한국 영역처럼 통째로 받지 않고, 여행지마다 둘러싼 네 점만 전 지구 격자에서 뽑아
한국 격자점과 같은 이름({lat}_{lon}.json)으로 같은 run 폴더에 저장한다.
"""

import json
import math
import os

RES = 0.25


def _points():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "data", "overseas.json")
    with open(path, encoding="utf-8") as fp:
        places = json.load(fp)
    out = set()
    for d in places:
        y0, x0 = math.floor(d["lat"] / RES), math.floor(d["lon"] / RES)
        for dy in (0, 1):
            for dx in (0, 1):
                # + 0.0: -0.0을 0.0으로 (파일 이름 "0.00")
                out.add(((y0 + dy) * RES + 0.0, (x0 + dx) * RES + 0.0))
    return sorted(out)


POINTS = _points()


def pick(vals, lat0, lon0, res, pts=POINTS):
    """북→남·서→동 전 지구 격자 vals[nj, ni](첫 점 lat0, lon0)에서 pts 좌표의 값. 모양 (1, len(pts))"""
    nj, ni = vals.shape
    rows = [int(round((lat0 - la) / res)) for la, _ in pts]
    cols = [int(round(((lo - lon0) % 360) / res)) % ni for _, lo in pts]
    if min(rows) < 0 or max(rows) >= nj:
        raise RuntimeError("해외 지점이 격자 밖")
    return vals[rows, cols][None, :]
