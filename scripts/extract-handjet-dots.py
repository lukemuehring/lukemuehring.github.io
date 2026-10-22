"""
Extract Handjet's dot grid to JSON, so the canvas can draw and animate each
element of each glyph individually.

Handjet's glyphs are not outlines: every glyph is a composite of one repeated
component named "pixel", placed on a fixed grid. The grid is the same at every
point in the variable font's design space -- ELGR, ELSH and wght change the
size and shape of the element, never the lattice it sits on -- so a single
extraction is valid for any axis values the CSS happens to use.

Run manually when the font file changes:

    pip install fonttools brotli
    python3 scripts/extract-handjet-dots.py

Writes src/data/handjet-dots.json.
"""

import json
import pathlib

from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT = ROOT / "public" / "fonts" / "Handjet.woff2"
OUT = ROOT / "src" / "data" / "handjet-dots.json"

def grid_step(glyf):
    """
    The design grid, taken from the "pixel" component's own size rather than
    from the spacing between components. Spacing is the wrong source: accents
    sit on half-steps, so the smallest gap between two components is half a
    cell and every glyph would come out on a lattice twice too fine.
    """
    px = glyf["pixel"]
    px.recalcBounds(glyf)
    return px.xMax - px.xMin


def collect_dots(glyf, name, dx, dy, out):
    """
    Walk a glyph down to its pixel components, accumulating offsets.

    Composites nest: "i" is dotlessi + uni0307, "0" is O + three pixels. A
    single non-recursive pass silently drops those glyphs, so recurse until
    every leaf is either a pixel or an empty glyph.

    Returns False if the glyph contains a real outline, which cannot be drawn
    as dots.
    """
    if name == "pixel":
        out.append((dx, dy))
        return True

    g = glyf[name]
    if g.isComposite():
        for c in g.components:
            # A scaled or rotated component would land its pixels off-lattice.
            transform = getattr(c, "transform", None)
            if transform and transform != [[1, 0], [0, 1]]:
                return False
            if not collect_dots(glyf, c.glyphName, dx + c.x, dy + c.y, out):
                return False
        return True

    # numberOfContours 0 is an empty glyph, e.g. space: no dots, still valid.
    return g.numberOfContours == 0


def main():
    font = TTFont(FONT)
    cmap = font.getBestCmap()
    glyf = font["glyf"]
    hmtx = font["hmtx"]
    upem = font["head"].unitsPerEm

    step = grid_step(glyf)
    glyphs = {}
    skipped = []

    for code in range(32, 127):
        ch = chr(code)
        name = cmap.get(code)
        if name is None:
            skipped.append(ch)
            continue

        raw = []
        if not collect_dots(glyf, name, 0, 0, raw):
            skipped.append(ch)
            continue

        # Cell coordinates, kept fractional: accents legitimately sit on
        # half-cells, and rounding them to the lattice visibly misplaces them.
        glyphs[ch] = {
            "advance": round(hmtx[name][0] / step, 3),
            "dots": [[round(x / step, 3), round(y / step, 3)] for x, y in raw],
        }

    data = {
        "_source": "Handjet[ELGR,ELSH,wght], google/fonts (OFL)",
        "unitsPerEm": upem,
        "gridStep": step,
        "cellsPerEm": upem / step,
        "glyphs": glyphs,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))

    dotted = sum(len(v["dots"]) for v in glyphs.values())
    print(f"grid step {step} units, {upem / step:g} cells per em")
    print(f"wrote {len(glyphs)} glyphs / {dotted} dots -> {OUT.relative_to(ROOT)}")
    print(f"size: {OUT.stat().st_size / 1024:.1f} KB")
    if skipped:
        print(f"no dot grid (needs fillText): {''.join(skipped)}")


if __name__ == "__main__":
    main()
