# C4 Kuiper editions, the mathematics they ship, and the receipts that guard them

Controller C4 (Claude Fable 5.1), Kuiper edition 202610311905, written 2026-10-31T20:10:00Z. Workers reviewed: W13 (editions anatomy), W14 (mathematics), W15 (watchers, receipts, proofs), W16 (pipelinenews). Clones read only; every clone's `git status --short` was empty after this review. Principal keys: `kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6`, `maths@b898a5ee39aa81a45197c5f17ba1195727aa538e`, `particle-physics-drawing-engine@eb52ad7ebab151d49fb7cfde56523f5962129530`, `time-stone@a1703b1bb0170ed0f0c162126315049fa157d3bf`, `cvaa@877bf380202b6a922932afc0bdcfd7f42a183086`, `pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4` (the project tip before this swarm's commits; nothing outside `kuiper-edition/` changed since, so every pipelinenews line is byte-identical at HEAD). The full 40-character key of every finding is in `chapters/C4-register.tsv`.

**Keys verified: W13 17 of 17, W14 28 of 28, W15 19 of 19, W16 24 of 24; overall 88 of 88, all CONFIRMED (none SHIFTED, none UNVERIFIED).** Method: a python3 -I script parses every `KEY:` line, checks `git cat-file -e <sha>^{commit}`, then searches `git show <sha>:<path>` for the first quoted line inside the cited range, then within ±3 lines. One register row per finding (68 rows).

## What this part of the estate is

A Kuiper edition is a dated folder. `learn-the-kuiper/<YYYYMMDDHHMM>/` and `see-through/<YYYYMMDDHHMM>/` in kuiper-belt hold nine and three editions, plus one `astra-codex` variant; each is a standalone web app that opens from `file://`, carries its own `NOTICE.md`, and ships one frozen copy of the placement law, `kuiper-law.js`. The stable public link is a 14-line `index.html` whose only job is to name the newest stamp in three places. Nothing scans folders; moving the pointer is the release act, and from commit 77258c4 on it has moved in the same commit as the new folder. Earlier folders are kept as history, with one documented sweep (55db60c) that edited every folder for hygiene and deleted the fidelity receipts. Edition 202610311905 is expected to obey the same shape: new folder, byte-identical law, NOTICE, pointer moved once, nothing earlier touched.

The mathematics an edition ships is a single line. The live wafer at `kuiper-belt index.html:250` computes `m = Math.imul((k % 2^32) >>> 0, 2654435769) >>> 0`, `theta = 2 pi m / 2^32`, `r = sqrt(k + 0.5)`: an exact 32-bit integer angle (the Knuth multiplier, floor(2^32/phi), hex 9E3779B9) turning +222.492236 degrees per key, and a radius with a half-key offset. Around it sit the estate's other spirals (the float golden angle +137.507764 degrees in `tools/estate.py`, grid-distance-maths, worlds-, galaxies-wafers), the exact integer square root used to judge them, and the limits of the 32-bit law at deployed scale. The third strand is the receipt and ledger discipline that lets any of this be checked later: append-only files, hash-locked registries, guards that hash names instead of spelling them, checks that refuse when they examined nothing. pipelinenews, the pipeline that feeds the Atlas, is where those patterns meet a production release flow, with its own storms and one exact revert.

## The best lines, ranked

1. **The law as it runs.** `kuiper-belt@b243e38d index.html:250-251` (W14 F1; the same two lines lifted verbatim at `learn-the-kuiper/202610050609/kuiper-law.js:39-40`, W13 F1, W14 F8).
   ```js
   function keyPlace(k){ const m = Math.imul((k % 4294967296) >>> 0, G32) >>> 0, th = 2*Math.PI*m/4294967296, r = Math.sqrt(k + 0.5);
     return [r*Math.cos(th), r*Math.sin(th)]; }
   ```
   CONFIRMED: index.html:250-251 and kuiper-law.js:39-40 differ only in indentation; `sha256sum` over all 13 copies (9 learn-the-kuiper, 1 astra-codex, 3 see-through) gives one digest, `2c7512ea1bfdc65f646684655338fa9e2e0564fa89ba38b42577cbc1ceb564ea`, 8,388 bytes each. Correction for the swarm: the brief states `r = sqrt(k)`; the shipped law is `sqrt(k + 0.5)`, keys from 0.

