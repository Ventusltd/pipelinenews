"""Build the grid-distance payload: one number per project, for the table column.

WHY THIS IS NOT THE GRID PROXIMITY PAYLOAD
------------------------------------------
The GRID panel's payload is 5.5 MB. It carries, for every project, the nearest
circuit at each of seven voltages with the foot of each perpendicular, every
substation within reach, and the transmission/distribution split. That is the
right shape for a panel a user opens for one project at a time, and it is
fetched lazily when they open it.

A table column needs one number for every row before the first paint. Fetching
5.5 MB to render a column would be the wrong trade by a factor of thirty, so
this builds a slim index -- nearest circuit, its voltage, the transmission and
distribution answers, and the screening band -- keyed by REPD ref.

WHERE THE NUMBERS COME FROM
---------------------------
They are not recomputed from the network layers. They are carried across from
the published grid-proximity payload, so the column and the panel can never
disagree: the column IS the panel's number, to the metre.

What this script does do is CHECK them. The published payload stores the foot
of each perpendicular alongside its distance, so every row can be re-measured
from the site coordinate to that foot using the canonical geodesy in
Ventusltd/grid-distance-maths, and compared. The comparison is made against a
bound derived from the source's own rounding -- 3 dp on distances, 6 dp on
coordinates -- because that is the finest agreement the stored data can
support. If any row disagrees by more than that, this fails and writes
nothing.

That check is the point of the exercise. It is what turns "the panel and the
Atlas use the same formula" from an assertion into something a build proves.

    python build_payload.py                    # writes data/{GEN}-grid-distance.json
    python build_payload.py --gen 202609010812
    python build_payload.py --source ../../../../releases/<id>/data/<gen>-grid-proximity.json
"""

import argparse
import glob
import hashlib
import io
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# cartridges/grid-distance-column -> cartridges -> intelligence -> tools -> repo
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
RELEASES = os.path.join(REPO, "releases")
WORKSPACE = os.path.dirname(REPO)
OUT = os.path.join(HERE, "data", "{GEN}-grid-distance.json")

# The geodesy is imported from the canonical repository, never copied into this
# one. A local copy is precisely the failure this cartridge is meant to close:
# the estate had four implementations on three Earth radii because every
# consumer carried its own. If the repo is not beside this one, that is a setup
# error and the build stops -- it does not quietly fall back.
GEODESY_SRC = os.path.join(WORKSPACE, "grid-distance-maths", "src")
if not os.path.isfile(os.path.join(GEODESY_SRC, "geodesy.py")):
    raise SystemExit(
        "canonical geodesy not found at %s\n"
        "Clone Ventusltd/grid-distance-maths beside this repository.\n"
        "This script will not fall back to a local copy of the formula; that is "
        "the defect the repository exists to prevent." % GEODESY_SRC)
sys.path.insert(0, GEODESY_SRC)

import geodesy as G  # noqa: E402

# The tolerance is DERIVED from how the source stores its numbers, not picked.
#
# The published payload rounds every distance to 3 decimal places of a kilometre
# and every coordinate -- the site AND the foot of the perpendicular -- to 6
# decimal places of a degree. Re-measuring between two rounded endpoints and
# comparing against a rounded distance cannot agree to better than the sum of
# those roundings, however identical the arithmetic is.
#
# Two earlier attempts at this constant were wrong in instructive ways. A
# millimetre tolerance failed 3,042 of 3,047 rows at a worst disagreement of
# 0.58 m -- rounding, not divergence. Counting the foot's rounding but not the
# site's still failed two rows, because both endpoints are stored rounded and
# both contribute. The bound below counts every source of rounding actually
# present in the file, and is computed from the file rather than asserted:
# `tolerance_km()` takes the widest per-coordinate error over the latitudes the
# data really spans, so it cannot silently go stale if the register moves.
#
# What the check proves is therefore the strongest claim the source supports:
# the canonical geodesy reproduces every published distance to within the
# published payload's own precision. A real divergence -- a different radius,
# the asin form, a vertex instead of a foot -- is orders of magnitude larger
# than this bound and would still fail loudly.
KM_DECIMALS = 3
COORD_DECIMALS = 6
KM_PER_DEG_LAT = 111.32


