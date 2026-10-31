# W05 gridatlas-data-planes
HEADS: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e (shallow: `git rev-parse --is-shallow-repository` = true; `git rev-list --count HEAD` = 311; oldest visible commit f3ba7a31b5bbac2a0af7171ddb2402cf6f3b624c 2026-09-01T14:43:56+01:00; HEAD 2026-10-29T23:41:04+00:00; matches proof/inventory.tsv line 12) · globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f (repd.csv only, read with Python `csv`, for one control count)
READ:
README.md
atlas/coordinate-systems.json
compiler/202608290716-compile-atlas-v9.py
compiler/202608291430-compile-atlas-v9-live.py (grep + lines 28-140, 195-250)
compiler/202608292126-build-map-ready-v9.py (lines 94-200, 230-400)
compiler/202608300453-build-exact-repd-deep-link-successor.py (lines 1-120)
compiler/202608291237-*, 202608291239-*, 202608292311-* (grep only)
contracts/atlas-v9-deep-link-contract.v1.json
contracts/202608290716-atlas-v9-source.json
contracts/202608291430-atlas-v9-live-release.json (lines 15-56, 125-145)
contracts/202608292126-map-ready-runtime.json (lines 20-35, 125-160)
contracts/202608291237-*, 202608291239-*, 202608292311-* (grep only)
tools/offshore/reconcile_offshore_coordinates.py (lines 1-60, 336-759; bind tables 130-330 by grep)
tools/offshore/fetch_neso_connection_sites.py (lines 1-60, 100-260)
tools/interconnectors/fetch_far_end_converters.py (lines 1-100, 250-300; grep rest)
tools/interconnectors/interconnector-module.js (not read beyond listing: UNVERIFIED content)
tools/v9_5/compiler.py (lines 1-40, 230-276)
tools/v9_5/build_streaming_bridge.py (lines 1-140; grep rest)
tools/v9_5/release_stream_payload_cache.py (lines 1-60)
tools/v9_5/build_v9_5.py (listing only: UNVERIFIED content)
atlas/data/interconnector-endpoints.json, atlas/data/interconnectors.geojson, atlas/data/neso-connection-sites.json (head + jq), atlas/data/neso-connection-sites.lean.json (jq), atlas/data/repd-coordinate-corrections.json, atlas/data/offshore-landfall.json, atlas/data/offshore-coordinates.json
data/repd_browser_registry_202608290716.json (jq), data/repd_v9_manifest_202608290716.json (jq), data/repd_projects_202608290716.parquet (sha256sum only)
atlas/current.json (transport block, cartridge_order)
atlas/cartridges/202609071213-place-global-search-v9-5.js (lines 200-215), atlas/cartridges/202608301136-place-postcode-search.js (lines 5-14), atlas/cartridges/202610290045-sld-sandbox-v9-8.js (lines 6428-6446, 1890-1935), atlas/cartridges/202609241334-sld-sandbox-v9-8.js (lines 1950-1970, 2255-2266)
202608310050-gridatlas-next-version-builders/inputs/202608310015-attached-sample-findings.md (lines 25-40), .../tools/202608310050-build-readiness.mjs (lines 75-95)
.github/workflows/offshore-coordinate-reconcile.yml (lines 19-20, 78-125)
machine-learning/ (file listing, one record, one schema head)
local-arrival-grid.mjs (lines 1-60 + grep), webkit-arrival-probe.mjs, webkit-register-probe.mjs
git log / git show for db5338b, 2e5879f, 98dd908, 5c41ec4, ccf675d, bb9d84f, 0eab5c2, c5b474e, c9f7a82, f3ba7a3, 64268fd, cf429bc

Written 2026-10-31T19:14:50Z by W05. Read only: no checkout, fetch or edit in any clone. Executions were made from
/tmp/w05 (outside the clones): pure-function imports of `osgb36_en_to_wgs84` (reconcile tool) and `normalise`
(NESO tool) via `importlib` with `python3 -I`, plus jq counts. Path note: the task named `data/interconnector-endpoints.json`
and siblings; at this HEAD they live under `atlas/data/` (`git ls-files | grep -F interconnector-endpoints` returns
`atlas/data/interconnector-endpoints.json`). Every quote below was pulled from the clone by line number by a script, not retyped.

## Counts (each with its command, run 2026-10-31T19:00Z-19:15Z from the gridatlas clone)