2. **The law in words that match the code.** `kuiper-belt@b243e38d learn-the-kuiper/202610050609/kuiper-law.js:22-29` (W13 F1).
   ```js
   //   r     = sqrt(key + 0.5)    the radius; NOT sqrt(key). The half is in the live code at :250 and :144.
   //   Successive keys turn by G32/2^32 = 0.6180339887 of a turn = 222.4922 degrees anticlockwise on screen, which is the
   //   same point as 137.5078 degrees CLOCKWISE. The Excel "137.5 anticlockwise" spiral is the MIRROR IMAGE of the Kuiper.
   ```
   The one comment block that names the chirality, the offset and the wrap in the same breath. `maths@b898a5ee 08a-which-way-the-golden-turn-goes.md:18` gives the reader's one-line key: `222.492236° + 137.507764° = 360°` (W14 F6). CONFIRMED: 360 x 2654435769 / 2^32 = 222.49223590828478.

3. **The honest limit of the 32-bit law.** `particle-physics-drawing-engine@eb52ad7e measurements/exactness-result.txt:18-19` (W14 F3).
   ```text
   continued fraction of C32/2^32: 34 terms: [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,4,1,1,25,3,1,1,1,1,12]
   first term that is not 1 is term 23; the last all-golden convergent has denominator 28657. Neighbours in the spiral are about 2*sqrt(pi*k) keys apart, so the lattice stops being golden near k = 6.54e+7
   ```
   CONFIRMED independently in `python3 -I` with `fractions`: 34 terms, a0 = 0, a1..a22 = 1, **a23 = 2** (the first term that is not 1); convergents 17711/28657, then 46368/75025, then 203183/328757; 28657^2/(4 pi) = 6.535e7. `node measurements/exactness.mjs | diff - measurements/exactness-result.txt` reproduced the file byte for byte. Beside it, `kuiper-belt cosmos/wafer-meta.json:2` records `"issued_keys": 45461911314` = 10.585 x 2^32, so `k % 4294967296` reuses every angle about ten times on the same ray. No note in `maths` states either bound.

4. **The pointer in three places.** `kuiper-belt@b243e38d learn-the-kuiper/index.html:7-12` (W13 F2).
   ```html
   <meta http-equiv="refresh" content="0; url=202610050609/">
   <main>Opening the latest Learn the Kuiper. <a href="202610050609/">Tap here if it does not open.</a></main>
   <script>location.replace('202610050609/' + location.hash);</script>
   ```
   CONFIRMED: `grep -c 202610050609 learn-the-kuiper/index.html` = 3 (lines 7, 11, 12); see-through/index.html has the same three. Pointer history re-read from git: e98991a 202610050010, 17c8da9 202610042346, 77258c4 202610050144, e9d86c4 202610050204, fb68c29 202610050354, ee0874b 202610050501, d303932 202610050609.

5. **The deterministic square root.** `particle-physics-drawing-engine@eb52ad7e measurements/exactness.mjs:5` and `kuiper-belt learn-the-kuiper/202610050609/one.js:27-34` (W14 F2).
   ```js
   const isqrt = v => { let x = 1n << 300n; for (;;) { const y = (x + v / x) >> 1n; if (y >= x) return x; x = y; } };
   ```
   Heron's iteration in BigInt, started above the root, stopped the first time the guess does not fall: floor(sqrt(v)) exactly, no float. one.js reaches the same floor by a float seed corrected against `n^2 <= key < (n+1)^2`. `maths 11-deterministic-square-root.md:73-77` is the recipe in prose.

6. **No answer is not the same as no change.** `time-stone@a1703b1b tools/watch.py:92-96` (W15 F4), with the docstring at line 20.
   ```python
       except Exception as e:
           print('FAIL: GitHub did not answer (%s); nothing written' % type(e).__name__)
           return 1
   ```
   CONFIRMED: `git log --numstat -- ledger.tsv` sums to 1078 added, 0 deleted; `wc -l` = 1078; authors 206 time-stone, 3 Claude, 1 Ventusltd; the bot's 206 commits touched only NOW.md (206), ledger.tsv (206), site.tsv (3).

