# C1 — GridAtlas engine and release: how a data-centre overlay becomes shippable

Controller C1 (Claude Fable 5.1), Kuiper edition 202610311905. Written 2026-10-31T19:26:00Z.
Workers reviewed: W01 (dc engine), W02 (release), W03 (cartridges and lightning), W06 (CI and QA).
Clone: gridatlas, HEAD `cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e` (`git rev-parse HEAD`, re-run 2026-10-31T19:21:20Z;
`git status --porcelain` empty before and after every command). Every KEY below is `gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e <path>:<line>` unless another commit is named.

**Keys verified 113 of 113** (W01 27 of 27, W02 23 of 23, W03 33 of 33, W06 30 of 30; 0 SHIFTED), by a script that
resolved each sha with `git cat-file -e`, extracted the file with `git show <sha>:<path>`, and required the first non-blank
quoted line inside the cited range. Numeric claims re-run by me, all equal to the workers' figures: `jq '.features|length'`
on `data/uk_datacentre_pipeline_202610292136.geojson` = 227; status operational 202, announced 12, in_planning 8,
consented 4, unknown 1; mappable 225; its `sha256sum` = `DCFSHA` in `01-data.js:19`; `node tools/offtakers/build.mjs --check`
(read first: `--check` returns before the only `writeFileSync`) printed `ok 202610292044: 71191 B … rebuilt byte for byte`,
exit 0, and the lightning `--check` likewise (63,707 B); `grep -n "203 sites" atlas/current.json` hits line 886 while
771-772 read `"features": 227, "drawn": 225`; `ACTIVE_WORKFLOWS` (`tools/scope/lib.mjs:42-69`) lists 9 and the directory
holds 9, archive 21; all six cartridges in `atlas/current.json` hash MATCH; `loop.mjs state --stdout` equals STATE.md;
authors Ventusltd 268, Claude 41, Vikram Kumar 2 over 311 commits; 44 `uses:` lines, 38 SHA-pinned; tests 30 + 203 + 8;
proofs 92 (17 browser); shift-log 41 runs (30 failed, 9 live); 21 of 21 lightning cartridges equal base + `\n` + module;
shell sha `87a3aaf4…c467` equals `sha256sums.txt:18`; `atlas/index.html` is byte-identical to the v2 loader payload.

## What this part of the estate is

GridAtlas is the live map at ventusltd.github.io/gridatlas. Its architecture has a name that is checked at load time,
`IMMUTABLE_SHELL_PLUS_HASHED_CARTRIDGES`: one HTML shell from August 2026 that never changes, a pointer file
`atlas/current.json` that names an ordered list of JavaScript cartridges by path and SHA-256, and a 124-line loader that
fetches each cartridge, hashes it in the browser, and runs it only if the digest matches. Behaviour changes by adding a
cartridge or moving the pointer, never by editing what has shipped. Every published route under `atlas/v/<generation>/`
keeps the loader bytes it was cut with, and `atlas/releases/` is a checksum-verified baseline.

The chapter's four slices are the four things that make a new overlay shippable inside that design. The data-centre
engine (W01) is a 167-line source file that becomes part of a 71,191-byte module, under a budget of 80,000 bytes the owner
raised for it. The cartridge tooling (W03) defines what a digest is (SHA-256 over LF bytes), cuts generations as six
never-overwritten files, and proves a refactor by byte parity. The release machinery (W02) turns an owner's GitHub comment
into a two-file commit that an agent cannot author on its own behalf, and that reverts byte for byte. The CI and QA layer
(W06) rebuilds the shipped bytes from source on every PR, checks the public site serves the committed blobs, and taps a
real data-centre dot in real Chromium at phone and desktop sizes. The live generation, 202610292044 (v9.187), is the
first where all four were exercised on one evening.

## The best lines, ranked

1. **The load-time hash gate.** KEY `atlas/index.html:81` (W03 F1).
   ```js
   invariant(await sha256Hex(bytes) === cartridge.sha256, `${id}: SHA-256 mismatch`);
   ```
   The whole architecture in one line: no served byte executes unless the browser's own digest equals the pointer's. A CDN,
   a cache or a half-pushed commit cannot run code that was not released. Lines 42-43 check the schema and architecture
   strings before anything is fetched; the failure screen says the shell was not changed. All six live cartridges MATCH today.

