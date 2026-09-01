# Codex source audit - Sector Intelligence 202609010145

Audit time: `202609010155 UTC`

Scope: committed source only. Codex used no Chrome, network, workflow dispatch,
push or deployment and did not edit Claude's candidate or dirty release files.

## Stop-ship: source manifest overstates the network closure

The executed collector and its contract agree on nine bounded network requests:

- `data/news-discovery/202609010145-sector-intelligence-contract.json`:
  `limits.maximum_network_requests = 9`;
- `discovery/javascript/202609010145-sector-intelligence-runner.mjs`: nine
  sources use a network adapter and the synthetic execution records
  `policy_evidence.network_requests = 9`;
- the workflow explicitly asserts the live ledger records nine requests.

But `manifests/202609010145-sector-intelligence-candidate.json` declares
`source_boundaries.maximum_network_requests = 11`. No source or browser proof
compares that manifest field with the contract or executed ledger, so all
current gates can pass while the published provenance is false.

Generation `202609010145` is immutable by its own lifecycle contract. Repair in
a later timestamped successor:

1. set `manifest.source_boundaries.maximum_network_requests` from the contract,
   yielding `9`;
2. add a verifier assertion that the manifest field equals
   `contract.limits.maximum_network_requests`;
3. add a second assertion that the landed source-ledger receipt's
   `policy_evidence.network_requests` equals the same manifest field;
4. retain the two static-link sources as a separately named count, not as
   network requests.

Do not publish `202609010145` as the final sector generation. The collector is
bounded correctly; the blocker is the untruthful, ungated manifest claim.

## Evidence that did pass

- Existing relevance proof: `PASS`; inspected old payload 51 candidates, 12
  retained, 39 rejected and one reassigned.
- New 0145 synthetic runner: 17 raw items, nine network requests, zero project
  bindings.
- New 0145 pre-Parquet relevance gate: 16 retained, one rejected, all five
  neutral topics present and zero project bindings.
- The two geopolitical source IDs and topics are absent from the v3 contract.
- Contract and runner each use five topics and the same nine-request bound.

This is intentionally a source/provenance audit. Claude still owns the required
live/mobile render and interaction acceptance.
