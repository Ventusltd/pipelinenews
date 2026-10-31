# C2 — Grid Atlas data planes and the data-centre sources

Controller C2 (Claude Fable 5.1), Kuiper edition 202610311905. Written 2026-10-31T19:25:00Z. Workers reviewed: W04 (gridatlas history), W05 (gridatlas data planes), W07 (data-grid-gb datacentre lanes), W08 (data-centres-gb producer). Clones read, never changed: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e (shallow, 311 commits), data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 (15 commits), data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 (13 commits). Every KEY below was re-resolved by a script in /tmp (`git cat-file -e <sha>^{commit}`, then `git show <sha>:<path>` and a line-range match on the first quoted line).

**Keys verified: W04 28 of 28, W05 39 of 39, W07 20 of 20, W08 16 of 16; overall 103 of 103 (all CONFIRMED, none SHIFTED, none UNVERIFIED).** W04's keys point at the tree of the quoted commit, with a HEAD-KEY where the bytes are identical at HEAD; both forms were checked. Numeric spot-checks appear in History and Defects; each was re-run. Disclosure: `git status --ignored` on gridatlas shows one untracked, git-ignored `tools/offshore/__pycache__/` (files dated 2026-10-31T19:09Z and 19:13Z, before this controller ran; consistent with W05's importlib runs). No tracked file in any clone changed; data-grid-gb and data-centres-gb are clean. I did not remove it.

## What this part of the estate is

Grid Atlas V9 is a live map with an immutable shell and hashed cartridges; `atlas/current.json` is the pointer that decides what a browser composes. Beneath the drawing is a set of data planes: a REPD browser registry of 11,069 rows compiled from the official CSV through a pinned EPSG:27700 to EPSG:4326 transform, a DuckDB/Parquet search plane whose digest is pinned in the postcode cartridge, offshore lease points taken by point-on-surface, a NESO connection-site join that tells the map where a project declares it connects, and, since 2026-10-29, a data-centre GeoJSON of 227 records pinned by SHA-256 and drawn by the Grid Engine 30/30/30 module. The pointer at HEAD (v9.187, generation 202610292044) names that module at 71,191 bytes under an owner-approved 80,000-byte budget.

The data-centre sites do not originate in gridatlas. Two producers made them. data-centres-gb (August 2026) is the strictest: one hashed Overpass query, every relationship an ABSTAIN slot, byte-identical double compile, no fetch on read. data-grid-gb's `datacentres/` lanes dc-a1..dc-a7 (29 October 2026, three commits in 35 minutes) are what gridatlas vendors: NESO (dc-a1), planning (dc-a2), government s35 and appeal pages (dc-a3), OSM plus Wikidata (dc-a4), DNO (dc-a5) and the merge (dc-a7). Two lanes, NESO and DNO, hold only scripts because their licences are unverified and the verifier refuses their outputs. The merged file is 227 features, 225 with geometry, sha256 `176c1b2e…2d89`, and that digest is the one gridatlas pins as `DCFSHA`. This chapter follows a site from a public register to a pin on the map, and what refuses it on the way.

## The best lines, ranked

1. **The Slough guard: identity before evidence.** KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a7-merge/dcmerge.py:236-239
```python
    # Hard guard BEFORE planning refs, connection refs or shared URLs. Even a
    # shared government document can name unrelated operators at nearby sites.
    if operator_match(a.get("operator"), b.get("operator")) is False:
        return None
```
Two known, different operators are never one site, even through a shared planning reference. `operator_match` is three-valued (True, False, None for unknown), and `cannot_link` (dcmerge.py:262-268) repeats the test cluster-wide so no unknown-operator record bridges two known ones. This repaired the 203-site "incorrect cross-operator merges" gridatlas deleted the same evening. Its cost is D1.

