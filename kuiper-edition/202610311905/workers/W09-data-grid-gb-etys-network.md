# W09 data-grid-gb-etys-network

HEADS: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e
(both equal to `proof/inventory.tsv`; data-grid-gb `git rev-list --count HEAD` = 15, gridatlas = 311)

Written 2026-10-31T19:40:00Z by W09 (Opus). Read only: verifiers were run with `python3 -B` so no bytecode was written; `git status --porcelain` was empty afterwards. JSON products were inspected with `python3 -I` scripts kept in `/tmp/w09/`, and never printed whole.

READ:
data-grid-gb/README.md (all 146 lines)
data-grid-gb/pipelines/build_network_model.py (all)
data-grid-gb/pipelines/fetch_sources.py (all)
data-grid-gb/pipelines/fetch_assets.py, run_lanes.py (line counts and grep)
data-grid-gb/derived/build_connection_points.py (all)
data-grid-gb/derived/verify_connection_points.py (all)
data-grid-gb/derived/verify_phase0_acceptance.py (all)
data-grid-gb/derived/connection-points.v3.json (python -I: header keys, join, counts, per-point stats)
data-grid-gb/derived/gb-transmission-network.v1.json (python -I: counts, node_code_convention, scenarios)
data-grid-gb/sources/sources-manifest.json (all)
data-grid-gb/sources/ (listing: the xlsx/geojson inputs are gitignored and are not on disk)
data-grid-gb/assetpipe/pipeline.py (all), assetpipe/schema.py (1-80, 133-150)
data-grid-gb/reproduce.py (all)
data-grid-gb/ci/verify.py (1-30, grep)
data-grid-gb/tests/test_assets.py, tests/test_lanes.py (test inventory)
data-grid-gb/conventional/README.md, conventional/lanes/dc-a6/build_conventional.py (1-48, 140-160), out/counts.md
data-grid-gb/chatgpt/README.md, chatgpt/ingest_etys.py (grep and 45-56), chatgpt/sources.json (grep)
data-grid-gb/datacentres/lanes/dc-a1-neso/fetch_neso.py (20-32), dc-a7-merge/out/uk_datacentre_pipeline.geojson (python -I)
data-grid-gb/docs/METHODS.md (grep), docs/routing/METHOD_AND_LIMITATIONS.md (155-210), other routing docs (grep)
data-grid-gb/.github/workflows/refresh_network_products.yml (all), .gitignore, .gitattributes
data-grid-gb git history: all 15 commits (log, --stat, and bot diffs)
gridatlas/tools/offtakers/src/06b-dc-engine.js (grep; lines 1-9, 51, 92, 105, 161)
gridatlas/atlas/current.json (595-620)
gridatlas/atlas/modules/202609030137-pinned-products.js (1-70)
gridatlas/atlas/cartridges/202609062358-substation-intelligence-v9-63.js (4008-4064, grep)

Counts used below (commands kept in `/tmp/w09/inspect.py`, run as `python3 -I /tmp/w09/inspect.py derived/connection-points.v3.json derived/gb-transmission-network.v1.json`):
- v3: 886 connection points, 489 located, 397 unlocated; matched_by = `exact_name_highest_voltage` 428, `exact_name_voltage_compatible` 22, `distinctive_tokens_highest_voltage` 39; 605 with fault current; 319 of those have rows at more than one voltage; 629 with planned changes; owners NGET 322 / SHET 240 / SPT 238 / OFTO 86; `join_context_key` null on 2 points. Highest kV of the unlocated: 132 kV 180, 400 kV 149, 275 kV 47, 220 kV 18, 150 kV 2, 155 kV 1.
- v1 network: 921 sites, 2,679 nodes, 1,392 circuits, 1,472 transformers, 2,230 planned changes (Addition 1,362 / Change 522 / Removed 346; circuit 1,520 / transformer 710; years 2026 180, 2028 648, 2030 864, 2033 538), 573 reactive units, 11 interconnectors, 7,316 published fault-current rows (peak 6,163 / minimum 1,153; 7,065 with a site code), 8 metrics, 5 winters 2025/26 to 2033/34. Nodes by inferred kV: 132 kV 962, 400 kV 580, 275 kV 488, None 649; `nodes_whose_voltage_is_not_declared_by_their_site` = 726.
- `python3 -B derived/verify_connection_points.py` gave `44/44 checks passed`. `python3 -B derived/verify_phase0_acceptance.py --summary-only` gave `"passed": 22, "total": 22`, run at 2026-10-31T19:30Z.

## Findings (keyed)

