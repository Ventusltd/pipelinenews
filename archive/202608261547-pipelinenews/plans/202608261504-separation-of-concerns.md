# PipelineNews separation-of-concerns and farming contract

**Timestamp:** `202608261504`

**Checkpoint:** one document only

**Status:** `BOUNDARY_CONTRACT`
**Product authority:** owner-trusted GlobalGrid V9.6.2

## Goal

Archive every current PipelineNews byte without loss, classify every existing PipelineNews application as `DISCONTINUED`, and rebuild from the trusted GlobalGrid V9.6.2 application one small, independently proven module at a time.

All owner repositories are training and farming evidence. They may contribute isolated techniques after comparison, but they do not outrank the trusted product or create project identities.

## Sole trusted application reference

| Field | Pinned value |
|---|---|
| Repository | `Ventusltd/globalgrid2050` |
| Inspected commit | `204aae6462a9851a8341af59760c3e7cb6ad08a5` |
| Current verified commit | `c36e41a689a62bdfa13b4258f3cbc48301854108` |
| Path | `uk_renewables_pipeline/v9.6.2` |
| Git tree at both commits | `99d3b5d80be77b43c9819a571f468913e6132d07` |
| Full subtree | `190` files · `46,153,719` logical bytes |
| Verified runtime/data closure | `58` files · `12,831,093` bytes · `58/58` live SHA-256 matches |
| Trusted URL | `https://globalgrid2050.com/uk_renewables_pipeline/v9.6.2/` |
| Status | `TRUSTED_REFERENCE` |

The root governed news payload is also part of the authority closure: `dist/major_project_news_v9_5_1.json`, `406,514` bytes, SHA-256 `cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd`.

No PipelineNews directory is a trusted application parent.

## PipelineNews archive pin

| Field | Pinned value |
|---|---|
| Repository | `Ventusltd/pipelinenews` |
| Source commit | `e2c7f01cd7f3af4e189470ce3769df5259bf63cf` |
| Root tree | `4d7d0e058f77b223dcfab6cec1b6e41a6a113d4f` |
| Tracked files | `729` |
| Tracked directories | `202` |
| Logical bytes | `149,766,307` |
| Unique Git blobs | `502` |

The archive must index this exact clean commit, not a dirty worktree or the separate local recovery branch. It will pin Git objects and SHA-256 values instead of copying 149 MB of payload.

## Decisive comparison

`202608260159-pipelinenews` is not an exact V9.6.2 copy and must not seed the rebuild.

| Subtree path comparison | Result |
|---|---:|
| Trusted V9.6.2 files | `190` |
| PipelineNews 01:59 files | `62` |
| Shared relative paths | `57` |
| Byte-identical shared paths | `53` |
| Modified shared paths | `4` |
| Trusted paths missing from PipelineNews | `133` |
| PipelineNews-only paths | `5` |

The four modified shared paths are `index.html`, `scripts/core/news-regions-v9-6-2.js`, `scripts/plugins/newspaper-v9-5-1.js` and `scripts/plugins/projects-v9-5-1.js`.

The runtime closure has a fifth authority substitution: the trusted 406,514-byte news payload was replaced by a 113,883-byte local payload, SHA-256 `c1d7d89f25077a883166ce0d11cfe58fa0fe35b71507980e8e8492fd10667283`. Its 133 readable headlines were replaced by generic identity labels. The modified project renderer replaces `project.operator` with `OPERATOR LABEL WITHHELD` in the table, mobile text and CSV. This is the known presentation-boundary privacy failure.

The captured local Chart.js file matches the library currently served to V9.6.2, but the new build must pin those vendor bytes explicitly rather than depend on an unversioned CDN URL.

## Disposition of current PipelineNews

The following are `DISCONTINUED` and archive-only:

- all nine top-level timestamped application directories;
- `newsv1` through `newsv7` as applications;
- `analytics_v1`, `attributionv1`, `consumer_v1` and `discoveryv1` as executable lineages;
- executable applications under `v1-9-legacy-lessons`;
- existing candidate/current pointers and application deployment claims.

