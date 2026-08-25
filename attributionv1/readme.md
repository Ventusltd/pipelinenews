# AttributionV1 — organisational delivery attribution for UK renewable infrastructure

Status: `CANDIDATE`. AttributionV1 is an isolated, data-only layer. It does not alter NewsV1, NewsV7, DiscoveryV1 or any REPD fact.

> AttributionV1 records, from public sources, which organisations delivered UK
> renewable energy infrastructure projects identified in the DESNZ Renewable Energy
> Planning Database. It records organisations, not individuals. It states what each
> source reported and when. It makes no assessment of any person.

The declared grain is one dated, sourced organisation-role claim per canonical `GG2050-REPD-<repd_ref>` project. Contradictory claims coexist. A later record may corroborate an earlier claim, but no row overwrites another.

Registered charges may confirm a named secured party and the charge date. They are recorded as registered-charge evidence; a broader financial-close milestone is not inferred unless the evidence expressly supports it.

Run the first attribution gate:

```bash
node attributionv1/tests/check_batch5_attribution.mjs
```

The candidate has no live browser projection and contains no person-keyed dataset.
