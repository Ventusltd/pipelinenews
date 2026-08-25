# PipelineNews NewsV5 — transparent reasons to research

NewsV5 is a data-only candidate. It maps each pinned NewsV2 event type to a Ventus capability-research vocabulary, reconciles the evidence, records a complete decision ledger, and exports only publishable reasons through a separate compact browser projection.

The grain is one row per NewsV2 event assertion and `event-to-capability.v1` rule version. `reason_decision_id` is the unique, non-null primary key. All 45 current events remain `HOLD_FOR_VERIFICATION`: the project identities are canonical, but the events are publisher-headline claims rather than direct public-record verification. The browser projection therefore contains zero reasons.

Modules remain separate for event-to-capability rules, podcast-derived search vocabulary, evidence reconciliation and browser projection. Podcast themes never establish a prospect or opportunity; stale market context never verifies an event; no private sales-workflow field enters the artifacts.

Run the complete current-and-predecessor gate with:

```bash
bash newsv5/tests/run_newsv5.sh
```

NewsV1–NewsV4 remain frozen. Discarding `newsv5/` is the complete rollback.
