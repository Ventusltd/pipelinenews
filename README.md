# Pipeline News

Pipeline News is the independent news-data and intelligence engine for the GlobalGrid2050 federation.

It is the clean-room successor to the renewable-energy news discovery, geographic classification and authoritative project-entity binding logic developed through GlobalGrid2050 V1 to V9.7.

Pipeline News owns news ingestion, normalisation, evidence, classification, decision ledgers and published data products. GlobalGrid2050 remains the presentation layer and consumes pinned, validated Pipeline News releases.

The first production milestone is Pipeline News V1.0.0. It must reproduce the current GlobalGrid V9.7 feed and visible ordering exactly before any new source, ranking system or model is permitted to alter the public output.

## AI read first

This repository follows the GlobalGrid2050 Data Discipline Manual:

https://github.com/Ventusltd/globalgrid2050-hompage/blob/main/docs/DATA_DISCIPLINE_MANUAL.md

Repository-local implementation skill: [`build-auditable-duckdb-parquet`](skills/build-auditable-duckdb-parquet/SKILL.md). Read it before creating or changing any DuckDB, Parquet, audit, backfill, update or release pipeline.

Read that manual, this README, the local CHANGELOG, the source register and the contracts before patching, porting, backfilling, scheduling, publishing or wiring this repository to a UI.

Green is not proof. File count is not proof. Size is not proof. A rendered browser page is not proof. The proof is that the data obeys its declared law at its declared grain and key.

## Operating protocol

- Work audit-first and verify repository state against GitHub before editing.
- Work directly on main unless Vikram explicitly changes that instruction.
- Use small reversible commits.
- Never overwrite or delete historical versions.
- Never modify frozen releases in place.
- Use short bounded passes, ideally about 30 seconds each.
- Stop after approximately 500 seconds of active work rather than hanging or looping.
- Report counts, keys, hashes, canaries and exact test results.
- Report PASS, FAIL, BLOCKED or NOT TESTED plainly.
- Stop if a prerequisite, source commit or output cannot be verified.

## Federation boundaries

Pipeline News owns:

- Source adapters and source-health reporting.
- News discovery.
- Canonical URL resolution.
- Article identity.
- Source attribution.
- Near-duplicate and syndication collapse.
- Technology classification.
- Geography classification.
- UK vetoes.
- Candidate generation.
- Rule-based project binding.
- Regional classification.
- Event and relevance classification.
- Publication ranking and explicit display order.
- Complete acceptance, rejection and abstention ledgers.
- Typed Parquet products.
- Compact browser-facing JSON projections.
- Release manifests, hashes and audit reports.

GlobalGrid2050 owns:

- The user interface.
- Newspaper controls, cards, search and filters.
- The project table and mobile rendering.
- Same-origin committed snapshots imported from approved Pipeline News releases.
- A dependency contract identifying the exact Pipeline News commit and artifact hashes.

Pipeline News does not own or alter official REPD facts.

Official REPD identity, capacity, status, dates and references remain authoritative project-source data. Pipeline News may consume a pinned project snapshot for deterministic matching, but it must record the source commit and hash. News intelligence may never overwrite official facts.

## Verified repository anchors

Pipeline News repository:

- Repository: Ventusltd/pipelinenews
- Starting main commit: 691175e257f430a27ad962bd4abdd9ef1934975e
- Starting tree: 956fc4adbc245c5bb24199918f97fa6a77db1e3c
- Existing production code at that commit: none
- Existing tags or releases at that commit: none

GlobalGrid V9.7 baseline:

- Repository: Ventusltd/globalgrid2050
- Merged main commit: 824a23cd0cf9f90a9df942f1b37a09c2dc6472b7
- V9.7 subtree: 4fca94ede95789ade9490258a2323c00c13ec2ea
- Frozen V9.6.2 parent subtree: 99d3b5d80be77b43c9819a571f468913e6132d07
- Live candidate: https://globalgrid2050.com/uk_renewables_pipeline/v9.7/

