#!/usr/bin/env python3
"""
Build the WIDER FLEET payload: every REPD technology type the Pipeline News
spine does not carry, with its REPD reference.

WHY THE REFERENCE MATTERS
-------------------------
GridAtlas resolves an arrival by REPD ref and nothing else
(identity_rule: EXACT_REPD_REF_ONLY). A MAP link without one lands with
status ABSENT, and the place-search cartridge returns before its flyTo --
so the card opens, the substation measurement runs off the link's own
coordinates, and the camera never moves. The project is on screen only if
you happen to already be looking at it. Watched live on 2026-09-02 for
Rainham Phase II: correct card, correct 1.426 km measurement, camera still
at [-3.5, 54.0].

The first cut of this payload came from repd_master.json, whose properties
are name, operator, tech, raw_tech, status, capacity and mounting -- no
reference of any kind, because repd_updaterv8.py never reads one from the
REPD CSV. So the ref is joined back on here, from the same CSV that
produced the register.

THE JOIN, AND WHY IT IS NOT A REBUILD
-------------------------------------
The register keeps its own geodesy and its own classification: the CSV
carries OSGB36 eastings and northings, and reprojecting them here would be
a second implementation of both. Only identity and locality are taken from
the CSV, matched onto rows the register already produced:

    1. site name + technology type + installed capacity   (unique)
    2. site name + technology type, capacity ignored      (when 1 found none)
    3. ... narrowed by operator                           (when several)
    4. ... then by development status                     (when still several)

Tier 2 exists because the register and the CSV disagree on capacity for 120
of these rows; a decimal place is not an identity. It still requires the
site name AND the technology type to match, and still requires the result
to be unique.

Anything still ambiguous, or absent from the CSV, gets no reference. It is
left null and the MAP link for that row carries no ref, exactly as before.
A guessed identity is worse than a missing one: it would point the Atlas at
a different project and every measurement on the card would be about the
wrong site.

TOWN is deliberately not populated. There is no town column in the REPD;
the field the spine calls "town" is the planning authority, and putting an
authority under a TOWN heading would be a quiet lie.

Usage:
    python build_payload.py --register dist/repd_master.json \
                            --repd-csv repd.csv --out site/

Outputs:
    <out>/wider-fleet.json        the register cut, one row per project
    <out>/wider-fleet-report.txt  what was carried and what was not
"""

import argparse
import csv
import io
import json
import os
import re
import sys
from collections import Counter, defaultdict

# The four REPD technology types the pipeline spine already carries. Anything
# outside this set is this payload's scope. Named in the REPD's own vocabulary
# so the boundary is checkable against the source, not against a nickname.
SPINE_TYPES = {
    "Solar Photovoltaics",
    "Battery",
    "Wind Onshore",
    "Wind Offshore",
}


def norm(value):
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def megawatts(value):
    try:
        return round(float(value), 3)
    except (TypeError, ValueError):
        return None


def load_csv_index(path):
    """Index the REPD extract by name+technology+capacity, and by name+technology.

    The capacity-free index is not a loosening. The register's capacity and the
    CSV's disagree on 120 of these rows -- the register carries a rounded or a
    later figure -- and without a second index every one of them lost its
    identity to a decimal place.
    """
    with_capacity = defaultdict(list)
    without_capacity = defaultdict(list)
    with io.open(path, encoding="utf-8-sig", errors="replace") as handle:
        for row in csv.DictReader(handle):
            if not (row.get("Ref ID") or "").strip():
                continue
            name = norm(row.get("Site Name"))
            technology = norm(row.get("Technology Type"))
            with_capacity[(name, technology,
                           megawatts(row.get("Installed Capacity (MWelec)")))].append(row)
            without_capacity[(name, technology)].append(row)
    return with_capacity, without_capacity


def resolve(index, props):
    """Return (csv_row, how) or (None, why-not). Never guesses."""
    with_capacity, without_capacity = index
    name = norm(props.get("name"))
    technology = norm(props.get("raw_tech"))

    candidates = with_capacity.get((name, technology, megawatts(props.get("capacity"))), [])
    if not candidates:
        # Same site, same technology, one row: the capacity is the only thing
        # that disagreed, and a decimal place is not an identity.
        loose = without_capacity.get((name, technology), [])
        if len(loose) == 1:
            return loose[0], "name+technology, capacity differs"
        if not loose:
            return None, "absent"
        candidates = loose
    if len(candidates) == 1:
        return candidates[0], "name+technology+capacity"

    by_operator = [r for r in candidates
                   if norm(r.get("Operator (or Applicant)")) == norm(props.get("operator"))]
    if len(by_operator) == 1:
        return by_operator[0], "narrowed by operator"

    pool = by_operator or candidates
    by_status = [r for r in pool
                 if norm(r.get("Development Status (short)")) == norm(props.get("status"))]
    if len(by_status) == 1:
        return by_status[0], "narrowed by status"

    return None, "ambiguous"


