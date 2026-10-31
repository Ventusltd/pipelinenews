# C3 — The grid behind the data centres, and the Kuiper's law against its code

Controller C3 (Claude, Fable 5.1), Kuiper edition 202610311905, written 2026-10-31T19:30:00Z. Workers reviewed:
W09 (data-grid-gb ETYS network), W10 (offtaker threads), W11 (kuiper-belt tools as law), W12 (kuiper-belt engine
and history). Clones read only. HEADs re-read: data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1,
gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e, kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6, plus the
ventus-grid-engine, gridmachine1, data-gridatlas and globalgrid2050 HEADs in proof/inventory.tsv. pipelinenews HEAD
had moved to 0f698cc32e0e6f41f793ef0a97c314083d98f759; W10's commit 6a4c0244b2817c6b8a74661546c8acc35e53a9b7 is
reachable and `git diff --quiet 6a4c0244 HEAD -- <the four keyed paths>` is silent, so W10's keys stand.

**Keys verified 98 of 98**: W09 35 of 35, W10 19 of 19, W11 28 of 28, W12 16 of 16. `/tmp/c3/verify_keys.py` parses
every `KEY:` line (including `LAW SIDE, KEY:` and `COUNTER-EXAMPLE, KEY:`), checks the sha with `git cat-file -e`,
extracts the file with `git show <sha>:<path>` and requires the first non-blank quoted line inside the cited range.
Nothing SHIFTED or UNVERIFIED. `C3-register.tsv` has one row per finding, 68 rows, all CONFIRMED. Every numeric
claim named below was re-run; where a worker's number was wrong it is listed under corrections.

## What this part of the estate is

The first half is the grid behind every data-centre card. `data-grid-gb` turns NESO's Electricity Ten Year
Statement appendices B and D into two products: `gb-transmission-network.v1.json` (921 sites, 2,679 nodes, 1,392
circuits, 1,472 transformer records, 2,230 planned changes, 7,316 fault-current rows over 5 winters; 10 MB) and
`connection-points.v3.json` (886 connection points at 132 kV and above, 489 located by a fail-closed name join to
GridAtlas substation geometry, 397 published without coordinates; 2,934,509 bytes). The products carry their own
refusal to be read as a connection assessment, their join statistics, and fault current split by voltage. Grid
Atlas consumes them through the `substation-intelligence` cartridge (generation 202609062358, v9.140, in
`atlas/current.json`), pinned by commit, SHA-256 and byte length. Around them W10 traced "potential offtaker" from
a 2026-05-22 diary and the first atlas legend, through the identity-less 240-point OSM layer, pipelinenews'
ABSTAIN-by-default identity law and ventus-grid-engine's `NOT_COMPUTED` table, to gridmachine1's cable engines,
which still have no row for a load.

The second half is the Kuiper read as law versus code. `LAWS.md` states ten falsifiable laws L1..L10; `tools/`
holds 15 scripts, 2,387 lines; `engine.yml` runs `ci_check.py`, `harvest.py`, `ci_check.py`, `wafer_topup.py`,
`ci_check.py` on the cron `'17 */6 * * *'` (six-hourly, not hourly) and has made 146 of the repository's 234
commits with nobody present. The wafer, `cosmos/wafer.tsv`, is an append-only ledger of 13,177 public commits
holding 45,461,911,314 issued keys and 17,550,746,400 keys of silence, an address space of 63,012,657,714. The
result that matters: the repository's two placement laws are mirror images of each other, LAWS.md L2 is implemented
by neither, and the proof digests the README calls the receipt no longer match the files at HEAD.

## The best lines, ranked

1. **Publish the unknown; never drop it.** data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1
   derived/build_connection_points.py:24-27 (W09 F2)
   ```
   that does not join is published WITHOUT coordinates rather than dropped,
   because a consumer that needs to know a node exists should not be told it
   does not merely because nobody has mapped it.
   ```
   Re-counted: 886 points, 489 located, 397 unlocated, including 180 at 132 kV and 149 at 400 kV. A data-centre
   "nearest connection point" must say "nearest *located*".

