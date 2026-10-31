# Fix brief for the five Fable design agents (F1..F5), NL-007

Mission from the owner: design, in public on the neural-link issue NL-007, the fix for the highest-priority
candidate of Kuiper edition 202610311905, then write the detailed fix plan into the neural-link repository so that
ten pairs of Opus implementers can carry it out in 20 steps.

## The fix, as the harness recommended it (your job is to improve or overturn it with evidence)

1. data-grid-gb: canonicalise the operator string before the exact match so that "Slough Holdings UK Limited" and
   "Slough Holdings UK Limited (SDC Capital Partners)" are one operator, while Digital Realty and Global Technical
   Realty at Slough stay two. Add a false-split test beside the false-merge test. Rebuild dc-a7; expect 226 records,
   225 mappable, 1 unplaced (Ebbsfleet). Keep every pin in lanes/MANIFEST.json consistent. Decide whether the lane-id
   collapse to "out" (dc-a2, dc-a4) and the METHODS.md 190 vs 212 count ride along or are out of scope.
2. gridatlas: vendor the corrected file with a new stamp, move DCF and DCFSHA in tools/offtakers/src/01-data.js:19,
   rebuild the module byte for byte under the 80,000-byte budget, update the browser smoke expectation (225 stays), cut
   a new generation per docs/RELEASE.md with a composition_note that states 226/225 and no longer says 203, publish a
   preview, and stop at owner acceptance (step 3). Decide whether the Cowley pin move (substation-intelligence
   cartridge 202609062358 pinned at data-grid-gb 1c9909d) rides the same generation or a following one, and what it
   needs first (sorted node_names in data-grid-gb so the network digest is stable).

## What you must read before posting (clones are read only)

- /home/user/estate/data-grid-gb: datacentres/lanes/dc-a7-merge/dcmerge.py (norm_operator:87, operator_match:122,
  cannot_link:262, the cluster loop near :337), tests/ for dcmerge (52 tests), lanes/MANIFEST.json, lanes/lanes.json,
  datacentres/README.md, docs/METHODS.md, derived/build_connection_points.py and the network build (unsorted set),
  .github/workflows (the bot refresh).
- /home/user/estate/gridatlas: tools/offtakers/src/01-data.js (DCF, DCFSHA, DMW), 06b-dc-engine.js, build.mjs,
  generations.json, tools/lightning/make-generation.mjs, docs/RELEASE.md (eight steps), tools/release/*.mjs
  (publish-preview, acceptance, release-accepted, pr-gate), tools/scope/lib.mjs and loop.mjs (budgets, ACTIVE_WORKFLOWS),
  tools/proofs/browser-dc-smoke.mjs, atlas/current.json (:771-772, :886), atlas/cartridges/202609062358-substation-
  intelligence-v9-63.js:4012-4057 (the pin block), AGENTS.md, CLAUDE.md.
- The edition's chapters C1, C2, C3 and registers under /home/user/pipelinenews/kuiper-edition/202610311905/chapters.

## Rules

- PROTOCOL.md envelope on every comment; ≤400 words; every code claim keyed `repo@sha path:line`; public facts only;
  no local paths, no personal data. Use the GitHub issue-comment tool to post on Ventusltd/neural-link-between-agents
  issue NL-007 (number given in your prompt). If posting fails, return the comment text to the harness.
- Clones stay read only in this phase. You may copy files to /tmp to try a change and run the tests there; say so.
- A design claim about behaviour ("this canonicalisation keeps Slough separate") is a candidate until you ran it on a
  /tmp copy and quote the result.
- Three rounds; the harness tells you when each round opens. Do not post a round before it opens.
- Each round, also append your post to /home/user/pipelinenews/kuiper-edition/202610311905/fix/<F#>-round<N>.md.

## The consolidated plan (F1 writes it in round 3)

File: FIXES/202610311905-datacentre-baseline.md in the neural-link repository, committed on main by F1 with
`git -C /home/user/neural-link-between-agents` (fetch origin main first, commit, push; the harness has push access).
Sections: Decision summary; Facts (keyed); Design (data-grid-gb; gridatlas; what is out of scope and why); Tests
(existing, new, and the byte-identity and browser checks); Release path (RELEASE.md steps, where the owner acts);
Risks and rollback; The 20 steps for ten pairs (P1..P10), each step with: repository, branch, exact files, the check
that proves it, the artefact it hands to the next step, and which agent of the pair implements and which verifies;
Owner decisions required before step 1.
