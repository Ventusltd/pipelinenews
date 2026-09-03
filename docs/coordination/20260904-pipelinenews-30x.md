# Pipeline News 30-iteration Pages routing stream

Base: `937b8c019074e40bebbc7edf5d8ef8d1751e034e`<br>
Iteration head: `a855ffe41d99c765c9eab0607603e274b31737b5`<br>
Branch: `codex/202609040002-pages-classifier`

The stream changes the Pages workflow from one publisher that fails on every
additive release into two explicit routes. Additive cartridges run their own
release-closure validation and never receive Pages credentials. Supported
timestamp-folder releases retain the full reusable Pages build, browser proof,
deployment and public verification job.

The classifier binds every decision to a release id, generation, schema,
deployment boundary, immutable lineage and exact manifest hash. Push discovery
uses full commit ids and rejects edits, moves or deletions below an immutable
release folder. A pointer-only push or manual dispatch with no release input
can fall back only when exactly one supported current pointer is byte-identical
to `state/live-set.json` and its release-manifest path, byte count and digest
all match a Pages-compatible target.

The complete per-attempt receipts are in
[`20260904-pipelinenews-30x-ledger.json`](./20260904-pipelinenews-30x-ledger.json).
The first seed commit's Windows test invocation failed and is explicitly not
counted. Iterations 2 through 33 provide 32 material, passing improvements.
The final cumulative gate passed 26 classifier tests, 15 main-workflow
contracts, the receipt-only candidate-workflow contract, the latest additive
release's own `--check`, the live pointer route, and a replay of the historical
`202609032251` additive push range.

## Evidence read before and during the stream

This was not a greenfield classifier exercise. The decisions were reconciled
against the estate contract in `claude/CLAUDE.md`; the measured failure lessons
in `claude/sessions/202609032300-four-lanes-one-night/00-NOTE.md`; all four files
in `claude/sessions/202609032304-codex-cto-control/`; and Pipeline News's open
Pages decision in `docs/coordination/BOARD.md`. The evidence review also used
the Codex 24-hour audit, the Phase 0 grid-finding brief, and the v10 product and
red-team proposal under `codex-chatgpt/codex/`.

Git evidence covered `b1e09fb9f2afaeeb989fa8f5e96528f8d68c1aaf`
through `937b8c019074e40bebbc7edf5d8ef8d1751e034e`; the unsuperseded proofs on
`codex/202609012206-pipelinenews-10x10` at `3724c9d` and `721c4ae`; and the
documentation-only `codex/202609020100-pipeline-pages-fix`, which contributed
no candidate iteration.

The repeated additive-release CI failure drove the explicit classifier,
source-only validator, job-level publisher routing and credential scoping in
iterations 1, 7 and 21-26. The estate's identity, provenance and plausible-data
failure classes drove iterations 3-20. Independent review of the old workflow
fallback drove the live-pointer preservation in 27-29. Final hostile review
found the failed seed, missing exact-main binding, and a manifest read/hash
race; the seed was excluded and iterations 31-32 closed the two defects.
Governance requiring branch-only compute without deployment authority drove
iteration 33.

## Serial cutter and rerun contract

Run one writer on this candidate branch. Before each iteration, bind the
expected parent with `git rev-parse HEAD`; stage only named files; commit code
and its proof together; then require the new commit's sole parent, clean status,
and test receipt. A cutter rerun must search the exact iteration subject and
changed-tree digest: skip only an exact match and fail on any divergent match.
It must never manufacture another timestamp release, amend an immutable release
folder, deploy, or clean the primary worktree. The candidate Action follows the
same rule with one concurrency key, `cancel-in-progress: true`, no schedule or
push trigger, read-only permissions, serial tests, and a receipt named by the
candidate commit.

No immutable release directory, live pointer, deployment, primary worktree, or
main branch was changed by this candidate stream.