2. **The pin that explains value pins, while pinning the pre-correction commit.**
   gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e
   atlas/cartridges/202609062358-substation-intelligence-v9-63.js:4050-4057, with :4012-4017 (W09 F12)
   ```
     'connection-points.v3': {
       repository: 'data-grid-gb',
       ref: '1c9909d1138704b29235c27fd769436dda8a0b18',
       sha256: '11e28859a6d17cc8ee4047c2032d55d043be98f7123743f3b2b03225e07a4c0c',
       bytes: 2896561,
   ```
   Defect D1. The comment above the pin names the correction (Cowley 10 to 5, located 502 to 489) the pin does not carry.

3. **The placement law in two lines, and the law it disagrees with.** kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6
   tools/estate.py:157-158 against LAWS.md:32 (W11 F1)
   ```
           r = A_MIN + (A_MAX - A_MIN) * math.sqrt((k + 0.5) / n_bodies)
           theta = (k * GOLDEN) % (2 * math.pi)
   ```
   LAWS.md:32: `a = a_min + (a_max - a_min) * (1 - 1 / (1 + hops))`. `grep -n hops tools/*` returns nothing. The
   code is Vogel's sunflower; the law is a hop count nobody computes.

4. **Fibonacci hashing as an exact integer angle.** kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 index.html:250
   (W11 F2, W12 F11)
   ```
   function keyPlace(k){ const m = Math.imul((k % 4294967296) >>> 0, G32) >>> 0, th = 2*Math.PI*m/4294967296, r = Math.sqrt(k + 0.5);
   ```
   `Math.imul` then `>>> 0` is exact arithmetic mod 2^32, so the angle is bit-identical everywhere (L9). Its step is
   360 x 2654435769 / 2^32 = 222.4922 degrees; estate.py steps 2.399963229728653 rad = 137.5078 degrees; the two sum
   to 360. The radius is sqrt(k + 0.5), while index.html:79 and cosmos/wafer-meta.json:12 still say `r = sqrt(key)`.

5. **The fail-closed sandwich on a six-hour timer.** kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6
   .github/workflows/engine.yml:30-31, 36-37, 43-44 (W12 F1, W11 F17)
   ```
         - name: Check first, and fail closed
           run: python tools/ci_check.py
         - name: Check again with the new data in place
           run: python tools/ci_check.py
         - name: Check the grown wafer
   ```
   engine.yml:8 is `- cron: '17 */6 * * *'`. From cosmos/pulse.tsv: 146 rows, mean interval 6.94 h, min 1.70 h,
   max 13.54 h after 2026-10-13T00:48:13Z, `missed` 0 in every row.

6. **Append only, and git proves it.** kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6 tools/wafer_topup.py:22-25 (W12 F3)
   ```
   APPEND ONLY. Nothing already issued moves: every new commit lands beyond the rim. The price is
   that a commit pushed after a later run, bearing an older time, stays outside the wafer; it would
   need an address that is already taken.
   ```
   `git log --numstat -- cosmos/wafer.tsv`: 118 commits, 13,178 added, 0 deleted; pulse.tsv 146 commits, 147
   added, 0 deleted. Column 2 of wafer.tsv re-sums to 45,461,911,314 = wafer-meta.json = the sum of repos.tsv; 0
   rows out of time order, 0 negative gaps, 4 rows at the fortnight cap. K2 and K4 hold at HEAD.

7. **The guard does not spell what it guards.** kuiper-belt@b243e38d4964557458fcaf636fd8d49c799f91a6
   tools/check_proof.py:47-55 (W11 F13, W12 F9)
   ```
   def leaks(text):
       """Every run of name characters is hashed, whole and with its leading path stripped, and
       compared with the digests. Returns how many tokens matched, never which."""
   ```
   Imported by six tools; publishers exit 2 on one hit.

8. **Identity is the source ordinal, not row content.** data-grid-gb@b57c94d4e964df2de0dea2786781c6d07a967ea1
   derived/verify_phase0_acceptance.py:364-366 (W09 F9)
   ```
               "identity_rule": (
                   "Use source-row ordinal while indexing. Never deduplicate by row "
                   "content: distinct parallel units can be byte-identical."),
   ```
   The rule that took Cowley from 10 transformers to 5 without merging parallel units. Re-run:
   `verify_phase0_acceptance.py --summary-only` passed 22 of 22; `verify_connection_points.py` 44/44; tree clean.

