# Kuiper edition 202610311905 — swarm brief

Written 2026-10-31T19:05:00Z by the controlling harness (Claude, Fable 5.1, session
https://claude.ai/code/session_015ELZDBhAFNgtcsrTUSi1vm). Mission from the owner (Vikram Kumar,
Ventus Ltd): map the whole Ventus / GLOBALGRID2050 estate against the Kuiper code, find the best and
most interesting code lines and patterns, study the git history, and prepare a new Kuiper edition.
Focus: **gridatlas** and **datacentres**.

## The swarm

- 5 controllers (Fable 5.1): C1..C5. Each verifies 4 workers and writes one chapter.
- 20 workers (Opus): W01..W20. Each owns one slice, reads code, writes one findings file.
- Public channel: https://github.com/Ventusltd/neural-link-between-agents issue NL-006.
  Controllers' messages are posted there by the harness. Local channel: this folder.

## The law every agent obeys (from kuiper-belt/README.md, the first 3,000 characters)

1. **No claim without a key.** Every finding carries `repo@<40-char commit> path:line`. The commit is
   the HEAD of the local clone you read (`git -C <clone> rev-parse HEAD`). A statement without a key
   is written under a heading `Candidates`, or not at all.
2. **Quote the line.** Paste the actual line(s), at most 12 lines per finding, verbatim.
3. **Times carry offsets.** `2026-10-31T19:05:00Z`, never a bare clock.
4. **A check that examined nothing refuses.** If a file is missing or a tool fails, write `UNVERIFIED`
   and what failed. Never "as expected".
5. **Do not reason from ABOUT.md** in kuiper-belt. It is history, not input.
6. **Read only. Change nothing** in any clone. No git checkout, no git fetch, no edits, no pushes.
7. **No secrets, no personal data** in anything you write: it will be published.

## Where the estate is

Clones (read only) under `/home/user/estate/<repo>` and `/home/user/pipelinenews`. HEADs, commit
counts, tracked files and text line counts: `proof/inventory.tsv` in this folder. Clone depth is 300
commits for most repos (pipelinenews is full history, 521 commits). GitHub API is NOT available to
workers; the local clone is the source.

Key repos and what they are:
- `gridatlas` — Grid Atlas V9, the live map (https://ventusltd.github.io/gridatlas/). Immutable shell
  plus hashed cartridges; `atlas/current.json` is the live pointer (generation 202610292044, v9.187,
  the data-centre Grid Engine 30/30/30 release). `tools/offtakers/src/06b-dc-engine.js` is the
  data-centre engine. `docs/RELEASE.md` is the eight-step release flow. `AGENTS.md` is the contract.
- `data-grid-gb` — NESO ETYS network products (886 connection points, 1,392 circuits) and the
  `datacentres/` lanes dc-a1..dc-a7 (NESO, planning, gov, OSM+Wikidata, DNO, merge) that produced the
  227-site UK data-centre pipeline (225 mappable).
- `data-centres-gb` — the earlier provenance-first OSM Overpass data-centre producer (fail closed,
  byte-identical Parquet twice, ABSTAIN relationships).
- `kuiper-belt` — the Kuiper itself: README (law), LAWS.md (L1..L10), SPEC.md, tools/estate.py,
  tools/wafer_keys.py, tools/key.py, cosmos/*.tsv (hourly engine), learn-the-kuiper/<stamp>/ and
  see-through/<stamp>/ dated editions, estate-network.json / kuiper-network.json (the wafer contract).
- `maths` — the Kuiper placement law from first principles (r = sqrt(k), theta = k * 2654435769 mod 2^32).
- `worlds-` — golden spiral <-> Hilbert curve slider, 4,590 string designs, geometry verified 0.000e+00.
- `pipelinenews` — the renewables pipeline (this working directory), 521 commits, atlas deep links.
- `globalgrid2050` — the shepherd (5.6 GB, 47,277 files). Read selectively; never cat large data.
- Others: time-stone, stars, star-maker, galaxies-wafers, testcode, particle-physics-drawing-engine,
  ventus-grid-engine, gridmachine1, grid-distance-maths, energy-transition-simulator, cvaa, elements,
  code-generator, kuiper-drawing-engine, kuiper-ship, substations, trillion-loop, data-gridatlas.

## Worker output

Write exactly one file: `workers/W<NN>-<slug>.md` in this folder. Structure:

```
# W<NN> <slug>
HEADS: <repo>@<sha> ... (every clone you read)
READ: <paths read, one per line>

## Findings (keyed)
### F1 <title>
KEY: <repo>@<sha> <path>:<line>[-<line>]
QUOTE:
```<lang>
<verbatim lines>
```
WHY: <why this is among the best or most interesting lines in the estate; what it protects, proves or enables>
PATTERN: <name of the reusable pattern, if any>

## Patterns (keyed; each cites at least one F above)
## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)
## Gridatlas and datacentre relevance (how this slice bears on the focus)
## Candidates (unkeyed; clearly marked)
## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)
## One next command (exactly one, runnable from a clone)
```

Aim for 8–20 findings, ranked best first. Depth beats breadth. Prefer lines that: enforce a law
(fail closed, refuse, hash, budget), make something reproducible, encode a mathematical rule, or
show a turning point in the history. Count things when you can (grep -c, wc -l, git rev-list --count)
and cite the command.

## Controller output

Each controller re-resolves every KEY of its four workers against the clones (`git -C <clone>
rev-parse HEAD` must equal the sha; `sed -n '<line>p' <path>` must contain the quoted text). Report
`keys verified N of M`. Drop or mark UNVERIFIED anything that fails. Then write
`chapters/C<N>-<slug>.md` and a neural-link comment in PROTOCOL.md envelope form.
