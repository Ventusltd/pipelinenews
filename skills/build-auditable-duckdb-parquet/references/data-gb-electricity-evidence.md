# Data GB Electricity evidence

Use this reference to distinguish proven implementation from documentation claims. Copy the discipline, not electricity-specific schemas, endpoints, canaries or partition names.

## Pinned source state

- Repository: `Ventusltd/data-gb-electricity`
- Audited `main` commit: `7c492745c974f6b8610cb1209f996b1553abb498`
- Audited Git tree: `8cd7869d42a7cd400aae542d8ffed648fabcdb5c`
- Commit message: `docs: point README to federation discipline manual`
- Federation manual blob: `c96b18cdd08df62471966241e7901bb634814bf8`

## Proven implementation files

| Path | Git blob | Evidence |
|---|---|---|
| `README.md` | `b9be3a5650ef1aefe2fc17c14ead1b8587930c82` | Declares grains, keys, source paths, partitions, invariants and governance. |
| `DATA_SOURCES.md` | `ed2b82ca957be7b0429ee18424e4fd98ec1f6ea5` | Separates historical and forward sources and records trust status and cleaning law. |
| `pipelines/port_csv_to_parquet_impl.py` | `2c6d50843d17134dfb73321ce995c8dbafedc519` | Uses DuckDB to exclude overlapping inputs, deduplicate by declared keys, write zstd Hive-partitioned Parquet and verify duplicates and a settled canary. |
| `pipelines/fetch_elexon_api_to_parquet_hardened.py` | `adb661ad4c3debd05b76697d4ce7f492ac5aaf5c` | Pins PyArrow schemas, validates keys before write, writes zstd Parquet, reads physical files back and revalidates schema and keys. |
| `pipelines/fetch_latest_month.py` | `353e48be838375743e3ac3e71de613d80e8a5a21` | Bounds update months, fails on empty fetches, removes touched partitions and records idempotency and audit evidence. |
| `.github/workflows/backfill_history.yml` | `604397ed94534e7a53d4d6cd9123d2dac3a2ad00` | Keeps the one-time historical path separate and commits only data products and reports after the builder succeeds. |
| `.github/workflows/monthly_update.yml` | `9a311f095e9e535d2195413ec2f98b3f50792298` | Encodes bounded manual/scheduled updates and commit-after-validation intent, but its current runs fail; do not treat it as proven. |
| `reports/latest_parquet_audit.json` | `63a3f341afac09321e749beec2a0cea5d4146a61` | Demonstrates a committed machine-readable audit product. |
| `reports/package_verification_summary.json` | `e9c86deac62b8fb0543f7627969454b59e10b9a5` | Older package receipt; useful history, not a current per-file provenance manifest. |

## Verified historical package

An independent full-tree query audit found 456 Parquet files across 319 partitions:

- FUELINST: 10,774,039 rows, the same number of distinct `periodStartUTC + fuelType` keys, zero duplicate groups and zero null keys.
- FUELHH: 1,610,151 rows, the same number of distinct `time + technology` keys, zero duplicate groups and zero null keys.
- Prices: 183,366 rows, the same number of distinct `periodStartUTC` keys, zero duplicate groups and zero null keys.
- Settled FUELINST September 2023 canary: exactly 156,960 rows.

This proves the historical package at the pinned tree. It does not prove the forward updater.

## Adopted patterns

- Declare grain and stable key before writing.
- Separate source register from application code.
- Separate historical backfill from forward updates.
- Use DuckDB for bulk transformation, deduplication, querying and verification.
- Use typed Parquet with zstd and Hive-style partitions.
- Rewrite complete touched partitions for idempotency.
- Deduplicate before write and validate after physical readback.
- Fail on empty results, null keys, duplicate keys and schema drift.
- Emit machine-readable audit reports.
- Publish only after the declared data law passes.

## Do not copy blindly

- The electricity grains, keys, canary value and month partitions are domain-specific.
- A file-count or byte-size floor is only an anomaly monitor, not proof.
- The monthly updater is currently broken. Run `30740156454` on 2 August 2026 failed with `ArrowTypeError: Expected bytes, got a datetime.date object` before commit.
- The failure is a physical-schema split: the historical prices package contains `settlementDate DATE` and `settlementPeriod BIGINT`, while the forward helper pins `settlementDate string` and `settlementPeriod int32`.
- Normalise and cast historical and forward inputs into one canonical schema before merging or writing. Determine all touched partitions after UTC normalisation so boundary spill cannot merge an adjacent undeleted partition.
- Its monthly path writes with PyArrow; therefore do not claim every physical write is performed by DuckDB.
- `DATA_SOURCES.md` and the test-plan document refer to a missing non-hardened helper filename; the actual imported file is `fetch_elexon_api_to_parquet_hardened.py`.
- Git history alone is not an immutable release system.
- A green internal workflow does not replace clean-checkout independent verification.
- Do not create a committed `.duckdb` file unless it is reproducible, versioned, hashed and useful to consumers.
- `reports/package_verification_summary.json` is an older package receipt, not a current per-file provenance manifest.

## PipelineNews translation

Use the root PipelineNews README as the authoritative news contract. In particular:

- `article_id` is based on canonical URL identity.
- Source aliases remain separate from articles.
- Candidate bindings and final binding decisions remain separate ledgers.
- Publication items remain separate from explicit display records.
- Parquet scan order never sets newspaper order.
- News never overwrites official REPD identity, capacity, status or dates.
- V9.7 parity is proved before new modules or sources alter output.
