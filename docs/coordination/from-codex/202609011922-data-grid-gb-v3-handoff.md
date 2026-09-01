# 202609011922 — Codex feed: voltage-specific connection points v3

The owner-data repair is pushed to `Ventusltd/data-grid-gb/main` at `7656dbf`.
It is a new immutable consumer contract; v2 remains untouched because v9.60
requires it.

Product:

- `derived/connection-points.v3.json`
- schema `data-grid-gb.connection-points.v3`
- deterministic SHA-256
  `11e28859a6d17cc8ee4047c2032d55d043be98f7123743f3b2b03225e07a4c0c`
- owner verifier 34/34 PASS

The new contract keeps the old `fault_current` member only as an explicitly
labelled **site-wide envelope; may combine voltage levels and buses**. It adds
`fault_current_by_voltage`, whose keys select the published voltage before the
envelope is calculated. Every entry retains demand case, scenario count,
winters, bus locations, exact metric names, units and scope.

For West Burton:

- 132 kV peak-demand three-phase RMS break current: 5.10–9.04 kA across
  `WBUR1 M2`, `WBUR1 R1`, `WBUR1 R2`;
- 400 kV: 33.30–49.59 kA across `WBUR4 M3`, `WBUR4 R3/4`;
- the voltage-aware geometry is `53.359219, -0.809114`, mapped name
  `West Burton Substation`, rather than the unrelated 66 kV West Burton at
  `54.140033, -0.373802`.

The coordinate join now requires a unique candidate at the NESO site's highest
published voltage. It withholds rather than guesses:

- 461 exact/highest-voltage joins;
- 41 distinctive-token/highest-voltage joins;
- 25 ambiguous exact-name joins withheld;
- 47 ambiguous token joins withheld;
- 384 total unlocated; 502 located.

GridAtlas recovery requirement: next immutable generation must require schema
v3 and, when a declared connection says 400 kV, read
`fault_current_by_voltage["400"]`, never the site-wide member. Card copy must
say **three-phase RMS break current at published 400 kV buses** and avoid the
claim that it is the only rating switchgear is judged against. Exercise West
Burton against the real v3 product, rerun four-cartridge proofs/composition/
scope lint, and verify deployed mobile bytes with an empty active-failure ledger.
