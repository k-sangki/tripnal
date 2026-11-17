import random, time, json, re, collections, html, urllib.request, urllib.error, concurrent.futures as cf
UA = "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
def get(u, ua=UA):
    t = time.time()
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": ua}), timeout=60) as r:
            return r.status, r.read().decode("utf-8", "replace"), time.time() - t
    except urllib.error.HTTPError as e: return e.code, "", time.time() - t
    except Exception as e: return type(e).__name__, "", time.time() - t
# 1) load
def one(i):
    lat = round(random.uniform(35.0, 37.8), 2); lon = round(random.uniform(126.8, 129.0), 2)
    s, _, t = get(f"https://tripnalc.com/api/forecast?lat={lat}&lon={lon}&z={random.random()}", "tripnalc-loadtest"); return s, t
for conc in (8, 12):
    with cf.ThreadPoolExecutor(conc) as ex: res = list(ex.map(one, range(conc * 8)))
    c = collections.Counter(s for s, _ in res); ts = sorted(t for _, t in res)
    print(f"LOAD conc {conc}: {dict(c)} median {ts[len(ts)//2]:.2f}s max {ts[-1]:.2f}s", flush=True)
# 2) audit
_, sm, _ = get("https://tripnalc.com/sitemap.xml")
locs = re.findall(r"<loc>([^<]+)</loc>", sm)
random.seed(1)
sample = ["https://tripnalc.com/", "https://tripnalc.com/guide", "https://tripnalc.com/golf", "https://tripnalc.com/weekend", "https://tripnalc.com/tide"] + random.sample(locs, 70)
sample = list(dict.fromkeys(sample))
rows = []
def audit(u):
    s, b, t = get(u)
    head = b.split("</head>")[0]
    title = html.unescape((re.search(r"<title>(.*?)</title>", head, re.S) or [None, ""])[1])
    desc = html.unescape((re.search(r'<meta name="description" content="([^"]*)"', head) or [None, ""])[1])
    canon = (re.search(r'<link rel="canonical" href="([^"]*)"', head) or [None, ""])[1]
    robots = (re.search(r'<meta name="robots" content="([^"]*)"', head) or [None, ""])[1]
    vp = bool(re.search(r'<meta name="viewport"', head))
    h1 = len(re.findall(r"<h1[\s>]", b))
    lds = re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', b, re.S)
    ldbad = 0; types = []
    for x in lds:
        try:
            j = json.loads(x); items = j.get("@graph", [j]) if isinstance(j, dict) else j
            types += [str(i.get("@type")) for i in items if isinstance(i, dict)]
        except Exception: ldbad += 1
    body = re.sub(r"<script.*?</script>|<style.*?</style>", " ", b, flags=re.S)
    text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", body))).strip()
    ads = len(re.findall(r"adsbygoogle", b))
    return dict(u=u, s=s, t=round(t, 2), title=title, desc=desc, canon=canon, robots=robots, vp=vp, h1=h1, ld=len(lds), ldbad=ldbad, types=types, kb=len(b)//1024, words=len(text), ads=ads, text=text)
with cf.ThreadPoolExecutor(4) as ex: rows = list(ex.map(audit, sample))
for r in rows:
    print(f"{r['s']} {r['t']}s {r['kb']}KB text={r['words']} h1={r['h1']} vp={r['vp']} ld={r['ld']}/bad{r['ldbad']} ads={r['ads']} robots={r['robots'] or '-'} canon_ok={r['canon']==r['u'].rstrip('/') or r['canon']==r['u']} {r['u']}")
    print(f"    T: {r['title']}\n    D: {r['desc'][:160]}")
print("dup titles:", [t for t, n in collections.Counter(r['title'] for r in rows).items() if n > 1])
print("dup descs:", [t[:60] for t, n in collections.Counter(r['desc'] for r in rows).items() if n > 1])
print("ld types:", collections.Counter(t for r in rows for t in r['types']))
# boilerplate: share of sentences appearing on most place pages
places = [r for r in rows if "/weather/" in r['u']]
def sents(t): return set(x.strip() for x in re.split(r"[.!?。]\s|\s{2,}|·", t) if len(x.strip()) > 12)
cnt = collections.Counter(s for r in places for s in sents(r['text']))
common = {s for s, n in cnt.items() if n >= len(places) * 0.6}
for r in places[:10]:
    ss = sents(r['text']); print(f"boilerplate {len(ss & common)}/{len(ss)} sentences common  {r['u']}")
print("common examples:", list(common)[:25])
# sample place page text
if places: print("TEXT SAMPLE:", places[0]['u'], places[0]['text'][:3000])
