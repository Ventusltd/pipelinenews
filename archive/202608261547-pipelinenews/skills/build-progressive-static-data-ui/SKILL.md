---
name: build-progressive-static-data-ui
description: Build, review, optimise, validate or release large static-data browser interfaces in PipelineNews. Use for project tables, news feeds, loading sequences, caching, pagination or virtualisation, search and filter performance, mobile rendering, DOM budgets, request deduplication, timeouts and progressive release checks.
---

# Build progressive static-data interfaces

## Read before changing the browser

Read, in order:

1. The root `README.md`, especially the active build plan and timing law.
2. `skills/build-auditable-duckdb-parquet/SKILL.md` when data products, manifests or browser projections are involved.
3. [references/atlas-v8-evidence.md](references/atlas-v8-evidence.md) before adopting an Atlas pattern.
4. The release contract and the last passing performance report.

Verify repository HEAD and the frozen source subtree before editing. Never repair a frozen release in place.

## Preserve product law

Record before implementation:

- frozen source commit and subtree;
- expected project, capacity and news counts;
- explicit display order;
- desktop and mobile interface invariants;
- maximum initial rows and DOM elements;
- request and cache policy;
- progressive states and failure behaviour;
- exact tests that prove parity.

Treat a faster page with changed data, ordering, controls or mobile behaviour as a failed release.

## Apply the progressive loading sequence

1. Render the stable shell and controls first.
2. Load small contracts and manifests with a timeout.
3. Fetch the first data partition and render the first bounded page.
4. Hydrate remaining partitions with bounded concurrency.
5. Keep one canonical in-memory store for filters, sorting and export.
6. Update totals progressively without rebuilding unrelated components.
7. Fetch optional news or detail data independently.
8. Expose `WAIT`, `LOAD`, `OK`, `EMPTY` and `FAIL` states.
9. Fail closed without replacing last-known-good content with empty or partial output.

Do not make initial usability depend on one `Promise.all` containing every large partition.

## Bound browser work

- Keep the live table to a fixed page or viewport window; never create one rich DOM subtree per record at repository scale.
- Retain all canonical records in memory so filters, sorting and CSV export remain complete.
- Render no more than 100 project rows initially unless a release contract declares another tested budget.
- Reuse one details surface or create details only for visible rows.
- Delegate row actions through one container listener.
- Debounce text search and batch visual updates with `requestAnimationFrame` where useful.
- Patch changed counters, signals or rows; never rebuild the full table because an independent news request completed.
- Cap search suggestions and other transient results.

Keep semantic HTML for the table. Do not replace it with a canvas or map engine.

## Deduplicate and cache requests

- Keep one in-flight promise per canonical URL.
- Request the same-origin release artifact first.
- Attempt a fallback only after the primary request fails; never download two identical feeds speculatively.
- Use immutable versioned paths and normal browser caching.
- Do not use timestamp cache busting, `no-store` or `no-cache` for immutable release artifacts.
- Limit concurrent large fetch/parse work and abort stalled requests.
- Pin third-party libraries or host them locally; defer non-critical scripts.

## Protect mobile behaviour

Require:

- `100dvh` or an equivalent safe dynamic viewport where full-height panels are used;
- `min-width: 0` and `min-height: 0` inside flex/grid shells;
- bounded internal scrolling rather than full-page horizontal overflow;
- the complete eleven-column project table inside its existing horizontal scroller;
- no card conversion, column deletion or text truncation disguised as optimisation;
- tests at 390, 430, 440 and 768 CSS pixels.

## Validate the release

Require exact data and order checks plus these performance gates:

```text
initial_project_rows <= 100
initial_total_dom_elements < 10000
duplicate_news_requests = 0
full_table_rebuild_after_news = 0
project_asset_cache_mode != no-store
page_horizontal_overflow = 0
```

Also verify:

- every project remains searchable, filterable, sortable and exportable;
- filtered totals and capacity are calculated from the full canonical store;
- pagination resets safely after filter and sort changes;
- deep links locate the correct record even when it is outside the current page;
- frozen source and legacy trees are unchanged;
- the deployed response matches the committed release with a cache-busted verification request.

## Stop rather than publish when

Stop and report `FAIL`, `BLOCKED` or `NOT TESTED` if:

- parity counts, capacity, ordering or identity differ;
- the implementation requires changing the frozen release;
- a mobile width overflows the page;
- a request can hang without timeout;
- optional data can trigger a second full-table render;
- the DOM or initial-row budget is exceeded;
- the build approaches the 500-second active-work limit.

Record the exact next bounded pass in the root README before returning control.
