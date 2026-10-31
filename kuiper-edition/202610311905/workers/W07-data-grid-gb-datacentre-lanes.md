# W07 data-grid-gb-datacentre-lanes
HEADS: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 (matches proof/inventory.tsv; 15 commits in clone, 102 tracked files, 38 under datacentres/)
READ:
datacentres/README.md
datacentres/NOTICE
datacentres/__init__.py
datacentres/sources.json
datacentres/fetchers/__init__.py
datacentres/fetchers/neso_connections.py
datacentres/fetchers/planning_data_gov_uk.py
datacentres/fetchers/dsit_ai_growth_zones.py
datacentres/fetchers/osm_datacentres.py
datacentres/fetchers/wikidata_datacentres.py
datacentres/fetchers/dno_ecr.py
datacentres/lanes/lanes.json
datacentres/lanes/MANIFEST.json
datacentres/lanes/dc-a1-neso/fetch_neso.py
datacentres/lanes/dc-a2-planning/dc_planning_fetch.py
datacentres/lanes/dc-a2-planning/out/manifest.json
datacentres/lanes/dc-a2-planning/out/dc_planning.geojson
datacentres/lanes/dc-a3-gov/gov_sites.py
datacentres/lanes/dc-a3-gov/gov_sites.json (via jq / python -I only)
datacentres/lanes/dc-a4-osm-wikidata/dc_a4.py
datacentres/lanes/dc-a4-osm-wikidata/out/counts.json
datacentres/lanes/dc-a4-osm-wikidata/out/dc_operational.json (via python -I only)
datacentres/lanes/dc-a5-dno/dno_fetch.py (header and source list)
datacentres/lanes/dc-a7-merge/dcmerge.py
datacentres/lanes/dc-a7-merge/dcingest.py
datacentres/lanes/dc-a7-merge/dcschema.py
datacentres/lanes/dc-a7-merge/dc_pipeline.schema.json (enums and descriptions)
datacentres/lanes/dc-a7-merge/test_dcmerge.py (test list, determinism, MW, cross-operator tests)
datacentres/lanes/dc-a7-merge/out/uk_datacentre_pipeline.geojson (via jq / python -I only)
datacentres/lanes/dc-a7-merge/out/uk_datacentre_pipeline.rejects.json
assetpipe/lanes.py
pipelines/run_lanes.py
reproduce.py (check_lanes)
ci/verify.py
tests/test_lanes.py
.github/workflows/fetch-assets.yml
.github/workflows/test-assets.yml
.gitattributes
docs/METHODS.md
git log / git show of 3ca8cfd, 3c6c72e, 69b566d, b57c94d

Method notes (read-only):
- Every committed lane file was re-hashed against lanes/MANIFEST.json with `python3 -I`: 23 of 23 pins match (bytes and sha256).
- Lanes dc-a2, dc-a3, dc-a4 and dc-a7 were rebuilt OFFLINE from a scratch copy (`mktemp -d /tmp/w07-XXXX`, `cp -r datacentres/lanes`), never in the clone. Every rebuilt output is byte-identical to its pin (hashes under F17). `test_dcmerge.py`: "Ran 52 tests ... OK" on Python 3.13.18. `dc_a4.py selftest`: "SELFTEST OK". `gov_sites.py check`: "27 records; 0 errors".
- Disclosure: one `python3 -I -c 'import dcmerge'` with a sys.path insert wrote `datacentres/lanes/dc-a7-merge/__pycache__/dcmerge.cpython-313.pyc` into the clone at 2026-10-31T19:13:31Z (git-ignored, untracked). I deleted that one file and its empty directory at once; `git status --porcelain --ignored | wc -l` reads 0 afterwards. Later imports used `-B`. No tracked file was touched.

## Findings (keyed)

### F1 Cross-operator hard guard runs before every strong key (planning ref, connection ref, shared URL)
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a7-merge/dcmerge.py:236-239
QUOTE:
```python
    # Hard guard BEFORE planning refs, connection refs or shared URLs. Even a
    # shared government document can name unrelated operators at nearby sites.
    if operator_match(a.get("operator"), b.get("operator")) is False:
        return None
```
WHY: This is the Slough repair (commit 69b566d, 2026-10-29T21:36:03+00:00). The guard sits above the planning-ref, connection-ref and evidence-URL rules, so not even a shared reference can merge two different known operators. The same test repeats cluster-wide in `cannot_link` (dcmerge.py:266-268: `# This is cluster-wide: no transitive bridge through an unknown-operator record.` / `if operator_match(...) is False:` / `return True`). That stops a chain A(Digital Realty) to B(unknown) to C(Global Technical Realty) from closing through union-find. Note that `operator_match` returns `None` for unknown and `is False` for a known mismatch, so "unknown" is a third value here, not "different". The regression tests are test_dcmerge.py:155-185 (three tests, including both input orders for the chain). Effect, counted with jq at 3c6c72e and at HEAD: sites went from 204 to 227 and placed sites from 203 to 225.
PATTERN: hard cannot-link guard ahead of strong evidence; three-valued identity (True / False / None)

