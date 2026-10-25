"""
해외 여행지(src/data/overseas.json)의 평년 월별 날씨를 NASA POWER 일별 자료(2001~2020)로 계산해
src/data/climate.json에 저장한다. 한 번 만들어 두면 되는 자료라 필요할 때만 손으로 돌린다.

- 출처: NASA POWER (MERRA-2 기반, 공공 자료로 상업적 이용 가능, 출처 표기)
- 값(월별): hi·lo 일 최고·최저 기온 평균(°C), rain 월 강수량(mm), rainDays 1mm 이상 내린 날 수, hum 상대습도(%)
- 격자(약 0.5°) 고도와 여행지 고도가 다르면 기온을 0.0065°C/m로 보정한다.

사용: python collector/climate.py [--only osaka,tokyo]
     KHOA_API_KEY=… python collector/climate.py --korea   # 국내 도시(기상청 ASOS 일자료) → src/data/climate-kr.json
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "src", "data", "overseas.json")
OUT = os.path.join(ROOT, "src", "data", "climate.json")
START, END = 2001, 2020
PARAMS = "T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M"
LAPSE = 0.0065


def fetch(lat, lon):
    url = (
        "https://power.larc.nasa.gov/api/temporal/daily/point"
        f"?parameters={PARAMS}&community=RE&longitude={lon}&latitude={lat}"
        f"&start={START}0101&end={END}1231&format=JSON"
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001 - 네트워크 오류는 잠시 뒤 다시
            print("  retry", attempt + 1, e, flush=True)
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"POWER 실패 {lat},{lon}")


def monthly(j, elevation):
    p = j["properties"]["parameter"]
    grid_elev = j["geometry"]["coordinates"][2] if len(j["geometry"]["coordinates"]) > 2 else None
    corr = 0.0 if grid_elev is None or elevation is None else -(elevation - grid_elev) * LAPSE
    hi, lo, hum = defaultdict(list), defaultdict(list), defaultdict(list)
    rain = defaultdict(float)
    rain_days = defaultdict(int)
    years = set()
    for day, v in p["T2M_MAX"].items():
        y, m = int(day[:4]), int(day[4:6])
        years.add(y)
        if v > -900:
            hi[m].append(v)
        lv = p["T2M_MIN"][day]
        if lv > -900:
            lo[m].append(lv)
        rv = p["PRECTOTCORR"][day]
        if rv > -900:
            rain[m] += rv
            rain_days[m] += rv >= 1.0
        hv = p["RH2M"][day]
        if hv > -900:
            hum[m].append(hv)
    n = len(years)
    out = []
    for m in range(1, 13):
        out.append(
            {
                "hi": round(sum(hi[m]) / len(hi[m]) + corr, 1),
                "lo": round(sum(lo[m]) / len(lo[m]) + corr, 1),
                "rain": round(rain[m] / n),
                "rainDays": round(rain_days[m] / n, 1),
                "hum": round(sum(hum[m]) / len(hum[m])),
            }
        )
    return out, grid_elev


# 국내 도시: (slug는 src/lib/places.ts, 기상청 ASOS 관측소 번호)
# NASA POWER 격자(약 0.5°)는 부산·제주·강릉처럼 바닷가 도시에서 바다 칸이 섞여 기온이 크게 어긋나서,
# 국내는 기상청 관측 일자료(1991~2020, 기상청 평년값과 같은 기간)로 계산한다.
KOREA = [
    ("seoul", 108),
    ("busan", 159),
    ("jeju", 184),
    ("incheon", 112),
    ("gyeongju", 283),
    ("gangneung", 105),
    ("sokcho", 90),
    ("jeonju", 146),
    ("daegu", 143),
    ("yeosu", 168),
]
KR_START, KR_END = 1991, 2020
ASOS_DAY = "https://apis.data.go.kr/1360000/AsosDalyInfoService/getWthrDataList"
OUT_KR = os.path.join(ROOT, "src", "data", "climate-kr.json")


def asos_days(stn, key):
    """관측소의 KR_START~KR_END 일자료 (해마다 나눠 받는다)"""
    rows = []
    for y in range(KR_START, KR_END + 1):
        q = urllib.parse.urlencode(
            {"dataType": "JSON", "dataCd": "ASOS", "dateCd": "DAY", "startDt": f"{y}0101", "endDt": f"{y}1231", "stnIds": stn, "numOfRows": 400, "pageNo": 1}
        )
        for attempt in range(3):
            try:
                # 키는 이미 인코딩된 값이라 그대로 붙인다 (verify.py와 같음)
                with urllib.request.urlopen(f"{ASOS_DAY}?serviceKey={key}&{q}", timeout=60) as r:
                    raw = r.read().decode("utf-8", "replace")
            except urllib.error.HTTPError as e:
                if e.code in (401, 403):  # 키·승인 문제는 다시 해도 같다
                    raise RuntimeError(f"ASOS 일자료 {e.code}: 이 키가 '기상청_지상(종관, ASOS) 일자료 조회서비스'에 승인됐는지 확인") from e
                print("  retry", stn, y, e, flush=True)
                time.sleep(3)
                continue
            except Exception as e:  # noqa: BLE001 - 네트워크 오류는 잠시 뒤 다시
                print("  retry", stn, y, e, flush=True)
                time.sleep(3)
                continue
            try:
                j = json.loads(raw)
            except ValueError:
                # 키가 이 서비스에 승인되지 않았으면 XML 오류가 온다: 바로 멈춘다
                raise RuntimeError(f"ASOS 응답 오류 {stn} {y}: {raw[:300]}")
            head = j["response"]["header"]
            if head.get("resultCode") not in ("00", "03"):  # 03 = 자료 없음 (관측소 신설 전)
                raise RuntimeError(f"ASOS {stn} {y}: {head}")
            items = j["response"]["body"].get("items") if head.get("resultCode") == "00" else None
            rows += (items or {}).get("item", []) if items else []
            break
    print(" ", stn, len(rows), "days", flush=True)
    return rows


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def korea_monthly(rows):
    hi, lo, hum = defaultdict(list), defaultdict(list), defaultdict(list)
    rain = defaultdict(float)
    rain_days = defaultdict(int)
    months_seen = defaultdict(set)
    for r in rows:
        y, m = int(r["tm"][:4]), int(r["tm"][5:7])
        months_seen[m].add(y)
        if num(r.get("maxTa")) is not None:
            hi[m].append(num(r["maxTa"]))
        if num(r.get("minTa")) is not None:
            lo[m].append(num(r["minTa"]))
        rv = num(r.get("sumRn")) or 0.0  # 비가 안 온 날은 빈 값
        rain[m] += rv
        rain_days[m] += rv >= 1.0
        if num(r.get("avgRhm")) is not None:
            hum[m].append(num(r["avgRhm"]))
    out = []
    for m in range(1, 13):
        n = len(months_seen[m]) or 1
        out.append(
            {
                "hi": round(sum(hi[m]) / len(hi[m]), 1),
                "lo": round(sum(lo[m]) / len(lo[m]), 1),
                "rain": round(rain[m] / n),
                "rainDays": round(rain_days[m] / n, 1),
                "hum": round(sum(hum[m]) / len(hum[m])),
            }
        )
    years = sorted({int(r["tm"][:4]) for r in rows})
    return out, [years[0], years[-1]] if years else None


def korea():
    key = os.environ["KHOA_API_KEY"]
    result = {}
    for slug, stn in KOREA:
        print(slug, stn, flush=True)
        months, years = korea_monthly(asos_days(stn, key))
        result[slug] = {"months": months, "station": stn, "years": years}
    text = json.dumps({"source": "기상청 ASOS", "years": [KR_START, KR_END], "places": result}, ensure_ascii=False, separators=(",", ":"))
    with open(OUT_KR, "w", encoding="utf-8") as fp:
        fp.write(text)
    # Actions 로그에서 그대로 옮겨 쓸 수 있게 한 줄로도 찍는다
    print("CLIMATE_KR_JSON " + text, flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--korea", action="store_true")
    a = ap.parse_args()
    if a.korea:
        korea()
        return
    with open(SRC, encoding="utf-8") as fp:
        places = json.load(fp)
    old = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fp:
            old = json.load(fp).get("places", {})
    only = set(filter(None, a.only.split(",")))
    result = dict(old)
    for d in places:
        slug = d["slug"]
        if only and slug not in only:
            continue
        if not only and slug in old:
            continue
        print(slug, flush=True)
        months, grid_elev = monthly(fetch(d["lat"], d["lon"]), d.get("elevation"))
        result[slug] = {"months": months, "gridElevation": grid_elev}
        time.sleep(1)
    # 목록에서 빠진 곳은 지운다
    slugs = {d["slug"] for d in places}
    result = {k: v for k, v in result.items() if k in slugs}
    with open(OUT, "w", encoding="utf-8") as fp:
        json.dump({"source": "NASA POWER", "years": [START, END], "places": result}, fp, ensure_ascii=False, separators=(",", ":"))
    print("done", len(result), file=sys.stderr)


if __name__ == "__main__":
    main()