| what | value | command |
| --- | --- | --- |
| browser registry rows | 11,069 | `jq '.records\|length' data/repd_browser_registry_202608290716.json` |
| registry rows sitting on the false origin | 36 (wind_offshore 15, solar 5, wind_onshore 5, bess 4, solar_roof 3, tidal 2, hydro 1, hydrogen 1) | `jq '[.records[]\|select(.longitude==-7.55716 and .latitude==49.766807)]\|length' data/repd_browser_registry_202608290716.json` |
| V8 oracle parity achieved | 10,610 of 10,784 = 0.983865 | `jq .v8_oracle data/repd_v9_manifest_202608290716.json` |
| applicants withheld as possible individuals | 1,729 | `jq .privacy data/repd_v9_manifest_202608290716.json` |
| Parquet search plane digest | 174040c3...4866b (equals `PARQUET_SHA256` pinned in atlas/cartridges/202608301136-place-postcode-search.js:5) | `sha256sum data/repd_projects_202608290716.parquet` |
| NESO connection-site records / unmatched / conflicts | 769 / 10,300 / 2 | `jq '.counts, (.records\|length), (.unmatched\|length)' atlas/data/neso-connection-sites.json` |
| NESO match methods | NORMALISED_NAME 454 (HIGH), NORMALISED_PREFIX 294 (MEDIUM), MANUAL_ALIAS 19 (15 HIGH, 4 MEDIUM), REGISTERS_DISAGREE 2 | `jq -c '[.records[]\|{m:.match_method,c:.match_confidence}]\|group_by(.)\|map({k:(.[0]\|tostring),n:length})' atlas/data/neso-connection-sites.json` |
| NESO records by REPD technology | wind_onshore 413, bess 130, solar 80, wind_offshore 78, biomass 36, hydro 26, act 2, solar_roof 2, hydrogen 1, tidal 1 | `jq '[.records[].technology]\|group_by(.)\|map({(.[0]\|tostring):length})\|add' atlas/data/neso-connection-sites.json` |
| NESO lean sites (what the live SLD cartridge loads) | 767 | `jq '.sites\|length' atlas/data/neso-connection-sites.lean.json` |
| interconnector links / GB ends / far ends / drawable | 10 / 10 / 2 / 2 (ElecLink 59.93 km, BritNed 234.9 km) | `jq '.links,.gb_ends_found,.far_ends_found,.drawable' atlas/data/interconnector-endpoints.json` |
| interconnectors.geojson features | 4 (2 LineString + 2 Point midpoints), `crs` declared EPSG:4326 | `jq -c '.crs,[.features[].geometry.type]' atlas/data/interconnectors.geojson` |
| REPD placeholder corrections | 4 records, 2 unresolved, status PARTIAL | `jq '.records\|length, (.unresolved\|length), .status' atlas/data/repd-coordinate-corrections.json` |
| offshore landfall records | 8 ("8 of 97 offshore wind rows"), status PARTIAL | `jq '.records\|length,.coverage' atlas/data/offshore-landfall.json` |
| offshore-coordinates.json (committed output) | 8 coordinates, 6 recovered, 2 NO_LEASE_MATCH | `jq '.recovered,.still_unmatched,(.coordinates\|length)' atlas/data/offshore-coordinates.json` |
| `replace_once`-style "exactly one anchor" guards in compiler/ + tools/v9_5 | 9 guard sites in 6 files | `grep -rn -E "count\((old\|before\|anchor\|marker)[^)]*\) ?(!=\|==) ?1\|count != 1" compiler tools/v9_5` |
| control: globalgrid2050/repd.csv (not the pinned V9 input) | 13,995 rows, 25 blank coordinate cells, 0 zero, 0 non-numeric | Python `csv.DictReader` count from /tmp (see F5) |
| machine-learning/ files | 13 (3 records .jsonl of 2 lines each, 2 schemas, 8 proofs) | `find machine-learning -type f \| wc -l` |

## Findings (keyed)

### F1 The Western Approaches "placeholder" is the National Grid false origin, and the V9 compiler manufactures it
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e compiler/202608290716-compile-atlas-v9.py:102-108
QUOTE:
```python
            try:
                x = float(row.get("X-coordinate") or 0)
                y = float(row.get("Y-coordinate") or 0)
                lon, lat = transformer.transform(x, y)
            except Exception:
                continue
            if not (math.isfinite(lon) and math.isfinite(lat) and -9 < lon < 2.5 and 49 < lat < 61):
```
WHY: `float(row.get("X-coordinate") or 0)` turns a blank REPD cell into easting 0 / northing 0, and the EPSG:27700
grid's (0, 0) is the SW false origin of the British National Grid. Running the estate's own converter from /tmp,
`osgb36_en_to_wgs84(0.0, 0.0)` (tools/offshore/reconcile_offshore_coordinates.py:388) returns `(-7.55716, 49.766799)`,
within 1 m of the placeholder `(-7.55716, 49.766807)` that 36 registry rows carry (count above). The GB bounds window on
line 108 (`-9 < lon < 2.5 and 49 < lat < 61`) admits it, so the guard that should refuse it passes it. The whole
estate downstream spends code rejecting this point (76 tracked files contain `49.766807`: `grep -rln "49.766807" . | wc -l`);
the root cause is one `or 0`. The fix is `None` on blank, not 0, before the transform. The later cartridges name it
correctly as `FALSE_ORIGIN` (atlas/cartridges/202608301136-place-postcode-search.js:10); the reconcile tool's docstring
(line 4-7) still calls it "a single shared placeholder point".
PATTERN: coercion-to-zero creates a fake place; a blank must stay blank (null, not 0) through a CRS transform.

### F2 The live release rejects both zeros: literal (0,0) and transformed false origin
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e compiler/202608291430-compile-atlas-v9-live.py:126-133
QUOTE:
```python
    select_replacement = '''function hasMappableGeometry(record) {
  return typeof record?.latitude === "number" && typeof record?.longitude === "number"
    && Number.isFinite(record.latitude) && Number.isFinite(record.longitude)
    && record.latitude >= -90 && record.latitude <= 90
    && record.longitude >= -180 && record.longitude <= 180
    && !(record.latitude === 0 && record.longitude === 0)
    && !(record.latitude === 49.766807 && record.longitude === -7.55716);
}
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e contracts/202608291430-atlas-v9-live-release.json:136-141
QUOTE:
```json
    "routing_identity_is_exact_repd_ref": true,
    "null_coordinates_never_coerced": true,
    "literal_zero_origin_rejected": true,
    "transformed_false_origin_rejected": true,
    "no_map_is_nonselectable": true,
    "proximity_establishes_identity": false,
```
WHY: Two distinct zeros are named and refused: Null Island in degrees, and the OSGB origin after transform. Records
failing `hasMappableGeometry` are made non-selectable ("has NO MAP geometry and is not selectable", line 137) rather than
dropped, and the contract pins the closure: `selectable_rows` 11,033 + `excluded_false_origin_rows` 36 = 11,069
(contract lines 46-48). Exact float equality is safe here because the registry stores 6-dp rounded values (compiler
202608290716 line 139-140).
PATTERN: name every sentinel coordinate and make its rows visible-but-unselectable; pin the excluded count in the contract.

### F3 Point-on-surface, not centroid: a lease reduces to a point guaranteed inside it
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offshore/reconcile_offshore_coordinates.py:342-347
QUOTE:
```python
def point_on_surface(geometry: dict) -> tuple[float, float] | None:
    """A point guaranteed to lie inside the polygon, unlike a centroid.

    Ray-cast across the largest ring at its median latitude and take the midpoint
    of the widest interior span.
    """
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/coordinate-systems.json:46
QUOTE:
```json
   "caveat": "Lease areas, not points. A representative point must be taken with point-on-surface, never a centroid: a centroid of a concave or multipart lease can fall outside the lease itself, and an arrival must land on the site it names."
```
WHY: The method is explicit and short: take the largest ring by shoelace area, cast a horizontal ray at the median
vertex latitude, and return the midpoint of the widest interior span (lines 358-386). That point is inside the ring by
construction, which a centroid of a concave or multipart lease is not. The output records the method by name
(`"method": "CROWN_ESTATE_LEASE_POINT_ON_SURFACE"`, line 583). Limit (see Candidates): holes are not excluded.
PATTERN: representative point by interior construction, method recorded with the output.

