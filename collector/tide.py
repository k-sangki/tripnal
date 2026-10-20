"""
국립해양조사원 조석예보(고·저조) 공공데이터 API로 관측소별 만조·간조를 받아 JSON으로 남긴다.

- 원본: 공공데이터포털 "해양수산부 국립해양조사원_조석예보(고, 저조)" (공공누리, 상업 이용 가능).
  한 번 호출에 관측소 하나·하루치라서, R2에 이미 있는 날짜는 다시 받지 않는다.
- 결과: out/tide/{code}.json, out/tide/stations.json
  events: [["YYYY-MM-DD HH:MM", "H"|"L", 조위 cm(약최저저조면 기준)], ...]
  msl: 받은 기간 만조·간조 평균(cm). 화면에는 이 값을 0으로 둔 높이를 쓴다.
- 기간: 어제(앞뒤 보간용)부터 16일 뒤까지

환경 변수: KHOA_API_KEY, (있으면) CLOUDFLARE_ACCOUNT_ID·R2_ACCESS_KEY_ID·R2_SECRET_ACCESS_KEY
사용: python collector/tide.py [--days 18] [--out out]
"""

import argparse
import concurrent.futures as cf
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
import urllib.request

API = "https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService"
HERE = os.path.dirname(os.path.abspath(__file__))
# 1·3 = 만조, 2·4 = 간조
KIND = {"1": "H", "3": "H", "2": "L", "4": "L"}


class QuotaExceeded(Exception):
    pass


def fetch_day(key, code, day):
    """관측소 하나의 하루치 만조·간조"""
    url = API + "?" + urllib.parse.urlencode({"serviceKey": key, "obsCode": code, "reqDate": day.replace("-", ""), "type": "json", "numOfRows": 20})
    for i in range(4):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                body = json.loads(r.read().decode())
            break
        except Exception:
            if i == 3:
                raise
            time.sleep(2 * (i + 1))
    head = body.get("header") or body.get("response", {}).get("header", {})
    if head.get("resultCode") not in (None, "00"):
        # 22: 하루 호출 한도 초과
        if head.get("resultCode") == "22":
            raise QuotaExceeded(head.get("resultMsg"))
        raise RuntimeError(f"{code} {day}: {head}")
    items = (body.get("body", {}).get("items") or {}).get("item") or []
    items = items if isinstance(items, list) else [items]
    return [[it["predcDt"], KIND[str(it["extrSe"])], round(float(it["predcTdlvVl"]))] for it in items if str(it.get("extrSe")) in KIND]


def previous(code):
    """R2에 남아 있는 지난 결과 (없거나 자격 증명이 없으면 빈 값)"""
    if not os.environ.get("R2_ACCESS_KEY_ID"):
        return {}
    from upload import client

    try:
        obj = client().get_object(Bucket=os.environ.get("R2_BUCKET", "tripnal-data"), Key=f"tide/{code}.json")
        return json.loads(obj["Body"].read())
    except Exception:
        return {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=18)
    ap.add_argument("--out", default="out")
    a = ap.parse_args()
    key = os.environ["KHOA_API_KEY"]
    with open(os.path.join(HERE, "tide_stations.json")) as fp:
        stations = json.load(fp)

    today = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=9)).date()
    days = [(today + dt.timedelta(days=d - 1)).isoformat() for d in range(a.days)]

    with cf.ThreadPoolExecutor(16) as ex:
        prev = dict(zip([s["code"] for s in stations], ex.map(lambda s: previous(s["code"]), stations)))

    # 관측소·날짜별 이벤트. 지난 결과에서 기간 안의 날짜는 그대로 쓴다
    have = {s["code"]: {} for s in stations}
    for code, p in prev.items():
        for d in p.get("days", []):
            if d in days:
                have[code][d] = [e for e in p["events"] if e[0].startswith(d)]
    # 가까운 날짜부터 받아서 한도에 걸려도 앞날은 채워지게 한다
    jobs = [(s["code"], d) for d in days for s in stations if d not in have[s["code"]]]
    print("stations", len(stations), "days", len(days), "requests", len(jobs), flush=True)

    stop = False
    errors = 0

    def run(job):
        nonlocal stop, errors
        if stop:
            return job, None
        try:
            return job, fetch_day(key, *job)
        except QuotaExceeded as e:
            stop = True
            print(f"::warning::호출 한도 초과, 나머지는 다음에 받음: {e}", flush=True)
        except Exception as e:
            errors += 1
            print(f"::warning::{job}: {type(e).__name__}: {e}", flush=True)
        return job, None

    with cf.ThreadPoolExecutor(8) as ex:
        for (code, d), events in ex.map(run, jobs):
            if events is not None:
                have[code][d] = events
    if errors > len(jobs) // 2 and jobs:
        raise SystemExit(f"요청 {len(jobs)}건 중 {errors}건 실패")

    folder = os.path.join(a.out, "tide")
    os.makedirs(folder, exist_ok=True)
    listed = []
    for s in stations:
        got = sorted(d for d in have[s["code"]] if have[s["code"]][d] is not None)
        events = sorted(e for d in got for e in have[s["code"]][d])
        if not events:
            continue
        msl = round(sum(e[2] for e in events) / len(events))
        with open(os.path.join(folder, f"{s['code']}.json"), "w") as fp:
            json.dump({**s, "msl": msl, "days": got, "events": events}, fp, ensure_ascii=False, separators=(",", ":"))
        listed.append(s)
    with open(os.path.join(folder, "stations.json"), "w") as fp:
        json.dump(listed, fp, ensure_ascii=False, separators=(",", ":"))
    print("written", len(listed), flush=True)


if __name__ == "__main__":
    sys.exit(main())
