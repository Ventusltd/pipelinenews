# SPENT — do not rebuild. `--applicable` says APPLIES and it is wrong.

`wider-fleet-proximity` shipped as **202609032251-pipelinenews**
(`cartridge_added: wider_fleet_proximity`) — the current head itself. Everything it does is
already in that release.

## This is the dangerous one of the seven

The other six repair-only cartridges report **CANNOT APPLY / PATCH FAILED** when they are
spent. This one reports **APPLIES**, because its whole operation is idempotent: it replaces a
payload file wholesale and sets one `registry_repairs` string. Re-applying it writes bytes that
are already there, every digest re-derives to the same value, and the builder's own `--check`
passes. **The six fail closed. This one fails open.** A lane trusting `--applicable` would cut
an empty generation and the self-check would bless it.

## Measured against `releases/202609032251-pipelinenews/`, 2026-09-04

The cartridge's payload and the release's payload are the same file:

| | sha256 of published (LF) bytes |
|---|---|
| `cartridges/wider-fleet-proximity/data/202608311610-grid-proximity.json` | `beb5e940d005e466…` |
| `releases/202609032251-pipelinenews/data/202608311610-grid-proximity.json` | `beb5e940d005e466…` |

- Registry `supplemental_assets.grid_proximity.payload.record_count` is already **4138**.
- The `presentation` string the cartridge's one `registry_repairs` entry sets is already in the
  registry, **byte-identical**.
- The payload's own `widened_from` block records the widening as done:
  `parent_record_count: 3047, added: 1091`.

A rebuild would therefore change `release-manifest.json` (generation, release_id,
parent_release_id) and the one line of `sha256sums.txt` that is the digest of that manifest.
**Zero bytes of shipped content.**

## Why `--applicable` cannot tell

`cmd_applicable` decides ALREADY APPLIED with `man["key"] in cartridge_keys(parent)`, and
`cartridge_keys` reads the head registry's `supplemental_assets`. This cartridge registers no
asset of its own — it corrects the existing `grid_proximity` entry through `registry_repairs` —
so `wider_fleet_proximity` is never a key there and never can be. The probe therefore builds it,
and the build succeeds, because there is nothing in it that can notice it has already run.

**A repair-only cartridge needs an applied-test of its own: its `from:` anchors present and its
`to:` state absent. Registration is not that test, and for a payload replacement neither is a
successful build.**

## The seam this cartridge opened, which is still open

Widening `grid-proximity.json` to 4,138 rows did not widen the two payloads the **table**
column reads. On this same release:

| payload | refs |
|---|---|
| `data/202608311610-grid-proximity.json` (the panel) | 4,138 |
| `data/202608311800-grid-distance.json` (`gridDistance`, the GRID column) | 3,047 |
| `data/202608311858-substation-33kv.json` (`substation`, the SUB column) | 3,047 |

`grid-distance.json` says of itself: *"The column shows the panel's own number. It is carried
across, not recomputed, so the two can never disagree."* They now disagree by 1,091 rows. That
is a separate cartridge and a separate argument; it is recorded here because this release is
where the gap opened.
