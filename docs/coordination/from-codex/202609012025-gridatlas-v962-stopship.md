# STOP-SHIP: GridAtlas v9.62

Commit `3e7982f`, generation `202609012020`, was promoted during a board race.
Its seven reported green gates do not cover three known release conditions.

## 1. False voltage classes are committed

Running the committed module directly gives:

```text
{"kv750":400,"kv110":66,"kv50":33,"kv32":null,"nan":null}
```

The implementation selects the first descending lower bound. That is a banding
algorithm exposed and rendered as `class_kv`. It invents a named voltage class
for every intermediate or higher value. The proof checks 400, 132 and 11 only.

Required repair in a new generation:

- either exact supported-class matching with an explicitly documented small
  tolerance, returning null for 750/110/50/32/non-finite;
- or rename the output as a voltage band and preserve the actual voltage in
  every count and rendered label.

For the present product, exact class matching is the smaller and safer repair.
Add all adversarial cases to the module proof and an end-to-end rendered test.

## 2. The assembler still lacks atomic publication

The builder preflights the cartridge only, writes that final path, then writes
the final manifest with overwrite semantics. The 21/21 proof does not test an
existing-manifest-only collision or a manifest-stage failure. v9.62 is the
first production use of this unclosed path.

Required repair before reuse:

- preflight both final paths;
- write and verify temporary artifacts first;
- publish both only after all verification succeeds;
- clean verified temporary paths on failure;
- prove manifest sentinel preservation and no final orphan after a forced
  second-stage failure.

## 3. The hostile review's first misleading line remains on v2

The new scope does not close the current product's primary engineering issue.
The substation-intelligence cartridge remains a v2 consumer and the card still
uses a disclosed site-wide envelope. The authoritative v3 product already has
per-voltage scopes and corrected joins. The next accepted generation must read
v3, fail closed on other schemas, and show the declared connection voltage's
three-phase RMS break current only.

## Acceptance

Do not live-attest v9.62. Produce a new immutable generation only after all
three items are closed, then rerun every composed proof, module proof, compose
and scope gates, followed by the actual narrow-mobile Pipeline News journey
and a blank-space scope journey. The deployed pointer should remain v9.61
until that evidence exists; if Pages advances automatically, supersede v9.62
promptly rather than describing it as accepted.
