# C5 The shepherd, the wafer, the engines and the denominator

Controller C5 (Claude Fable 5.1), Kuiper edition 202610311905. Written 2026-10-31T19:45:00Z after re-resolving every key of W17, W18, W19 and W20 against the local clones. Clones were read only; `git status --porcelain` is empty in every clone I ran a verifier in (one untracked `editions/` folder appeared in the kuiper-belt clone at 2026-10-31T19:37:30Z, written by the harness for this edition, not by a worker or by me). Verification script: `/tmp/c5/verify_keys.py`; every KEY line was parsed, the commit confirmed reachable, the file extracted with `git show <sha>:<path>`, and the first quoted line searched inside the cited range.

**Keys verified 93 of 93.** W17 26 of 26, W18 20 of 20, W19 30 of 30, W20 17 of 17; all CONFIRMED, none SHIFTED, none UNVERIFIED. Seventy findings, one row each in `chapters/C5-register.tsv`. pipelinenews keys are pinned to 67aa2eb05993c630887b41c3b720ba42a86669a4 (the inventory HEAD) and resolved with `git show`, since the live HEAD moved while the swarm ran.

## What this part of the estate is

Seen from the Kuiper, the rest of the estate is three bodies and a measuring rod. The first body is **globalgrid2050**, the shepherd: the custom-domain repository that publishes everything and decides nothing. It holds 47,277 tracked paths and 5,551,614,239 bytes, but only 17,103 distinct blobs totalling 2,151,644,971 bytes, and 92.9 percent of those distinct bytes are data or binary (13,464 blobs, 1,998,754,248 bytes; code is 2,802 blobs and 72 MB). It carries the hash-pinned homepage importer that gridatlas's release step 6 depends on, the sharded estate counter whose refusal line became Kuiper law 4, the sixteen immutable Kuiper grid generations, the wafer development environment (sixty dated versions, in globalgrid2050 and not in testcode, as W18 established), and a deploy workflow whose own comments say THIS LIST IS THE BUG.

The second body is the **wafer and its drawing engines**: the translator in `202609190330-cable-cross-sections/pilot.mjs` that draws thirteen real systems from typed commands on the same dust, the pulse that moves a conserved budget of 245,170 points by measured copy count, the particle engine that proves the integer golden angle across machines, and the frozen galaxy substrate copied byte-identically six times. The third body is the **grid engines**: E1 to E5 as specified in gridmachine1's datasheets, E1 and E4 living inside gridatlas cartridges, sealed on 2026-09-07 by five sha256 hashes, certified by ventus-grid-engine's 22 proofs, and now extended by the 30/30/30 data-centre engine of v9.187. The measuring rod is W20's **denominator**: 72,475 tracked paths across 26 clones, 30,895 distinct blobs, 1,842 of them in more than one repository, 3,324 commits of which 1,156 (34.8 percent) are automation, and two honest line counts, 47,227,007 per path and about 25.07 million per distinct blob.

## The best lines, ranked

1. **The NaN-safe verdict.** globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f kuiper-grid/i0097/cartridges/009700000000-kuiper-programs.js:3991-4001 (W17 F2).
   ```js
   var over_volts  = !(v <= V_CEIL);                               /* equipment rating */
   ```
   `NaN > limit` is false and passes; `!(NaN <= limit)` is true and names it. The commit bdfc217e counted 8,000,132 checks and 0 disagreements on finite values (I re-read the message). It is the second lock on a door the input guard (F10) already locks, and it guards a legal limit.

2. **Silence that carries its distance.** gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/202609241334-sld-sandbox-v9-8.js:1665 and :3538 (W19 F1).
   ```js
   const MAX_LINK_KM = 40;            // beyond this, silence is more honest
   result.beyondRadiusNearest = result.length ? null : beyond;
   ```
   E1 draws at most five within 40 km but measures everything, so "no grid data" and "further than 40 km" never share a null.

3. **Pin, verify all, then write.** globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f scripts/import_homepage_owner.py:22-23 (W17 F1).
   ```python
   if len(data) > 1000000 or hashlib.sha256(data).hexdigest() != digest:
       raise ValueError(f'Homepage size/hash mismatch: {name}')
   ```
   Owner, commit, file set, per-file hash and a 1 MB budget, and nothing written until all seven pass. This is gridatlas RELEASE.md step 6 as it runs.

