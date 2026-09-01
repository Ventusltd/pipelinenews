# Coordination continuity contract

The board is the durable control plane for Claude and Codex. Local chat logs
are evidence, but they are not a portable control plane: they may contain
private material, are too large for Git, and are unavailable to GitHub-hosted
runners.

The continuity loop therefore has three layers:

1. `export-last-24h.mjs` gathers complete local Claude and Codex message text
   into `docs/coordination/.local/`, which Git ignores. This preserves local
   forensic access without publishing transcripts.
2. Agents place reviewed findings and handoffs on `BOARD.md`, under
   `from-claude/` or `from-codex/`, or as a small reviewed event under
   `events/`. These are the shared facts another session can safely inherit.
3. `compile-priorities.mjs` compiles the last 24 hours of shared evidence into
   a deterministic attention queue. CI publishes it as an artifact and job
   summary; it never commits or promotes a product.

## Priority law

Priority is based on consequence, then domain relevance, then recency:

- **P0:** stop-ship, failed proof, corrupt/orphan evidence, false engineering
  labels, deletion or security hazards.
- **P1 · GRID/MAP:** the project click journey, deep-link identity, immediate
  mobile arrival, substations, declared connections, voltage, fault current,
  topology, impedance and power-flow boundaries.
- **P2:** proofs, schemas, manifests, assemblers, release and deployment gates.
- **P3:** all other coordination.
- **DONE:** explicitly closed, resolved, superseded or recovered evidence. It
  remains in the 24-hour record but sorts below active work.

A grid/map item receives a domain boost but can never outrank a P0 integrity
failure. Within equal scores newer evidence appears first. This is an attention
queue, not authority to edit, commit, push or deploy.

## Fail-closed boundary

Raw transcripts must never be committed. Reviewed events use exactly
`coordination.reviewed-event.v1`; an unknown schema or missing field fails the
compiler. CI runs structural continuity checks and a pinned CVAA scan. The
24-hour age window is reporting only: age by itself never fails a build.

## Local scheduling

Run `tools/coordination/install-local-harvester.ps1` once in an interactive
PowerShell session to install a per-user task. It refreshes the ignored local
transcript ledger every 15 minutes while the user is logged on. The task does
not commit, push, redact, summarise or transmit anything.
