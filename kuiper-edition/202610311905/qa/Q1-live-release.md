# Q1 — QA of the live GridAtlas release (NL-008)

QA agent: Claude Fable 5.1. Nothing committed, pushed, labelled or dispatched. All work in a detached worktree
`/tmp/q1` (removed afterwards). Logs kept at `/tmp/q1-prgate.log`, `/tmp/q1logs/*.log`. Report written 2026-10-31T23:29Z.

## Scope and heads

| item | value |
|---|---|
| repo / head | Ventusltd/gridatlas main `41729af0b49dcfbe8f2a3ebc485eff217a61b84d` (release commit, parent `285148aa096a9dea8bd62d183b9301d7514fc34c`) |
| live generation | `202610312138` (v9.188), previous `202610292044` (v9.187) |
| data | `data/uk_datacentre_pipeline_202610312133.geojson`, pinned at data-grid-gb `01a4491` |
| CI runs read | live-bytes run 41250154007 job 124681813343; verify-live (served-homepage) run 41252100497 job 124687567204 |
| worktree | `git -C /home/user/estate/gridatlas fetch -q origin main && git worktree add --detach /tmp/q1 41729af0…` |

## Checks

All commands run in `/tmp/q1` at `41729af0` unless noted. CONFIRMED = re-ran it here; PLAUSIBLE = read only.

