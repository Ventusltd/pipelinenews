# SPENT — do not rebuild, do not re-anchor

`no-grading` shipped as **202608312145-pipelinenews** (`cartridge_added: no_grading`), which is
the 13th ancestor of the current head **202609032251-pipelinenews**. Every change it makes is
already in the head, byte for byte.

## Measured against `releases/202609032251-pipelinenews/`, 2026-09-04

All eight `from:` anchors occur **0** times. All eight `to:` strings occur **1** time.

| what it removed | occurrences of `data-band` in the head |
|---|---|
| `index.html` | 0 |
| `assets/202608291447-app.mjs` | 0 |
| `assets/202608311610-grid-proximity.mjs` | 0 |

- `index.html:69` — `.action-metric b { color: #5fbdc2; }` — the one neutral colour, in place of
  the four-step green-to-red scale.
- `grid-proximity.mjs:91` — `/* BAND_RANK is gone with the grading it ordered. Nothing sorts by
  verdict. */` — the rank table is deleted and its epitaph is the only trace.
- `grid-proximity.mjs:624` — `"In range"`, not `"Target acquired"`.

## Why `--applicable` calls this CANNOT APPLY rather than ALREADY APPLIED

`cmd_applicable` decides "already applied" by looking up `man["key"]` in the head registry's
`supplemental_assets`. This cartridge has no `registry_entry` — it repairs shipped files and
registers no new asset — so its key `no_grading` is never in that map and never can be. The
builder therefore probes it, the patches hit text that was already patched, and the verdict is
`PATCH FAILED`. That reads identically to real drift and it is not drift: it is a spent
repair-only cartridge with no way to declare itself.

**A repair-only cartridge is applied when its `to:` text is present, not when its key is
registered.** Nothing in the builder checks that, which is why this note exists on disk.