### F2 The OSM lane fails closed on a cross-operator site: it raises, it does not record a conflict
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a4-osm-wikidata/dc_a4.py:235-240
QUOTE:
```python
def assert_single_operator(sites):
    """Fail closed: a site containing distinct known operators is invalid, not a conflict to hide."""
    for s in sites:
        ops = [m["operator"] for m in s["members"] if m.get("operator")]
        if any(not op_compatible(ops[0], x) for x in ops[1:]):
            raise ValueError("cross-operator data-centre merge: " + repr(ops))
```
WHY: The upstream lane changed `op_compatible`, which used to accept any shared token (`bool(tokens(a) & tokens(b))`, removed in 69b566d), to exact canonical identity (dc_a4.py:211-217). `site_compatible` (dc_a4.py:220-232) requires every member of a site to be compatible: `An unknown operator supplies no authority to merge nearby *different named sites*.` The assertion runs after both grouping passes (lines 259 and 279), so a regression stops the build instead of shipping a false site. Counts.json at HEAD versus before the fix (git show 69b566d): sites_total 190 to 212, duplicates_merged 50 to 28, data_centre_campus 29 to 18.
PATTERN: invariant assertion after clustering (fail closed, not "flag and continue")

### F3 The Slough fixture: five real legacy points within about 1 km, expected to make four sites
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a4-osm-wikidata/dc_a4.py:477-484
QUOTE:
```python
    sg = group_osm(sl)
    assert len(sg) == 4, [(x["name"], [r["name"] for r in x["members"]]) for x in sg]
    assert all(not ({"Digital Realty", "Global Technical Realty"} <=
                    {r.get("operator") for r in x["members"]}) for x in sg)
    assert all(not ({"China Mobile Slough", "VIRTUS London 11"} <=
                    {r.get("name") for r in x["members"]}) for x in sg)
    assert not op_compatible("Digital Realty", "Global Technical Realty")
    assert op_compatible("Equinix (UK) Ltd", "EQUINIX")
```
WHY: The fixture (dc_a4.py:465-476) uses the actual globalgrid2050 ids gg2050-dc-133/135/193/231/237 and coordinates around 51.517 N, 0.618 W. Digital Realty LHR26 and LHR27 may join each other, but never Global Technical Realty London GB One (138 m from LHR26, haversine). Two unknown-operator neighbours, China Mobile Slough and VIRTUS London 11, may not join either, because they have different names. The last two asserts pin both sides of the rule: suffix-insensitive equality holds, and a shared word does not.
PATTERN: regression fixture built from the real false-merge cluster

### F4 DEFECT: the same guard now splits one site, Wapseys Wood (PINS EN0110030), into a placed and an unplaced record
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a7-merge/dcmerge.py:122-128
QUOTE:
```python
def operator_match(a, b):
    na, nb = norm_operator(a), norm_operator(b)
    if not na or not nb:
        return None  # unknown
    # Subset matching is unsafe: Digital Realty must not match Global Digital
    # Realty simply because both share words. Remove corporate suffixes only.
    return na == nb
```
WHY: `_OP_STOP` (dcmerge.py:48-50) strips "holdings", "uk" and "limited". So `norm_operator("Slough Holdings UK Limited")` is `'slough'` and `norm_operator("Slough Holdings UK Limited (SDC Capital Partners)")` is `'slough sdc capital partners'`. `operator_match` returns False (checked with `python3 -I -B` importing dcmerge). The first string is the dc-a2 s35 seed's applicant (dc_planning_fetch.py:120). The second is the dc-a3 record's operator in gov_sites.json. F1's hard guard then refuses the link, even though both records cite the same PINS project URL and the same gov.uk s35 page and have identical names. At 3c6c72e they were one site via `"rule":"evidence_document"`. At HEAD they are two: dcuk-4ad498e7880d6ba4 (placed, exact) and dcuk-bf4650ea1c4a8a0b (geometry null). A python scan for same-name sites from different lanes left apart finds exactly 1 pair, this one. So 227 counts this site twice. There are 226 distinct sites, the 225 placed are distinct, and of the 2 unplaced only Ebbsfleet (Dartford) has no placed twin. The code comment says "corporate suffixes only", but the stop list also removes non-suffix words ("holdings", "group", "services", "international"). Exact equality on the remainder then treats a parenthetical parent company as a different operator.
PATTERN: over-separation as the price of a hard guard; a suffix list that is not only suffixes

