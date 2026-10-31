# F4 checklist, NL-007 round 1: every check that must pass, in order

Heads verified: data-grid-gb main `b57c94d4e964df2de0dea2786781c6d07a967ea1`; gridatlas main `cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e`.
Every command below was run on 2026-10-31 on `/tmp` copies of the read-only clones (`cp -a`), never in the clones.
"Expected" is what the command printed at HEAD today; the fix must print the same except where the new value is given.

## 0. Baseline at HEAD (what a pair must see before touching anything)

| # | repo | command (from the repo root) | expected output at HEAD (quoted) |
|---|---|---|---|
| 0.1 | data-grid-gb | `cd datacentres/lanes/dc-a7-merge && python3 -m unittest test_dcmerge` | `Ran 52 tests in 0.311s` / `OK` |
| 0.2 | data-grid-gb | `python3 -m unittest discover -s tests` | `Ran 35 tests in 2.432s` / `OK` (includes `test_lane_selftests_pass`, tests/test_lanes.py:150) |
| 0.3 | data-grid-gb | `python3 ci/verify.py` | `verify datacentres: lanes ok (6 vendored lanes, every file pinned)` and 7 more `ok` lines, exit 0 |
| 0.4 | data-grid-gb | `python3 pipelines/run_lanes.py selftest datacentres --lane dc-a7-merge` | `Ran 52 tests` / `OK` / `[dc-a7-merge] exit 0` |
| 0.5 | data-grid-gb | `python3 pipelines/run_lanes.py build datacentres --lane dc-a7-merge && sha256sum datacentres/lanes/dc-a7-merge/out/uk_datacentre_pipeline.geojson` | `176c1b2e894943618c1dd866b3a96c9f3e00bcded8c6e88a5263b0048ae22d89` (447,511 B); run twice: `cmp` says identical |
| 0.6 | data-grid-gb | `python3 reproduce.py check --json /tmp/r.json` | `summary_sha256 9894ee0fc50ab0d6fe7c25c321aaed11e0c90a4fcc861f303891d8508289846c`; dc-a6 `rebuilt=skipped_missing_input` (needs `run_lanes.py inputs`, network) |
| 0.7 | gridatlas | `node tools/offtakers/build.mjs --check` | `ok   202610292044: 71191 B sha256 e4d3fb288ef0ac3782f50f53dae9ebeb8564ca65e220d7b24f755179be7fb30a rebuilt byte for byte`, exit 0 |
| 0.8 | gridatlas | `node tools/scope/loop.mjs lint` | `scope-ledger=PASS active=none master=done` |
| 0.9 | gridatlas | `node tools/scope/loop.mjs state --stdout \| diff - STATE.md` | no output (identical) |
| 0.10 | gridatlas | `node tools/proofs/202610292044-uk-offtakers-overlay.proof.mjs` | `... (71191 B <= 80000), rebuilt from source; after uk-lightning-overlay; loader v2; 6 scripts composed, every other cartridge unchanged. PASS` |
| 0.11 | gridatlas | `OFFTAKERS_MODULE=atlas/modules/202610292044-uk-offtakers-overlay.js LIGHTNING_MODULE=$PWD/atlas/modules/202610291043-uk-lightning-overlay.js node --test tools/ci/offtakers/overlay-offtakers.test.mjs` | `# tests 30` / `# pass 30` / `# fail 0` (43 s) |
| 0.12 | gridatlas | `node tools/ci/pr-gate.mjs --base HEAD` | 16/16 PASS: lint, state-parity, composition 202610292044, proof ×2, run-current, verify-compose, loader-registry (52 loaders), loader-equivalence, lightning-source, offtakers-source, lightning 202610291043 overlay-engine (207 pass / 10 skipped), overlay-latest (8), offtakers 202610292044 + lightning 202610291043 (30/30), release-tools (15 scripts, 16 tests); 1 m 44 s |

Note on 0.5: `run_lanes.py build` also rewrote `datacentres/lanes/MANIFEST.json` with a different indentation (236-line diff, `git diff -w` shows 4 changed lines). Commit the manifest as the tool writes it, or every rebuild PR carries a whitespace diff.

## 1. data-grid-gb: the baseline fix (227 → 226), in order

1.1 Edit `datacentres/lanes/dc-a7-merge/dcmerge.py`. Two variants were tried on a /tmp copy:

| variant | result |
|---|---|
| A: strip `(...)` inside `norm_operator` (:87) | 226 features / 225 with geometry; Wapseys one record; Slough pairs 133/237, 193/231, 56/196, 56/57 distinct; 52/52 OK; sha `8c16d135…b016`; **but 11 ids gone, 10 new**: nine unrelated sites (Cobalt Park, Culham, QTS Cambois, Lanarkshire, North East AI GZ, Manor Farm, Bedmond Road, Woodlands Park, Court Lane) change id because `geo_key` (:226) hashes `norm_operator` into `site_key` (:500, :536) |
| B: strip `(...)` only inside `operator_match` (:122-128) | 226 / 225; Wapseys one record; the same four Slough pairs distinct; 52/52 OK; sha `87337db5…1654`; **only `dcuk-bf4650ea1c4a8a0b` disappears**, `dcuk-4ad498e7880d6ba4` keeps its id (site_key is the shared PINS key) |

Recommendation: variant B (or an equivalent that leaves `norm_operator`, hence `geo_key`, untouched). Variant A silently renames nine sites, which gridatlas CSVs and any reader keyed on `id` would see as deletions plus additions.

1.2 Add the false-split test beside `test_cross_operator_name_and_location_never_merge` (test_dcmerge.py:155): same operator with and without a parenthetical, shared planning ref, must merge; and keep `test_operator_match` (:122) asserting Digital Realty ≠ Global Technical Realty. Expected: `Ran 53 tests` (or 54) / `OK`.

1.3 Rebuild: `python3 pipelines/run_lanes.py build datacentres --lane dc-a7-merge`. Expected: `validation errors: 0`, `[dc-a7-merge] exit 0`; then count with a one-liner: features 226, with geometry 225, one unplaced (`dcuk-2777e64d19a4ac41` Ebbsfleet). Run the build twice; `cmp` of the two outputs must be silent.

1.4 Re-pin: `run_lanes.py build` itself rewrites `datacentres/lanes/MANIFEST.json` (it pins `dcmerge.py`, `test_dcmerge.py` and the two out files; at HEAD `dcmerge.py` is 22,575 B / `95e4a08b…`). Commit the rewritten manifest with the code; `python3 ci/verify.py` must print the 8 `ok` lines again (`lanes ok (6 vendored lanes, every file pinned)`). If someone edits `dcmerge.py` and does not rebuild, verify.py fails "lanes" and `tests/test_lanes.py` with it.

1.4a Independent re-run of F2's diff (`fix/F2-proposed.diff`, applied with `git apply` on the /tmp copy): `Ran 53 tests` OK; two builds `cmp`-identical; geojson `87337db5d3bf7959f7f605d3abd029dd4196ab24a79107ceb95210c5b7751654`, 446,550 B, 226 features / 225 with geometry; `dcmerge.py` 22,845 B `f63ac9e2…7c60`; `test_dcmerge.py` 29,292 B `08c21f2f…77a1`; `ci/verify.py` lanes ok after the build's re-pin. Every number F2 posted is reproduced.

1.5 `python3 -m unittest discover -s tests` → 35 OK; `python3 reproduce.py check` → a new `summary_sha256` (record it in the PR).

1.6 The repository workflow `test-assets.yml` (two legs, requirements and bare: pyflakes, unittest, verify, selftest, inputs, reproduce) runs on the PR because `datacentres/**` is in its path filter. Both legs green is the merge condition. No new workflow.

1.7 Out of scope for this PR unless the owner says otherwise: the lane-id collapse to "out" (dc-a2, dc-a4), METHODS.md:118 "190 sites", counts.json 212, licence_status "unverified" ×258. None of them is asserted by any test or gate found.

## 2. gridatlas: the new generation, in order

2.1 Vendor: `cp <data-grid-gb>/datacentres/lanes/dc-a7-merge/out/uk_datacentre_pipeline.geojson data/uk_datacentre_pipeline_<stamp>.geojson`; `sha256sum` it; it must equal the data-grid-gb MANIFEST pin for that file. Size ~447 kB, under the 5 MB size-guard; no allowlist entry.

2.2 Edit `tools/offtakers/src/01-data.js:19`: `DCF='https://ventusltd.github.io/gridatlas/data/uk_datacentre_pipeline_<stamp>.geojson',DCFSHA='<new sha>'`. Nothing else in the source changes.

