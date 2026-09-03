"""widen_spine.py - put the wider fleet through the same grid-proximity engine.

WHY THIS EXISTS

grid-proximity.json carried 3047 rows and exactly two technologies: solar (1747) and
bess (1300). The obvious reading is that the builder filters, and that a technology
filter needs relaxing. It does not filter. build_payload.py reads every spine row that
has usable coordinates and passes `tech` straight through from column 2. The narrowness
was never in the engine - the spine it is fed contains only solar and bess.

    gridatlas/_build-plan/PROJECT-STUDIES/_evidence/master.tsv
    3054 rows: solar 1750, bess 1304; 7 have unusable coordinates; 3047 published.

Meanwhile wider-fleet.json holds 1104 further projects - biomass 823, hydro 151,
hydrogen 62, act 37, tidal 18, geothermal 7, caes 4, flywheel 1, other 1 - and 1092 of
them have no grid proximity computed at all. They are not absent because anything decided
they should be. They are absent because they were never in the file the builder reads.

WHY THIS IS AN ADAPTER AND NOT A SECOND BUILDER

The temptation is to write a small proximity calculation for the wider fleet. That would
be the estate's known failure: two implementations of the same measurement that disagree
in public. build_payload.py already does this correctly and carefully - point to SEGMENT
rather than to the nearest sampled vertex, all five mapped voltages plus the eleven 33 kV
regional files, full geometry at 163,905 vertices rather than a 47,897-point decimation,
and haversine on R = 6378.137 so a distance measured in Pipeline News equals the same
distance measured in the Atlas or the Sandbox.

So this writes no geometry at all. It reshapes wider-fleet rows into the spine's 40-column
contract and hands them to the existing engine unchanged. The solar and bess rows must
come out byte-identical; verify_widen.py asserts exactly that, and a single moved value
there means this adapter changed something it had no business changing.

WHAT IS DELIBERATELY LEFT EMPTY

`town` is left empty for every wider-fleet row. In the spine that column is the PLANNING
AUTHORITY, not the settlement - "Doncaster" is who decides a project, not where it is -
and the wider-fleet source carries no authority field. The settlement is often recoverable
from the project name, and a local model extracts it at 98.3% precision, but 98.3% is a
machine for generating plausible wrong towns in a field a reader would trust. An empty
column is honest; a filled one that is wrong 1 time in 60 is not. Region and country are
empty for the same reason: not present in the source, and not guessable from a postcode
outcode without a gazetteer this repository does not carry.

Usage:
    python widen_spine.py --spine <master.tsv> --wider <wider-fleet.json> --out <combined.tsv>
"""

import argparse
import json
import os

SPINE_COLUMNS = 40

# spine column -> wider-fleet key. Everything not named here stays empty.
#   0 ref   1 capacity MW   2 tech   3 status   4 name   5 operator
#   6 town (planning authority - absent upstream, left empty on purpose)
#   7 county   8 region   9 country   10 lon   11 lat
COL_REF, COL_MW, COL_TECH, COL_STATUS = 0, 1, 2, 3
COL_NAME, COL_OPERATOR, COL_TOWN, COL_COUNTY = 4, 5, 6, 7
COL_REGION, COL_COUNTRY, COL_LON, COL_LAT = 8, 9, 10, 11


def title_status(s):
    """The spine writes 'Awaiting Construction'; wider-fleet writes 'awaiting construction'.

    Same vocabulary, different case. Normalising here keeps one status vocabulary in the
    output instead of two that a reader would have to know are the same thing.
    """
    return " ".join(w.capitalize() for w in str(s or "").split())


def load_wider(path):
    d = json.load(open(path, encoding="utf-8"))
    rows = d if isinstance(d, list) else next(
        v for v in d.values() if isinstance(v, list) and v and isinstance(v[0], dict))
    return rows


def to_spine_row(r):
    ll = r.get("ll") or []
    if len(ll) != 2:
        return None
    row = [""] * SPINE_COLUMNS
    row[COL_REF] = str(r.get("ref") or "")
    row[COL_MW] = "" if r.get("c") in (None, "") else str(r["c"])
    row[COL_TECH] = str(r.get("t") or "")
    row[COL_STATUS] = title_status(r.get("s"))
    row[COL_NAME] = str(r.get("n") or "")
    row[COL_OPERATOR] = str(r.get("o") or "")
    row[COL_COUNTY] = str(r.get("cty") or "")
    row[COL_LON] = str(ll[0])
    row[COL_LAT] = str(ll[1])
    # town, region, country: intentionally empty. See module docstring.
    return row


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spine", required=True)
    ap.add_argument("--wider", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    base = [l.rstrip("\n").split("\t") for l in open(a.spine, encoding="utf-8") if l.strip()]
    bad = [r for r in base if len(r) != SPINE_COLUMNS]
    if bad:
        raise SystemExit(f"spine is not {SPINE_COLUMNS} columns on {len(bad)} row(s); "
                         "the column contract this adapter targets has moved")

    seen = {r[COL_REF] for r in base}
    wider = load_wider(a.wider)

    added, skipped_dup, skipped_geom = [], 0, 0
    for r in wider:
        row = to_spine_row(r)
        if row is None:
            skipped_geom += 1
            continue
        if row[COL_REF] in seen:
            # A ref already in the spine is already measured. Appending it again would
            # publish the same project twice under one ref.
            skipped_dup += 1
            continue
        seen.add(row[COL_REF])
        added.append(row)

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8", newline="") as h:
        for row in base + added:
            h.write("\t".join(row) + "\n")

    print(f"spine {len(base)} + wider {len(added)} = {len(base)+len(added)} rows -> {a.out}")
    if skipped_dup:
        print(f"  {skipped_dup} wider row(s) already in the spine, not duplicated")
    if skipped_geom:
        print(f"  {skipped_geom} wider row(s) had no usable coordinate pair")
    from collections import Counter
    print("  added tech:", Counter(r[COL_TECH] for r in added).most_common())


if __name__ == "__main__":
    main()