7. **The guard does not spell what it guards.** `kuiper-belt@b243e38d tools/check_proof.py:47-55` (W15 F3): names hashed to truncated SHA-256, `leaks()` returns how many matched, never which; time-stone imports it as "one copy, not two" (`tools/watch.py:33-34`).

8. **A registry that refused its own maker.** `cvaa@877bf380 inoculate.mjs:60,71` (W15 F6).
   ```javascript
   if (registryErrors.length) { console.error('REGISTRY INVALID (fail closed)\n' + ...); process.exit(1); }
   ```
   CONFIRMED on a /tmp copy only: `node inoculate.mjs . --no-write` prints `REGISTRY INVALID (fail closed)`, `202609261425-observed-before-asserted.md: dose must be one of every-loop|every-deploy|every-commit`, `sha256 cf471d0c0ef8 not in vaccines.lock`, exit 1. 41 vaccines on disk, 40 in the lock. The vaccine that broke the registry is the one against claiming "live" without a receipt.

9. **Fail-closed emission.** `pipelinenews@67aa2eb0 releases/202609060232-pipelinenews/assets/202609040044-atlas-pointer-deep-link.mjs:75-82` (W16 F3): the MAP link is an empty string unless REPD identity is a positive integer, the technology is one of the canonical tokens, the name has no control characters and capacity, latitude and longitude are all present. Its self-test names each refusal (`:116-126`, W16 F4).

10. **The engine belongs on the row.** `pipelinenews@67aa2eb0 README.md:47` (W16 F1) and `ui/javascript/202608261804-projects-v9-5-1.js:30-40` (F2): one pure function feeds the table cell, the CSV column and the `grid_engine` query parameter, so the three surfaces cannot disagree. "Inferring the engine at arrival is what made offshore projects look silent."

11. **Anchor-count replacement.** `pipelinenews@67aa2eb0 index/202608291310-compile-atlas-v9-deep-link.mjs:108-112` (W16 F7): `assert.equal(actual, count, ...)` before any substitution, so a drifted compiler refuses instead of producing a different release. CONFIRMED: the working file hashes to 9b75b63beadc..., the manifest and the original commit db9f758 both say ff39f3076abf....

12. **Zero tolerance, or no page.** `worlds-@b5f15716 src/worlds.py:234-240` (W14 F4): `if worst > 0: ... return 1` before `page()` is called; the README records two real defects it caught. Its sibling, `grid-distance-maths test/verify_placement.mjs:54`: "A check that reached nothing is not a pass." (re-run: 4096 rows, worst difference 1.421e-14, PASS).

## The patterns these lines share

- **Lift, do not rewrite** (W13 F1, W14 F8): the law is copied with its source line numbers, frozen, and pinned by hash. Thirteen copies, one digest.
- **Immutable dated folders, one mutable pointer** (W13 F2, F3, F15; W16 F6, F11): the same shape as gridatlas `atlas/current.json` and pipelinenews `releases/current-v4.json`. pipelinenews adds `flag: "wx"` on 20 of 21 compilers (re-counted) and `"generation_source": "read from UTC clock at build time, never chosen"`.
- **Integer-exact angle, float last** (W14 F1, F7, F9): Excel reaches the same `m` by 16-bit limbs (`2654435769 = 40503 x 65536 + 31161`, re-verified, and key 43486619138 gives 305752434 by both routes), JavaScript by `Math.imul`, GLSL by uint wrap and an angle-addition split.
- **Name the chirality** (W14 F6, F11, F12): two golden spirals exist in the estate; reconcile with `1 - frac`, never with a second constant.
- **Append-only, enforced by mechanism** (W15 F1, F10, F13): file mode `'a'`, an anti-join on (number, hash) before save, a substrate that is versioned by new name.
- **Guard by digest, report by count** (W15 F2, F3).
- **Silence is not success** (W15 F4, F7, F8, F9; W14 F10): a dead runner may not say `immune`; a checker must fail 33 broken copies before it may pass; an empty comparison set is a failure.
- **Decide at the source, carry in the link, assert in the receipt** (W16 F1, F2, F3, F13).
- **Three layers, then plain English** (W14 F14): trillion-loop's "a result nobody outside the room can check is not a result."