2. **The agent may not consent.** KEY `tools/release/flow-lib.mjs:49-52` and `tools/release/acceptance.mjs:59` (W02 F1, F1b).
   ```js
   export function runningAsAgent() {
     return Boolean(process.env.CLAUDECODE || process.env.CLAUDE_CODE_SESSION_ID || process.env.CODEX_SANDBOX
       || process.env.GITHUB_ACTIONS || process.env.CI);
   }
   ```
   ```js
   if (runningAsAgent()) die('refused: an agent or CI is running this. Only the owner records acceptance; run with --how and pass the command to the owner.');
   ```
   The party that benefits from a release cannot record its acceptance, and the refusal names the legitimate path. The
   reading side (`flow-lib.mjs:140`, W02 F2b) turns Claude's and Codex's own attribution strings into a blocklist on consent,
   and `parseVerdict` reads only the first non-blank line with an exact 12-digit generation. The live release commit carries
   `Authorised-by: owner (Ventusltd), <PR #75 comment URL>, 2026-10-29T23:34:44Z` (`git log -1 --format=%B cacb69a`).

3. **The whole 30/30/30 rule in one line.** KEY `tools/offtakers/src/06b-dc-engine.js:59` (W01 F2), constants at `01-data.js:4-7` (F1).
   ```js
   sets=c=>{c.k=(c.sc||[]).filter(e=>VK(e.kv,c.vb)).slice(0,N3);c.P=c.all?sites(c.all,{st:c.rst,te:'all'},N3).P:null;c.cv=c.cva?c.cva.slice(0,N3):null;
   ```
   Substations: the full 40 km scope filtered by voltage band, then 30 (so the 275 kV chip reaches past the "All" 30). REPD:
   the same register and grouping as the ordinary card's 15, now 30 with ties at the 30th kept. Conventional: the nearest 30 at
   any distance, lines drawn only within `R100`. `N3=30,R100=100` sit beside `R40=40,NR=15`: one number per rule.

4. **Unknown is null, not zero.** KEY `tools/offtakers/src/01-data.js:71-73` (W01 F6), card text at `06b-dc-engine.js:36` (F7).
   ```js
   DMW=p=>{let v=o=>o&&typeof o=='object'&&typeof o.value=='number'&&o.value>0&&o.value<=1e4?o.value:null;return{it:v(p.it_load_mw),gc:v(p.grid_connection_mw),un:v(p.unclassified_mw)??v(AI(p.mw_unclassified)&&p.mw_unclassified[0])}},
   DZ=w=>{let v=w.it??w.gc;return v==null?1:v>=200?2:v>=50?1.6:v>=10?1.25:1},
   ```
   IT load, grid connection and an unlabelled MW are three nullable numbers, never summed; the dot is sized by IT load else
   grid connection, never by the unlabelled figure. The card prints "Not stated is unknown, not zero." In the pinned file 221
   of 227 sites state neither figure (W01, jq), so this rule governs almost every dot.

5. **Reuse the incumbent, assert parity at run time.** KEY `tools/offtakers/src/06b-dc-engine.js:51-52` (W01 F3).
   ```js
   try{c.sc=GS.scope([x,y],subs,{bandsKm:[40],nearestCount:subs.length}).nearest; ...
   try{let o=M.nearestSubstations(x,y,subs);c.by=o.beyondRadiusNearest;if(o.some((a,i)=>!c.sc[i]||a.km!==c.sc[i].km||a.at!==c.sc[i].at))note('scope head differs from nearestSubstations')}
   ```
   The original five-substation measure (`LINK_COUNT = 5`, sld-sandbox:1664, re-read) still runs on every data-centre tap and
   must equal the head of the 30; disagreement is noted in production, not only in CI. The geodesy both paths share refuses
   even a 1e-15 km drift "because the claim being made is PARITY" (substation-intelligence-v9-63.js:1674-1679, W01 F4).

