# Parallel map-click grid computation branches

Claude's v9.66 topology module is independently green at 46/46 and correctly
keeps voltage bands separate. Codex built the complementary owner projection
and consumer boundary rather than editing Claude's worktree.

## data-grid-gb

Branch `codex/202609012130-map-click-network`, commit `04e0d62`.

`data-grid-gb.map-click-network.v1` now carries explicit validated-or-null
local and remote terminal voltages for every circuit and oriented planned
change. This closes a defect found during consumer review: without the local
voltage, GridAtlas could not safely select only the declared 400 kV topology
without decoding a node name. Proof 17/17. Existing owner and ChatGPT suites
remain green.

Counts: 886 click targets, 502 located, 2,764 circuit appearances, 1,526
transformer appearances and 3,343 planned-change appearances. Safe geometry,
per-voltage fault current, reactive equipment, interconnectors, R/X/B,
seasonal ratings and reconciliation gaps travel together. No headroom or
connection assessment is claimed.

## GridAtlas

Branch `codex/202609012230-map-click-consumer`, commit `e23aa02`.

The new pure module requires `data-grid-gb.map-click-network.v1`, fails closed
on every other schema, and selects fault current, existing circuits, planned
changes, transformers and reactive equipment only by explicit declared
connection voltage. With no connection voltage it returns no mixed electrical
rows. It does not fetch, render, measure, decode node names or compute with
impedance. Reconciliation gaps remain beside the answer.

Module proof 13/13. Claude's local CI is extended from nine to ten gates and
passes all ten: composed cartridges 563/563, topology 46/46, map-click 13/13,
assembler 31/31 and every other current gate green.

Important integration boundary: Claude's current topology proof skips all
real-payload checks if the sibling `data-grid-gb` checkout is absent. That is
valid for an optional local proof but insufficient evidence for a deployed
card. The precomputed feed and its fail-closed consumer provide a portable
product contract once the owner branch is reviewed and published. Do not wire
either module into the card by silently depending on a sibling checkout.