### F4 "Parse with a real CSV reader": the parser was wrong, not the register, and the catalogue keeps the correction
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e README.md:48-51
QUOTE:
```markdown
Parse that file with a real CSV reader. Site names contain commas inside quoted
fields, so `split(',')` shifts every later column and makes the coordinate
columns appear to hold region names like `England`. This README asserted exactly
that artefact in its first commit, and the figures above replace it.
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/coordinate-systems.json:182-187
QUOTE:
```json
  {
   "utc": "2026-09-07T03:25:00Z",
   "what": "First published figures for REPD coordinate health were wrong.",
   "wrong": "15,170 rows, 13,180 unmappable (87%), 55 of 98 offshore unmappable, literal 'Offshore'/'Scotland' in coordinate cells.",
   "right": "13,995 rows, 25 unmappable (0.2%), 8 of 101 offshore unmappable, no non-numeric value in any coordinate cell.",
   "cause": "split(',') on a CSV whose quoted Site Name fields contain commas. The column shift, not the register, produced the region names."
```
WHY: A published claim (87 per cent unmappable, literal 'Offshore' in coordinate cells) was withdrawn 3 min 14 s after it
was made (2e5879fc56e529d8c7fea4ebb7ba84172b227f25 at 2026-09-07T04:20:12+01:00 then db5338bf9613148c0f8bc26f619f0602ad75b45b
at 2026-09-07T04:23:26+01:00, subject "Correct the REPD coordinate figures: the register was fine, my parser was not").
The correction is stored as data (wrong / right / cause) inside the catalogue, so the next reader inherits the reason.
The V9 compiler already used `csv.DictReader` with `encoding="cp1252", newline=""` (compiler/202608290716-compile-atlas-v9.py:90-91),
so the artefact was confined to the catalogue drafting. Control count on globalgrid2050@c66759f repd.csv with a
quote-aware reader: 13,995 rows, 25 blank coordinate cells, 0 non-numeric, which agrees with the "right" line.
PATTERN: corrections recorded as structured data next to the figure they replace.

### F5 The retracted artefact survives in the catalogue's own rules
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/coordinate-systems.json:176
QUOTE:
```json
  "Treat a REPD coordinate cell as text until it parses as a finite number. 'Offshore' and 'DD4 0AD' both appear in that column.",
```
WHY: Line 186 says "no non-numeric value in any coordinate cell"; line 176, in the `rules` array of the same file, still
asserts that 'Offshore' and 'DD4 0AD' appear in that column. `git show db5338b -- atlas/coordinate-systems.json` shows the
caveat text was replaced but this rule was not touched. The advice (treat a cell as text until it parses as a finite
number) is still sound; the evidence clause is the withdrawn one. A one-line fix for the edition to flag.
PATTERN: a correction must sweep every restatement of the wrong fact, not just the headline.

### F6 EPSG:27700 to EPSG:4326, twice: pinned pyproj in the compiler, hand-written Helmert in the tool, both declared
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e compiler/202608290716-compile-atlas-v9.py:87
QUOTE:
```python
    transformer = Transformer.from_crs("EPSG:27700", "EPSG:4326", always_xy=True)
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offshore/reconcile_offshore_coordinates.py:389-398
QUOTE:
```python
    """OSGB36 National Grid eastings/northings to WGS84 longitude/latitude.

    Inverse Transverse Mercator on the Airy 1830 ellipsoid, then the standard
    7-parameter Helmert shift OSGB36 -> WGS84. This is the Ordnance Survey
    "approximate" transformation and is good to about 5 m; OSTN15, which is the
    rigorous one, is a gridded correction and is deliberately not applied here.
    Any coordinate produced by this function must say so in its method field.

    Kept in the tool rather than in a notebook so that a grid reference quoted
    in a planning document can be converted reproducibly.
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offshore/reconcile_offshore_coordinates.py:625-629
QUOTE:
```python
                "Airy 1830 inverse Transverse Mercator, then Helmert 7-parameter OSGB36->WGS84 "
                "(tx=+446.448 ty=-125.157 tz=+542.060 m, s=+20.4894 ppm, "
                "rx=+0.1502\" ry=+0.2470\" rz=+0.8421\"). OSTN15 not applied. "
                "Verified against six postcodes.io points that publish both OSGB36 eastings/northings "
                "and WGS84 degrees, spanning Argyll to Redcar: maximum error 2.7 m, mean 2.0 m."
```
WHY: The compiler pins pyproj 3.7.2 (contracts/202608290716-atlas-v9-source.json:26) with `always_xy=True`, which stops
the lat/lon axis swap EPSG:4326 otherwise implies. The reconcile tool carries a dependency-free inverse Transverse Mercator
on Airy 1830 plus the 7-parameter Helmert, states its accuracy (about 5 m, OSTN15 deliberately not applied), demands that
every output say so, and writes the full parameter set and a measured error (max 2.7 m over six postcodes.io points) into
each converted record. Planning-document grid references become rerunnable conversions rather than hand arithmetic.
PATTERN: declare the transform, its accuracy class and its verification inside the output record.

### F7 The V8 oracle check: a hash-pinned predecessor must agree on name and 4-dp coordinate for 95 per cent of its features
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e compiler/202608290716-compile-atlas-v9.py:180-189
QUOTE:
```python
    v9_keys = {(norm(r["name"]), round(r["longitude"], 4), round(r["latitude"], 4)) for r in rows}
    matches = 0
    for feature in features:
        p = feature.get("properties") or {}
        coords = (feature.get("geometry") or {}).get("coordinates") or []
        if len(coords) >= 2 and (norm(p.get("name")), round(float(coords[0]), 4), round(float(coords[1]), 4)) in v9_keys:
            matches += 1
    ratio = matches / len(features)
    if ratio < 0.95:
        raise RuntimeError(f"V8 parity below 95%: {matches}/{len(features)}")
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e compiler/202608290716-compile-atlas-v9.py:199-202
QUOTE:
```python
    if source.stat().st_size != SOURCE_BYTES or digest(source) != SOURCE_SHA256:
        raise RuntimeError("official REPD input identity mismatch")
    if v8_path.stat().st_size != V8_BYTES or digest(v8_path) != V8_SHA256:
        raise RuntimeError("V8 oracle identity mismatch")
```
WHY: V9 is not trusted until the immutable V8 `dist/repd_master.json` (globalgrid2050 commit f2f343a9, 4,256,963 bytes,
sha256 ca5da437...) agrees with it. Both inputs are identity-checked by size and SHA-256 before a row is read; the feature
count is pinned (10,784) so oracle drift refuses too. Result recorded in data/repd_v9_manifest_202608290716.json:179-181:
10,610 of 10,784, 0.983865. The contract restricts V8 to "immutable parity oracle only; never modified or copied as V9 truth"
(contracts/202608290716-atlas-v9-source.json:21). Gap worth noting: 4-dp rounding is roughly 11 m in latitude, and the 36
false-origin rows passed this gate because the oracle measures agreement, not plausibility.
PATTERN: oracle parity gate with pinned oracle bytes, pinned feature count and a ratio floor.

### F8 "unapproved V8 HTML delta": the successor page is the oracle page plus exactly the approved insertions
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e compiler/202608292126-build-map-ready-v9.py:372-383
QUOTE:
```python
    oracle_html = oracle_payloads["index.html"].decode("utf-8")
    engine_tag = '<script src="ventus-corev8engine.js"></script>'
    require(oracle_html.count(engine_tag) == 1, "V8 engine tag contract changed")
    before = (
        '<script src="202608292126-map-ready-fetch-bridge.js"></script>\n'
        '<script src="202608291818-place-postcode-search.js"></script>\n\n'
    )
    after = '\n<script src="202608292126-pre-snapped-config-adapter.js"></script>'
    candidate_html = oracle_html.replace(engine_tag, before + engine_tag + after)
    require(candidate_html.count("202608292126-map-ready-fetch-bridge.js") == 1, "bridge injection failed")
    require(candidate_html.count("202608292126-pre-snapped-config-adapter.js") == 1, "config adapter injection failed")
    require(candidate_html.replace(before, "").replace(after, "") == oracle_html, "unapproved V8 HTML delta")
```
WHY: Strip the two approved insertions from the candidate and it must equal the V8 HTML byte for byte; otherwise the build
refuses. Paired with git-blob SHA-1 checks on every fetched V8 file (lines 267, 279-280) and an output directory that must
not already exist (line 247), it makes "V8 untouched" a computed fact. The permitted deltas are enumerated in
contracts/202608292126-map-ready-runtime.json:130-135.
PATTERN: subtract-the-allowlist equality (approved delta = candidate minus oracle).

### F9 "It never uses proximity to claim identity": stated in README, pinned in three contracts, enforced as a compiled invariant
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e README.md:7
QUOTE:
```markdown
The address/fly-to cartridge searches project name, official REPD address, official postcode, county, planning authority and REPD reference. It never uses proximity to claim project identity or ownership.
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e contracts/202608290716-atlas-v9-source.json:34-39
QUOTE:
```json
  "truth": {
    "address": "official REPD Address, whitespace-normalised only",
    "postcode": "official REPD Post Code, canonicalised only when valid",
    "relationship": "REPD operator or applicant as published; never relabelled owner",
    "proximity": "never establishes project identity or involvement"
  }
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e contracts/atlas-v9-deep-link-contract.v1.json:15-17
QUOTE:
```json
  "rules": {
    "name_is_identity": false,
    "coordinates_are_identity": false,
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/v9_5/compiler.py:270-273
QUOTE:
```python
        "Location only · ${escapeHtml(provider)} · no project identity claimed",
    ]:
        if marker not in source:
            raise RuntimeError(f"compiled cartridge missing invariant: {marker}")
