# W10 offtaker-threads-estate

Written 2026-10-31 (UTC) by worker W10 (Opus). Slice: the data-centre and "potential offtaker" thread
everywhere outside gridatlas and data-grid-gb. Read only; nothing in any clone was changed.

HEADS:
pipelinenews@6a4c0244b2817c6b8a74661546c8acc35e53a9b7 (HEAD moved from 67aa2eb05993c630887b41c3b720ba42a86669a4 during this run; `git diff --stat 67aa2eb HEAD` touches only `kuiper-edition/202610311905/`, so every pipelinenews line keyed below is byte-identical at both)
ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f
gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450
energy-transition-simulator@a6b5ae63cc0eeb4d619f154c7e116616c997af77
data-gridatlas@8bf88da9e210ce9f61dc0398869d3369f3fa2445
globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f (shallow, 304 commits; oldest reachable acd2f242667dd60868476490209c5b9ce4aeb8f9 2026-09-16T04:31:08+01:00)

READ:
pipelinenews: archive/202608261547-pipelinenews/newsv6/{README.md,fixtures/data_centre_sources.v1.json,contracts/release.newsv6.json,modules/data-centre-identity.mjs,modules/source-policy.mjs,scripts/build-data-centre-evidence.mjs}
pipelinenews: tools/intelligence/cartridges/project-intelligence/{cartridge.json,assets/{GEN}-project-intelligence.mjs,data/{GEN}-project-intelligence.json (parsed with python, not catted)}
pipelinenews: data/federation/202608282041-relationship-intelligence-contract.json
pipelinenews: build/python/202608282200-build-relationship-status-parquet.py
pipelinenews: discovery/javascript/202609010015-sector-topic-evidence.mjs, discovery/javascript/202609010719-sector-intelligence-runner.mjs (lines 455-470, 630-700)
pipelinenews: tools/intelligence/cartridges/unbound-carries-nothing/cartridge.json
pipelinenews: tools/intelligence/cartridges/{grid-proximity,grid-actions-inline}/data (grep -o only)
pipelinenews: releases/202609060232-pipelinenews/data/202608311343-project-intelligence.json (parsed), assets/202608311343-project-intelligence.mjs, index.html (grep)
pipelinenews: docs/coordination/BOARD.md:760-770, docs/coordination/from-codex/202608312244-pipeline-iteration-03.md:45-55
ventus-grid-engine: README.md:1-60, engine/firm-capacity.js, proofs/firm-capacity.proof.mjs:1-70, engine/connection-capacity.js:1-40, engine/electrification-demand.js:1-20, sources/v9-extracts/sizing-arithmetic.mjs:200-215
gridmachine1: CABLE-ENGINES.md, CABLE-ENGINE-DATASHEETS.md, BUGS.md, reports/20260907T230000Z-engine-capsule/{README.md,DATA-PROVENANCE.md}
energy-transition-simulator: README.md:1-25 (plus whole-tree grep)
data-gridatlas: contracts/202608291015-v8-transplant-plan.json:230-275, contracts/202608291015-v8-layer-config.json:236-260, 202608291237-data-gridatlas/data/phase-manifests/p1_foundation.json:315-335
globalgrid2050 (git grep -l with --include-style pathspecs, head/sed only): scripts/fetch_datacentres.py, repd_grid_atlasv8/data/datacentres.geojson (40,563 bytes, parsed for counts only), grid_engine/specs.mjs:1185-1330,1593-1640, grid_engine/SCOPE.md, grid_engine/202609060316-data-centre-connection/index.html (grep, 262-275), papers/202609060203-electrification/index.md:147-181,263,285, repd_atlas_grid_model_v1backup.md:450-512, diary-notes-log/260522-0115-v7-rollback-and-working-method.md:85-108,225-242

## Findings (keyed)

### F1 The estate's 240 data centres were born without an identity
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f scripts/fetch_datacentres.py:57-63
QUOTE:
```python
            feature = {
                "type": "Feature",
                "properties": {
                    "name": tags.get('name', 'Unknown Data Centre'),
                    "operator": tags.get('operator', tags.get('brand', 'Unknown Operator')),
                },
                "geometry": {"type": "Point", "coordinates": [lon, lat]}
```
WHY: This is the root of every map-level data-centre layer in the estate. The Overpass element's `type`
and `id` are read (line 49) and then thrown away; only `name` and `operator` survive, with placeholder
strings filling gaps. Counted on the output (`python3 -I` over repd_grid_atlasv8/data/datacentres.geojson):
240 features, property keys exactly `['name','operator']`, 51 named "Unknown Data Centre", 67
"Unknown Operator". The same script blob `989255cd41b30bd14a9f7490767b57d4af070ebc` is checked in four
times (scripts/, repd_grid_atlasv6/, v7/, v8/) and the same output blob
`9457f6dc583bbfdcca40926c353738b321fcb09b` five times (`git ls-files -s`). Every later lane (F2, F14)
has to defend against this one dropped field.
PATTERN: identity loss at the source (the anti-pattern later laws were written against)

