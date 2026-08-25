# Pipeline News changelog

This is the authoritative repository change record from the frozen GlobalGrid2050 V9.7 handover into Pipeline News. It corrects the earlier draft against repository commits, release manifests, build reports and the admitted DESNZ Renewable Energy Planning Database (REPD) spine.

## How to read this record

- `LIVE` means a manifest expressly records `publication.live: true` and the stable route has been switched.
- `DEPLOYED CANDIDATE` means GitHub Pages serves the immutable folder, but the stable product route has not been promoted.
- `CANDIDATE_NOT_CURRENT` means deterministic fixtures or governed batches pass while a required current external-source run has not completed.
- A moving `releases/current.json` candidate pointer is not a production promotion.
- Release folders and manifests are immutable. Corrections require a successor release. The historical exceptions below are disclosed rather than hidden.
- New release IDs use `YYYYMMDDHHmm-pipelinenews`, where the digits are the Europe/London operator-inception clock and the manifest records the full UTC offset. Historical uppercase timestamp paths remain frozen.

## Canonical data quantities

The three REPD quantities below are different and must never be collapsed into one number.

| Quantity | Rows | Meaning |
|---|---:|---|
| Q2 2026 official source file | 14,657 | Every row in the DESNZ quarterly CSV before Pipeline News scope rules |
| Current scoped source candidate | 7,703 | Solar Photovoltaics, Battery, Wind Onshore and Wind Offshore at 1 MW or more, across all official statuses |
| Frozen admitted/public spine | 7,680 | The currently published canonical project set used by NewsV1, NewsV7 and timestamp candidates |
| Candidate delta | 23 | New REPD references held for fail-closed quarterly admission; not silently added to the public spine |

The admitted 7,680-project spine totals 356,474.09 MW. It remains the public baseline until the 23-row candidate delta passes the declared quarterly-release admission process.

## 2026-08-25 — `202608251929-pipelinenews`

Status: `CANDIDATE_PREPUBLICATION`; manual recovery successor. Live status remains unverified until a separate append-only closure attestation records the exact commit, PipelineNews Pages check, GlobalGrid catalogue commit and both live checks.

- Restores the frozen NewsV7-grade surface: 133 typed evidence rows, the complete 7,680-project spine, eleven columns, 100-row pages, technology/status/region/search controls, inclusive official-capacity limits, bidirectional sorting, CSV export and Atlas links.
- Preserves frozen NewsV7 data bytes through content hashes; neither rejected timestamp predecessor is a product baseline or current release.
- Removes every raw operator label, unstructured headline and summary from the new public presentation. Typed evidence labels preserve ledger order. Restricted evidence URLs are withheld; other links resolve only to a source domain, preventing path/query identifier disclosure.
- Keeps one governed organisation association for the REPD 13599 sentinel visibly separate from the official REPD operator field. The official operator column remains universally withheld.
- Records REPD 17494 as the stable second sentinel while current discovery remains fixture-only and its connection decision abstains.
- Loads optional intelligence after the newspaper and project register. Optional-summary failure cannot block the core product.
- Reports the official-source frontier as 60 of 6,870 groups, 174 observations, 29 authority-safe primary matches and 145 abstentions; the planning source remains degraded.
- Publishes connection timing and method as `UNKNOWN`, with the next gate limited to an accepted connection offer, network register, energisation notice or exact official network document.
- Adds exact byte-category accounting, a deterministic builder/verifier, a desktop/390-pixel live-browser QA script and append-only closure-attestation pointers.

## 2026-08-25 — `202608251750-pipelinenews`

Status: `CANDIDATE_NOT_CURRENT`; intended for an immutable Pages deployment after deterministic verification, with no stable-route promotion. A current governed search-index run has not completed.

Material capability: authority-safe official planning binding and cached-snapshot quarantine.

### Added