Data architecture reference:

- Repository: Ventusltd/data-gb-electricity
- Audited main commit: 7c492745c974f6b8610cb1209f996b1553abb498

## Historical release policy

GlobalGrid V9.7 is deployed and validated but remains labelled CANDIDATE in its release contract.

Do not alter V9.7.

Do not repair or reuse V9.6 as a production base. V9.6 is discontinued historical evidence.

GlobalGrid V9.8 must be a new separately addressable consumer release. It must not mutate V9.7.

Pipeline News V1 is a separate data-engine version. It is not itself called GlobalGrid V9.8.

## Legacy archive and known omission

The current legacy archive records this GlobalGrid source commit:

bcf966f21ba778b8e739c5caba47e00ac01f8a2c

The original importer copied:

- V1 to V6 standalone dashboard files.
- The complete v7 directory.
- The complete v8 directory.
- The complete v9 directory.

Those copied files are immutable engineering evidence and must remain byte-identical.

The importer omitted these sibling releases that already existed at the recorded source commit:

- v9.4
- v9.5
- v9.5.1
- v9.6
- v9.6.1
- v9.6.2

V9.7 was created later and is also absent from the original archive.

Before production work:

1. Do not modify any existing archived byte.
2. Add exact V9.4 to V9.6.2 evidence from commit bcf966f21ba778b8e739c5caba47e00ac01f8a2c.
3. Add exact V9.7 migration evidence from commit 824a23cd0cf9f90a9df942f1b37a09c2dc6472b7.
4. Record the source commit and Git tree for every release.
5. Add an ARCHIVE_MANIFEST.json covering the archive.
6. Convert the importer into a verification-only mechanism.
7. Add CI that fails if any frozen archived byte changes.
8. Tag the completed evidence boundary, for example legacy-globalgrid-v1-v9.7-2026-08-24.

The broken V9.6 release should remain present and clearly discontinued. It is recovery evidence, not a production dependency.

## V1 release sequence

Use immutable release candidates:

- v1.0.0-rc.1: exact GlobalGrid V9.7 parity.
- v1.0.0-rc.2: independently audited parity plus hardened release machinery.
- v1.0.0: first approved independent production engine.

New discovery sources and ranking changes belong in a later version. They must not be introduced before rc.1 proves the existing feed can be recreated exactly.

## DuckDB and Parquet architecture

Follow the good data discipline demonstrated by data-gb-electricity:

- DuckDB is the transformation, query and validation engine.
- Typed Parquet is the analytical system of record.
- Use Hive-style partitions.
- Use zstd compression.
- Declare each dataset grain and stable key.
- Pin schemas before writing.
- Rewrite complete touched partitions rather than appending blindly.
- Deduplicate before writing.
- Read every written partition back.
- Validate schema and keys again after readback.
- Record source endpoints and trust status.
- Write JSON audit reports for every serious run.
- Keep historical backfill and forward update paths separate.
- Fail loudly on empty responses, null keys, duplicate keys and schema drift.

Do not copy weaknesses observed in the reference repository:

- Do not rely on ordinary Git history alone as a release mechanism.
- Do not treat an unproven scheduled updater as production.
- Do not leave obsolete script names in the documentation.
- Do not omit formal contracts, manifests and content hashes.
- Do not claim success because a workflow exists or turns green.

A committed DuckDB database is not mandatory. DuckDB may be the reproducible engine while Parquet remains the committed product. If a database is published later, it must be reproducible, versioned and hashed.