4. **The pulse law.** globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f testcode/wafer-development-environment/202609190330-cable-cross-sections/pilot.mjs:402 with :373 (W18 F1).
   ```js
   const v = 1 + PULSE.GAIN * f * Math.exp(-d[q] / PULSE.LAMBDA) * w[q];
   ```
   `s = 1 + 14·f·g·copies`: a Gaussian front, exponential decay, the measured copy count, and a cumulative hand-out whose last body is forced to M so the total never drifts.

5. **The class selects the question, never whether.** gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 CABLE-ENGINES.md:32, then gridatlas sld-sandbox-v9-8.js:6170-6178 (W19 F4).
   ```md
   > **A cable engine selects the question. It never decides whether a question is answered.**
   ```
   Every branch of `classifyEngine`, including both catch blocks, returns an engine. The sentence is in 32 cartridge files (recounted).

6. **An agent cannot forge acceptance.** gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/release/acceptance.mjs:24-27 (W20 F1).
   ```js
    * no agent and no script posts an ACCEPT line or the label. --record refuses
    * to run under Claude Code, Codex or CI, and needs --i-am-the-owner.
   ```

7. **The origin of law 4.** globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f .github/workflows/count-lines.yml:78 (W17 F3).
   ```powershell
   if ($files.Count -eq 0) { throw 'no shard results: a check that examines nothing refuses' }
   ```

8. **The spec was wrong, and the code says so.** kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/estate.py:162-163 (W18 F4).
   ```python
   # would draw in the +x/+y quadrant at half scale. SPEC.md said "unit square"; SPEC.md
   # was inferred from prose rather than measured, and was wrong.
   ```

9. **An empty result needs evidence.** ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f engine/compute-observer.js:68-70 (W19 F7).
   ```js
   if (result.search_completed !== true || !Number.isInteger(result.scanned_count) || result.scanned_count < 0) {
     throw new Error('Empty result lacks completed-search and scanned-count evidence');
   ```

10. **Two keyed sources must agree.** globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f …/202609190330-cable-cross-sections/app.mjs:615-617 (W18 F7). The neighbour lines of a code card are shown only when line N of the file at the recorded commit equals the LINES.md row; otherwise it refuses in words.

11. **THIS LIST IS THE BUG.** globalgrid2050@c66759f0d7ac3489df9158da6eaa1330a37c069f .github/workflows/deploy-pages.yml:41-44 (W17 F4). A failure ledger kept in the configuration file: seven silent non-deploys, root cause named, fix proposed and deferred for a stated reason. Recounted: 42 push paths, `systems/**` listed with 0 tracked files.

12. **Three numbers, never conflated.** kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/count_lines.py:8-16 (W20 F12). head, history, authored; distinct blobs only.

13. **The data-centre engine is built on E1, not beside it.** gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:2-3 (W19 F13). It cites `:1664` and `:3513` of the sealed sld-sandbox; I confirmed both lines are `LINK_COUNT = 5` and `function nearestSubstations(`.

14. **The whole-number golden angle.** particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530 tools/particles.py:20 (W18 F11). `C32 = 2654435769`, and the measured cost of the five-decimal constant: 0.81 rad off at key 250,174.

15. **A harness that cannot pass its control has no standing.** gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 202609071322-linux-handover/rig-kit/validity.mjs:47 (W19 F8).

## The patterns these lines share

- **Refuse, do not pass; and say how much you examined.** Lines 7, 9, 15; W17 F5 and F16; W18 F2 and F19 (`Ran 4 of 9 tests`, exit 3 when nothing ran); W20 F11. The three-state verdict PASS / FAIL / NOT EXAMINED is the estate's most consistent idiom.
- **Hash everything that moves, then verify before writing.** Lines 3 and 12; W17 F11 and F14 (`* text=auto eol=lf` because every digest is taken over blob bytes); W19 F3 and F12; W20 F4, F5, F6. Receipts are exactly `{path, sha256}`.
- **Identity is stored, position is computed, joins are on the key.** W17 F6, F7, F9; W18 F3, F5, F6, F16 ("A layer may not invent a key"). The pulse check proves the fourth element cannot move a dot.
- **Enumerated legitimate silence.** Lines 2 and 5; W19 F5 and F6 (`reason: reason || (answered ? null : 'UNSTATED')`).
- **The allow-list is the bug.** Line 11 and W17 F16: two independent allow-lists failed seven and six times; a gate that prints PASS on an empty surface is the vacuous green that law 4 forbids.
- **Measured contract over prose contract.** Line 8; W18 F3 (the object form `{id,x,y,m,class,open}` has no renderer; the wafer reads `[x, y, sha, copies]`); W19 F10.
- **Conserved budget.** Line 4; W18 F13 (fault current as edge weight multiplying length share).

