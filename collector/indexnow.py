"""
사이트맵의 모든 주소를 IndexNow로 검색엔진에 알린다 (Bing·네이버·Yandex 등이 바로 다시 긁어 가게).
열쇠 파일은 public/{KEY}.txt (공개용 값이라 비밀이 아니다).

환경 변수: SITE_URL(기본 https://tripnalc.com)
사용: python collector/indexnow.py [--dry-run]
"""

import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request

SITE = os.environ.get("SITE_URL", "https://tripnalc.com")
KEY = "c66255218b85fcf305db539bb8d938cc"
# 네이버는 IndexNow를 따로 받는다. api.indexnow.org는 Bing·Yandex 등과 나눈다
ENDPOINTS = ["https://api.indexnow.org/indexnow", "https://searchadvisor.naver.com/indexnow"]


def urls():
    with urllib.request.urlopen(urllib.request.Request(f"{SITE}/sitemap.xml", headers={"User-Agent": "tripnalc-indexnow"}), timeout=60) as r:
        text = r.read().decode()
    out = re.findall(r"<loc>([^<]+)</loc>", text)
    if len(out) < 100:
        sys.exit(f"사이트맵 주소가 {len(out)}개뿐: 사이트맵을 확인")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    found = urls()
    host = urllib.parse.urlparse(SITE).netloc
    body = json.dumps({"host": host, "key": KEY, "keyLocation": f"{SITE}/{KEY}.txt", "urlList": found[:10000]}).encode()
    print("주소", len(found), flush=True)
    if a.dry_run:
        return
    failed = 0
    for ep in ENDPOINTS:
        req = urllib.request.Request(ep, data=body, headers={"Content-Type": "application/json; charset=utf-8"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                print(ep, r.status, flush=True)
        except urllib.error.HTTPError as e:
            print(ep, e.code, e.read()[:300].decode(errors="ignore"), flush=True)
            failed += 1
    if failed == len(ENDPOINTS):
        sys.exit("모두 실패")


if __name__ == "__main__":
    main()