2.3 Build: `node tools/offtakers/build.mjs --gen <G> --out atlas/modules/<G>-uk-offtakers-overlay.js`. Expected: `bytes` 71,191 ± the URL/stamp delta (the stamp has the same length, so 71,191 exactly), ≤ 80,000 (tools/scope/lib.mjs:118; offtakers-cartridge.mjs:21). Add `<G>` to `tools/offtakers/generations.json`; mark 202610292044 `historical` with its commit, or leave it listed only if the source still rebuilds it (it will not, the pin changed). Then `node tools/offtakers/build.mjs --check` → `ok <G>: 71191 B ... rebuilt byte for byte`.

2.4 Generation files (the 202610292044 cut, commit 2f80729, is the template: 7 files): `atlas/manifests/<G>-composition.json`, `atlas/v/<G>/current.json`, `atlas/v/<G>/index.html` (byte copy of the v2 loader), `tools/proofs/<G>-uk-lightning-overlay.proof.mjs`, `tools/proofs/<G>-uk-offtakers-overlay.proof.mjs` (two-liners calling the shared provers), the module, `generations.json`. The lightning cartridge stays 202610291043 and sld-sandbox stays 202609241334: no change there. In the manifest and the route current.json, the lines that must change (numbers from `atlas/v/202610292044/current.json`): `:770` sha256 → new, `:769` url → new stamp, `:771` `"features": 227` → 226, `:772` `"drawn": 225` stays, `:773` built_by "227 sites" → 226, `:796` classes "C data centres 225 (227 records, two unplaced)" → "(226 records, one unplaced)", `:886` composition_note "203 sites" → "226 records, 225 mappable, one unplaced (Ebbsfleet)". No gate asserts `features`, `drawn` or the note (checked: offtakers-cartridge.mjs, run-current.mjs, verify-compose.mjs, release lib.mjs), so a stale number here is caught by no machine: the reviewer of the pair must diff these lines.

2.5 Tests that break at 226 and must change in the same PR:
- `tools/ci/offtakers/overlay-offtakers.test.mjs:389`: `assert.equal(DCD.features.length - DCD_MAPPABLE.length, 2, 'two unplaced planning records (SDC M40 and Ebbsfleet) ...')` → `1`, message "one unplaced planning record (Ebbsfleet)". Without this edit DC1 FAILS on the new module and the gate is red.
- `tools/ci/offtakers/browser-dc-smoke.mjs:67`: the asserted 225 stays; the message "227 source records, of which two planning sites have unknown coordinates" is false and must read "226 records, one unplaced"; `:55` (`>= 225`) stays; `:50` lightning `'202610291043'` stays; `:16` default generation may move to `<G>` or stay (env overrides it).
- `docs/OFFTAKERS-SOURCE.md:36`: "corrected 227 sites" → 226.

2.6 Local gate before the PR: `node tools/ci/pr-gate.mjs --base origin/main`. Expected PASS rows: lint, state-parity, composition <G> (cartridge hashes vs served LF bytes), proof <G>-uk-lightning-overlay, proof <G>-uk-offtakers-overlay, composition 202610292044 (live, unchanged), its two proofs, run-current, verify-compose, loader-registry, loader-equivalence, lightning-source, offtakers-source (`ok <G>`, `hist 202610292044`), lightning suites on 202610291043 (207/10 skipped and 8), **offtakers <G> + lightning 202610291043 overlay-offtakers.test.mjs pass 30** (DC1 with the `1`), release-tools. The gate runs the offtakers suite on the new pair because `atlas/v/<G>/current.json` is added (pr-gate.mjs:362-393) and the suite file changed (`wide`, :389).

2.7 Preview PR. `tools/release/publish-preview.mjs` cannot publish an offtakers-only generation: `tools/release/flow-lib.mjs:34-43` `generationFiles(G)` hard-codes the six lightning files (`atlas/modules/<G>-uk-lightning-overlay.js`, `atlas/cartridges/<G>-sld-sandbox-v9-8.js`, `tools/proofs/<G>-sld-sandbox.proof.mjs`, ...), none of which this G has, so its "additive change set" pre-condition stops (F3 saw the same). The path is the hand procedure of docs/RELEASE.md:201 "Publishing (a person does this)": `node tools/ci/pr-gate.mjs --base <main sha>` quoted in the PR body, push `preview/<G>-gridatlas-v9.188`, `gh api -X POST repos/Ventusltd/gridatlas/pulls ... -F draft=true`. The PR's change set must be exactly: the 7 files of 2.4, `data/uk_datacentre_pipeline_<stamp>.geojson`, `tools/offtakers/src/01-data.js`, the two suite edits of 2.5, `docs/OFFTAKERS-SOURCE.md`, and the two-line workflow edit of section 3. Never `atlas/current.json`, `STATE.md`, `atlas/index.html`, `atlas/releases/**` (publish-preview.mjs:63 FORBIDDEN is the list to copy into the review).

