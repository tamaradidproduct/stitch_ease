#!/usr/bin/env python3
"""
Pull a knitting stitch chart out of Figma and print it as a JS chart array
in the shape this app's pattern files use: chart[0] is row 1 (cast on,
worked/knitted first), chart[N-1] is the last row (worked last, drawn at
the top of the on-screen chart) — see CLAUDE.md's "Chart" section.

Why not just read stitches off a screenshot or trust Figma's layer names?
Both have burned this project before:

1. Layer names ("1", "2", ... "36" on each stitch) are NOT reliable. Figma
   doesn't renumber a layer's name when you copy/paste or rearrange cells,
   so a chart can end up with a cell physically in column 5 whose layer is
   still named "9" from wherever it was copied from. This script never
   reads layer names for position — only real geometry.
2. A row's `children` array is in Figma's internal creation/z-order, not
   left-to-right reading order. Stitch layers are sorted by their own
   `absoluteBoundingBox.x` to get correct column order.
3. Figma frames are usually authored top-to-bottom (visually), but the
   chart array this app wants is bottom-to-top (row 1 first, at the
   bottom of the chart). Rows are sorted by `absoluteBoundingBox.y`
   descending (largest y = bottom = row 1).
4. A stitch's TYPE (knit/purl/yarn-over/decrease/...) is read from its
   Figma component's `description` field, not its instance layer name —
   descriptions are per-component (shared, intentional), instance names
   are per-copy (unreliable, same as row-cell names above).

Usage:
    export FIGMA_TOKEN=...          # personal access token, never hardcode it
    python3 scripts/extract-figma-chart.py --file-id FILE_ID --node-id 59:924

    # with a custom stitch-type translation table (see --stitch-map below):
    python3 scripts/extract-figma-chart.py --file-id FILE_ID --node-id 59:924 \
        --stitch-map my_map.json

    # write the JS array straight to a file instead of stdout:
    python3 scripts/extract-figma-chart.py --file-id FILE_ID --node-id 59:924 \
        --var-name FF_MOTIF_CHART -o chart.js

Getting FILE_ID and NODE_ID from a Figma URL like
    https://www.figma.com/design/MaDkQy1HLSAr0kRLrurwST/My-File?node-id=59-924
  FILE_ID is the path segment after /design/:      MaDkQy1HLSAr0kRLrurwST
  NODE_ID is the node-id query param, hyphen -> colon:  59-924  ->  59:924

Getting a Figma token: Figma -> Settings -> Personal access tokens. Treat it
like a password — export it in your shell, never paste it into a script,
commit, or chat message. If a token has ever been pasted in plaintext
anywhere (including to an AI chat), rotate it — it should be considered
burned.
"""
import argparse
import json
import os
import re
import sys
import urllib.request
import urllib.error

# Default translation from a Figma component's `description` text to this
# app's fixed stitch-code vocabulary (CLAUDE.md "Chart" section: K, P, YO,
# K2, SK, M1, E). Keys are matched case-insensitively after stripping
# whitespace. Deliberately small and explicit — an unrecognized description
# stops the script and tells you what it saw, instead of guessing. Extend
# with --stitch-map for a file that uses different component names.
DEFAULT_STITCH_MAP = {
    "knit": "K",
    "purl": "P",
    "yarn_over": "YO",
    "yarn over": "YO",
    "yo": "YO",
    "k2tog": "K2",
    "skpo": "SK",
    "ssk": "SK",
    "make_one": "M1",
    "make one": "M1",
    "m1": "M1",
    "m1l": "M1L",
    "make one left": "M1L",
    "m1r": "M1R",
    "make one right": "M1R",
    "no_stitch": "E",
    "no stitch": "E",
    "empty": "E",
}

VALID_CODES = {"K", "P", "YO", "K2", "SK", "M1", "M1L", "M1R", "E"}


def fetch_node(file_id: str, node_id: str, token: str) -> dict:
    url = f"https://api.figma.com/v1/files/{file_id}/nodes?ids={node_id}"
    req = urllib.request.Request(url, headers={"X-FIGMA-TOKEN": token})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        sys.exit(f"Figma API request failed ({e.code}): {body}")

    node_entry = data.get("nodes", {}).get(node_id)
    if node_entry is None:
        sys.exit(
            f"Node {node_id!r} not found in file {file_id!r}. "
            f"Nodes returned: {list(data.get('nodes', {}).keys())}"
        )
    if node_entry.get("document") is None:
        sys.exit(f"Node {node_id!r} has no document body — check the file/node IDs.")
    return node_entry


