# Pipeline News V3 — organisation and role evidence

Status: `CANDIDATE`; its deterministic builder, independent verifier, manifest and predecessor regression gates pass. NewsV1 remains the frozen public interface.

NewsV3 creates a separate namespace for exact REPD operator labels and directly evidenced project-operator label assertions. It explicitly abstains from unsupported transaction roles.

Pinned inputs and acceptance law are declared in `contracts/release.newsv3.json`. The build emits one auditable product containing 28 unresolved organisation labels, 29 directly evidenced REPD project/operator-label assertions and 45 explicit transaction-role abstentions.

Key caution: raw labels can be composite. `Firma Energy / IB Vogt` remains one unresolved source label; NewsV3 must not split it or invent legal entities, ownership, buyer/seller, lender, EPC, ICP, OEM, supplier or adviser roles.

Run the complete gate:

```bash
bash newsv3/tests/run_newsv3.sh
```

The test rebuilds the output, reads it back independently, validates input/module/contract/artifact hashes, checks every key and null law, proves the 28/29/45 counts, preserves the composite-label canary, keeps every transaction role null and re-runs NewsV2.