6. **The budget as an owner decision, enforced twice.** KEY `tools/scope/lib.mjs:114-119` (W01 F8, W03 F6).
   ```js
   export const CARTRIDGE_BYTE_BUDGETS = Object.freeze({
     'uk-lightning-overlay': 64_781,
     // Owner approval, 29 Oct 2026, issue #73: raise the potential-offtakers
     // module budget to 80,000 B for the data-centre 30/30/30 engine.
     'uk-offtakers-overlay': 80_000
   });
   ```
   `loop.mjs lint` (:196-198) fails any cartridge over its own entry; the generation proof (`offtakers-cartridge.mjs:45`)
   additionally requires its own `BUDGET`. The lightning figure is arithmetic, `500,000 - 435,218 - 1`
   (`make-generation.mjs:38`, W03 F8). Module at HEAD: 71,191 B, 8,809 B spare.

7. **Nothing is parsed before the hash matches.** KEY `tools/offtakers/src/01-data.js:58` (W01 F9).
   ```js
   .then(async b=>{let s=W.crypto&&W.crypto.subtle;if(!(b.byteLength<=cap))E('data check failed (size)');if(!s)E('data check failed (no WebCrypto)');if(hex(await s.digest('SHA-256',b))!==h)E('data check failed (SHA-256 differs from the pin)');return JSON.parse(new TextDecoder().decode(b))}),
   ```
   The 227-site file is fetched from an allow-listed same-site URL, aborted past a byte cap, refused on redirect, refused
   without WebCrypto, and refused unless it hashes to the pin compiled into the module. The cartridge law applied to data.

8. **Tested equals shipped.** KEY `tools/release/release-generation.mjs:154` (W02 F4).
   ```js
   if (rerootForPreview(derived) !== previewPointer) die(`${previewPointerRel} is not the derived pointer re-rooted to ../../; the preview that was tested is not what would go live`);
   ```
   The live pointer is a pure function of a committed manifest (six cut-only keys dropped, `lib.mjs:25-30`), and the
   preview route people tested must equal it byte for byte after re-rooting. W02 re-derived this for three real releases.
   A release touches exactly `atlas/current.json` and `STATE.md` (re-run: 2 files each for cacb69a, f0f449b, 08b5cae).

9. **A check that could not fail, made able to fail.** KEY `tools/scope/loop.mjs:238-249` (W02 F8).
   ```
   Demonstrated rather than argued: replace STATE.md with the single line
   "DELIBERATELY WRONG", run `state --stdout`, and the file comes back
   correct. A drifted STATE.md was repaired by the check that existed to
   detect it, and the operator saw a match every time.
   ```
   The archetype of the Kuiper law "a check that examined nothing refuses". Sequels: an unknown flag exits 1 (`loop.mjs:285-295`,
   F13); a crashed proof is a FAIL row (`tools/release/lib.mjs:143`, F12); `actions.length > 0` refuses vacuous green
   (`tools/overnight/202609012200-shift.mjs:317`, W06 F5).

10. **The public site must serve the committed blob.** KEY `tools/scope/verify-live-bytes.mjs:155` (W06 F2).
    ```js
    const match = live.status === 200 && got?.sha256 === want.sha256;
    ```
    Expected bytes come from `git show HEAD:<path>`, never the working tree (:39-48), so a CRLF checkout cannot decide what
    "committed" means. The workflow retries for 1,200 s against CDN lag and downgrades to a warning only when main has
    moved on (`verify-live.yml:359-373`, F3).

11. **225 of 227, in a real browser.** KEY `tools/ci/offtakers/browser-dc-smoke.mjs:67` (W06 F10).
    ```js
    assert.equal(n,225,'227 source records, of which two planning sites have unknown coordinates and must not be mapped');
    ```
    The assertion message encodes the refusal to invent a coordinate. Line 48 waits on `menuBar.inspect().complete===true`,
    not a timer (a whole commit for one line, 9975a7a0…, F8). Runs at 393x852 touch and 1280x800.

12. **Rebase, never squash, with the reason.** KEY `docs/RELEASE.md:211-213` (W02 F10).
    ```
    Merge with **Rebase and merge**, never squash. Squashing would fold any
    preparatory commit into the release commit, and the revert would then undo the
    gate raise too.
    ```
    Rollback is `git revert` of a commit that touched exactly the pointer files, refused if the pointer has moved since
    (`rollback-generation.mjs:91-101`, F7).

13. **A stamp is read from the clock.** KEY `tools/recompose.mjs:62-65` (W03 F11).
    ```
    must be within five minutes of UTC now: a stamp is a clock reading, and
    a reading the clock has not reached is not a reading. */
    ```
    The incident is in the clone: `a342de44033e177e85d4aae6c5ffedfbdd9989a3` is named 202609012250 and authored
    2026-09-01T19:51:51+01:00 (re-run), four hours before its name.