2. **Unknown is not zero, in code.** KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a1-neso/fetch_neso.py:409-417
```python
    if not manifest["snapshots"]:
        # Nothing fetched: write only the manifest. Empty record files would read
        # as "zero data centres", and unknown is not zero.
        for stale in ("neso_connections.normalised.json", "neso_dc_like.normalised.json",
                      "neso_dc_like.geojson", "counts.json"):
            (out / stale).unlink(missing_ok=True)
```
A total fetch failure deletes stale outputs rather than writing an empty FeatureCollection. The same rule is the schema's `null means unknown, never zero` (dc_pipeline.schema.json:5) and the README's `Unknown is null, not zero.` (datacentres/README.md:8), both re-read.

3. **One `or 0` manufactures the National Grid false origin.** KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e compiler/202608290716-compile-atlas-v9.py:102-108
```python
                x = float(row.get("X-coordinate") or 0)
                y = float(row.get("Y-coordinate") or 0)
                lon, lat = transformer.transform(x, y)
```
A blank REPD cell becomes easting 0, northing 0, and EPSG:27700's origin transforms to (-7.55716, 49.766799). Re-run from /tmp with the estate's own `osgb36_en_to_wgs84(0.0, 0.0)`: exactly that. The GB bounds test on line 108 admits it. 36 registry rows carry the placeholder (re-counted), 76 tracked files mention `49.766807` (re-counted), and the live release spends a function refusing it (next line).

4. **Both zeros named and refused, and the excluded count pinned.** KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e compiler/202608291430-compile-atlas-v9-live.py:126-133
```js
    && !(record.latitude === 0 && record.longitude === 0)
    && !(record.latitude === 49.766807 && record.longitude === -7.55716);
```
The contract closes the arithmetic: `"rows": 11069, "selectable_rows": 11033, "excluded_false_origin_rows": 36` (contracts/202608291430-atlas-v9-live-release.json:46-48, re-read). Excluded rows stay visible and unselectable rather than vanishing.

5. **Bind or write nothing.** KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offshore/reconcile_offshore_coordinates.py:16-18
```text
The governing rule is bind or write nothing. A row with no defensible public
source is omitted. An omitted row is a good outcome. A fabricated one is the
worst possible outcome, because the map prints it as fact.
```
The coordinate law in three lines, with the Ayre/Bowdun case (two 1008 MW leases 200 km apart) as the proof that name similarity is silent when wrong (lines 26-33).

6. **Every relationship is an ABSTAIN slot.** KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608281053-osm-data-centres.py:464-475
```python
                    "UNRESOLVED",
                    None,
                    "NOT_SCORED",
                    "ABSTAIN",
```
The frozen federation contract records 306 element rows, 612 relationship rows, `"ABSTAIN": 612`, `"eligible_for_join": {"false": 612}` and `"llm_may_establish_binding": false` (lines 26-27, 110-121, 130-131, re-read). A name string never becomes an ownership fact.

7. **A 200 with a remark is a failure.** KEY: data-centres-gb@f9f47286fae63872375c558fc89ff4b1793914e4 build/python/202608281053-osm-data-centres.py:316-325
```python
    if not isinstance(payload, dict) or payload.get("remark"):
        raise RuntimeError("Overpass payload is partial, invalid or contains a remark")
```
Overpass signals a timeout inside a successful HTTP response. The producer refuses a shrunken answer, bounds the element set, and demands the OSM base timestamp.

8. **Agents cannot accept their own work.** KEY: gridatlas@1adbd24a50019237ffa5944ee43358ddcc74f9b0 tools/release/flow-lib.mjs:150-155 (identical at HEAD)
```js
export function trustedActor(user, app, body = '') {
  if (!user || !OWNER_LOGINS.includes(user.login)) return { ok: false, why: `by ${user?.login ?? 'unknown'}, not an owner login (${OWNER_LOGINS.join(', ')})` };
  if (app) return { ok: false, why: `posted through the GitHub App ${app.slug || app.name}` };
  const sig = AGENT_SIGNATURES.find(re => re.test(body));
```
Agents push with the owner's token, so login proves nothing; the gate reads signatures. The commit that introduces it would fail its own test.