### F5 Records without coordinates stay unplaced: no geocoding, no centroid from the LPA name
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a2-planning/dc_planning_fetch.py:114-116
QUOTE:
```python
# Section 35 directions for data centres (gov.uk publications, OGL v3).
# Hand-curated because no machine-readable feed was reachable; no coordinates
# are invented: geometry stays null unless a source gives one.
```
WHY: The seeds name an LPA ("Dartford", "Buckinghamshire") that could easily be geocoded, and the lane refuses to do it. Line 440 writes `"geometry": None` and line 448 writes `"location_precision": "named site (no coordinates)"`. At ingest, dcingest.py:318-319 (`if pt is None:` / `prec = "unknown"`) keeps them unplaced, and `to_feature` (dcmerge.py:550-555) emits `geometry: null`. That is how the merge ends at 227 features with 225 geometries: `jq -c '[(.features|length), ([.features[]|select(.geometry!=null)]|length), ([.features[]|select(.geometry==null)]|length)]' datacentres/lanes/dc-a7-merge/out/uk_datacentre_pipeline.geojson` returns `[227,225,2]`. The 2 are "Ebbsfleet Datacentre Campus, New Barn Road, Dartford" and "SDC M40 Campus (Wapseys Wood)". The NESO lane follows the same rule (fetch_neso.py:27-29: `No coordinates are invented. NESO gives a connection-site (substation) NAME only`).
PATTERN: unplaced, not inferred (null geometry is a first-class state)

### F6 The validator makes "a point" and "precision unknown" mutually exclusive
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a7-merge/dcschema.py:114-119
QUOTE:
```python
    loc = rec.get("location")
    if isinstance(loc, dict):
        if (loc.get("lat") is None) != (loc.get("lon") is None):
            errs.append("%s.location: lat and lon must both be set or both null" % path)
        if loc.get("lat") is not None and loc.get("precision") == "unknown":
            errs.append("%s.location: a point with precision 'unknown'" % path)
```
WHY: This encodes F5 as a schema law: no half-point, and no point you cannot vouch for. `validate_file` (dcschema.py:171-175) adds `geometry set but location null` and `geometry does not equal location`. ci/verify.py:184-185 applies the same rule to normalised outputs (`geometry and location.precision disagree`). The other semantic rules (dcschema.py:104-113) require every MW value to name a `source_id` that exists in `sources[]`. Provenance is a validation error, not a convention. `dcingest.py` returned `validation errors: 0` on the scratch rebuild.
PATTERN: semantic validator beyond JSON Schema (provenance closure, geometry and precision agreement)

### F7 Unknown is not zero: a total fetch failure deletes stale record files instead of writing empty ones
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a1-neso/fetch_neso.py:409-417
QUOTE:
```python
    if not manifest["snapshots"]:
        # Nothing fetched: write only the manifest. Empty record files would read
        # as "zero data centres", and unknown is not zero.
        for stale in ("neso_connections.normalised.json", "neso_dc_like.normalised.json",
                      "neso_dc_like.geojson", "counts.json"):
            (out / stale).unlink(missing_ok=True)
        (out / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
        print("no source fetched; counts UNKNOWN (not zero)", file=sys.stderr)
        return 2
```
WHY: This is the clearest code form of "unknown not zero" in the slice. An empty FeatureCollection would be a false claim of absence, so the lane writes nothing. Partial success is not failed closed: per line 52, `Exit code: 0 ok, 2 if any source failed to fetch (partial output still written)`, and line 456 is `return 2 if manifest["failures"] else 0`. The same doctrine appears in the merge schema (dc_pipeline.schema.json:5 `null means unknown, never zero`), the README (datacentres/README.md:8 `Unknown is `null`, not zero.`) and DC-A2's per-source counts (`"rows": None` at dc_planning_fetch.py:380 for unreached sources; out/manifest.json shows `"rows": null` for 6 of 9 sources). One inconsistency: the same dict has `"candidates": 0` for those unreached sources.
PATTERN: absence of evidence written as absence (file missing or null), never as an empty or zero result

### F8 Order-independent, hash-identified merge
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a7-merge/dcmerge.py:514-522
QUOTE:
```python
def merge(records):
    """records -> merged records sorted by id. Input order does not matter."""
    global _URL_OK
    recs = sorted(records, key=rec_key)
    freq = {}
    for r in recs:
        for k in raw_url_keys(r):
            freq[k] = freq.get(k, 0) + 1
    _URL_OK = {k for k, n in freq.items() if n <= URL_KEY_MAX_RECORDS}
```
WHY: Inputs are canonicalised by `rec_key` (sorted source ids, dcmerge.py:148-150). Links are applied strongest rule first in a total order (`links.append((RULE_RANK[rule], dist ..., i, j, ...))`, then `links.sort()`, lines 320-321). Ids are `"dcuk-" + sha256(site_key)[:16]` (lines 143-144), and colliding keys get a deterministic `#n` suffix (lines 529-536). Each merged record keeps every source (`out["sources"] = [srcs[k] for k in sorted(srcs)]`, line 381) and a `match[]` list of the pair, rule, name similarity and distance (lines 501-504). This is the deterministic, provenance-keeping join. test_dcmerge.py:399-405 shuffles a 60-plus record corpus with 5 seeds and requires identical JSON.
PATTERN: canonical sort, then fixed-priority union-find, then content-hash ids, with join provenance in match[]