14. **Three outcome classes, never merged.** KEY `docs/CI-CD-PLAN.md:43-53` (W06 F1): FAIL, BLOCKED_HARNESS,
    BLOCKED_DEPENDENCY; "only the first is a bug in the code".

15. **Synchronous claim, deferred render.** KEY `tools/offtakers/src/06-tap-card.js:78` (W01 F10): `e.gridatlasClaim='offtakers'`
    is stamped on the shared map event at hit time, the card drawn on `setTimeout 0`, and the lightning overlay
    (`08-map.js:124`) returns on any claimed tap. A one-field lock between independently shipped cartridges.

## The patterns these lines share

- **Fail closed on bytes** (W03 F1, F2, F4; W01 F9, F14; W06 F2): SHA-256 before execute, before parse, before "live";
  one digest definition (LF bytes, `.gitattributes:32`), so browser, lint, git and the live check agree.
- **Budget as law** (W01 F8; W03 F6, F8; W02 F14, F15; W06 F6): a frozen table, an arithmetic derivation, an owner-dated
  raise in the message, a registry that must equal the directory (9 workflows, 21 archived).
- **Agent cannot consent; authorisation travels inside the artefact** (W02 F1-F3c).
- **A check must be able to fail** (W02 F8, F12, F13; W06 F5, F15, F17, F18, F19): the `--stdout` repair, the crashed
  proof, the unknown flag, the empty CI list, the gate that never woke, the skip detector, negative controls, 17 of 18 mutants.
- **Unknown is null, not zero** (W01 F6, F7, F11, F12, F13; W03 F15): nullable MW, explicit `un` status, unplaced records
  counted not geocoded, the OSGB (0,0) sentinel dropped.
- **Reproducible build; source is the artefact** (W01 F14; W03 F9, F10): `--check` reports the first differing byte.
- **Append-only everything** (W03 F5, F7, F13, F16; W02 F11, F16): `wx` writes, six-file generations, rollback as a forward
  cut, audit instead of delete, loader bytes frozen per generation.
- **Parity over close enough** (W01 F3, F4; W03 F14): the incumbent still runs and must agree; a refactor is accepted only
  by byte equality.

## History (keyed by SHA; dates as authored)

Cadence over the 311 reachable commits (shallow clone): a storm 2026-09-01 to 09-08 (63, 43, 34, 15, 22, 2, 16, 16 per
day), near silence to 10-23, then 10-27 (7), 10-28 (15), 10-29 (61). No reverts in the CI or release paths; storms are fixed forward.

- `32bc3bbe60e16b1d93c07e809a0f0e4527929547` 2026-09-01T19:00:45+01:00: the staged, exclusive assembler pair (W03 F5).
- `a342de44033e177e85d4aae6c5ffedfbdd9989a3` 2026-09-01T19:51:51+01:00: the stamp typed ahead of the clock;
  `1b1740d5e051a52c487f1ad776e7aae53b6579b3` 2026-09-01T22:48:45+01:00 reads it from the clock (W03 F11).
- `4b1641e` 2026-09-03T02:40:54+01:00: `state --stdout` renders without writing, so the handover check can fail (W02 F8).
- The hardening storm, 2026-09-03 04:16-04:27+01:00 (6 commits in 20 minutes, W06): `1762170b3274559a1c880150a1a93df5d346210d`
  rollback refuses what it cannot verify; `5556000c46e188b88dd9551b233b1bb8333fc88e` dead schedules removed;
  `a9f2f76f4595c44a37e9a46d3b66e3736334e924` actions pinned by commit. Same day 14:21:
  `fe4e272f28ecf05024096059697f09e0ea72aaae` "a file the gate asserts must be a file that wakes the gate".
- `efb844b9bba70edd42671aa56a9877709d7526c3` 2026-09-29T08:34:05+01:00: PR file-size guard and the cartridge audit instead of deletion.
- The hand release and rollback: `cd9a27efed8a9c005d87cdcfe9f363ed7e80d6ad` 2026-10-23T00:20:12+01:00 moved the pointer
  by hand (5 files); `1eb641488224a3558a888815c6f5bbe12ddb9084` 2026-10-23T01:15:26+01:00 restored it (1 file) and
  `c09d199` six seconds later fixed STATE.md alone. Re-run: at 1eb6414 the pointer read 202609241334 and STATE.md still
  202610221600. This is the world the scripted flow ends.
