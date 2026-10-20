"""
collect.py 결과(out/ecmwf/...)를 Cloudflare R2 버킷에 올리고, 지난 run은 하나만 남기고 지운다.

환경 변수: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET(기본 tripnal-data)
사용: python collector/upload.py out ecmwf  (gfs·icon·dem도 같은 방식)
"""

import concurrent.futures as cf
import json
import os
import sys

import boto3
from botocore.config import Config


def client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['CLOUDFLARE_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(retries={"max_attempts": 5, "mode": "standard"}, max_pool_connections=32),
    )


def upload_dem(s3, bucket, out):
    """지형 고도 격자 (collector/dem.py)는 run 없이 그대로 올린다"""
    for name, ctype in [("korea.bin", "application/octet-stream"), ("korea.json", "application/json")]:
        with open(os.path.join(out, "dem", name), "rb") as fp:
            s3.put_object(Bucket=bucket, Key=f"dem/{name}", Body=fp.read(), ContentType=ctype)
    print("uploaded dem", flush=True)


def main(out, model):
    s3 = client()
    bucket = os.environ.get("R2_BUCKET", "tripnal-data")
    if model == "dem":
        return upload_dem(s3, bucket, out)
    with open(os.path.join(out, model, "latest.json")) as fp:
        run = json.load(fp)["run"]
    folder = os.path.join(out, model, run)
    names = sorted(os.listdir(folder))

    def put(name):
        with open(os.path.join(folder, name), "rb") as fp:
            s3.put_object(Bucket=bucket, Key=f"{model}/{run}/{name}", Body=fp.read(), ContentType="application/json")

    with cf.ThreadPoolExecutor(32) as ex:
        list(ex.map(put, names))
    # 격자점을 다 올린 뒤에 최신 run을 바꾼다
    with open(os.path.join(out, model, "latest.json"), "rb") as fp:
        s3.put_object(Bucket=bucket, Key=f"{model}/latest.json", Body=fp.read(), ContentType="application/json", CacheControl="max-age=300")
    print("uploaded", len(names), "points of", run, flush=True)

    # 지난 run 정리: 최신과 바로 앞 run만 남긴다
    runs = set()
    for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=f"{model}/", Delimiter="/"):
        for p in page.get("CommonPrefixes", []):
            runs.add(p["Prefix"].split("/")[1])
    old = sorted(r for r in runs if r.isdigit() and r < run)[:-1]
    for r in old:
        keys = []
        for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=f"{model}/{r}/"):
            keys += [{"Key": o["Key"]} for o in page.get("Contents", [])]
        for i in range(0, len(keys), 1000):
            s3.delete_objects(Bucket=bucket, Delete={"Objects": keys[i : i + 1000]})
        print("deleted run", r, len(keys), flush=True)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