### F9 IT load, grid connection and unclassified MW are merged field by field and never compared across fields
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a7-merge/dcmerge.py:412-423
QUOTE:
```python
    # MW: each field on its own; never across fields
    for f in MW_FIELDS:
        vals = [(r[f]["value"], r[f]["source_id"], r[f].get("label")) for r in ordered
                if isinstance(r.get(f), dict) and r[f].get("value") is not None]
        if vals:
            out[f] = {"value": vals[0][0], "source_id": vals[0][1], "label": vals[0][2]}
            if any(_mw_differ(vals[0][0], v[0]) for v in vals[1:]):
                conflicts.append({"field": f, "kind": "mw_disagreement",
                                  "values": [{"value": v, "source_id": s} for v, s, _ in vals],
                                  "chosen": vals[0][0], "note": "highest-tier source chosen"})
        else:
            out[f] = {"value": None, "source_id": None, "label": None}
```
WHY: The unknown branch writes `None`, not 0. At ingest, a bare `mw` or `capacity_mw` goes to `unclassified_mw` (dcingest.py:76), and on-site generation is moved to notes as "generation, not demand" (dcingest.py:303-308). HEAD output: `it_load_mw_known` 5, `grid_connection_mw_known` 2, `unclassified_mw_known` 8, and 0 MW fields equal to 0 across 227 sites (python -I count). Example: Bedford (QuestPit) keeps IT 720.0 and grid 200.0 as two sourced figures, with the source's own wording quoted in mw_evidence.
PATTERN: typed quantities kept in separate fields (never fuse IT load and grid connection)

### F10 The licence gate at ingest: share-alike, NC and ND are rejected, except ODbL
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a7-merge/dcingest.py:106-113
QUOTE:
```python
def norm_licence(s):
    if not s:
        return None
    if isinstance(s, dict):
        s = s.get("id") or s.get("name") or s.get("licence")
    key = str(s).strip().lower()
    if re.search(r"(^|[^a-z])(nc|nd|sa)([^a-z]|$)|non.?commercial|no.?deriv|share.?alike|by-sa", key) and "odbl" not in key:
        return None  # not fully open under the owner rule (ODbL is the one allowed share-alike)
```
WHY: The owner's open-data rule as one regex. `normalise` (dcingest.py:242-248) rejects any record with no fully open licence or no http(s) URL, and its docstring (line 8) says `REJECTED (logged), never guessed`. The schema enum (dc_pipeline.schema.json:354-367) allows only nine licence ids. HEAD by_licence counts: ODbL-1.0 199 sites, OGL-UK-3.0 29. The 12 rejects are all `cable landing station, not a data centre` (`jq length` on rejects.json returns 12).
PATTERN: licence as an executable allow-list

### F11 Verify fails on any output from a lane whose licence is unverified
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 assetpipe/lanes.py:220-224
QUOTE:
```python
        if strict_open and lane.get("open") != "yes":
            present = [o for o in lane.get("outputs", []) if (ldir / o).exists()]
            if present:
                problems.append(f"{lid}: outputs {present} from a source whose licence is {lane.get('open')}; "
                                "confirm the licence (open: yes) before merging")
```
WHY: This is why dc-a1-neso and dc-a5-dno hold only their scripts. `ls` shows no `out/` directory in either, and MANIFEST.json pins just fetch_neso.py and dno_fetch.py. lanes.json marks both `"open": "unverified"` (lines 10 and 158). ci/verify.py:210 calls this with `strict_open=not args.allow_unverified_lanes`. The fetch workflow labels such runs `[DO NOT MERGE: unverified licence]` (fetch-assets.yml:173). So NESO grid-connection MW cannot reach main until the NESO licence text is confirmed. The consequence for the 227: no TEC, Embedded Register or DNO ECR rows contribute (summary `grid_connection_mw_known` is 2, both from s35 text).
PATTERN: licence-gated publication (data may be fetched for review; it may not merge)

### F12 The 4 MiB CSV field-size repair: bounded, not unlimited
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a2-planning/dc_planning_fetch.py:385-389
QUOTE:
```python
            text = data.decode("utf-8-sig", errors="replace")
            # Planning descriptions can legitimately exceed Python's default 128 KiB CSV cell cap.
            # Keep a finite 4 MiB ceiling; oversized/untrusted data still fails closed.
            csv.field_size_limit(4 * 1024 * 1024)
            rows = list(csv.DictReader(io.StringIO(text)))
```
WHY: This is the HEAD commit b57c94d (2026-10-29T21:53:51+00:00, "Bound OGL planning CSV field size at 4 MiB with pinned reproducible parser"), +3 lines in the script plus a full MANIFEST re-pin. The common fix is `csv.field_size_limit(sys.maxsize)`. This one picks a finite ceiling, so a cell over 4 MiB still raises `_csv.Error`, uncaught, and the run aborts rather than truncating. `grep -rn field_size_limit` finds exactly one use in the repo, this line. Nothing in ci/ or .github/workflows sets it: the repair lives in the lane, and the workflows reach it through `run_lanes.py fetch/build` (fetch-assets.yml:91-104). The limit is process-global and is reset on every loop iteration, which is harmless. `git show 3c6c72e:.../dc_planning_fetch.py | grep -c field_size_limit` returns 0, so the cap is new in the HEAD commit.
PATTERN: bounded parser limits (raise the ceiling, keep a ceiling)