- A content-addressed `PN-OFFICIAL-FRONTIER-V3-AUTHORITY-SAFE` matcher. A planning reference is no longer treated as globally unique merely because it is unique inside REPD.
- A second identity gate: an exact PlanIt reference must also have one exact project-name match or one REPD planning-authority match after a small explicit alias map. Multiple or absent corroborators produce `ABSTAIN`; substring and fuzzy authority matching are forbidden.
- A deterministic reclassification of the immutable official-source snapshot. The raw evidence is preserved; only the derived decision changes.
- A browser-readable audit shell linking to raw and audited records while showing authority-safe and abstention counts plus the explicit Solar/BESS market-intelligence mission.
- A current-release Pages assertion resolved through `releases/current.json`, so deployment tests cannot continue checking only an older hard-coded folder.
- Commit-pinned GitHub evidence links for DiscoveryV1 and AttributionV1; the predecessor's unpublished relative-directory links are not repeated.
- A content-addressed snapshot of this changelog plus hashes for the builder, poller, collision fixture, verifiers and runner.
- A manifest byte counter covering the three-file shell, new content-addressed bytes, reused pinned bytes, executable proof and minimum Pages additions.

### Corrected

- The pinned snapshot contained 48 planning-reference groups and 128 PlanIt records. The earlier policy labelled all 128 `PRIMARY_MATCH` and none `ABSTAIN`.
- Reclassification retains 23 planning-authority-corroborated records; exact project-name confirmations in this pinned snapshot are zero.
- It changes 105 records to `ABSTAIN`: 103 lack authority or project-name corroboration and two do not contain the exact queried reference.
- The 103 uncorroborated records include repeated local-reference collisions across unrelated planning authorities. Examples included domestic extensions and other non-renewable applications previously attached to renewable projects solely because local councils reused the same reference string.
- Capacity, technology and publisher credibility remain forbidden as identity evidence.
- `RELEASE_ARCHITECTURE.md` now agrees with the operative lowercase, Europe/London convention in `release-naming.md` and current manifests.

### Net-zero market-intelligence mission

- The admitted REPD spine records 3,563 Solar projects totalling 67,013.29 MW and 1,609 BESS projects totalling 147,681.94 MW. The release manifest retains the complete official status distributions rather than silently narrowing them.
- This release advances progress intelligence by preventing wrong planning applications from masquerading as evidence about those projects; it preserves 23 authority-corroborated observations and directs 105 unsafe bindings to review.
- **When are they connecting?** `UNKNOWN_NOT_IN_PINNED_EVIDENCE`. No verified grid-connection date is present in this release's pinned evidence.
- **How are they connecting?** `UNKNOWN_NOT_IN_PINNED_EVIDENCE`. Planning references do not establish voltage, substation, route, bay, queue position or energisation method.
- The next evidence gate requires a dated NESO, transmission-owner or DNO queue/connection record, connection agreement, or exact official planning/network document bound through the authority-safe identity gate.

### Preserved

- 7,680 admitted projects and 356,474.09 MW.
- NewsV1 and NewsV7 bytes and their complete newspaper/project-table interface.
- Beacon Fen `PRIMARY_MATCH` to REPD 13599, never 13600.
- East Pye `PRIMARY_MATCH` to `GG2050-REPD-17494`; the co-located battery REPD 20670 is not substituted.
- No article body retrieval, no person-keyed attribution and no overwrite of official REPD facts by news.

## Repository changes after `202608251701-pipelinenews`

These four post-creation commits followed the 17:01 creation commit and preceded the `1750` successor:

- `6ec3dbcf870496625ec122b0160bc976e2cc61ad` — checked the unchanged Q2 2026 REPD source and retained the 23-row scoped delta as candidate-only.
- `c3d18599382b0269aca7438477b14d6b5c7aabd5` — added the official-frontier objects to the 17:01 manifest.
- `250cce12c53d903776ed9a4d3685cd1ca25627ff` — made the official-source workflow react to any release-manifest change.
- `1133183db122cdea211f5a9c67bfa35b81ef4e37` — advanced the official-source frontier to cursor 48 of 6,870 reference groups. Twelve of 13 PlanIt requests succeeded; the remaining request returned HTTP 429. GOV.UK was live.