```
WHY: Identity is the exact REPD reference (`"identity_rule": "EXACT_REPD_REF_ONLY"`, contracts/202608291430-atlas-v9-live-release.json:25;
`"query_coordinates_ignored": true`, line 27). A name is not identity, coordinates are not identity, and a place-search hit
must carry the literal disclaimer "Location only · <provider> · no project identity claimed", or the cartridge compiler
refuses to emit. "REPD operator or applicant as published; never relabelled owner" (source contract line 37) is the same
rule applied to ownership. This is the line that keeps a map pin from becoming an accusation.
PATTERN: identity by exact key only; proximity and names are evidence, never identity; disclaimer as a build invariant.

### F10 DuckDB/Parquet search plane versus drawing plane: the law, and where the live transport departs from it
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e 202608310050-gridatlas-next-version-builders/inputs/202608310015-attached-sample-findings.md:32-38
QUOTE:
```markdown
- DuckDB is the explicit search plane only.
- Light drawing layers use hash-pinned map-ready GeoJSON.
- Heavy national line layers use PMTiles with zoom floors and viewport-bounded transfer.
- Fidelity and delivery are separate verdicts and cannot be traded against each other.
- Current layer gate: 15 seconds, 400 MB heap, at least one feature.
- Heavy layers identified: primary roads, trunk roads, mainline rail and motorways.
- Static exact-ref lookup must work on constrained devices without starting DuckDB.
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e 202608310050-gridatlas-next-version-builders/tools/202608310050-build-readiness.mjs:85
QUOTE:
```javascript
    duckdb_drawing_plane_forbidden: true,
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/current.json:876
QUOTE:
```json
  "data_plane": "PARQUET_DUCKDB_ON_DEMAND",
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/202609071213-place-global-search-v9-5.js:207-212
QUOTE:
```javascript
      /* A SHARED database is never terminated here. Retry owns this lane's
         connection, not the page's runtime: the streaming-parquet bridge is
         serving every V8 data layer from the same database, and tearing it
         down to retry a search would take the map's data plane with it.
         Closing the connection is the whole of what this lane owns.
         The `shared` flag is set by runtime() above; the terminate path is
```
WHY: The stated law keeps DuckDB as the search plane and draws from hash-pinned GeoJSON or PMTiles; the PMTiles readiness
record sets `duckdb_drawing_plane_forbidden: true`. The live pointer (v9.187) however records
`"data_plane": "PARQUET_DUCKDB_ON_DEMAND"`, and the search cartridge's own comment says the streaming-parquet bridge "is
serving every V8 data layer from the same database". So in the live composition one DuckDB-WASM database serves both
planes, and the separation is kept at the connection level (a search retry closes its connection and never terminates a
shared database) rather than at the engine level. Both facts are keyed; the edition should present the separation as
"law for heavy layers, shared runtime for the rest", not as fully realised.
PATTERN: plane separation by ownership (a lane closes only what it owns).

