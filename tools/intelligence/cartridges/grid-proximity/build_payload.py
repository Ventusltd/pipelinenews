"""Grid proximity payload builder.

Recomputes network proximity for the REPD spine using the ORIGINAL line
geometry rather than a decimated point sample, and emits the payload the
grid-proximity cartridge serves.

Three corrections against the project-intelligence cartridge's circuit_km:

  1. Point-to-SEGMENT, not point-to-vertex. The published figure measured to
     the nearest sampled vertex, so it could only ever equal or overstate the
     true distance to the conductor. This projects the site onto the segment.

  2. All five mapped voltages. The published figure used 400/275/132 only.
     220 kV and 66 kV are in the pinned layer set and are now included; 171
     projects (5.6%) are nearest to a 220 or 66 kV circuit, and 71 of those
     were pushed outside the 2 km band by the omission.

  3. Full geometry, not a decimated sample. circuits-sampled.tsv carried
     47,897 points; the source lines carry 163,905 vertices over 149,340
     segments.

Earth model: haversine on R = 6378.137 km, matching ventus-corev8engine.js
(GridAtlas) and atlasHaversineKm (GIS SLD sandbox), so a distance measured in
Pipeline News equals the same distance measured in the Atlas or the Sandbox.
The project-intelligence cartridge used 6371.0088, which reads 0.112% short.

Local point-to-segment work is done on a tangent plane built from the WGS84
meridional and prime-vertical radii of curvature at the site's own latitude,
then reconciled to the haversine sphere, so the segment projection does not
inherit the sphere's anisotropy at UK latitudes.

Usage:
    python build_payload.py --gg2050 <path to globalgrid2050> \
                            --spine <path to master.tsv> --out <file.json>
"""

import argparse
import hashlib
import json
import math
import os
import time

A_WGS84 = 6378.137
F_WGS84 = 1.0 / 298.257223563
E2 = F_WGS84 * (2.0 - F_WGS84)
R_ATLAS = 6378.137          # the constant GridAtlas and the Sandbox both use
DEG = math.pi / 180.0

VOLTAGE_LAYERS = [
    ("grid_400kv.geojson", 400),
    ("grid_275kv.geojson", 275),
    ("grid_220kv.geojson", 220),
    ("grid_132kv.geojson", 132),
    ("grid_66kv.geojson", 66),
    # 33 kV arrives as eleven regional files. It is distribution, not
    # transmission, and it is where most sub-50 MW solar actually connects, so
    # measuring a 30 MW scheme only against 66-400 kV overstates how far it is
    # from a usable connection.
    ("grid_33kv_East_of_England.geojson", 33),
    ("grid_33kv_London_Area.geojson", 33),
    ("grid_33kv_North_East_England.geojson", 33),
    ("grid_33kv_North_West_England.geojson", 33),
    ("grid_33kv_Scotland_North.geojson", 33),
    ("grid_33kv_Scotland_South.geojson", 33),
    ("grid_33kv_South_East_England.geojson", 33),
    ("grid_33kv_South_West_England.geojson", 33),
    ("grid_33kv_Wales_North.geojson", 33),
    ("grid_33kv_Wales_South.geojson", 33),
    ("grid_33kv_Yorkshire.geojson", 33),
]
SUBSTATIONS = "grid_substations.geojson"
# The UKPN 11 kV layer is POINTS, every one tagged "UKPN (est)" and "11kV (est)"
# at source. It is an estimate over one licence area, so it is carried in its
# own field, labelled estimated, and never merged into the confirmed set.
UKPN_11KV = "grid_11kv_ukpn.geojson"
EST_11KV_MAX_KM = 15.0   # beyond this the point is outside the licence area
VOLTAGES = [400, 275, 220, 132, 66, 33]
TRANSMISSION = [400, 275, 220, 132, 66]
CELL = 0.1                  # index cell, degrees


def curvature(lat_deg):
    """Meridional and prime-vertical radii of curvature at this latitude."""
    s = math.sin(lat_deg * DEG)
    t = 1.0 - E2 * s * s
    return A_WGS84 * (1.0 - E2) / t ** 1.5, A_WGS84 / math.sqrt(t)


def haversine_km(lon1, lat1, lon2, lat2, radius=R_ATLAS):
    """Identical in form and constant to ventus-corev8engine.js haversine()."""
    d_lat = (lat2 - lat1) * DEG
    d_lon = (lon2 - lon1) * DEG
    x = (math.sin(d_lat / 2.0) ** 2
         + math.cos(lat1 * DEG) * math.cos(lat2 * DEG) * math.sin(d_lon / 2.0) ** 2)
    return radius * 2.0 * math.atan2(math.sqrt(x), math.sqrt(1.0 - x))