The earlier repository snapshot at `48d60afa3517bebc04783d69fd3cb0e578f4095a` was therefore five commits behind the audited starting HEAD `1133183db122cdea211f5a9c67bfa35b81ef4e37`.

## `202608251701-pipelinenews`

Creation commit: `152f7b79a48cbbe9854a0f2dc4244dbe7ff22bf9`.

Status: `CANDIDATE_NOT_CURRENT`; `publication.live: false`; candidate pointer updated; stable app not switched.

- Published DiscoveryV1 and AttributionV1 as governed data candidates across seven deterministic batches.
- Discovery retained noisy indexed-web observations as bounded title, snippet and outbound URL records. Result pages and article bodies were not fetched.
- An identifying East Pye snippet bound to `GG2050-REPD-17494`; a headline-only row abstained.
- Attribution recorded organisations rather than individuals, preserved contradictory claims append-only and published neutral discrepancy states.
- Live discovery observations and live attribution roles remained zero because a current governed search-index run had not completed.
- NewsV1 and NewsV7 were not mutated.

Known immutability exception: commit `c3d18599382b0269aca7438477b14d6b5c7aabd5` amended this release manifest after creation. That contradicted the release architecture. The state is recorded here; the manifest must not be edited again, and corrections proceed through successor releases.

## `202608251700-pipelinenews`

Commit: `b21305c5d5df8dcf0c6c54f1f2bc7b411012c409`.

Status: deployed candidate; stable app not switched.

- Established the permanent lowercase `pipelinenews` path slug.
- Preserved every historical uppercase release path rather than renaming it.
- Retained the full 7,680-project official-source frontier, 7,315 projects with planning references, 365 without and 6,870 unique normalised reference groups.
- Retained official-first source ranking while keeping noisy Google discovery enabled as a non-authoritative signal.

## `202608251651-PipelineNews`

Feature commit: `a18ef689d70624b5c300a2f8cc2afa34794d9276`.

- Added a sequential, rate-aware PlanIt frontier with a persistent cursor and no duplicate queries inside one run.
- Added a scope-aware quarterly REPD source diff.
- Preserved unfinished work on HTTP 429 instead of reporting an empty success.
- Retained the 7,680 admitted spine while holding the current scoped-source delta for explicit admission.

## `202608251636-PipelineNews`

Feature commit: `2786ff76e0dab309a33d56255fd1ebb31a3e2170`.

- Expanded the official-source scheduling contract across all 7,680 admitted projects.
- Recorded 7,315 projects with planning references, 365 without, 6,870 normalised reference groups and 2,752 live pre-construction projects.
- Required abstention where one normalised REPD reference identified more than one REPD project.

## `202608251622-PipelineNews`

Feature commit: `f4bc02a06fd59462391f2d31ce2ae65bea76a04a`.

- Ranked official REPD/GOV.UK/planning evidence above original publishers and noisy discovery.
- Kept Google discovery enabled for recall while preventing credibility scores from establishing project identity.
- Preserved original-publisher attribution and outbound links.

## `202608251528-PipelineNews`

Feature commit: `60e0612d23118c45cb965ef8f100ed361a08e38b`; visible-folder correction: `5ab716b5281381da822ea2aef9c859a8d4d1a14e`.

- Introduced timestamp manifests and shared content-addressed objects.
- Published one URL-only discovery candidate with zero article IDs, claims, project bindings, capacity assertions or data-centre bindings.
- Did not switch the stable interface.

Known immutability exception: the first timestamp candidate was corrected after its initial commit while the release discipline was still being established. Later historical files remain as committed; the corrected policy is successor-only.

## NewsV7 — cumulative public-app candidate

Feature commit: `a559e2fa3b98d7ac56d1948142b661cc303e0598`; paint-path improvement: `5a733a36a12c53c18a70a02ce8dd2c89c6687bde`.