## Proposed repository structure

    README.md
    DATA_SOURCES.md
    NEWS_CONTRACT.md
    DEFINITIONS.md
    CHANGELOG.md
    KNOWN_GAPS.md

    contracts/
      v1/
        source-snapshot.schema.json
        article.schema.json
        article-source.schema.json
        candidate-binding.schema.json
        binding-decision.schema.json
        regional-decision.schema.json
        publication-item.schema.json
        display-record.schema.json
        build-run.schema.json
        module-registry.json
        release.schema.json

    src/pipelinenews/
      adapters/
      normalise/
      deduplicate/
      technology/
      geography/
      identity/
      classify/
      rank/
      ledger/
      export/

    pipelines/
      bootstrap_v9_7.py
      fetch_latest_news.py
      build_release.py
      validate_release.py
      publish_release.py

    fixtures/
      v9.7-baseline/
      identity-positive/
      identity-negative/
      regional-positive/
      hostile-negative/

    data/
      dataset=source_snapshots/year=YYYY/month=M/
      dataset=articles/year=YYYY/month=M/
      dataset=article_sources/year=YYYY/month=M/
      dataset=candidate_bindings/year=YYYY/month=M/
      dataset=binding_decisions/year=YYYY/month=M/
      dataset=regional_decisions/year=YYYY/month=M/
      dataset=publication_items/release=vX.Y.Z/
      dataset=display_records/release=vX.Y.Z/
      dataset=build_runs/year=YYYY/month=M/

    dist/
      releases/
        v1.0.0-rc.1/
          parquet/
          browser/
          contracts/
          manifest.json
      current.json

    reports/
      latest_pipeline_audit.json
      latest_source_health.json
      latest_parity_report.json
      releases/

## Mandatory grains and keys

### Source snapshots

Grain: one row per source-adapter retrieval.

Key: source_snapshot_id.

Required fields:

- source_snapshot_id
- adapter_id
- source_id
- retrieved_at_utc
- request_url
- response_status
- content_sha256
- licence_or_usage_mode
- module_version
- build_run_id

### Articles

Grain: one row per canonical article identity.

Key: article_id.

Article identity must be deterministic and based on a normalised canonical URL. URL aliases and redirects must be retained separately so a publisher redirect does not silently duplicate or erase an article.

Required fields:

- article_id
- canonical_url
- original_url
- headline
- source_id
- source_name
- published_at
- retrieved_at
- language
- content_hash
- syndication_cluster_id
- source_snapshot_id
- attribution_text
- licence_or_usage_mode

### Article sources and aliases

Grain: one row per article and source URL relationship.

Key: article_id plus source_url.

This table preserves redirects, syndicated copies and alternate links without creating duplicate publication records.

### Candidate bindings

Grain: one row per article, candidate entity, binder version and project-spine snapshot.

Key: article_id plus candidate_entity_id plus binder_version plus project_snapshot_sha256.

Evidence must preserve:

- Project-name anchors.
- Operator anchors.
- Geography anchors.
- Planning-reference anchors.
- Technology compatibility.
- Capacity corroboration.
- Foreign-location conflicts.
- Collision warnings.
- Score components.
- Rules triggered.

### Binding decisions

Grain: one row per article, binder version and project-spine snapshot.

Key: article_id plus binder_version plus project_snapshot_sha256.

Allowed decisions:

- PRIMARY_MATCH
- RELATED_DEVELOPMENT
- DISCOVERY_ONLY
- REJECT
- ABSTAIN

Every accepted, rejected and abstained article remains in the ledger.

### Regional decisions

Grain: one row per article and regional-classifier version.

Key: article_id plus regional_classifier_version.

Every record preserves technology evidence, geography evidence, UK evidence, utility context, country, region, decision, reason, classifier version and source-snapshot hash.

Every regional article must have project_signal_eligible set to false.

### Publication items

Grain: one row per release and article.

Key: release_id plus article_id.

### Display records

Grain: one row per release, view and display position.

Key: release_id plus view_id plus display_rank.

The publication sequence must be explicit. Physical Parquet or DuckDB scan order is never a display contract.

## GlobalGrid V9.7 parity baseline

The inherited headline input is:

globalgrid2050/dist/major_project_news_v9_5_1.json

SHA-256:

cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd

Baseline counts:

- ALL headlines: 133
- Canonical UK: 45
- V9.4 breadth baseline: 125
- Decision-ledger rows: 133
- Accepted international: 19
- US: 4
- Europe: 9
- International other: 6

