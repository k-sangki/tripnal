"""
장소 페이지 예보를 R2(fc/{날짜}/…)에 미리 채운다 (src/lib/weather/index.ts storedForecast).
사이트맵의 한국어 장소 페이지(/weather/{slug})·골프장 시·도(/golf/{region})·물때표(/tide)를 한 번씩 열면 사이트가 예보를 계산해 R2에 넣는다.
그 뒤에는 검색 로봇이 어느 데이터센터로 와도 파일 하나만 읽으면 된다.
끝나면 지난 날짜 폴더(fc/어제 이전)를 지운다 (R2 값이 있을 때만).

사용: python collector/prewarm.py   (환경 변수 SITE, 기본 https://tripnalc.com)
"""

import concurrent.futures as cf
import datetime as dt
import os
import re
import statistics
import time
import urllib.request

SITE = os.environ.get("SITE", "https://tripnalc.com")
UA = "tripnalc-prewarm"
KST = dt.timezone(dt.timedelta(hours=9))


def page_urls():
    with urllib.request.urlopen(urllib.request.Request(f"{SITE}/sitemap.xml", headers={"User-Agent": UA}), timeout=60) as r:
        xml = r.read().decode()
    locs = re.findall(r"<loc>([^<]+)</loc>", xml)
    # 장소 페이지, 골프장 시·도 페이지(가운데 지점 예보), 물때표(그날 만조·간조 묶음)
    pat = re.escape(SITE) + r"(/weather/[^/?#]+|/golf/[^/?#]+|/tide)"
    return sorted({u for u in locs if re.fullmatch(pat, u)})


def warm(url, tag):
    t = time.time()
    try:
        req = urllib.request.Request(f"{url}?_w={tag}", headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            r.read()
            return r.status, time.time() - t
    except Exception as e:  # noqa: BLE001
        print("fail", url, e, flush=True)
        return 0, time.time() - t


def prune():
    if not os.environ.get("R2_ACCESS_KEY_ID"):
        print("R2 값이 없어 정리는 건너뜀", flush=True)
        return
    from upload import client

    s3 = client()
    bucket = os.environ.get("R2_BUCKET", "tripnal-data")
    yesterday = (dt.datetime.now(KST) - dt.timedelta(days=1)).strftime("%Y-%m-%d")
    days = set()
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix="fc/", Delimiter="/"):
        for p in page.get("CommonPrefixes", []):
            days.add(p["Prefix"].split("/")[1])
    for d in sorted(x for x in days if x < yesterday):
        keys = []
        for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=f"fc/{d}/"):
            keys += [{"Key": o["Key"]} for o in page.get("Contents", [])]
        for i in range(0, len(keys), 1000):
            s3.delete_objects(Bucket=bucket, Delete={"Objects": keys[i : i + 1000]})
        print("deleted fc", d, len(keys), flush=True)


def main():
    urls = page_urls()
    tag = os.environ.get("GITHUB_RUN_ID") or str(int(time.time()))
    print("pages", len(urls), flush=True)
    with cf.ThreadPoolExecutor(8) as ex:
        results = list(ex.map(lambda u: warm(u, tag), urls))
    ok = [s for s, _ in results if s == 200]
    times = sorted(t for _, t in results)
    print(f"ok {len(ok)}/{len(urls)}, median {statistics.median(times):.2f}s, p90 {times[int(len(times) * 0.9)]:.2f}s", flush=True)
    prune()
    if len(ok) < len(urls) * 0.9:
        raise SystemExit("실패가 많음")


if __name__ == "__main__":
    main()