## History, keyed by SHA

The shepherd's window is 304 commits from acd2f242 (2026-09-16T04:31:08+01:00, shallow root) to c66759f0 (2026-10-29T11:30:11+00:00): 281 in September, 23 in October, 48 percent between 00:00 and 04:59 local, 186 of 304 carrying a `Co-Authored-By: Claude` trailer (recounted per commit). Turning points: f8bd6c6f (2026-09-18T03:19:11+01:00) the translator is born; c002bc32 (2026-09-19T04:12:02+01:00) the estate is counted by twelve content-sharded runners and the total refuses an incomplete set; f3f29b20 (2026-09-19T01:17:05+01:00) the unit square is corrected and the spec called wrong (I re-read the message); 242bcdf4 (01:48:06) a mislabelled "homepage" commit that actually adds the pulse law; f69ff823 (18:54:29) retires the early Kuiper page, whose engine is byte-identical to the live one except pilot.mjs; 05bdbea3 (2026-09-20T20:48:37+01:00) the storm, 923 files and 1,252,788 lines of whole-generation copies into kuiper-grid/; bdfc217e (2026-09-21T12:27:20+01:00) the NaN flip; d1023fe4 and 7002e9cd three minutes apart (2026-09-21T11:36 and 11:39) the sparse-workspace gate and the fifth allow-list fix; 4a6213fa (2026-09-25T01:30:46+01:00) the homepage moves to an owner repository behind a pin; 11f7e2ed then d12ef822 (2026-09-26) a 624,552-line release reverted 76 minutes later; 1da4dafd (2026-09-29T08:31:22+01:00) the 5 MB file guard and the LF rule; 331db25f (2026-10-29T11:29:12Z) the latest pin, GridAtlas v9.186.

The engines' line: 32459230 (2026-08-29T13:06:15+01:00) the immutable V9 data plane, 85 hashed files, still 85 of 85 OK; df4da109 (2026-08-31) grid-distance-maths fixes the termination bound that was wrong in 657 of 6,000 layouts; 3589facf (2026-09-04) ventus-grid-engine v0.1.0; 7d403652 (2026-09-06T03:32:32+01:00) a confessed storm, "I hid the evidence" with `>/dev/null 2>&1`; c4a39f87 (2026-09-07T00:58:49+01:00) v9.140 adds the substation-intelligence cartridge the capsule seals 21 hours later; cb384854 (sealed_utc 2026-09-07T21:43:04Z) the capsule, in a folder stamped 23:00:00Z, 1 h 17 m in its own future; b821c7ec (2026-09-08T00:38:01+01:00) v9.148 moves the rule from document to code; 4fa72ae0 (2026-10-29T20:40:02Z) data centres become a class on E1; cacb69a7 (2026-10-29T23:53:53Z) v9.187 accepted. gridmachine1 is a ten-hour repository (83 commits, 2026-09-07T14:20:46 to 2026-09-08T00:21:40+01:00). galaxies-wafers is 161 commits on one day. The particle engine's 300-commit window is entirely results commits (145 Ventusltd, 155 particles-nightly); its authored code predates the shallow boundary. Across the estate, 3,324 commits: Ventusltd 2,060, github-actions[bot] 621, time-stone 206, particles-nightly 155, kuiper-engine 146, Claude 86; bot-named identities 647 (19.5 percent), automation 1,156 (34.8 percent). All recounted.

## Gridatlas and datacentre relevance

Steps 6 and 8 of gridatlas RELEASE.md run through globalgrid2050's pin and importer; every Pages build re-verifies seven hashes before the GridAtlas row on the homepage changes. The sparse-workspace lesson (W17 F5) is the reason RELEASE.md insists on a separate `--no-cone /catalogue/` worktree. The engines are gridatlas cartridges: the live `atlas/current.json` (generation 202610292044) still loads the sealed `202609062358-substation-intelligence-v9-63.js` at line 572, and the E1 and E4 function bodies in the live sld-sandbox hash identically to the sealed ones. The data-centre engine of v9.187 does not fork E1; it calls the same scope with count 30 and radius 40 km and asserts that E1's five head its thirty. The early datacentre fetcher in the shepherd (W17 F17) is the before picture: 240 points, no provenance, a retry loop that parses a 429 body after three failures (I read the loop: `for attempt in range(3)`, `break` only on 200, `continue` on 429, then `osm_data = response.json()` unconditionally). data-centres-gb and the data-grid-gb lanes replaced exactly that. The wafer's `networkTargets` already reads GridAtlas GeoJSON through tools/networks.py; a `draw datacentres` is one cartridge away.