2.8 CI on the PR (`pr-file-size-guard.yml`): `size-guard` (5 MB), `cartridge-gate` (the same pr-gate on Node 22.23.4), and, after the change in 3 below, `dc-browser-smoke`. Merge condition: all three green, then rebase-merge so `atlas/v/<G>/` is on Pages. Owner acceptance (`ACCEPT <G>` first line, by the owner login, after `cut_at_utc`; acceptance.mjs) is step 3 of RELEASE.md and is where this phase stops.

## 3. The gating problem and the smallest change

Fact: `.github/workflows/pr-file-size-guard.yml:158` reads `if: github.event.pull_request.number == 75`, and `:177` hard-codes `DC_SMOKE_GENERATION: '202610292044'`. The new preview PR therefore gets no Chromium run at all; the only browser evidence would be the one from PR #75 on the old file. `202608312212-cartridge-proof.yml` (the browser-proof workflow) is disabled in the repository settings (docs/CI.md:184-187).

Budget rule: `tools/scope/lib.mjs:42` ACTIVE_WORKFLOWS is an exact list of nine filenames; `loop.mjs:106` compares filenames only, and `:112-121` inspects the content of the scope loop only. Editing the body of `pr-file-size-guard.yml` costs nothing against the budget, STATE.md ("Active workflows: 9") or the ledger.

