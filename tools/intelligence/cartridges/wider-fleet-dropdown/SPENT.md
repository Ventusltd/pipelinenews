# SPENT — do not rebuild, do not re-anchor

`wider-fleet-dropdown` shipped as **202609031308-pipelinenews**
(`cartridge_added: wider_fleet_dropdown`), the grandparent of the current head
**202609032251-pipelinenews**. Every change it makes is already in the head.

## Measured against `releases/202609032251-pipelinenews/`, 2026-09-04

Eleven edits. All eleven `from:` anchors occur **0** times, except the one whose `to:` contains
its own `from:` (`assets/202608272048-orientation.css`, the control's label and the 44px floor),
which occurs once inside the applied replacement.

Six `to:` strings occur once. **Four occur zero times, and that is not drift either.** In each of
the four, a later cartridge — `summary-seam`, 202609032159 — inserted a line into the middle of
the block this cartridge wrote, so the `to:` is no longer contiguous. The individual statements
are all present:

| what the edit was for | evidence in the head |
|---|---|
| the mount report counts options, not tabs | `app.mjs:1677` `result.optionsAdded === entry.repd_technology_types`; `app.mjs:1678` `result.controlsAdded === 1`; `app.mjs:1680` `${result.optionsAdded} more REPD technology types in one control` — line 1679 is `summary-seam`'s export-policy line, inserted between them |
| header and contract: one control, not twenty tabs | `wider-fleet.mjs:85` `control_in_product_technology_row: "select"` — the old `tabs_in_product_technology_row: true` is gone |
| mount state and clearWider address the select | `wider-fleet.mjs:303` `let returnTab = null;`, `:307` `function clearWider()`, `:311` `returnTab = null;` |
| read `?technology=` on mount, and report one control | `wider-fleet.mjs:486` `let deepLinked = null;`, `:494` `deepLinked = match;`, `:501` `controlsAdded: 1`, `:502` `optionsAdded: options.length`, `:506` `deepLinked` — `tabsAdded` no longer exists in the file |

Twenty appended tabs became one labelled select, and it is still one select in the head.

## The general trap, worth carrying

**A multi-line `to:` block is not a test of whether a cartridge was applied.** Any later cartridge
that inserts a line inside that block drops the `to:` count to zero while every statement in it
survives. Both `from:` 0 and `to:` 0 together look exactly like an anchor that was rewritten out
from under the cartridge — four of these eleven edits presented that way, and none of them had
drifted. Check the statements, not the block.

## Why `--applicable` calls this CANNOT APPLY rather than ALREADY APPLIED

`cmd_applicable` tests `man["key"] in supplemental_assets`. This cartridge changes the shape of an
existing surface and registers no asset of its own — it corrects the `wider_fleet` entry through
`registry_repairs` instead — so `wider_fleet_dropdown` is never a registry key. `PATCH FAILED`
here means "already applied".