Frozen hashes:

- Regional news: 905237ddcbc71761f21d8c78961931676ac0c585030d29af95c75c7772254a99
- Regional decisions: 66f9e8803c6d0d0e847950dc5002a2df3b1f1ac0451de0f76a931256ddcc7409
- Regional manifest: 494030710673dea0e4db52937d2243966fc47639a406a335df5d6bbd4e575467
- V9.7 module registry: a4f2b9a1bb91a517874c8cd84f81eeeb1fa3715cf220f6dee5c07bdbcbcc9109

URL-order hashes:

- ALL 133: da4d119c55eaf1bf963402698ca1615448f4b3961f349bd393d24e1a1043eed8
- Canonical UK 45: 341b8ab1baf327f301e128d9c6a770da42e6a734734fb96a06fc177d407ddd35
- Regional 19: 68a7e9e8ba11426abf8af7b1c6333b7177b425f401cbe8832da335e7eef2f37a

Pipeline News v1.0.0-rc.1 must reproduce these counts and ordered sequences before any new source adapter changes the public output.

## Display-order law

The producer owns display order because the GlobalGrid V9.7 browser filters and maps arrays without sorting them.

Current all_items order:

published descending, then headline descending.

Current canonical_items order:

published descending, then confidence descending, then headline descending.

The UK browser view does not render canonical_items directly. It filters all_items where canonical_relevant is true. The UK view must therefore retain the relevant stories' relative positions from all_items.

Regional classification iterates all_items without re-sorting. The accepted 19 regional stories preserve their relative positions from the 133-item source array.

Pipeline News must emit stable display_rank values.

Every publication query must include an explicit ORDER BY.

An unordered Parquet or DuckDB scan must never control the browser sequence.

New ranking intelligence must create a new immutable release rather than reordering an old one.

## Current interface contract

The visible newspaper controls remain in this order:

ALL, UK, INTERNATIONAL, US, EUROPE, SOLAR, BESS, CONSENT, CONSTRUCTION, OPERATIONAL, FINANCE / M&A, SEARCH.

Default view: ALL.

Semantics:

- ALL displays all 133 inherited items, including discovery-only articles.
- UK displays the 45 canonically bound items in their relative all_items order.
- INTERNATIONAL displays all 19 accepted regional articles.
- US displays the four US regional articles.
- EUROPE displays the nine European regional articles.
- Six other regional stories appear within INTERNATIONAL.
- SOLAR, BESS and event filters operate on the 133-item inherited feed.
- UK and ALL search cover headline, project, operator, county, source, event, REPD Ref and GlobalGrid ID.
- Regional search covers headline, source, technology, country and region.
- Regional stories never update project-table signals.
- Project-table news signals come only from canonical PRIMARY_MATCH items.

Card semantics remain:

- Canonical: RELEVANT confidence percentage, PRIMARY_MATCH and REPD reference.
- Non-canonical: DISCOVERY ONLY and no project signal.
- Regional: region, country, source, classifier version, ledger status and no REPD project signal.

GlobalGrid V9.8 may initially change only its news data adapter. It must not redesign the newspaper, controls, project table or mobile interface.

Inherited project-interface invariants:

- 7,680 projects.
- 356,474.09 MW.
- Eleven project-table columns.
- Horizontal project-table scrolling on mobile.
- No full-page horizontal overflow at 390, 430, 440 or 768 pixels.

## Browser compatibility projection

Pipeline News must publish both:

1. A modern Pipeline News V1 contract.
2. A separate GlobalGrid compatibility projection.

The compatibility exporter initially preserves:

- Schema globalgrid2050.major-project-news.v9.5.1.
- Release 9.5.1.
- Arrays all_items and canonical_items.
- Matching all_headline_count.
- Matching relevant_headline_count.
- v9_4_baseline_headline_count equal to 125.
- Boolean canonical_relevant on every all_items record.
- PRIMARY_MATCH and eligible_for_news_signal true on every canonical item.
- A non-empty repd_ref.
- A gg_project_id matching GG2050-REPD plus the reference.
- The exact Beacon Fen contract.