def cell_of(lat, lon):
    return int(math.floor(lat / CELL)), int(math.floor(lon / CELL))


def load_segments(root):
    """Every segment of every mapped circuit, tagged with its voltage."""
    segments = []
    for filename, kv in VOLTAGE_LAYERS:
        path = os.path.join(root, filename)
        if not os.path.exists(path):
            raise SystemExit("missing voltage layer: %s" % path)
        with open(path, encoding="utf-8") as handle:
            layer = json.load(handle)
        for feature in layer.get("features", []):
            geometry = feature.get("geometry") or {}
            if geometry.get("type") != "LineString":
                continue
            props = feature.get("properties") or {}
            name = props.get("name") or props.get("ref") or ""
            operator = props.get("operator") or props.get("brand") or ""
            coords = geometry.get("coordinates") or []
            for i in range(len(coords) - 1):
                segments.append((coords[i][0], coords[i][1],
                                 coords[i + 1][0], coords[i + 1][1],
                                 kv, name, operator))
    return segments


def load_substations(root):
    path = os.path.join(root, SUBSTATIONS)
    with open(path, encoding="utf-8") as handle:
        layer = json.load(handle)
    out = []
    for feature in layer.get("features", []):
        geometry = feature.get("geometry") or {}
        if geometry.get("type") != "Point":
            continue
        props = feature.get("properties") or {}
        lon, lat = geometry["coordinates"][0], geometry["coordinates"][1]
        volts = []
        for part in str(props.get("voltage") or "").split(";"):
            part = part.strip()
            if part.isdigit():
                volts.append(int(part) // 1000)
        out.append((lon, lat, props.get("name") or "",
                    props.get("operator") or props.get("owner") or "",
                    sorted(set(volts), reverse=True),
                    props.get("substation") or ""))
    return out


def load_ukpn_11kv(root):
    """Estimated 11 kV substation points. Source tags them "(est)"; so do we."""
    path = os.path.join(root, UKPN_11KV)
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as handle:
        layer = json.load(handle)
    out = []
    for feature in layer.get("features", []):
        geometry = feature.get("geometry") or {}
        if geometry.get("type") != "Point":
            continue
        props = feature.get("properties") or {}
        out.append((geometry["coordinates"][0], geometry["coordinates"][1],
                    props.get("name") or "", props.get("operator") or "",
                    [11], props.get("type") or ""))
    return out


def build_index(items, lon_at, lat_at, extra=None):
    """Index by every cell an item's bounding box touches, not just its ends.

    Registering a segment only by its two endpoints hides it from any cell it
    merely passes through. With 0.1 degree cells (~11 km) that is rare but real:
    it left one project reporting a 400 kV circuit at 3.792 km when a 132 kV
    circuit crossed at 3.789 km.
    """
    index = {}
    for i, item in enumerate(items):
        a_lat, a_lon = lat_at(item), lon_at(item)
        b_lat, b_lon = extra(item)[::-1] if extra else (a_lat, a_lon)
        i0, i1 = sorted((int(math.floor(a_lat / CELL)), int(math.floor(b_lat / CELL))))
        j0, j1 = sorted((int(math.floor(a_lon / CELL)), int(math.floor(b_lon / CELL))))
        for ci in range(i0, i1 + 1):
            for cj in range(j0, j1 + 1):
                index.setdefault((ci, cj), []).append(i)
    return index



def swept_radius_km(lon0, lat0, ring, kx, ky):
    """Radius around (lon0, lat0) that a Chebyshev ring sweep has provably covered.

    Sweeping cells within Chebyshev distance `ring` covers an axis-aligned box of
    cells, NOT a disc centred on the query point. The query point sits somewhere
    inside its own cell, so the guaranteed radius is the distance to the nearest
    edge of that box - which can be almost a whole cell less than ring * CELL.

    Assuming otherwise is what left eight projects reporting a circuit that was
    not the nearest, worst by 10.5 km at Shetland, and fourteen with substations
    a few metres out of order.
    """
    ci = math.floor(lat0 / CELL)
    cj = math.floor(lon0 / CELL)
    lat_lo = (ci - ring) * CELL
    lat_hi = (ci + ring + 1) * CELL
    lon_lo = (cj - ring) * CELL
    lon_hi = (cj + ring + 1) * CELL
    return min((lat0 - lat_lo) * ky, (lat_hi - lat0) * ky,
               (lon0 - lon_lo) * kx, (lon_hi - lon0) * kx)


def nearest_segment(lon0, lat0, segments, index, only_kv=None):
    """Exact perpendicular distance to the nearest circuit, and where it lands.

    The projection is done on a local tangent plane so the foot of the
    perpendicular is correct; the returned distance is then measured with the
    same haversine the Atlas uses, so the number is directly comparable.
    """
    meridional, prime_vertical = curvature(lat0)
    kx = prime_vertical * math.cos(lat0 * DEG) * DEG
    ky = meridional * DEG
    ci, cj = cell_of(lat0, lon0)
    best = (float("inf"), None, None)
    for ring in range(0, 90):
        candidates = []
        for i in range(ci - ring, ci + ring + 1):
            for j in range(cj - ring, cj + ring + 1):
                if ring and abs(i - ci) != ring and abs(j - cj) != ring:
                    continue
                candidates.extend(index.get((i, j), ()))
        for idx in candidates:
            if only_kv is not None and segments[idx][4] != only_kv:
                continue
            x1, y1, x2, y2 = segments[idx][:4]
            ax, ay = (x1 - lon0) * kx, (y1 - lat0) * ky
            bx, by = (x2 - lon0) * kx, (y2 - lat0) * ky
            dx, dy = bx - ax, by - ay
            length2 = dx * dx + dy * dy
            if length2 == 0.0:
                px, py, t = ax, ay, 0.0
            else:
                t = -(ax * dx + ay * dy) / length2
                t = 0.0 if t < 0.0 else (1.0 if t > 1.0 else t)
                px, py = ax + t * dx, ay + t * dy
            d2 = px * px + py * py
            if d2 < best[0]:
                best = (d2, idx, t)
        # Safe to stop only once the best hit is inside the area provably swept.
        if best[1] is not None and math.sqrt(best[0]) <= swept_radius_km(lon0, lat0, ring, kx, ky):
            break
    if best[1] is None:
        return None
    x1, y1, x2, y2, kv, name, operator = segments[best[1]]
    t = best[2]
    foot_lon = x1 + (x2 - x1) * t
    foot_lat = y1 + (y2 - y1) * t
    return {
        "km": round(haversine_km(lon0, lat0, foot_lon, foot_lat), 3),
        "kv": kv,
        "line": name,
        "operator": operator,
        "foot": [round(foot_lon, 6), round(foot_lat, 6)],
    }


def nearest_substations(lon0, lat0, subs, index, want=5):
    meridional, prime_vertical = curvature(lat0)
    kx = prime_vertical * math.cos(lat0 * DEG) * DEG
    ky = meridional * DEG
    ci, cj = cell_of(lat0, lon0)
    found = {}
    for ring in range(0, 90):
        for i in range(ci - ring, ci + ring + 1):
            for j in range(cj - ring, cj + ring + 1):
                if ring and abs(i - ci) != ring and abs(j - cj) != ring:
                    continue
                for idx in index.get((i, j), ()):
                    if idx in found:
                        continue
                    lon, lat = subs[idx][0], subs[idx][1]
                    dx, dy = (lon - lon0) * kx, (lat - lat0) * ky
                    found[idx] = math.sqrt(dx * dx + dy * dy)
        # Keep sweeping until `want` candidates are all provably inside the
        # area already covered, not merely until `want` have been seen.
        if len(found) >= want:
            kth = sorted(found.values())[want - 1]
            if kth <= swept_radius_km(lon0, lat0, ring, kx, ky):
                break
    if not found:
        return []
    # Rank on the metric that is REPORTED, not the one used to search. The plane
    # metric and the haversine differ by ~0.1%, which was enough to emit pairs a
    # few metres out of order when the search ranked on one and printed the other.
    ranked = sorted(found, key=lambda i: haversine_km(lon0, lat0, subs[i][0], subs[i][1]))[:want]
    out = []
    for idx in ranked:
        lon, lat, name, operator, volts, kind = subs[idx]
        out.append({
            "km": round(haversine_km(lon0, lat0, lon, lat), 3),
            "name": name,
            "operator": operator,
            "kv": volts,
            "kind": kind,
            "at": [round(lon, 6), round(lat, 6)],
        })
    return out



# --- grid probable ----------------------------------------------------------
# A screening band, from measured geometry only. It says how close the mapped
# network is, not whether a connection is obtainable.
#
# Deliberately NOT in this model, because the sources have not been cited yet:
#   - capacity-to-voltage suitability (needs ENA / DNO published practice)
#   - connection queue position, curtailment, or headroom
#   - 33 kV and 11 kV distribution, which is where most sub-50 MW schemes land
#   - DNO licence area, ownership, or IDNO presence
# Adding a capacity rule from memory would be a guess. It waits for sources.
GRID_PROBABLE_BANDS = [
    ("STRONG",   2.0,  1.0),
    ("MODERATE", 5.0,  3.0),
    ("DISTANT", 15.0, 10.0),
]


def grid_probable(circuit, substation):
    """Band a site by how close the mapped network is. Inputs are shown, always."""
    if not circuit or not substation:
        return {"band": "UNKNOWN", "why": "no mapped circuit or substation in range"}
    c = circuit["km"]
    s = substation["km"]
    for band, circuit_max, sub_max in GRID_PROBABLE_BANDS:
        if c <= circuit_max and s <= sub_max:
            break
    else:
        band = "REMOTE"
    return {
        "band": band,
        "circuit_km": c,
        "circuit_kv": circuit["kv"],
        "substation_km": s,
        "why": ("nearest circuit %.2f km at %d kV, nearest substation %.2f km"
                % (c, circuit["kv"], s)),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--gg2050", required=True, help="globalgrid2050 checkout")
    parser.add_argument("--spine", required=True, help="master.tsv")
    parser.add_argument("--out", required=True)
    parser.add_argument("--generation", required=True)
    args = parser.parse_args()

    started = time.time()
    segments = load_segments(args.gg2050)
    subs = load_substations(args.gg2050)
    ukpn = load_ukpn_11kv(args.gg2050)
    ukpn_index = build_index(ukpn, lambda s: s[0], lambda s: s[1]) if ukpn else {}
    seg_index = build_index(segments, lambda s: s[0], lambda s: s[1],
                            extra=lambda s: (s[2], s[3]))   # (lon, lat) of the far end
    sub_index = build_index(subs, lambda s: s[0], lambda s: s[1])
    print("segments %d | substations %d | cells %d/%d"
          % (len(segments), len(subs), len(seg_index), len(sub_index)))

    rows = []
    with open(args.spine, encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            rows.append(line.rstrip("\n").split("\t"))

    out_rows = []
    for row in rows:
        try:
            lon, lat = float(row[10]), float(row[11])
        except (ValueError, IndexError):
            continue
        # One search per voltage, and the overall nearest is the best of those.
        # Running a separate unfiltered search alongside them let the two
        # disagree: a sparser filtered sweep reaches further and can find a
        # circuit the unfiltered sweep stopped short of. Deriving the overall
        # answer from the per-voltage set makes disagreement impossible.
        by_voltage = {}
        per_voltage_full = {}
        for kv in VOLTAGES:
            hit = nearest_segment(lon, lat, segments, seg_index, only_kv=kv)
            if hit:
                by_voltage[str(kv)] = {"km": hit["km"], "foot": hit["foot"]}
                per_voltage_full[kv] = hit
        circuit = min(per_voltage_full.values(), key=lambda h: h["km"]) if per_voltage_full else None
        # West Burton and Cottam connect at 400 and 132 kV because of their size,
        # with 33 kV four to eight kilometres away. Reporting only "nearest" would
        # answer the wrong question for them. Both are published; which one
        # matters is the reader's judgement, not an assumption coded in here.
        tr = [h for kv, h in per_voltage_full.items() if kv in TRANSMISSION]
        di = [h for kv, h in per_voltage_full.items() if kv not in TRANSMISSION]
        transmission = min(tr, key=lambda h: h["km"]) if tr else None
        distribution = min(di, key=lambda h: h["km"]) if di else None
        nearby = nearest_substations(lon, lat, subs, sub_index, want=5)
        substation = nearby[0] if nearby else None
        # Outside the UKPN licence area the nearest "11 kV" point is hundreds of
        # kilometres away and means nothing. Report null, never a large number:
        # a coverage hole wearing a number is the defect this whole model exists
        # to avoid.
        est11 = (nearest_substations(lon, lat, ukpn, ukpn_index, want=1) or [None])[0] if ukpn else None
        if est11 and est11["km"] > EST_11KV_MAX_KM:
            est11 = None
        published = None
        try:
            published = float(row[21])
        except (ValueError, IndexError):
            pass
        out_rows.append({
            "ref": row[0],
            "name": row[4],
            "operator": row[5],
            "town": row[6],
            "county": row[7],
            "region": row[8],
            "country": row[9],
            "at": [round(lon, 6), round(lat, 6)],
            "mw": _num(row[1]),        # column 1 is capacity MW: median 25, max 1450
            "tech": row[2],
            "status": row[3],
            "circuit": circuit,
            "circuit_transmission": transmission,
            "circuit_distribution": distribution,
            "circuit_by_kv": by_voltage,
            "grid_probable": grid_probable(circuit, nearby[0] if nearby else None),
            "substation": substation,
            "substations_nearby": nearby[1:],
            "substation_11kv_estimated": est11,
            "published_circuit_km": published,
        })

    payload = {
        "schema": "pipelinenews.v9.grid-proximity.v1",
        "generation": args.generation,
        "record_count": len(out_rows),
        "earth_model": {
            "formula": "haversine",
            "radius_km": R_ATLAS,
            "radius_source": "WGS84 semi-major axis; the constant used by "
                             "ventus-corev8engine.js and atlasHaversineKm",
            "segment_projection": "local tangent plane from WGS84 M and N at "
                                  "the site latitude",
            "matches": ["gridatlas ventus-corev8engine.js",
                        "gis-sld-financial-sandbox atlasHaversineKm"],
            "differs_from": {
                "project_intelligence_circuit_km": 6371.0088,
                "reads_short_by_pct": 0.1119,
            },
        },
        "network": {
            "voltages_kv": VOLTAGES,
            "transmission_kv": TRANSMISSION,
            "distribution_kv": [33],
            "segments": len(segments),
            "substations": len(subs),
            "measure": "perpendicular distance to the circuit, not to a sampled vertex",
            "estimated_11kv_points": len(ukpn),
            "estimated_11kv_max_km": EST_11KV_MAX_KM,
            "estimated_11kv_note": "UKPN licence area only, tagged (est) at source. "
                                   "Absence elsewhere means the layer does not cover it, "
                                   "not that no 11 kV network exists.",
        },
        "grid_probable_rule": {
            "purpose": "A screening band from measured geometry. It says how close "
                       "the mapped network is, not whether a connection is obtainable.",
            "bands": [
                {"band": "STRONG", "circuit_km_max": 2.0, "substation_km_max": 1.0},
                {"band": "MODERATE", "circuit_km_max": 5.0, "substation_km_max": 3.0},
                {"band": "DISTANT", "circuit_km_max": 15.0, "substation_km_max": 10.0},
                {"band": "REMOTE", "circuit_km_max": None, "substation_km_max": None},
            ],
            "not_modelled": [
                "capacity-to-voltage suitability (awaiting ENA and DNO published practice)",
                "connection queue position, curtailment or headroom",
                "33 kV and 11 kV distribution, where most sub-50 MW schemes connect",
                "DNO licence area, ownership or IDNO presence",
            ],
            "honesty": "Every input to the band is published beside it. Nothing here "
                       "is inferred from capacity, and no assumption about connection "
                       "voltage has been made without a cited source.",
        },
        "caveat": {
            "straight_line": "Straight-line distance to mapped geometry. Not a "
                             "cable route, not a connection length, and no "
                             "wayleave, crossing, terrain or consent content.",
            "substation": "A mapped substation point does not confirm capacity, "
                          "voltage suitability, connection rights, queue position "
                          "or acceptance by any network party.",
            "coverage": "OpenStreetMap-derived. Absence from the layer is not "
                        "absence on the ground.",
            "voltage_is_not_connection": "The nearest circuit is not the connection "
                         "voltage. Large schemes connect at transmission whatever runs "
                         "past the gate - West Burton and Cottam sit 4 to 8 km from 33 kV "
                         "and connect at 400 and 132 kV. Transmission and distribution "
                         "distances are published separately for that reason; no "
                         "capacity-to-voltage rule is applied without a cited source.",
            "precision": "Quoted to 10 m because the geometry supports it; the "
                         "site coordinate is a register centroid and may sit "
                         "hundreds of metres from the point of connection.",
        },
        "provenance": {
            "spine": "DESNZ Renewable Energy Planning Database Q2 2026, OGL v3.0",
            "network": "OpenStreetMap via the pinned Ventus voltage layers, "
                       "ODbL-1.0, (c) OpenStreetMap contributors",
        },
        "rows": out_rows,
    }

    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    with open(args.out, "w", encoding="utf-8") as handle:
        handle.write(body)
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
    with open(args.out + ".sha256", "w", encoding="utf-8") as handle:
        handle.write(digest + "\n")
    print("wrote %s (%d rows, %.1f MB) in %.1fs\nsha256 %s"
          % (args.out, len(out_rows), len(body) / 1e6, time.time() - started, digest))


def _num(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


if __name__ == "__main__":
    main()
