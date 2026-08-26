# PipelineNews NewsV4 — source-health market context

NewsV4 is a data-only candidate that turns the audited Atlas V8 / Energy V6 adapter evidence into deterministic source-health decisions. It contains no market values and changes no public UI.

The declared grain is one row per audited source product or explicit source gap. `source_health_decision_id` is the unique, non-null primary key. Status precedence is `UNAVAILABLE`, then `DEGRADED`, then `STALE`, then `CURRENT`; this prevents a recent timestamp from hiding a broken semantic, key, adapter or licence contract.

All decisions are context-only. They cannot establish project identity or binding, verify an event, assert a grid constraint, or contribute to deal scoring. NewsV1–NewsV3 remain frozen and independently reproducible.

Run the complete gate with:

```bash
bash newsv4/tests/run_newsv4.sh
```

The input is pinned and the build uses the fixed evaluation instant `2026-08-25T00:00:00Z`, so a rebuild is byte-deterministic. `data/build_manifest.json` records module, input, contract and artifact hashes plus key checks.