It also reproduces:

- regional_news.json
- regional_decisions.json
- regional_manifest.json

Every browser artifact must be traceable to:

- A declared Parquet query.
- Explicit SQL ordering.
- Row counts.
- Content hashes.
- Schema version.
- Pipeline commit.
- Module versions.
- Project-spine snapshot hash.
- Build timestamp.
- Release ID.

## Non-negotiable project-identity rules

- REPD Ref ID is the authoritative external identifier.
- Canonical project ID is GG2050-REPD plus the official Ref ID.
- Physical development grouping is separate from project identity.
- Co-located solar and BESS remain separate official records.
- One article may have only one PRIMARY_MATCH.
- RELATED_DEVELOPMENT cannot drive the primary project signal.
- Foreign-location evidence vetoes a UK binding.
- Technology compatibility is mandatory.
- Capacity is corroboration only and never establishes identity.
- News capacity is stored separately as news_capacity_mw.
- News never changes official REPD capacity.
- News never changes official REPD status.
- News-derived events retain the asterisk convention because they remain headline-derived.
- Administrative names are split safely at commas, spaced dashes and the word near.
- Development duplicates are grouped with gg_development_id without merging official records.
- Strong-anchor floor remains 52.
- Weak-anchor floor remains 68.
- Single-token project stems require adjacent descriptive evidence.
- Foreign-collision stems require exact-name evidence.
- Rejection telemetry is published.
- Default classification is ABSTAIN.
- A model never invents an identifier.
- A model never establishes, overwrites or repairs identity from free text.
- Any future model may only verify a bounded rule-generated candidate set.
- A verifier must support a mandatory NONE result.
- Rule-based identity remains authoritative.

## Beacon Fen production sentinel

Correct binding:

- Project: Beacon Fen Energy Park
- Developer evidence: Low Carbon
- Technology: solar
- Official capacity: 400 MW
- REPD Ref: 13599
- GlobalGrid ID: GG2050-REPD-13599
- Role: PRIMARY_MATCH
- Eligible for news signal: true

It must never bind to the co-located BESS record 13600.

The headline Beacon Fen Energy Park development consent decision announced must survive the UK filter.

The separate discovery headline Low Carbon wins permit for 400MW UK solar farm must not create another primary binding solely from developer and capacity evidence.

## Hostile fixtures

Carry forward and expand positive and negative evaluation fixtures.

Mandatory negatives include:

- Foreign projects sharing a UK project stem.
- New Jersey and other US stories.
- Australian storage-market stories.
- Irish storage projects.
- Generic company announcements.
- Technology articles with no project.
- Planning prose with no energy project.
- Capacity-only coincidences.
- Operator-only coincidences.
- Cable-landing, healthcare, airport or industrial stories wrongly treated as renewable projects.
- Duplicate syndicated headlines.
- Project names embedded in unrelated prose.
- Canadian Solar used as a company name rather than geographic evidence.
- Kintore, Wilton and Longhedge leakage sentinels.
- The Grange healthcare headline.

Every rejected or abstained record remains in the decision ledger with a deterministic reason.

## Modular intelligence

New modules must be independently extensible. Each module has:

- A unique ID.
- One declared responsibility.
- A version.
- Input and output contracts.
- Evidence fields.
- A clear failure mode.
- Tests.
- A registry entry.
- A content hash.

Initial module families:

- Source adapters.
- URL canonicalisation.
- Attribution.
- Exact deduplication.
- Syndication collapse.
- Technology evidence.
- Geography evidence.
- UK veto.
- Project candidate blocking.
- Identity scoring.
- Rule-based verification.
- Event classification.
- Regional classification.
- Relevance classification.
- Publication ranking.
- Decision ledger.
- Browser exporter.
- Manifest writer.

