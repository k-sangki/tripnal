"""
저장한 여행(장소·기간) 예보가 크게 바뀌었으면 웹 푸시로 알린다. 수집이 끝난 뒤 돈다.

- 알림 목록: R2 alerts/{id}.json (사이트 /api/alerts가 만든다. 형식은 src/lib/alerts.ts)
- 비교 기준(base)은 알림을 켤 때 본 예보이고, 알림을 보낸 날짜만 새 값으로 바꾼다.
  그래서 조금씩 바뀌어도 쌓여서 기준을 넘으면 알린다.
- 좋아질 때(비 사라짐, 바람 약해짐)도 나빠질 때와 똑같이 알린다.
- 여행이 끝났거나 구독이 없어진(404·410) 알림은 지운다.
- VAPID 키: R2 alerts-keys/vapid.json (사이트가 처음 만들어 둔다)

환경 변수: CLOUDFLARE_ACCOUNT_ID·R2_ACCESS_KEY_ID·R2_SECRET_ACCESS_KEY, SITE_URL(기본 https://tripnalc.com)
사용: python collector/alerts.py [--dry-run]
"""

import argparse
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
import urllib.request

from upload import client

SITE = os.environ.get("SITE_URL", "https://tripnalc.com")
BUCKET = os.environ.get("R2_BUCKET", "tripnal-data")
WEEKDAY = "월화수목금토일"

# 이만큼 바뀌면 알린다
RAIN_ON = 3  # mm: 1 미만이던 날이 이 이상이 되면 "비 생김", 반대면 "비 사라짐"
RAIN_DIFF = 10  # mm
WIND_DIFF = 3  # m/s (하루 최대 풍속)
TEMP_DIFF = 4  # °C (최고·최저)


def day_label(date):
    d = dt.date.fromisoformat(date)
    return f"{d.month}/{d.day}({WEEKDAY[d.weekday()]})"


def changes(date, b, n):
    """한 날짜의 바뀐 점: [(좋아짐 True·나빠짐 False·중립 None, 문구), ...]"""
    out = []
    label = day_label(date)
    bp, np_ = b.get("precip") or 0, n.get("precip") or 0
    if bp < 1 and np_ >= RAIN_ON:
        out.append((False, f"{label} 비 예보 생김 {round(np_)}mm"))
    elif bp >= RAIN_ON and np_ < 1:
        out.append((True, f"{label} 비 예보 사라짐"))
    elif abs(np_ - bp) >= RAIN_DIFF:
        out.append((np_ < bp, f"{label} 비 {round(bp)}→{round(np_)}mm"))
    bw, nw = b.get("wind"), n.get("wind")
    if bw is not None and nw is not None and abs(nw - bw) >= WIND_DIFF:
        word = "약해짐" if nw < bw else "강해짐"
        out.append((nw < bw, f"{label} 바람 {word} {round(bw)}→{round(nw)}m/s"))
    for key, name in (("tMax", "최고"), ("tMin", "최저")):
        bt, nt = b.get(key), n.get(key)
        if bt is not None and nt is not None and abs(nt - bt) >= TEMP_DIFF:
            out.append((None, f"{label} {name} {round(bt)}→{round(nt)}°"))
    return out


def snapshot(days, dates):
    out = {}
    for d in days:
        if d["date"] in dates:
            r1 = lambda v: None if v is None else round(v, 1)  # noqa: E731
            out[d["date"]] = {"tMax": r1(d.get("tMax")), "tMin": r1(d.get("tMin")), "precip": round(d.get("precipSum") or 0, 1), "wind": r1(d.get("windMax"))}
    return out


def message(alert, found):
    """알림 제목·본문. 모두 좋아졌거나 모두 나빠졌으면 제목에서 바로 알 수 있게 한다"""
    tones = {t for t, _ in found if t is not None}
    if tones == {True}:
        title = f"{alert['name']} 날씨가 좋아졌어요"
    elif tones == {False}:
        title = f"{alert['name']} 날씨가 나빠졌어요"
    else:
        title = f"{alert['name']} 예보가 바뀌었어요"
    lines = [t for _, t in found]
    body = " · ".join(lines[:3]) + (f" 외 {len(lines) - 3}건" if len(lines) > 3 else "")
    return {"title": title, "body": body, "url": alert["path"], "tag": alert["id"]}


def forecast(alert, bust):
    q = {"lat": alert["lat"], "lon": alert["lon"], "v": f"alert{bust}"}
    if alert.get("elevation") is not None:
        q["elev"] = alert["elevation"]
    req = urllib.request.Request(f"{SITE}/api/forecast?{urllib.parse.urlencode(q)}", headers={"User-Agent": "tripnalc-alerts"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    s3 = client()
    try:
        key = json.loads(s3.get_object(Bucket=BUCKET, Key="alerts-keys/vapid.json")["Body"].read())
    except s3.exceptions.NoSuchKey:
        print("VAPID 키가 아직 없음 (알림을 켠 사람이 없음)")
        return
    from py_vapid import Vapid
    from pywebpush import WebPushException, webpush

    vapid = Vapid.from_raw(key["d"].encode())

    keys = []
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix="alerts/"):
        keys += [o["Key"] for o in page.get("Contents", [])]
    today = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=9)).date().isoformat()
    bust = int(time.time()) // 3600
    sent = removed = 0
    print("alerts", len(keys), flush=True)

    for k in keys:
        try:
            alert = json.loads(s3.get_object(Bucket=BUCKET, Key=k)["Body"].read())
            if alert["to"] < today:
                if not a.dry_run:
                    s3.delete_object(Bucket=BUCKET, Key=k)
                removed += 1
                continue
            f = forecast(alert, bust)
            dates = {d for d in alert["base"] if d >= today}
            now = snapshot(f["days"], dates)
            found, touched = [], []
            for date in sorted(dates):
                if date in now:
                    c = changes(date, alert["base"][date], now[date])
                    if c:
                        found += c
                        touched.append(date)
            if not found:
                continue
            msg = message(alert, found)
            print(k, msg["title"], "|", msg["body"], flush=True)
            if a.dry_run:
                continue
            try:
                webpush(alert["sub"], json.dumps(msg, ensure_ascii=False), vapid_private_key=vapid, vapid_claims={"sub": "mailto:contact@tripnalc.com"}, ttl=12 * 3600)
                sent += 1
            except WebPushException as e:
                status = e.response.status_code if e.response is not None else None
                if status in (404, 410):
                    s3.delete_object(Bucket=BUCKET, Key=k)
                    removed += 1
                    continue
                raise
            for date in touched:
                alert["base"][date] = now[date]
            s3.put_object(Bucket=BUCKET, Key=k, Body=json.dumps(alert, ensure_ascii=False).encode(), ContentType="application/json")
        except Exception as e:
            print(f"::warning::{k}: {type(e).__name__}: {e}", flush=True)
    print("sent", sent, "removed", removed, flush=True)


if __name__ == "__main__":
    sys.exit(main())
