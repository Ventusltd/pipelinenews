# Pipeline News V1

This is the independently addressable PipelineNews successor to the GlobalGrid2050 V9.7 interface and the release lineage requested as GlobalGrid V9.8.

Public path: `https://ventusltd.github.io/pipelinenews/newsv1/`

## Frozen source and scope

- Frozen source: `Ventusltd/globalgrid2050@824a23cd0cf9f90a9df942f1b37a09c2dc6472b7`.
- Frozen subtree: `uk_renewables_pipeline/v9.7` at tree `4fca94ede95789ade9490258a2323c00c13ec2ea`.
- Canonical project and news bytes and their visible ordering are unchanged.
- Performance-only changes: a verified first-partition preview, four-request hydration, a 100-row DOM window, normal immutable caching, local-first news fallback, debounced search and asynchronously loaded pinned charts.
- The complete 7,680-record store remains the source for filters, sort, totals and CSV export.
- The complete eleven-column table remains horizontally scrollable on mobile; it is not converted into cards or truncated.

The binding and release law is declared in [`contracts/release.newsv1.json`](contracts/release.newsv1.json), with migration provenance in [`MIGRATION_MANIFEST.json`](MIGRATION_MANIFEST.json).

## Required skills

Read the repository-root cartridges before changing this release:

1. `skills/build-auditable-duckdb-parquet/SKILL.md`
2. `skills/build-progressive-static-data-ui/SKILL.md`

The root README owns the persistent plan and the timing rule: target roughly 30 seconds per bounded take and stop at 500 seconds rather than loop or guess.

## Validation

```bash
bash newsv1/tests/run_newsv1.sh
```

The static release gate proves exact partition/feed hashes, counts, capacity, news regions, Beacon Fen REPD 13599, provenance, eleven columns, pagination and loader policy. Browser/mobile rendering is a separate gate and must be reported as `NOT TESTED` when no Playwright browser binary is installed.