### F13 One status vocabulary for the merged pipeline, with "unknown" as a real class
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a7-merge/dc_pipeline.schema.json:250-261
QUOTE:
```json
    "status": {
      "type": "string",
      "enum": [
        "operational",
        "under_construction",
        "consented",
        "in_planning",
        "connection_request",
        "announced",
        "refused_or_withdrawn",
        "unknown"
      ]
```
WHY: Lanes use their own spellings: DC-A1 and DC-A3 write "in planning" and "connection request". DC-A2 adds "withdrawn", "refused" and the honest `"decided (outcome not stated)"` (dc_planning_fetch.py:235-236). dcingest.py:54-62 (STATUS_MAP) maps them, and `norm_status` returns `"unknown"` for anything unmatched (line 136). dcmerge.py:404-406 never lets "unknown" outrank a known status: `out["status"] = sts[0][0] if sts else "unknown"`. HEAD by_status (jq on metadata.summary): operational 202, announced 12, in_planning 8, consented 4, unknown 1, total 227. Reconciled by lane: operational 200 (A4) + 4 (A3) - 2 merges = 202; in_planning 6 (A3) + 3 (A2) - 1 merge = 8. "operational" in DC-A4 means only `mapped in OpenStreetMap/Wikidata as an existing data centre; not independently verified` (dc_a4.py:321-322).
PATTERN: closed status enum with an explicit unknown; status_source_id kept

### F14 A status the government page contradicts is recorded as unknown, not chosen
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a3-gov/gov_sites.py:293-299
QUOTE:
```python
    dict(id="gov-appeal-woodlands-park-iver", name="Woodlands Park landfill site, land south of Slough Road, Iver", operator="Greystoke Land Ltd (per secondary reports; not confirmed from gov.uk)",
         kind="data centre", gov_designation="recovered appeal decision 9 Jul 2025 (approval; see conflict)", status=None,
         status_note="gov.uk publishes the 9 Jul 2025 decision ('up to 72,000 sqm (GEA) delivered across 2 buildings'). Secondary press (The Register, 23 Jan 2026) reports that the government conceded the approval should be quashed after a legal challenge. Current status UNKNOWN.",
         status_as_of="2026-10-29", country="England", place="Iver, Buckinghamshire",
         lat=51.52, lon=-0.52, location_precision="town",
         it_load_mw=None, grid_connection_mw=None, other_mw=[], stated_targets=[],
         conflicts=["gov.uk decision (approval, 9 Jul 2025) vs reported concession to quash (Jan 2026, non-OGL secondary source). The gov.uk page metadata updated 2026-10-01; re-check."],
```
WHY: This is the single `unknown` among the 227. The OGL page says "approved". A non-OGL source says "to be quashed". The lane writes `status=None` and keeps both facts in a conflict note, rather than letting either source win. The operator is hedged inline ("not confirmed from gov.uk"), and `coordinates_source` is stamped `DC-A3 approximate centroid of the named place; NOT from the source` (gov_sites.py:441-442). DC-A3 by status (python -I): announced 12, in planning 6, consented 4, operational 4, None 1, total 27. By precision: town 21, region 5, exact 1. 4 records carry an "unverified" licence note.
PATTERN: conflicting sources produce unknown plus a conflict note, never a silent pick

### F15 A shared document URL is a key only when it is rare and comes from a different lane
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a7-merge/dcmerge.py:211-219
QUOTE:
```python
def url_link(a, b, dist):
    """Shared document URL counts only across DIFFERENT lanes (a lane has already de-duplicated
    itself, so two of its records citing one press release are two sites), and never when both
    points are placed (finer than region) more than URL_MAX_KM apart."""
    if not (url_keys(a) & url_keys(b)) or (_lanes(a) & _lanes(b)):
        return False
    if dist is not None and dist > URL_MAX_KM and THRESHOLD_KM[coarser(_precision(a), _precision(b))] is not None:
        return False
    return True
```
WHY: Three brakes on the weakest strong key: `URL_KEY_MAX_RECORDS = 2  # a URL is a site key only if at most this many input records cite it` (line 40, applied at lines 518-522), the different-lane rule, and a 25 km ceiling (line 204). Only paths with at least 2 segments count (lines 186-193), so a homepage never links. The one HEAD merge by this rule is Bedford, which joins dc-a3-gov:MHCLG:gov-s35-questpit-bedford with the DC-A2 s35 seed (`"rule":"evidence_document"`, distance null). See F18 for a lane-label bug that weakens the different-lane brake.
PATTERN: rarity-gated evidence keys (a widely cited document is not an identity)

