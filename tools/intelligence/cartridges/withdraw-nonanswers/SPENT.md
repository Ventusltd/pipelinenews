# SPENT — do not rebuild, do not re-anchor

`withdraw-nonanswers` shipped as **202608312244-pipelinenews**
(`cartridge_added: withdraw_nonanswers`), the 10th ancestor of the current head
**202609032251-pipelinenews**. Every change it makes is already in the head.

## Measured against `releases/202609032251-pipelinenews/`, 2026-09-04

All nine `from:` anchors occur **0** times.

Two of the nine edits are deletions — the relationship abstention ledger and the
project-intelligence mixed taxonomy — whose `to:` is the empty string, so a `to:` count is not
evidence for them. The direct measurement is the withdrawal itself:

    grep -c 'federated-relationships\|project-intelligence' index.html   ->   0

Both hosts are gone from the product UI, which is exactly what `cmd_check` demands of a
`ui_state: WITHDRAWN` entry (`host absent after withdrawal`, `loader absent after withdrawal`)
and what the head release passes.

The seven non-deleting edits all show their `to:` present once: the masthead reports the edition
actually shown, the sector copy no longer repeats the stale 136 total, the sector launcher
reports one evidenced topic, the two withdrawn bindings are not bound in `boot()`, the release
meta names only the retained visible surfaces, and the sector module describes the filtered
edition.

## Why `--applicable` calls this CANNOT APPLY rather than ALREADY APPLIED

`cmd_applicable` tests `man["key"] in supplemental_assets`. This cartridge withdraws surfaces
and registers none of its own, so `withdraw_nonanswers` is never a registry key and the probe
always falls through to a build that re-applies spent patches. `PATCH FAILED` here means
"already applied".
