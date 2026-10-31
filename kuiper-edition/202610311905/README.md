# Kuiper edition 202610311905

**The estate's best lines, keyed, placed on the belt by the shipped law, with GridAtlas and the data centres at the centre.**

Cut 2026-10-31T19:05:00Z from 26 local clones of the Ventus Ltd / GLOBALGRID2050 estate. Prepared by a controlling
harness (Claude Fable 5.1), five controllers (Fable 5.1) and twenty workers (Claude Opus), coordinating in public on
[neural-link issue NL-006](https://github.com/Ventusltd/neural-link-between-agents/issues/6). Nothing live was moved:
no pointer, no homepage, no release branch, no merge. The owner publishes, after review (kuiper-belt README, Forbidden).

## What is in the folder

| path | what it is |
|---|---|
| `belt/index.html` | the edition's Kuiper: one body per verified line, placed by the live wafer's law; tap a body to read the line and open it on GitHub at its commit |
| `belt/belt.json`, `belt/bodies.json`, `belt/rules.txt` | the belt in the renderer's own shape (`[x, y, key, copies]`), the human record beside each key, and every constant used |
| `register.tsv` | every keyed finding the controllers confirmed: worker, repo, commit, path, lines, title, pattern, status, first quoted line |
| `chapters/C1..C5-*.md` | five chapters, 3,000 words each, ranked lines with keys, patterns, keyed history, defects with status, what belongs on the belt |
| `chapters/C*-nl006.md` | the five public messages posted to NL-006 |
| `workers/W01..W20-*.md` | the twenty raw surveys, 10,233 lines, each finding with `repo@sha path:line` and a verbatim quote |
| `proof/inventory.tsv` | HEAD, commit count, tracked files per clone, as cloned |
| `proof/denominator.tsv`, `proof/duplicates.tsv` | the estate's size counted three ways, and the blobs shared between repositories |
| `proof/history-timeline.tsv` | per repository: first and last commit, active days, busiest day, bot share, longest gap, night share |
| `proof/<run-id>-belt.json`, `proof/edition-sha256.txt` | SHA-256 of every generated file and of every file in this folder |
| `tools/edition_belt.py` | the generator: register in, belt out, rules printed, digest written |
| `BRIEF.md`, `CONTROLLER-BRIEF.md`, `NOTICE.md` | what the swarm was told, and the licences |

## The law this edition obeys

Every statement in `register.tsv` and in the chapters carries a key: `repo@<commit> path:line`. A controller re-resolved
each key against the clone (`git show <commit>:<path>`) and required the quoted line to be inside the cited range.
Statements that could not be resolved are written as candidates or marked UNVERIFIED. Times carry offsets. A check that
examined nothing refuses.

The belt places each body by the law the live wafer ships, not by the law its documents state. From `kuiper-belt
index.html:250` and the thirteen byte-identical copies of `kuiper-law.js`: the angle is the exact 32-bit odometer,
`theta = 2*pi * ((k * 2654435769) mod 2^32) / 2^32`, which turns +222.492236 degrees per key; the radius is
`sqrt(k + 0.5)`, here scaled to the belt's annulus `0.16..0.92` as `tools/estate.py` scales it; the frame is centred on
zero because the renderer multiplies straight through; stations are `[x, y, key, copies]`; there are no edges, because an
unmeasured edge would be a claim without a key. The key of a body is the git blob SHA of the file at the cited commit,
joined with the line number, so a body is a line, and every body opens.

## The numbers

| what | count | where it comes from |
|---|---|---|
| repositories cloned | 26 | `proof/inventory.tsv` |
| tracked files | 72,475 | W20, re-counted from `git ls-files` |
| text lines, counted per path | 47,227,007 (code 7.18 M, docs 3.08 M, data 36.90 M) | `proof/denominator.tsv` |
| text lines, each identical file once | 25,071,989 (the Kuiper's own count_lines.py gave 25,335,587 on 2026-09-19, within 1.0 %) | W20 |
| distinct blobs | 30,895; 1,842 (6.0 %) in more than one repository | `proof/duplicates.tsv` |
| commits in the clones | 3,324; 34.8 % by automation | W20, `proof/history-timeline.tsv` |
| worker findings written | 20 files, 10,233 lines | `workers/` |
| keys re-resolved by controllers | 495 of 495: C1 113, C2 103, C3 98, C4 88, C5 93; none shifted, none unverified | `chapters/` |
| register rows | 354, all CONFIRMED | `register.tsv` |
| bodies on the belt | 346 (eight lines were cited by two chapters and are one body each); 174 on gridatlas, data-grid-gb or data-centres-gb; 0 unresolved, 0 dim | `belt/rules.txt`, `proof/202610311905-belt.json` |

## The twelve lines

Ranked across the five chapters. Each is in `register.tsv` with its full key and in its chapter with the quote.

1. `gridatlas atlas/index.html:81` — no served byte runs unless its SHA-256 equals the pointer's. The whole
   immutable-shell-plus-hashed-cartridges architecture is this one invariant.
2. `gridatlas tools/release/flow-lib.mjs:49-52` with `tools/release/acceptance.mjs:59` — an agent, Codex or CI cannot
   record the owner's acceptance; Claude and Codex signatures are a blocklist on consent. Authorisation travels inside the
   release commit as a required argument.
3. `gridatlas tools/offtakers/src/06b-dc-engine.js:59` — the 30/30/30 rule in one line: a data-centre tap lists the 30
   nearest substations at 33 kV and above within 40 km, 30 REPD sites within 40 km with ties kept, and the 30 nearest
   conventional sites with lines drawn only within 100 km. `01-data.js:71` keeps IT load, grid connection and unlabelled
   MW as three nullable values, never summed, never zero.
4. `data-grid-gb datacentres/lanes/dc-a7-merge/dcmerge.py:236-239` — the operator guard runs before planning references,
   connection references and shared URLs: two known different operators are never one site. This is the Slough fix. It
   also split Wapseys Wood in two (candidate 1 below): a guard needs a false-split test as well as a false-merge test.
5. `data-grid-gb datacentres/lanes/dc-a1-neso/fetch_neso.py:409-417` — a failed fetch deletes stale outputs, because
   unknown is not zero.
6. `data-grid-gb derived/build_connection_points.py:24-27` — a transmission site that does not join to map geometry is
   published without coordinates rather than dropped: 886 points, 489 located, 397 not.
7. `gridatlas compiler/202608290716-compile-atlas-v9.py:102-108` — `float(row.get("X-coordinate") or 0)`: a blank REPD
   cell becomes easting 0, northing 0, which is the National Grid false origin at -7.55716, 49.766807; 36 registry rows
   sit on it. The live release refuses both zeros by name (`compile-atlas-v9-live.py:131-132`). The best line and the
   worst line in the estate are the same `or 0`.
8. `kuiper-belt index.html:250` — the law as it runs: `Math.imul` odometer, `>>> 0`, +222.49 degrees, `sqrt(k + 0.5)`.
   `maths/08a-which-way-the-golden-turn-goes.md:18` is the chirality key: 222.492236 + 137.507764 = 360.
9. `particle-physics-drawing-engine measurements/exactness-result.txt:18-19` — where the 32-bit law stops being golden:
   the continued fraction of 2654435769 / 2^32 has 34 terms and its first term that is not 1 is the 23rd, so the lattice
   is exactly golden only to about 6.5e7 keys, and the angle repeats every 2^32 keys. The wafer has issued 45,461,911,314
   keys, 10.585 times 2^32. No maths note said this before this edition.
10. `time-stone tools/watch.py:92-96` — no answer is not the same as no change: if GitHub does not answer, nothing is
    written and the run exits 1. `kuiper-belt tools/check_proof.py:47-55` guards by digest and reports by count, never by
    name.
11. `gridatlas atlas/cartridges/202609062358-substation-intelligence-v9-63.js:4050-4057` — pin by commit, SHA-256 and byte
    length, with the comment on why schema strings cannot protect values. The same block is candidate 3 below: the pin
    was never moved after the correction it describes.
12. `pipelinenews releases/202609050233-pipelinenews/assets/202609040044-atlas-pointer-deep-link.mjs:75-82` — no MAP link
    unless the REPD id, one of fourteen technologies and finite coordinates are all present: an empty string, never a
    degraded link. `README.md:47`: the engine category belongs on the row, not in the map.

## The patterns

Named by the controllers; each pattern cites its keyed examples in its chapter.

- **Fail closed on bytes.** SHA-256 before execute, before parse, before "live"; one digest definition (LF bytes,
  `.gitattributes`), so browser, lint, git and the live check agree. (C1)
- **Unknown is null or absent, never zero.** Nullable MW, an explicit `unknown` status, unplaced records counted not
  geocoded, the OSGB (0,0) sentinel dropped, 397 sites published without coordinates. The root failure is `or 0`. (C1, C2, C3)
- **Identity by exact key; evidence is not identity.** The Slough guard, the proximity rule ("never uses proximity to claim
  identity"), the 612 ABSTAIN relationship slots, a company number or nothing. The anti-pattern is the NESO prefix
  fallback that bound a papermill to an offshore wind farm. (C2)
- **Agent cannot consent; authorisation travels inside the artefact.** (C1)
- **A check must be able to fail.** The `--stdout` repair, the empty CI list refused, the gate that never woke, 17 of 18
  mutants caught, a checker that must fail 33 broken copies before it may pass. (C1, C4)
- **Budget as law.** 500,000 bytes per cartridge, 80,000 for offtakers, 64,781 for lightning, derived by arithmetic and
  raised only by an owner-dated commit; nine active workflows, a registry that must equal the directory. (C1)
- **Pin by commit, digest and length.** Strongest in the gridatlas PINS block; weakest where a fetch records a new digest
  and never compares it with the old one. Both ways a pin fails are in this edition: left on the wrong commit, and a
  digest that moves with no content change. (C3)
- **Append-only, enforced by mechanism.** File mode `a`, `wx` writes, six-file generations, 13,178 wafer rows added and 0
  deleted over 118 commits, rollback as a forward cut. (C1, C3, C4)
- **Refuse on an empty denominator.** A harvest that missed one fifth writes nothing; a dead runner may not say immune. (C3, C4)
- **Lift, do not rewrite.** Thirteen copies of the law, one digest; the constant imported, never copied. (C4)
- **Immutable dated folders, one mutable pointer.** The same shape in gridatlas `atlas/current.json`, pipelinenews
  `releases/current-v4.json` and the Kuiper's `learn-the-kuiper/index.html`. (C4)
- **Name the chirality.** Two golden spirals exist in the estate, mirror images; reconcile with `1 - frac`, never with a
  second constant. This edition's generator and viewer follow the wafer. (C4)
- **Decide at the source, carry in the link, assert in the receipt.** (C4)
- **Law-by-code drift.** The Kuiper's tools implement L9 fully, L3, L5, L6, L8 and L10 in part, contradict L1, L2 and L7
  for the belt, and nothing implements L4. The sentence carried inside an output can be wrong (`wafer-meta.json` says
  `sqrt(key)`; the code computes `sqrt(key + 0.5)`). (C3)

## The history, in brief

From `proof/history-timeline.tsv` and the keyed history sections of the chapters.

- **GridAtlas**, 311 commits in the clone from 2026-09-01 to 2026-10-29, no bot commits, two storms: 1 to 5 September
  (177 commits) and 27 to 29 October (83, of which 61 on 29 October). 63 per cent of commits land between 21:00 and
  04:59 UTC. There are no `Revert` commits; every rollback is a pointer move, and the first lightning layer was pulled
  55 minutes after it shipped (`1eb6414`, `c09d199`). The three latest releases took 3 h 44 m, 37 m and 2 h 56 m from
  preview to pointer. Generation 202610292044 (v9.187) is the data-centre release.
- **data-grid-gb**, 15 commits on three days; the baseline moved from 204 to 227 sites at `69b566d` (21:36:03Z on
  29 October) and was vendored into GridAtlas 94 seconds later (`d3f4eb1`).
- **data-centres-gb**, 13 commits by one author; it began on 2026-07-29 as a live Data Center Map scraper and turned to
  OpenStreetMap only at `0f4e8ac` on 2026-08-28, when three production runs failed in one day and each successor cited the
  failed run it repaired.
- **kuiper-belt**, 234 commits, complete history: 146 by the engine bot (62 per cent), 88 by humans on five days only
  (18 and 19 September, 26 September, 4 and 5 October). The engine runs on `17 */6 * * *`, six-hourly, not hourly, with a
  measured mean of 6.94 hours; `cosmos/wafer.tsv` only ever grows. The 4 and 5 October burst of 21 commits produced
  thirteen dated editions, nine of learn-the-kuiper, one astra-codex, three see-through.
- **pipelinenews**, 521 commits before this swarm, from 2026-08-24 to 2026-09-26 over 22 active days, busiest
  2026-09-01 with 82. 39 "Refresh BBC RSS metadata [skip ci]" commits by the bot from 2026-09-06 to 2026-09-13. The last
  ten commits added priority solar sources; the eleventh, `67aa2eb`, restored the tree of `4980096` exactly and gave no
  reason.
- **globalgrid2050**, the shepherd: 304 commits in the window from 2026-09-16, 48 per cent made between midnight and
  05:00, 61 per cent carrying a Claude co-author trailer, 5.55 GB of which 92.9 per cent is data by distinct bytes.
- **Across the estate**: 3,324 commits, 2,060 by the owner's account, 621 by github-actions, 86 by Claude, 14 by Vikram
  Kumar; 34.8 per cent automated once the engine, watcher and nightly bots are counted. `stars` is 300 of 300 bot commits
  from one unchanged source, because a timestamp defeats its change-only check.

## GridAtlas and the data centres, as of 2026-10-31

Live is generation 202610292044, v9.187, on loader v2. Its offtakers module is 71,191 bytes under the owner's 80,000-byte
ceiling, rebuilds byte for byte from `tools/offtakers/src`, and all six cartridges hash to what `atlas/current.json`
records. The data-centre overlay draws 225 of 227 records in the pinned file, whose SHA-256 (`176c1b2e…2d89`) ties
GridAtlas to data-grid-gb's dc-a7 lane; the status split is 202 operational, 12 announced, 8 in planning, 4 consented,
1 unknown. The 30/30/30 engine is built on the substation finder E1, whose five September capsule hashes still match the
live bytes. Grid connection MW is known for 2 of 227 sites; IT load is kept apart from connection capacity and neither is
ever summed. Real-Chromium smoke of the overlay passed at 393x852 and 1280x800 and, independently, at four viewports.

## Candidates for the owner

These are findings the controllers confirmed by re-running them. They are not claims about what should change; the
decision is the owner's. Chapter and status in brackets.

1. Wapseys Wood (PINS EN0110030) is two records in the 227, because "Slough Holdings UK Limited" and the same name with
   "(SDC Capital Partners)" normalise differently under the Slough guard. 226 distinct sites; 225 mappable stands. (C2, CONFIRMED)
2. `atlas/current.json:886` says "203 sites" while lines 771-772 of the same live pointer say 227 features, 225 drawn. A
   note change moves the pointer, so it is a release, not an edit. (C1, CONFIRMED)
3. The live substation-intelligence cartridge pins data-grid-gb at `1c9909d`, before correction `b91e45b`: at the pin
   Cowley has 10 transformers and 502 sites are located; at HEAD 5 and 489. The cartridge's own comment describes the
   correction the pin does not carry. (C3, CONFIRMED)
4. REPD reference 34 "Caledonian Papermill" (biomass) is bound to "Caledonia Offshore Wind Farm", Greens 400 kV, 600 MW,
   in the lean NESO file the live SLD loads, through the normalised-prefix fallback (294 of 769 matches). (C2, CONFIRMED)
5. Thirty-six registry rows sit on the National Grid false origin because of `or 0`. (C2, CONFIRMED)
6. The annual offshore reconcile workflow passes `--root`, which the rewritten tool no longer accepts; the February run
   will fail at the argument check. (C2, CONFIRMED)
7. Six of 44 workflow `uses:` lines are mutable tags, including the PR #75 Chromium smoke's upload-artifact. The
   data-centre browser smoke is gated to PR #75 only; after it closes no active workflow runs a real browser on the
   overlay unless a repository setting changes. (C1, CONFIRMED in repo, settings UNVERIFIED)
8. data-grid-gb's README says its verifier fails if the disclaimer sentence is removed; the verifier tests two substrings
   and still passes with the sentence deleted. Three bot refreshes moved the network digest with no content change
   because a set is iterated unsorted. (C3, CONFIRMED)
9. Lane ids collapse to "out" for dc-a2 and dc-a4; all 258 source entries read `licence_status: unverified` while three
   lanes are declared open; METHODS.md says 190 OSM sites against 212 counted. (C2, CONFIRMED)
10. In the Kuiper: `entangle_hosts.mjs:119` builds its regex inside a template literal, so `[\s\S]` becomes `[sS]` and
    never matches; the README drift block is frozen at 2026-09-18 while DRIFT.md is 2026-09-19. Proof digests match 5 of
    22 at HEAD and 22 of 22 at the parent of the redaction commit `84e4483`: the commit, not the tree, is the receipt.
    `swarm.py:134` passes a check that examined nothing. The README's State section still says `estate.py` is not yet
    written. (C3, CONFIRMED)
11. The Kuiper's two placement laws are mirror images (estate.py +137.51 degrees, the wafer +222.49) and
    `SPEC-INFINITE.md:46`, `index.html:79` and `wafer-meta.json:12` state `sqrt(key)` where the code computes
    `sqrt(key + 0.5)`. No tool computes L2 (hops). (C3, C4, CONFIRMED)
12. The shipped learn-the-kuiper zip has CRLF line endings in 10 of 26 files and no builder in the repository; the
    fidelity receipt `kuiper-law.js:62` cites was deleted in `55db60c`, which also edited every earlier dated folder. (C4, CONFIRMED)
13. cvaa's registry refuses itself at HEAD (41 vaccines, 40 locked) and exits 0 on skipped rules. `stars` has 198 commits
    from the same unchanged source. pipelinenews release 202609010836 has 12 table headers over an 11-cell row template,
    and a bot rewrote seven immutable compilers in place so one no longer matches its manifest hash. (C4, CONFIRMED)
14. Two Earth radii coexist in the shipped offtakers module and in two gridatlas tools (6371.0088 and 6378.137); no
    30-list is affected. (C1, C2, CONFIRMED)

## What this edition does that earlier editions did not

It places lines, not files or repositories, so every body is a quotation with a destination, and the dim count is zero
by construction. It follows the law the wafer ships rather than the law the documents state, prints both in
`rules.txt`, and draws with y up so the belt winds the same way as the wafer. It carries its own denominator, its own
duplicate count and its own history table, so every coverage claim has something to be divided by. It ships the register
that produced it, so the belt can be rebuilt by anyone from `register.tsv` and the clones.

What it does not do, by the owner's rule: it does not move the learn-the-kuiper or see-through pointer, does not touch
any earlier dated folder, and is not published. It lives on branch `edition/202610311905` of kuiper-belt and branch
`kuiper-edition-202610311905` of pipelinenews until the owner has read it.

## Limits

Clones were shallow at 300 commits for most repositories (pipelinenews and kuiper-belt are complete); history before the
graft is unseen and said so where it matters. Workers had no GitHub API: every PR comment, Actions run and repository
setting is UNVERIFIED unless the clone holds it. globalgrid2050 was read selectively. The swarm's own text is a candidate
until a key confirms it; where a worker's number was wrong, the controller's correction is in the chapter and the
register carries the corrected value.

## Provenance and licence

See `NOTICE.md`. Code here is Apache-2.0; documentation, the register and generated data are CC BY 4.0; every quoted
line keeps the licence of the repository it is keyed to. The placement law follows H. Vogel (1979) and the golden-ratio
multiplier of D. E. Knuth (TAOCP vol. 3, section 6.4). Illustrative only: not a design study. Provided as is, without
warranty.