### F16 Licence evidence is quoted per source, with the unverified links named
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/NOTICE:60-66
QUOTE:
```text
dc-a2-planning (DC-A2)  planning.data.gov.uk (planning-application, infrastructure-project),
  the Planning Inspectorate NSIP download, and LPA open feeds (Camden, Adur, Worthing,
  Doncaster via digital-land). OGL v3.0: planning.data.gov.uk dataset pages say
  "Licensed under the Open Government Licence v.3.0"; the PINS footer says "All content is
  available under the Open Government Licence v3.0, except where otherwise stated". The
  Camden, Adur and Worthing feeds are recorded as ogl3 in digital-land's source register;
  their own publisher pages were not re-read.
```
WHY: The OGL v3 evidence is a quotation with its location, and the gap is written down ("not re-read"). ODbL evidence is at NOTICE:10-16 (`"OpenStreetMap® is open data, licensed under the Open Data Commons Open Database License (ODbL)..."` and `SHARE-ALIKE: a database that republishes or merges these records is an ODbL database.`). NOTICE:80-81 carries that into the merge: `The merged database is ODbL wherever an OSM source contributes.` The lane carries the same evidence per source: dc_planning_fetch.py:41-42 `"licence_evidence": "dataset page: 'Licensed under the Open Government Licence v.3.0'; "`. ci/verify.py:98-99 fails if the NOTICE entry for a registry id is missing (`NOTICE has no entry '{sid}  (open: {entry['open']})' matching the registry`).
PATTERN: licence evidence as quotation plus URL, with verification enforced by string match

### F17 Byte-identical rebuild is the reproducibility test, and it holds at HEAD
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 reproduce.py:184-190
QUOTE:
```python
                rebuilt = {rel: sha256_bytes((ldir / rel).read_bytes()) if (ldir / rel).exists() else None
                           for rel in lane.get("outputs", [])}
                same = not any(codes) and rebuilt == res["outputs"]
                res["rebuilt"] = "identical" if same else "DIFFERENT"
                if not same:
                    diff = [rel for rel in rebuilt if rebuilt[rel] != res["outputs"].get(rel)]
                    mismatches.append(f"{domain}/lanes/{lid}: rebuild differs from the pins ({diff or codes})")
```
WHY: I re-ran it by hand in a scratch copy, not in the clone. Rebuilt hashes:
- DC-A7: uk_datacentre_pipeline.geojson `176c1b2e894943618c1dd866b3a96c9f3e00bcded8c6e88a5263b0048ae22d89` and rejects `dcf72c035d23de7bfb63449450211d575351145a6e61dc3acae1dd7764ab211f`
- DC-A4: dc_operational.json `6628e707...b5c494c4`, .geojson `0d8318ed...9c4c2c8`, counts.json `ca71f291...0b7b6`
- DC-A2: dc_planning.geojson `e44b0eff...02b022` and manifest.json `544e6da8...10b624`

Each equals its MANIFEST.json pin. .gitattributes:4-6 protects this: `# Pinned snapshots and outputs are byte-exact (sha256): never convert line endings.` / `datacentres/** -text`. The DC-A2 raw CSVs are CRLF (commit 3c6c72e message). DC-A4 keeps the wall clock out: `--retrieved ... (kept out of the clock for determinism)` (dc_a4.py:497).
PATTERN: pin everything, rebuild offline, compare hashes; disable eol rewriting for pinned bytes

### F18 DEFECT: lane identity comes from the directory basename, so DC-A2 and DC-A4 are both labelled "out"
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a7-merge/dcingest.py:395-398
QUOTE:
```python
def load_lanes(dirs):
    recs, rejects, inputs = [], [], []
    for d in dirs:
        lane = os.path.basename(d.rstrip("/"))
```
WHY: lanes.json:196 and :198 pass `../dc-a2-planning/out` and `../dc-a4-osm-wikidata/out`, so both get `lane = "out"`. The published source ids show it: `out:s35-seed:dc-a2:s35:EN0110030` and `out:OpenStreetMap via globalgrid2050 datacentres.geojson:gg2050-dc-197`. metadata.summary.by_source has the keys `out:OpenStreetMap via globalgrid2050 datacentres.geojson` (199) and `out:s35-seed` (3). Consequences: (a) provenance names a directory, not a lane (dc-a3-gov is labelled correctly because its path has no `out`); (b) `url_link`'s different-lane brake (F15) treats every DC-A2 and DC-A4 pair as the same lane, so a planning record and an OSM record citing one document can never link by URL; (c) `sites_from_several_lanes` (2) undercounts any A2 and A4 joins. Two lanes in the same list (`../dc-a1-neso/out`, `../dc-a5-dno/out`) do not exist. `glob` returns nothing for them, and `metadata.inputs` simply has no entry, so a missing lane is silent at merge time. The licence gate (F11) is the reason they are absent, but the merge itself does not say so.
PATTERN: (anti-pattern) identity derived from a filesystem path