- Preserved 7,680 projects, 356,474.09 MW, newspaper counts `133/45/19/4/9/6`, exact visible order, eleven project columns, 100-row pages and contained mobile horizontal scrolling.
- Preserved Beacon Fen REPD 13599.
- Integrated 45 material-event annotations while retaining `HEADLINE_DERIVED_UNVERIFIED` status.
- Integrated 28 organisation labels, 29 direct operator-source claims and 45 explicit commercial-role abstentions.
- Exposed six fail-closed source-health decisions, 45 held research reasons, zero published opportunity reasons and two separately namespaced data-centre observations.
- Deferred the cumulative intelligence load until after the newspaper paints.

## AnalyticsV1 and ConsumerV1

- `7f799df7f85c453307eb95573d4fa932bd6884dc` added the pinned DuckDB/PyArrow analytical build path.
- `684d556671e79d09f9988fb3cd318e62823816e8` published nine zstd Parquet tables containing 208 audited rows and reproducible DuckDB view SQL. No `.duckdb` database was committed.
- `060c5b69448ad1290185c653f45349f587222ebf` built four ordered consumer projections.
- `1722ac99aee0fdc826c6af2aa19b4f2f5fbd7a54` corrected exact provenance hashes.
- `8960a1635d49dcd9f065fb5e0caeaa363da1573c` published validated artifacts and interface guards with zero renewable/data-centre identity links.

## NewsV2 through NewsV6

- NewsV2 (`ab093820a819437b01f94c116e27b784f333f3e8`): 45 deterministic material-event assertions; every event remained headline-derived and unverified; no commercial inference.
- NewsV3 (`c001b7018f6107ac9abebe6deab312e303817915`): 28 unresolved organisation labels, 29 direct operator-source claims and 45 buyer/seller/lender/EPC/ICP/OEM/supplier/adviser abstentions.
- NewsV4 (`f467febc6ba5d6b7c61e0ee42bc9bb3f4193333e`): six market-context source-health decisions: zero current, one stale, four degraded and one unavailable; context could not verify identity, events, grid constraints or deals.
- NewsV5 (`9ffdb64fca4dbb4cc2e41ec1315e8444c71ce1c7`): 45 transparent reasons held for verification and zero unsupported published opportunity reasons.
- NewsV6 (`a2259bf3c8a9f2b9b2cfaa39e223c299224c5c81`): six governed data-centre sources, two exact observations and zero renewable-project identity links; untyped capacity stayed null.

## NewsV1 — frozen V9.7-parity public app

Primary release commit: `d1f573fb6421903e37e164edafcc3c8cae2407f0`; Pages activation: `761128c7fec4429ee6ad30fa9bea15bceb0bfd85`.

- Reproduced the GlobalGrid2050 V9.7 feed, ordering and controls before adding new intelligence.
- Preserved 7,680 projects, 356,474.09 MW, exact news counts, eleven columns, 100-row rendering, filters, export and horizontal mobile table scrolling.
- Kept GlobalGrid2050 V9.7 frozen at source commit `824a23cd0cf9f90a9df942f1b37a09c2dc6472b7`.

## Legacy import boundary

The tracked clean-room archive imports the available V1–V6 and `v7`, `v8` and `v9` directories and preserves their recorded hashes. It does not prove that separately named V9.4, V9.5, V9.5.1, V9.6, V9.6.1, V9.6.2 and V9.7 directories were imported. Those omissions are recorded in the lineage scan and must not be described as a complete byte-for-byte import of every named release.

## Permanent invariants

- Official REPD facts and news signals remain separate.
- Rule-governed identity gates are authoritative; a model or headline may not invent or overwrite a REPD binding.
- Ambiguity produces `ABSTAIN` with candidates retained as evidence.
- The public pipeline is not silently narrowed.
- Original publishers are credited and readers are sent to the original outlet.
- Earlier release folders, manifests and content-addressed objects are never rewritten to deliver a correction.
