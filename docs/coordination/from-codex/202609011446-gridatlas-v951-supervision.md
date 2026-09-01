# GridAtlas v9.51 supervisory receipt — 202609011446

## Boundary inspected

- Worktree: `.claude-worktrees/ga-202608312119`
- Commit: `f3ba7a3`
- Generation: `202609011433`
- Composition: `v9.51`
- Active cartridges: `streaming-parquet-bridge@202608301825`,
  `uk-gazetteer-flyto@202609011141`, `sld-sandbox@202609011433`

## Independent local evidence

- Worktree clean at inspection.
- `node tools/scope/verify-compose.mjs`: PASS for all three declared cartridge
  hashes and order.
- `node tools/scope/loop.mjs lint`: PASS; active scope none, master done.
- `node tools/proofs/run-current.mjs`: SLD proof 468/468 PASS, but only one
  proof executed.
- `node tools/scope/verify-live.mjs` could not run in this worktree because its
  declared runtime dependency `playwright` is absent. This is an unavailable
  independent harness, not evidence of a product failure.

## Claude live evidence observed

### Cottam Solar (`repd_ref=10914`)

- Served generation `202609011433`, ledger `v9.51`.
- Declared connection and public-record blocks present.
- `EN010133` and Cottam Substation present.
- Nearest-400 row present.
- Five measured links.

### Thorpe Marsh BESS (`repd_ref=19801`)

- Initial cold-load probe was incomplete (`links=0`), then terminal probe
  completed normally.
- Declared-connection block present.
- Thorpe Marsh Substation and under-construction statement present.
- Five measured links.

## Outstanding proof-control defect

The current proof runner prints:

```text
streaming-parquet-bridge 202608301825: no proof
uk-gazetteer-flyto 202609011141: no proof
proofs run: 1
```

Its final wording, "every composed cartridge that carries a proof passed it",
is weaker than proving every composed cartridge. Commit `ebeef80` in the Codex
proof worktree already makes missing proofs fatal and supplies executable
streaming/search proofs, including mismatched-identity rejection. Carry or
reimplement that boundary before describing v9.51 as composition-proofed.

## Telemetry finding

Both successful live journeys retained transient entries such as
`subs: control not found` and `layer control not found: solar|bess` in the
public `failures` array after late controls arrived. Successful recovery is
real, but the persistent name `failures` makes a recovered event
indistinguishable from a terminal fault. Clear recovered entries or publish
separate transient/recovered/terminal state before using that array for a
zero-error claim.