def tolerance_km(latitudes):
    """The largest disagreement rounding alone can produce, for these latitudes.

    Half a unit in the last place of the distance, plus the displacement a half
    ULP of latitude and longitude can move each of the two endpoints. Longitude
    degrees shrink with latitude, so the worst case is the lowest latitude in
    the data, not the mean.
    """
    km_rounding = 0.5 * 10 ** -KM_DECIMALS
    half = 0.5 * 10 ** -COORD_DECIMALS
    lowest = min((abs(v) for v in latitudes), default=0.0)
    kx = KM_PER_DEG_LAT * math.cos(math.radians(lowest))
    per_endpoint = math.hypot(half * kx, half * KM_PER_DEG_LAT)
    return km_rounding + 2 * per_endpoint

BANDS = (
    ("STRONG", 2.0),
    ("MODERATE", 5.0),
    ("DISTANT", 15.0),
)


def band_for(km):
    """The screening band, recomputed here from the circuit distance alone.

    The panel's band also considers substation distance; this column shows only
    a circuit distance, so it states the circuit band and nothing more. A band
    is a statement about how close the mapped network is. It is not a statement
    that a connection is obtainable, and nothing downstream may read it as one.
    """
    if km is None:
        return None
    for name, limit in BANDS:
        if km <= limit:
            return name
    return "REMOTE"


def latest_grid_proximity():
    """The newest published grid-proximity payload in releases/."""
    hits = sorted(glob.glob(os.path.join(
        RELEASES, "*-pipelinenews", "data", "*-grid-proximity.json")))
    if not hits:
        raise SystemExit("no grid-proximity payload found under %s" % RELEASES)
    return hits[-1]


