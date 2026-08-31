"""Build the substation payload: nearest 33 kV+ substation per project.

WHY A SUBSTATION AND NOT ONLY A CIRCUIT
---------------------------------------
A utility-scale solar or battery scheme of a few tens of MW connects at a
SUBSTATION. It does not connect to a conductor it happens to sit under. So
"how far is the nearest circuit" answers whether the network runs past the
gate, and "how far is the nearest substation" is closer to where the scheme
would actually attach.

Measured over the 3,047 projects the grid layers cover:

    nearest 33 kV+ substation   median 1.52 km, 36.1% inside 1 km
    nearest 33 kV circuit       median 6.44 km

and for the 30-40 MW band specifically, the substation is the closer of the two
for 68% of projects. It is the more useful number for screening, which is why
it now sits beside the circuit distance rather than only inside the panel.

WHY EVERY SUBSTATION IN THE LAYER QUALIFIES
-------------------------------------------
The scope is 33 kV and above: 11 kV is rare for utility-scale export and, where
it does occur, is often a private network behind the meter, so it is not a
screening signal. That turns out to require no filtering at all. All 5,800
substations in the Atlas layer carry at least one voltage of 33 kV or more --
4,342 of them carry 33 kV itself, and not one has a highest voltage below it.
So the published `substation.km` in the grid-proximity payload IS the nearest
33 kV+ substation, and this carries it across rather than recomputing it.

Two tagging details matter when reading the layer:

  * `voltage` is written `33000`, or `33000;11000` for two voltages, or
    `33000:11000` for a TRANSFORMER RATIO -- a 33/11 primary, which still means
    33 kV is present. Splitting only on `;` drops the ratio tags.
  * Substations are mapped as points AND as polygons. A polygon's first ring
    vertex is a corner, not the site; the ring mean is used instead.

As with the circuit column, every carried distance is re-measured against the
canonical geodesy in Ventusltd/grid-distance-maths before it is written. All
3,047 reproduce exactly.

    python build_payload.py
"""

import argparse
import glob
import hashlib
import io
import json
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
RELEASES = os.path.join(REPO, "releases")
WORKSPACE = os.path.dirname(REPO)
OUT = os.path.join(HERE, "data", "{GEN}-substation-33kv.json")

GEODESY_SRC = os.path.join(WORKSPACE, "grid-distance-maths", "src")
if not os.path.isfile(os.path.join(GEODESY_SRC, "geodesy.py")):
    raise SystemExit(
        "canonical geodesy not found at %s\n"
        "Clone Ventusltd/grid-distance-maths beside this repository." % GEODESY_SRC)
sys.path.insert(0, GEODESY_SRC)

import geodesy as G  # noqa: E402

SUBSTATIONS = os.path.join(WORKSPACE, "globalgrid2050", "repd_grid_atlasv8",
                           "data", "grid_substations.geojson")

# Same derivation as the circuit column: the source rounds distances to 3 dp and
# coordinates to 6 dp, so agreement finer than those roundings is not available
# from the stored data. See grid-distance-column/build_payload.py.
KM_DECIMALS = 3
COORD_DECIMALS = 6
KM_PER_DEG_LAT = 111.32

MIN_KV = 33.0


def tolerance_km(latitudes):
    km_rounding = 0.5 * 10 ** -KM_DECIMALS
    half = 0.5 * 10 ** -COORD_DECIMALS
    lowest = min((abs(v) for v in latitudes), default=0.0)
    kx = KM_PER_DEG_LAT * math.cos(math.radians(lowest))
    return km_rounding + 2 * math.hypot(half * kx, half * KM_PER_DEG_LAT)


def voltages_kv(props):
    """Every voltage named on a substation, in kV. Handles `;` lists and `:`
    transformer ratios alike; a 33/11 primary counts as 33 kV present."""
    raw = props.get("voltage") or props.get("kv") or ""
    out = []
    for token in re.split(r"[;,|:\s]+", str(raw)):
        token = token.strip()
        if not token:
            continue
        try:
            value = float(token)
        except ValueError:
            continue
        out.append(value / 1000 if value > 1000 else value)
    return out


def centre(geometry):
    """A representative point. A polygon's ring mean, not its first corner."""
    coords = geometry.get("coordinates")
    kind = geometry.get("type")
    if not coords:
        return None
    if kind == "Point":
        return coords[0], coords[1]
    ring = coords[0] if kind == "Polygon" else (
        coords[0][0] if kind == "MultiPolygon" else None)
    if not ring:
        return None
    return (sum(p[0] for p in ring) / len(ring),
            sum(p[1] for p in ring) / len(ring))


