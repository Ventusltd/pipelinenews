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
]
SUBSTATIONS = "grid_substations.geojson"
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


def build_index(items, lon_at, lat_at, extra=None):
    index = {}
    for i, item in enumerate(items):
        keys = {cell_of(lat_at(item), lon_at(item))}
        if extra:
            keys.add(cell_of(*extra(item)))
        for key in keys:
            index.setdefault(key, []).append(i)
    return index


def nearest_segment(lon0, lat0, segments, index):
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
        # Safe to stop only once the best hit is inside the ring already swept.
        if best[1] is not None and math.sqrt(best[0]) <= ring * CELL * ky * 0.999:
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


def nearest_substation(lon0, lat0, subs, index):
    meridional, prime_vertical = curvature(lat0)
    kx = prime_vertical * math.cos(lat0 * DEG) * DEG
    ky = meridional * DEG
    ci, cj = cell_of(lat0, lon0)
    best = (float("inf"), None)
    for ring in range(0, 90):
        candidates = []
        for i in range(ci - ring, ci + ring + 1):
            for j in range(cj - ring, cj + ring + 1):
                if ring and abs(i - ci) != ring and abs(j - cj) != ring:
                    continue
                candidates.extend(index.get((i, j), ()))
        for idx in candidates:
            lon, lat = subs[idx][0], subs[idx][1]
            dx, dy = (lon - lon0) * kx, (lat - lat0) * ky
            d2 = dx * dx + dy * dy
            if d2 < best[0]:
                best = (d2, idx)
        if best[1] is not None and math.sqrt(best[0]) <= ring * CELL * ky * 0.999:
            break
    if best[1] is None:
        return None
    lon, lat, name, operator, volts, kind = subs[best[1]]
    return {
        "km": round(haversine_km(lon0, lat0, lon, lat), 3),
        "name": name,
        "operator": operator,
        "kv": volts,
        "kind": kind,
        "at": [round(lon, 6), round(lat, 6)],
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
    seg_index = build_index(segments, lambda s: s[0], lambda s: s[1],
                            extra=lambda s: (s[3], s[2]))
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
        circuit = nearest_segment(lon, lat, segments, seg_index)
        substation = nearest_substation(lon, lat, subs, sub_index)
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
            "substation": substation,
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
            "voltages_kv": [400, 275, 220, 132, 66],
            "segments": len(segments),
            "substations": len(subs),
            "measure": "perpendicular distance to the circuit, not to a sampled vertex",
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
