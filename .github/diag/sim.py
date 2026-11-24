import re, sys, html, urllib.request
UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=30).read().decode()
sm = get("https://tripnalc.com/sitemap.xml")
for s in ["jirisan-cheonwangbong", "seoraksan-daecheongbong", "daedunsan"]:
    m = re.findall(r"<loc>([^<]*%s[^<]*)</loc>" % s, sm)
    print("sitemap", s, len(m))
def text(u):
    h = get(u)
    body = h.split("<body", 1)[1]
    body = re.sub(r"<script.*?</script>|<style.*?</style>", " ", body, flags=re.S)
    t = html.unescape(re.sub(r"<[^>]+>", "\n", body))
    lines = [re.sub(r"\s+", " ", x).strip() for x in t.split("\n")]
    return [x for x in lines if x]
pages = {s: text(f"https://tripnalc.com/weather/{s}") for s in ["jirisan-cheonwangbong", "seoraksan-daecheongbong", "daedunsan", "unaksan", "hwangmaesan"]}
norm = lambda x: re.sub(r"[0-9.,°%~\-:/()]+", "#", x)
for s, ls in pages.items():
    others = set()
    for o, ol in pages.items():
        if o != s: others |= {norm(x) for x in ol}
    total = sum(len(x) for x in ls)
    uniq = [x for x in ls if norm(x) not in others]
    print(f"\n== {s}: lines={len(ls)} chars={total} unique_chars={sum(len(x) for x in uniq)} ({100*sum(len(x) for x in uniq)//max(total,1)}%)")
    if False:
        print("--- all lines"); [print(" ", x[:140]) for x in ls]
for slug, probe in [("jirisan-cheonwangbong", "로터리대피소, 법계사"), ("seoraksan-daecheongbong", "한계령휴게소와 오색에 서는")]:
    h = get(f"https://tripnalc.com/weather/{slug}")
    i = h.find("mg-more")
    print("\n", slug, "details", h.count("<details"), "hidden-text-in-html", probe in h, "mg-grid", "mg-grid" in h)
