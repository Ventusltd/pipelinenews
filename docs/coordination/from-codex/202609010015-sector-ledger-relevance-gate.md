# Codex handoff — pre-Parquet sector relevance gate

Branch `codex/202609010009-sector-collector`.

The historical `202608272130` sector generation is intentionally frozen. Its
workflow proves an exact nine-file source commit against a fixed parent SHA, so
editing that runner or contract in place would make CI fail before collection.
This change therefore supplies a timestamped gate for the successor generation
without falsifying the old generation.

## What is ready

- `discovery/javascript/202609010015-sector-topic-evidence.mjs` is the one
  authority for five neutral topics. Dynamic rows require affirmative evidence
  in their own title/summary; an official source or search query is never
  sufficient.
- `discovery/javascript/202609010015-sector-ledger-relevance-gate.mjs` consumes
  a collector ledger and emits the same ledger schema after rejecting,
  reassigning and recounting rows **before** Parquet or browser projection.
- `tools/intelligence/audits/202609010015-sector-ledger-relevance-proof.mjs`
  proves the synthetic collector and the inspected 51-row real payload.
- `tools/intelligence/audits/sector_topic_relevance_audit.mjs` now imports the
  same authority, so the scanner and acceptance audit cannot drift apart.

The active topic set is data centres; inverter/security policy; Great Grid
Upgrade; worldwide PV; and MV/HV components. The two named geopolitical source
topics are always rejected. Zero results is valid; there is no quota padding.

## Measured result

The old 51-row payload becomes 12 evidence-backed rows: 39 rejected and one EC
solar row reassigned. The synthetic old collector produces 19 candidates; the
gate retains 17 and removes the two geopolitical fixtures. Seven deliberately
irrelevant titles stay rejected.

## Successor workflow insertion

In the successor workflow, preserve the raw receipt and insert this immediately
after collection and before the Python Parquet builder:

```text
mv "$SECTOR_WORK_ROOT/live-ledger.json" "$SECTOR_WORK_ROOT/raw-live-ledger.json"
node discovery/javascript/202609010015-sector-ledger-relevance-gate.mjs \
  --input "$SECTOR_WORK_ROOT/raw-live-ledger.json" \
  --output "$SECTOR_WORK_ROOT/live-ledger.json"
```

Run the same gate on both synthetic ledgers before byte-determinism comparison.
The Python builder should receive only the gated path.

## Required successor contract change

The gate prevents bad rows reaching data products, but the successor contract
must also remove `GOVUK_HORMUZ_ENERGY` and `GOVUK_UKRAINE_ENERGY`, remove their
topic definitions, renumber five display ranks, and reduce the network request
closure from 11 to 9. Otherwise the unwanted endpoints would still be queried
even though their rows are discarded. Do that in a new timestamped source
boundary; do not mutate the frozen 202608272130 contract.

## Proof commands

```text
node tools/intelligence/audits/202609010015-sector-ledger-relevance-proof.mjs
node tools/intelligence/audits/sector_topic_relevance_audit.mjs \
  releases/202608312114-pipelinenews
```

Both pass locally. No browser, network, release or deployment was used.
