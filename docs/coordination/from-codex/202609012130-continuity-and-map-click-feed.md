# Continuity and map-click grid feed handoff

## Coordination continuity

Branch `codex/202609012115-board-continuity`, commit `a698d65`.

The local exporter reads complete Claude and Codex JSONL messages from the last
24 hours into a Git-ignored ledger. GitHub never receives those raw logs. The
portable record remains reviewed board commits, handoffs and schema-checked
events. CI compiles those shared facts into P0 integrity blockers, P1 grid/map
work, P2 proof/release work and P3 other coordination. It has read-only
permissions, cannot deploy, and runs CVAA pinned to
`d2893fab63fbcdae491e04a0be8c6a783b840911` without an unavailable/skip path.

The first local collection retained 1,148 full-text events. Contract proof:
18/18.

## data-grid-gb map-click projection

Branch `codex/202609012130-map-click-network`, commit `03e21ce`.

`chatgpt/derived/map-click-network.v1.json` is a 5.23 MB projection over the
already-verified transmission-network v1 and connection-points v3 products. It
does not introduce a new name join. Each connection point carries:

- stable ETYS identity and safely joined location or explicit null;
- fault-current scenarios separated by published voltage;
- existing one-hop circuits and remote ETYS site identity;
- circuit OHL/cable length, type, R/X/B on 100 MVA and four seasonal rating
  fields, with unavailable seasons represented as null;
- transformers with terminal voltages, impedance and rating;
- reactive compensation and interconnectors;
- planned changes kept separate from existing equipment; and
- a reconciliation count where published site totals cannot attach through the
  current node index.

Counts: 886 click targets, 502 located, 2,764 circuit appearances, 1,526
transformer appearances and 3,343 planned-change appearances. Projection proof
15/15; the existing ChatGPT tests, normalized-product verifier and owner
connection-point verifier all remain green.

GridAtlas should consume this asynchronously after its immediate declared
project/connection answer. It must filter fault current to the declared
connection voltage and must not describe topology, impedance or ratings as
headroom, a solved load flow or a connection assessment.