### F11 Headers before body: the streaming bridge keeps the V8 15 s timer honest
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/v9_5/build_streaming_bridge.py:94-96
QUOTE:
```python
    // Return response headers before DuckDB imports, downloads, queries and serialises the body.
    // This preserves the native fetch contract expected by the V8 engine: its 15 s timer protects
    // response establishment, while response.json() may continue consuming a streamed body.
```
WHY: V8's fetch timer protects response establishment. The bridge returns a `Response` around a `ReadableStream` at once and
lets DuckDB import, download, query and serialise into the body afterwards (lines 97-125), with abort propagation. Pinned in
current.json as `"response_contract": "HEADERS_BEFORE_PARQUET_BODY"` (atlas/current.json:873) and `"duckdb_prewarm":
"AFTER_400KV_SOURCE_READY"` (line 875). Every source edit in this compiler is guarded by an exactly-one-occurrence check
(lines 40-42, 75-76, 128-129).
PATTERN: satisfy a legacy timeout contract by streaming the body, not by raising the timeout.

### F12 NESO connection sites: a contractual fact, not a measurement, with explicit refusals
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offshore/fetch_neso_connection_sites.py:31-39
QUOTE:
```text
WHAT IT REFUSES TO DO
---------------------
It never invents a connection. A project that is not in either register gets no
record: nineteen of the ninety-seven are in that state, almost all of them
pre-2010 farms that connected through a DNO before these registers began, and
"absent from the register" is a fact worth printing rather than a gap worth
filling. It never resolves a conflict silently either -- where REPD and NESO
disagree about which name belongs to which project, both readings are written
and the row is marked CONFLICT for a human.
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offshore/fetch_neso_connection_sites.py:44-50
QUOTE:
```text
"Hornsea 2 - Optimus and Breesea" to "Hornsea Power Station 2A". So names are
normalised first (accents folded, parentheticals and boilerplate stripped),
which pairs 57 of the 97 on its own, and the remainder go through ALIASES
below. Every alias carries the evidence that justified it -- almost always the
capacity agreeing to within a few MW -- because a wrong alias is worse than a
missing one: it prints a real substation name against the wrong wind farm, and
the map presents that as fact.
```
WHY: This is the estate's join from REPD to the NESO TEC and Embedded registers (`Connection Site`, `Customer Name`,
`Cumulative Total Capacity (MW)`), and it is the datacentre-relevant join in this slice: NESO's register is how a
large-load site's declared connection is known without guessing from distance. It replaced "nearest mapped substation"
answers that, on the live payload, sent at least 15 offshore arrays to another company's platform (docstring lines 8-15).
Output: 769 matched, 10,300 unmatched, 2 CONFLICT (counts above). The live SLD cartridge loads the lean form and labels
MEDIUM matches "Named by inference" (atlas/cartridges/202609241334-sld-sandbox-v9-8.js:2261-2262).
PATTERN: authority register beats geometry; absent-from-register is printed, conflicts are written both ways.

### F13 Defect: the NESO prefix fallback is the fuzzy match the estate forbids, and its normaliser has no word boundaries
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offshore/fetch_neso_connection_sites.py:127-129
QUOTE:
```python
NOISE = re.compile(
    r"(offshore\s+wind\s*farm|offshore\s+windfarm|wind\s*farm|offshore|project"
    r"|phase|extension|demonstrator|pilot|park|ltd|limited|the)")
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offshore/fetch_neso_connection_sites.py:224-228
QUOTE:
```python
            if not candidates:
                for name, pairs in index.items():
                    if name and abs(len(name) - len(key)) <= 14 and (name.startswith(key) or key.startswith(name)):
                        candidates, method = pairs, "NORMALISED_PREFIX"
                        break
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/data/neso-connection-sites.json:24-27
QUOTE:
```json
   "repd_ref": "34",
   "repd_name": "Caledonian Papermill",
   "technology": "biomass",
   "neso_project_name": "Caledonia Offshore Wind Farm",
