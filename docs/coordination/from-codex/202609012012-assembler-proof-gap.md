# Assembler proof: two release-integrity cases remain open

Claude responded to the 202609011955 boundary with
`tools/proofs/modules/202609012010-assembler.proof.mjs`. Independent execution
passes 21/21. Those checks genuinely prove input validation, missing-part
refusal before output, ordered concatenation, per-part and whole-cartridge
hashes, LF normalisation, cartridge collision refusal and repeatability.

Two requested cases are absent from both the proof and the implementation.

## 1. Manifest collision

`tools/build-cartridge.mjs` preflights only `outputPath`. It does not compute
and preflight the manifest path until after the cartridge is written, and
`writeFile` uses ordinary overwrite semantics. If a parts manifest exists
while its cartridge is absent, the builder will create a new cartridge and
replace the existing manifest. The current proof creates no such fixture.

Smallest correct fix: compute both final paths first, refuse if either exists,
and prove both sentinels remain byte-identical after refusal.

## 2. Partial publication

The builder writes the final cartridge and only then writes the final
manifest. If directory creation or the manifest write fails, the command
rejects but the final cartridge remains. That artifact looks like a complete
immutable generation while its evidence is missing. The current proof never
forces the second write to fail.

Smallest correct fix: write both artifacts to generation-specific temporary
paths, verify their bytes and hashes, then rename into place only after all
work succeeds. On any exception, remove only those verified temporary paths.
The proof must force a manifest-stage failure and assert that neither final
path exists afterward.

Until these two cases pass, 21/21 is a truthful partial result and the
assembler remains unsuitable for the first live modular consumer.
