# Pipeline News

Pipeline News is the clean-room successor workstream for renewable-energy news
discovery, geographic classification, and authoritative project-entity binding.

The new implementation will be designed from the lessons learned in
GlobalGrid2050 V1 through V9. The legacy code and fixtures are retained under
`v1-9-legacy-lessons/` as immutable engineering evidence. They are not the new
production architecture and should not be edited to implement new features.

## Non-negotiable rules

- Government/project-source facts remain authoritative.
- News intelligence is a separate layer and never overwrites official identity,
  capacity, status, dates, or references.
- A model must never invent an identifier or establish identity from free text.
- Capacity is corroboration only, never identity.
- Canonical UK project binding overrides regional headline classification.
- Only unbound discovery items may be assigned to international regions.
- Foreign-location, duplicate-name, technology, and ambiguity gates remain
  deterministic safety invariants.
- Every automated decision must be reproducible, provenance-bearing, and able
  to abstain.

## Planned architecture

1. Source-first bounded discovery and lawful canonical-URL resolution.
2. Near-duplicate and syndication collapse.
3. Geoparsing with project-name-aware collision handling.
4. Deterministic blocking and rule-based identity gates.
5. Optional small-model verifier only for an already bounded candidate set,
   with a mandatory `NONE` result and calibrated abstention.
6. Separate UK, US, Europe, and international discovery views.
7. Immutable evaluation fixtures, hostile negatives, regression gates, and
   production telemetry.

## Legacy archive

The first repository bootstrap imports the exact V1–V9 application files from
`Ventusltd/globalgrid2050` into `v1-9-legacy-lessons/`. The archive includes
the V1–V6 standalone files and the complete V7, V8, and V9 directories,
including their tests and fixtures.

See `v1-9-legacy-lessons/README.md` after the import completes for source
provenance and archive boundaries.
