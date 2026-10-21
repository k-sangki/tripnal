import json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
f = TTFont("/tmp/p.font")
gs = f.getGlyphSet(); cmap = f.getBestCmap()
out = {"upm": f["head"].unitsPerEm, "glyphs": {}}
for ch in "nalc":
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs); gs[name].draw(pen)
    bp = BoundsPen(gs); gs[name].draw(bp)
    out["glyphs"][ch] = {"d": pen.getCommands(), "adv": gs[name].width, "bounds": bp.bounds}
print(json.dumps(out))