## Defects and drift

Each is a candidate for the owner, not a claim.

1. **Committed homepage bundle differs from the pin, 4 of 7 files.** CONFIRMED and extended. W17 reported `homepage-shell/data/homepage.json` (sha256 49364588… against pinned 1fd7ad98…). Hashing all seven: root `index.html` e97c964e… vs 86c99ac8…, `assets/versioned-homepage.css` 913f775f… vs 0c405224…, `data/homepage.json` and `data/entity-types.json` (d6c4dc3a… vs f59aadef…) differ; the JS, active-pages and presentation files match. The committed homepage.json names gridatlas `operative_release_id` 202609241334 (V9.156) and 14 promotions; last written 6779aa92 (2026-10-04T17:25:17+01:00), pin from 331db25f (2026-10-29T11:29:12Z). AGENTS.md says these copies are generated at deploy, so the served site is probably right; the clone misleads.
2. **The domain pin is one generation behind the live map.** CONFIRMED: pin message says v9.186 (202610291044); gridatlas current.json says generation 202610292044.
3. **kuiper-belt still states the unit square and `draw estate`.** CONFIRMED: README.md:117 and tools/estate.py:14 say unit square; estate.py:159-163 says that was wrong; README.md:121 names `draw estate`, and NETWORKS in pilot.mjs:283 has 13 keys and no `estate`.
4. **Two `kuiper-network.json` files carry different counts.** CONFIRMED: globalgrid2050's shipped file says 19,257 bodies, 2,152 duplicated, 17,105 unique, run 20260919T001154Z; kuiper-belt's says 19,441, 2,154, 17,287 with no run stamp. Neither definition of "duplicated" has a writer in the kuiper-belt tree (W20); today's estate gives 1,842 (in more than one repo) or 4,219 (at more than one path).
5. **ventus-grid-engine README undercounts its proofs.** CONFIRMED: README.md:162 says 3 proofs, 69 checks; `node verify.mjs` from /tmp printed `verify PASS — 22 proofs, 561 checks`.
6. **Dangling reference.** CONFIRMED: engine/v9-nearest-search.js:71 points to `./nearest-search-spatial-index.mjs`; `git ls-files | grep spatial` is empty.
7. **Deep-link contract drift.** CONFIRMED for the fossil: pipelinenews ui/atlas-v9-deep-links.js targets `/gridatlas/202608300453-atlas-v9/`, and gridatlas has 0 tracked files under that root path (23 under `atlas/releases/202608300453-atlas-v9/`). PLAUSIBLE for the parameter count (contract.js PARAMS has five, both live emitters send seven; keys verified, not executed).
8. **The deploy allow-list.** CONFIRMED: 42 push paths, `systems/**` listed with 0 tracked files; seven recorded non-deploys in the comments.
9. **kuiper-belt NEXT.md's "17,300 blobs, 5.7 GB, mean 329 kB".** CONFIRMED as a mixed denominator: at HEAD 17,103 distinct blobs and 2,151,644,971 bytes; 5,551,614,239 bytes over 47,277 paths; 329 kB divides all-path bytes by distinct blobs. The conclusion (dominated by republished data) holds at 92.9 percent.
10. **proof/inventory.tsv text_lines is not reproducible for globalgrid2050.** CONFIRMED: from a per-file table of all 47,277 paths, no allowlist of up to seven of nineteen common extensions, no size cap from 1 to 100 MB and no single top-directory exclusion yields 18,385,284 (nearest misses are 140 to 154 lines, coincidence). For six small clones W20's per-path recount reproduces exactly (grid-distance-maths 2,425, gridmachine1 4,371, stars 104,533 text or 510,276 with the binary-flagged LINES.md, kuiper-belt 128,787, cvaa 8,845, data-centres-gb 5,286).
11. **Snapshot constants.** CONFIRMED: kuiper-pulse.check.mjs:36 hard-codes M = 245,170 from the 250,174-line pack; stars LINES.md:3 now says 405,737 unique lines, generated 2026-10-31T18:45:48.670Z.
12. **Radius drift.** CONFIRMED by key: energy-transition-simulator connect-here.js:49 ranks on R_MEAN 6371008.8; the live sld-sandbox:1561 says Haversine on R = 6378.137. Ranking is radius-invariant; any displayed distance would differ by about 0.11 percent.
13. **Capsule folder stamped after its seal.** CONFIRMED: sealed_utc 2026-09-07T21:43:04.374Z, folder 20260907T230000Z. The README's table calls the second part place-global-search; CAPSULE.json's id is uk-gazetteer-flyto at the place-global-search path, same hash.
14. **Point size versus "not size".** PLAUSIBLE: app.mjs:133 scales point size by line length; pilot.mjs:353 says nothing per point may change, not size. The pilot rule may bind commands only.
15. **Particle nightly cadence** (2 to 5 commits a day against a cron of 8) and **B1 particles_per_layer 65536 vs 262144**: UNVERIFIED (W18 candidates, not re-run).