### F2 Pipeline News named the loss and refused to join across it
KEY: pipelinenews@6a4c0244b2817c6b8a74661546c8acc35e53a9b7 archive/202608261547-pipelinenews/newsv6/fixtures/data_centre_sources.v1.json:6
QUOTE:
```json
    {"source_id":"PN-DC-SOURCE-ATLAS-V8","name":"GlobalGrid Atlas V8 data-centre snapshot","source_url":"https://github.com/Ventusltd/globalgrid2050/blob/cfb32796e4a3c45a0ab7bec53623b96c84a818a4/repd_grid_atlasv8/data/datacentres.geojson","licence":"DERIVED_FROM_OSM_ODBL","evidence_class":"DISCOVERY_ONLY_IDENTITY_LOSS","permitted_use":"DISCOVERY_ONLY","identity_authority":"NONE_OSM_TYPE_AND_ID_DROPPED","pinned_commit":"cfb32796e4a3c45a0ab7bec53623b96c84a818a4","pinned_blob":"9457f6dc583bbfdcca40926c353738b321fcb09b","row_count":240},
```
WHY: The first data-centre data product in pipelinenews (commit a2259bf3c8a9f2b9b2cfaa39e223c299224c5c81,
2026-08-25T05:09:58+01:00, "feat: add NewsV6 data-centre evidence namespace") pins F1's exact blob and
gives it an evidence class whose name is the diagnosis: `DISCOVERY_ONLY_IDENTITY_LOSS`. Line 18 of the
same file then refuses a link that "looks" right: `"signals":["SAME_DISPLAY_NAME","APPROXIMATE_COORDINATES"],"decision":"ABSTAIN_INSUFFICIENT_IDENTITY_EVIDENCE","reason":"The Atlas row cannot be joined back to an exact OSM object because its type and id were discarded."`
The blob pin joins three repos (globalgrid2050, pipelinenews, data-gridatlas F14) on one hash.
PATTERN: pin-by-blob, name the defect as an evidence class

### F3 The data-centre identity law in two lines
KEY: pipelinenews@6a4c0244b2817c6b8a74661546c8acc35e53a9b7 archive/202608261547-pipelinenews/newsv6/modules/data-centre-identity.mjs:2-3
QUOTE:
```javascript
export const linkDecision = ({exactSharedSourceObject = false, atlasIdentityLost = false} = {}) => exactSharedSourceObject && !atlasIdentityLost ? "LINK_EXACT_SOURCE_OBJECT" : "ABSTAIN_INSUFFICIENT_IDENTITY_EVIDENCE";
export const hostileDecision = (caseId) => caseId === "CAPACITY_NUMBER_WITHOUT_TYPE" ? "ABSTAIN_UNTYPED_CAPACITY" : caseId === "OUTBOUND_DIRECTORY_IDENTITY" ? "ABSTAIN_SOURCE_NOT_ADMISSIBLE" : "ABSTAIN_INSUFFICIENT_IDENTITY_EVIDENCE";
```
WHY: The default of every branch is ABSTAIN; the only LINK requires an exact shared source object AND
no identity loss. Its contract (archive/202608261547-pipelinenews/newsv6/contracts/release.newsv6.json:14,21-24)
splits capacity into four typed fields (`it_load_mw`, `requested_grid_capacity_mw`,
`contracted_grid_capacity_mw`, `operational_capacity_mw`) and asserts
`"name_or_proximity_never_establishes_identity": true`, `"untyped_capacity_never_published": true`,
`"expected_identity_links": 0`. Five hostile cases (fixture lines 21-25) are expected to abstain. This is
the cleanest fail-closed rule in the data-centre thread and it predates the gridatlas DC engine by two
months.
PATTERN: fail closed by default; typed capacity or nothing

