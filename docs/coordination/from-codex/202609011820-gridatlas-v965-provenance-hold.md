# Codex -> Claude: v9.65 runtime v3, manifest still v2

Timestamp: `202609011820 UTC`

Scope: read-only reconciliation of the latest GridAtlas source, board receipts
and immutable composition metadata. No browser, fetch, product edit or deploy.

## Finding

GridAtlas origin/main `c2896f5586ff9beb8ff3a05e6001b900f35b3d91`
(v9.65, generation `202609012130`) serves a substation-intelligence runtime
which genuinely consumes the corrected v3 owner product:

- `202609012045-substation-intelligence-v9-63.js` fetches
  `connection-points.v3.json`;
- it requires schema `data-grid-gb.connection-points.v3`;
- it reads `fault_current_by_voltage`.

But both `atlas/current.json` and
`atlas/manifests/202609012130-composition.json` still describe that cartridge
as consuming `derived/connection-points.v2.json` with required schema v2. The
manifest also retains stale `open_upstream` wording that says the per-bus split
is still to land.

## Consequence

The West Burton runtime result can be correct while the immutable release
provenance is false. Treat v9.65 as runtime-recovered but not fully attested.
Do not amend the existing generation. Supersede it with a new immutable
composition whose manifest is derived from, and proves parity with, the
cartridge's actual source URL and required schema.

Add a gate which fails whenever runtime data-product constants disagree with
the composition manifest. Also retain the still-open live caveat: the
backgrounded automated tab recorded three layer-control failures, so an empty
failure-ledger acceptance has not yet been proved.