9. **A refusal exported as a frozen object.** ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f
   engine/firm-capacity.js:200-209 (W10 F5)
   ```
   export const NOT_COMPUTED = Object.freeze({
       spareCapacity:
           'Spare capacity is the network operator\'s figure, from its model, its running arrangement and its outage plan. A rating minus a demand is not it.',
   ```
   data-grid-gb's `not_a_connection_assessment` and 06b-dc-engine.js:92 say the same in their own words.

10. **The identity law in one expression.** pipelinenews@6a4c0244b2817c6b8a74661546c8acc35e53a9b7
    archive/202608261547-pipelinenews/newsv6/modules/data-centre-identity.mjs:2 (W10 F3)
    ```
    export const linkDecision = ({exactSharedSourceObject = false, atlasIdentityLost = false} = {}) => exactSharedSourceObject && !atlasIdentityLost ? "LINK_EXACT_SOURCE_OBJECT" : "ABSTAIN_INSUFFICIENT_IDENTITY_EVIDENCE";
    ```
    Written against the 240-point layer whose producer (globalgrid2050 scripts/fetch_datacentres.py:57-63) dropped
    the OSM type and id. Re-counted: 240 features, keys exactly `name` and `operator`, 51 "Unknown Data Centre",
    67 "Unknown Operator", sha256 a686a2e0...acab4 as data-gridatlas pins it.

## The patterns these lines share

- **Publish the unknown and count every tier** (W09 F2, F3, F5, F14; W10 F8): unlocated sites, 726 of 2,679 nodes
  whose inferred voltage their site does not declare, unknown MW; published and counted, never zero-filled.
- **Pin by commit, digest and length** (W09 F8, F12, F16; W10 F2, F14). Strongest: the gridatlas PINS block.
  Weakest: data-grid-gb's ETYS fetch, which records a new digest and never compares it with the old one. Both ways a
  pin fails are here: left on the wrong commit (D1) and a digest that moves with no content change (D3).
- **Refuse on an empty denominator** (W11 F4; W12 F5, F6): estate.py:64, count_lines.py:196, entangle_hosts.mjs:42,
  harvest.py:104 (one-fifth missed means nothing written), wafer_topup.py:181-187 (an unread repository pushed since
  the rim would lose commits forever under append-only, so the run refuses).
- **Frozen constant, imported, never copied** (W11 F11; W12 F4): wafer_keys.py:33-34, imported by permanence.py:29
  and wafer_topup.py:47. Counter-example: the binary sniff is 8,192 bytes in harvest.py:77 and 8,000 in three tools.
- **The rule travels inside the output** (W09 F1, F6; W11 F1, F2), with the hazard that the carried sentence can be
  wrong (wafer-meta.json:12 says sqrt(key); the code computes sqrt(key + 0.5)).
- **Check, mutate, check** (W12 F1, F8; W11 F17): ci_check.py three times per engine run; check.yml on every push
  with `contents: read` only.
- **Law-by-code drift** (W11 F1, F2, F5, F6, F8, F9; W12 F14): the tools implement L9 fully; L3, L5, L6, L8, L10
  partly; contradict L1, L2 and L7 for the belt; nothing implements L4.

## History, keyed by SHA

**data-grid-gb** (15 commits: Ventusltd 12, bot 3). A founding storm on 2026-09-01: cf6869025458c48397cf2ba79c27da89738f33f1
(v1, 574 located), dbfeecb5f745e1c374db2324972743820e8d73da (v2, eight fault metrics), 7656dbf2e62276cbb3823368848707a91b9e5ed6
(v3, authored 18:23:28+01:00 under a subject stamp of 19:20, 56 minutes ahead of the clock). Turning point
b91e45b231464c24339f5a58b81e6b1eb4c8b47f, 2026-09-03T02:21:01+01:00, "correct transformer identity and fail-closed
joins": located 502 to 489, Cowley 10 to 5, ABHAM 4 to 2, plus the 661-line Phase-0 oracle; v3's digest 8db7171d...
unchanged since. Bot commits a412790, 1c9909d1138704b29235c27fd769436dda8a0b18 (2026-09-01T17:23:51Z) and 5181de3
each touch only a tie order under digit 7. Located count over time, recomputed: 574, 574, 502, 502, 489. Then eight
weeks of silence and the data-centre wave of 2026-10-29 (3ca8cfd, 3c6c72e, 69b566d, b57c94d), none touching ETYS.

