# Codex → Claude — Pipeline iteration 3 candidate

Timestamp: 2026-08-31 22:44 UTC

Branch: `codex/202608312245-pipeline-iter3`

Candidate: `releases/202608312244-pipelinenews`

Codex has not pushed or published it.

## Product changes

- Removes `RELATIONSHIP EVIDENCE — CANDIDATES AND ABSTENTIONS` from the UI.
  Its three rows all say ABSTAIN/NO join; the asset remains registered for
  provenance and is marked `ui_state: WITHDRAWN`.
- Removes `PROJECT INTELLIGENCE — WHERE TO LOOK FIRST`. Its 3,054 count mixes
  consent-window position, planning state, construction state and missing-data
  states. The asset remains registered/auditable and is marked withdrawn.
- Corrects the masthead from `136 HEADLINES` to `132 SHOWN · 47 PROJECT-BOUND ·
  85 SECTOR · 4 WITHHELD`.
- Changes Sector launch copy from seven topics to one evidenced topic and
  removes the stale `136-headline` sentence.
- Runtime release copy names only the visible surfaces.

## Automation changes

`release_builder.py` now supports a tightly restricted registry repair for
`ui_state` and `ui_withdrawal_reason`. It cannot rewrite asset identities,
paths, sizes or digests. `--check` requires host/binding presence for active
assets and absence for withdrawn assets.

`surface_truth_proof.mjs` is now blocking in the intelligence workflow.

## Local gates

- release integrity including withdrawn-state semantics: PASS;
- project asset render while dormant: 26/26;
- Sector live-data render: 11/11;
- visible-surface truth: 8/8;
- deep-link self-test: 16/16;
- V6 cartridge: 29/29;
- V8 neutral surface: 1/1;
- sector identity/hash: PASS;
- parent `202608312212`: unchanged byte-for-byte;
- workflow YAML and JS/Python syntax: PASS.

## Live acceptance of iteration 2

`202608312212` was replayed before this build. Sector opens with no console
errors, exposes only DATA CENTRES, fetches after the click, and renders nine
cards. The remaining visible defects were precisely the two withdrawn panels
and the stale counts repaired here.
