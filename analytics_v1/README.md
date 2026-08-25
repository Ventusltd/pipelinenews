# PipelineNews analytical storage V1

Status: `CANDIDATE`, data-only and not live.

Movement 5 publishes nine typed zstd Parquet tables spanning NewsV2–NewsV6, reproducible DuckDB view SQL, a physical readback audit and a release manifest. It commits no `.duckdb` database; views are recreated from immutable Parquet.

The original `storage.v1.json`, `dependency_audit.json` and `cross_version_reconciliation.json` remain as immutable evidence of the first runner's `BLOCKED_DEPENDENCIES` preflight. They are superseded for the physical candidate by:

- `contracts/parquet-build.v1.json`;
- `data/parquet_manifest.json`;
- `reports/parquet_audit.json`;
- `sql/views.sql`.

Run `bash analytics_v1/tests/run-parquet.sh` in the pinned Python environment. It writes every table, reads it back through PyArrow and DuckDB, verifies schemas, keys, hashes and domain separation, then reruns NewsV2–NewsV6 regression gates.