def is_row_container(node: dict) -> bool:
    """A node is a row container if most of its children are themselves
    frames whose own children are component instances (stitches)."""
    children = node.get("children") or []
    if not children:
        return False
    instance_rows = 0
    for c in children:
        grandchildren = c.get("children") or []
        if grandchildren and any(g.get("type") == "INSTANCE" for g in grandchildren):
            instance_rows += 1
    return instance_rows >= len(children) / 2


def find_row_containers(node: dict, path=""):
    """Recursively find every node in the tree that looks like a row
    container (a chart). Figma files vary in how deeply a chart is nested —
    some node IDs point straight at the chart, others point at a parent
    holding several charts — so this searches rather than assuming a fixed
    depth."""
    found = []
    if is_row_container(node):
        found.append((path or node.get("name", "?"), node))
        return found  # don't recurse into a chart's own rows
    for c in node.get("children") or []:
        found.extend(find_row_containers(c, f"{path}/{c.get('name','?')}" if path else c.get("name", "?")))
    return found


def build_component_map(node_entry: dict) -> dict:
    components = node_entry.get("components", {}) or {}
    return {cid: (comp.get("description") or "").strip() for cid, comp in components.items()}


def extract_chart(chart_node: dict, component_map: dict, stitch_map: dict):
    rows = chart_node.get("children") or []
    if not rows:
        sys.exit(f"Chart node {chart_node.get('name')!r} has no row children.")

    # Sort rows bottom-to-top (largest y first) so array index 0 = row 1
    # (cast-on / worked first). Geometry is the source of truth; a numeric
    # row-name mismatch is only ever a warning, never trusted over position.
    def row_y(r):
        return r.get("absoluteBoundingBox", {}).get("y", 0)

    rows_sorted = sorted(rows, key=row_y, reverse=True)

    name_nums = []
    for r in rows_sorted:
        m = re.search(r"\d+", r.get("name", ""))
        name_nums.append(int(m.group()) if m else None)
    if all(n is not None for n in name_nums):
        if name_nums != sorted(name_nums):
            print(
                "WARNING: row order by geometry (top/bottom position) doesn't match "
                "ascending row numbers parsed from layer names. Using geometry "
                f"order regardless. Row numbers found, in the order used: {name_nums}",
                file=sys.stderr,
            )

    unmapped = {}
    row_lengths = []
    chart = []
    for r in rows_sorted:
        stitches = r.get("children") or []
        # Sort by real x position — NOT by layer name and NOT by document
        # order. This is the fix for the exact bug that shipped wrong data
        # earlier: some stitch cells' layer names ("1".."36") were stale
        # relative to their actual on-screen column, left over from
        # copy/pasting cells while designing the chart.
        stitches_sorted = sorted(
            stitches, key=lambda s: s.get("absoluteBoundingBox", {}).get("x", 0)
        )
        row_lengths.append(len(stitches_sorted))
        row_codes = []
        for s in stitches_sorted:
            cid = s.get("componentId")
            desc = component_map.get(cid, "")
            code = stitch_map.get(desc.lower().strip())
            if code is None:
                unmapped.setdefault(desc, 0)
                unmapped[desc] += 1
                code = f"???{desc or cid}"
            row_codes.append(code)
        chart.append(row_codes)

    if unmapped:
        lines = "\n".join(f"  {desc!r}: seen {count} time(s)" for desc, count in unmapped.items())
        sys.exit(
            "Found stitch component descriptions with no entry in the stitch-type "
            "translation table — refusing to guess. Add these to your --stitch-map "
            f"JSON file (or extend DEFAULT_STITCH_MAP) and re-run:\n{lines}"
        )

    distinct_lengths = set(row_lengths)
    if len(distinct_lengths) > 1:
        detail = "\n".join(
            f"  row index {i} (\"{r.get('name')}\"): {n} stitches"
            for i, (r, n) in enumerate(zip(rows_sorted, row_lengths))
        )
        sys.exit(
            f"Rows aren't a uniform width — found {len(distinct_lengths)} different "
            f"row lengths ({sorted(distinct_lengths)}). Refusing to silently pad or "
            f"truncate. Row-by-row counts:\n{detail}"
        )

    return chart, rows_sorted


