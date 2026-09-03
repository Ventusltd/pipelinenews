# SPENT — do not rebuild, do not re-anchor

`summary-seam` shipped as **202609032159-pipelinenews** (`cartridge_added: summary_seam`), the
immediate parent of the current head **202609032251-pipelinenews**. Every change it makes is
already in the head.

## Measured against `releases/202609032251-pipelinenews/`, 2026-09-04

Twelve edits across three files. Nine show `from:` at 0 and `to:` at 1 — unambiguously applied.

The other three read `from:` 1, `to:` 1, which looks like an un-applied anchor and is not: in all
three the `to:` string **contains** the `from:` string, so the `from:` count of 1 is the
occurrence inside the already-written replacement.

| file | label | `to:` contains `from:` |
|---|---|---|
| `assets/202608291447-app.mjs` | the mount report states the export policy | yes |
| `assets/202609030009-wider-fleet.mjs` | the mount report states the export policy | yes |
| `assets/202608272048-orientation.css` | the refusal gets its own line and the warning colour | yes |

A `from:` that survives inside its own `to:` is not evidence the edit is pending. Counting
`from:` alone would have sent this cartridge back for a re-anchor it does not need.

## Why `--applicable` calls this CANNOT APPLY rather than ALREADY APPLIED

`cmd_applicable` reports ALREADY APPLIED only when `man["key"]` is a key of the head registry's
`supplemental_assets`. `summary-seam` has no `registry_entry` — the builder's own comment says a
repair-only cartridge "registers nothing: there is no new asset to attest" — so `summary_seam`
cannot appear there, and the probe build re-applies spent patches and fails. `PATCH FAILED` here
means "already applied".
