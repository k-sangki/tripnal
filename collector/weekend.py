"""
"이번 주말 날씨 좋은 곳" 페이지(/weekend)에 쓸 장소별 주말 예보를 모아 R2 weekend/latest.json에 올린다.
함께 장소별 16일 하루 요약을 weekend/days.json에 올린다 (화면에는 안 쓰고 매일 블로그 초안에 쓴다).
장소 목록은 src/lib/places.ts에서 읽고, 예보는 사이트의 /api/forecast로 받는다 (점수 계산은 사이트가 한다).

환경 변수: CLOUDFLARE_ACCOUNT_ID·R2_ACCESS_KEY_ID·R2_SECRET_ACCESS_KEY, R2_BUCKET(기본 tripnal-data), SITE_URL(기본 https://tripnalc.com)
사용: python collector/weekend.py [--dry-run]
"""

import argparse
import concurrent.futures as cf
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

SITE = os.environ.get("SITE_URL", "https://tripnalc.com")
PLACES_TS = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "places.ts")
KST = dt.timezone(dt.timedelta(hours=9))

PLACE_RE = re.compile(
    r'\{ slug: "([^"]+)", name: "[^"]+", region: "[^"]+", lat: ([0-9.]+), lon: ([0-9.]+)(?:, elevation: ([0-9]+))?, leisure: "([a-z]+)"'
)


def places():
    with open(PLACES_TS, encoding="utf-8") as fp:
        text = fp.read()
    out = [
        {"slug": m[0], "lat": float(m[1]), "lon": float(m[2]), "elevation": int(m[3]) if m[3] else None, "leisure": m[4]}
        for m in PLACE_RE.findall(text)
    ]
    if len(out) < 100:
        sys.exit(f"장소를 {len(out)}곳만 읽음: places.ts 형식이 바뀌었는지 확인")
    return out


def weekend(today):
    """사이트의 "이번 주말"과 같은 기간: 일요일이면 오늘, 아니면 다가오는 토·일"""
    w = (today.weekday() + 1) % 7  # 일=0
    if w == 0:
        return [today]
    sat = today + dt.timedelta(days=6 - w)
    return [sat, sat + dt.timedelta(days=1)]


def forecast(p):
    q = {"lat": p["lat"], "lon": p["lon"], "v": "weekend"}
    if p["elevation"] is not None:
        q["elev"] = p["elevation"]
    req = urllib.request.Request(f"{SITE}/api/forecast?{urllib.parse.urlencode(q)}", headers={"User-Agent": "tripnalc-weekend"})
    # 한꺼번에 많이 부르면 사이트가 가끔 503을 돌려주므로 잠시 쉬었다가 다시 부른다
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception:
            if attempt == 3:
                raise
            time.sleep(3 * (attempt + 1))


def day_summary(d):
    return {
        "date": d["date"],
        "tMin": d.get("tMin"),
        "tMax": d.get("tMax"),
        "rain": d.get("precipSum"),
        "prob": d.get("precipProbMax"),
        "wind": d.get("windMax"),
        "gust": d.get("gustMax"),
        "code": d.get("code"),
    }


def summary(p, dates):
    """(주말 요약, 16일 전체 요약). 전체는 매일 블로그 초안(요일별 주제)에 쓴다"""
    f = forecast(p)
    every = [day_summary(d) for d in f.get("days", [])]
    days = {d["date"]: d for d in every}
    if any(date not in days for date in dates):
        return None, every
    return [days[date] for date in dates], every


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    dates = [d.isoformat() for d in weekend(dt.datetime.now(KST).date())]
    result = {}
    every = {}
    failed = 0
    with cf.ThreadPoolExecutor(3) as ex:
        futs = {ex.submit(summary, p, dates): p for p in places()}
        for fut in cf.as_completed(futs):
            p = futs[fut]
            try:
                s, all_days = fut.result()
            except Exception as e:  # 한두 곳 실패는 건너뛴다
                print("실패", p["slug"], e, flush=True)
                failed += 1
                continue
            if s:
                result[p["slug"]] = s
            if all_days:
                every[p["slug"]] = all_days
    print(f"주말 {dates} · {len(result)}곳 · 실패 {failed}곳", flush=True)
    if len(result) < 100:
        sys.exit("모은 장소가 너무 적어 올리지 않음")

    body = json.dumps(
        {"generated": dt.datetime.now(KST).isoformat(timespec="minutes"), "dates": dates, "places": result},
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode()
    if a.dry_run:
        print(body[:500].decode(errors="ignore"))
        return
    sys.path.insert(0, os.path.dirname(__file__))
    from upload import client

    bucket = os.environ.get("R2_BUCKET", "tripnal-data")
    s3 = client()
    s3.put_object(Bucket=bucket, Key="weekend/latest.json", Body=body, ContentType="application/json")
    print("uploaded weekend/latest.json", flush=True)
    # 장소별 16일 하루 요약 (화면에는 안 쓰고 블로그 초안용)
    days_body = json.dumps(
        {"generated": dt.datetime.now(KST).isoformat(timespec="minutes"), "places": every}, ensure_ascii=False, separators=(",", ":")
    ).encode()
    s3.put_object(Bucket=bucket, Key="weekend/days.json", Body=days_body, ContentType="application/json")
    print("uploaded weekend/days.json", len(days_body), "bytes", flush=True)


if __name__ == "__main__":
    main()