def check_lace_balance(chart):
    """Optional sanity check, not a hard failure: in a stitch-count-
    preserving lace chart, yarn-overs (increases) should balance decreases
    (K2/SK) on every row. A mismatch doesn't necessarily mean the extraction
    is wrong (some charts aren't stitch-count-preserving on every row), but
    it's worth a human's attention."""
    problems = []
    for i, row in enumerate(chart):
        yo = row.count("YO") + row.count("M1")
        dec = row.count("K2") + row.count("SK")
        if yo != dec:
            problems.append((i + 1, yo, dec))
    return problems


def format_js(chart, var_name="CHART_DATA") -> str:
    lines = [f"const {var_name} = ["]
    for i, row in enumerate(chart):
        cells = ", ".join(f"'{c}'" for c in row)
        lines.append(f"  [{cells}], // Row {i + 1}")
    lines.append("];")
    return "\n".join(lines)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--file-id", required=True, help="Figma file key, e.g. the ID in figma.com/design/<FILE_ID>/...")
    p.add_argument("--node-id", required=True, help="Node ID, e.g. 59:924 (Figma URLs use 59-924 with a hyphen — convert it)")
    p.add_argument("--token-env", default="FIGMA_TOKEN", help="Env var holding the Figma personal access token (default: FIGMA_TOKEN)")
    p.add_argument("--stitch-map", help="Path to a JSON file of {figma description: code} overrides/additions to DEFAULT_STITCH_MAP")
    p.add_argument("--var-name", default="CHART_DATA", help="JS const name for the emitted array (default: CHART_DATA)")
    p.add_argument("-o", "--output", help="Write the JS array here instead of printing to stdout")
    args = p.parse_args()

    token = os.environ.get(args.token_env)
    if not token:
        sys.exit(
            f"${args.token_env} is not set. Generate a Figma personal access token "
            "(Figma -> Settings -> Personal access tokens) and export it, e.g.:\n"
            f"  export {args.token_env}=your-token-here\n"
            "Never hardcode a token into a script or commit it."
        )

    stitch_map = dict(DEFAULT_STITCH_MAP)
    if args.stitch_map:
        with open(args.stitch_map) as f:
            overrides = json.load(f)
        stitch_map.update({k.lower().strip(): v for k, v in overrides.items()})
    bad_codes = {v for v in stitch_map.values() if v not in VALID_CODES}
    if bad_codes:
        sys.exit(f"--stitch-map contains codes outside the app's vocabulary {sorted(VALID_CODES)}: {sorted(bad_codes)}")

    node_entry = fetch_node(args.file_id, args.node_id, token)
    component_map = build_component_map(node_entry)

    document = node_entry["document"]
    if is_row_container(document):
        chart_node = document
    else:
        candidates = find_row_containers(document)
        if not candidates:
            sys.exit(
                f"Couldn't find a chart (rows of stitch instances) inside node "
                f"{args.node_id!r} ({document.get('name')!r}). Point --node-id at "
                "the frame that directly contains the chart's row frames."
            )
        if len(candidates) > 1:
            listing = "\n".join(f"  - {path}" for path, _ in candidates)
            sys.exit(
                f"Node {args.node_id!r} contains {len(candidates)} separate charts, "
                f"not one. Re-run pointed at the specific one you want:\n{listing}\n"
                "(This script emits a single chart array per run.)"
            )
        path, chart_node = candidates[0]
        print(f"Note: --node-id pointed above the chart itself; using nested frame {path!r}.", file=sys.stderr)

    chart, rows_sorted = extract_chart(chart_node, component_map, stitch_map)

    balance_problems = check_lace_balance(chart)
    if balance_problems:
        detail = "\n".join(f"  row {n}: {yo} yarn-over(s) vs {dec} decrease(s)" for n, yo, dec in balance_problems)
        print(
            f"NOTE: {len(balance_problems)} row(s) have an unequal yarn-over/decrease "
            f"count (not necessarily an error, but worth a look):\n{detail}",
            file=sys.stderr,
        )

    js = format_js(chart, args.var_name)

    print(
        f"Extracted {len(chart)} rows x {len(chart[0])} stitches from "
        f"{chart_node.get('name')!r}. chart[0] = {rows_sorted[0].get('name')!r} "
        f"(row 1), chart[{len(chart)-1}] = {rows_sorted[-1].get('name')!r} (last row).",
        file=sys.stderr,
    )

    if args.output:
        with open(args.output, "w") as f:
            f.write(js + "\n")
        print(f"Wrote {args.output}", file=sys.stderr)
    else:
        print(js)


if __name__ == "__main__":
    main()