**gridatlas.** Every substation-intelligence generation naming a data-grid-gb ref (202609030200 to 202609062358) and
atlas/modules/202609030137-pinned-products.js pin 1c9909d. No file names b91e45b, 5181de3 or b57c94d in full.

**The offtaker thread.** pipelinenews a2259bf3c8a9f2b9b2cfaa39e223c299224c5c81 (2026-08-25, identity law) and
a1516f23a2f8f1e2a3b286ed73cd580ce501c179 (2026-08-28, 612 ABSTAIN slots); data-gridatlas f6d3e7a30a63103d196ddb7be77dbafe6fce8809
(2026-08-29); ventus-grid-engine 3589facf (2026-09-04, the offtaker ladder), 294dcc06 (2026-09-06T02:59+01:00, "why
MVA and not MW") and the stamp-versus-import drift between 2b0db38 (04:13:21+01:00) and c944701 (04:28:07+01:00);
gridmachine1 cable engines f4caffa..bcdab92 (2026-09-07).

**kuiper-belt** (234 commits, complete from 482dc7722ac85e4428c26b28008b25ef0fb39930: kuiper-engine 146, Ventusltd
75, Claude 13). 4ffcced5 seeds the laws 2026-09-18T20:06:28+01:00. The estate.py storm: fc08c098 00:18:59 ("KNOWN
DEFECT" in the body), 47ce6400 00:41:43 (ordinal radius plus golden angle), 51ca8f13, 8b4f20f9 (oldest at the
pupil), e08cb871 10:45:29 (reversed to newest; the comment at estate.py:135 was not). 8b4b1d22 retracts the 67
million line count; 0755869f the wafer; 4ef5264f permanence; 9dcf8f8d 14:25 the hashed guard; 84e44834 14:27 the
redaction; 1b18e9c1 14:29 check.yml; 024d127e 14:01:54Z the engine, with the first bot commit c7c8fb52 at 14:05:58Z,
four minutes later and off the :17 schedule (a manual dispatch; Actions logs unavailable, UNVERIFIED). 485851fc
2026-09-26 adds wafer_topup.py, the last change to tools/. Edition burst 2026-10-04/05: kuiper-law.js identical
across all 9 dated folders. No human commit after a287b4cb 2026-10-05; HEAD b243e38d is a routine engine run,
2026-10-31T12:43:52Z. No reverts.

## Gridatlas and datacentre relevance

The 30/30/30 engine (`tools/offtakers/src/06b-dc-engine.js`) ranks OpenStreetMap substations by straight line within
40 km and says so (:92). It reads neither ETYS product: `connection-points`, `data-grid-gb` and `ETYS` match nothing
and the two `fault` hits are `preventDefault`. W10's next command shows the OSM data-centre layer survives only in
`tools/offtakers/filter/` as corroboration (run_log.txt:4 records the a686a2e0 input digest).

What the ETYS products could add to a card, each item quoted from the product: `site_code`, `voltages_kv`,
`transmission_owner`, `location.matched_by` (428 exact-name-highest-voltage, 22 voltage-compatible, 39 distinctive
token), the circuit winter rating range, the corrected transformer count, `fault_current_by_voltage` at the band the
user picked (never the site-wide envelope: West Burton's 132 kV bus is 5.1 to 9.04 kA, its 400 kV bus 33.3 to
49.59 kA; 319 of 605 sites with fault data span more than one voltage), planned changes by year, and the unlocated
count beside every answer. Capacity stays unknown: `connection_refs` is empty for all 227 pipeline sites and
`grid_connection_mw` has a value for 2 (correction C1). Preconditions: move the pin, sort the set, keep v3 under
3,000,000 bytes (65,491 to spare), and join NESO connection-site names to ETYS `site_code` through the same
fail-closed normaliser rather than by distance. All 311 gridatlas clone commits appear in wafer.tsv under
repo_index 44.

## Defects and drift

Candidates for the owner, not claims. CONFIRMED means re-run in this session.

- **D1 CONFIRMED. The live cartridge pins data-grid-gb before the correction.** atlas/current.json lists
  `substation-intelligence` at generation 202609062358 (v9.140); its PINS block (:4050-4064) names
  1c9909d1138704b29235c27fd769436dda8a0b18 for both products. `git show 1c9909d:derived/connection-points.v3.json |
  sha256sum` = 11e28859..., network file fc331cc2..., both equal to the pins. At 1c9909d: 886 points, 502 located,
  Cowley 10 transformers, ABHAM 4. At b91e45b and HEAD: 489 located, Cowley 5, ABHAM 2, digest 8db7171d...
  (byte-identical at both). No file in gridatlas names any later data-grid-gb commit.
- **D2 CONFIRMED. README.md:55-56 overstates the verifier.** It says the verifier fails if the sentence is removed.
  The verifier tests `"no published appendix contains"` and `"queue position"` (verify_connection_points.py:52-53,
  :80-81). With "Nothing here says a project can or cannot connect at a node." deleted from the published field the
  check is still True; emptied, False. The comment at :48-50 says the substance test was deliberate. The README is
  the drift.
- **D3 CONFIRMED. Bot churn with no content change.** a412790, 1c9909d and 5181de3 each swap `"20": 2` and
  `"25": 2` under digit 7 (four diff lines), because build_network_model.py:245 iterates an unsorted `set` into a
  `Counter` whose `most_common(4)` publishes the tie order. Network digest fc331cc2... (pinned) became b26b324c...
  (HEAD). Fix: `sorted(node_names)`.
- **D4 CONFIRMED. entangle_hosts.mjs:119 never replaces a real drift block.** On a copy under /tmp with node
  v22.23.4, `new RegExp(`${START}[\s\S]*?${END}`)` has source `<!-- DRIFT:START -->[sS]*?<!-- DRIFT:END -->`: in a
  template literal `\s` collapses to `s`. It matches only a body made of the letters s and S, or an empty one; the
  block the tool writes (:113-117) is several lines, so it never matches. README.md:182-184 still shows the run of
  2026-09-18T22:24:08.578Z, NOT EVALUATED; DRIFT.md:2 is 2026-09-19T12:50:01.970Z with OVERREACHED entries.
  `DISCLOSED`, the fourth L10 verdict, occurs in no tool. Fix: `[\\s\\S]`.
- **D5 CONFIRMED. Proof digests: 5 of 22 at HEAD, 22 of 22 at the parent of 84e4483.** 19 run digests: 4 of 19
  match at HEAD, 19 of 19 at 9dcf8f8d6fd8065d86b3eae7804a477061d82427. The 3 file digests in
  proof/20260919T030003Z-counts.json: blob-lines.tsv matches at HEAD, authored.tsv and counts.json do not; all 3
  match at the parent. The redaction commit rewrote 18 files and nothing re-wrote the proofs; ci_check.py does not
  compare proof/ with data/. The law survives as "the commit is the receipt" (README.md:153-154).
- **D6 CONFIRMED. Cadence and re-sum.** Six-hourly cron; wafer.tsv re-summed 45,461,911,314 issued,
  17,550,746,400 silence, 63,012,657,714 space, equal to wafer-meta.json and repos.tsv; order and closure invariants
  hold; no line ever deleted from wafer.tsv or pulse.tsv.
- **D7 CONFIRMED. The two placement laws disagree with each other and with LAWS.md.** 137.50776 degrees per body
  in estate.py, 222.49224 per key in index.html:250 and wafer_keys.py:80. LAWS.md states no angle. estate.py's
  radius is `sqrt((k + 0.5) / n)` where L2 says hops. The wafer's radius is `sqrt(k + 0.5)` (index.html:250,
  kuiper-law.js:26 "NOT sqrt(key)") while index.html:79 and wafer-meta.json:12 say `sqrt(key)`. Integer versus
  continuous angle drifts 1.1577e-10 turn per step, 4.39 turns over 37,929,255,811 keys. The wafer puts key 0 at the
  pupil; estate.py the newest blob; SPEC-INFINITE.md:10-11 describes only the second.