### F19 WEAKNESS: two pin or quote checks warn instead of failing
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a4-osm-wikidata/dc_a4.py:388-391
QUOTE:
```python
        if not a.legacy or not os.path.exists(a.legacy): sys.exit("no live Overpass snapshot and no --legacy file")
        h = sha256_file(a.legacy)
        if h != LEGACY_GG2050["sha256"]: print("WARNING: legacy file hash differs from pinned", h)
        recs += legacy_records(a.legacy); inputs["gg2050_datacentres.geojson"] = h; legacy = True
```
WHY: The legacy globalgrid2050 snapshot feeds 199 of the 227 sites, and a hash mismatch only prints. It is caught later by the repo's MANIFEST pin (assetpipe/lanes.py:218-219), so this is defence in depth, not a hole, but the lane alone does not fail closed. Similarly, gov_sites.py:549-557 counts quote misses (`print(f"quote verification: {miss} missing")`) yet returns `0 if all("sha256" in m for m in manifest) else 2`: a quote that vanished from a gov.uk page does not change the exit code. Both are one-line hardenings.
PATTERN: (gap) warn-only integrity checks inside a fail-closed system

### F20 Every one of the 258 source entries in the merge is marked licence_status "unverified"
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a7-merge/dcingest.py:264-268
QUOTE:
```python
        srcs.append({
            "id": "%s:%s:%s" % (lane, dataset, ref), "lane": lane, "dataset": str(dataset),
            "record_ref": str(ref), "url": str(url), "licence": lic, "licence_url": str(lic_url),
            "licence_status": "verified" if status_v == "verified" else "unverified",
            "attribution": s.get("attribution") or r.get("attribution") or meta.get("attribution"),
```
WHY: Status is "verified" only if a lane emits `licence_status: "verified"`. `grep -rn licence_status --include=*.py` outside dc-a7-merge finds 0 hits, so none does. `grep -o '"licence_status":"[a-z]*"' .../uk_datacentre_pipeline.geojson | sort | uniq -c` returns `258 "licence_status":"unverified"`. That is conservative, which is correct under "unknown, not verified". But it means the per-record field disagrees with lanes.json, which declares DC-A2, DC-A3 and DC-A4 `"open": "yes"` with quoted OGL and ODbL evidence (F16). The metadata caveat `Licences marked 'unverified' have not been checked against the publisher's terms.` (dcingest.py:493) therefore reads as "nothing was checked".
PATTERN: conservative default with no path to the positive state (a schema slot never filled)

## Patterns (keyed; each cites at least one F above)
- **Hard cannot-link before strong evidence** (F1, F2, F3). The operator guard sits above refs and URLs and repeats across whole clusters, and the OSM lane asserts it after clustering. Its cost is F4: exact equality on a token-stripped string over-separates parent and subsidiary naming. A guard needs its own false-split test, not only a false-merge test.
- **Unplaced, not inferred** (F5, F6). A null geometry is a valid, validated state. `precision` must be "unknown" exactly when there is no point. Result: 227 features, 225 geometries, and both nulls are explainable (one genuinely unplaced, one an F4 twin).
- **Unknown is null / absent, never zero** (F7, F9, F13, F14). The rule holds at four levels: file (NESO deletes stale outputs), field (MW `value: None`), status (`"unknown"`, never outranking a known status), and conflict (Iver).
- **Deterministic provenance-retaining join** (F8, F15, F17). Canonical sort, fixed rule priority, sha256-derived ids, and `sources[]` plus `match[]` on every site. Byte-identical rebuilds verified at HEAD for A2, A4 and A7.
- **Licence as code** (F10, F11, F16, F20). An allow-list regex at ingest, outputs from unverified lanes blocked by verify, and evidence quoted in NOTICE and checked by string match. Gap: F20, the per-record `licence_status` never becomes "verified".
- **Bounded leniency** (F12). Raise a parser ceiling to the measured need (4 MiB), never to infinity.
- **Path-derived identity is fragile** (F18). Two lanes collapse to "out".

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)
- Clone history is 15 commits (`git rev-list --count HEAD`). The datacentre slice arrived in 3 commits within 34 min 49 s on 2026-10-29, after the licence commit:
  - `3ca8cfd179b0468b4d42f49590da5a0fd1dff9b8` 2026-10-29T21:18:39+00:00: Apache-2.0 for code, third-party data terms kept (LICENSE +202, NOTICE +51).
  - `3c6c72e499cda06c0a780b2e0a3f4f0e5b68a6bd` 2026-10-29T21:19:02+00:00 "Add reproducible data-centre and conventional generation pipelines (#73)". A squash of 7 sub-commits (scaffold, vendor lanes, add DC-A5, add DC-A2, keep CRLF byte-exact, two resyncs), with Claude Opus 5.5 co-author trailers. Merged baseline: 204 sites / 203 placed / 208 inputs / 4 multi-record sites (jq on `git show 3c6c72e:` output).
  - `69b566dd53d7bd323819195b5b33c77cdb998f51` 2026-10-29T21:36:03+00:00 "Prevent cross-operator data-centre merges; regenerate pinned 227-site baseline (#73)". The turning point. Sub-commits include "Add one-shot branch-only offline regeneration (remove after #73 repair)" and then "Remove temporary #73 baseline rebuild trigger". Co-authored by github-actions[bot], which rebuilt the baseline. 8 files, +3121/-1270. Result: 227 / 225 / 230 inputs / 3 multi-record sites. It also introduced the F4 Wapseys split (pre-fix the pair was one evidence_document match).
  - `b57c94d4e964df2de0dea2786781c6d07a967ea1` 2026-10-29T21:53:51+00:00 "Bound OGL planning CSV field size at 4 MiB with pinned reproducible parser (#73)". HEAD. +3 script lines, 118 MANIFEST lines re-pinned.