def round_km(v):
    """Three decimals: a metre. The panel quotes 10 m and says why that is the
    limit -- the site coordinate is a register centroid. A metre in the payload
    keeps the column's sort stable without implying more than the panel does."""
    return None if v is None else round(v, 3)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--gen", default="{GEN}", help="12-digit generation")
    ap.add_argument("--source", help="grid-proximity payload to carry across")
    a = ap.parse_args()

    source = a.source or latest_grid_proximity()
    src = json.loads(io.open(source, encoding="utf-8").read())
    print("source   %s" % os.path.relpath(source, REPO).replace("\\", "/"))
    print("schema   %s" % src.get("schema"))
    print("rows     %d" % len(src.get("rows", [])))

    radius = src["earth_model"]["radius_km"]
    if radius != G.R_ATLAS:
        raise SystemExit(
            "source payload was built on radius %r, canonical is %r; refusing to "
            "carry numbers across a radius change" % (radius, G.R_ATLAS))

    out = {}
    stats = {"rows": 0, "with_circuit": 0, "no_circuit": 0,
             "transmission": 0, "distribution": 0, "checked": 0}
    bands = {}
    worst = {"delta": 0.0, "ref": None, "published": None, "measured": None}
    failures = []

    # Derive the tolerance from the coordinates actually in this file, before
    # checking anything against it.
    tol = tolerance_km([(r.get("at") or [None, None])[1]
                        for r in src.get("rows", [])
                        if (r.get("at") or [None, None])[1] is not None])

    for row in src.get("rows", []):
        ref = str(row.get("ref") or "").strip()
        if not ref:
            continue
        stats["rows"] += 1
        at = row.get("at") or []
        circuit = row.get("circuit") or {}
        km = circuit.get("km")

        # Re-measure against the canonical implementation. The published payload
        # stores the foot of the perpendicular, so this is an exact check of the
        # same question, not an approximation of it.
        if km is not None and len(at) == 2 and len(circuit.get("foot") or []) == 2:
            foot = circuit["foot"]
            measured = G.distance_km(at[0], at[1], foot[0], foot[1])
            delta = abs(measured - km)
            stats["checked"] += 1
            if delta > worst["delta"]:
                worst = {"delta": delta, "ref": ref,
                         "published": km, "measured": measured}
            if delta > tol:
                failures.append((ref, km, measured, delta))

        if km is None:
            stats["no_circuit"] += 1
            continue
        stats["with_circuit"] += 1

        entry = {"k": round_km(km)}
        if circuit.get("kv"):
            entry["v"] = circuit["kv"]

        transmission = (row.get("circuit_transmission") or {}).get("km")
        distribution = (row.get("circuit_distribution") or {}).get("km")
        if transmission is not None:
            entry["t"] = round_km(transmission)
            entry["tv"] = (row.get("circuit_transmission") or {}).get("kv")
            stats["transmission"] += 1
        if distribution is not None:
            entry["d"] = round_km(distribution)
            entry["dv"] = (row.get("circuit_distribution") or {}).get("kv")
            stats["distribution"] += 1

        entry["b"] = band_for(km)
        bands[entry["b"]] = bands.get(entry["b"], 0) + 1
        out[ref] = entry

    print("\nverification against Ventusltd/grid-distance-maths")
    print("  rows re-measured        %d" % stats["checked"])
    print("  worst disagreement      %.3e km  (ref %s)"
          % (worst["delta"], worst["ref"]))
    print("  rounding bound          %.3e km" % tol)
    print("                          derived from the source's own 3 dp "
          "distances and 6 dp coordinates")
    if failures:
        print("\n%d rows disagree beyond tolerance. Writing nothing." % len(failures))
        for ref, pub, meas, delta in failures[:10]:
            print("   ref %-8s published %.6f  canonical %.6f  delta %.3e"
                  % (ref, pub, meas, delta))
        return 1
    print("  RESULT                  the canonical geodesy reproduces every "
          "published distance")

    payload = {
        "schema": "pipelinenews.grid-distance.v1",
        "generation": a.gen,
        "projects": len(out),
        "network_at_runtime": False,
        "carried_from": {
            "schema": src.get("schema"),
            "generation": src.get("generation"),
            "note": "The column shows the panel's own number. It is carried "
                    "across, not recomputed, so the two can never disagree.",
        },
        "earth_model": {
            "formula": "haversine",
            "radius_km": G.R_ATLAS,
            "implementation": "Ventusltd/grid-distance-maths src/geodesy.py",
            "verified": {
                "method": "every published distance re-measured from the site "
                          "coordinate to the stored foot of the perpendicular",
                "rows": stats["checked"],
                "worst_delta_km": worst["delta"],
                "tolerance_km": tol,
                "tolerance_basis": "the source payload rounds distances to 3 dp "
                                   "of a km and feet to 6 dp of a degree; the "
                                   "tolerance is the sum of those two roundings, "
                                   "so this asserts agreement to the published "
                                   "precision and no further",
            },
        },
        "bands": {
            "purpose": "A screening band from measured geometry. It says how "
                       "close the mapped network is, not whether a connection "
                       "is obtainable.",
            "STRONG": "circuit within 2 km",
            "MODERATE": "circuit within 5 km",
            "DISTANT": "circuit within 15 km",
            "REMOTE": "nearest mapped circuit beyond 15 km",
            "counts": bands,
        },
        "beta": {
            "status": "BETA",
            "meaning": "The measurement is published and checked. What it does "
                       "not yet cover is stated below, so the number can be "
                       "used for screening with its limits known.",
            "not_covered": [
                "11 kV, except an estimated UKPN layer; most sub-5 MW "
                "distribution connections are made at a voltage this column "
                "cannot see",
                "the point of connection, which is not the site centroid the "
                "register supplies",
                "connection queue position, curtailment and contracted capacity",
            ],
        },
        "caveat": dict(G.STRAIGHT_LINE_CAVEAT),
        "provenance": src.get("provenance", {}),
        "coverage": {
            "with_circuit": stats["with_circuit"],
            "no_circuit": stats["no_circuit"],
            "note": "A project with no entry has no mapped circuit found, or no "
                    "coordinate in the register. It is shown as a dash, never "
                    "as a large number.",
        },
        "grid": out,
    }

    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"
    path = OUT.replace("{GEN}", a.gen) if a.gen != "{GEN}" else OUT
    os.makedirs(os.path.dirname(path), exist_ok=True)
    io.open(path, "w", encoding="utf-8", newline="").write(body)
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
    io.open(path + ".sha256", "w", encoding="utf-8", newline="").write(
        digest + "  " + os.path.basename(path) + "\n")

    print("\nwrote %s  (%s bytes)"
          % (os.path.basename(path), format(len(body.encode("utf-8")), ",")))
    for k in ("rows", "with_circuit", "no_circuit", "transmission", "distribution"):
        print("  %-14s %6d" % (k, stats[k]))
    for k in ("STRONG", "MODERATE", "DISTANT", "REMOTE"):
        print("  %-14s %6d" % (k.lower(), bands.get(k, 0)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
