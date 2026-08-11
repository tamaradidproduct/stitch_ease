#!/usr/bin/env python3
"""
Pull the stitch symbols out of the Figma "Stitches" component set and emit
the SYMS object that js/core/chart.js uses.

Why a script instead of copy-pasting paths: hand-transcribing vector data
is exactly the kind of silent-error job that already bit this project once
on the chart data. This re-exports from Figma every time, so the app's
symbols can't drift from the design system.

What it does beyond a plain export:

1. **Strips the cell chrome.** Each Figma component draws the whole chart
   cell — a background rect and a border rect covering the full 24x24 box —
   and then the glyph on top. The app already draws that background and
   border in CSS (.cc), so those two rects must go or every cell would be
   double-drawn. Any rect covering (nearly) the entire canvas is dropped.

2. **Rewrites colors to currentColor.** The export hardcodes the design
   system greys; the app needs the glyph to inherit its colour so the
   active-row highlight (.crow-active .cc-sym) can swap it.

3. **Keeps the native 24-unit viewBox** and sizes the svg 100%x100%, so a
   glyph's padding stays exactly as designed and the symbol scales with
   whatever box it's dropped into (chart cells scale with --cell-sz).

Usage:
    export FIGMA_TOKEN=...
    python3 scripts/extract-figma-stitch-icons.py            # print SYMS
    python3 scripts/extract-figma-stitch-icons.py -o syms.js
"""
import argparse
import json
import os
import re
import sys
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

FILE_ID = "mSct8t0TpsyYJad4teKfwl"
COMPONENT_SET = "1:258"

# Figma component name (the `type=` variant) -> this app's stitch code.
# K (plain knit) and E (no stitch) are intentionally absent: they're empty
# cells the app renders with CSS alone, so they have no glyph to export.
WANTED = {
    "purl":      "P",
    "yarn_over": "YO",
    "k2tog":     "K2",
    "SKPO":      "SK",
    "M1":        "M1",
    "M1L":       "M1L",
    "M1R":       "M1R",
}

# Order to emit, so the generated block stays diff-stable run to run.
ORDER = ["P", "YO", "K2", "SK", "M1", "M1L", "M1R"]

SVG_NS = "http://www.w3.org/2000/svg"


def api(url, token):
    req = urllib.request.Request(url, headers={"X-FIGMA-TOKEN": token})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        sys.exit(f"Figma API request failed ({e.code}): {e.read().decode(errors='replace')}")


def find_components(node, out):
    """Collect every COMPONENT under the set, keyed by its `type=` variant."""
    if node.get("type") == "COMPONENT":
        name = node.get("name", "")
        key = name.split("=", 1)[1] if "=" in name else name
        out[key] = node["id"]
    for c in node.get("children") or []:
        find_components(c, out)
    return out


def covers_whole_canvas(el):
    """True for the component's background/border rects — the cell chrome the
    app draws itself in CSS. Figma exports them as a rect at ~(0.25, 0.25)
    sized ~23.5x23.5 inside a 24x24 box; anything covering >90% of the canvas
    on both axes is chrome, not glyph."""
    if el.tag != f"{{{SVG_NS}}}rect":
        return False
    try:
        w = float(el.get("width", 0))
        h = float(el.get("height", 0))
        x = float(el.get("x", 0))
        y = float(el.get("y", 0))
    except ValueError:
        return False
    return w >= 24 * 0.9 and h >= 24 * 0.9 and x <= 24 * 0.1 and y <= 24 * 0.1


def recolor(el):
    """Design-system greys -> currentColor, so the app can swap the colour."""
    for attr in ("fill", "stroke"):
        v = el.get(attr)
        if v and v.lower() not in ("none", "currentcolor"):
            el.set(attr, "currentColor")


def to_sym(svg_text):
    ET.register_namespace("", SVG_NS)
    root = ET.fromstring(svg_text)

    view_box = root.get("viewBox", "0 0 24 24")

    kept = []
    for child in list(root):
        if covers_whole_canvas(child):
            continue
        for el in child.iter():
            recolor(el)
        kept.append(child)

    if not kept:
        return None

    inner = "".join(
        ET.tostring(el, encoding="unicode").replace(f' xmlns="{SVG_NS}"', "").strip()
        for el in kept
    )
    # Collapse the whitespace ElementTree leaves between attributes/elements.
    inner = re.sub(r"\s+", " ", inner).replace("> <", "><").strip()
    return (
        f'<svg width="100%" height="100%" viewBox="{view_box}" '
        f'style="display:block">{inner}</svg>'
    )


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--token-env", default="FIGMA_TOKEN")
    p.add_argument("-o", "--output", help="write the SYMS block here instead of stdout")
    args = p.parse_args()

    token = os.environ.get(args.token_env)
    if not token:
        sys.exit(f"${args.token_env} is not set. Export a Figma personal access token first.")

    node = api(f"https://api.figma.com/v1/files/{FILE_ID}/nodes?ids={COMPONENT_SET}", token)
    doc = node["nodes"][COMPONENT_SET]["document"]
    comps = find_components(doc, {})

    missing = [n for n in WANTED if n not in comps]
    if missing:
        sys.exit(
            "These components aren't in the Figma set any more — refusing to "
            f"emit a partial symbol table: {missing}\nFound: {sorted(comps)}"
        )

    ids = {comps[name]: code for name, code in WANTED.items()}
    imgs = api(
        f"https://api.figma.com/v1/images/{FILE_ID}?ids={','.join(ids)}&format=svg",
        token,
    )
    if imgs.get("err"):
        sys.exit(f"Figma image export failed: {imgs['err']}")

    syms = {}
    for node_id, url in imgs["images"].items():
        code = ids[node_id]
        with urllib.request.urlopen(url) as r:
            svg_text = r.read().decode()
        sym = to_sym(svg_text)
        if sym is None:
            sys.exit(f"{code}: nothing left after stripping cell chrome — check the component.")
        syms[code] = sym

    lines = ["const SYMS = {"]
    for code in ORDER:
        lines.append(f"  {(code + ':').ljust(5)}'{syms[code]}',")
    lines.append("};")
    out = "\n".join(lines)

    if args.output:
        with open(args.output, "w") as f:
            f.write(out + "\n")
        print(f"Wrote {args.output}", file=sys.stderr)
    else:
        print(out)
    print(f"Exported {len(syms)} symbols: {', '.join(ORDER)}", file=sys.stderr)


if __name__ == "__main__":
    main()
