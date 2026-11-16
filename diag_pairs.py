"""verify/ 기록을 예보-관측 짝으로 펼쳐 CSV로 남긴다 (정확도 분석용)"""
import sys, json, gzip, csv, datetime as dt, concurrent.futures as cf
sys.path.insert(0, "collector")
from upload import client

s3 = client()
B = "tripnal-data"
H = dt.timedelta(hours=1)


def keys(prefix):
    out, tok = [], None
    while True:
        kw = dict(Bucket=B, Prefix=prefix, MaxKeys=1000)
        if tok:
            kw["ContinuationToken"] = tok
        r = s3.list_objects_v2(**kw)
        out += [o["Key"] for o in r.get("Contents", [])]
        if not r.get("IsTruncated"):
            return sorted(out)
        tok = r["NextContinuationToken"]


def get(k):
    for i in range(4):
        try:
            return json.loads(s3.get_object(Bucket=B, Key=k)["Body"].read())
        except Exception as e:
            err = e
    print("fail", k, err)
    return None


obsk, fck, sitek = keys("verify/obs/"), keys("verify/fc/"), keys("verify/site/")
print("obs", len(obsk), obsk[:1], obsk[-1:])
print("fc", len(fck), fck[:1], fck[-1:])
print("site", len(sitek), sitek[:1], sitek[-1:])

obs = {}
with cf.ThreadPoolExecutor(16) as ex:
    for k, d in zip(obsk, ex.map(get, obsk)):
        if not d:
            continue
        for sid, hours in d["stations"].items():
            for hh, v in hours.items():
                obs[(sid, dt.datetime.strptime(d["date"] + hh, "%Y%m%d%H"))] = v
print("obs points", len(obs))


def o(sid, t, f):
    v = obs.get((sid, t))
    return None if v is None else v.get(f)


def osum(sid, t, n):
    xs = [o(sid, t - H * j, "precip") for j in range(n)]
    return None if any(x is None for x in xs) else round(sum(xs), 1)


fmt = lambda t: t.strftime("%Y-%m-%dT%H")
n = 0
with gzip.open("pairs_fc.csv.gz", "wt", newline="") as fp:
    w = csv.writer(fp)
    w.writerow(["model", "run", "sid", "lead", "valid", "ft", "ot", "fd", "od", "fw", "ow", "L", "fp", "op", "gelev"])
    with cf.ThreadPoolExecutor(8) as ex:
        for k, d in zip(fck, ex.map(get, fck)):
            if not d:
                continue
            run_kst = dt.datetime.strptime(d["run"], "%Y%m%d%H") + 9 * H
            steps = d["step"]
            for sid, st in d["stations"].items():
                for i, s in enumerate(steps):
                    t = run_kst + s * H
                    if (sid, t) not in obs:
                        continue
                    L = s - steps[i - 1] if i else 0
                    fp_ = st["precip"][i] if i else None
                    op_ = osum(sid, t, L) if i else None
                    w.writerow([d["model"], d["run"], sid, s, fmt(t), st["temp"][i], o(sid, t, "temp"), st["dew"][i], o(sid, t, "dew"),
                                st["wind"][i], o(sid, t, "wind"), L, fp_, op_, st.get("gridElevation")])
                    n += 1
print("fc pairs", n)

n = 0
with gzip.open("pairs_site.csv.gz", "wt", newline="") as fp:
    w = csv.writer(fp)
    w.writerow(["gen", "sid", "lead", "valid", "ft", "ot", "fw", "ow", "fp", "op", "prob", "fg"])
    with cf.ThreadPoolExecutor(8) as ex:
        for k, d in zip(sitek, ex.map(get, sitek)):
            if not d:
                continue
            gen = dt.datetime.fromisoformat(d["generated"]).astimezone(dt.timezone(9 * H)).replace(tzinfo=None)
            for sid, st in d["stations"].items():
                t0 = dt.datetime.fromisoformat(st["t0"][:16])
                for i in range(len(st["temp"])):
                    t = t0 + 3 * i * H
                    if (sid, t) not in obs:
                        continue
                    lead = round((t - gen).total_seconds() / 3600, 1)
                    if lead < -3:
                        continue
                    w.writerow([fmt(gen), sid, lead, fmt(t), st["temp"][i], o(sid, t, "temp"), st["wind"][i], o(sid, t, "wind"),
                                st["precip"][i], osum(sid, t + 2 * H, 3), st["prob"][i], st["gust"][i]])
                    n += 1
print("site pairs", n)