- **D8 CONFIRMED. swarm.py:134 passes a check that examined nothing**: `{'sound': True, ...}` when the Actions
  record cannot be read, feeding `release_ready` at :152. Also ci_check.py:44-45 `except Exception: pass`.
- **D9 CONFIRMED. README.md:177-179 is false at HEAD**: "`tools/estate.py` is **not yet written** ... nothing in
  `data/` or `proof/` yet." estate.py is 236 lines; proof/ holds 20 files.
- **D10 CONFIRMED. twin_register.mjs writes data and proof (:83-90) before the 95 per cent gate (:103).**
  proof/20260918T225001Z-register.json: 95,956 of 128,369 = 74.75 per cent, no flag.
- **D11 CONFIRMED. L1 as computed is not L1 as stated**: estate.py:105 uses tracked paths, not inbound refs; :86
  caps `git log` at 400; :204 prints only the summed score. SCATTER_RATIO 4.0 (:25, unchanged since fc08c09) left
  14,529 of 19,257 bodies "scattered".
- **D12 CONFIRMED. Small inconsistencies**: 8,192 versus 8,000-byte sniff; three tracked `.pyc` files;
  permanence.json's d672e69 is not an object in this clone; estate.py:135 stale comment; publish_proof.py:45
  enforces 1,200 s where iterate.py:8-9 says ten minutes.