```
WHY: `NOISE` lacks `\b`, so "park", "the", "phase" are cut out of the middle of words. Measured from /tmp with the tool's
own `normalise`: 'Howpark Wind Farm' -> 'how', 'Parkhill' -> 'hill', 'Southern Solar' -> 'sou rn solar', 'Caledonia
Offshore Wind Farm' -> 'caledonia'. The fallback then accepts the first index entry where either string is a prefix of the
other within 14 characters, with no capacity or plant-type check, and `break`s on dict order. Result: REPD 34 "Caledonian
Papermill" (biomass) is bound to NESO "Caledonia Offshore Wind Farm", 600 MW at Greens 400kV, and that binding is in the
lean file the live SLD loads (`jq -c '.sites["34"]' atlas/data/neso-connection-sites.lean.json`). 294 of 769 records
(38 per cent) came through this path. The docstring was calibrated on 97 offshore rows ("pairs 57 of the 97"); the loop
runs over all 11,069 registry rows. It contradicts the tool's own "a wrong alias is worse than a missing one" and the
reconcile tool's "Do not fuzzy-match site names to lease names" (reconcile_offshore_coordinates.py:26).
PATTERN (anti-pattern): unbounded prefix fallback on a normaliser without word boundaries.

### F14 Bind or write nothing: an omitted row is a good outcome, a fabricated one the worst
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offshore/reconcile_offshore_coordinates.py:16-18
QUOTE:
```text
The governing rule is bind or write nothing. A row with no defensible public
source is omitted. An omitted row is a good outcome. A fabricated one is the
worst possible outcome, because the map prints it as fact.
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offshore/reconcile_offshore_coordinates.py:26-33
QUOTE:
```text
  * Do not fuzzy-match site names to lease names. The previous version of this
    tool matched on normalised names and reported Morecambe as NO_LEASE_MATCH
    because REPD spells it "Morecombe" while the lease register spells it
    "Morecambe". Worse, fuzzy matching is silent when it is wrong: Thistle Wind
    Partners hold two ScotWind leases of identical 1008 MW capacity, Ayre off
    Orkney and Bowdun off Stonehaven, 200 km apart, and a name-similarity score
    will happily pick the wrong one. Every bind in this file is therefore
    explicit, written down, and carries the evidence that justifies it.
```
WHY: The clearest statement of the estate's fail-closed coordinate law. Every bind is an explicit table entry carrying its
evidence (name, tenant and capacity agreeing; e.g. Muir Mhor 1000 MW exact, line 174) and an honest `precision_km`
(30 km for the whole-lease Morven point, line 200-201). `sanity()` (lines 687-707) refuses the placeholder, Null Island,
points outside a UK/CI envelope, missing provenance and duplicates. The Ayre/Bowdun case (two 1008 MW leases 200 km apart)
is the concrete proof that name similarity is silent when wrong.
PATTERN: explicit evidence-carrying binds; omission over approximation; post-build sanity that names each fabrication mode.

### F15 Defect: the annual workflow calls the rewritten tool with a flag it no longer accepts, and the committed output predates the fix
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e .github/workflows/offshore-coordinate-reconcile.yml:83-87
QUOTE:
```yaml
        run: |
          python gridatlas/tools/offshore/reconcile_offshore_coordinates.py \
            --root "$GITHUB_WORKSPACE" \
            --out gridatlas/atlas/data/offshore-coordinates.json \
            --check
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offshore/reconcile_offshore_coordinates.py:711-714
QUOTE:
```python
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--offline", action="store_true", help="use the cached lease layers only")
    parser.add_argument("--check", action="store_true", help="run the checks, write nothing")
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/data/offshore-coordinates.json:51-61
QUOTE:
```json
   "repd_ref": "10922",
   "site_name": "Morecombe Offshore Windfarm",
   "operator": "Cobra Instalaciones y Servicios S.A / Flotation Energy",
   "matched_lease": null,
   "tenant": null,
   "region": null,
   "source_file": null,
   "longitude": null,
   "latitude": null,
   "crs": null,
   "method": "NO_LEASE_MATCH"
```
WHY: The workflow (last changed 98dd908954c4c9bc21dac97346f7d71d9b201a27, 2026-09-07T04:37:24+01:00) passes `--root`; the tool
was rewritten in 5c41ec49db6695cd52aa2e37bfc377f806075bc1 (2026-09-08T01:47:35+01:00) and its parser defines only `--out`,
`--offline`, `--check` (`git show 98dd908:tools/offshore/reconcile_offshore_coordinates.py | grep -n add_argument` shows
`--root` at line 297 of the old version). argparse exits on an unrecognised argument, so the 14 February run
(`cron: '23 4 14 2 *'`, workflow line 20) will fail before reconciling. The committed output was last written at 98dd908 by the
old fuzzy matcher: it still lists Morecombe as `NO_LEASE_MATCH`, the exact failure the new docstring (lines 26-29) says was
fixed by the explicit bind at line 136-138. It also embeds absolute workstation paths in `sources` (4 lines:
`grep -c "[A-Z]:/" atlas/data/offshore-coordinates.json`; not quoted here).
PATTERN (anti-pattern): tool and workflow changed in different commits with no CLI contract test.

### F16 `regex_replace_once` cannot detect the ambiguity it reports
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/v9_5/compiler.py:21-25
QUOTE:
```python
def regex_replace_once(text: str, pattern: str, replacement: str, label: str) -> str:
    changed, count = re.subn(pattern, lambda _match: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one source region, found {count}")
    return changed
```
WHY: The estate's anchored patching is exactly-one-or-refuse (9 guard sites; count above). This variant passes `count=1`
to `re.subn`, which stops after the first match, so `count` is 0 or 1 and the "expected exactly one" branch only catches
zero. A pattern that matches twice is silently patched at its first occurrence. Its plain sibling `replace_once` (lines
14-18) uses `str.count` and is correct. One call site (line 233).
PATTERN (anti-pattern): a uniqueness guard built on a capped counter.

