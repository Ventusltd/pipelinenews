# PipelineNews mobile UI comparator

Generation: `202608271656`  
Candidate generation: `202608271524`  
Source commit: `6be8d21567e97a772d36d472a74e88a00d99a7c1`  
Mode: `audit`  
Deployment: `not-authorised`

Project posture: **Ventus Ltd — non-commercial open source**. Publisher redistribution rights remain source-specific and are not inferred by this audit.

The evidence producer completed: **PASS**. The measured candidate gate is **FAIL**. Measured UI failures do not change the comparator process status.

Baseline characterisation: **RECORDED**. Original context: **PARTIAL** and never gated.

Expected L1-L4 I2/I3/I4 audit hypothesis: **CONTRADICTED**. Contradictions are retained as evidence and never invalidate the run.

## Pinned browser

Playwright `1.55.0`; Chromium `140.0.7339.16`; executable SHA-256 `2fa605e3639b8cfbe8037d0b8e0324dbf7f9e6ad7beb345374ecd26764e2d92b`.

## Candidate gate failures

| Invariant | Cell |
| --- | --- |
| I1 | L1 |
| I1 | L2 |
| I1 | L4 |
| I6 | P1 |
| I6 | P2 |
| I6 | L1 |
| I6 | L2 |
| I6 | L3 |
| I6 | L4 |
| I6 | T1 |
| I8 | P1 |
| I8 | P2 |
| I8 | L1 |
| I8 | L2 |
| I8 | L3 |
| I8 | L4 |
| I8 | T1 |
| I10 | L1 |
| I10 | L4 |
| I11 | P1 |
| I11 | P2 |
| I11 | L1 |
| I11 | L2 |
| I11 | L3 |
| I11 | L4 |
| I11 | T1 |

I7, I12 is report-only in audit mode and excluded from the candidate gate.

## Invariant matrix

### V8 fast candidate 202608271524

| Invariant | P1 | P2 | L1 | L2 | L3 | L4 | T1 | R1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I1 NO-HORIZONTAL-TRAP | PASS | PASS | FAIL | FAIL | PASS | FAIL | PASS | N/A |
| I2 BODY-SCROLLABLE | PASS | PASS | PASS | PASS | PASS | PASS | PASS | N/A |
| I3 PANEL-FITS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | N/A |
| I4 STICKY-BUDGET | PASS | PASS | PASS | PASS | PASS | PASS | PASS | N/A |
| I5 CONTROLS-REACHABLE | PASS | PASS | PASS | PASS | PASS | PASS | PASS | N/A |
| I6 TAP-TARGETS | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | N/A |
| I7 SAFE-AREA | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | N/A |
| I8 MENU-BOUNDED | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | N/A |
| I9 NODE-STABILITY | N/A | N/A | N/A | N/A | N/A | N/A | N/A | PASS |
| I10 TABLE-USABLE | N/A | N/A | FAIL | PASS | PASS | FAIL | N/A | N/A |
| I11 TEXT-LEGIBLE | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | N/A |
| I12 BASELINE-HONESTY | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

### Trusted compiled V9.6.2

| Invariant | P1 | P2 | L1 | L2 | L3 | L4 | T1 | R1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I1 NO-HORIZONTAL-TRAP | PASS | PASS | FAIL | FAIL | PASS | FAIL | PASS | N/A |
| I2 BODY-SCROLLABLE | PASS | PASS | PASS | PASS | PASS | PASS | PASS | N/A |
| I3 PANEL-FITS | PASS | PASS | FAIL | FAIL | FAIL | FAIL | PASS | N/A |
| I4 STICKY-BUDGET | PASS | PASS | PASS | PASS | PASS | PASS | PASS | N/A |
| I5 CONTROLS-REACHABLE | PASS | PASS | PASS | PASS | PASS | PASS | PASS | N/A |
| I6 TAP-TARGETS | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | N/A |
| I7 SAFE-AREA | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | N/A |
| I8 MENU-BOUNDED | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | N/A |
| I9 NODE-STABILITY | N/A | N/A | N/A | N/A | N/A | N/A | N/A | PASS |
| I10 TABLE-USABLE | N/A | N/A | FAIL | PASS | PASS | FAIL | N/A | N/A |
| I11 TEXT-LEGIBLE | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | N/A |
| I12 BASELINE-HONESTY | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

