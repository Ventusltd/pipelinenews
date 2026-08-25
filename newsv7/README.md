# Pipeline News V7

NewsV7 is the cumulative public-app candidate requested after the NewsV2–NewsV6 data releases. It starts from the frozen GlobalGrid V9.7 interface and the proven NewsV1 performance runtime, then publishes only evidence that survived the later contracts and abstention gates.

Public path: `https://ventusltd.github.io/pipelinenews/newsv7/`

## Frozen baseline

- GlobalGrid source: `Ventusltd/globalgrid2050@824a23cd0cf9f90a9df942f1b37a09c2dc6472b7`.
- V9.7 source tree: `4fca94ede95789ade9490258a2323c00c13ec2ea`.
- NewsV1 baseline tree: `2d6247c067aa5fad49995dcb9029d6cdb9898994`.
- Project facts and newspaper content/order remain unchanged: 7,680 projects, 356,474.09 MW, 133 total headlines, 45 UK and 19 international.
- Beacon Fen remains Low Carbon Limited's 400 MW solar record at REPD 13599; the colocated BESS record 13600 is forbidden.
- All eleven project columns, the 100-row page window, complete filter/sort/export store and contained mobile horizontal scrolling remain intact.

## Cumulative improvements

1. **Material events:** 45 canonical NewsV2 event assertions now appear beside their headlines, while remaining explicitly `HEADLINE_DERIVED_UNVERIFIED`.
2. **Organisation evidence:** 28 exact source labels and 29 directly sourced REPD project-operator claims are exposed without pretending that unresolved labels are verified legal entities.
3. **Commercial-role protection:** all 45 transaction-role decisions remain `ABSTAIN_NO_DIRECT_ROLE_EVIDENCE`; no buyer, seller, lender, EPC, ICP, OEM, supplier or adviser is invented.
4. **Source health:** six NewsV4 decisions are visible as zero current, one stale, four degraded and one unavailable. Stale market context cannot prove a project event, grid constraint or deal.
5. **Research gates:** NewsV5 contributes 45 held reasons and zero published reasons. The interface shows the hold instead of turning a headline or podcast theme into a sales claim.
6. **Data-centre evidence:** six governed sources and two exact observations are shown in their own identity domain. There are zero renewable-project/data-centre identity links and no untyped capacity is published.
7. **Physical data proof:** AnalyticsV1 contributes nine zstd Parquet tables and 208 rows only after keyed readback showed zero duplicate keys, null keys, schema mismatches, view mismatches or cross-domain links.
8. **Consumer protection:** ConsumerV1 supplies the explicit ordering and interface guard that preserves 133/45/19/4/9/6 news counts, Beacon Fen 13599, eleven columns and contained mobile scrolling.

The cumulative product is generated deterministically by `scripts/build-cumulative-intelligence.mjs`. Its pinned inputs, output hash and hard gates are recorded in `data/newsv7/build_manifest.json`. The release law is `contracts/release.newsv7.json`; migration provenance is `MIGRATION_MANIFEST.json`.

## What NewsV7 does not claim

- It does not change any official REPD identity, capacity, status or date.
- It does not verify a material event solely from a headline.
- It does not publish a commercial role, relationship, budget, probability or deal stage.
- It does not turn stale electricity or Atlas context into project evidence.
- It does not connect a data centre to a renewable project through name, proximity or untyped capacity.

## Validation

```bash
bash newsv7/tests/run_newsv7.sh
```

The gate reruns every predecessor test, rebuilds the cumulative output twice, verifies byte identity, then checks V9.7 counts/order, source hashes, unique keys, Beacon Fen, interface invariants and every fail-closed intelligence decision. Live rendering at 390, 430, 440 and 768 CSS pixels remains a separate runtime gate until directly tested.