Future domain modules may include renewables, grid, data centres, interconnectors, EV and industrial demand. Do not implement future-domain expansion in the parity release.

For future data-centre news, visibly credit and link original sources. Data Center Map remains an outbound directory link unless licensed. Independent facility intelligence should come from official and open sources such as OSM, DSIT, Ofgem, NESO and planning data.

## News aggregation and source policy

Pipeline News is an aggregator, not a republication engine.

It may store:

- Headline.
- Publisher.
- Publication date.
- Canonical URL.
- Concise independently written summary.
- Technology.
- Geography.
- Event.
- Project binding.
- Provenance.
- Retrieval timestamp.
- Classification evidence.
- Direct original link.

It must not commit copied full articles or reproduce third-party maps and images without permission.

DATA_SOURCES.md must record each adapter's publisher, endpoint, access method, grain, update frequency, usage mode, trust status, known limitations, deduplication and failure behaviour.

Prefer original publishers and official sources. Collapse syndicated copies into one article cluster while retaining source aliases.

## Write, audit, publish

Every release build follows this sequence:

1. Retrieve or load a declared source snapshot.
2. Hash and record it.
3. Normalise articles.
4. Canonicalise URLs.
5. Deduplicate by the declared key.
6. Generate bounded project candidates.
7. Apply technology and geography vetoes.
8. Apply deterministic identity rules.
9. Classify remaining unbound articles regionally.
10. Write staged Parquet.
11. Read the written Parquet back.
12. Validate schema.
13. Validate keys.
14. Validate null-key counts.
15. Generate explicit display ranks.
16. Generate browser JSON with explicit SQL ordering.
17. Hash every output.
18. Run parity and hostile tests.
19. Write audit and release manifests.
20. Publish only when every invariant passes.

A failed source must not replace the last-known-good release with empty or partial data.

## Workflow discipline

Keep workflows few:

1. ci.yml for schema, unit, ledger, parity, deterministic-build and archive-integrity checks.
2. update-news.yml for bounded manual updates initially.
3. release.yml for immutable release artifacts and tags.

Scheduling remains disabled until a manual end-to-end update is independently verified. When approved, use the established 05:29 UTC update time unless changed by the owner.

Use Python 3.11, pinned dependencies, concurrency controls, timeouts, fail-loud shell settings, dry-run defaults and an explicit apply flag.

An unattended workflow never commits unvalidated output.

## Hard release gates

### Archive integrity

- Existing archived bytes unchanged.
- Missing V9.4 to V9.7 evidence captured exactly.
- Source commits and tree hashes recorded.
- Archive manifest matches every file.
- CI detects mutation.

### Schema and keys

- Every Parquet table matches its pinned schema.
- Rows equal distinct declared keys.
- Duplicate-key groups equal zero.
- Required null-key rows equal zero.
- Readback schema equals the pre-write schema.

### V9.7 parity

- 133 ALL.
- 45 UK.
- 19 international.
- 4 US.
- 9 Europe.
- 6 international-other.
- 133 complete decisions.
- Content and order hashes match.
- UK is filtered from all_items without reordering.
- Regional items preserve relative order.
- No unordered scan controls publication order.

### Identity

- One or zero PRIMARY_MATCH decisions per article.
- Every primary match has one authoritative REPD Ref.
- Every canonical GlobalGrid ID matches that reference.
- Capacity-only identity is impossible.
- Foreign and technology vetoes run before acceptance.
- Beacon Fen binds only to 13599.
- Beacon Fen never binds to 13600.
- Regional articles contain no project, REPD, operator, county or capacity metadata.
- Regional project_signal_eligible is always false.

### Ledger

- Every input has a decision.
- Every acceptance has evidence.
- Every rejection and abstention has a deterministic reason.
- Source snapshot, module version and project-spine hash are present.
- Decision totals reconcile to input count.

### Publication

- Every published article has source, date, URL and attribution.
- Full third-party articles are absent.
- The manifest hashes every Parquet, JSON and contract output.
- The same input rebuild produces zero byte difference.
- Frozen release directories remain byte-identical.
- current.json is the only mutable release pointer.

