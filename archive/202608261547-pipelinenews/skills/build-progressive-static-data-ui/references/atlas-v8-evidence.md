# Atlas V8 performance evidence

Use this evidence to copy proven discipline without copying Atlas-specific map code or bottlenecks.

## Pinned source state

- Repository: `Ventusltd/globalgrid2050`
- Commit: `824a23cd0cf9f90a9df942f1b37a09c2dc6472b7`
- Atlas index blob: `278c3f55d3b61af9d13417c99bfb558374131143`
- Atlas engine blob: `0a647c32c346770851704727bbf86fb7167e2596`
- Atlas CSS blob: `29a2edb490407f489c29433d84e329b1038e0657`

V9.7 comparison blobs:

- Project renderer: `ac2cffee071baee3e297053f3f6334de10ab8004`
- Project loader: `69681ea72d0dd917eeb2e507c3c205d4454207f3`
- News loader: `43600e3a6e0edcd0ebffbe27d3e83e7c01231c93`

## Proven Atlas patterns

- Sixty configured layers, of which 48 use `preload:false` and hydrate when selected.
- `RUNTIME_STATE` prevents duplicate load attempts and exposes progressive states.
- `urlCache` stores in-flight promises so shared URLs fetch and parse once.
- `FetchQueue(4)` bounds network concurrency.
- `AbortController` terminates a fetch after 15 seconds.
- One canonical REPD source feeds several filtered views.
- Map features remain out of the DOM; the search UI renders at most 12 matches.
- Visible-layer caches avoid querying hidden layers.
- Hover work is throttled to 100 milliseconds and scheduled through `requestAnimationFrame`.
- One popup instance is reused.
- The mobile shell uses `100dvh`, `min-height:0`, bounded internal scrolling, narrow-screen columns and short-height rules.

## Atlas weaknesses not to copy

- Twelve configured preloads resolve to eleven unique files containing 11,069,828 raw bytes and 31,067 features.
- `cache: "no-cache"` forces revalidation; immutable PipelineNews releases should use normal long caching.
- Runtime grid snapping performs expensive endpoint-to-substation comparisons and belongs in a build pipeline.
- The first REPD toggle still downloads the complete 4.26 MB master file.
- Deep-link lookup can fetch every technology partition with `Promise.all` and `no-store`.
- REPD statistics repeatedly filter the complete feature list by layer.
- Project search performs an un-debounced full-array filter and sort on every input.
- MapLibre is unnecessary overhead for a semantic project table.

## PipelineNews translation

Keep the complete canonical array for data correctness. Render a bounded HTML row window, progressively hydrate partitions, deduplicate loads, cache immutable files, update only affected components and test the resulting DOM budget. Preserve all data, controls and export semantics.
