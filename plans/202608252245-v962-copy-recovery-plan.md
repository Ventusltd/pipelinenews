# Pipeline News V9.6.2 copy-recovery plan

Status: **AUTHORISED COPY-RECOVERY CONTROL PLAN**  
Planning inception retained for traceability: `2026-08-25T22:45:55+01:00`  
Release identifier: selected from the actual inception minute of the atomic copy checkpoint; no earlier provisional identifier is reserved.

## Fixed decisions

- The last accepted interface is the deployed GlobalGrid2050 `v9.6.2` application.
- Recovery starts from a byte-for-byte copy of that working application and its complete asset closure. It does not reconstruct or reinterpret the interface.
- `202608251701-pipelinenews`, `202608251750-pipelinenews`, and `202608251929-pipelinenews` remain untouched as immutable analysis evidence. The GlobalGrid2050 homepage remains unchanged during planning and validation.
- The `19:29` release is classified as an interface regression and is not a product baseline.
- No discovery, attribution, matching, search-engine, crawler, or automation improvement is part of this recovery release. Those items are isolated in `plans/engine-improvements-roadmap.md`.
- No individual-person names may be added to release-controlled output, reports, manifests, screenshots, or catalogue text.
- Planning and source-closure evidence may be committed before the application. No timestamp application write occurs until the prepublication gates pass. PipelineNews publication precedes any GlobalGrid2050 catalogue edit.

## Ten small steps

1. **Freeze inputs — 30–60 seconds.** Re-fetch both remote `main` heads, confirm the provisional identifier is absent, and record the exact V9.6.2 source tree and linked-asset hashes.
2. **Preserve evidence — 30–60 seconds.** Pin tree/blob hashes for NewsV1, NewsV7, V9.6.2, and all three rejected timestamp releases; make no changes to those paths.
3. **Copy the accepted product — 60–100 seconds.** Copy the complete V9.6.2 application and every required same-origin asset into the new timestamp directory. Do not introduce new layout, typography, colours, cards, navigation, or responsive rules.
4. **Make only release-path substitutions — 30–60 seconds.** Change only the minimum references required for the immutable timestamp path and content-addressed assets. Produce a machine-readable diff of every byte that differs from V9.6.2.
5. **Attach current governed data — 60–100 seconds.** Use a minimal compatibility adapter behind the copied interface. Preserve 7,680 projects, official/news separation, stable IDs, `UNKNOWN`, `ABSTAIN`, and fail-closed core rendering. Do not change the visible interaction model.
6. **Run deterministic checks — 60–100 seconds.** Verify hashes, counts, capacity, technology totals, headline ledger, sentinels, 11 columns, filters, search, sort, pagination, CSV, Atlas links, privacy, and no optional-data boot dependency.
7. **Run visual and interaction checks — 100–300 seconds.** Test desktop and 390-pixel mobile against side-by-side V9.6.2 screenshots. Require the same black/cyan Courier shell, sidebar, masthead, three gauges, bounded newspaper, and contained horizontally scrolling full table. Any unexplained visual difference rejects the candidate.
8. **Publish PipelineNews — 60–500 seconds.** Re-fetch `main`, commit once without force, then require exact-head validation, Pages deployment, public URL fetch, screenshot inspection, and committed-versus-live byte equality.
9. **Correct the GlobalGrid2050 catalogue — 60–500 seconds.** Only after step 8 passes, re-fetch GlobalGrid2050 `main`, add the proven successor once, remove rejected candidates from current presentation, and leave unrelated catalogue sections unchanged.
10. **Close and review — 100–300 seconds.** Verify the live homepage and successor URL independently, record byte accounting and immutable-tree proofs, then issue the `RUN METER / WHERE / WHAT / PROOF / WHY / DOUBT / NEXT` report.

## Timing control

Each action targets 30–100 seconds. A coherent block stops for review by 500 seconds even if incomplete. A blocked path is terminated at 500 seconds, recorded precisely, and replaced by a smaller check. No elapsed time is described as progress; only produced evidence counts.

## Six-run controller

A bounded controller is scheduled at 01:00, 02:00, 03:00, 04:00, 05:00, and 06:00 Europe/London on 26 August 2026. Each execution completes only the earliest unfinished checkpoint and stops at 500 seconds. The controller must not create repository schedules or modify workflow triggers. It expires after the sixth execution.

## Draft acceptance decision

Proceed to implementation only if the V9.6.2 source closure can be copied and pinned without touching the accepted source or rejected historical paths. If exact copy parity cannot be proven, stop before publication and report the specific missing asset or unverifiable difference.
