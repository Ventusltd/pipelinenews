# Codex stop-ship — GridAtlas v9.48 proof boundary

Timestamp: `202609011245 UTC`

Scope: read-only supervision of Claude's active GridAtlas worktree. Codex used
no browser, network, push, deployment or product-file edit.

## Finding

`origin/main` currently points at `73744db`, composition `202609011243`,
v9.48. The composition hash/pointer gate passes, but the current behavioural
proof gate fails:

```text
streaming-parquet-bridge 202608301825: no proof
uk-gazetteer-flyto 202609011141: no proof
sld-sandbox 202609011243: no proof

proofs run: 0
FAIL no proof ran for any composed cartridge
```

Command:

```text
node tools/proofs/run-current.mjs
```

exits `1`.

The Claude transcript explains how this happened:

1. v9.47 generation `202609011242` was pushed after its SLD proof reported
   `455/456 checks passed`; the failed assertion was `a cleared selection
   disarms the keeper before the block is removed`.
2. The v9.48 reseal then raised `AssertionError: stale check anchor` while
   generating the replacement proof. A later shell segment nevertheless
   printed `gates pass` and `pushed`, so `73744db` reached `origin/main`
   without `tools/proofs/202609011243-sld-sandbox.proof.mjs`.

`verify-compose` and scope lint are green, but they do not substitute for the
missing behavioural proof.

## Root cause behind Vikram's phone report

Claude's data audit is correct and Codex independently reproduced it:

- Pipeline News MAP targets: `7,680`
- present in the Atlas register: `5,259`
- absent from the Atlas register: `2,421`
- absent solar targets: `873`

Botley West is present and therefore was an accidental happy-path test. The
proposed link-owned fallback card is the right product boundary: it preserves
Pipeline News coverage without silently widening the governed Atlas register.

## Required recovery

Do not amend v9.47 or v9.48. Compose a new timestamped v9.49 which:

1. carries the fallback-card repair;
2. fixes the keeper ordering assertion rather than weakening/deleting it;
3. includes the generation-matched SLD proof;
4. makes `node tools/proofs/run-current.mjs` exit zero;
5. treats a failed generator/assertion as fatal so no later shell segment can
   print green or push;
6. live-tests at least one present solar ref and one absent solar ref from a
   Pipeline News MAP button on phone width.

Suggested absent high-capacity fixtures from the published Pipeline release:

- REPD `11278` — Wentlooge Renewable Energy Hub — 125 MW
- REPD `12997` — Craig y Perthi Solar Farm — 99.9 MW
- REPD `7194` — Rush Wall Solar Park — 75 MW

There is also an older gate debt: the current proof runner skips the composed
streaming and search cartridges because their generation-matched proofs are
absent. That is especially material while diagnosing cross-project identity.
Codex has local executable proof candidates for both and will offer them
separately; do not claim that every composed cartridge passed until all three
actually ran.
