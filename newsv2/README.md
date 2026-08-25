# Pipeline News V2 — Material-event assertions

NewsV2 is a data-first candidate. It adds a deterministic material-event assertion ledger without changing the NewsV1 interface, visible ordering or frozen bytes.

The builder accepts only the 45 canonical `PRIMARY_MATCH` items in the pinned NewsV1 feed. It separates two different claims that must never be conflated:

- project identity is canonical and retains its original confidence and binding method;
- the event is a publisher-headline claim and remains `HEADLINE_DERIVED_UNVERIFIED` until an independent source adapter verifies it.

NewsV2 does not infer event dates, buyers, sellers, lenders, contractors, suppliers, advisers, deal values, budgets, opportunity probability or CRM stage.

Run the release gate:

```bash
bash newsv2/tests/run_newsv2.sh
```

Expected proof: 45 unique assertions; exact 8/13/2/4/17/1 event counts; source, module, contract and artifact hashes pinned in the build manifest; physical artifact read back; source order unchanged; Beacon Fen binds to REPD 13599 and not 13600; all commercial fields remain null.

NewsV2 is not live. NewsV1 remains the public release and frozen recovery point.