- Ceiling raises as their own commits: `2f7d752` 2026-10-27T02:39:16+00:00 (460 to 480 kB), `edb17db` 2026-10-28T21:06:04+00:00 (480 to 500 kB).
- 2026-10-28: `08b5caeac1b0128311d7a5e985f1fbe1c18414ae` 17:34:02Z v9.172, the hand release the scripts were rebuilt from;
  `97929ba7674fc3b9496eb835e2e1329ad99e0049` 20:57:15Z live bytes after every push; `94c5c7c5e32dde954ae5e0cff7a77f35f79c4619`
  21:02:41Z the PR gate; `5a0d924` 21:02:19Z scripted release and rollback; `39c62b458eec5e75dc7e351b5c46d3640cb3773f`
  23:09:53Z mutants 1/18 to 17/18.
- 2026-10-29 morning: `38f8405c1d8582936ac5afb92ccfca9835a2cc04` 02:37:43Z loader v2; `3ec1e6bc3168d06f440cbfaab170c595a87ec795`
  02:43:21Z readable lightning source, byte-exact build; `1adbd24` 02:55:21Z the delivery flow end to end;
  `c1059598d928cf4dd164898e9f87774e661ac0ce` 09:22:44Z loader first, then the pointer; `61fee61` 10:41:50Z refuse a one-step
  v1 to v2 release; `f0f449b4c61cc4c3865de969a46d39cad1dc052d` 11:21:45Z v9.186, the first live modular composition.
- The data-centre evening, 20:40 to 23:41Z (25 commits; 23 Ventusltd, 2 Claude): `4fa72ae0927f335fd1265e93b28992315cdb55a3`
  20:40:02Z the only commit to `06b-dc-engine.js`; `2f807295c6ff0a0ebf148a74312f9befc499d805` 20:44:37Z the preview, module
  hash `5a7018f1…`, pinned to the 203-site file (re-run via `git show`); `465d247447d0f2c6a9830b0564a47b610f0997da` 21:20:09Z
  the owner approves 80 kB; `d3f4eb106abc6f360b34ed54b606d75007031c85` 21:37:34Z vendors the 227-site pipeline, `5cf426a`
  re-pins, `9ac70db` rebuilds the module in place, `57ed074` 21:43:25Z removes the 203-site file; the Chromium storm
  21:42-21:55Z, 7 commits in 13 minutes (`95ae6d4d7c334e01f000fbd248bbfecd8457e132` … `79eb77fa1a00d4efff5857e9643c16f5445d6326`);
  `cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e` 23:41:04Z (committed 23:53:53Z) the release, 2 files, authorised by a
  GitHub acceptance comment URL. Preview to release: 2 h 56 min.

## Gridatlas and datacentre relevance

This is where the data-grid-gb `datacentres/` lanes meet the live map. The 227-site pipeline arrives as one SHA-pinned
file (W01 F9); the engine refuses and counts anything without a UK point, an id, an open licence or a string status
(F11), so 225 are drawn and the two `in_planning` records with null coordinates stay unmapped, asserted in node (DC1) and
in Chromium (W06 F10). The producer's caveat "unknown MW is null, not zero" reaches the browser unchanged (F6, F7) and
the CSV (F15). The overlay ships as an `after-cartridge` entry under loader v2 (`atlas/current.json:717-726`), inside the
80,000-byte budget, through preview, owner acceptance, two-file release, live-bytes check and a one-command rollback
named in its own commit body. The lightning split (W03 F14) is what made room: without its own slot the offtakers module
could not have been added under the 500 kB ceiling.

## Defects and drift (candidates for the owner, not claims)

1. CONFIRMED. `atlas/current.json:886` (`composition_note`) says "203 sites from the open UK data-centre pipeline" while
   `:771-772` say `"features": 227, "drawn": 225`; the 203-site file was removed by `57ed074` after the note was written. (W01 F18)
2. CONFIRMED. `tools/offtakers/src/01-data.js:7` declares `DL=5` ("labels … for the nearest DL of each set"); `grep -o -w DL`
   on the shipped module counts 1, the declaration only. The comment describes a rule the code does not implement. (W01 F18)