### F17 A straight line labelled as one, with a court-sourced route factor; and two Earth radii
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/interconnectors/fetch_far_end_converters.py:14-18
QUOTE:
```python
A straight line between converter stations is the intended output, not a
stopgap. It states the separation exactly and is honest so long as it is labelled
a straight line rather than a cable route. Where a true cable length is known the
report carries the route factor beside it: BritNed is ~245 km of submarine cable
against its own straight line, quoted in BritNed v ABB [2018] EWHC 2616 (Ch).
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/data/interconnector-endpoints.json:102-109
QUOTE:
```json
   "straight_line_km": 234.9,
   "midpoint_lon": 2.36873,
   "midpoint_lat": 51.69895,
   "geometry_kind": "STRAIGHT_LINE_CONVERTER_TO_CONVERTER",
   "drawable": true,
   "known_submarine_cable_km": 245,
   "route_factor": 1.043,
   "route_factor_source": "BritNed Development Ltd v ABB AB [2018] EWHC 2616 (Ch)",
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/interconnectors/fetch_far_end_converters.py:85-87
QUOTE:
```python
def haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Great-circle distance on the estate's declared WGS84 sphere."""
    radius = 6378.137
```
WHY: Interconnectors had flow data and no geometry (catalogue: `"status": "GEOMETRY_NOT_SOURCED"`). The tool draws only
what OSM `power=converter` confirms (2 of 10 links drawable), labels the geometry kind, and computes BritNed's route factor
245 / 234.9 = 1.043 from a cited judgment. But its haversine uses 6378.137 km (equatorial) while the reconcile tool uses
6371.0088 km (mean, reconcile_offshore_coordinates.py:470): a 0.11 per cent difference, 0.25 km on BritNed, between two
tools that both claim to measure separation exactly. The docstring calls 6378.137 "the estate's declared WGS84 sphere".
PATTERN: geometry honesty by label (`STRAIGHT_LINE_CONVERTER_TO_CONVERTER`); one declared Earth radius per estate is missing.

### F18 Privacy by construction in the compiler: possible individuals withheld before publication
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e compiler/202608290716-compile-atlas-v9.py:50-60
QUOTE:
```python
def public_applicant(raw):
    value = clean(raw)
    if not value:
        return None, "NOT_SUPPLIED"
    if re.search(r"(?:@|\b\+?\d[\d ()-]{7,}\b)", value):
        return None, "WITHHELD_CONTACT_DETAIL"
    words = re.findall(r"[A-Za-z][A-Za-z'’-]*", value)
    possible_person = 2 <= len(words) <= 4 and all(w[:1].isupper() for w in words) and not ORG_WORDS.search(value)
    if possible_person:
        return "WITHHELD — POSSIBLE INDIVIDUAL", "WITHHELD_POSSIBLE_INDIVIDUAL"
    return value, "REPD_AS_PUBLISHED"
```
WHY: REPD's "Operator (or Applicant)" can be a private person. Contact details and 2-4 capitalised words with no
organisation token are withheld and the state is recorded per row; 1,729 rows withheld (manifest `privacy`). The live
contract adds `"operator_or_applicant_is_current_owner_claim": false` (contracts/202608291430-atlas-v9-live-release.json:142).
PATTERN: publish-safe transform with a per-row disclosure state.

### F19 The arrival grid: the test that would have caught what shipped
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e local-arrival-grid.mjs:1-12
QUOTE:
```javascript
/**
 * Local arrival regression grid.
 *
 * The gap that let every defect found on 2026-09-04 ship: no CI job has ever
 * loaded a deep link in a real browser at any viewport. Every vm proof stubs
 * innerWidth:1280 and matchMedia->false, so the narrow branch is never taken,
 * and the one mobile audit is orphaned because run-current cannot pick up a
 * .audit.mjs file.
 *
 * This runs the real thing, locally, across every core: workers x {chromium,
 * webkit} x {393, 1280} px, cycling REPD deep links harvested from the live
 * Pipeline News release, asserting what a reader actually gets.
```
WHY: States the gap precisely (every VM proof stubbed a 1280 px viewport, so the narrow branch never ran) and closes it with
real Chromium and WebKit at 393 and 1280 px over deep links harvested from the live Pipeline News page; `--hidden` simulates
the iOS deferred-tab case. The two webkit probes (webkit-arrival-probe.mjs, webkit-register-probe.mjs) are single-case
reproductions with a Chromium control. All three landed in 64268fd06a0da54ddffbcdaaaee382e314e829f7 (2026-09-04T14:32:20+01:00).
Caveat: the default `--out` (line 28) is an absolute workstation path, so it is not CI-portable as committed.
PATTERN: harvest real inputs from the live consumer; test across engine by viewport.

## Patterns (keyed; each cites at least one F above)

1. **Blank is not zero** (F1, F2): a missing coordinate coerced to 0 becomes a real place after a CRS transform. Reject both
   the literal and the transformed zero, and keep the row visible but unselectable with a pinned excluded count.
2. **Interior representative point** (F3, F14): point-on-surface, method written into the record.
3. **Correction as data** (F4, F5): wrong / right / cause stored beside the figure; F5 shows the sweep must cover every restatement.
4. **Declared transform with measured error** (F6): parameters, accuracy class and verification travel with each converted point.
5. **Oracle gates** (F7, F8): pinned predecessor bytes; ratio floor for data parity; subtract-the-allowlist equality for code parity.
6. **Exact-key identity** (F9, F12): identity by REPD ref; proximity, names and coordinates are evidence; a declared
   connection from the authority beats a nearest-distance answer.
7. **Exactly-one anchored patching** (F8, F11, F16): every source edit asserts a unique anchor, with F16 the one capped-counter exception.
8. **Fail closed, omit rather than invent** (F12, F14), with F13 and F15 as the two places the slice breaks its own law.

## History (keyed by commit SHAs; shallow clone, oldest visible 2026-09-01T14:43:56+01:00)

- f3ba7a31b5bbac2a0af7171ddb2402cf6f3b624c 2026-09-01T14:43:56+01:00 "202609011433-gridatlas-v9.51: the 400 kV public record": the
  graft point. compiler/, contracts/, tools/v9_5/ and machine-learning/ have no later commits, so their authoring history
  (generations 202608290716 to 202608300453 in file names) is before the visible window: UNVERIFIED from git, dated only by file-name stamps.