### Original live dashboard

| Invariant | P1 | P2 | L1 | L2 | L3 | L4 | T1 | R1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I1 NO-HORIZONTAL-TRAP | PASS | FAIL | FAIL | FAIL | N/A | N/A | N/A | N/A |
| I2 BODY-SCROLLABLE | PASS | PASS | PASS | PASS | N/A | N/A | N/A | N/A |
| I3 PANEL-FITS | PASS | PASS | PASS | PASS | N/A | N/A | N/A | N/A |
| I4 STICKY-BUDGET | PASS | PASS | PASS | PASS | N/A | N/A | N/A | N/A |
| I5 CONTROLS-REACHABLE | FAIL | FAIL | FAIL | FAIL | N/A | N/A | N/A | N/A |
| I6 TAP-TARGETS | FAIL | FAIL | FAIL | FAIL | N/A | N/A | N/A | N/A |
| I7 SAFE-AREA | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | REPORT-ONLY (FAIL) | N/A | N/A | N/A | N/A |
| I8 MENU-BOUNDED | FAIL | FAIL | FAIL | FAIL | N/A | N/A | N/A | N/A |
| I9 NODE-STABILITY | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| I10 TABLE-USABLE | N/A | N/A | FAIL | FAIL | N/A | N/A | N/A | N/A |
| I11 TEXT-LEGIBLE | FAIL | FAIL | FAIL | FAIL | N/A | N/A | N/A | N/A |
| I12 BASELINE-HONESTY | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

## Prediction check

| Target | Cell | Invariant | Expected | Actual |
| --- | --- | --- | --- | --- |
| candidate | L1 | I2 | FAIL | PASS |
| candidate | L1 | I3 | FAIL | PASS |
| candidate | L1 | I4 | FAIL | PASS |
| candidate | L2 | I2 | FAIL | PASS |
| candidate | L2 | I3 | FAIL | PASS |
| candidate | L2 | I4 | FAIL | PASS |
| candidate | L3 | I2 | FAIL | PASS |
| candidate | L3 | I3 | FAIL | PASS |
| candidate | L3 | I4 | FAIL | PASS |
| candidate | L4 | I2 | FAIL | PASS |
| candidate | L4 | I3 | FAIL | PASS |
| candidate | L4 | I4 | FAIL | PASS |
| baseline | L1 | I2 | FAIL | PASS |
| baseline | L1 | I3 | FAIL | FAIL |
| baseline | L1 | I4 | FAIL | PASS |
| baseline | L2 | I2 | FAIL | PASS |
| baseline | L2 | I3 | FAIL | FAIL |
| baseline | L2 | I4 | FAIL | PASS |
| baseline | L3 | I2 | FAIL | PASS |
| baseline | L3 | I3 | FAIL | FAIL |
| baseline | L3 | I4 | FAIL | PASS |
| baseline | L4 | I2 | FAIL | PASS |
| baseline | L4 | I3 | FAIL | FAIL |
| baseline | L4 | I4 | FAIL | PASS |

## Evidence closure

73 raw artifacts (4813617 bytes), including screenshots, are SHA-256 indexed in `artifact-manifest.json`. Only this compact report, folded metrics and the hash manifest belong in the quarantine-proof commit.

Full evidence artifact: `pipelinenews-mobile-ui-audit-202608271656-33091704595-1` (retention: 30 days).

No release, stable pointer, catalogue or Pages deployment is changed by this comparator.
