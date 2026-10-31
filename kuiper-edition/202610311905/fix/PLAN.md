# FIX 202610311905: UK data-centre baseline 227 → 226 (Wapseys Wood), DCFSHA re-pin, composition note

Channel: [NL-007](https://github.com/Ventusltd/neural-link-between-agents/issues/7). Chair: F1. Designed in three rounds by F1–F5 on 2026-10-31.
Heads the plan is keyed to: data-grid-gb main `b57c94d4e964df2de0dea2786781c6d07a967ea1`; gridatlas main `cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e`.
Every figure below was measured on scratch copies of those heads by at least two agents; nothing is verified on a branch or in CI until a pair posts a run URL.
Revision 2 (2026-10-31, after the four round-3 ACKs and the owner's answers, §9): folds the non-blocking corrections of F2, F3, F4 and F5.

## 1. Decision summary

1. One generation, G, carries the data fix: data-grid-gb merges Wapseys Wood into one record (226 records, 225 with coordinates, 1 unplaced: Ebbsfleet), gridatlas vendors the file, re-pins `DCF`/`DCFSHA`, rebuilds the offtakers module byte for byte, cuts G (v9.188) and publishes a preview. The composition note of G says 226/225 and no longer says "203 sites".
2. The canonicalisation lives inside `operator_match` only (F2's `_op_core`): a parenthesised tail is dropped before comparing operators; `norm_operator`, `geo_key` and therefore every other site id stay as they are. One id disappears (`dcuk-bf4650ea1c4a8a0b`), none move.
3. The Cowley pin (substation-intelligence cartridge pinned at data-grid-gb `1c9909d`) is a following generation, G2, with its own plan. It needs a deterministic network writer in data-grid-gb first and a new cartridge file plus proof in gridatlas.
4. Out of scope and recorded as separate issues: METHODS.md 190 vs 212; lane id "out"; `licence_status` "unverified" on all 258 source entries; Kuiper candidates 4–14.
5. The implementers cannot push. Every step ends as a local commit on a named branch plus a `git format-patch` or `git bundle` file under `FIXES/202610311905/patches/` in this repository; the owner pushes at two points (OWNER PUSH 1 and 2) and alone records acceptance.
6. The phase stops at docs/RELEASE.md step 3 (owner acceptance). No agent touches `atlas/current.json`, `STATE.md`, `atlas/index.html`, `atlas/releases/**` or any release branch.

Conflicts resolved in round 3, one sentence each:

- Workflow gate: `pr-file-size-guard.yml:16` is `on: pull_request:` with no `types`, so a label added after opening fires nothing; the gate becomes `if: startsWith(github.event.pull_request.head.ref, 'preview/')` (lines verbatim in §4.2), which fires on `opened` and `synchronize` for every `preview/` branch and needs no label.
- Lightning entry of G: `tools/proofs/run-current.mjs:34-35` finds a proof by each entry's `generation`, `tools/proofs/lightning-cartridge.mjs:77` asserts the overlay entry's `generation` equals the G being proved, and precedent 2f80729 set both overlay entries to the new generation with two two-line proofs; G does the same (both entries `generation: G`, lightning module path stays `202610291043-uk-lightning-overlay.js`), so F4's reading stands and F3's "keep 202610292044" is dropped.
- E1/E4 body hashes `3f0834e2…`/`0b97bc7a…`: found nowhere under atlas/, tools/ or docs/ at cacb69a by F4 and by F1; they are dropped from this plan and may return in the G2 plan with a `file:line` key.
- Restructure: P2 and P3 are one commit because `run_lanes.py build` rewrites `datacentres/lanes/MANIFEST.json` itself; the README step is gone (no count there, F5 D8); the workflow edit is its own pair; the preview is published by the hand path of docs/RELEASE.md ("Publishing (a person does this)"), because `tools/release/flow-lib.mjs:34-43` hard-codes six lightning files and `publish-preview.mjs` stops on an offtakers-only G.
- Displayed operator string: the merged record shows the dc-a3 string "Slough Holdings UK Limited (SDC Capital Partners)" (tier order, `dcmerge.py:392-393`) and its id hashes that record's `norm_operator`, so changing the string later re-keys the id and the file hash and re-opens P2–P9; the owner decides it before P1 (decision 2).

## 2. Facts (keyed)

data-grid-gb@b57c94d:

- `datacentres/lanes/dc-a7-merge/dcmerge.py:87-88` `norm_operator` keeps the tokens of "(SDC Capital Partners)"; `:122-128` `operator_match` is exact equality on `norm_operator`; `:262-267` `cannot_link` makes `False` a hard, cluster-wide split before the URL and name rules run.
- `dcmerge.py:226` `geo_key` embeds `norm_operator`, and `:143-144` hash the site key into the id, so a change to `norm_operator` renames every site whose operator carries parentheses (10 of 100 distinct operators; 9 unrelated sites).
- `datacentres/lanes/lanes.json` dc-a7-merge `build`: `dcingest.py --lanes ../dc-a1-neso/out ../dc-a2-planning/out ../dc-a3-gov ../dc-a4-osm-wikidata/out ../dc-a5-dno/out --out out/uk_datacentre_pipeline.geojson`. On a scratch copy it reproduces the committed file byte for byte: `176c1b2e894943618c1dd866b3a96c9f3e00bcded8c6e88a5263b0048ae22d89`, 447,511 B, 227 features, 225 with geometry (F1, F2, F4 independently).
- With `fix/F2-proposed.diff` (strip inside `operator_match` only, one new test): 53/53 tests; two builds `cmp`-identical; `87337db5d3bf7959f7f605d3abd029dd4196ab24a79107ceb95210c5b7751654`, 446,550 B; 226 features, 225 with geometry; ids gone = {`dcuk-bf4650ea1c4a8a0b`}, ids new = {}; `dcuk-4ad498e7880d6ba4` keeps id, point (exact_site, [-0.59697, 51.58696]) and operator string, gains source `out:s35-seed:dc-a2:s35:EN0110030` by rule `evidence_document`, conflicts `[]`; `rejects.json` unchanged (F2, F4, F5).
- metadata.summary deltas, each the one merge: sites 227→226; in_planning 8→7; it_load_mw_known 5→4; sum_it_load_mw_known 1632→1332; OGL-UK-3.0 29→28; sites_from_several_lanes 2→3 (F2 by jq).
- Digital Realty LHR26 (`dcuk-fde0cde03ff31e52`) and Global Technical Realty (`dcuk-fef513d474e76fa7`) remain two records; `test_operator_match` (:122) and the three cross-operator tests (:155-186) are unchanged.
- New pins: `dcmerge.py` 22,845 B `f63ac9e2…7c60`; `test_dcmerge.py` 29,292 B `08c21f2f…77a1`; the geojson as above. `run_lanes.py build` rewrites `datacentres/lanes/MANIFEST.json` in the tool's canonical two-space form (`assetpipe/pipeline.py:66-68`): a 236-line diff whose `git diff -w` is the 6 pin lines; nothing hashes the manifest's own bytes (`assetpipe/lanes.py:157, :183-215`).
- `dcingest.py:398` takes `basename(dir)`, so lanes passed as `…/out` are recorded as lane "out" (231 of 258 source entries); fixing it rewrites 231 source ids: out of scope.
- `pipelines/build_network_model.py:242-245` iterates `node_names` as a set; the network product at HEAD differs from the 1c9909d pin only by key order in `node_code_convention` (same 10,069,966 B) (F4). `derived/connection-points.v3.json` at HEAD: 2,934,509 B `8db7171d…`, 489 located, Cowley 5 transformers; the pin: 2,896,561 B `11e28859…`, 502, 10.

gridatlas@cacb69a:

- `tools/offtakers/src/01-data.js:19` `DCF='…/data/uk_datacentre_pipeline_202610292136.geojson'`, `DCFSHA='176c1b2e…2d89'`; the module reads only allow-listed `data/` files and checks SHA-256 before parsing (`:27`, `gx`).
- `atlas/modules/202610292044-uk-offtakers-overlay.js` 71,191 B; budget 80,000 B (`tools/scope/lib.mjs:118`); `node tools/offtakers/build.mjs --check` rebuilds it byte for byte; after the pin moves it reports `FAIL 202610292044 … differs at byte 2104`, so 202610292044 is marked `historical` in `tools/offtakers/generations.json` and G listed (`build.mjs:33-36`); the new module is 71,191 B (fixed-width stamp and hash; 78 bytes differ) (F3).
- `atlas/v/202610292044/current.json:769-773` url, sha256, `features 227`, `drawn 225`, built_by "227 sites"; `:796` classes "C data centres 225 (227 records, two unplaced)"; `:886` composition_note "203 sites from the open UK data-centre pipeline". No gate asserts `features`, `drawn` or the note (F4 checked offtakers-cartridge.mjs, run-current.mjs, verify-compose.mjs, release lib.mjs).
- `tools/ci/offtakers/overlay-offtakers.test.mjs:389` asserts `DCD.features.length - DCD_MAPPABLE.length === 2` ("SDC M40 and Ebbsfleet") and `:388` that `SRC` contains `DCFSHA='<sha of the vendored file>'`; with a 226 file DC1 fails until `:389` reads `1`.
- `tools/ci/offtakers/browser-dc-smoke.mjs:55` waits for `>= 225` data-centre dots and `:67` asserts `225` with a message that says "227 source records, of which two"; `:16` default generation; `DC_SMOKE_GENERATION` overrides it.
- `.github/workflows/pr-file-size-guard.yml:16` `on: pull_request:` (no `types`); `:158` `if: github.event.pull_request.number == 75`; `:177` `DC_SMOKE_GENERATION: '202610292044'`; `:181` `uses: actions/upload-artifact@v4` (the only action in the file not pinned by SHA; checkout at `:165` and setup-node at `:170` are). `tools/scope/loop.mjs:106` counts workflow filenames only, so editing the body costs nothing against `ACTIVE_WORKFLOWS` or `STATE.md`.
- `tools/release/flow-lib.mjs:34-43` `generationFiles(G)` names six lightning files, none of which an offtakers-only G has; `publish-preview.mjs` therefore stops. docs/RELEASE.md "Publishing (a person does this)": `pr-gate.mjs` quoted, push, REST draft PR.
- Precedent 2f80729 (the 202610292044 cut): 7 files: `atlas/manifests/<G>-composition.json`, `atlas/modules/<G>-uk-offtakers-overlay.js`, `atlas/v/<G>/current.json`, `atlas/v/<G>/index.html`, `tools/offtakers/generations.json`, `tools/proofs/<G>-uk-lightning-overlay.proof.mjs` and `tools/proofs/<G>-uk-offtakers-overlay.proof.mjs` (two-liners calling `proveLightningCartridge(G)` / `proveOfftakersCartridge(G)`); both overlay entries carry `generation: 202610292044` (`atlas/v/202610292044/current.json:635, :718`) while the lightning module path stays `202610291043`.
- `tools/proofs/run-current.mjs:34-35` looks up `tools/proofs/<entry.generation>-<id>.proof.mjs` for every composed cartridge; `tools/proofs/lightning-cartridge.mjs:77` asserts `overlay.generation === G`; `tools/ci/pr-gate.mjs:181-184` fails a new pinned generation with no `<G>-*.proof.mjs`.
- `tools/release/release-generation.mjs --generation G --check` on F3's dry cut: CHECK PASS, LOADER_IDENTICAL (v2); lint PASS; `loop.mjs state --stdout` = `STATE.md`.
- Cowley: `atlas/cartridges/202609062358-substation-intelligence-v9-63.js:4052-4063` pins data-grid-gb `1c9909d1138704b29235c27fd769436dda8a0b18` for `connection-points.v3` and `gb-transmission-network.v1`; `tools/proofs/202609062358-substation-intelligence.proof.mjs:13` demands unchanged bytes; historical proofs assert the ref itself (`202609041244-substation-intelligence.proof.mjs:429, :465`). A pin move is a new cartridge file (451,935 B today, ceiling 500 kB) plus its own proof.

## 3. Design

### 3.1 data-grid-gb (branch `fix/nl007-operator-canon`)

- `datacentres/lanes/dc-a7-merge/dcmerge.py`: add `_op_core(s)` that replaces `\([^)]*\)` with a space, and compare `norm_operator(_op_core(a))` with `norm_operator(_op_core(b))` in `operator_match`. Equality stays exact. `norm_operator`, `geo_key`, `site_key` and ids are untouched. The diff is `fix/F2-proposed.diff` in the edition folder and is reproduced in `FIXES/202610311905/patches/01-dcmerge.patch` once P1 commits it.
- `datacentres/lanes/dc-a7-merge/test_dcmerge.py`: `test_parenthesised_operator_gloss_is_not_a_split` beside `test_cross_operator_name_and_location_never_merge` (:155): one operator with and without a gloss merges in both input orders (one site, two sources, exact_site, 300 MW once, no `operator_disagreement`), and `operator_match("Digital Realty", "Global Technical Realty")` stays `False`. 53 tests.
- Rebuild with `python3 pipelines/run_lanes.py build datacentres --lane dc-a7-merge`, twice; commit `out/uk_datacentre_pipeline.geojson`, `out/uk_datacentre_pipeline.rejects.json` (unchanged) and `datacentres/lanes/MANIFEST.json` as the tool writes it; review the manifest with `git diff -w`.
- Nothing else in data-grid-gb changes. `datacentres/README.md` and `NOTICE` state no count (F5 D8). Commit subjects say 226.

### 3.2 gridatlas (branch `preview/<G>-gridatlas-v9.188`)

- Vendor `data/uk_datacentre_pipeline_<S>.geojson` byte for byte from data-grid-gb main at the merged commit M; S = M's UTC minute (`YYYYMMDDHHMM`); `data/uk_datacentre_pipeline_202610292136.geojson` stays (the live generation reads it).
- `tools/offtakers/src/01-data.js:19`: `DCF` stamp → S, `DCFSHA` → `87337db5d3bf7959f7f605d3abd029dd4196ab24a79107ceb95210c5b7751654`. Nothing else in `src/`.
- `tools/offtakers/generations.json`: 202610292044 marked `"historical": "2f80729 (main, PR #73 lane DC-B1)"`; G listed with a label. `node tools/offtakers/build.mjs --gen G --out atlas/modules/G-uk-offtakers-overlay.js` → 71,191 B; `--check` → `ok G … rebuilt byte for byte`, `hist 202610292044`.
- Tests and docs: `tools/ci/offtakers/overlay-offtakers.test.mjs:389` `2` → `1`, message "one unplaced planning record (Ebbsfleet)"; `tools/ci/offtakers/browser-dc-smoke.mjs:67` message → "226 source records, of which one planning site (Ebbsfleet) has unknown coordinates and must not be mapped" (the asserted 225 at `:55` and `:67` stays; `:16` default generation → G); `docs/OFFTAKERS-SOURCE.md:36` "corrected 227 sites" → "226 sites (225 mappable), Wapseys Wood one site".
- The cut, by hand, following 2f80729: `atlas/manifests/G-composition.json` is the 202610292044 manifest re-identified in every identity key (line numbers of that manifest): `previous_generation` (:4), `composition_manifest` → `./manifests/G-composition.json` (:863), `composition_version` → v9.188 (:870), `composition_id` → `G-gridatlas-v9.188` (:871), `superseded_generation` and `parent_generation` → 202610292044 (:887, :889), `candidate_predecessor` → 202610292044 (:888), `acceptance.offtakers_proof` → `tools/proofs/G-uk-offtakers-overlay.proof.mjs` (:910), `version` → v9.188 (:912), fresh `cut_at_utc` (:913), `generation` → G (:3 of the route file), both overlay entries' `generation` → G and `version` → v9.188 (:635-636, :718-719), the offtakers entry's path/sha256/bytes → the new module, the lightning entry otherwise unchanged; `atlas/v/G/current.json` = `rerootForPreview(deriveCurrent(manifest))` from `tools/release/lib.mjs`; `atlas/v/G/index.html` = byte copy of `atlas/index.html` (loader v2); `tools/proofs/G-uk-lightning-overlay.proof.mjs` and `tools/proofs/G-uk-offtakers-overlay.proof.mjs`, two lines each. In manifest and route alike: `site_data_sources` url S, sha256 `87337db5…1654`, `features 226`, `drawn 225`, built_by "226 sites (Wapseys Wood one site)"; classes "C data centres 225 (226 records, one unplaced)"; composition_note prefix "v9.188: 202610292044 re-pinned to the 226-record pipeline file, otherwise unchanged;" and "203 sites from the open UK data-centre pipeline, DC-A7's pinned snapshot" → "226 records from the open UK data-centre pipeline (DC-A7's pinned snapshot, Wapseys Wood one site), 225 drawn, one (Ebbsfleet) without coordinates and never drawn"; the rest kept.
- Workflow (`.github/workflows/pr-file-size-guard.yml`), three lines, verbatim in §4.2.
- The preview PR's change set is exactly these 13 files (F3's count; P9 verifies against this list, not a number):
  1. `atlas/manifests/<G>-composition.json`
  2. `atlas/v/<G>/current.json`
  3. `atlas/v/<G>/index.html`
  4. `tools/proofs/<G>-uk-lightning-overlay.proof.mjs`
  5. `tools/proofs/<G>-uk-offtakers-overlay.proof.mjs`
  6. `atlas/modules/<G>-uk-offtakers-overlay.js`
  7. `tools/offtakers/generations.json`
  8. `data/uk_datacentre_pipeline_<S>.geojson`
  9. `tools/offtakers/src/01-data.js`
  10. `tools/ci/offtakers/overlay-offtakers.test.mjs`
  11. `tools/ci/offtakers/browser-dc-smoke.mjs`
  12. `docs/OFFTAKERS-SOURCE.md`
  13. `.github/workflows/pr-file-size-guard.yml`

  and nothing under `atlas/current.json`, `STATE.md`, `atlas/index.html`, `atlas/releases/**` (`publish-preview.mjs:63` FORBIDDEN).

### 3.3 Out of scope, and why

| item | why not in G |
|---|---|
| Cowley pin, sorted `node_names` | a 450 kB cartridge cut with its own proof and browser evidence; needs a data-grid-gb refresh at a known SHA first; coupling it to G would couple the rollbacks (G2 plan to follow) |
| `docs/METHODS.md:118` 190 vs counts.json 212 | touches no pinned byte and no 227/226 line; documentation issue |
| lane id "out" (`dcingest.py:398`) | fixing it rewrites 231 source ids across 202 records: a separate, reviewable change |
| `licence_status: unverified` ×258 | written by `dcingest.py:260-267`, declared as a caveat (:493); a lane-level verification pass, not a merge change |
| Kuiper candidates 4–14 | other subsystems |

## 4. Tests

### 4.1 Existing, new, byte identity, browser

| check | command | expected |
|---|---|---|
| dcmerge unit tests | `cd datacentres/lanes/dc-a7-merge && python3 -m unittest test_dcmerge` | `Ran 53 tests` / `OK` (52 at HEAD) |
| repository tests | `python3 -m unittest discover -s tests` | `Ran 35 tests` / `OK` |
| pins | `python3 ci/verify.py` | 8 `ok` lines incl. `lanes ok (6 vendored lanes, every file pinned)` |
| reproduce | `python3 reproduce.py check --json r.json` | a `summary_sha256`, recorded in the PR body; dc-a6 `skipped_missing_input` locally, downloaded in CI's requirements leg |
| twice-built merge (B1) | build twice, `cmp` | silent; `87337db5…1654`, 446,550 B; 226/225; ids gone = {`dcuk-bf4650ea1c4a8a0b`}, new = {} |
| three hashes (B2) | `sha256sum data/uk_datacentre_pipeline_<S>.geojson`; MANIFEST.json pin; `grep -o "DCFSHA='[0-9a-f]*'" tools/offtakers/src/01-data.js`; `git show M:datacentres/lanes/dc-a7-merge/out/uk_datacentre_pipeline.geojson \| sha256sum` | four equal strings |
| module rebuild (B3) | `node tools/offtakers/build.mjs --check` | `ok G: 71191 B … rebuilt byte for byte`; `hist 202610292044` |
| offtakers suite | `OFFTAKERS_MODULE=atlas/modules/G-uk-offtakers-overlay.js LIGHTNING_MODULE=$PWD/atlas/modules/202610291043-uk-lightning-overlay.js node --test tools/ci/offtakers/overlay-offtakers.test.mjs` | `# tests 30` / `# pass 30` / `# fail 0` |
| proofs | `node tools/proofs/G-uk-offtakers-overlay.proof.mjs`; `node tools/proofs/G-uk-lightning-overlay.proof.mjs` | PASS (71191 B ≤ 80000; 6 scripts composed) |
| release preconditions | `node tools/release/release-generation.mjs --generation G --check` | `CHECK PASS`, LOADER_IDENTICAL |
| counts in the cut | `grep -c '203 sites' atlas/manifests/G-composition.json atlas/v/G/current.json`; `grep -c '"features": 226' …`; hand-diff of `:769-773`, `:796`, `:886` against `atlas/v/202610292044/current.json` | 0 and 0; 1 and 1; only the intended lines differ (no machine asserts them) |
| gate | `node tools/ci/pr-gate.mjs --base <main sha>` | every row PASS incl. `composition G`, both G proofs, `offtakers-source`, offtakers G + lightning 202610291043 at 30 |
| budget | `node tools/scope/loop.mjs lint`; `node tools/scope/loop.mjs state --stdout \| diff - STATE.md` | `scope-ledger=PASS`; no diff |
| Chromium smoke (CI only) | job `dc-browser-smoke` on the preview PR | `BROWSER DC SMOKE PASS`, viewports [393,852] and [1280,800], `tabs: 4`, `errors: []`, two PNGs. No sandbox reaches the MapLibre CDN; a local "PASS" is not evidence |

### 4.2 The workflow edit (`.github/workflows/pr-file-size-guard.yml`), verbatim

```yaml
# :158  (was: if: github.event.pull_request.number == 75)
    if: startsWith(github.event.pull_request.head.ref, 'preview/')
# :177  (was: DC_SMOKE_GENERATION: '202610292044')
          DC_SMOKE_GENERATION: '<G>'
# :181  (was: uses: actions/upload-artifact@v4)
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02  # v4.6.2
```

The SHA `ea165f8d65b6e75b540449e92b4886f43607fa02` was resolved by F4 with `git ls-remote https://github.com/actions/upload-artifact.git refs/tags/v4.6.2` (the peeled `^{}` commit); P5-I and P5-V each re-run that command and must read the same 40 characters. The comment at `:154-156` ("Issue #73 one-off") is updated to say the job runs on every `preview/` branch. `on: pull_request:` (`:16`) is unchanged; the job fires on `opened` and `synchronize`.

## 5. Release path (docs/RELEASE.md), and where the owner acts

| RELEASE.md step | this plan | who |
|---|---|---|
| 1 cut | P8, by hand (no cutter covers an offtakers-only G) | P8 pair |
| 2 preview PR | P9 prepares the bundle, PR body and `pr-gate` output; **OWNER PUSH 2** pushes `preview/<G>-gridatlas-v9.188` and opens the draft PR via REST; CI `size-guard`, `cartridge-gate`, `dc-browser-smoke`; P10 reads them; the owner rebase-merges so `atlas/v/G/` is on Pages | pair + owner |
| 3 owner acceptance | `ACCEPT G` as the first line of a comment on the preview PR, by the owner login (`acceptance.mjs`); **this phase stops here** | owner only |
| 4–7 release, live bytes, homepage, served | a later phase, `release-accepted.mjs --generation G --push` and the rest of the flow | later |
| 8 rollback | §6 | later |

Data-grid-gb has no release process: the merge to main is the release of the file; **OWNER PUSH 1** pushes `fix/nl007-operator-canon`, opens the PR, waits for both `test-assets.yml` legs, merges, and posts the merged SHA M on NL-007.

Protocol for the pairs (F5): labels `[P<n>-I → P<n>-V] [NL-007]` for HANDOFF and `[P<n>-V → F1] [NL-007]` for REVIEW, `IN-REPLY-TO` the step's comment URL, on NL-007 only. HANDOFF carries repository, branch, 40-character HEAD, files, the command with its numbers, the artefact's sha256 and bytes. REVIEW is from a fresh checkout at that HEAD, each check PASS or FAIL with the differing number. A moved head is a BLOCKER quoting both refs. No agent writes a first line `ACCEPT G` or adds a label `accepted:G` anywhere.

## 6. Risks and rollback

Risks the agents would each stop for:

1. (F4, F1) A preview merged or accepted on PR #75's browser evidence, with no `dc-browser-smoke` PASS on its own PR: no real browser opened `atlas/v/G/`. Mitigation: §4.2; P10 is CI-only.
2. (F5) MANIFEST pin, vendored file and `DCFSHA` not one hash of the bytes on data-grid-gb main. Mitigation: P4 posts M, sha256 and bytes before P6 starts; P6's verifier checks the four strings of B2.
3. (F3) A `DCFSHA` that no data-grid-gb main commit carries (vendoring a scratch build before M exists). Mitigation: P6 is gated on OWNER PUSH 1.
4. (F2) The displayed operator string changed after P2: it re-keys `dcuk-4ad498e7880d6ba4` and the file hash and re-opens P2–P9. Mitigation: owner decision 2 before P1.
5. (F1) `features`, `drawn`, classes and the note are asserted by no gate; a stale 227 or 203 ships silently. Mitigation: P8's verifier hand-diffs `:769-773`, `:796`, `:886` and greps for `203 sites` and `227`.
6. Byte budget: 71,191 B of 80,000 B; the stamp and hash are fixed-width, so the module size does not move.

Rollback, forward only, no force pushes (F4):

- data-grid-gb: a wrong artefact on the fix branch gets a forward commit (rebuild + manifest). Once merged, `git revert <merge sha>` restores the geojson and `MANIFEST.json` together, so `ci/verify.py` follows. The bot `refresh_network_products.yml` writes only `derived/` and `sources/`, never `datacentres/`.
- gridatlas: preview files are immutable once merged; a wrong G is never edited: set `candidate_status: REJECTED` in its manifest (`release-generation.mjs:133-135` then refuses it) and cut G′ with a new stamp. The live pointer never moved in this phase, so nothing live reverts. After a release (later phase): `tools/release/rollback-generation.mjs --release-commit <sha>` (route C).

## 7. The 20 steps for ten pairs

Conventions. `I` implements, `V` verifies; both are Opus agents of the pair named `P<n>-I` and `P<n>-V`. Every `I` step ends as a local commit on the named branch plus an artefact under `FIXES/202610311905/patches/` in this repository (committed here on main, one commit per step, subject `P<n>: <artefact>`); every `V` step re-runs from a fresh worktree built from that artefact and posts REVIEW. `<M>` is the merged data-grid-gb commit, `<S>` its UTC minute, `<G>` the generation (fixed at P5 as the UTC minute P5 starts, later than S). Expected numbers are those of §2 and §4.

| step | repo / branch | does | proving check → expected | artefact handed on |
|---|---|---|---|---|
| **P1-I** | data-grid-gb `fix/nl007-operator-canon` from `b57c94d` | apply `fix/F2-proposed.diff`: `dcmerge.py` `_op_core` + `operator_match`; `test_dcmerge.py` new test | `python3 -m unittest test_dcmerge` → `Ran 53 tests` / `OK` | commit 1; `patches/01-dcmerge.patch` (`git format-patch -1`) |
| **P1-V** | fresh worktree at `b57c94d` | `git am patches/01-dcmerge.patch` | same command → 53 OK; `git diff b57c94d --stat` → exactly the two files; `test_operator_match` and the three cross-operator tests byte-identical | REVIEW PASS/FAIL |
| **P2-I** | same branch | `python3 pipelines/run_lanes.py build datacentres --lane dc-a7-merge`; `cp out/uk_datacentre_pipeline.geojson /tmp/first.geojson`; build again; `cmp /tmp/first.geojson out/uk_datacentre_pipeline.geojson`; commit `out/uk_datacentre_pipeline.geojson`, `out/uk_datacentre_pipeline.rejects.json`, `datacentres/lanes/MANIFEST.json` as written | `cmp` silent; `sha256sum` → `87337db5…1654`, 446,550 B; features 226, with geometry 225; ids gone `{dcuk-bf4650ea1c4a8a0b}`, new `{}`; status `unknown` = 1; source entries with `licence_status: unverified` = 258 of 258; merged `dcuk-4ad498e7880d6ba4` `location.source_id` = `dc-a3-gov:MHCLG; Planning Inspectorate:gov-s35-wapseys-wood`; `git diff -w --stat HEAD~1 -- datacentres/lanes/MANIFEST.json` → `1 file changed, 6 insertions(+), 6 deletions(-)`, the pins at MANIFEST.json:99-100 (dcmerge.py 22,845 B `f63ac9e2…7c60`), :107-108 (geojson), :115-116 (test_dcmerge.py 29,292 B `08c21f2f…77a1`); :111-112 (rejects) unchanged | commit 2; `patches/02-rebuild.patch` |
| **P2-V** | fresh worktree, patches 01+02 applied | rebuild once more; id diff against the pinned 227 file | `cmp` silent against the committed file; same sha, bytes, counts, id sets, the three jq assertions above; `rejects.json` unchanged | REVIEW |
| **P3-I** | same branch | run `python3 ci/verify.py`, `python3 -m unittest discover -s tests`, `python3 reproduce.py check --json r.json`; write the outputs to `patches/03-checks.txt`; `git bundle create patches/03-data-grid-gb.bundle b57c94d..fix/nl007-operator-canon`; draft `patches/03-pr-body.md` (subject says 226; the numbers above; the `summary_sha256`) | verify → 8 `ok`; tests → `Ran 35` OK; `git bundle verify` → ok | `03-checks.txt`, `03-data-grid-gb.bundle`, `03-pr-body.md` |
| **P3-V** | fresh clone of origin/main, `git fetch patches/03-data-grid-gb.bundle fix/nl007-operator-canon` | re-run the three commands | same 8 `ok`, 35 OK, same `summary_sha256`; bundle tip = P2-I's commit; tree identical to patches 01+02 | REVIEW; F1 posts "ready for OWNER PUSH 1" |
| **OWNER PUSH 1** | data-grid-gb | push `fix/nl007-operator-canon` from the bundle (patches/README.md), open the PR with `03-pr-body.md`, wait for both `test-assets.yml` legs, merge, post `<M>` on NL-007 | | gates P4–P10 |
| **P4-I** | data-grid-gb main at `<M>` | `git show <M>:datacentres/lanes/dc-a7-merge/out/uk_datacentre_pipeline.geojson \| sha256sum`; read the two Actions runs; write `patches/04-merge-evidence.md` (M, S, sha256, bytes, run URLs, legs green) | sha → `87337db5…1654`, 446,550 B; both legs green | `04-merge-evidence.md`; HANDOFF with M, S, sha, bytes (its STATUS reads `UNVERIFIED until OWNER PUSH 1` while M does not exist, `PASS` only with the run URLs) |
| **P4-V** | | independent read of the run URLs and the raw file at `<M>` | same four values; `S` = M's committer UTC minute | REVIEW |
| **P5-I** | gridatlas `preview/<G>-gridatlas-v9.188` from `cacb69a` (G fixed now) | `.github/workflows/pr-file-size-guard.yml` `:158`, `:177`, `:181` and the comment at `:154-156` per §4.2 | `grep -c 'number == 75'` → 0; `grep -c '@v4$'` → 0; `git ls-remote https://github.com/actions/upload-artifact.git refs/tags/v4.6.2` peeled → `ea165f8d65b6e75b540449e92b4886f43607fa02`; `node tools/scope/loop.mjs lint` → `scope-ledger=PASS` | commit; `patches/05-workflow.patch` |
| **P5-V** | fresh worktree at `cacb69a` + patch 05 | re-resolve the tag SHA; `sed -n '158p;177p;181p' .github/workflows/pr-file-size-guard.yml`; lint | same SHA; the three lines read verbatim as §4.2 (parsing is proven by the workflow running at OWNER PUSH 2, not locally); PASS; the diff touches one file | REVIEW |
| **P6-I** | same branch | `cp` the file from `<M>` to `data/uk_datacentre_pipeline_<S>.geojson`; `01-data.js:19` DCF/DCFSHA; `generations.json` (202610292044 historical, G listed); `node tools/offtakers/build.mjs --gen <G> --out atlas/modules/<G>-uk-offtakers-overlay.js` | B2: four equal hashes; `build.mjs --check` → `ok <G>: 71191 B … rebuilt byte for byte`, `hist 202610292044`; file < 5 MB | commit; `patches/06-repin.patch` |
| **P6-V** | fresh worktree + patches 05–06 | rebuild the module; B2 again from the raw file at `<M>` | byte-identical module; four equal hashes; `01-data.js` diff is one line | REVIEW |
| **P7-I** | same branch | `overlay-offtakers.test.mjs:389` `2`→`1` + message; `browser-dc-smoke.mjs:67` message, `:16` default → `<G>`; `docs/OFFTAKERS-SOURCE.md:36` | offtakers suite with `OFFTAKERS_MODULE=<G>` and lightning 202610291043 → `# pass 30`; `grep -c 227 tools/ci/offtakers/browser-dc-smoke.mjs docs/OFFTAKERS-SOURCE.md` → 0 and 0 | commit; `patches/07-tests.patch` |
| **P7-V** | fresh worktree + 05–07 | same suite; confirm `:55` and `:67` still assert 225 | `# pass 30`; 225 unchanged | REVIEW |
| **P8-I** | same branch | the hand cut of §3.2: manifest, `atlas/v/<G>/current.json`, `atlas/v/<G>/index.html`, two two-line proofs; counts and note | both proofs PASS (71191 ≤ 80000; 6 scripts composed); `release-generation.mjs --generation <G> --check` → `CHECK PASS`; `grep -c '203 sites'` → 0, 0; `grep -c '"features": 226'` → 1, 1; `loop.mjs state --stdout \| diff - STATE.md` → empty | commit; `patches/08-cut.patch` |
| **P8-V** | fresh worktree + 05–08 | re-run the proofs and `--check`; hand-diff `atlas/v/<G>/current.json` against `atlas/v/202610292044/current.json` | only these differ: `generation`, `version`, `cut_at_utc`, `previous_generation`, `parent_generation`, `superseded_generation`, `candidate_predecessor`, `composition_manifest`, `composition_version`, `composition_id`, `acceptance.offtakers_proof`, both overlay entries' `generation` and `version`, the offtakers entry's path/sha256/bytes, and `:769-773`, `:796`, `:886`; `index.html` `cmp` = `atlas/index.html` | REVIEW |
| **P9-I** | same branch | `node tools/ci/pr-gate.mjs --base cacb69a` saved to `patches/09-pr-gate.log`; `git bundle create patches/09-gridatlas.bundle cacb69a..preview/<G>-gridatlas-v9.188`; `patches/09-pr-body.md` (the gate output, the 13 files, the four hashes, M) | every gate row PASS incl. `composition <G>`, both `<G>` proofs, `offtakers-source`, offtakers `<G>` + lightning 202610291043 at 30; `git diff --name-only cacb69a..HEAD` → exactly the 13 files enumerated in §3.2, compared line by line against that list; none of the FORBIDDEN paths | `09-pr-gate.log`, `09-gridatlas.bundle`, `09-pr-body.md` |
| **P9-V** | fresh clone of origin/main, fetch from the bundle | re-run the gate; `git bundle verify` | all PASS; the same 13 files, checked against the §3.2 list; bundle tip = P8-I's commit | REVIEW; F1 posts "ready for OWNER PUSH 2" |
| **OWNER PUSH 2** | gridatlas | push `preview/<G>-gridatlas-v9.188` from the bundle, open the draft PR via REST with `09-pr-body.md` (the `preview/` head ref fires `dc-browser-smoke`; no label needed) | | gates P10 |
| **P10-I** | the preview PR, CI only | read `size-guard`, `cartridge-gate`, `dc-browser-smoke`; download the artifact `dc-browser-smoke-<run id>`; write `patches/10-ci-evidence.md` (run URLs, the two viewports, `tabs: 4`, `errors: []`, PNG names) | `BROWSER DC SMOKE PASS` at [393,852] and [1280,800]; three jobs green | `10-ci-evidence.md`; HANDOFF (its STATUS reads `UNVERIFIED until OWNER PUSH 2` while the PR does not exist, `PASS` only with the three run URLs) |
| **P10-V** | | independent read of the three run URLs and the artifact | same; then REVIEW PASS and **stop**; the owner rebase-merges and records `ACCEPT <G>` on the PR; nothing else moves | REVIEW |

Dependencies: P1 → P2 → P3 → OWNER PUSH 1 → P4 → P5 → P6 → P7 → P8 → P9 → OWNER PUSH 2 → P10. P5 could run earlier only if G were fixed before M; the plan keeps G later than S, so it waits.

## 8. Owner decisions required before step 1 (yes/no)

1. Canonicalise inside `operator_match` only, so one id disappears (`dcuk-bf4650ea1c4a8a0b`) and none move? (Alternative: inside `norm_operator`, which moves 10 ids.)
2. Wapseys Wood is shown as "Slough Holdings UK Limited (SDC Capital Partners)" with id `dcuk-4ad498e7880d6ba4`, final? (A plain string is a different change and re-keys the id; it would re-open P2–P9 if asked later.)
3. G carries 226/225 and the "203 sites" correction together, and the Cowley pin waits for G2 with its own plan? (Default stated with it: G is v9.188, label "DC baseline 226/225 (NL-007)", previous generation 202610292044.)
4. METHODS.md:118 (190 vs 212), lane id "out" and `licence_status` "unverified" are separate issues, not in G?
5. The preview PR may edit `pr-file-size-guard.yml:158, :177, :181` so that every `preview/` PR runs the Chromium smoke (about 15 CI minutes each)?
6. The owner performs OWNER PUSH 1 and 2 from the bundles in `FIXES/202610311905/patches/` and opens both PRs; commits keep the implementers' authorship?

If any answer is no, F1 re-plans before P1; the pairs do not start on a partial yes.

## 9. Owner decisions recorded

On 2026-10-31, after the four round-3 ACKs on NL-007 (F2 6549176572, F5 6549179380, F3 6549181555, F4 6549183224), the owner answered **yes** to every question of §8 (asked as seven, recorded here as six with the v9.188 default folded into question 3). The answers were given in chat and relayed to issue 7 by the harness, not posted by the owner's login; under PROTOCOL.md the relay is a routing label, not authenticated identity, so the pairs treat it as the go-ahead for P1–P10 and nothing more: acceptance of G is still only the owner's `ACCEPT <G>` on the gridatlas preview PR. Recorded at 2026-10-31 21:15 UTC by F1 in revision 2 of this plan.
