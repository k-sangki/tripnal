"""
예보를 실제 관측과 맞춰 보기 위한 기록을 R2 verify/에 쌓는다 (나중에 모델별 치우침 보정·가중치·적중률 계산에 쓴다).
화면에는 쓰지 않는다. 수집 끝(alerts 잡)에 돈다.

- forecast: 기상청 종관관측소(asos_stations.json) 위치의 모델별 예보를 최신 run마다 남긴다.
  verify/fc/{model}/{run}.json: 둘러싼 네 격자점을 거리 가중, 기온·이슬점은 관측소 해발고도로 보정 (사이트와 같은 방식)
  verify/site/{UTC YYYYMMDDHH}.json: 사이트가 실제로 보여 준 3시간 칸 (/api/forecast)
- obs: 관측소 시간 자료(공공데이터포털 기상청 지상(종관, ASOS) 시간자료)를 날짜별로 남긴다.
  verify/obs/{YYYYMMDD}.json (한국 시간 하루). 아직 없는 최근 사흘(오늘 제외)만 받는다.
- calib: 최근 14일 동안 모델별·관측소별·시각별로 기온이 얼마나 틀렸는지(예보 이틀 앞까지) 평균해
  verify/calib/latest.json 에 남긴다. 사이트가 이 값을 빼서 기온을 보정한다 (src/lib/weather/calibrate.ts).
  사이트가 보여 준 값이 아니라 모델 예보 기록(verify/fc)으로 배우므로, 보정한 값을 다시 배우는 일이 없다.

환경 변수: CLOUDFLARE_ACCOUNT_ID·R2_ACCESS_KEY_ID·R2_SECRET_ACCESS_KEY, R2_BUCKET(기본 tripnal-data),
          KHOA_API_KEY(공공데이터포털 키, obs), SITE_URL(기본 https://tripnalc.com)
사용: python collector/verify.py forecast|obs|calib [--dry-run]
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

from botocore.exceptions import ClientError

from upload import client

SITE = os.environ.get("SITE_URL", "https://tripnalc.com")
BUCKET = os.environ.get("R2_BUCKET", "tripnal-data")
KST = dt.timezone(dt.timedelta(hours=9))
MODELS = ["ecmwf", "gfs", "icon"]
# src/lib/weather/collected.ts 와 같은 격자·기온 감률
GRID = {"lat_min": 32.5, "lat_max": 39.5, "lon_min": 124.0, "lon_max": 132.0, "res": 0.25}
LAPSE = 0.0065
FIELDS = ["temp", "dew", "wind", "gust", "precip"]
ASOS = "https://apis.data.go.kr/1360000/AsosHourlyInfoService/getWthrDataList"

with open(os.path.join(os.path.dirname(__file__), "asos_stations.json"), encoding="utf-8") as _fp:
    STATIONS = json.load(_fp)


def exists(s3, key):
    try:
        s3.head_object(Bucket=BUCKET, Key=key)
        return True
    except ClientError:
        return False


def get_json(s3, key):
    try:
        return json.loads(s3.get_object(Bucket=BUCKET, Key=key)["Body"].read())
    except ClientError:
        return None


def put_json(s3, key, data, dry):
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
    if dry:
        print("dry-run", key, len(body), "bytes", body[:300].decode(errors="ignore"), flush=True)
        return
    s3.put_object(Bucket=BUCKET, Key=key, Body=body, ContentType="application/json")
    print("uploaded", key, len(body), "bytes", flush=True)


def corners(lat, lon):
    g = GRID
    n_lat = round((g["lat_max"] - g["lat_min"]) / g["res"])
    n_lon = round((g["lon_max"] - g["lon_min"]) / g["res"])
    y = (min(max(lat, g["lat_min"]), g["lat_max"]) - g["lat_min"]) / g["res"]
    x = (min(max(lon, g["lon_min"]), g["lon_max"]) - g["lon_min"]) / g["res"]
    y0 = min(int(y), n_lat - 1)
    x0 = min(int(x), n_lon - 1)
    fy, fx = y - y0, x - x0
    at = lambda dy, dx, w: (g["lat_min"] + (y0 + dy) * g["res"], g["lon_min"] + (x0 + dx) * g["res"], w)
    return [at(0, 0, (1 - fy) * (1 - fx)), at(0, 1, (1 - fy) * fx), at(1, 0, fy * (1 - fx)), at(1, 1, fy * fx)]


def r1(x):
    return None if x is None else round(x, 1)


def station_series(files, target):
    """네 격자점 파일(file, w)을 관측소 한 곳의 step별 값으로"""
    files = [(f, w) for f, w in files if f]
    if not files:
        return None
    steps = files[0][0]["step"]
    out = {}
    for name in FIELDS:
        vals = []
        for i in range(len(steps)):
            s = ws = 0.0
            for f, w in files:
                arr = f.get(name) or []
                v = arr[i] if i < len(arr) else None
                if v is None:
                    continue
                if name in ("temp", "dew") and f.get("elevation") is not None:
                    v += (f["elevation"] - target) * LAPSE
                s += v * w
                ws += w
            vals.append(r1(s / ws) if ws > 0 else None)
        out[name] = vals
    elev = [f.get("elevation") for f, _ in files if f.get("elevation") is not None]
    out["gridElevation"] = r1(sum(elev) / len(elev)) if elev else None
    return steps, out


def archive_model(s3, model, dry):
    latest = get_json(s3, f"{model}/latest.json")
    if not latest:
        print("latest 없음", model, flush=True)
        return
    run = latest["run"]
    key = f"verify/fc/{model}/{run}.json"
    if exists(s3, key):
        print("이미 있음", key, flush=True)
        return
    need = {}
    for st in STATIONS:
        for lat, lon, _ in corners(st["lat"], st["lon"]):
            need[f"{model}/{run}/{lat:.2f}_{lon:.2f}.json"] = None
    with cf.ThreadPoolExecutor(32) as ex:
        for k, v in zip(need, ex.map(lambda k: get_json(s3, k), list(need))):
            need[k] = v
    stations = {}
    steps = None
    for st in STATIONS:
        files = [(need[f"{model}/{run}/{lat:.2f}_{lon:.2f}.json"], w) for lat, lon, w in corners(st["lat"], st["lon"])]
        res = station_series(files, st["elevation"])
        if res:
            steps, stations[str(st["id"])] = res
    if len(stations) < len(STATIONS) * 0.9:
        print(f"{model} {run}: 관측소 {len(stations)}곳만 읽어 남기지 않음", flush=True)
        return
    put_json(s3, key, {"model": model, "run": run, "step": steps, "stations": stations}, dry)


def site_forecast(st):
    q = urllib.parse.urlencode({"lat": st["lat"], "lon": st["lon"], "elev": st["elevation"], "v": "verify"})
    req = urllib.request.Request(f"{SITE}/api/forecast?{q}", headers={"User-Agent": "tripnalc-verify"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception:
            if attempt == 3:
                raise
            time.sleep(3 * (attempt + 1))


def archive_site(s3, dry):
    now = dt.datetime.now(dt.timezone.utc)
    key = f"verify/site/{now:%Y%m%d%H}.json"
    stations = {}
    with cf.ThreadPoolExecutor(3) as ex:
        futs = {ex.submit(site_forecast, st): st for st in STATIONS}
        for fut in cf.as_completed(futs):
            st = futs[fut]
            try:
                f = fut.result()
            except Exception as e:  # 한두 곳 실패는 건너뛴다
                print("실패", st["id"], e, flush=True)
                continue
            slots = [s for d in f.get("days", []) for s in d.get("slots", [])]
            if not slots:
                continue
            stations[str(st["id"])] = {
                "t0": slots[0]["time"],
                "temp": [s.get("temp") for s in slots],
                "precip": [s.get("precip") for s in slots],
                "prob": [s.get("precipProb") for s in slots],
                "wind": [s.get("wind") for s in slots],
                "gust": [s.get("gust") for s in slots],
            }
    if len(stations) < len(STATIONS) * 0.9:
        sys.exit(f"사이트 예보를 {len(stations)}곳만 받음")
    put_json(s3, key, {"generated": now.isoformat(timespec="minutes"), "step": "3h", "stations": stations}, dry)


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def asos_day(key, stn, day):
    q = urllib.parse.urlencode(
        {
            "pageNo": 1,
            "numOfRows": 24,
            "dataType": "JSON",
            "dataCd": "ASOS",
            "dateCd": "HR",
            "startDt": day,
            "startHh": "00",
            "endDt": day,
            "endHh": "23",
            "stnIds": stn,
        }
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(f"{ASOS}?serviceKey={key}&{q}", timeout=60) as r:
                d = json.load(r)
            items = d["response"]["body"]["items"]["item"]
            break
        except Exception:
            if attempt == 3:
                return None
            time.sleep(3 * (attempt + 1))
    hours = {}
    for it in items:
        h = it["tm"][11:13]
        hours[h] = {
            "temp": num(it.get("ta")),
            "dew": num(it.get("td")),
            "wind": num(it.get("ws")),
            # 지난 1시간 강수. 비가 안 오면 빈 값이라 0으로
            "precip": num(it.get("rn")) or 0.0,
        }
    return hours


def archive_obs(s3, dry):
    raw = os.environ.get("KHOA_API_KEY")
    if not raw:
        sys.exit("KHOA_API_KEY 없음")
    key = urllib.parse.quote(raw, safe="")
    today = dt.datetime.now(KST).date()
    for back in range(3, 0, -1):
        day = (today - dt.timedelta(days=back)).strftime("%Y%m%d")
        dest = f"verify/obs/{day}.json"
        if exists(s3, dest):
            print("이미 있음", dest, flush=True)
            continue
        stations = {}
        with cf.ThreadPoolExecutor(6) as ex:
            for st, hours in zip(STATIONS, ex.map(lambda st: asos_day(key, st["id"], day), STATIONS)):
                if hours:
                    stations[str(st["id"])] = hours
        full = sum(1 for h in stations.values() if len(h) >= 20)
        print(day, "관측소", len(stations), "· 20시간 이상", full, flush=True)
        # 전날 자료가 아직 다 안 올라왔으면 다음 번에 다시 받는다
        if full < len(STATIONS) * 0.9:
            continue
        put_json(s3, dest, {"date": day, "stations": stations}, dry)


# 기온 보정: 최근 며칠을 보고, 예보 몇 시간 앞까지로 배우는지, 표본이 적을 때 0 쪽으로 줄이는 정도
CALIB_DAYS = 14
CALIB_LEAD = 48
CALIB_SHRINK = 10


def list_keys(s3, prefix):
    out, tok = [], None
    while True:
        kw = {"Bucket": BUCKET, "Prefix": prefix, "MaxKeys": 1000}
        if tok:
            kw["ContinuationToken"] = tok
        r = s3.list_objects_v2(**kw)
        out += [o["Key"] for o in r.get("Contents", [])]
        if not r.get("IsTruncated"):
            return out
        tok = r["NextContinuationToken"]


def archive_calib(s3, dry):
    now = dt.datetime.now(KST).replace(tzinfo=None)
    start = now - dt.timedelta(days=CALIB_DAYS)
    obs = {}
    for k in list_keys(s3, "verify/obs/"):
        day = k.rsplit("/", 1)[1][:8]
        if day < start.strftime("%Y%m%d"):
            continue
        d = get_json(s3, k) or {"stations": {}}
        for sid, hours in d["stations"].items():
            for hh, v in hours.items():
                if v.get("temp") is not None:
                    obs[(sid, dt.datetime.strptime(day + hh, "%Y%m%d%H"))] = v["temp"]
    oldest_run = (start - dt.timedelta(hours=CALIB_LEAD + 9)).strftime("%Y%m%d%H")
    temp = {}
    for model in MODELS:
        acc = {}
        keys = [k for k in list_keys(s3, f"verify/fc/{model}/") if k.rsplit("/", 1)[1][:10] >= oldest_run]
        with cf.ThreadPoolExecutor(8) as ex:
            for d in ex.map(lambda k: get_json(s3, k), keys):
                if not d:
                    continue
                run = dt.datetime.strptime(d["run"], "%Y%m%d%H") + dt.timedelta(hours=9)
                for sid, series in d["stations"].items():
                    for i, step in enumerate(d["step"]):
                        if step > CALIB_LEAD:
                            break
                        t = run + dt.timedelta(hours=step)
                        o, f = obs.get((sid, t)), series["temp"][i]
                        if t < start or o is None or f is None or t.hour % 3:
                            continue
                        a = acc.setdefault((sid, t.hour // 3), [0.0, 0])
                        a[0] += f - o
                        a[1] += 1
        out = {}
        for st in STATIONS:
            sid = str(st["id"])
            vals = []
            for h in range(8):
                e, n = acc.get((sid, h), (0.0, 0))
                vals.append(round(e / (n + CALIB_SHRINK), 2))
            if any(acc.get((sid, h)) for h in range(8)):
                out[sid] = vals
        print(model, "runs", len(keys), "관측소", len(out), flush=True)
        if len(out) >= len(STATIONS) * 0.8:
            temp[model] = out
    if not temp:
        sys.exit("보정에 쓸 기록이 모자람")
    put_json(
        s3,
        "verify/calib/latest.json",
        {
            "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
            "days": CALIB_DAYS,
            # 관측소: [위도, 경도, 해발고도]
            "stations": {str(st["id"]): [st["lat"], st["lon"], st["elevation"]] for st in STATIONS},
            # 모델별 관측소별 KST 0·3·…·21시 기온 치우침 (예보 − 관측, °C)
            "temp": temp,
        },
        dry,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("what", choices=["forecast", "obs", "calib"])
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    s3 = client()
    if a.what == "forecast":
        for m in MODELS:
            archive_model(s3, m, a.dry_run)
        archive_site(s3, a.dry_run)
    elif a.what == "obs":
        archive_obs(s3, a.dry_run)
    else:
        archive_calib(s3, a.dry_run)


if __name__ == "__main__":
    main()