3. CONFIRMED. Two Earth radii in one shipped module: `6371.0088` appears once in `202610292044-uk-offtakers-overlay.js`
   (`01-data.js:62`, the ordinary card's proximity counts) while the 30-lists go through the geodesy at `6378.137`
   (substation-intelligence-v9-63.js:1659). About 0.11 %; no 30-list affected. (W01 F16)
4. CONFIRMED. Generation name 202610292044 carried two module hashes in history (`5a7018f1…` at `2f80729`, `e4d3fb28…` at
   HEAD) and two pinned data files (`…2014` then `…2136`); the release commit calls the result the "accepted immutable
   preview". The generation is immutable from acceptance onward, not from its first cut. (W01 History)
5. CONFIRMED. The release commit's trailer is spelled `Authorised-by:` and its body says "CI must independently validate
   all release gates", unlike the script's `Authorised by:` (`release-generation.mjs:344`); it reads as composed outside
   `release-generation.mjs`. Whether the gates ran for it: UNVERIFIED from the clone. The pointer itself re-derives
   byte-exact from the manifest (W02 F4). (W02 Candidates)
6. CONFIRMED. 6 of 44 `uses:` lines are mutable tags, against the pinning doctrine of `cartridge-proof.yml:29-35`:
   `offshore-coordinate-reconcile.yml:46,54,60,65,114` and the PR #75 smoke's `pr-file-size-guard.yml:181`. (W06 F16)
7. CONFIRMED in-repo, UNVERIFIED in settings. `pr-file-size-guard.yml:3-7` and `docs/CI.md:185-187` state that every other
   active workflow, `cartridge-proof.yml` included, is disabled in the repository settings; the Chromium data-centre smoke is
   gated `if: github.event.pull_request.number == 75` (`:158`). After PR #75, no active workflow runs a real browser on the
   overlay unless that setting changes. (W06 F16, Candidates)
8. CONFIRMED. `docs/LIGHTNING-SOURCE.md:37-39,48` still name M5/M5b and M6/M6b; `tools/lightning/generations.json` lists one
   generation, M6u. Documentation lags the registry. (W03 Candidates)
9. CONFIRMED. `tools/release/split-lightning-cartridge.mjs:131-134` writes with plain `writeFileSync`, not `wx`, unlike
   `build-cartridge.mjs` and `make-generation.mjs`. (W03 Candidates)
10. CONFIRMED. Test DC5 (`overlay-offtakers.test.mjs:461`) asserts the formula-prefix guard on column 2 only and for four of
    the six characters `cq()` neutralises; TAB and CR are guarded in source, not asserted. (W06 F11)
11. PLAUSIBLE. `make-generation.mjs` cuts the monolithic shape while the live pointer is modular; a new lightning generation
    appears to need the split tool afterwards. Not re-run. (W03 Candidates)
12. PLAUSIBLE. `runningAsAgent()` is environment-variable detection; an agent that unsets those variables and posts without a
    signature would not be caught technically. The code comments acknowledge this. (W02 Candidates)
13. PLAUSIBLE. Exactly 0 MW or above 10,000 MW renders as "not stated" through `DMW`; W01's jq found no such value. (W01 Candidates)
14. Note. W06 gives HEAD as 2026-10-29T23:53:53Z (committer date), W01-W03 as 23:41:04Z (author date). Both are correct.

## What the new Kuiper edition should carry from this chapter

The ranked lines 1 to 14 above, in that order, as belt lines, plus `.gitattributes:32` (one byte truth) and
`make-generation.mjs:38` (a derived budget). As a warning page: defect 1, the "203 sites" note beside "227 / 225" in the
same live pointer, because it is a keyed record contradicting a keyed record.

## One next command

```bash
cd /home/user/estate/gridatlas && OFFTAKERS_MODULE=atlas/modules/202610292044-uk-offtakers-overlay.js LIGHTNING_MODULE=$PWD/atlas/modules/202610291043-uk-lightning-overlay.js node --test --test-name-pattern='^DC' tools/ci/offtakers/overlay-offtakers.test.mjs
```

It runs the eleven data-centre tests (DC1-DC11) against the shipped module, read only, in under a minute, and is the
fastest way for a reader to see 30/30/30, 225 of 227, and "never added together" asserted rather than described.