### F1 The disclaimer is in the payload, and the verifier guards its substance, not the sentence
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/build_connection_points.py:320-323
QUOTE:
```python
        "not_a_connection_assessment": (
            "Nothing here says a project can or cannot connect at a node. "
            "Queue position, committed connections, consent and commercial "
            "terms decide that, and no published appendix contains them."),
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/verify_connection_points.py:48-53
QUOTE:
```python
    # The substance, not one product's sentence: both must say that queue
    # position and commercial terms decide connection and that no appendix
    # carries them. Pinning the exact wording made this check about prose.
    check("it refuses to be read as a connection assessment",
          "no published appendix contains" in network["not_a_connection_assessment"]
          and "queue position" in network["not_a_connection_assessment"].lower())
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 README.md:52-56
QUOTE:
```markdown
**Nothing here says a project can or cannot connect at a node.** A rating
is a rating and a fault level is a fault level. Queue position, committed
connections, consent and commercial terms decide connection, and no
published appendix contains them. Both products carry that sentence in
their own payload, and the verifier fails if it is ever removed.
```
WHY: The limit on what the data means travels inside both JSON products (`network` at pipelines/build_network_model.py:329-333 too), not only in a README, so any consumer that reads the file also reads the refusal. The same check runs on the v3 payload at verify_connection_points.py:79-81. The grep in the brief ("Nothing here says a project can or cannot connect at a node") matches only README.md:52 and build_connection_points.py:321. No verifier contains that sentence. The verifier tests two substrings instead. I tested this in memory (`python3 -I /tmp/w09/disclaimer.py derived/connection-points.v3.json`). With the payload as published, the check is `True`. With the first sentence "Nothing here says..." deleted, it is still `True`. With the field emptied, it is `False`. So README.md:55-56 overstates the guard: removing the headline sentence alone would pass. The code comment at :48-50 says this was a deliberate choice of substance over wording.
PATTERN: payload-embedded disclaimer, checked for its substance

### F2 The 397 unmapped sites are published without coordinates, not dropped
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/build_connection_points.py:24-27
QUOTE:
```python
distinctive-token match - and every tier is counted in the product. A site
that does not join is published WITHOUT coordinates rather than dropped,
because a consumer that needs to know a node exists should not be told it
does not merely because nobody has mapped it.
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/verify_connection_points.py:102-105
QUOTE:
```python
    check("unlocated sites are published rather than dropped",
          join["unlocated"] > 0
          and sum(1 for p in points["connection_points"] if "location" not in p)
          == join["unlocated"])
```
WHY: Absence of geometry is not taken to mean absence of the node. The product says so in its own `join.unlocated_are_published` field (build_connection_points.py:336-338), and the verifier ties the declared count to the actual missing-location rows. It also checks `exact_name + distinctive_tokens + unlocated == len(points)` (:91-93): 450 + 39 + 397 = 886. The unlocated sites include 180 at 132 kV and 149 at 400 kV, so a "nearest located point" search can miss a real, nearer node. See the relevance section.
PATTERN: publish the unknown; count it; never drop it

### F3 Every located point records how it was matched
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/build_connection_points.py:305-307
QUOTE:
```python
        if match:
            point["location"] = {"lat": match["lat"], "lon": match["lon"],
                                 "mapped_name": match["name"], "matched_by": how}
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/verify_connection_points.py:109-113
QUOTE:
```python
    check("a located point says how it was matched",
          all(p["location"]["matched_by"] in ("exact_name_highest_voltage",
                                                "exact_name_voltage_compatible",
                                                "distinctive_tokens_highest_voltage")
              for p in points["connection_points"] if "location" in p))
```
WHY: Each coordinate carries its own provenance: the mapped name it came from and the matching rule that produced it. Counts in the product are 428 / 22 / 39. The Phase-0 oracle also fixes the wording boundary (verify_phase0_acceptance.py:291-293): "NESO ETYS does not publish these coordinates; they are mapped geometry joined to ETYS identities and must not be called published coordinates."
PATTERN: per-record provenance of a join

### F4 The name join fails closed on identity: ONSHORE, OFFSHORE and EXTENSION are not noise
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/build_connection_points.py:41-47
QUOTE:
```python
NOISE = re.compile(
    r"\b(SUBSTATION|SUB STATION|SUBSTN|GRID|SUPPLY|POINT|GSP|NATIONAL|"
    # ONSHORE, OFFSHORE and EXTENSION are identity-bearing qualifiers.  They
    # must never be treated as presentation noise: removing them aliases
    # physically separate sites such as MORAY EAST ONSHORE/OFFSHORE.
    r"POWER|STATION|WIND|FARM|WINDFARM|"
    r"400KV|275KV|132KV|66KV|33KV|11KV|NGET|SSE|SP|SHE)\b")
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/build_connection_points.py:209-214
QUOTE:
```python
        match, how = None, None
        if not context_unique:
            # Name + highest voltage + owner still cannot tell these records
            # apart (currently the two Erebus rows).  Never let file order pick
            # one geometry for an ambiguous authoritative identity.
            ambiguous_identity += 1