### Independent verification

An independent clean checkout recalculates keys, counts, hashes, order, Beacon Fen, hostile negatives and the derivation of browser JSON from Parquet.

## GlobalGrid V9.8 integration

Frozen V9.7 must never fetch a mutable endpoint.

After Pipeline News V1 parity passes:

1. Freeze and tag the approved Pipeline News release.
2. Create GlobalGrid V9.8 as a new directory.
3. Add a source contract containing the Pipeline News repository, commit, release and artifact hashes.
4. Import the compact browser JSON into V9.8 as a same-origin committed snapshot.
5. Change only the V9.8 news adapter initially.
6. Preserve controls, card formatting, display order, project table and mobile interface.
7. Run the inherited V1 to V9.7 regression chain.
8. Test 390, 430, 440 and 768 pixel widths.
9. Verify deployed bytes with cache-busted URLs.
10. Add V9.8 after V9.7 in the GlobalGrid directory without changing old entries.
11. Keep V9.7 byte-identical.

## Bounded implementation plan

### Pass 1: audit and contracts

Verify repository SHAs, worktrees, archive hashes and baseline artifacts. Write the V1 scope and data contracts. Stop if any source differs.

### Pass 2: complete archive evidence

Add the omitted V9.4 to V9.7 evidence without modifying existing archive bytes. Add the archive manifest and integrity check. Commit to main and report hashes.

### Pass 3: scaffold V1

Add the discipline pointer, source register, contracts, definitions, changelog, schemas, module registry, pinned dependencies and minimal CI.

### Pass 4: build the parity importer

Load exact V9.7 artifacts, transform them into typed Parquet and produce the source, article, binding, decision, publication and display datasets.

### Pass 5: port modular decisions

Port the source adapter, technology evidence, geography evidence, UK veto, regional classifier, ledger and deterministic writer as separate registered modules.

### Pass 6: compatibility exports

Generate Pipeline News V1 JSON, GlobalGrid-compatible JSON, regional outputs, source health and a complete manifest.

### Pass 7: parity and hostile tests

Verify counts, content hashes, order hashes, Beacon Fen, hostile negatives, regional sanitisation, deterministic rebuild and Parquet readback.

### Pass 8: freeze v1.0.0-rc.1

Publish the immutable release directory, commit to main, tag the release candidate and stop for owner review.

### Pass 9: independent audit

Use a clean checkout or independent agent. Any repair becomes a new release candidate. Never alter rc.1.

### Pass 10: GlobalGrid V9.8

Proceed after Pipeline News approval. Create the new consumer version, pin and import the approved output, preserve the interface, deploy and stop for visual review.

## Completion report

Every completed pass reports:

- Repository and branch.
- Starting and ending SHA.
- Commit message.
- Files changed.
- Release path.
- Source snapshot and hash.
- Parquet rows and distinct keys.
- Duplicate and null-key counts.
- Decision totals.
- Regional counts.
- Display-order hashes.
- Beacon Fen result.
- Hostile-negative result.
- Artifact hashes.
- Workflow URLs.
- Frozen directories proved unchanged.
- Anything blocked or not tested.

Do not report only that checks are green.

## Stop conditions

Stop if:

- V9.7 would need modification.
- Archived bytes change unexpectedly.
- A source commit cannot be verified.
- Counts or order hashes differ during parity.
- Beacon Fen fails.
- Capacity establishes identity.
- A regional story obtains a project signal.
- A source failure emits empty or partial public data.
- A required grain, key or schema is undefined.
- Unrelated changes overlap the task.
- GitHub permissions prevent verification.
- Work approaches the active-time limit.

## Central rule

Build Pipeline News as the independent DuckDB and Parquet news engine, prove exact V9.7 content and display-order parity first, freeze every release, and only then let a new GlobalGrid V9.8 consume the pinned output without changing the current interface.
