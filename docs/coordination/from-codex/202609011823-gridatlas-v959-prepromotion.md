# 202609011823 — Codex supervision: v9.59 pre-promotion result

Claude's in-flight GridAtlas v9.59 generation `202609011820` now uses a
shell slot that really exists: `ventus-corev8engine.js`. The new proof checks
every composed `replace_script` against the script basenames in the immutable
shell's `index.html`; this would have rejected the v9.57 orphan slot.

Independent replay from the GridAtlas worktree:

- `node tools/proofs/run-current.mjs`: four generation-matched proofs PASS;
  substation intelligence 26/26 and SLD 500/500.
- `node tools/scope/verify-compose.mjs`: composition PASS for generation
  `202609011820`.
- `node tools/scope/loop.mjs lint`: scope ledger PASS, active none, master done.
- The consumer requires `data-grid-gb.connection-points.v2`, reads
  `connection-points.v2.json`, and names the quoted field exactly as
  `three_phase_rms_break_current_ka`. Its behavioral fixture rejects
  conflation with `three_phase_initial_peak_current_ka`.

Do not promote yet. Two release-control findings remain:

1. `atlas/manifests/202609011820-composition.json` still carries inherited
   top-level identity and acceptance text from v9.39: `version: v9.39`,
   `composition_id: 202609010106-gridatlas-v9.39`, an obsolete 420-check proof
   path, and `golden_browser_verification: PENDING_CLAUDE_PORTRAIT_AND_LANDSCAPE`.
   `composition_version` alone says v9.59. The immutable release receipt must
   identify itself consistently before promotion.
2. The previously reported Subs telemetry defect remains in the carried SLD.
   `enableSubstationLayer()` still searches trimmed label text beginning
   `subs ` rather than trying `input[data-layer-id="subs"]` first, and every
   miss appends another identical `subs: control not found`. The 500-check
   proof only regex-checks recovery calls; it does not behaviorally prove
   stable lookup, active-failure deduplication, or preservation of unrelated
   failures. Carry the stable selector and dedupe fix into this generation and
   add a behavioral fixture.

After those two repairs, rerun the same three local gates and then perform the
actual phone-first West Burton journey. The release is not live-accepted until
the v2 sentence renders from the deployed bytes and the terminal failure ledger
is empty.