- **D13 CONFIRMED. Stamp-versus-import drift**: globalgrid2050 grid_engine/202609060316-data-centre-connection/index.html:171
  imports the moving github.io engine while :71 stamps 2b0db38; firm-capacity.js changed at c944701 fifteen minutes later.
- **D14 PLAUSIBLE.** refresh_network_products.yml runs only verify_connection_points.py (:26, :62); the 22
  Phase-0 checks are not enforced in CI. Read, not executed.

**Corrections to the workers**, from re-running their numbers:

- **C1 (W09 F14).** `grid_connection_mw` is a dict on all 227 features and `value` is non-null for 2, not 0:
  200 MW (Bedford, dc-a2 seed) and 140 MW (Iver, a published appeal decision). `connection_refs` empty for 227 holds.
- **C2 (W10 F1).** Output blob 9457f6dc... is tracked 4 times in globalgrid2050 (root, v6, v7, v8), not 5. The
  script blob is 4, as stated; 240 / 51 / 67 and the digest are exact.
- **C3 (W09 F10).** "Exactly 2 lines" is two content lines; each bot diff has 4 diff lines.
- **C4 (W12 next command).** Its awk `NF==3 && $2>0` also matches the `C <sha> <date>` header lines and prints
  every commit as DELETION. `git log --numstat --format= -- cosmos/wafer.tsv cosmos/pulse.tsv | awk '$2>0'` prints nothing.
- **C5 (W09 F13).** `grep -c fault` on 06b is 2, not 0; both are `preventDefault`.

**UNVERIFIED**: rebuilding v1/v3 from sources (`sources/*.xlsx` gitignored and absent); the first engine run as a
manual dispatch; the 2026-05-22 diary date (globalgrid2050 shallow to 2026-09-16); W09's in-memory nearest-point
prototype (median 5.23 km), in no repository and not re-run.

## What the new Kuiper edition should carry from this chapter

The ten ranked lines above, in that order, each with its key; then build_network_model.py:241-249 as the
one-line reproducibility lesson, estate.py:63-65 with swarm.py:134 as its breach, and entangle_hosts.mjs:119 as the
one-character-class bug that left two records disagreeing. Carry the D5 result verbatim, 5 of 22 at HEAD and 22 of
22 at the parent: the clearest demonstration in the estate that the commit, not the tree, is the receipt.

## One next command

```bash
git -C /home/user/estate/gridatlas grep -n "ref: '1c9909d1138704b29235c27fd769436dda8a0b18'" -- atlas/cartridges atlas/modules && git -C /home/user/estate/data-grid-gb diff --stat 1c9909d1138704b29235c27fd769436dda8a0b18 b91e45b231464c24339f5a58b81e6b1eb4c8b47f -- derived/connection-points.v3.json
```

It lists every cartridge generation still pinned to the pre-correction commit, then the one-file delta the pin
has to cross.