```
WHY: "Text equality alone is not identity" (README.md:71) is written as code. The legacy normaliser (verify_phase0_acceptance.py:48-51) stripped OFFSHORE/ONSHORE/EXTENSION. The oracle reproduces the damage: 30 destructive collision groups covering 61 rows in the 132 kV+ population, cut to 5 groups / 10 rows (:535-547). Named regression checks pin the result: "Thanet onshore does not lend its coordinate to Thanet offshore" and the Moray East pair (verify_connection_points.py:128-135).
PATTERN: identity-bearing tokens; fail closed on ambiguity; file order never decides

### F5 Node codes are decoded, and the decoding is published as derived, with its counts
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 pipelines/build_network_model.py:256-267
QUOTE:
```python
        consistent = bool(site and kv and kv in site["voltages_kv"])
        if not consistent:
            unresolved += 1
        nodes[node] = {
            "node": node, "site_code": code,
            "site_name": site["name"] if site else None,
            "transmission_owner": site["transmission_owner"] if site else None,
            "voltage_kv": kv,
            # Named, not hidden: a node whose inferred voltage is not one the
            # site declares is a fact about the convention, not a defect to
            # paper over.
            "voltage_consistent_with_site": consistent}
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 README.md:60-66
QUOTE:
```markdown
**Node codes are decoded, and the decoding is derived.** A node is a site
code (up to four characters), a digit for the voltage level, then a busbar
or bay suffix — `COTT41` is Cottam, 400 kV, busbar 1. The digit convention
is not documented in the appendix, so the build derives it by counting how
each digit co-occurs with the voltages its site declares, publishes those
counts in the product, and counts the nodes whose inferred voltage their
site does not declare rather than silently correcting them.
```
WHY: An undocumented convention is marked as such in the product (`"derived_not_documented": True`, build_network_model.py:337) instead of being presented as fact. The mapping itself is a constant, `VOLTAGE_DIGIT = {"1": 132, "2": 275, "4": 400}` (:58). The published co-occurrence counts are its evidence, not its computation: digit 1 co-occurs with site voltage 132 kV 943 times, 2 with 275 kV 432 times, 4 with 400 kV 578 times. The flag is large: 726 of 2,679 nodes are not consistent with their site, and 649 nodes have digits 0/3/5/6/7 and get no voltage. The verifier requires the count to exist as an int (verify_connection_points.py:66-68). It does not bound it.
PATTERN: a derived convention, published with its evidence and its error count

### F6 Fault current: site-wide envelopes say what they combine, and by-voltage rows are kept apart
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/build_connection_points.py:115-117
QUOTE:
```python
        "metrics": metrics,
        "scope": scope,
        "aggregation": "envelope across the listed published rows; metrics, voltages and buses are not interchangeable",
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/build_connection_points.py:262-264
QUOTE:
```python
            fault_current[demand_case] = summarise_fault_rows(
                scenarios, network["fault_current_metrics"],
                "site-wide envelope; may combine voltage levels and buses")
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/verify_connection_points.py:222-225
QUOTE:
```python
    check("West Burton keeps 132 kV and 400 kV fault envelopes separate",
          set(west_burton["fault_current_by_voltage"]) == {"132", "400"}
          and west_burton["fault_current_by_voltage"]["400"]["peak"]
              ["metrics"]["three_phase_rms_break_current_ka"]["min"] > 30)
```
WHY: v2 published only site-wide envelopes. v3 (commit 7656dbf) adds `fault_current_by_voltage` computed before any envelope (README.md:32-33). Measured in v3 for West Burton peak three-phase RMS break current: site-wide 5.1 to 49.59 kA across locations WBUR1 M2 … WBUR4 R3/4. By voltage, 132 kV is 5.1 to 9.04 kA and 400 kV is 33.3 to 49.59 kA. The site-wide range covers two physically different buses. 319 of the 605 sites with fault data have rows at more than one voltage, so the by-voltage split matters for half of them.
PATTERN: aggregate labelled with its scope; disaggregation kept beside it

### F7 An unknown Appendix D schema is refused, and initial-peak current may not be renamed break current
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 pipelines/build_network_model.py:283-290
QUOTE:
```python
            metric_keys = tuple(FAULT_HEADER_KEYS.get(value) for value in header[2:])
            if (header[:2] != ("Location", "Voltage (kV)")
                    or None in metric_keys or metric_keys != FAULT_KEYS):
                raise ValueError(f"{sheet_name}: unknown Appendix D schema: {header}")
            year_index = re.search(r"\b(?:Yr|Year)\s*(\d+)\b", title, re.I)
            winter = re.search(r"\b(\d{4}/\d{2})\b", title)
            if not year_index or not winter:
                raise ValueError(f"{sheet_name}: scenario missing from title: {title!r}")
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/verify_connection_points.py:167-172
QUOTE:
```python
    check("Cottam proves initial-peak is not renamed break current",
          len(cottam) == 1
          and abs(cottam[0]["three_phase_initial_peak_current_ka"]
                  - 109.219270174868) < 1e-9
          and "three_phase_rms_break_current_ka" in cottam[0]
          and "three_phase_break_ka" not in cottam[0])
