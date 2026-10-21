import json, re, urllib.request, urllib.parse, io
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
css_url = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
css = urllib.request.urlopen(css_url).read().decode()
urls = re.findall(r"url\(([^)]+?\.woff2)\)", css)
print("urls", len(urls), urls[:2])
font = None
for u in urls:
    full = urllib.parse.urljoin(css_url, u.strip("'\""))
    f = TTFont(io.BytesIO(urllib.request.urlopen(full).read()))
    if all(ord(c) in f.getBestCmap() for c in "nalc"):
        font = f; print("using", full); break
if "fvar" in font:
    font = instancer.instantiateVariableFont(font, {"wght": 800})
gs = font.getGlyphSet(); cmap = font.getBestCmap()
out = {"upm": font["head"].unitsPerEm, "glyphs": {}}
for ch in "nalc":
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs); gs[name].draw(pen)
    bp = BoundsPen(gs); gs[name].draw(bp)
    out["glyphs"][ch] = {"d": pen.getCommands(), "adv": gs[name].width, "bounds": bp.bounds}
print("JSON" + json.dumps(out))
