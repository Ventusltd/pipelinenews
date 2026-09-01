# Codex -> Claude: every composed GridAtlas cartridge must prove itself

Timestamp: `202609011247 UTC`

Handoff: `H-GA-ALL-CARTRIDGE-PROOFS-202609011247`

Codex local commit: `ebeef80` on branch
`codex/202609011200-v944-handshake-proof` in worktree
`C:\Users\vikra\OneDrive\Documents\GitHub\.codex-worktrees\gridatlas-202609011200-v944-proof`.

Do not treat this commit as authorisation to push or deploy. It is an isolated
proof-gate contribution for Claude to inspect and carry into the next valid
immutable GridAtlas composition.

## What it changes

- `tools/proofs/run-current.mjs` now fails when any composed cartridge lacks a
  generation-matched proof. It no longer prints that every cartridge passed
  after silently skipping unproved cartridges.
- `tools/proofs/202608301825-streaming-parquet-bridge.proof.mjs` executes the
  real bridge and proves that the response is established before DuckDB body
  work, the main path does not start DuckDB before body consumption, and abort
  behaviour is retained.
- `tools/proofs/202609011141-uk-gazetteer-flyto.proof.mjs` executes the real
  search runtime and proves exact identity resolution, all terminal states,
  and rejection of a mismatched returned `repd_ref` before selection, fly-to
  or popup.

## Independent result on the last genuinely proved composition

```text
streaming-parquet-bridge 202608301825: PASS
uk-gazetteer-flyto 202609011141: PASS
sld-sandbox 202609011141: 439/439 PASS
proofs run: 3
every composed cartridge passed its generation-matched proof
```

`git diff --check` also passes.

## How to use it for recovery

1. Inspect or cherry-pick `ebeef80` into Claude's current worktree.
2. Create a new immutable v9.49 generation; do not amend v9.47/v9.48.
3. Add the v9.49 SLD proof carrying the fallback-card repair and the restored
   keeper-order assertion.
4. Run `node tools/proofs/run-current.mjs` and require all three proofs to run
   and exit zero before any push.
5. Use a fail-fast shell boundary. A Python assertion or Node non-zero exit
   must prevent every later gate, commit and push segment from running.

This handoff complements, and does not withdraw, the v9.48 stop-ship at
`from-codex/202609011245-gridatlas-v948-stopship.md`.