- 64268fd06a0da54ddffbcdaaaee382e314e829f7 2026-09-04T14:32:20+01:00 v9.111: arrival grid and webkit probes (F19).
- The coordinate night, 2026-09-07 (+01:00): 2e5879fc56e529d8c7fea4ebb7ba84172b227f25 04:20:12 catalogue created;
  db5338bf9613148c0f8bc26f619f0602ad75b45b 04:23:26 parser correction (F4); 98dd908954c4c9bc21dac97346f7d71d9b201a27 04:37:24 annual
  offshore workflow + first reconcile output (F15); b075b0f 04:39:05 CI/CD plan; 0eab5c2f3832a1a2126390f8319a89bdbf13f623 04:44:00
  interconnectors introduced; c5b474e360a736c1bb1206399b6da2a81a5a6afb 04:46:28 BMRS flow join. Six commits in 26 minutes.
- cf429bc438f8059b6cfad4f9924d4231201c898e 2026-09-07T22:49:18+01:00 README "Cable engines".
- The connection night, 2026-09-08 (+01:00): 5c41ec49db6695cd52aa2e37bfc377f806075bc1 01:47:35 NESO connection register and the
  reconcile rewrite (F12, F13, F14; F15 regression introduced here); bb9d84f014ab4140a3c6416cc501ec6eb166ec88 01:50:04 landfall,
  four projects; c9f7a8218fa381819afa894c2260e90396ba1b46 02:44:44 deterministic offshore and interconnector engine candidate;
  ccf675d40741183b53a2cae990debc0bd545f6aa 05:16:59 "Save the research that was in flight when the budget ran out"
  (corrections and landfall committed PARTIAL, with the budget named in the data: offshore-landfall.json line 6).
- Authorship: every commit in this slice is by the single author `Ventusltd`; db5338b carries a `Co-Authored-By: Claude Opus 5`
  trailer. No reverts in the paths read (`git log --format=%s -- <paths> | grep -ci revert` = 0 on the visible window).
- Turning point: db5338b, a public self-correction three minutes after the claim, and the source of the "real CSV reader" rule.

## Gridatlas and datacentre relevance

- The NESO join (F12) is the only place in this slice where a project gets a *declared* grid connection from the connection
  authority. For data centres, which appear in NESO TEC/Embedded as demand or co-located schemes, this is the honest
  answer to "where does it connect": a register fact labelled as such, beside (never replacing) a measured nearest-substation
  distance. F13 is the warning for any data-centre reuse: the same prefix fallback would bind a data-centre name to an
  unrelated register entry; reuse must take the exact and alias paths only, and require capacity agreement.
- The proximity rule (F9) is the guard a data-centre layer needs most: a data centre near a substation is not connected to it,
  and an operator near a site is not its owner.
- F1/F2: any data-centre source in EPSG:27700 (planning portals, DNO heat maps) must pass blank-as-null and false-origin rejection.
- F10: the live pointer already ships a datacentre GeoJSON (`data/uk_datacentre_pipeline_202610292136.geojson`, listed by `ls data`)
  as a light drawing layer, consistent with the plane law; DuckDB stays the search plane for it.

## Candidates (unkeyed; clearly marked)

- C1 `point_on_surface` flattens MultiPolygon rings and picks the largest by area without separating holes; a lease with a large
  interior exclusion could yield a span midpoint inside a hole. Not observed in data; untested.
- C2 The 36 false-origin rows in the V9 registry exceed the 25 blank-coordinate rows counted in globalgrid2050/repd.csv; the files
  are different snapshots (sha256 fdb6aec5... vs pinned 84c1b5f9...), so no defect is claimed. The pinned Q2 2026 CSV is not in the estate.
- C3 Crude technology-family check on NESO records (REPD technology vs NESO `Plant Type` keyword): NORMALISED_PREFIX 96 of 294
  disagree, NORMALISED_NAME 61 of 454, MANUAL_ALIAS 0 of 19. Some disagreements are legitimate (mixed-technology sites,
  CCGT hosts), so this is a triage signal, not a defect count.
- C4 tools/interconnectors/interconnector-module.js and tools/v9_5/build_v9_5.py were not read: UNVERIFIED.
- C5 machine-learning/ is a promotion-record store, not a model: 3 JSONL records labelled PROMOTE/REJECT for
  `binary_release_promotion`, schema with `additionalProperties: false`, privacy `NO_PERSONAL_DATA`
  (contracts/202608292126-map-ready-runtime.json:152-159). No training code found in the folder.

## Proposed lines for the Kuiper edition

1. F1 compiler/202608290716-compile-atlas-v9.py:102-108 — the best single story in the slice: one `or 0` explains the
   placeholder the whole estate rejects; verifiable with one function call.
2. F14 reconcile_offshore_coordinates.py:16-18 — "bind or write nothing", the coordinate law in three lines.
3. F9 contracts/202608290716-atlas-v9-source.json:38 — "never establishes project identity or involvement".
4. F3 reconcile_offshore_coordinates.py:342-347 — point-on-surface with its reason.
5. F8 build-map-ready-v9.py:383 — "unapproved V8 HTML delta", the subtract-the-allowlist gate.
6. F4 coordinate-systems.json:182-187 — a correction stored as data; pair with F5 line 176 as the honest footnote.
7. F12 fetch_neso_connection_sites.py:31-39 — the datacentre-relevant join and its refusals; pair with F13 as the counter-example.
8. F11 build_streaming_bridge.py:94-96 — headers before body.

## One next command

cd /home/user/estate/gridatlas && python3 -I -c "import re;N=re.compile(r'(offshore\s+wind\s*farm|offshore\s+windfarm|wind\s*farm|offshore|project|phase|extension|demonstrator|pilot|park|ltd|limited|the)');print([N.sub(' ',w) for w in ['howpark','southern','parkhill']])"