- Earlier history (ETYS network products) runs from 2026-09-01T17:35:14+01:00 (`7efd44a`) to `5181de3` 2026-09-03T04:02:57+00:00, with three bot refreshes all reporting "886 connection points, 1392 circuits".
- Authorship: every human commit is by the Ventusltd account. Bot co-authorship appears in 69b566d and the refreshes. No reverts in the clone (`git log` shows none).
- Docs drift: docs/METHODS.md:118 still says `DC-A4: 190 sites from the legacy OSM snapshot` (the pre-69b566d figure). HEAD counts.json has `"sites_total": 212`. MANIFEST.json has no `last_fetch` entry for any lane (`grep -c last_fetch datacentres/lanes/MANIFEST.json` returns 0), so no lane has a recorded live fetch. Every committed output is an offline baseline (DC-A4 counts.json: `"mode": "legacy globalgrid2050 snapshot (Overpass and Wikidata unreachable from this session)"`).

## Gridatlas and datacentre relevance (how this slice bears on the focus)
- The 227 / 225 numbers in the brief are reproduced exactly from the committed merge (`jq` returns `[227,225,2]`). Lane arithmetic: 212 DC-A4 sites - 12 cable-landing rejects = 200; plus 27 DC-A3 and 3 DC-A2 = 230 inputs; minus 3 merges (Bedford A2+A3 by evidence document, Google Waltham Cross A3+A4 by name and distance at 1.4707 km, Ark Data Centres A4+A4 at 0.2437 km flagged `same_source_duplicate`) = 227.
- Correction to carry into the edition: because of F4, the 227 includes Wapseys Wood twice (placed dcuk-4ad498e7880d6ba4, unplaced dcuk-bf4650ea1c4a8a0b). There are 226 distinct sites; 225 mappable is correct. If gridatlas draws only placed features, the map is unaffected. Any count that cites "227 sites" overstates by one.
- Composition: 199 of 227 sites are ODbL (OSM via the globalgrid2050 snapshot, name and operator only). Only 5 sites have IT load and 2 have grid connection MW, all from government or s35 text. NESO and DNO lanes contribute nothing until their licences are confirmed (F11). For the 06b-dc-engine, this means MW is almost entirely null, by design.
- `status` is "operational" for 202 sites, but for OSM-derived sites that means "mapped as existing; not verified" (F13). Any atlas legend should carry that sentence.

## Candidates (unkeyed; clearly marked)
- CANDIDATE: the gridatlas generation 202610292044 (per the brief) has a stamp 52 minutes earlier than 69b566d (2026-10-29T21:36:03+00:00) if both are UTC. The 227 baseline may therefore have been produced in the GridAtlas #73 lane work and vendored here afterwards, rather than the other way round. I did not read gridatlas, so this is unverified.
- CANDIDATE: a narrower operator canonicaliser that drops parentheticals and keeps "holdings" would re-join Wapseys Wood without reopening Slough (Digital Realty vs Global Technical Realty still differ). Not tested here.
- CANDIDATE: `dcingest.DEFAULT_LANES` points at `hardening/evidence/DC-A1..A5`, paths that do not exist in this repo. That is harmless because lanes.json always passes `--lanes`, but it is a leftover from the GridAtlas layout.

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)
1. dcmerge.py:236-239 (F1): the Slough law in four lines. Identity guards come before evidence keys.
2. dc_a4.py:235-240 (F2): "a site containing distinct known operators is invalid, not a conflict to hide". Fail closed on the invariant.
3. dc_planning_fetch.py:114-116 (F5): "no coordinates are invented: geometry stays null unless a source gives one".
4. fetch_neso.py:409-411 (F7): "Empty record files would read as 'zero data centres', and unknown is not zero."
5. dc_planning_fetch.py:386-388 (F12): "Keep a finite 4 MiB ceiling; oversized/untrusted data still fails closed."
6. dcmerge.py:122-128 with F4 as a cautionary pair to F1: the same edit that fixed Slough split Wapseys Wood. Every guard needs a false-split test as well as a false-merge test.
7. gov_sites.py:294-295 (F14): `status=None` with "Current status UNKNOWN": a status two sources disagree on stays unknown.

## One next command (exactly one, runnable from a clone)
git -C /home/user/estate/gridatlas grep -n -I -e dcuk-bf4650ea1c4a8a0b -e dcuk-4ad498e7880d6ba4 HEAD | cut -c1-200