```
WHY: Each of the 7,316 rows keeps `source_sheet`, `source_row` and the publisher's own column labels (build_network_model.py:306-308). A non-numeric cell raises (:311-312). The Cottam check pins one published value to 1e-9 and also asserts that the older lossy key `three_phase_break_ka` is gone. It is a regression oracle for commits 96a54fc and dbfeecb ("preserve exact ETYS fault-current semantics").
PATTERN: schema drift raises; a named oracle row

### F8 SHA-256 pinning of the ETYS appendices records digests but does not refuse a change, unlike the sibling lanes
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 pipelines/fetch_sources.py:50-52
QUOTE:
```python
# NESO document ids, read from the ETYS documents and appendices index.
# Pinned deliberately: an id is stable, a "latest" link is not, and a
# product whose inputs can silently change is not a product.
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 sources/sources-manifest.json:6-9
QUOTE:
```json
    "appendix-b-system-technical-data": {
      "bytes": 1237005,
      "sha256": "d5cacf238292e8c78af989a5ee3a0c9bd8619acc6e6e67f451d6b44c71fa5e0c",
      "url": "https://www.neso.energy/document/383936/download",
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 .github/workflows/refresh_network_products.yml:12-15
QUOTE:
```yaml
# The sources are pinned by document id and recorded by SHA-256. If a
# digest changes, the run says so and commits the new products together
# with the new manifest, so the change is visible in one diff rather than
# discovered later in a map.
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 assetpipe/pipeline.py:177-182
QUOTE:
```python
            digest = sha256_bytes(payload)
            pinned = manifest["files"].get(rel)
            if pinned and pinned["sha256"] != digest and not update_pins:
                raise PipelineError(
                    f"{domain}/raw/{rel}: upstream bytes changed ({pinned['sha256'][:12]} -> {digest[:12]}); "
                    "review the change and rerun with --update-pins")
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 chatgpt/ingest_etys.py:51-55
QUOTE:
```python
def pinned(path: Path, artifact: str, ledger: dict[str, Any]) -> dict[str, Any]:
    spec = ledger["artifacts"][artifact]
    actual = {"bytes": path.stat().st_size, "sha256": sha256(path)}
    if actual["bytes"] != spec["bytes"] or actual["sha256"] != spec["sha256"]:
        raise ValueError(f"{artifact}: source bytes do not match pinned ledger: {actual}")