## History (keyed by SHA)

- **One night of editions.** kuiper-belt: 13 editions in 7 h 44 min, bb55165 (2026-10-04T22:26:34+01:00) to d303932 (2026-10-05T06:09:57+01:00); no edition since. Turning points: 1b54cdc (23:20:16+01:00) published folder 202610050010 fifty minutes before the time its name claims, and 17c8da9 (23:47:09+01:00) then published 202610042346, which sorts before it (CONFIRMED from `git log --date=iso-strict`). "Newest" must be read from the pointer, never from `ls | sort`. 55db60c (2026-10-05T09:42:02+01:00): 49 files, +363/-3620 (CONFIRMED), the one sweep that edited every earlier folder and deleted the receipts.
- **Three laws in one day.** kuiper-belt fc08c09 (2026-09-19T00:18:59+01:00) introduces the float +137.5 belt law; a98ff90 (03:52:01+01:00) writes SPEC-INFINITE with that law as "the wafer"; 0755869 (13:56:08+01:00) ships the odometer and `sqrt(k + 0.5)`. The spec was never re-lifted (W14 F12). maths 9e236d4 (2026-10-04T21:02:39+01:00) is the day the teaching caught up with the code.
- **The worlds- storm.** 58 commits on 2026-09-21, dd184be to b5f1571, including the self-correction run 4868cf6 ("0 differ on 200,000 cases reads like proof and is not"), eae9ede ("A red light that cannot turn green is not a light").
- **Watchers.** time-stone: four human/agent commits on 2026-09-19 (02e1adf, c565af1, d5b6054, 73beda7), then 206 bot commits with no code change. stars: 198 commits "Reports from star-maker f65c2f3 (4228 test results)" over one unchanged source (CONFIRMED), because `graph_generated_utc` defeats "save only if changed". cvaa: ade4688 (2026-09-26T14:32:24+01:00) added a vaccine without re-locking; the registry has refused itself since.
- **pipelinenews.** 521 commits (`git rev-list --count 67aa2eb` CONFIRMED), e3ec7bf (2026-08-24) to 67aa2eb (2026-09-26T14:27:23+01:00); authors 417 Ventusltd, 59 github-actions[bot], 17 PipelineNews Bot, 13 Claude, 8 owner, 7 single-purpose bots (CONFIRMED). The 2026-08-30 email storm (54 commits that day; 83d9c43 retired eight one-use workflows byte for byte). The BBC storm: **39 commits** "Refresh BBC RSS metadata [skip ci]", all github-actions[bot], **2026-09-06T02:02:50Z to 2026-09-13T16:17:16Z**, per day 7, 4, 4, 5, 5, 5, 6, 3 (CONFIRMED). The priority-source episode: ten commits on 2026-09-26 (CONFIRMED), ending in 67aa2eb whose tree `b7e44c2a142efe75e99daffa341267e4ae2a276c` equals 4980096's tree exactly (CONFIRMED): the revert restored the last collector-produced product and removed the push trigger on workflow source, the trigger shape retired after 2026-08-30.

## Gridatlas and datacentre relevance