| # | check | command | measured | expected | result |
|--:|---|---|---|---|---|
| 1 | live pointer generations | `python3 -I` over `atlas/current.json` | `generation=202610312138`, `previous_generation=202610292044`, `superseded_generation=202610292044`, `composition_version=v9.188` | 202610312138 / 202610292044 | PASS (CONFIRMED) |
| 2 | scope lint | `node tools/scope/loop.mjs lint` | `scope-ledger=PASS active=none master=done`, exit 0 | PASS | PASS (CONFIRMED) |
| 3 | STATE.md parity | `node tools/scope/loop.mjs state --stdout \| diff - STATE.md` | empty diff, exit 0 | empty | PASS (CONFIRMED) |
| 4 | cartridge hashes | python3 -I script: sha256 of `atlas/<path>` for each entry of `cartridges[]` vs recorded `sha256` | `MATCH 6 of 6` (streaming-parquet-bridge 13589 B, uk-gazetteer-flyto 41120 B, sld-sandbox 435218 B, substation-intelligence 451935 B, uk-lightning-overlay `modules/202610291043-…` 63707 B, uk-offtakers-overlay `modules/202610312138-…` 71191 B) | 6/6 | PASS (CONFIRMED) |
| 5 | offtakers source rebuild | `node tools/offtakers/build.mjs --check` | `ok 202610312138: 71191 B sha256 1be368f5…cf46 rebuilt byte for byte`; `hist 202610292044: historical, built from 2f80729 (main, PR #73 lane DC-B1)`; also hist 202610290400/0949/1044; exit 0 | G rebuilt, 202610292044 historical | PASS (CONFIRMED) |
| 6 | DCFSHA vs data file | `grep DCFSHA tools/offtakers/src/01-data.js`; `sha256sum data/uk_datacentre_pipeline_202610312133.geojson` | `01-data.js:19` DCF=`…uk_datacentre_pipeline_202610312133.geojson`, DCFSHA=`87337db5…1654`; file sha256 `87337db5d3bf7959f7f605d3abd029dd4196ab24a79107ceb95210c5b7751654` (446550 B) | all three equal | PASS (CONFIRMED) |
| 7 | data file composition | python3 -I count of features / features without coordinates | 226 features; 1 without geometry: `Ebbsfleet Datacentre Campus, New Barn Road, Dartford` | 226 / 1 unplaced Ebbsfleet | PASS (CONFIRMED) |
| 8 | release tool with G live | `node tools/release/release-generation.mjs --generation 202610312138 --check --base HEAD` | `OK live is already 202610312138: NO-OP release (verify everything, commit nothing)`; `OK atlas/v/202610312138/current.json == derived pointer re-rooted`; `OK derived pointer is byte-identical to the live atlas/current.json`; `OK 6 cartridges: committed blobs hash to the recorded sha256`; both G proofs pass; `LOADER_IDENTICAL … (v2, sha256 d162f66ae44da79a…)`; `CHECK PASS: 202610312138 is releasable on 41729af (live 202610312138). Nothing written.` exit 0; `git status` clean | the NO-OP path of `release-generation.mjs:141-152,221-224` | PASS (CONFIRMED) |
| 9 | rollback tool (route C) | `tools/release/rollback-generation.mjs` has no `--check`/`--dry-run` (parsed flags at `:59-62`: release-commit, reason, base, branch, trailer, no-commit, report, log); even `--no-commit` runs `git switch -c rollback/G-to-P` + `git revert --no-commit` (`:112-116`), which writes a branch ref into the shared `.git` of the read-only estate clone | not run | a read-only mode | UNVERIFIED (tool has no read-only mode; see D1) |
| 9b | rollback preconditions by hand | `git rev-list --parents -n1 R`; `git diff --name-only R^ R`; `git rev-parse HEAD:atlas/current.json R:atlas/current.json`; `git show R^:… \| sha256sum` | single parent `285148a`; touched exactly `STATE.md`, `atlas/current.json`; HEAD pointer blob `b7b346fd…` == R's; restored bytes would be `atlas/current.json` `dc3c0363…e891c` (generation 202610292044), `STATE.md` `197e0fd2…44fd`; released `a8157114…3c7a` / `91c12607…c31d` | every precondition of `rollback-generation.mjs:76-98` | PASS (CONFIRMED, by hand) |
| 9c | rollback route B dry-run | `node tools/rollback.mjs --to 202610292044 --reason "Q1 QA read-only rehearsal" --dry-run` | 6 `MATCH` cartridges, shell `PRESENT`; `restoring 202610292044 v9.187 (1 generation back)`; `--dry-run: nothing written`; exit 0; tree clean | exit 0 | PASS (CONFIRMED) |
| 10 | pinned preview == live re-rooted | node importing `rerootForPreview`/`deriveCurrent` from `tools/release/lib.mjs:108-118` | `rerootForPreview(live) === atlas/v/202610312138/current.json` → true; `deriveCurrent(manifest) === live` → true (69629 / 69687 / 71108 B) | true / true | PASS (CONFIRMED) |
| 11 | PR gate, release vs parent | `node tools/ci/pr-gate.mjs --base 285148aa096a9dea8bd62d183b9301d7514fc34c` | `15/15 checks passed`, exit 0: lint, state-parity, composition 202610312138, both proofs, run-current, verify-compose, loader-registry (53 loaders), loader-equivalence, lightning-source, offtakers-source, lightning suites (207+8 pass), offtakers suite (30 pass), release-tools (15 scripts, 16 tests) | all PASS | PASS (CONFIRMED) |
| 12 | pointer wording | `grep -c '203 sites'`, `grep -o 227 \| wc -l`, `grep -n 203` on `atlas/current.json` | 0, 0, none; `site_data_sources[1]`: `features: 226`, `drawn: 225`; `uk_offtakers.classes`: `C data centres 225 (226 records, one unplaced)`; `composition_note`: `226 records … 225 drawn, one (Ebbsfleet) without coordinates and never drawn` | 226 / 225 / Ebbsfleet; no "203 sites", no "227" | PASS (CONFIRMED) |
| 13 | live-bytes CI | `gh run view --job 124681813343 --log` (run 41250154007, push, head `41729af0`, success) | `attempt 1: 118/119 paths match`; `attempt 2: 119/119 paths match`; `PASS: 119/119 live paths byte-identical to 41729af0b49dcfbe8f2a3ebc485eff217a61b84d (generation 202610312138) at https://ventusltd.github.io/gridatlas/`; `live-bytes issue: none open; nothing to do` | PASS line | PASS (CONFIRMED read of the log; the site itself is unreachable from the sandbox) |
| 14 | served-homepage CI | `gh run view --job 124687567204 --log` (run 41252100497, workflow_dispatch, head `41729af0`, success) | `pin 30470e127ab6: GridAtlas 202610312138 "V9.188 - 31 October 2026"`; four `OK … HTTP 200`; `PASS: https://www.globalgrid2050.com/ serves the pinned homepage with GridAtlas "V9.188 - 31 October 2026"` | PASS line | PASS (CONFIRMED read of the log) |
| 15 | main unchanged | `git rev-list --count 41729af0…..origin/main` after fetch | `0`; `origin/main` = `41729af0b49dcfbe8f2a3ebc485eff217a61b84d` | 0 | PASS (CONFIRMED) |
| 16 | docs/OFFTAKERS-SOURCE.md | grep | `:36` "from 202610312138 the file at data-grid-gb `01a4491`, 226 sites (225 mappable), Wapseys Wood one site"; `:12` historical rule documented | matches release | PASS (CONFIRMED) |
| 17 | docs/LIGHTNING-SOURCE.md | grep | no offtakers or 202610312138 text; lightning is still M6u 202610291043, `node tools/lightning/build.mjs --check` → `ok 202610291043 layers: 63707 B … rebuilt byte for byte` | untouched by this release | PASS (CONFIRMED) |
| 18 | generations.json / historical marker | `cat tools/offtakers/generations.json` | 202610312138 listed, unmarked ("OT6 / v9.188 … DC baseline 226/225 (NL-007)"); 202610292044 `"historical": "2f80729 (main, PR #73 lane DC-B1)"` | newest unmarked, predecessor historical (`build.mjs:36`) | PASS (CONFIRMED) |
| 19 | STATE.md wording | `cat STATE.md` | `Composition: 202610312138 · 202608300453-atlas-v9 · … → uk-lightning-overlay → uk-offtakers-overlay`; 8 immutable releases, 9 active workflows; generated file | names G | PASS (CONFIRMED) |
| 20 | dc-browser-smoke default | `tools/ci/offtakers/browser-dc-smoke.mjs:16`, `.github/workflows/pr-file-size-guard.yml:177` | `DC_SMOKE_GENERATION \|\| '202610312138'`; workflow env `'202610312138'`; asserts `n == 225` with the 226/Ebbsfleet message (`:55,:67`) | G | PASS (CONFIRMED read; not run, needs Playwright) |
| 21 | stale counts elsewhere | `grep -rn -E '203 sites\|227 (sites\|records)…'` over current docs/tools/manifests (older generations excluded) | no hits; no reference to the old `202610292136` file in tools, docs, STATE.md, G manifest, G preview, workflows | none | PASS (CONFIRMED) |