Attestations, data, documentation, manifests, objects, reports, skills, tests, tooling and workflows remain training evidence. `DISCONTINUED` means preserved and searchable but excluded from compilation, deployment and identity authority. It never means deleted.

No workflow or pointer is disabled until the complete archive cartridge passes; recovery comes before deactivation.

## Separation map

Root folders are stable, lowercase and alphabetically organised. Stable source modules use stable descriptive paths and Git history. Timestamped names belong to produced archives, compilers, compiler attestations and releases.

| Root | Stable internal areas | Single responsibility |
|---|---|---|
| `archive/` | timestamped cartridges only | complete manifests, comparisons and recovery evidence |
| `data/` | `cartridges/`, `tombstones/` | canonical schemas, GeoJSON, Parquet/DuckDB products and content-addressed evidence |
| `index/` | timestamped compiler files | finite, hash-pinned, one-way compilation |
| `plans/` | timestamped decisions | one small work order and handoff at a time |
| `python/` | `fetchers/`, `builders/`, `validators/` | bounded retrieval, deterministic transformation and independent validation |
| `releases/` | timestamped output directories | immutable, reproducible compiler output only |
| `spider/` | `registries/`, `schedulers/`, `admission/` | bounded discovery, health and abstaining evidence admission |
| `state/` | `live-set.json` | the new chain's only replaceable pointer |
| `tests/` | stable test modules | source contracts and immutable-output gates |
| `ui/` | `javascript/`, `styles/`, `templates/` | isolated accepted interface; no identity or ingestion authority |

The dependency direction is final:

```text
trusted/archive evidence -> ui + python + data + spider -> timestamped index compiler -> timestamped release
                                                        -> state/live-set.json selects proven live objects
```

A compiler never writes into a source folder. A release never becomes compiler input.

## Aggressive farming law

Every farmed item receives a source repository, commit, path, blob/hash, responsibility and comparison decision: `IDENTICAL`, `ADAPTED`, `REJECTED` or `ABSTAIN`. Nothing is copied because its old test was green.

Useful evidence to review later as separate bricks:

- NewsV1: singleton loading, bounded hydration, 100-row pagination and debounced search;
- NewsV2: project identity separated from unverified event claims;
- NewsV3: exact organisation-label namespace and transaction-role abstention;
- NewsV4: source-health precedence and context-only rules;
- NewsV5: publish, hold, reject and abstain reason gates;
- NewsV6: separate data-centre identity domain;
- NewsV7: optional intelligence starting only after the core surface;
- 15:28: URL allowlisting and strict null promotion;
- 16:51: bounded sequential, rate-aware frontier cursor;
- 17:50: exact-reference plus name/authority binding, abstention and `UNKNOWN` connection discipline;
- Atlas V8 and Spider repositories: capability boundaries, viewport/bounded work, registries, provenance and federation relationships.

Hard rejects include the 16:22/16:36 planning-reference auto-binder without sufficient name/authority proof, every renderer-wide privacy rewrite, the 19:29 privacy bundle, old application shells, and all legacy deployment pointers.

## One-brick order

1. Publish and independently verify one complete timestamped archive cartridge for all 729 PipelineNews paths and the trusted V9.6.2 pin.
2. Disable old deployment admission in a separate reversible checkpoint.
3. Create one stable root or one small module at a time, farm it aggressively, test it, and checkpoint it before the next.
4. Farm canonical data and identity contracts before UI code.
5. Copy the accepted V9.6.2 HTML/CSS surface without redesign, then split JavaScript into newspaper, project table, filters, CSV, gauges and loading modules.
6. Add Python and Spider capabilities only through separate evidence and identity gates.
7. Write the timestamped compiler last; compile and browser-test a timestamped release before any deployment decision.

## Stop conditions

Stop on any source-tree mismatch, missing blob, changed archived byte, unclassified path, invented identity, privacy mutation of admitted text, old-lineage import, compiler write outside its output, or deployment before browser proof.

## Checkpoint acceptance

This checkpoint changes only `plans/202608261504-separation-of-concerns.md`. It creates no source folder, moves no file, changes no pointer, disables no workflow and composes no application. The owner guides the next small brick after reviewing this contract.
