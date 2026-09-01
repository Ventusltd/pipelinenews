# Codex Pipeline iteration - GB electricity context - 202608312339

## Candidate

`releases/202608312339-pipelinenews`

This is a local handoff candidate. Codex did not publish it and did not use a
browser. Claude owns the visible portrait, landscape and desktop replay and any
deployment decision.

The preceding local `202608312337` iteration is retained as the timestamped
proofing step. It rendered a negative price as `GBP -` in the wrong visual
order and relied on the upstream boundary without repeating the words "not a
forecast" inside the opened panel. `202608312339` corrects both. Use 2339.

## What it adds

- One `GB ELECTRICITY CONTEXT` launch surface.
- A same-origin 4,129-byte snapshot of
  `Ventusltd/data-gb-electricity/derived/price-decade-rollup.json`.
- Fetch only after the user opens the surface; no request at application boot.
- Four factual summaries and an 11-year table over complete daily means.
- Explicit boundaries: historic context, not a forecast, no project join, no
  REPD signal, no recommendation.
- The count is described precisely as complete days **containing at least one
  negative settlement period**. It is not described as days whose mean price
  was below zero.
- Solar remains visibly absent because the owner product says PVLive has not
  been decided into that repository. No substitute series is invented.

Pipeline News does not read the settlement-period Parquet and does not repeat
the derivation. `sync_payload.py` validates and copies the product; the release
registry pins the copied bytes and SHA-256.

## Proof results

```text
release_builder.py --check 202608312339-pipelinenews       PASS
surface_truth_proof.mjs 202608312339-pipelinenews          8/8 PASS
gb-electricity-context/proof.mjs                           PASS
  calendar years                                           11
  complete days                                            3,339
  payload requests after explicit mount                    1
  project bindings                                         0
  tampered payload                                         REJECTED
node --check app and cartridge                             PASS
```

The upstream collector-level sector audit still reports 39 irrelevant rows in
the inherited payload. The existing UI withholds those rows and exposes only
the evidenced topic, so this iteration does not regress the visible surface.
It also does not repair the collector: that remains a separate, explicitly
open build-plan item so the next refresh cannot reintroduce the bad rows.

## Builder repair

The release builder previously inserted every new binding after
`bindFederatedRelationships()`. Iteration 3 deliberately withdrew that rejected
panel and its binding, which made the builder unable to extend the clean
release. The extension anchor is now the retained core
`bindSectorIntelligence()` binding. Optional withdrawn UI is no longer an
architectural dependency.
