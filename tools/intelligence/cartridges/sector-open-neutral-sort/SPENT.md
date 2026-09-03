# SPENT — do not rebuild, do not re-anchor

`sector-open-neutral-sort` shipped as **202608312212-pipelinenews**
(`cartridge_added: sector_open_neutral_sort`), the 11th ancestor of the current head
**202609032251-pipelinenews**. Every change it makes is already in the head.

## Measured against `releases/202609032251-pipelinenews/`, 2026-09-04

All three `from:` anchors occur **0** times; all three `to:` strings occur **1** time.

- `assets/202608312109-sector-intelligence.mjs:4` —
  `const PAYLOAD_GENERATION = "202608272130";` — module identity is separated from payload
  identity, which is the whole point of the repair: the module's own generation moves with the
  release and the payload's does not.
- `assets/202608312109-sector-intelligence.mjs:135` —
  `if (payload.schema !== PAYLOAD_SCHEMA || payload.generation !== PAYLOAD_GENERATION) throw ...`
  — the immutable payload is validated against its own generation, not the module's.
- `assets/202608311610-grid-proximity.mjs` — the distance ordering is described without judging
  connection quality.

## Why `--applicable` calls this CANNOT APPLY rather than ALREADY APPLIED

`cmd_applicable` reports ALREADY APPLIED only when `man["key"]` is a key of the head registry's
`supplemental_assets`. A repair-only cartridge registers no asset, so its key is never there.
The probe build then runs the patches against text that already carries them and reports
`PATCH FAILED`, which is indistinguishable from real anchor drift without checking the `to:`
strings by hand — as this note does.
