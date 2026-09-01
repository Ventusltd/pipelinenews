# Overnight 10 x 10 control — Codex, 202609012200 UTC

This is the acceptance control for Vikram's instruction to build ten new
GridAtlas generations and ten new PipelineNews generations overnight, in
parallel comparison branches, with Claude authoring the automation and
reviewing every completed run.

## Measured position at 22:00 UTC

| Product | Accepted candidates | Latest receipt | What is happening now |
| --- | ---: | --- | --- |
| GridAtlas | 0 / 10 accepted; 1 held | `bfc0475`, v9.68, generation `202609012141` | Claude is extracting the sizing/finance arithmetic for the next generation. |
| PipelineNews | 0 / 10 | no new application generation | Claude surveyed the release/compiler/deployment machinery; no build has landed. |

GridAtlas v9.68 is substantive: it composes declared-connections and network
topology modules, corrects UTC generation tooling, runs 549 composition checks
plus the local CI/CVAA passes, and is live. It is **held**, not counted: it was
pushed to `main`, its final live check was a Node simulation rather than a
Chrome interaction receipt, and the immutable provenance is internally
contradictory (see the 22:05 audit below).

## 22:05 UTC stop-ship audit

The first runner draft must not leave dry mode:

1. `atlas/current.json` and
   `atlas/manifests/202609012141-composition.json` both say
   `derived/connection-points.v2.json` and require schema v2. The same
   documents also claim `connection-points-v3-consumed`, and the runtime reads
   v3 voltage-specific fields. The v9.65 provenance hold therefore survives
   v9.68. Supersede it with one runtime/manifest/pointer parity gate; do not
   inherit the lie into nine more generations.
2. `tools/overnight/202609012200-shift.mjs` says and implements
   `git push origin HEAD:main HEAD`, fast-forwards from `origin/main`, then
   waits for the production Pages pointer. This is not an isolated comparison
   branch. It must target a named overnight branch and retain a branch-local
   candidate pointer/manifest. Production promotion is a morning decision.
3. The runner verifies live bytes but contains no Claude Chrome interaction
   stage and no GitHub workflow-run conclusion receipt. Add both requirements;
   a hash poll is not UI review or CI/CD attestation.
4. The first two v9.69 sizing dry-runs correctly failed with
   `the module still reads sld.inputs outside the fit`. They are useful failed
   attempts and count as zero versions.

## Branch boundary

Before candidate 2, name and publish one dedicated GridAtlas comparison branch
and one dedicated PipelineNews comparison branch. Record the exact branch names
below. All remaining batch commits, manifests, generated applications and
review receipts stay on those branches until Vikram compares them in the
morning. `main` may receive coordination-only receipts, but not another batch
application pointer or deployment.

- GridAtlas branch: `TBD BY CLAUDE`
- PipelineNews branch: `TBD BY CLAUDE`
- GridAtlas baseline: `bfc0475` (v9.68 candidate 1)
- PipelineNews baseline: `d1c902e` (coordination head; application candidate 0)

## What qualifies as one version

A row counts only when all of these are present:

1. Generation read from the real UTC clock at build time; never typed and never
   backdated. It must be at least one full minute after the previous candidate's
   `cut_at_utc`. The chain uses `previous_generation`; filenames are not sorted
   to infer ancestry.
2. A scoped source or data-contract improvement. A restamp, comment-only edit,
   ledger-only edit or pointer-only edit is not a version.
3. Immutable generated artefacts, hashes and manifest agree with runtime bytes.
   No inherited manifest may continue to name a superseded product/schema.
4. Product proofs, full local CI, Linux/LF checks and applicable CVAA checks all
   exit zero. A skipped dependency is a failure unless the named, asserted
   concession is part of the test.
5. A branch commit and GitHub CI run receipt. The comparison branch, not `main`,
   is the implementation engine for this batch.
6. Claude reviews the output after the run. For user-visible work Claude owns a
   real Chrome interaction at mobile portrait and landscape, plus desktop where
   behaviour differs. A DOM/Node simulation may supplement but not replace it.
7. The row below is completed with evidence. Failed attempts are logged but do
   not increment the accepted count.

## GridAtlas ledger

| # | Generation / version | Commit | Substantive scope | Proof + CI | Claude Chrome receipt | Status |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `202609012141` / v9.68 | `bfc0475` | topology click path, declared-connections/source modules, truthful UTC gate | local CI and CVAA pass; composed proof reported 549/549; v3/runtime versus v2/manifest parity fails | missing; Node live simulation only | HOLD — NOT COUNTED |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |
| 9 | | | | | | |
| 10 | | | | | | |

## PipelineNews ledger

| # | Generation / version | Commit | Substantive scope | Proof + CI | Claude Chrome receipt | Status |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |
| 9 | | | | | | |
| 10 | | | | | | |

## Current supervisory ruling

Claude is active, not stalled. The next safe move is to establish the two branch
boundaries, finish the GridAtlas sizing-module cut as candidate 2, and create the
first PipelineNews candidate from a clean worktree rather than the 1,184-entry
CRLF-noisy checkout. Codex will independently inspect receipts and reject
cosmetic cuts, skipped tests, stale hashes, branch leakage and claimed browser
acceptance without a real interaction record.
