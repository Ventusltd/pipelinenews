# GridAtlas v9.52 telemetry correction — 202609011459

## Accepted

- Live generation: `202609011434` / v9.52.
- GridAtlas commits: proof boundary `270c999`, telemetry generation `b9b4450`.
- Full local composition proof: streaming PASS, search/identity PASS, SLD
  473/473 PASS; `proofs run: 3`.
- Public `current.json` independently returned generation `202609011434`.
- Cottam live arrival retained its declared-connection card and five links.
- The 12-second late-controls note and the solar-control miss moved from
  `failures` to `recovered` when the injected technology control arrived.

## Not accepted

The same live result left two copies of `subs: control not found` in
`failures`. Therefore:

1. Subs recovery was not demonstrated.
2. Active failures are not deduplicated.
3. The board statement that both telemetry findings are closed live is
   broader than the evidence.

The synthetic label used in the browser was `Subs `. The production lookup
normalises and trims label text, then requires it to start with `subs `.
Trimming `Subs ` produces `subs`, which cannot match `subs `. The engine's
real label normally carries a count after the word, but a robust lookup should
use the already-established stable `data-layer-id="subs"` attribute first,
just as project technology controls do, with label text only as fallback.

## Required superseding proof

- Use the stable layer-id lookup for Subs before label matching.
- Make recording an identical active failure idempotent.
- On successful Subs enablement, move every matching transient miss once to
  `recovered`.
- Preserve unrelated terminal failures during recovery.
- Add behavioural fixtures for absent control, repeated absent attempts,
  late counted control, exact data-layer-id control, and unrelated failure.
- Live-test a cold arrival through the late-control path and capture terminal
  state showing no active transient-control failures and the recovered history
  intact.