## Defects

**D1 — MINOR (pre-existing).** `tools/release/rollback-generation.mjs` has no read-only mode. Key: `gridatlas@41729af0 tools/release/rollback-generation.mjs:59-62,112-116`; `release-generation.mjs:60` has `--check`, the rollback twin has none. Reproduction: `node tools/release/rollback-generation.mjs --release-commit 41729af0 --reason x --no-commit` still runs `git switch -q -c rollback/202610312138-to-202610292044` and `git revert --no-commit`, so a rehearsal from a worktree writes a branch ref into the shared repository and leaves an uncommitted revert. Effect: route C cannot be rehearsed against the live release without a disposable clone; this QA reproduced its preconditions by hand (check 9b) and ran route B `--dry-run` (9c) instead. Suggested fix: add `check: { bool: true }` that exits after the `live is G exactly as R wrote it` line, printing the expected restored hashes (`report.expected`) — mirror of `release-generation.mjs:221-224`. Not introduced by this release.

**D2 — NOTE (pre-existing).** Cut-only manifest keys are stale on the live generation: `atlas/manifests/202610312138-composition.json` has `candidate_status: "PROTOTYPE_NOT_PUBLISHED"` and `note: "Modular split of 202610291043 by tools/release/split-lightning-cartridge.mjs. atlas/current.json is untouched."` Identical text in the 202610292044 and 202610291044 manifests, so inherited from the scaffolder. `deriveCurrent` (`lib.mjs:108-112`) drops both before the pointer is written, so the served pointer is unaffected (check 8, 10). Suggested fix: have `split-lightning-cartridge.mjs` write a cut-specific note and leave `candidate_status` to the acceptance step. Not introduced by this release.

**D3 — NOTE (housekeeping, outside the repo).** The shared clone `/home/user/estate/gridatlas` still carries local branch `release/202610312138-gridatlas-v9.188` at `ddbf51d028c1366f3e4679a345bada24d6dce8ab` (created 2026-10-31 22:50:48 per reflog; the pre-rebase release commit, not the merged `41729af0`). Harmless, but `rollback-generation.mjs --release-commit` would refuse that sha (not an ancestor of main); delete the branch once the release is accepted. Not a defect of the release.

## What is good

- The release commit is exactly the two pointer files (`git diff --name-only 285148a 41729af0` = `STATE.md`, `atlas/current.json`), so route C is byte-exact by construction (check 9b).
- The tested preview is the release: `atlas/v/202610312138/current.json` is the live pointer re-rooted, and the pointer is `deriveCurrent` of the manifest, both byte for byte (check 8, 10; `lib.mjs:108-118`).
- Every served cartridge hashes to its recorded digest (6/6) and both G proofs pass on the preview route and in the gate (checks 4, 8, 11).
- Data pin closed end to end: `01-data.js:19` DCFSHA = file sha256 = the pointer's `site_data_sources` sha256 = `87337db5…1654`; 226 features, one unplaced, named Ebbsfleet, and the pointer, docs, registry label and smoke test all say 226/225 (checks 6, 7, 12, 16, 18, 20).
- Lightning cartridge is recomposed, not rebuilt: entry generation `202610312138`, path `modules/202610291043-uk-lightning-overlay.js`, 63707 B, still rebuilt byte for byte from source; the proof's arrival parity with 202610291043 PASSes (`/tmp/q1-prgate.log` "uk-lightning-overlay 202610312138" block).
- Public evidence: `119/119 live paths byte-identical to 41729af0` (job 124681813343) and the homepage serving `V9.188 - 31 October 2026` (job 124687567204).

## Verdict

PASS — the live release 202610312138 at `41729af0` is internally consistent and the public bytes match; only MINOR D1 (no read-only rollback rehearsal) and two NOTEs, none introduced by this release.