Smallest change (two lines, in the preview PR itself; a `pull_request` job runs from the PR's own merge commit, so the edit takes effect on the very PR that carries it):
- `:158` → `if: contains(github.event.pull_request.labels.*.name, 'dc-browser-smoke')` (the owner or the pair adds the label; the job stays off every other PR, as now). Alternative with no label: `if: startsWith(github.event.pull_request.head.ref, 'preview/')`.
- `:177` → derive the generation from the PR instead of a literal: `DC_SMOKE_GENERATION: $(git diff --name-only ${{ github.event.pull_request.base.sha }} HEAD | sed -n 's#^atlas/v/\([0-9]\{12\}\)/current.json$#\1#p' | tail -1)` set in a prior step via `$GITHUB_ENV` (the job already fetches with depth 1; add `git fetch --depth=1 origin $BASE_SHA` as cartridge-gate does at :137). Second-best: keep a literal and bump it to `<G>` in the same PR.
- While there: `:181` `actions/upload-artifact@v4` is the only action in the file not pinned by SHA (checkout and setup-node are); pin it.
- Update the comment at :154-156 ("Issue #73 one-off") to say the job runs on labelled preview PRs.

Expected CI output of the job: `BROWSER DC SMOKE PASS {"observations":[{viewport:[393,852],...tabs:4,...},{viewport:[1280,800],...}],"errors":[]}` and the artifact `dc-browser-smoke-<run id>` with `dc-393x852.png` and `dc-1280x800.png`.

Local attempt today (system Chrome 147 via `executablePath`, playwright 1.63 from the sandbox, a /tmp copy): `BROWSER DC SMOKE FAIL TimeoutError ... "393 pageerror CRITICAL: MapLibre failed to load."` The released shell loads MapLibre from a CDN the sandbox cannot reach; the smoke is therefore UNVERIFIED locally and the CI runner is the only real-Chromium evidence. The pinned `playwright@1.56.1` (:173) is what CI uses; do not change it in this PR.

## 4. Byte-identity checks (the list)

| # | what | command | pass condition |
|---|---|---|---|
| B1 | twice-built merge | 1.3 run twice, `cmp` | silent; same sha in MANIFEST.json |
| B2 | vendored file = pipeline file | `sha256sum data/uk_datacentre_pipeline_<stamp>.geojson` vs MANIFEST pin vs `DCFSHA` in 01-data.js:19 | three equal 64-hex strings (today all three are `176c1b2e…2d89`, `cmp` identical) |
| B3 | module rebuild | `node tools/offtakers/build.mjs --check`; the proof's `build(M) === text` (offtakers-cartridge.mjs:63) | `ok <G> ... rebuilt byte for byte` |
| B4 | cartridge hash | `node tools/scope/loop.mjs lint` and pr-gate `composition <G>` | `sha256PublishedFile` (LF bytes) = `cartridges[].sha256` in `atlas/v/<G>/current.json` for all 6 cartridges; `bytes` field = file size |
| B5 | suite pin | DC1 (:389) `SRC.includes("DCFSHA='" + sha(file) + "'")` | passes only if 2.1 and 2.2 agree |
| B6 | loader | pr-gate loader-registry | `atlas/v/<G>/index.html` byte-identical to loader v2 |
| B7 | preview = release | release-generation.mjs (step 4, later) | `atlas/v/<G>/current.json` re-rooted equals the pointer to be written |

## 5. Cowley pin (substation-intelligence 202609062358)

Facts measured today:
- `atlas/cartridges/202609062358-substation-intelligence-v9-63.js:4052-4063` pins data-grid-gb `1c9909d1…` for `connection-points.v3` (sha `11e28859…`, 2,896,561 B) and `gb-transmission-network.v1` (sha `fc331cc2…`, 10,069,966 B). The live proof `tools/proofs/202609062358-substation-intelligence.proof.mjs:8-13` asserts only byte identity with the 202609200022 manifest's sha ("unchanged engine must preserve its published bytes"), so a pin move cannot reuse it: G2 needs its own proof. Historical proofs do assert the ref itself (`tools/proofs/202609041244-substation-intelligence.proof.mjs:427-429` the raw URL with `1c9909d…`, `:463-465` `api.product_pin.ref`); pr-gate runs them only for touched or live generations, so they stay green, and the new G2 proof must carry the new ref the same way. The browser verifies the bytes at run time against raw.githubusercontent.
- data-grid-gb HEAD `derived/connection-points.v3.json`: 2,934,509 B, sha `8db7171d…`, counts `with_location 489`, COWLEY transformers 5 (pin: 502, 10). HEAD `gb-transmission-network.v1.json`: 10,069,966 B, sha `b26b324c…`; a section diff against the pin shows every section equal and only `node_code_convention` in a different key order. So the "digest moves on bot refreshes" is key-order only; `pipelines/build_network_model.py:242-245` builds `node_names` as a set (the `nodes` loop at :252 is already sorted); the fix is deterministic key order (`sort_keys` or an ordered build) in that writer, re-run, and a named commit to pin.
- Moving the pin means a NEW immutable cartridge file (a new stamp of substation-intelligence, 451,935 B today, under the 500 kB ceiling at loop.mjs:188), its sha in the new generation's current.json and manifest, and a `tools/proofs/<G>-substation-intelligence.proof.mjs` (RELEASE.md: a proof for every cartridge cut at G; pr-gate: a new pinned generation without a proof fails). make-generation.mjs does not do this; it is a hand cut.

Verdict for the ordering question: the Cowley pin rides a FOLLOWING generation. It needs (a) sorted writer merged in data-grid-gb, (b) a refresh run that commits at a known SHA, (c) the two sha256/bytes pairs read from that commit, (d) a new cartridge + proof, (e) its own browser evidence (the card prints the transformer count). Putting it in the DC-fix generation would make the DC fix wait on (a)-(c) and would widen a two-line pin move into a 450 kB cartridge cut in the same review.

## 6. The one risk I would stop the release for (preview of round 2)

A merged preview whose only browser evidence is PR #75's run on the 227-record file. If `:158` stays `== 75`, nothing with a real Chromium ever opens `atlas/v/<G>/`; the node suite proves the engine, not the map. Condition the job on the new PR before it is opened.

## 7. Limitations of this checklist

- `reproduce.py check` here skipped dc-a6 (three uncommitted pinned inputs, network); CI's requirements leg downloads them (`run_lanes.py inputs`, test-assets.yml).
- The browser smoke was not run to completion anywhere today (CDN blocked in the sandbox).
- The gate's DC1 pair check (`gg2050-dc-133/237` etc.) only covers four Slough pairs; it does not cover Wapseys. The false-split test in 1.2 is the only regression guard for the merge itself.

## 8. Round 2: the agreed command list in step order (P1..P10, F1's pairs; verifier line per step)

Corrections from round 2: the DC1 assertion is `tools/ci/offtakers/overlay-offtakers.test.mjs:389` (not :388). F3's "E1/E4 body hashes 3f0834e2…/0b97bc7a…" occur nowhere in atlas/, tools/ or docs/ at cacb69a (grep); UNVERIFIED until F3 names file:line. F1's P3 and P4 are replaced (see objections 1-2 in fix/F4-round2.md); F1's P9 uses the RELEASE.md:201 hand path, not publish-preview.mjs.

| pair | repo / branch | implementer does | verifier runs | expected |
|---|---|---|---|---|
| P1 | data-grid-gb `fix/nl007-operator-canon` | apply fix/F2-proposed.diff (operator_match-only strip + `test_parenthesised_operator_gloss_is_not_a_split`) | `cd datacentres/lanes/dc-a7-merge && python3 -m unittest test_dcmerge` | `Ran 53 tests` / `OK`; `test_operator_match` and the three cross-operator tests unchanged |
| P2 | same | `python3 pipelines/run_lanes.py build datacentres --lane dc-a7-merge`, twice; commit out/ AND lanes/MANIFEST.json together | the same build on a fresh checkout; `cmp`; `sha256sum`; id diff against the pinned file | `cmp` silent; `87337db5d3bf7959f7f605d3abd029dd4196ab24a79107ceb95210c5b7751654`, 446,550 B; 226 features / 225 with geometry; ids gone = {dcuk-bf4650ea1c4a8a0b}, ids new = {} |
| P3 | same | nothing new: the build already rewrote MANIFEST.json | `python3 ci/verify.py`; `git diff -w --stat <main> -- datacentres/lanes/MANIFEST.json`; `python3 -m unittest discover -s tests`; `python3 reproduce.py check --json r.json` | 8 `ok` lines incl. `lanes ok (6 vendored lanes, every file pinned)`; 6 pin lines, bytes+sha256 for each of dcmerge.py (22,845 B f63ac9e2…7c60), test_dcmerge.py (29,292 B 08c21f2f…77a1) and the geojson (round 2 said 4: my trial had patched two files, F2's diff touches three; the plan's 6 is right); `Ran 35` OK; a `summary_sha256` recorded in the PR |
| P4 | gridatlas `preview/<G>-gridatlas-v9.188` (replaces F1's README step) | `.github/workflows/pr-file-size-guard.yml`: `:158` → `if: contains(github.event.pull_request.labels.*.name, 'dc-browser-smoke')`; `:177` → G; `:181` upload-artifact pinned by SHA; comment at :154-156 updated | `grep -n 'number == 75' .github/workflows/pr-file-size-guard.yml`; `grep -c '@v4' …`; `node tools/scope/loop.mjs lint` | 0 hits; 0 unpinned actions; `scope-ledger=PASS` (budget counts filenames only, loop.mjs:106) |
| P5 | data-grid-gb PR to main | open PR, both `test-assets.yml` legs green, owner merges | read the Actions runs (requirements + bare); post merged SHA, sha256, bytes on NL-007 | both legs green; the posted sha256 equals P2's; UNVERIFIED until the run URLs exist |
| P6 | gridatlas | `cp` the merged geojson to `data/uk_datacentre_pipeline_<S>.geojson` (S = merged commit's UTC minute); edit `tools/offtakers/src/01-data.js:19` DCF/DCFSHA; mark 202610292044 `historical` and list G in `tools/offtakers/generations.json`; `node tools/offtakers/build.mjs --gen G --out atlas/modules/G-uk-offtakers-overlay.js` | `sha256sum data/uk_datacentre_pipeline_<S>.geojson`; `grep -o "DCFSHA='[0-9a-f]*'" tools/offtakers/src/01-data.js`; `node tools/offtakers/build.mjs --check` | the three shas equal (87337db5…1654); `ok G: 71191 B … rebuilt byte for byte`, `hist 202610292044`; file < 5 MB (no allowlist) |
| P7 | gridatlas | `overlay-offtakers.test.mjs:389` `2` → `1` ("one unplaced planning record (Ebbsfleet)"); `browser-dc-smoke.mjs:67` message 226/one (225 stays, :55 stays); `docs/OFFTAKERS-SOURCE.md:36` 226 | `OFFTAKERS_MODULE=atlas/modules/G-uk-offtakers-overlay.js LIGHTNING_MODULE=$PWD/atlas/modules/202610291043-uk-lightning-overlay.js node --test tools/ci/offtakers/overlay-offtakers.test.mjs`; `grep -c 227 tools/ci/offtakers/browser-dc-smoke.mjs docs/OFFTAKERS-SOURCE.md` | `# tests 30` / `# pass 30` / `# fail 0`; 0 and 0 |
| P8 | gridatlas | hand cut per F3 with the 2f80729 precedent: `atlas/manifests/G-composition.json` (previous_generation 202610292044, v9.188, offtakers AND lightning entries `generation: G`, lightning module stays 202610291043), `atlas/v/G/current.json` (deriveCurrent re-rooted), `atlas/v/G/index.html` (= atlas/index.html, v2), `tools/proofs/G-uk-offtakers-overlay.proof.mjs` and `tools/proofs/G-uk-lightning-overlay.proof.mjs` (two-liners); in manifest and route: features 226, drawn 225, new url/sha, classes "225 (226 records, one unplaced)", composition_note 226/225/one unplaced, no "203" | `node tools/proofs/G-uk-offtakers-overlay.proof.mjs`; `node tools/proofs/G-uk-lightning-overlay.proof.mjs`; `node tools/release/release-generation.mjs --generation G --check`; `grep -c '203 sites' atlas/manifests/G-composition.json atlas/v/G/current.json`; `grep -c '"features": 226' …`; `node tools/scope/loop.mjs state --stdout \| diff - STATE.md` | both proofs PASS (71191 B ≤ 80000; 6 scripts composed); `CHECK PASS` (LOADER_IDENTICAL v2); 0 and 0; 1 and 1; STATE.md identical (the pointer did not move) |
| P9 | gridatlas preview PR | `node tools/ci/pr-gate.mjs --base <main sha>` quoted in the body; push; `gh api -X POST repos/Ventusltd/gridatlas/pulls … -F draft=true`; add label `dc-browser-smoke` | re-run the gate; `git diff --name-only <main>..HEAD` | every row PASS, including `composition G`, `proof G-uk-offtakers-overlay`, `proof G-uk-lightning-overlay`, `offtakers G + lightning 202610291043 overlay-offtakers.test.mjs pass 30`, `offtakers-source`; the diff is exactly 14 files: 5 cut files, module, generations.json, data file, 01-data.js, test suite, smoke script, OFFTAKERS-SOURCE.md, workflow yml (never atlas/current.json, STATE.md, atlas/index.html, atlas/releases/**); CI size-guard + cartridge-gate green |
| P10 | gridatlas preview PR, CI only | nothing local: the labelled PR runs `dc-browser-smoke` | read the Actions log and the artifact `dc-browser-smoke-<run id>` | `BROWSER DC SMOKE PASS` with observations for viewports [393,852] and [1280,800], `tabs: 4` each, `errors: []`; two PNGs; post the run URL. UNVERIFIED until it exists; a local "PASS" is not evidence (no sandbox reaches the MapLibre CDN). Stop here: owner `ACCEPT G` on the preview PR (acceptance.mjs), no release in this phase |

CI-only checks the pairs must mark UNVERIFIED until a run URL exists: P5 (test-assets both legs; the requirements leg downloads the dc-a6 inputs that `reproduce.py check` skips locally), P9's cartridge-gate on Node 22.23.4, P10 Chromium smoke, Pages serving `atlas/v/G/` after rebase-merge, and `202608301321-verify-live.yml` live-bytes, which only runs after the owner's release (RELEASE.md step 5, outside this phase).

Rollback per repository (no force pushes, forward cuts only):
- data-grid-gb: a wrong artefact on the fix branch gets a forward commit (rebuild + manifest); once merged, `git revert <merge sha>` restores geojson and MANIFEST.json together so `ci/verify.py` follows; the bot `refresh_network_products.yml` writes only `derived/` and `sources/`, never `datacentres/`, so it cannot interfere.
- gridatlas: preview files are immutable once merged; a wrong G is never edited: set `candidate_status: REJECTED` in its manifest (`release-generation.mjs:133-135` refuses it) and cut G′ with a new stamp; the data file and module stay as records; the live pointer never moved in this phase, so nothing live reverts. After a release (later phase): `rollback-generation.mjs --release-commit <sha>` (route C).