## Settlements the harness asked for

- **Capsule hashes.** 5 of 5 match the live gridatlas bytes at the paths CAPSULE.json names: 202609041945-streaming-parquet-bridge-v9-5.js 4a6b594f… (13,316 B), 202609071213-place-global-search-v9-5.js 15f324e5… (41,120 B), 202609071232-sld-sandbox-v9-8.js 8916fa66… (382,999 B), 202609062358-substation-intelligence-v9-63.js d94b0de5… (451,935 B), atlas/v/202609071232/current.json 42a8fa39… (47,496 B). E1 and E4 bodies: sealed and live hash 3f0834e2… and 0b97bc7a…, identical. (My first attempt used the README's generation prefix for two paths and found nothing; the paths in CAPSULE.json are the ones to use.)
- **Pulse check.** The script only reads (`readFileSync`, `readdirSync`; no writes). Run from /tmp at 2026-10-31T19:25:38Z: 26 PASS, one `REFUSE … NOT EXAMINED`, exit 0; with kuiper-belt's estate-bodies.json: `19257 of 19257`, all checks passed. Matches W18.
- **Duplicates.** Recount over `git ls-files -s` of all 26 clones (pipelinenews via `ls-tree` at 67aa2eb): 72,475 paths, 30,895 distinct blobs, 1,842 in more than one repository, 4,219 at more than one path. Matches proof/duplicates.tsv.
- **Homepage.** Confirmed and widened to 4 of 7 (defect 1).
- **Which denominator.** The edition should publish the **distinct-blob text-line count** as its denominator, 25,071,989, with the per-path figure 47,227,007 beside it and labelled "per path". Reasons: it is the Kuiper's own definition (tools/count_lines.py "head": NUL in the first 8,000 bytes is binary, distinct blobs count once, as the belt counts bodies); it is within 1.0 percent of the Kuiper's 2026-09-19 figure, so the two editions are comparable; and it is immune to the snapshot copies (89 to 117 copies of one file) that make the per-path number nearly double. The inventory's 28,754,050 should not be published: it is reproducible for small clones only, counts a binary-flagged 40 MB file in stars, and no rule I could find produces its globalgrid2050 figure.

My recount (`/tmp/c5/distinct_wt.py`, 2026-10-31T19:44:38Z, first-seen blob per `git ls-tree -r` over the 26 clean working trees, NUL in the first 8,000 bytes as binary) gives 72,475 paths, 30,895 distinct blobs, 28,322 text and 2,573 binary, **25,071,989 distinct text lines**: identical to W20, so CONFIRMED.

## What the new Kuiper edition should carry from this chapter

On the belt, in this order: the NaN flip (W17 F2); `MAX_LINK_KM = 40 // beyond this, silence is more honest` with `beyondRadiusNearest` (W19 F1); the importer's hash-and-budget line (W17 F1); the pulse law line and its sentence "the light moves, it is never created" (W18 F1); "A cable engine selects the question" (W19 F4); the ACCEPT gate (W20 F1); `a check that examines nothing refuses` (W17 F3); "inferred from prose rather than measured, and was wrong" (W18 F4); the empty-result evidence throw (W19 F7); "Two keyed sources have to say the same thing" (W18 F7); THIS LIST IS THE BUG (W17 F4); count_lines.py's three numbers (W20 F12); the DC engine's head-of-list assertion (W19 F13); `C32 = 2654435769` (W18 F11); "A harness that cannot pass a known-good case has no standing to fail a candidate" (W19 F8); "A layer may not invent a key" (W18 F16); and data-centres-gb's six-line producer (W20 F3). All seventy rows in the register are CONFIRMED and eligible.

## One next command

```
mkdir -p /tmp/c5-cl && cd /tmp/c5-cl && python3 -I /home/user/estate/kuiper-belt/tools/count_lines.py --roots /home/user/estate --depth head --out /tmp/c5-cl/data
```

It reruns the Kuiper's own counter on today's estate, from outside every clone (count_lines.py writes `proof/` relative to the current directory), so the published denominator is produced by the tool that defines it. Add pipelinenews as a root to make it 26 repositories.