```
WHY: Three Appendix B/D documents (ids 383936, 383951, 383961) plus the GridAtlas v9 substation geometry are recorded with bytes and SHA-256. The ETYS path is record-and-diff: `fetch_sources.py` hashes and rewrites the manifest (:79-86, :123-125) and never compares against the previous digest. "Refusal" there means a visible manifest change in the bot's commit, and the workflow does not explicitly "say so" beyond that commit. The asset pipeline (`assetpipe`) and the separate ChatGPT ETYS lane both raise on a mismatch. The two ETYS ledgers agree byte for byte: chatgpt/sources.json:16, :28 and :34 carry the same d5cacf…, 5f44bd… and ad8b54… digests as sources-manifest.json. The ETYS products are also outside `reproduce.py` (reproduce.py:6-7: "the ETYS network products have their own verifiers under ``derived/``"). Because `sources/*.xlsx` is gitignored (.gitignore:1), rebuilding v1/v3 offline from this clone is UNVERIFIED: the inputs are not on disk.
PATTERN: pin by stable id plus digest (record-and-diff vs refuse-on-change)

### F9 One transformer row is one physical record: count by source ordinal, never by content
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/verify_phase0_acceptance.py:364-366
QUOTE:
```python
            "identity_rule": (
                "Use source-row ordinal while indexing. Never deduplicate by row "
                "content: distinct parallel units can be byte-identical."),
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/build_connection_points.py:161-171
QUOTE:
```python
    # One Appendix B transformer row is one physical transformer record.  Its
    # two node ends are windings/landings, and both commonly resolve to the
    # same site.  Count each source row once per incident site without
    # collapsing genuinely parallel (and sometimes byte-identical) units.
    transformers_at = defaultdict(set)
    for transformer_index, transformer in enumerate(network["transformers"]):
        incident_sites = {
            node_site.get(transformer[end]) for end in ("node_1", "node_2")
        } - {None}
        for site in incident_sites:
            transformers_at[site].add(transformer_index)
```
WHY: Two opposite errors are both prevented: double-counting windings (Cowley showed 10 and is 5) and merging identical parallel units by deduplicating on content. The oracle keeps four populations apart, 1,472 records / 1,550 incidences / 1,526 in the rollup / 2,944 landings (:368-374), and asserts `byte_identical_parallel_transformers_remain_distinct` (:528-529). This is the correction that the GridAtlas pin in F12 does not yet carry.
PATTERN: identity is the source ordinal, not row content

### F10 The monthly bot refresh commits non-content churn: hash-ordered ties in a published Counter
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 pipelines/build_network_model.py:241-249
QUOTE:
```python
    digit_counts = defaultdict(Counter)
    node_names = set()
    for record in circuits + transformers + changes:
        node_names.update([record["node_1"], record["node_2"]])
    for node in node_names:
        code, digit = node[:4], (node[4] if len(node) > 4 else "")
        if digit.isdigit() and code in sites:
            for kv in sites[code]["voltages_kv"]:
                digit_counts[digit][kv] += 1
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 .github/workflows/refresh_network_products.yml:64-66
QUOTE:
```yaml
      # The products are arithmetic over the pinned sources. If the sources
      # have not moved, neither have they, and a run that changes nothing
      # should leave no trace.
```
WHY: Iterating a `set` of strings follows the per-process hash seed. `Counter` keeps insertion order for ties, and `most_common(4)` (:339) publishes that order. All three bot commits (a412790, 1c9909d, 5181de3) change exactly 2 lines of `gb-transmission-network.v1.json`: the order of the tied `"20": 2` and `"25": 2` under digit 7. Command: `git show <sha> --format= -- derived/gb-transmission-network.v1.json | grep '^[-+] '`. So the network file's SHA-256 changes with no change in content. The GridAtlas pin `fc331c…` (F12) and HEAD `b26b32…` differ only by this reorder (`git diff 1c9909d HEAD -- derived/gb-transmission-network.v1.json` = 2 lines). The workflow's own "leave no trace" rule is broken by the code it runs. Fix: `sorted(node_names)`.
PATTERN: nondeterministic order defeats content pinning

### F11 The Phase-0 oracle freezes cohorts by digest and treats a lower located count as a correction
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/verify_phase0_acceptance.py:410-412
QUOTE:
```python
        "interpretation": (
            "A lower count is not automatically a regression: fail-closed removal of "
            "an unsupported join is an epistemic correction. Review every code."),
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/verify_phase0_acceptance.py:596-600
QUOTE:
```python
        "corrected_cable_cohort_membership_is_frozen":
            evidence["cable_scalar"]
            ["legacy_study_filter_straight_distance_gt_1km"]
            ["membership"]["circuit_records_sha256"]
            == "216403a88f9a36a88ed200905a04c84a9c11e7afe7efea6e27b677e5b1bdcf0e"
```
WHY: The oracle compares itself against the immutable pre-remediation commit (`HISTORICAL_BASELINE_REF = "1c9909d…"`, :46). It enumerates the location delta exactly (`{"lost": 16, "gained": 3, "changed": 0, "net_location_change": -13}`, :622-624) and freezes the cable-length calibration cohort by member-list SHA-256 instead of by count. Its own comment says why: 95 rows in both versions, but 59 pairs before and 60 after, with different members (docs/routing/METHOD_AND_LIMITATIONS.md:187-193). The `k = 1.245` corridor factor is labelled "Descriptive in-sample calibration only" (:149-151).
PATTERN: freeze membership by digest; a fail-closed loss counts as a correction

### F12 The live Atlas pins data-grid-gb at the pre-remediation commit
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/202609062358-substation-intelligence-v9-63.js:4050-4057
QUOTE:
```javascript
    'connection-points.v3': {
      repository: 'data-grid-gb',
      ref: '1c9909d1138704b29235c27fd769436dda8a0b18',
      path: 'derived/connection-points.v3.json',
      sha256: '11e28859a6d17cc8ee4047c2032d55d043be98f7123743f3b2b03225e07a4c0c',
      bytes: 2896561,
      schema: 'data-grid-gb.connection-points.v3'
    },
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/202609062358-substation-intelligence-v9-63.js:4012-4017
QUOTE:
```javascript
   commit b91e45b - publishes deduplicated transformer counts under the
   IDENTICAL schema `data-grid-gb.connection-points.v3`:

     COWLEY   transformers  10 -> 5
     ABHAM    transformers   4 -> 2
     located                502 -> 489     (886 points either way)
```
WHY: This is the live `substation-intelligence` cartridge (atlas/current.json:566-572, generation 202609062358, v9.140). It explains why a schema string cannot protect values, and it pins by commit plus SHA-256 plus byte length. The pin is still the commit before the correction it describes. I recomputed the digests: `git show 1c9909d:derived/connection-points.v3.json | sha256sum` = 11e28859…, and the network file = fc331cc2…, matching the pins. b91e45b's v3 (8db7171d…) is byte-identical to HEAD's. No file in gridatlas names b91e45b's full SHA, 5181de3 or b57c94d (grep). So the map still shows Cowley's 10 transformers and the 16 joins that Phase-0 removed. The module's own comment says this cost is accepted until "the pin moves here".
PATTERN: pin the consumer's last hop by commit + digest + length

### F13 The data-centre engine reads OpenStreetMap substations only, and says so
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:51
QUOTE (excerpt of line):
```javascript
 try{c.sc=GS.scope([x,y],subs,{bandsKm:[40],nearestCount:subs.length}).nearest
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:92
QUOTE (excerpt of line):
```javascript
 L(P,v=='s'?'Mapped substations (OpenStreetMap, ODbL 1.0). Not capacity, headroom or a connection point.'
```
WHY: The 30/30/30 Grid Engine ranks `link.substations` (the OSM layer) within 40 km, with voltage bands 400/275/132/33–66 (:10-11). Its CSV export writes `'OpenStreetMap as loaded by the map','ODbL 1.0','not carried'` per substation (:161). `grep -n "connection-points\|data-grid-gb\|ETYS\|fault" 06b-dc-engine.js` finds nothing: the engine does not read either ETYS product yet. Its disclaimers ("Not capacity, headroom or a connection point", :92; "Not cable routes, capacity, headroom or connection offers", :105) already say what data-grid-gb's `not_a_connection_assessment` says.
PATTERN: matching disclaimers across producer and consumer

### F14 IT load MW and grid connection MW are never one field, and unknown is null
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 assetpipe/schema.py:138-140
QUOTE:
```python
    for key in FORBIDDEN_DATACENTRE_MW_KEYS:
        if key in rec:
            problems.append(f"{key} is ambiguous: use it_load_mw or grid_connection_mw, never both in one field")
```
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 datacentres/lanes/dc-a1-neso/fetch_neso.py:27-29
QUOTE:
```python
* No coordinates are invented. NESO gives a connection-site (substation) NAME
  only; location_precision is "connection_site_name" and geometry is null
  until a later step joins the name to a substation with evidence.
```
WHY: These are the data-centre-side counterparts of F1/F2. The schema rejects bare `mw`/`capacity_mw`/`power_mw`/`load_mw`/`demand_mw` (:69). The NESO lane keeps a connection-site name without inventing a location, which is exactly the key an ETYS `site_code` join would need. In the merged 227-site pipeline today, `grid_connection_mw` is known for 0 of 227 and `connection_refs` is empty for all 227 (`python3 -I /tmp/w09/dcsites.py …/uk_datacentre_pipeline.geojson`; `/tmp/w09/dcrefs.py`).
PATTERN: two quantities, two fields; null for unknown

### F15 A size budget keeps the product browser-sized
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 derived/verify_connection_points.py:206-207
QUOTE:
```python
    check("the product stays browser-sized",
          os.path.getsize(os.path.join(REPO, "derived", "connection-points.v3.json")) < 3_000_000)
```
WHY: A budget written as a failing check. v3 is 2,934,509 bytes (`ls -la derived/`), leaving 65,491 bytes (2.2%). It grew from 357 kB (v1, commit cf68690 message) to 2.9 MB when the eight metrics and per-voltage envelopes arrived. Any data-centre extension (for example per-point nearest-DC lists) must go in a separate file or it will fail this check.
PATTERN: budget as a failing check

### F16 Vendored lane inputs can be redirected, but their pins cannot
KEY: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1 conventional/lanes/dc-a6/build_conventional.py:46-48
QUOTE:
```python
# data-grid-gb vendoring (DC-A8): inputs and output dir may be redirected; the sha256 pins above are unchanged.
if os.environ.get("DC_A6_INPUT_DIR"):
    INPUTS = {k: (os.path.join(os.environ["DC_A6_INPUT_DIR"], os.path.basename(p)), h) for k, (p, h) in INPUTS.items()}
```
WHY: The lane was written against a session-local path (`GA = "/home/claude/gridatlas/data"`, :33). It was vendored by allowing the path to be redirected while keeping each digest, and refuses other bytes at :150-153 (`sys.exit(f"input {k} sha256 {got} != pinned {h}")`). The conventional set (301 sites, 58 excluded by the REPD rule, conventional/lanes/dc-a6/out/counts.md) is the engine's third "30".
PATTERN: relocatable inputs, fixed digests

## Patterns (keyed; each cites at least one F above)
- **Disclaimer in the payload, checked for substance** (F1, F13): the refusal travels with the bytes, and the check tests meaning rather than wording. Caveat: the headline sentence itself is not guarded (F1).
- **Publish the unknown, count every tier** (F2, F3, F5, F14): unlocated sites, inconsistent node voltages and unknown MW are all published and counted, never dropped or zero-filled.
- **Fail closed on identity** (F4, F9): ambiguous names, shore-qualifier conflicts and duplicate contexts produce no coordinate. Transformer identity is the source ordinal.
- **Aggregate labelled with its scope** (F6): every envelope carries `scope` and `aggregation` strings, and the disaggregated rows sit beside it.
- **Schema drift raises** (F7): unknown headers, missing scenario labels and non-numeric cells stop the build.
- **Pin by stable id plus digest** (F8, F12, F16): there are two strengths in one repo. ETYS sources are record-and-diff. assetpipe, the ChatGPT lane and DC-A6 refuse on change.
- **Order nondeterminism defeats content pins** (F10): one unsorted `set` makes a pinned digest go stale with no content change.
- **Freeze cohorts by member digest** (F11).
- **Budget as a failing check** (F15).

## History (keyed by commit SHAs)
- 15 commits in total (`git rev-list --count HEAD`): Ventusltd 12, github-actions[bot] 3 (`git log --format=%an | sort | uniq -c`).
- **Founding storm, 2026-09-01T17:35:14+01:00 to 18:23:28+01:00**: 7efd44a (initial), 1d79e48 (ChatGPT lane), f267d0d, cf6869025458c48397cf2ba79c27da89738f33f1 "The GB network, as its operator publishes it". Its message says v1 had 574 located (486 exact, 88 token, 312 unlocated) and "Two honesty rules are built in rather than documented and forgotten". Then 96a54fcd1babd4265a01d4b248922dd66e26eff1 and dbfeecb5f745e1c374db2324972743820e8d73da (eight fault metrics, v2; +212,971 lines, mostly the regenerated network JSON). Then 7656dbf2e62276cbb3823368848707a91b9e5ed6 (v3: per-voltage envelopes; ambiguous joins fail closed, 574 → 502 located). Eight commits in 48 minutes.
- **Stamp ahead of the clock**: 7656dbf's subject is stamped "202609011920" but its author date is 2026-09-01T18:23:28+01:00, so the stamp runs 56 minutes ahead. dbfeecb is stamped "202609011756" and authored 17:55:47+01:00. gridatlas keeps a governance note on this (governance/202609012148-stamps-ran-ahead-of-the-clock.md, listed by grep, not read).
- **Remediation turning point**: b91e45b231464c24339f5a58b81e6b1eb4c8b47f, 2026-09-03T02:21:01+01:00, "correct transformer identity and fail-closed joins": +1,506 lines, adding the 661-line Phase-0 oracle and three routing documents. Located 502 → 489, Cowley 10 → 5 transformers. v3's bytes have not changed since (sha 8db7171d… at b91e45b and at HEAD).
- **Bot churn**: a412790 (2026-09-01T16:47:48Z), 1c9909d1138704b29235c27fd769436dda8a0b18 (2026-09-01T17:23:51Z) and 5181de3423e4fe50c77c568b9f3066c61a1d9e41 (2026-09-03T04:02:57Z). Each changes only the tie order under digit 7 (F10). 1c9909d is also the commit that gridatlas pins (F12).
- **Quiet for eight weeks, then the data-centre wave**: 3ca8cfd179b0468b4d42f49590da5a0fd1dff9b8 (2026-10-29T21:18:39Z, Apache-2.0 licence, "No data or pipeline bytes changed"), 3c6c72e (21:19:02Z, data-centre and conventional pipelines), 69b566d (21:36:03Z, cross-operator merge guard, 227-site baseline), b57c94d4e964df2de0dea2786781c6d07a967ea1 (21:53:51Z, 4 MiB CSV field bound). None of these touches the ETYS products.
- Located count over time (computed with `git show <sha>:derived/connection-points.vN.json | python3 -I /tmp/w09/hist.py`): cf68690 v1 574, dbfeecb v2 574, 7656dbf v3 502, 1c9909d v3 502, b91e45b v3 489. It only falls: fewer coordinates, each better supported.

## Gridatlas and datacentre relevance

**What the engine reads now.** `06b-dc-engine.js` ranks OSM substations by straight line (F13). For each one it knows a name, a voltage and a distance, which is the limitation data-grid-gb's README.md:8-12 and build_connection_points.py:3-8 were written to fix ("Nearest substation: Cottam Substation, 400 kV, 10.82 km.").

**What the ETYS products could add to a data-centre card (132 kV+ only).** For a data-centre point, take the nearest *located* v3 connection point (every v3 point is ≥132 kV, `minimum_kv` 132). The card could then show, each item quoted from the product:
- `site_code`, `voltages_kv`, `transmission_owner`, and `location.matched_by` (show the tier: an `exact_name_voltage_compatible` match is weaker than `exact_name_highest_voltage`);
- `circuits` and `circuit_winter_rating_mva` {min, max}: a rating range, not headroom;
- `transformers`, using the corrected count (F9);
- `fault_current_by_voltage[<kV>]` at the band the user picked. Never the site-wide `fault_current` envelope, which mixes buses (F6);
- `planned_changes` and `planned_change_years` (2026/2028/2030/2033): the only public statement of what will change at that node;
- `reactive_compensation` units/MVAr.
The full model (`gb-transmission-network.v1.json`, 10 MB) is too heavy for a tap. It is suitable for an offline join or a second-level "node" panel only.

**Headroom unknowns, which must stay unknown.** Neither product can say whether there is capacity. The payload sentence (F1) names what decides connection (queue position, committed connections, consent, commercial terms), and none of it is in ETYS. The data-centre side matches: `grid_connection_mw` is known for 0 of 227 pipeline records, and `connection_refs` is empty (F14). The honest card is therefore "nearest published 132 kV+ node, its published ratings, fault levels by voltage and planned changes; capacity unknown". That is the 06b disclaimer (F13) with better facts behind it. A data centre's 'nearest connection point' must also say "nearest located": 397 sites are unlocated, including 180 at 132 kV and 149 at 400 kV (F2), so a nearer real node can exist. The card should print the unlocated count beside the answer.

**Preconditions before the engine reads it.**
1. Move the Atlas pin off 1c9909d to b91e45b or later (F12). Otherwise the card prints Cowley's 10 transformers and 16 joins that Phase-0 rejected.
2. Fix `sorted(node_names)` (F10) before pinning the network file, or its digest will keep changing with no content change.
3. Keep v3 under the 3,000,000-byte budget (F15) by putting any DC-specific joins in a new file.
4. Prefer joining NESO register connection-site names (dc-a1, F14) to ETYS through the same fail-closed normaliser and `join_context_key`/`site_code` (F4) rather than through distance. A name join to the declared connection site is evidence. Proximity is not.

## Candidates (unkeyed; clearly marked)
- CANDIDATE: a prototype I computed in memory, not in any repo, so it carries no key. For the 225 mappable pipeline sites, the nearest *located* v3 connection point is a median 5.23 km away (p90 17.22 km, max 89.13 km). 217 of those nearest points carry by-voltage fault data and 177 carry planned changes. Their highest voltage is 400 kV for 157, 275 kV for 56 and 132 kV for 12. Command: `python3 -I /tmp/w09/dcnear.py derived/connection-points.v3.json datacentres/lanes/dc-a7-merge/out/uk_datacentre_pipeline.geojson` (haversine, R = 6371.0088 km). The max of 89 km probably reflects sites outside GB coverage (for example Northern Ireland). Not checked.
- CANDIDATE: the verifier does not bound `nodes_whose_voltage_is_not_declared_by_their_site` (726, 27% of nodes). A threshold check would catch a convention change between ETYS editions.
- CANDIDATE: `verify_phase0_acceptance.py` is not run by `refresh_network_products.yml` (the workflow runs only `verify_connection_points.py`), so the 22 Phase-0 checks are not enforced in CI.
- CANDIDATE: rebuilding v1/v3 from sources is UNVERIFIED in this clone: `sources/*.xlsx` and `sources/grid_substations.geojson` are gitignored and absent.

## Proposed lines for the Kuiper edition
1. **F1** build_connection_points.py:320-323 with verify_connection_points.py:48-53: the estate's clearest case of a refusal carried in the payload and checked for its meaning, together with the honest caveat that the headline sentence itself is not checked.
2. **F2** build_connection_points.py:24-27: "published WITHOUT coordinates rather than dropped". A one-sentence law suitable for an epigraph.
3. **F12** gridatlas cartridge :4012-4017 and :4050-4057: a consumer that explains why value pins beat schema strings while pinning the pre-correction commit. A live, checkable turning point.
4. **F10** build_network_model.py:241-249: one unsorted set breaks content pinning. A short, teachable lesson about reproducibility.
5. **F9** verify_phase0_acceptance.py:364-366: "Never deduplicate by row content: distinct parallel units can be byte-identical."
6. **F6** build_connection_points.py:115-117: "metrics, voltages and buses are not interchangeable".
7. **F4** build_connection_points.py:41-47: identity-bearing qualifiers.
8. **F11** verify_phase0_acceptance.py:410-412: "A lower count is not automatically a regression".

## One next command
```bash
git -C /home/user/estate/data-grid-gb diff --stat 1c9909d1138704b29235c27fd769436dda8a0b18 HEAD -- derived/
```
(Shows the exact product delta the live Atlas is not yet reading: the v3 correction plus the 2-line tie-order churn in the network file.)