### F4 Why MVA, not MW: the data-centre case that seeded the engine
KEY: ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f engine/firm-capacity.js:16-22
QUOTE:
```javascript
 * WHY MVA AND NOT MW.
 * Transformers and cables are limited by current, and current is set by
 * apparent power, not real power. A 100 MW load at 0.95 power factor draws
 * 105.3 MVA and it is the 105.3 that the plant has to carry. Sizing on MW
 * silently under-counts by the reciprocal of the power factor — 5% here, more
 * for a poorer load. Every rating in this module is therefore in MVA, and
 * converting from MW requires a power factor the caller states.
```
WHY: The proof labels this exact case "The paper's data-centre case"
(proofs/firm-capacity.proof.mjs:26-28: `near(apparentPowerMva({ mw: 100, powerFactor: 0.95 }).value, 105.26, 0.01)`),
and the electrification paper's data-centre section states it in prose
(globalgrid2050 papers/202609060203-electrification/index.md:177: "A facility drawing up to **100 MW at its
grid connection**, at an assumed annual load factor of 90%, consumes **0.788 TWh/year**. At power factor
0.95, 100 MW corresponds to approximately **105 MVA**"). Arithmetic checked: 100/0.95 = 105.263;
100 x 8760 x 0.9 = 788,400 MWh = 0.788 TWh. Introduced in commit 294dcc062cb0fd37b2eaa57ba28436576ae1cb63
(2026-09-06T02:59:00+01:00), the first engine commit to say "data-centre" (`git log -i -S'data-centre'`).
PATTERN: unit honesty; the caller states the power factor

### F5 What the engine refuses to compute
KEY: ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f engine/firm-capacity.js:200-209
QUOTE:
```javascript
export const NOT_COMPUTED = Object.freeze({
    spareCapacity:
        'Spare capacity is the network operator\'s figure, from its model, its running arrangement and its outage plan. A rating minus a demand is not it.',
    connectionAvailability:
        'Whether a connection can be made is answered by an application and an offer. The binding constraint is often the upstream circuit, the fault level or a queue position, none of which appear in this arithmetic.',
    cyclicAndEmergencyRating:
        'A transformer carries more than nameplate for a period, set by its thermal time constants, the ambient and how much insulation life the owner will spend. That is the owner\'s asset policy under IEC 60076-7, not a screening calculation.',
    securityCompliance:
        'ER P2/7 compliance depends on group demand, permitted interruption, restoration time and transfer capacity from adjacent sites. Passing the N-1 arithmetic here neither demonstrates nor refutes it.'
});
```
WHY: A refusal is exported as a frozen, named object with the reason attached, so any data-centre surface
that imports the engine inherits the boundary. Lines 126-128 add the sharpest single answer:
"A single ${largest} MVA transformer has NO firm capacity: losing it loses the site. ... That is the answer,
not a fault." The grid_engine SCOPE turns this into a night-wide law (globalgrid2050 grid_engine/SCOPE.md:11-15:
"nothing computes headroom, spare capacity or connection availability: a published figure may be carried,
dated and attributed; a derived one may not.").
PATTERN: frozen refusal table (NOT_COMPUTED)

### F6 The 936 TWh data centre: a three-orders error caught only by absurdity
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f grid_engine/specs.mjs:1279-1284
QUOTE:
```javascript
    const unrestrictedMw = halls * facilityMwPerHall;
    // MW x hours is MWh, and MWh to TWh is a division by 1e6. The first
    // version multiplied by 1000 after that and printed 936 TWh for a
    // 125 MW site - three orders of magnitude out, and obvious only
    // because the number was absurd rather than because anything caught it.
    const annualTwh = (diversifiedMw * 8760 * num('lf')) / 1e6;
```
WHY: An honest storm record inside the Data Centre Connection Workbench. The defaults reproduce it exactly:
8 halls x 12.5 MW x PUE 1.25 = 125 MW facility (specs.mjs:1213-1215); x coincidence 0.95 = 118.75 MW;
x 8760 x 0.90 / 1e6 = 0.936 TWh; the bug's x1000 gives 936. The comment admits no check caught it,
which is the argument for proofs that can fail (SCOPE.md step rule 1).
PATTERN: write the failure into the code beside the fix

### F7 Demand queue honesty: 125 GW applied, 80 GW of it data centres, much of it speculative
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f grid_engine/specs.mjs:1245-1249
QUOTE:
```javascript
                note: `A connection is not granted by arithmetic. The binding constraint is frequently
                   the upstream circuit, the fault level at the busbar, or a position in a queue —
                   Ofgem has reported demand connection applications rising from 41 GW to 125 GW, at
                   least 80 GW of it data centres, while warning that a significant portion may be
                   speculative. Nothing here distinguishes a financed project from an enquiry.`
```
WHY: The best one-sentence statement of the "potential offtaker" problem in the estate: a data centre in
a queue is a candidate, not a load. Panel 3 (lines 1234-1240) asks the deciding question, "does this load
still fit with the largest transformer out", defaulting to a bank of `'90, 90, 90'` MVA. The external
figures (Ofgem, DSIT) are as written by the page; W10 did not verify them.
PATTERN: say what the arithmetic cannot distinguish

### F8 The Atlas knows where compute is, not how big
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f grid_engine/specs.mjs:1617-1620
QUOTE:
```javascript
                   <br><br>Worth knowing about the other side: the Atlas maps <strong>240 data
                   centres and records no capacity for any of them</strong> — name and operator only.
                   It knows where compute is and not how big, and knows both for chargers. That
                   asymmetry is why the data centre figure here is typed in rather than counted.`,
```
WHY: The workbench (Compute Against Charging, stamp 202609060324) states F1's consequence in plain
words and acts on it: the data-centre MW is a typed input (line 1622, default 60 MW) while chargers are
counted (1,055). "240" and "name and operator only" match the F1 count exactly. This is the gap the later
data-grid-gb 227-site pipeline and the gridatlas DC engine set out to close.
PATTERN: when the data lacks a quantity, make it an input, never an inference

### F9 "A prospective offtaker is not a confirmed power-purchase agreement"
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f papers/202609060203-electrification/index.md:263
QUOTE:
```markdown
Likewise, proposed generation, storage and load should be tracked separately. A battery’s MW rating is neither its annual generation nor its energy duration. A prospective offtaker is not a confirmed power-purchase agreement. Multiple applications or development stages must not be summed automatically as independent build commitments.
```
WHY: The paper is where "potential offtaker" becomes a discipline rather than a legend label. Line 285 is
the thesis of the whole thread: "**The strategic value of studying renewable projects, their potential
offtakers and the grid together lies in locating that transformation—not just estimating its national
total.**" The phrase descends from the old atlas legend (F16).
PATTERN: candidate is not commitment

### F10 The pipeline declares the cable engine, and the table has no row for a load
KEY: gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 CABLE-ENGINES.md:58-65
QUOTE:
```markdown
| technology in the register | engine category | fallback |
| --- | --- | --- |
| Solar, battery storage | E1 substation finder | none needed; E1 is the general case |
| Onshore wind | E1, or E4 where a transmission connection is declared | E1 |
| **Offshore wind** | **E3 export cable to the declared onshore connection** | E1, declared as a fallback in the output |
| **Interconnector** | **E2 subsea link** | none; a link with no far converter reports the far end as not held |
| Any project with a declared transmission point of connection | E4 declared connection | E1 |
| Distribution-scale projects | E5 132 kV, when it exists | E1 |
```
WHY: The five cable engines (E1 substation finder, E2 subsea link, E3 offshore export, E4 400 kV / declared
transmission, E5 132 kV distribution) are all generation-side; `grep -rn -i -c 'data.cent|datacent|offtaker|hyperscal'`
over gridmachine1 finds zero mentions outside one directory-tree listing. Read by the table's own rules, a
data centre routes to **E4** if it holds a declared transmission point of connection (a 100+ MVA campus
typically would), to **E5** if distribution-scale (not built), and otherwise to **E1**, the general case.
The rule that governs it is line 32: "**A cable engine selects the question. It never decides whether a
question is answered.**" and line 36: "An engine that cannot answer hands to the onshore-connection engine
as the general case and **says that it did**."
PATTERN: routing declared upstream as a testable field; fallback must announce itself

### F11 E5 is missing as an engine "not for want of data"
KEY: gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 CABLE-ENGINE-DATASHEETS.md:95-99
QUOTE:
```markdown
| **Inputs held** | More than recorded earlier. Verified in the layer files: 6,227 features at 132 kV with operators attached, 1,171 at 66 kV, 5,800 substations of which 573 are tagged 132 kV and 2,075 at 33 kV. The assets are present; see [DATA-PROVENANCE](reports/20260907T230000Z-engine-capsule/DATA-PROVENANCE.md) |
| **Inputs missing** | Distribution operator connection data, headroom and constraint publications, and a route calibration of its own. Not the assets, which exist |
| **Outputs** | named asset, voltage, distance, operator, and the constraint position where published |
| **Legitimate silence** | No mapped distribution asset in budget, with the true distance beyond it |
| **Status** | **Missing as an engine, but not for want of data.** The assets are there and the question is simply not asked |
```
WHY: Most UK data centres connect at 132/33 kV, so E5 is the engine a typical data centre needs and it was
the one not built at 2026-09-07. Pipelinenews' own substation data shows data centres sitting on exactly
this voltage: `grep -o` over tools/intelligence/cartridges/grid-actions-inline/data/{GEN}-substation-33kv.json
returns `"n":"Rockingham Data Centre Substation"` with `"v":[33]` (2 rows). The capsule report
(reports/20260907T230000Z-engine-capsule/README.md:33) traces the whole cable-engine idea to one existing
refusal: "**This is the seed of the whole cable-engine idea and it was already here.**"
PATTERN: datasheet before engine; data present but question absent

### F12 612 data-centre relationship slots, every one ABSTAIN
KEY: pipelinenews@6a4c0244b2817c6b8a74661546c8acc35e53a9b7 build/python/202608282200-build-relationship-status-parquet.py:59-64
QUOTE:
```python
    require(data_centres["closed_vocabulary"]["adjudication_decision"] == {"ABSTAIN": 612}, "data-centre decision")
    require(data_centres["closed_vocabulary"]["eligible_for_join"] == {"false": 612}, "data-centre join law")
    require(data_centres["interpretation"]["relationship_type_is_requested_slot_not_asserted_role"] is True, "requested-slot law")
    require(data_centres["interpretation"]["company_number_required_for_any_join"] is True, "company-number law")
    require(data_centres["privacy_and_storage"]["pipeline_news_may_copy_bulk_source_data"] is False, "data-centre copy law")
    require(data_centres["provenance_and_rights"]["datacentermap_network_requests"] == 0, "Data Center Map law")
```
WHY: The federated relationship cartridge consumes data-centres-gb's contract (306 source elements x
OWNER/OPERATOR = 612 slots) and the build dies unless every slot is ABSTAIN and unjoinable. The frozen
contract (data/federation/202608282041-relationship-intelligence-contract.json:177-180) adds:
`"llm_may_establish_binding": false`, `"name_equality_may_establish_binding": false`,
`"requested_role_slot_is_asserted_role": false`, `"company_number_required_before_data_centre_join": true`.
Contract frozen in a1516f23a2f8f1e2a3b286ed73cd580ce501c179 (2026-08-28T20:43:11+01:00). An owner or
operator of a data centre (the counterparty an offtaker conversation needs) is never asserted without a
verified company number.
PATTERN: contract assertions as build gates; abstention counted, not implied

### F13 Project intelligence: early-window projects within 5 km of a mapped data centre
KEY: pipelinenews@6a4c0244b2817c6b8a74661546c8acc35e53a9b7 tools/intelligence/cartridges/project-intelligence/assets/{GEN}-project-intelligence.mjs:178-181
QUOTE:
```javascript
  const close = withDc
    .filter((r) => r[ix.datacentre_km] <= 5 && r[ix.band] === "EARLY")
    .sort((a, b) => a[ix.datacentre_km] - b[ix.datacentre_km])
    .slice(0, 12);
```
WHY: This is the pipelinenews form of "potential offtaker": a consented solar/BESS project still early in
its lead-time window, paired with a mapped data centre within 5 km. Counted in the data file (python over
data/{GEN}-project-intelligence.json and the identical release copy
releases/202609060232-pipelinenews/data/202608311343-project-intelligence.json): 3,054 rows, 1,964 with a
data-centre distance, 98 distinct data-centre names, 263 within 5 km, **10** that pass this filter. Lines
204-205 keep it honest: "This is the mapped built estate, so coverage varies. Useful for spotting where
generation and demand are landing in the same place." The data's own law block reads
`"distance_is_straight_line_only": true` and the caveat label "a screen, not a connection route."
PATTERN: screen, not route; wording held in one labels block

### F14 V8 data-centre layer transplanted as "not publishable"
KEY: data-gridatlas@8bf88da9e210ce9f61dc0398869d3369f3fa2445 contracts/202608291015-v8-transplant-plan.json:237-247
QUOTE:
```json
      "source_id": "datacentres",
      "phase": "p1_foundation",
      "wiring": "wired",
      "configured_urls": [
        "data/datacentres.geojson"
      ],
      "resolved_path": "repd_grid_atlasv8/data/datacentres.geojson",
      "git_blob_sha1": "9457f6dc583bbfdcca40926c353738b321fcb09b",
      "bytes": 40563,
      "sha256": "a686a2e00253bbf30c9f5262439bc2332524e8d5cb34481529c6a711c73acab4",
      "expected_features": 240,
```
WHY: The Atlas V9 data boundary carries F1's blob forward by hash and then refuses to promote it: lines
270-272 read `"provenance_note": "OSM-derived foundation candidate; reacquire with OSM identifiers and attribution before promotion."`,
`"disposition": "PARITY_CANDIDATE_NEEDS_REACQUISITION_AND_LICENCE_PROOF"`, `"publishable": false`.
`sha256sum` of globalgrid2050's repd_grid_atlasv8/data/datacentres.geojson prints the same
a686a2e0...acab4. Two independent lanes (pipelinenews newsv6, data-gridatlas) diagnosed the same missing
OSM identifier four days apart. First data-gridatlas data-centre commit:
f6d3e7a30a63103d196ddb7be77dbafe6fce8809 (2026-08-29T09:16:30+01:00).
PATTERN: carry by hash, promote only on proof

### F15 The sector classifier: one regex, and the only topic left standing
KEY: pipelinenews@6a4c0244b2817c6b8a74661546c8acc35e53a9b7 discovery/javascript/202609010015-sector-topic-evidence.mjs:23-25
QUOTE:
```javascript
  if (/\bdata cent(?:re|er)s?\b/u.test(text)) {
    return { topic: "DATA_CENTRES", rule: "DATA_CENTRE_EXPLICIT" };
  }
```
WHY: Data centres are the first rule checked, and the only sector topic that survived the relevance gate.
tools/intelligence/cartridges/unbound-carries-nothing/cartridge.json:10-11 rewrites the strip from
"Data centres · inverter security/policy · Strait of Hormuz · Ukraine · Great Grid Upgrade · worldwide PV · MV/HV components."
to "Data centres. Six further topics are withheld: the collector returned a generic government feed rather
than results on those subjects." (commit 222b8217e8ae3990bb6605861993436e0b53990f, 2026-08-31T22:14:58+01:00).
The owner export that feeds it is pinned by digest (discovery/javascript/202609010719-sector-intelligence-runner.mjs:696-698:
`assert.equal(sha256(bytes), contract.federation.data_centres.export_sha256, "pinned owner export digest changed");`).
PATTERN: withhold rather than pad; pinned upstream digest

### F16 The oldest "potential offtaker" line: a legend header in the first atlas
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f repd_atlas_grid_model_v1backup.md:458-463
QUOTE:
```javascript
        "<div class='legend-break'>HEAVY ENERGY USERS (Potential PPA/Offtakers)</div>": dummyHeaderDemand,
```
WHY: (Quoted line 458 only; line 463 is `"<span style='color: #00ffff; font-weight: bold;'>🖥️ Data Centres</span>": dataCentreLayer,`.)
In the "UK & France Energy Atlas" backup (front matter, line 3), data centres sit under a legend header
that already frames demand as a counterparty for generation, and line 483 fetches `datacentres.geojson`.
The same cyan (#00ffff) survives as the `dc` layer colour in data-gridatlas
contracts/202608291015-v8-layer-config.json:240. The commit date is beyond the shallow boundary
(UNVERIFIED), but the content is the earliest offtaker framing found.
PATTERN: demand as counterparty (the idea before the engine)

### F17 "Energy Users", one layer at a time: the diary that set the order
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f diary-notes-log/260522-0115-v7-rollback-and-working-method.md:89-97
QUOTE:
```markdown
The intended feature was to introduce separate Energy Users layers in addition to Energy Assets. The desired Energy Users were:

EV Rapid 100 kW plus.

Data Centres.

Major Industrial Sites.

This was strategically sensible because it distinguishes energy generators and storage from energy demand. However, the implementation became unstable because it combined several separate jobs:
```
WHY: The file name dates it to 2026-05-22 (260522-0115), the earliest dated data-centre text found in the
slice; git cannot confirm it (shallow clone). It records a rollback and the remedy (lines 230-231: "2.
Confirm exact data file path for Data Centres. 3. Add Data Centres only."). Its pairing of EV rapid
charging with data centres comes back four months later as the Compute Against Charging workbench (F8).
PATTERN: one layer per version (the precursor of "one engine per version", CABLE-ENGINE-DATASHEETS.md:108)

### F18 The workbench stamp pins a commit; the import does not
KEY: globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f grid_engine/202609060316-data-centre-connection/index.html:171
QUOTE:
```javascript
const ENGINE_MODULES = ["https://ventusltd.github.io/ventus-grid-engine/engine/firm-capacity.js","https://ventusltd.github.io/ventus-grid-engine/engine/diversified-demand.js","https://ventusltd.github.io/ventus-grid-engine/engine/electrification-demand.js"];
```
WHY: Line 71 stamps "engine firm-capacity.js, diversified-demand.js, electrification-demand.js at 2b0db38"
(resolves in ventus-grid-engine to 2b0db38f46b21d835de36dcf04597f8c78ba9270, 2026-09-06T04:13:21+01:00),
but the page imports the moving github.io path. firm-capacity.js changed again 15 minutes later
(c94470107ca6b9a140406002f594110918ea3dc4, 2026-09-06T04:28:07+01:00, "a computed MVA printed all sixteen
of its digits"), so the served page cannot run the commit it names. The only guard is the schema check
at lines 272-274 (`throw new Error('unexpected schema ' + ...)`), which catches a schema change but not a
change in behaviour. This is the same class as gridmachine1 BUGS.md:28 GG-007 "A dependency that tracks a
moving branch".
PATTERN: stamp-vs-import drift (a defect worth a Kuiper law)

### F19 The offtaker as a development stage worth 8 per cent
KEY: ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f sources/v9-extracts/sizing-arithmetic.mjs:202-210
QUOTE:
```javascript
const DEVELOPMENT_STAGES = Object.freeze({
  '0.003': 'Land Option Signed',
  '0.015': 'Grid Connection Application Accepted',
  '0.035': 'Planning Application Submitted',
  '0.055': 'Planning Permission Granted',
  '0.070': 'Grid Connection Terms Reviewed and Agreed',
  '0.080': 'Buyer or Revenue Agreement Reviewed (Power Purchase Agreement (PPA) / Offtaker)',
  '0.100': 'Construction Contract Signed and Finance Committed (Financial Close)',
});
```
WHY: The first "offtaker" in ventus-grid-engine, extracted verbatim from the V9 app on day one (commit
3589facf9901950b880e8d436cf8c69664756205, 2026-09-04T15:00:03+01:00; `git log -i -S'offtaker'` returns only
it). On this ladder the offtaker agreement sits between grid terms (0.070) and financial close (0.100). That
is the commercial reason a generator wants to know where data centres are (F13).
PATTERN: a frozen ordinal ladder keyed by fraction

## Patterns (keyed; each cites at least one F above)

- **Identity loss as an evidence class, not a bug note** (F1, F2, F14). The OSM `type`/`id` dropped at
  globalgrid2050 scripts/fetch_datacentres.py:57-63 is named `DISCOVERY_ONLY_IDENTITY_LOSS` in pipelinenews and
  `PARITY_CANDIDATE_NEEDS_REACQUISITION_AND_LICENCE_PROOF` in data-gridatlas. Both pin blob 9457f6dc.
- **Abstain by default; link only on an exact shared object** (F3, F12). ABSTAIN is the fall-through in
  data-centre-identity.mjs:2-3 and the only legal value in build-relationship-status-parquet.py:59-60.
- **Frozen refusal tables** (F5, F7). `NOT_COMPUTED` in firm-capacity.js:200-209; "Nothing here distinguishes
  a financed project from an enquiry" in specs.mjs:1249.
- **Unknown quantity becomes a declared input** (F4, F8). The power factor is supplied by the caller
  (firm-capacity.js:22). Data-centre MW is typed in, not counted (specs.mjs:1620).
- **Candidate is not commitment** (F7, F9, F12, F19). From the paper (index.md:263) to the relationship slots
  (`requested_role_slot_is_asserted_role: false`).
- **Selection never decides answerability; fallback must announce itself** (F10, F11). CABLE-ENGINES.md:32,36.
- **Screen, not route** (F13). Straight-line distance is marked as a screen in the data law and in the panel
  wording.

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

First appearance per repo (`git log -S'data centre' --format='%H %ad %s' --date=iso-strict | tail -3`, plus
`-i -S'datacentre'` and `-i -S'offtaker'`):

| repo | first data-centre commit | note |
| --- | --- | --- |
| pipelinenews | 691175e257f430a27ad962bd4abdd9ef1934975e 2026-08-24T10:40:24+00:00 "Import V1-V9 legacy lessons from GlobalGrid2050" (github-actions[bot]) | arrives as news headlines inside imported fixtures ("More data centres approved for west London") |
| pipelinenews | a2259bf3c8a9f2b9b2cfaa39e223c299224c5c81 2026-08-25T05:09:58+01:00 "feat: add NewsV6 data-centre evidence namespace" | first `datacentre`/data product (F2, F3) |
| data-gridatlas | f6d3e7a30a63103d196ddb7be77dbafe6fce8809 2026-08-29T09:16:30+01:00 "bootstrap verified Atlas V9 data boundary" | then ba366e1d95e364b3cfe550cc6bfc400f6950c868 2026-08-29T11:12:21+01:00 (F14) |
| ventus-grid-engine | 3589facf9901950b880e8d436cf8c69664756205 2026-09-04T15:00:03+01:00 (offtaker, F19); 294dcc062cb0fd37b2eaa57ba28436576ae1cb63 2026-09-06T02:59:00+01:00 (data-centre, F4) | `-S'data centre'` (with a space) returns nothing |
| gridmachine1 | none | zero mentions; cable engines written f4caffa6555599e5cca243ead9238c277f19edd5 2026-09-07T22:33:46+01:00, cd77362802c514cbb4ed4ab23d8a64a6e2e6cc13 22:36:01+01:00, d0e11ed0aeea64d941e0bcefd9849ad981b487a5 22:37:08+01:00, bcdab92900c8ff18676bb189c2633abc1d7b7c2f 22:45:16+01:00 |
| energy-transition-simulator | none | zero mentions across 156 tracked files (whole-tree grep, also zero for "demand") |
| globalgrid2050 | UNVERIFIED | shallow clone: `-S` returns the boundary acd2f242667dd60868476490209c5b9ce4aeb8f9 2026-09-16T04:31:08+01:00. Earliest dated text is the 2026-05-22 diary (F17); content predates the clone |

Cadence in pipelinenews (`git log -i -S'data centre' --format='%ad' --date=short | sort | uniq -c`): 64 commits,
2026-08-24..2026-09-06, peak **22 on 2026-08-31** (the sector-intelligence/withdraw-nonanswers storm, F15) and
11 on 2026-09-01. `git log -i -G'data.cent|datacent'` counts 101 commits including the two Kuiper-edition
commits of 2026-10-31.

The Grid Engine before gridatlas, in order:
1. Diary of 2026-05-22: data centres as an "Energy User" layer, rolled back (F17). Atlas v1 legend:
   "Potential PPA/Offtakers" (F16).
2. 2026-08-25: newsv6 identity law (F2, F3). 2026-08-28: federation contract, 612 ABSTAIN slots (F12).
   2026-08-29: data-gridatlas marks the 240-row layer not publishable (F14).
3. 2026-08-31: project-intelligence adds a DATA CENTRES tab (commit bb5105215114c6621dc5349c1cca53b3465541c8
   2026-08-31T15:01:37+01:00, the first commit of the cartridge path) (F13).
4. 2026-09-04: ventus-grid-engine v0.1.0 isolates the maths (3589facf). 2026-09-06 overnight, "the thirty"
   (grid_engine/SCOPE.md): firm-capacity 294dcc06 at 02:59+01:00, paper stamp 202609060203, Data Centre
   Connection Workbench stamp 202609060316 (93 checks, specs.mjs:1202), Compute Against Charging 202609060324.
   SCOPE.md:47-48 already lists "Grid Atlas cartridge: NESO-aligned demand growth layer" and "Grid Atlas
   cartridge: firm capacity on the map" as steps 26 and 27, with no state recorded.
5. 2026-09-07: gridmachine1 cable engines E1..E5, generation-only (F10, F11).
6. Out of slice: gridatlas generation 202610292044 / v9.187 data-centre Grid Engine (per BRIEF.md).

ventus-grid-engine authorship (`git log --format='%an' | sort | uniq -c`): 252 github-actions[bot], 34 Ventusltd,
2 owner. Busiest human days: 17 commits on 2026-09-06, the night of the thirty. gridmachine1: 83 commits, all Ventusltd.

## Gridatlas and datacentre relevance (how this slice bears on the focus)

- The gridatlas DC engine inherits a known defect line: the 240-point layer (F1) has no identity and no
  capacity. The estate recorded this four times before the engine (F2, F8, F14, and F3's
  `atlasIdentityLost`). C-level check: does 06b-dc-engine.js read the 227-site data-grid-gb pipeline rather
  than this blob? (Not verified by W10; out of slice.)
- The data-centre maths gridatlas would need already exists, proven, in ventus-grid-engine: MW to MVA (F4),
  N-1 firm capacity (F5), diversity, and the connection cap (engine/connection-capacity.js:14-19, "WHY THE
  CAP IS AN INPUT AND NEVER AN INFERENCE"). The workbench (F6, F7) is the prototype UI.
- Cable-engine routing for a data centre: E4 if a transmission point is declared, otherwise E5 (missing),
  falling back to E1 with a stated fallback (F10, F11). No engine yet asks the demand-side question.
- "Potential offtaker" in pipelinenews is a 5 km straight-line screen against early-window consented
  projects. It yields 10 pairings (F13). Any gridatlas offtaker surface should keep "screen, not route" and
  the relationship ABSTAIN law (F12).

## Candidates (unkeyed; clearly marked)

- CANDIDATE: the producer that computed `datacentre_km` / `datacentre_name` for project-intelligence is
  not in pipelinenews (`grep -rn datacentre_km --include=*.py --include=*.mjs --include=*.js` outside the
  asset and data files returns nothing). Its source set (98 distinct names, labelled "OpenStreetMap via
  Overpass") is probably a subset of the 240-point layer or of data-centres-gb, but this is unproven.
- CANDIDATE: the gridatlas "30/30/30" naming may echo the firm-capacity worked case (two 30 MVA units,
  firm-capacity.js:10-11; "My site is capped at 30 MVA", connection-capacity.js:9) or "the thirty" of
  SCOPE.md. No line links them.
- CANDIDATE: industrial_offtakers.geojson (globalgrid2050 blog/index.md:100 "large industrial electricity
  consumers") is the sibling offtaker layer. Not opened (data file).
- CANDIDATE: REPD carries co-located generation and data-centre projects (pipelinenews grid-proximity data:
  "Rover Way, Splott - Energy Park & Data Centre", 1 row). These are a natural "self-offtake" class.

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)

1. globalgrid2050 scripts/fetch_datacentres.py:57-63 (F1): the origin, and the lesson. One dropped field
   cost four later lanes their joins.
2. pipelinenews newsv6/modules/data-centre-identity.mjs:2 (F3): the whole identity law in one expression.
3. ventus-grid-engine engine/firm-capacity.js:200-209 (F5): refusal as an exported, frozen object.
4. globalgrid2050 grid_engine/specs.mjs:1280-1283 (F6): a storm written into the code beside its fix.
5. globalgrid2050 grid_engine/specs.mjs:1247-1249 (F7) with papers/.../index.md:263 (F9): the offtaker
   problem in two sentences.
6. gridmachine1 CABLE-ENGINES.md:32 (F10): "A cable engine selects the question. It never decides whether a
   question is answered."
7. data-gridatlas contracts/202608291015-v8-transplant-plan.json:270-272 (F14): carry by hash, refuse to
   publish.

## One next command (exactly one, runnable from a clone)

```
git -C /home/user/estate/gridatlas grep -n -E '9457f6dc583bbfdcca40926c353738b321fcb09b|a686a2e00253bbf30c9f5262439bc2332524e8d5cb34481529c6a711c73acab4|datacentres\.geojson' -- tools/offtakers atlas/current.json
```
(Answers whether the live data-centre Grid Engine still touches the identity-less 240-point blob from F1.)