9. **Content-addressed pins, from September to the data-centre file.** KEY: gridatlas@4a17fa3a48b2617716070a8a1a7601c31d68c70b atlas/modules/202609030137-pinned-products.js:48-58 and KEY: gridatlas@5cf426a1fd545499bfb2972afc14bf74defe899e tools/offtakers/src/01-data.js:18-19
```js
DCF='https://ventusltd.github.io/gridatlas/data/uk_datacentre_pipeline_202610292136.geojson',DCFSHA='176c1b2e894943618c1dd866b3a96c9f3e00bcded8c6e88a5263b0048ae22d89',
```
The v9.83 pin (commit + sha256 + bytes, "a length catches first") is the discipline the data-centre swap uses seven weeks later. Re-hashed: the gridatlas blob at d3f4eb1, the file at HEAD, and data-grid-gb's dc-a7 output all equal `176c1b2e…2d89`.

10. **Licence as an executable allow-list, and the verifier that enforces it.** KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a7-merge/dcingest.py:106-113 and KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 assetpipe/lanes.py:220-224
```python
    if re.search(r"(^|[^a-z])(nc|nd|sa)([^a-z]|$)|non.?commercial|no.?deriv|share.?alike|by-sa", key) and "odbl" not in key:
        return None  # not fully open under the owner rule (ODbL is the one allowed share-alike)
```
NC, ND and share-alike are rejected at ingest except ODbL; outputs from a lane whose `open` is not `yes` fail verify. That is why dc-a1-neso and dc-a5-dno contain one script each (re-listed) and why only 2 of 227 sites have a grid-connection MW.

11. **The NESO join refuses to invent a connection.** KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offshore/fetch_neso_connection_sites.py:31-39
```text
It never invents a connection. A project that is not in either register gets no
record: nineteen of the ninety-seven are in that state, almost all of them
pre-2010 farms that connected through a DNO before these registers began, and
"absent from the register" is a fact worth printing rather than a gap worth
filling.
```
769 matched, 10,300 unmatched, 2 CONFLICT (re-counted). For a data centre, a declared register connection beside a measured nearest-substation distance is the honest answer; the counter-example is defect D3.

12. **Proximity never establishes identity.** KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e contracts/202608290716-atlas-v9-source.json:34-39
```json
    "relationship": "REPD operator or applicant as published; never relabelled owner",
    "proximity": "never establishes project identity or involvement"
```
Pinned in three contracts and compiled as an invariant (tools/v9_5/compiler.py:270-273). A data centre near a substation is not connected to it.

13. **No coordinates are invented; the schema forbids a half-point.** KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a2-planning/dc_planning_fetch.py:114-116 with dcschema.py:114-119
```python
# Hand-curated because no machine-readable feed was reachable; no coordinates
# are invented: geometry stays null unless a source gives one.
```
This is why 227 features carry 225 geometries. `jq` returns `[227,225,2]` (re-run).

14. **The data-centre engine's birth certificate.** KEY: gridatlas@4fa72ae0927f335fd1265e93b28992315cdb55a3 tools/offtakers/src/06b-dc-engine.js:1-9 (identical at HEAD)
```js
/// Substations: the original link.measure.nearestSubstations returns LINK_COUNT = 5, a closure constant with no limit
/// argument (sld-sandbox 202609241334 :1664, :3513), so the 30 come from the engine's own Grid Finding Scope
```
The new 30 reuse the shipped scope and the old 5 must head the list: extension with a cross-check, cited to lines in an immutable cartridge.

## The patterns these lines share

- **Identity by exact key; evidence is not identity.** Slough guard (W07 F1, F2, F3), proximity rule (W05 F9), ABSTAIN ledger (W08 F5), NESO alias evidence (W05 F12). The anti-pattern is the NESO prefix fallback (W05 F13).
- **Unknown is null or absent, never zero.** W07 F7 (file), F9 (MW field), F13 (status enum with `unknown`), F14 (Iver, two sources disagree, status None); W04 F11 ("unsearched or lost time is unknown, not zero"); W04 F14 (225 drawn of 227 records). The root failure of this pattern is W05 F1: `or 0`.
- **Fail closed on soft or absent evidence.** W08 F1 (remark), F2 (untagged element), W04 F6 (missing proof), F7 (skip is not a pass), W07 F2 (raise on cross-operator site), F12 (finite 4 MiB ceiling).
- **Content addressing at every hop.** W04 F3, F14, F15; W07 F8 (sha256 ids), F17 (23 of 23 MANIFEST pins re-hashed: all match); W08 F3/F4 (double compile); W05 F7 (pinned V8 oracle, 10,610 of 10,784).
- **Licence as code.** W07 F10, F11, F16; W08 F7 (Data Center Map `network_requests: 0`, asserted by doctor and verify).
- **Correction stored as data.** W05 F4 (wrong / right / cause), W08 F12 (a repair names the failed run it repairs).
- **Separation of duties.** W04 F1 (signature-exclusion gate), F2 (refuse the one-step loader release), F15 (pointer-only release from an accepted preview).

