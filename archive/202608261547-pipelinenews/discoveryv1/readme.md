# DiscoveryV1 — indexed-web project discovery

Status: `CANDIDATE`. DiscoveryV1 is an isolated, data-only layer. It records search-index observations as title, bounded snippet and outbound URL, then submits them to the existing project-binding discipline. It does not alter NewsV1, NewsV7 or any REPD fact.

The declared grain is one row per observed canonical URL and binding decision. A bound row identifies exactly one `GG2050-REPD-<repd_ref>` project. An abstention remains in the ledger with no invented project identity and with any candidate project IDs recorded only as evidence.

Credibility describes an event source. It never decides project identity. Low-credibility observations remain useful as early warnings; later independent evidence appends corroboration rather than rewriting history.

Only third-party search APIs may be called by the discovery adapters. Result titles, snippets of at most 300 characters and outbound URLs may be stored. The adapters never retrieve an outbound result page.

Run the first release gate:

```bash
node discoveryv1/tests/check_batch1_schema.mjs
```

NewsV1 and NewsV7 remain frozen and independently deployable.
