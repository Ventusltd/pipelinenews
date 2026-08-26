---
name: build-auditable-duckdb-parquet
description: Build, review, backfill, update, validate, or release auditable DuckDB and Parquet data products in PipelineNews. Use for source ingestion, typed schemas, declared grains and keys, partition rewrites, deduplication, readback checks, audit reports, browser exports, manifests, deterministic releases, and any new news or infrastructure-data module.
---

# Build auditable DuckDB and Parquet products

## Read before changing data

Read, in order:

1. `Ventusltd/globalgrid2050-hompage/docs/DATA_DISCIPLINE_MANUAL.md`.
2. The repository `README.md`.
3. The local `CHANGELOG.md`, `DATA_SOURCES.md`, contracts, manifests and latest audit reports when present.
4. [references/data-gb-electricity-evidence.md](references/data-gb-electricity-evidence.md) when checking the reference implementation or deciding whether a pattern is proven.

Verify current Git state before editing. Treat frozen archives and immutable release directories as read-only evidence.

## Declare the data law first

For every table, declare before implementation:

- owner and source of truth;
- row grain;
- stable key;
- required and nullable fields;
- pinned physical schema;
- one canonical schema shared by historical and forward paths;
- trust status and permitted usage;
- partition law;
- correction and revision policy;
- true invariants, canaries and moving monitors;
- downstream browser projection and explicit display order.

Do not write data while any grain, key or source-usage rule is undefined.

For PipelineNews V1, use the grains and keys already declared in the root README. Keep article identity, source aliases, candidate bindings, binding decisions, regional decisions, publication items and display records separate.

## Apply the write-audit-publish sequence

1. Pin source URLs, retrieval timestamps, source hashes, adapter versions and usage modes.
2. Preserve source snapshots or sufficient reproducible evidence; never commit full third-party articles.
3. Normalise and cast at ingress into typed staging tables without changing official project facts.
4. Generate deterministic IDs and bounded candidates.
5. Apply technology and geography vetoes before identity acceptance.
6. Record every acceptance, rejection and abstention with deterministic evidence and reason.
7. Deduplicate on the declared key before writing.
8. Derive touched partitions from canonical timestamps, including boundary spill, and rewrite them completely; never append blindly.
9. Write typed Parquet with zstd compression to staging.
10. Read each written partition back from disk.
11. Revalidate schema, row count, distinct keys, null keys and duplicate groups after readback.
12. Produce browser JSON from declared DuckDB queries with explicit `ORDER BY`.
13. Write an audit report and release manifest containing row counts, key counts, hashes, module versions, source snapshots and output paths.
14. Publish only after all hard gates pass and an independent clean-checkout verification agrees.

Use DuckDB for reproducible transformation, joins, queries and validation. Typed PyArrow writers are acceptable when they enforce the same pinned schema and readback law. Parquet is the analytical system of record. A committed DuckDB database is optional and must never become an unreproducible second source of truth.

## Test the real law

Require for every keyed output:

```text
total_rows = distinct_declared_keys
duplicate_key_groups = 0
required_null_key_rows = 0
written_schema = pinned_schema
readback_schema = pinned_schema
```

Also require:

- decision totals reconcile to input totals;
- one article has at most one `PRIMARY_MATCH`;
- every accepted project binding has one authoritative REPD reference;
- capacity alone can never establish identity;
- regional records cannot acquire project signals;
- every publication item has source, date, canonical URL and attribution;
- every display row has an explicit stable rank;
- every published artifact is hashed in the manifest;
- identical pinned inputs rebuild byte-identical outputs;
- frozen release directories remain byte-identical.

Treat file count, total bytes, total partitions and growing row counts as floors or anomaly monitors, never as the proof of correctness.

## Separate operating paths

Keep historical import/backfill separate from forward updates.

- Backfill from pinned historical evidence and preserve its source commit and tree.
- Forward updates fetch only bounded periods or source snapshots.
- Make backfill and forward updates converge on the same canonical physical schema before merging.
- Rewrite the full touched partition so reruns converge rather than compound duplicates.
- Default to dry-run or staged output.
- Refuse to publish empty, partial, schema-drifted or source-failed partitions.
- Keep schedules disabled until a controlled manual run is independently verified.

## Preserve publication order and releases

Physical Parquet or DuckDB scan order is never a display contract. Store `release_id`, `view_id` and `display_rank`, and use explicit SQL ordering for every browser export.

Create new immutable release directories for changed data, algorithms, schemas or ordering. Keep `current.json` as the only mutable release pointer. Never rewrite old releases or the legacy archive.

For PipelineNews, reproduce the frozen GlobalGrid V9.7 baseline before adding sources, ranking changes, models or data-centre intelligence.

## Keep modules independent

Give every adapter, normaliser, classifier, veto, binder, ledger writer and exporter:

- one declared responsibility;
- a stable module ID and version;
- typed inputs and outputs;
- deterministic tests and hostile negatives;
- a content hash in the release manifest.

Keep renewable-project identity separate from data-centre, interconnector, EV and industrial-demand domains. A new domain may share the discipline and storage engine, but not another domain's identity law.

## Stop rather than publish when

Stop and report evidence if:

- a source commit, licence or usage mode cannot be verified;
- a frozen byte changes unexpectedly;
- a source returns empty or partial data;
- schema, key, canary, parity, identity or order checks fail;
- output depends on unordered scans or mutable unpinned inputs;
- historical and forward paths produce incompatible physical types;
- a builder is the only verifier;
- unrelated repository changes overlap the task.

Report exact rows, distinct keys, duplicate groups, null keys, schemas, hashes and release paths. Never report only that a workflow is green.