## History (keyed by SHA)

**gridatlas, 311 commits from the graft f3ba7a31 (2026-09-01T14:43:56+01:00) to cacb69a7 (2026-10-29T23:41:04+00:00).** Re-run: `git rev-list --count HEAD` = 311; `git shortlog -sn` = Ventusltd 268, Claude 41, Vikram Kumar 2; merges 6; subjects beginning "Revert" 0; subjects containing "overnight" 51; subjects containing "#73" 15; commits between 21:00 and 03:59 UTC 196 of 311. Two storms, both re-counted by day: 2026-09-01 alone has 63 commits (the first storm runs 09-01 to 09-05, 177 commits, v9.51 to v9.138), and 2026-10-29 has 61 (the second runs 10-27 to 10-29, 83 commits). Turning points: 270c9994 (missing proof is a failure), 8e017d5e (first outage, restored by recomposition), 9118a2db (skip is not a pass), 60d19382 (Codex stop-ship: 573 buses, 238 components), 4a17fa3a (pins), 1762170b (verified rollback), 8fe77a54 and 78e49b0f (print outage; the parse gate "is a DETECTOR there, not a gate"), efb844b9 (audit instead of delete, then the 23.7-day silence), 1eb64148 (lightning rolled back in 55 minutes), 1adbd24a (trustedActor), 61fee61f (R-cifix MAJOR, obeyed within 40 minutes), 4fa72ae0 (the engine), cacb69a7 (release). Pointer moves recording their authority: 4 (3235a34d, 08b5caea, f0f449b4, cacb69a7; W04's next command re-run).

**The 204 to 227 transition, settled across two repositories.** In data-grid-gb: 3ca8cfd1 2026-10-29T21:18:39Z (Apache-2.0 for code); 3c6c72e4 21:19:02Z adds the lanes, merge output `[204,203]` (re-counted from the blob); 69b566dd 21:36:03Z "Prevent cross-operator data-centre merges; regenerate pinned 227-site baseline", 8 files, +3,121/−1,270, co-authored by github-actions[bot] (re-read), output `[227,225]`; b57c94d4 21:53:51Z bounds the CSV field size at 4 MiB (`field_size_limit` appears once at HEAD and zero times at 3c6c72e, re-grepped). In gridatlas: 4fa72ae0 20:40:02Z ships the engine against the 203-site file `202610292014` (203 features, 203 geometries, sha `f9f056c2…`, re-hashed); d3f4eb10 21:37:34Z vendors the 227-site file (sha `176c1b2e…`, 94 seconds after 69b566dd); 5cf426a1 21:37:59Z moves the `DCFSHA` pin; aca16f6a 21:40:17Z proves the Slough operators separate; 57ed0749 21:43:25Z deletes the 203-site blob (numstat `0 1`); 79eb77fa 21:50:34Z sets the browser test to 225 mappable and two unlocated. This settles W07's candidate: the 227 baseline was built in data-grid-gb and vendored into gridatlas, not the reverse. DC-A4's own counts moved 190 to 212 sites and 50 to 28 duplicates merged (both counts.json blobs re-read).

**data-centres-gb, 13 commits.** Six scraper-era commits in 20 minutes on 2026-07-29 (9263635's `app.py` called `requests.get` and `BeautifulSoup` in the request handler; re-read at lines 119-135), then 0f4e8ac on 2026-08-28T11:04:26+01:00 deletes the scraper and introduces the ABSTAIN ledger. The storm of 2026-08-28 is 5 commits in 8 h 41 m answering three failed production runs, each by a timestamped successor citing the failed run; four candidate workflows remain side by side (re-listed). f9f4728 (2026-09-01) pins LF.

**gridatlas data planes.** The coordinate night of 2026-09-07: 2e5879fc 04:20:12+01:00 creates the catalogue with the wrong figures; db5338bf 04:23:26 corrects them 3 min 14 s later ("the register was fine, my parser was not"; both times re-read). The connection night of 2026-09-08: 5c41ec49 01:47:35 brings the NESO register and the reconcile rewrite, the largest post-graft commit (+69,517 lines).

## Gridatlas and datacentre relevance

The pin on the map is the end of a chain: OSM or a government page, a lane with a licence verdict, dcingest's allow-list, dcmerge's identity guard, a sha256 id, a 227-feature file hashed once in data-grid-gb and pinned twice in gridatlas (`DCFSHA` in 01-data.js, the file under `data/`), the 06b engine that reuses the shipped Grid Finding Scope, and a pointer release the owner accepted. The weak links are the workers' defects: the NESO prefix fallback would bind a data-centre name to an unrelated register row if reused (D3), and a parenthetical parent company counts as a different operator (D1). 199 of 227 sites are ODbL OSM records whose "operational" means "mapped as existing; not independently verified" (dc_a4.py:321-322); MW is almost entirely null by design (5 IT-load, 2 grid-connection, re-read from metadata.summary). A legend quoting the 227 should say 226 distinct sites, 225 mappable.

## Defects and drift found by the workers

Status: CONFIRMED means I re-ran it; PLAUSIBLE means it is consistent with the file but I did not re-run it; UNVERIFIED means it could not be checked from the clones. These are candidates for the owner, not claims.

- **D1 CONFIRMED (W07 F4). Wapseys Wood (PINS EN0110030) appears twice in the 227.** `jq` over dc-a7's output for `EN0110030` or the name returns two features with one distinct name: `dcuk-4ad498e7880d6ba4` (placed; operator "Slough Holdings UK Limited (SDC Capital Partners)", source dc-a3-gov) and `dcuk-bf4650ea1c4a8a0b` (geometry null; operator "Slough Holdings UK Limited", source `out:s35-seed:dc-a2:s35:EN0110030`). At 3c6c72e they were one site joined by `"rule":"evidence_document"` with `name_similarity 1.0`. `norm_operator` yields `'slough'` and `'slough sdc capital partners'`, so `operator_match` returns False (run from /tmp with `-I -B`; no bytecode written, `git status --ignored` empty). The only other repeated name is "Unnamed data centre" (47 OSM records, expected). Both ids are also present in gridatlas's HEAD `data/uk_datacentre_pipeline_202610292136.geojson`. So: 227 records, 226 distinct sites, 225 mappable; the map is unaffected if it draws placed features only, but "227 sites" overstates by one.
- **D2 CONFIRMED (W05 F1, F2). 36 registry rows sit on the false origin.** `jq` on `data/repd_browser_registry_202608290716.json` returns 36 (wind_offshore 15, solar 5, wind_onshore 5, bess 4, solar_roof 3, tidal 2, hydro 1, hydrogen 1); the contract pins 11,033 + 36 = 11,069; `osgb36_en_to_wgs84(0.0, 0.0)` = (-7.55716, 49.766799). The root cause `or 0` is one token.
- **D3 CONFIRMED (W05 F13). Caledonian Papermill is bound to Caledonia Offshore Wind Farm.** `jq -c '.sites["34"]'` on the lean file the live SLD loads returns `{"site":"Greens 400kV Substation","mw":600.0,"status":"Scoping","register":"TEC","confidence":"MEDIUM","neso_name":"Caledonia Offshore Wind Farm"}`; the full record is `NORMALISED_PREFIX`, REPD technology biomass. The tool's own `normalise("Caledonia Offshore Wind Farm")` returns `'caledonia'`, and `'Howpark Wind Farm'` returns `'how'` (NOISE has no word boundaries). 294 of 769 records came through the prefix path.
- **D4 CONFIRMED (W05 F15). The annual offshore workflow passes `--root`; the tool's parser at HEAD defines only `--out`, `--offline`, `--check`** (re-grepped; `--root` existed at 98dd908 line 297). The 14 February run will exit at argparse. The committed output still lists Morecombe as `NO_LEASE_MATCH` and contains 4 workstation paths.
- **D5 CONFIRMED (W05 F5). coordinate-systems.json:176 still asserts 'Offshore' and 'DD4 0AD' appear in the coordinate column; line 186 says no non-numeric value does.**
- **D6 CONFIRMED (W05 F16). `regex_replace_once` passes `count=1` to `re.subn`, so it cannot see a second match** (`re.subn('a','b','aaa',count=1)` returns `('baa', 1)`).
- **D7 CONFIRMED (W05 F17). Two Earth radii:** 6371.0088 (reconcile_offshore_coordinates.py:470) and 6378.137 (fetch_far_end_converters.py:87), both re-read.
- **D8 CONFIRMED (W07 F18). Lane identity is the directory basename, so dc-a2 and dc-a4 are both "out"** (source ids `out:s35-seed:…` and `out:OpenStreetMap via …` in the merged file). This weakens the different-lane brake on URL links.
- **D9 CONFIRMED (W07 F20). All 258 source entries are `licence_status: "unverified"`** while lanes.json declares three lanes `open: yes`.
- **D10 CONFIRMED (W07 history). docs/METHODS.md:118 says DC-A4 has 190 sites; counts.json at HEAD says 212.** No MANIFEST entry has a `last_fetch`; every committed output is an offline baseline.
- **D11 CONFIRMED (W08 F16). data-centres-gb index.html:76-80 still presents Data Center Map as a "Source"** although docs/data-sources.md:26 excludes it and doctor asserts `network_requests: 0`.
- **D12 CONFIRMED (W08 comparison). dc_a4.py:26-34 reintroduces regex value selectors**, the form data-centres-gb banned after a production timeout; the committed baseline used the legacy snapshot, so the live query has not been exercised.
- **D13 PLAUSIBLE (W07 F7). dc-a2's manifest writes `"rows": null` for 6 unreached sources but `"candidates": 0` for 9 entries** (counts re-grepped; whether 0 is wrong there is a judgement I did not make).
- **D14 PLAUSIBLE (W07 F19). The legacy snapshot hash mismatch only prints a WARNING** (line 390 re-read); the MANIFEST pin catches it one layer up.
- **D15 UNVERIFIED (W04 F15). The PR #75 comment cited as authority by cacb69a7.** The clone holds the URL and time, not the comment; no GitHub API was used.

## What the new Kuiper edition should carry from this chapter

On the belt, in this order: dcmerge.py:236-239; fetch_neso.py:409-411; compile-atlas-v9.py:102-104 paired with compile-atlas-v9-live.py:131-132 (the `or 0` and the two refused zeros); reconcile_offshore_coordinates.py:16-18; osm-data-centres.py:464-475 with the tally `ABSTAIN: 612`; osm-data-centres.py:316-318; flow-lib.mjs:150-155; 01-data.js:19 (`DCFSHA`, the digest that ties three repositories); dcingest.py:112-113 with lanes.py:220-224; fetch_neso_connection_sites.py:31-39 paired with the Caledonian Papermill row as its counter-example; 06b-dc-engine.js:1-9. All are CONFIRMED in the register. Two defects deserve lines of their own: D1 (the edit that fixed Slough split Wapseys Wood: a guard needs a false-split test as well as a false-merge test) and D2 (one token, 36 rows, 76 files).

## One next command

```
jq -r '.features[]|select(.properties.name=="SDC M40 Campus (Wapseys Wood)")|[.properties.id,(.geometry!=null|tostring),.properties.operator,(.properties.sources|map(.id)|join(";"))]|@tsv' /home/user/estate/data-grid-gb/datacentres/lanes/dc-a7-merge/out/uk_datacentre_pipeline.geojson
```
(prints the two Wapseys Wood records with their operators and sources; one line after a repair, two today)
