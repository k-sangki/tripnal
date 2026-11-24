"""
명산 정상 평년 기후를 모아 src/data/mountain-climate.json에 저장한다 (산마다 다른 숫자 자료, 2026-11-24).
한 번 만들면 되는 자료라 필요할 때만 돌린다.

- NASA POWER 월별 기후값(climatology): 낮 최고·밤 최저 기온, 강수량, 풍속
- 격자 고도와 정상 고도 차이만큼 0.0065°C/m 보정 (golf_facts.py와 같은 방식)

사용: python collector/mountain_climate.py 산목록.json
  산목록.json = [{"slug", "lat", "lon", "elevation"}, ...] (src/data/mountain-intro.ts에 있는 산)
"""

import concurrent.futures as cf
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from golf_facts import climate  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "src", "data", "mountain-climate.json")


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
