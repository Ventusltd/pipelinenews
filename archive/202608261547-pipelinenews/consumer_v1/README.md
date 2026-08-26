# ConsumerV1 — ordered intelligence projection

ConsumerV1 is a data-only `CANDIDATE`. It converts validated NewsV5 and NewsV6 Parquet into compact JSON through declared DuckDB queries with explicit `ORDER BY` clauses.

It does not change or deploy NewsV1. The interface guard independently freezes the `133 / 45 / 19 / 4 / 9 / 6` news counts and URL order, Beacon Fen REPD Ref `13599`, eleven project-table columns and mobile horizontal scrolling.

The publishable reasons list is empty by design because NewsV5 has no directly verified public reasons yet. Data-centre sources, observations and abstained link decisions remain in the independent `PN-DC-*` domain and cannot become renewable-project signals.

Build and verify in the pinned analytics environment:

```bash
bash analytics_v1/tests/run-parquet.sh
bash consumer_v1/tests/run_consumer.sh
```

Rollback is deletion of `consumer_v1`; all earlier releases remain frozen.