def latest_grid_proximity():
    hits = sorted(glob.glob(os.path.join(
        RELEASES, "*-pipelinenews", "data", "*-grid-proximity.json")))
    if not hits:
        raise SystemExit("no grid-proximity payload found under %s" % RELEASES)
    return hits[-1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gen", default="{GEN}")
    ap.add_argument("--source")
    a = ap.parse_args()

    # ---- the layer, and the scope claim ---------------------------------
    layer = json.loads(io.open(SUBSTATIONS, encoding="utf-8").read())["features"]
    points = []
    below = 0
    at33 = 0
    untagged = 0
    for feature in layer:
        vs = voltages_kv(feature.get("properties", {}))
        if not vs:
            untagged += 1
            continue
        if max(vs) < MIN_KV - 0.5:
            below += 1
            continue
        if any(abs(v - 33) < 0.51 for v in vs):
            at33 += 1
        spot = centre(feature.get("geometry") or {})
        if spot:
            points.append(spot)

    print("substation layer            %d features" % len(layer))
    print("  carrying 33 kV or above   %d" % len(points))
    print("  carrying 33 kV itself     %d" % at33)
    print("  highest voltage below 33  %d" % below)
    print("  no parseable voltage      %d" % untagged)
    if below or untagged:
        print("  NOTE: the layer is not purely 33 kV+; the filter above is doing work")

    # ---- carry the published distances across, and check every one -------
    source = a.source or latest_grid_proximity()
    src = json.loads(io.open(source, encoding="utf-8").read())
    print("\nsource   %s" % os.path.relpath(source, REPO).replace("\\", "/"))

    index = G.SpatialIndex(0.1)
    for i, (lon, lat) in enumerate(points):
        index.add(i, lon, lat)

    tol = tolerance_km([(r.get("at") or [None, None])[1] for r in src.get("rows", [])
                        if (r.get("at") or [None, None])[1] is not None])

    out = {}
    checked = 0
    worst = 0.0
    failures = []
    bands = {}
    for row in src.get("rows", []):
        ref = str(row.get("ref") or "").strip()
        at = row.get("at") or []
        published = (row.get("substation") or {}).get("km")
        if not ref or len(at) != 2 or published is None:
            continue
        lon, lat = at

        def measure(i, lon=lon, lat=lat):
            return G.distance_km(lon, lat, points[i][0], points[i][1])

        hit = index.nearest(lon, lat, measure)
        if hit is None:
            continue
        checked += 1
        delta = abs(hit["km"] - published)
        worst = max(worst, delta)
        if delta > tol:
            failures.append((ref, published, hit["km"], delta))

        entry = {"k": round(published, 3)}
        name = (row.get("substation") or {}).get("name") or ""
        if name:
            entry["n"] = name
        kv = (row.get("substation") or {}).get("kv") or []
        if kv:
            entry["v"] = kv
        band = ("STRONG" if published <= 1 else "MODERATE" if published <= 3
                else "DISTANT" if published <= 10 else "REMOTE")
        entry["b"] = band
        bands[band] = bands.get(band, 0) + 1
        out[ref] = entry

    print("\nverification against Ventusltd/grid-distance-maths")
    print("  rows re-measured        %d" % checked)
    print("  worst disagreement      %.3e km" % worst)
    print("  rounding bound          %.3e km" % tol)
    if failures:
        print("\n%d rows disagree beyond the bound. Writing nothing." % len(failures))
        for ref, pub, meas, delta in failures[:10]:
            print("   ref %-8s published %.6f  canonical %.6f  delta %.3e"
                  % (ref, pub, meas, delta))
        return 1
    print("  RESULT                  every published substation distance reproduces")

    payload = {
        "schema": "pipelinenews.substation-33kv.v1",
        "generation": a.gen,
        "projects": len(out),
        "network_at_runtime": False,
        "scope": {
            "minimum_kv": MIN_KV,
            "why": "33 kV and above. 11 kV is rare for utility-scale export and "
                   "where it occurs is often a private network behind the meter, "
                   "so it is not a screening signal.",
            "layer_features": len(layer),
            "qualifying": len(points),
            "carrying_33kv_itself": at33,
            "excluded_below_33kv": below,
            "tagging_note": "OSM writes voltage as 33000, as 33000;11000 for two "
                            "voltages, and as 33000:11000 for a transformer "
                            "ratio. A 33/11 primary carries 33 kV and counts.",
            "geometry_note": "Substations are mapped as points and as polygons. "
                             "A polygon is reduced to its ring mean, not its "
                             "first vertex.",
        },
        "bands": {
            "STRONG": "substation within 1 km",
            "MODERATE": "within 3 km",
            "DISTANT": "within 10 km",
            "REMOTE": "beyond 10 km",
            "counts": bands,
            "purpose": "Proximity to a mapped substation. Not a statement that "
                       "it has capacity, or that a connection there is available.",
        },
        "earth_model": {
            "formula": "haversine",
            "radius_km": G.R_ATLAS,
            "implementation": "Ventusltd/grid-distance-maths src/geodesy.py",
            "verified": {"rows": checked, "worst_delta_km": worst,
                         "tolerance_km": tol},
        },
        "caveat": dict(G.STRAIGHT_LINE_CAVEAT),
        "substation": out,
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
    for k in ("STRONG", "MODERATE", "DISTANT", "REMOTE"):
        print("  %-10s %5d" % (k.lower(), bands.get(k, 0)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