The Kuiper law does not appear in gridatlas, data-grid-gb, data-centres-gb or data-gridatlas (W14's grep: 0 files); the map places by geography. What transfers is method. see-through pins an immutable gridatlas release, `descent.js:30` `.../gridatlas/atlas/releases/202608300453-atlas-v9/data/`, not the live pointer; a new edition that wants the data-centre Grid Engine (generation 202610292044) changes that path in the new folder only. The 5,800-row substation table (`grid-data.js`, `"n":5800`, 4,460 named; CONFIRMED by a sandboxed node read) is the natural join for placing the 225 mappable data-centre sites beside substations; today exactly two substation names mention a data centre (index 3629 "Maxwell House Data Centre", 4050 "Rockingham Data Centre Substation"; CONFIRMED). time-stone's ledger is an independent witness that data-grid-gb pushed before gridatlas on release day (`ledger.tsv:1033-1034`, 2026-10-29T20:47:29Z then 20:48:49Z). pipelinenews's only data-centre lens is the OSM nearest-distance tab (W16 F14: 98 mapped data centres, 263 live projects within 5 km); its public pointer still binds GridAtlas v9.104 at generation 202609040144 (`current-v4.json:49`, CONFIRMED) while live GridAtlas is v9.187. worlds-'s zero-tolerance twin gate and its "disputed" verdict class are the two patterns the DC engine's 30/30/30 counts and multi-lane connection status could adopt.

## Defects and drift found by the workers

Candidates for the owner, not claims.

1. **CONFIRMED** The brief's law `r = sqrt(k)` is not the shipped law; the code and all 13 copies use `sqrt(k + 0.5)` (W13 F1, W14 F1).
2. **CONFIRMED** `kuiper-belt SPEC-INFINITE.md:46` states the wafer law as float `k * 2.399963229728653` and `sqrt(k)`; `index.html:79` says `sqrt(k)`; both disagree with `index.html:250` (W14 F12).
3. **CONFIRMED** The 32-bit odometer is golden only to continued-fraction term 23 (a23 = 2; last all-golden denominator 28657, about 6.5e7 keys) and exactly periodic every 2^32 keys against 45,461,911,314 issued (W14 F3). No `maths` note states it.
4. **CONFIRMED** cvaa's registry refuses itself at HEAD (41 vaccines, 40 locked, unaccepted dose `every-live-mutation`), contradicting `README.md:7` (W15 F6). Run on a /tmp copy only.
5. **CONFIRMED** cvaa `inoculate.mjs:405` exits 0 when rules were skipped, so "immunity is not established" is a refusal in text only (W15 F8).
6. **CONFIRMED** stars `refresh.yml:76-84`: 198 identical-source commits because a timestamp in `spider/` is inside the change-only diff (W15 F17).
7. **CONFIRMED** The release page `releases/202609010836-index.html` has 12 `<th>` (whole file, lines 139-154) while the row template at `releases/javascript/202609010836-projects-v9-5-1.js:137` emits 11 `<td>`; the ui source at line 140 emits 12; the release copy has no `class="grid-engine"` cell. Commit 8d65668 patched `releases/` by hand (W16 F8).
8. **CONFIRMED** `index/202608291310-compile-atlas-v9-deep-link.mjs` was rewritten in place by a bot (da99c41, 0fff06f); its hash 9b75b63b... no longer matches the manifest's ff39f307...; line 122 now replaces ATLAS_BASE with itself, so `replaceExactly` would refuse on rerun (W16 F7; the rerun itself was not executed because it writes files: that step is PLAUSIBLE).
9. **CONFIRMED, narrowed** The offline zip `learn-the-kuiper/202610050609/learn-the-kuiper.zip` contains CRLF text in 10 of 26 files (index.html, modules/realgame.js, strings.js, grid.js, grid-data.js, fx-raw.js, fx-common.js, solid.html, play.html, lesson.html) while the tracked folder is LF only; `kuiper-law.js` inside the zip is LF and identical. W13 F8's claim holds for those files, not for all. Digests of index.html differ (997f94c8... zipped, a7f86e73... tracked). No zip builder exists in the repo.
10. **CONFIRMED** The fidelity receipt `kuiper-law.receipt.json` is absent at HEAD; `kuiper-law.js:62` still cites it. The deleted receipt's `kuiper_law_sha256` 2c7512ea... and `live_index_sha256` 425a03d5... both still match (W13 F9).
11. **CONFIRMED** Errata: `maths 10-kuiper-placement-law.md:169` has a literal TAB where `\times` was; `10:159` says 43,486,619,138 issued keys against 45,461,911,314 now; `worlds- README.md:67` and `src/worlds.py:76` say ~11,012 rad where the value is 11,013.43; `kuiper-drawing-engine web/geometry.mjs:13` has `0?60 degrees` with a lost en dash (W14 F17, F18).
12. **PLAUSIBLE** `LESSON-CONTRACT.md`, `tools/run-all.mjs`, `descent/build_descent_data.py` are cited in shipped files and absent from kuiper-belt (`find` returns nothing; W13 C2, F13, F14): the editions cannot be rebuilt from this repo alone.
13. **PLAUSIBLE** W16: the README's "the receipt asserts it" has no receipt in pipelinenews; `grid_engine` appears in only two files (re-grepped) and not in the latest deep-link cartridge.
14. **PLAUSIBLE** star-maker `SKY.md:1` says "3638 stars" while `stars/` holds 4,228 files (re-counted: 3,269 GREEN, 959 RED, 959 shots, 0 replays).

### This edition's own generator against the shipped law

`pipelinenews kuiper-edition/202610311905/tools/edition_belt.py` at HEAD (last changed ea36ae9, 2026-10-31T19:24:28Z; sha256 prefix dc4c190f) now computes, at lines 91-93, `r = A_MIN + (A_MAX - A_MIN) * sqrt((k + 0.5) / n)` with `A_MIN, A_MAX = 0.16, 0.92` from `tools/estate.py:20`, and `th = 2 * pi * ((k * 2654435769) mod 2^32) / 2^32`, frame centred on zero. **The angle now agrees with the live wafer exactly**: Python's integer `%` gives the same `m` as `Math.imul(...) >>> 0` for every key, and running the generator on this chapter's register (into /tmp, 68 rows, 67 bodies after one blob:line dedup, 0 unresolved) places body k = 1 at 222.4922 degrees, the wafer's step. **The radius agrees in form, not in units**: it keeps the wafer's half-key offset but is the belt's annulus-scaled `sqrt((k + 0.5) / n)` from `estate-network.json`, which is the right law for a belt of bodies and is printed as such in `rules.txt`. W14's table row 28, written at 19:19Z, describes the generator before 57154b5 (19:21Z) and is now stale. One residual, **PLAUSIBLE** (read, not rendered): the viewer `belt/index.html:28` maps `y` straight to canvas `y`, which grows downward, while the wafer draws in WebGL clip space with y up (`index.html:148`). On screen the belt therefore winds the mirror way to the wafer even though every number agrees; `innerHeight/2 - y*s` would close the gap. This is precisely the chirality trap of `kuiper-law.js:27-28`.

## What the new Kuiper edition should carry from this chapter

On the belt (all CONFIRMED): `kuiper-belt index.html:250` (the law), `kuiper-law.js:22-29` with `maths 08a:18` (the law in words, the 360-degree identity), `exactness-result.txt:18-19` (the limit of the law, printed beside it), `exactness.mjs:5` (the integer root), `learn-the-kuiper/index.html:7-12` (the pointer), `time-stone tools/watch.py:20,92-96` and `check_proof.py:47-55` (fail closed, guard by digest), `cvaa inoculate.mjs:60,71,299` (a registry that refused its maker), `elements check_catalogue.py:234`, `stars standalone.mjs:8079`, `pipelinenews README.md:47`, `atlas-pointer-deep-link.mjs:75-82`, `compile-atlas-v9-deep-link.mjs:108-112` with its manifest hash, `.github/DEPLOYMENT_POLICY.md:7`, and the 67aa2eb revert hunk beside `workflow-archive/20260830-email-storm/README.md:3-5`. The edition itself should do what the editions it describes did not quite do: ship a committed zip builder (LF, fixed order, fixed mtimes) and a fidelity receipt (source sha256, copy sha256, per-line verbatim check), re-lift kuiper-law.js rather than edit line 62, move the pointer in the same commit, and touch no earlier `<stamp>/` path.

## One next command

```
cd /home/user/estate/kuiper-belt && sha256sum learn-the-kuiper/*/kuiper-law.js learn-the-kuiper/astra-codex/*/kuiper-law.js see-through/*/kuiper-law.js | awk '{print $1}' | sort -u | wc -l
```
Prints 1 today. Run it again after the new edition's folder exists; if it prints 2, the law was edited instead of lifted.