def build(register_path, csv_path):
    with open(register_path, encoding="utf-8") as handle:
        document = json.load(handle)
    features = document.get("features", document)
    index = load_csv_index(csv_path) if csv_path else None

    rows, how, skipped = [], Counter(), 0
    for feature in features:
        props = feature.get("properties") or {}
        raw = (props.get("raw_tech") or "Unknown").strip()
        if raw in SPINE_TYPES:
            continue
        coordinates = (feature.get("geometry") or {}).get("coordinates") or []
        if len(coordinates) < 2:
            skipped += 1
            continue

        match, reason = (resolve(index, props) if index else (None, "no csv supplied"))
        how[reason] += 1

        row = {
            "n": props.get("name") or "",
            "o": props.get("operator") or "",
            "t": props.get("tech") or "other",
            "rt": raw,
            "s": props.get("status") or "",
            "c": megawatts(props.get("capacity")) or 0.0,
            "ll": [round(float(coordinates[0]), 5), round(float(coordinates[1]), 5)],
        }
        if match:
            row["ref"] = (match.get("Ref ID") or "").strip()
            county = (match.get("County") or "").strip()
            postcode = (match.get("Post Code") or "").strip()
            if county:
                row["cty"] = county
            if postcode:
                row["pc"] = postcode
        rows.append(row)

    rows.sort(key=lambda r: -r["c"])
    return rows, how, skipped


def report(rows, how, skipped):
    counts, power = Counter(), defaultdict(float)
    for row in rows:
        counts[row["rt"]] += 1
        power[row["rt"]] += row["c"]

    referenced = sum(1 for r in rows if r.get("ref"))
    lines = ["WIDER FLEET BUILD", "",
             "%-42s %6s %13s  %s" % ("REPD TECHNOLOGY TYPE", "N", "MW", "WITH REF")]
    for name, count in counts.most_common():
        with_ref = sum(1 for r in rows if r["rt"] == name and r.get("ref"))
        lines.append("%-42s %6d %13s  %d" % (name, count, format(power[name], ",.1f"), with_ref))

    lines += ["", "identity resolution against the REPD extract"]
    for reason, count in how.most_common():
        lines.append("  %-34s %d" % (reason, count))

    lines += [
        "",
        "tabs (REPD technology types) : %d" % len(counts),
        "projects                     : %d" % len(rows),
        "capacity                     : %.2f GW" % (sum(r["c"] for r in rows) / 1000),
        "with a REPD reference        : %d of %d (%.1f%%)"
        % (referenced, len(rows), 100.0 * referenced / max(1, len(rows))),
        "without one, MAP unresolved  : %d" % (len(rows) - referenced),
        "with county                  : %d" % sum(1 for r in rows if r.get("cty")),
        "with postcode                : %d" % sum(1 for r in rows if r.get("pc")),
        "dropped, no coordinates      : %d" % skipped,
        "spine types excluded         : %s" % ", ".join(sorted(SPINE_TYPES)),
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--register", required=True,
                        help="repd_master.json produced by repd_updaterv8.py")
    parser.add_argument("--repd-csv", required=True,
                        help="the DESNZ REPD extract the register was built from")
    parser.add_argument("--out", required=True, help="output directory")
    parser.add_argument("--min-types", type=int, default=15,
                        help="fail the build below this many technology types")
    parser.add_argument("--min-referenced", type=float, default=90.0,
                        help="fail the build below this %% of rows carrying a REPD ref")
    args = parser.parse_args()

    rows, how, skipped = build(args.register, args.repd_csv)
    if not rows:
        sys.exit("no wider-fleet rows: register empty, or every type is in the spine")

    types = len({row["rt"] for row in rows})
    if types < args.min_types:
        sys.exit("only %d technology types, expected at least %d -- "
                 "the register or the spine boundary has moved" % (types, args.min_types))

    referenced = 100.0 * sum(1 for r in rows if r.get("ref")) / len(rows)
    if referenced < args.min_referenced:
        sys.exit("only %.1f%% of rows carry a REPD reference, expected at least %.1f%% -- "
                 "the CSV and the register have drifted apart"
                 % (referenced, args.min_referenced))

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "wider-fleet.json"), "w", encoding="utf-8") as handle:
        json.dump(rows, handle, separators=(",", ":"))
    text = report(rows, how, skipped)
    with open(os.path.join(args.out, "wider-fleet-report.txt"), "w", encoding="utf-8") as handle:
        handle.write(text + "\n")
    print(text)


if __name__ == "__main__":
    main()
