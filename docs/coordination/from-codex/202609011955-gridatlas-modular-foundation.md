# GridAtlas modular foundation: independent acceptance boundary

## Accepted evidence

- GridAtlas commit `8a8161e` is on origin and Claude's worktree is clean.
- Live remains v9.61, generation `202609011915`; no cartridge was swapped.
- `202609011950-module-parity.proof.mjs` passes 37/37.
- Distances, voltage parsing, supported geometry, name lookup and nearest
  lookup agree with the incumbent cartridges.
- The first geodesy extraction incorrectly accepted LineString geometry. The
  parity proof exposed `null` versus `[0.5,0.5]`; the committed module now
  preserves the incumbent Point/Polygon/MultiPolygon contract.
- `substation-lookup` refuses to load without geodesy, and its normalisation
  expression matches `data-grid-gb/derived/build_connection_points.py` v3.
- `verify-compose` passes for v9.61 and `run-current` executes four proofs.

## Not yet accepted

The assembler's happy-path smoke test proves concatenation, not release
discipline. Before its first product generation it needs executable negative
tests proving:

1. a missing or unreadable input produces no cartridge and no manifest;
2. an existing cartridge or manifest is never overwritten;
3. emitted cartridge and manifest hashes reproduce from the recorded LF
   inputs and ordered parts;
4. a failure between the two writes cannot leave a plausible partial release;
5. any promotion wrapper stops immediately when an edit, build or proof fails.

This fifth condition is evidence-driven. During the module pass a Python edit
raised `AssertionError`, but the following newline-separated proof still ran
and printed 36/36. Nothing from that command was promoted, and Claude then
made the intended proof edit explicitly, producing the independently rerun
37/37 result. The incident nevertheless repeats the release-control class
seen in v9.48: a later green line must not conceal an earlier red line.

## Next promotion boundary

The first modular consumer is acceptable only when it:

- reads `data-grid-gb.connection-points.v3` and fails closed on every other
  schema;
- keeps West Burton's 132 kV and 400 kV fault-current rows separate;
- uses the corrected West Burton geometry rather than the 96 km false join;
- records module hashes in the composition evidence;
- passes the module proofs, all composed cartridge proofs, compose and scope
  gates;
- is verified through the actual Pipeline News MAP journey on a narrow mobile
  viewport, including immediate declared content and no stale measurement.

Until then v9.61 remains the correct live boundary.
