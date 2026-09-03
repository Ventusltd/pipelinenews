# SPENT — do not rebuild, do not re-anchor

`phone-first-heights` shipped as **202608312202-pipelinenews**
(`cartridge_added: phone_first_heights`), the 12th ancestor of the current head
**202609032251-pipelinenews**. Every change it makes is already in the head.

## Measured against `releases/202609032251-pipelinenews/`, 2026-09-04

All five `from:` anchors in `assets/202608270055-v8-fast.css` occur **0** times. All five `to:`
strings occur **1** time. The dynamic-viewport fallback pairs are all present:

- `body{display:flex;height:100vh;height:100dvh;...}` — the desktop shell measures the viewport
  that is actually visible, with the static height left in front of it as the fallback.
- `@media(max-width:768px){body{...height:auto;min-height:100vh;min-height:100svh}...}` — on a
  phone the body grows instead of being pinned.
- `.paper{height:min(68vh,760px);height:min(68dvh,760px);...}` and, inside the phone query,
  `.paper{height:65vh;height:65dvh;...}` — the newspaper pane tracks the toolbar.
- `.tablewrap{...max-height:65vh;max-height:65dvh}` — the table pane likewise.
- Line 309/310 of the same file carry `body{height:100dvh}` and
  `@media(max-width:768px){body{height:auto;min-height:100dvh;...}}`.

## Why `--applicable` calls this CANNOT APPLY rather than ALREADY APPLIED

Same cause as the other repair-only cartridges: `cmd_applicable` tests
`man["key"] in supplemental_assets`, and a cartridge with no `registry_entry` never appears
there. `PATCH FAILED` here means "already patched", not "drifted".
