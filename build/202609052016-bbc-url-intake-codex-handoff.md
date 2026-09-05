# BBC URL intake: laptop Codex handoff

Generation: `202609052016` (UTC). Capture anchor: `2026-09-05T20:16:16Z`.
Repository: `Ventusltd/pipelinenews` only.
Inspected source: `5d8b2ae49cdb66af3615e137afe8be18f7dae192`.
Intake commit: `b4d97c26ac337f9976a0d2ef89ba16dd0da49df9`.
Status: **URL deposited; article unverified; automatic ingestion NOT connected; nothing deployed.**

## Request and deposited input

Owner supplied https://www.bbc.co.uk/news/articles/c4gmkezn4nlo and requested an online check and a deposit into the Pipeline News engines. Laptop Codex is working in other repositories; do not interfere with those working trees or processes.

Input: `discovery/inbox/202609052016-bbc-c4gmkezn4nlo.json`.
Input SHA-256: `878287adb17da1b94488d4b0347809c5d4c21f4bb5644c6eabc679d3ba7c38b1`.
This introduces a source-intake record, NOT an already supported runtime ledger schema. No existing consumer has been registered for this inbox. The schema label documents this new record only; it does not claim engine support.

The online reader could not open the BBC UK page; the BBC international variant was also inaccessible. Exact article-ID/URL searches returned no usable match. These are environment observations, not evidence of a BBC 404 or a deleted article. No headline, publication date, content, project, company or topic was verified. Do not substitute an unrelated search result. The capture timestamp is not the publication date.

## Existing implementation to reuse

All source references below are pinned to the inspected commit; check current HEAD before implementing.

- [BBC enrichment module](https://github.com/Ventusltd/pipelinenews/blob/5d8b2ae49cdb66af3615e137afe8be18f7dae192/discovery/javascript/202608270844-bbc-enrichment.mjs): exports `validateBbcArticleUrl`, `extractBbcArticleMetadata` and `fetchBbcArticleMetadata`. The supplied URL fits its approved HTTPS host/path form. Its limits are a 5,000 ms request timeout and 1,048,576 response bytes; redirects are rejected. Call the single-article fetch function with an empty gazetteer initially, not the link-following enrichment wrapper.
- [Historical live-news workflow](https://github.com/Ventusltd/pipelinenews/blob/5d8b2ae49cdb66af3615e137afe8be18f7dae192/.github/workflows/202608270844-live-news-discovery.yml): fixed source/generation and exact-parent assertions. Dispatch inputs are collector enablement and provider, not an article URL. Do NOT rerun this historical build expecting it to consume a newly deposited file.
- [Historical identity contract](https://github.com/Ventusltd/pipelinenews/blob/5d8b2ae49cdb66af3615e137afe8be18f7dae192/data/news-discovery/202608270844-live-news-discovery-contract.json): its closed gazetteer covers East Pye and Beacon Fen entries, not the whole current project spine. Do not force this article onto those projects. Query context and related editorial mentions do not establish a primary identity.
- [Sector intelligence runner](https://github.com/Ventusltd/pipelinenews/blob/5d8b2ae49cdb66af3615e137afe8be18f7dae192/discovery/javascript/202609010719-sector-intelligence-runner.mjs): has an explicit approved source/adapter closure, separate topic assignments and project bindings. It does not accept this new inbox merely because a JSON file exists. Add any integration as a timestamped, tested successor, not a silent edit to that closed source list.
- [Deployment policy](https://github.com/Ventusltd/pipelinenews/blob/5d8b2ae49cdb66af3615e137afe8be18f7dae192/.github/DEPLOYMENT_POLICY.md): candidate builds are separate from owner-authorised Pages publication. No deployment or pointer transition is authorised by this handoff.

## Bounded implementation task

1. Fetch current PipelineNews refs and work in an isolated worktree/branch. Preserve uncommitted laptop work; no resets, process termination, cross-repo writes or edits to immutable releases. Keep this deposited receipt unchanged; record processing outcomes in new timestamped files.
2. Introduce a small manual-URL intake adapter/command that explicitly accepts this receipt. Validate the schema and BBC URL before any network request. Deduplicate against the actual current news ledger using the BBC article ID and validated URL; do not claim deduplication is complete from the receipt alone. First prove this single URL, rather than rebuild the whole dashboard.
3. Make at most one bounded fetch through `fetchBbcArticleMetadata(url, { gazetteer: [] })`. Preserve separate source-publication and observation timestamps. On blockage, timeout, missing metadata or oversized response, retain a pending/error result with zero news signals. Do not bypass access controls or manufacture a success.
4. Once content is accessible, assess relevance before routing. Out-of-scope articles remain recorded as out of scope; do not force them into energy topics. Relevant sector news can remain unbound. Project and company links require their own evidence-backed identity checks against current pinned owner datasets. A place, nearby asset, search query or related-story link alone must not establish identity. NEWS SIGNAL must not overwrite official REPD STATUS.
5. Assess publisher reuse terms before retaining/displaying metadata. Preserve attribution and source link; do not commit raw HTML, article bodies or images. A BBC link is not an open-content licence. Keep outputs compact and use the existing Parquet/DuckDB discipline where the current owner contract requires it; the receipt itself is a small JSON input, not a replacement data store.
6. Create a new timestamped candidate output and health report, recording input hash, source commit, exact failure/success state, deduplication result and any evidence-backed routing. Verify the output is actually consumed by the candidate engine before saying it has been ingested. Public release changes remain subject to the separate promotion contract.

## Acceptance checks

- This exact URL survives deposition, processing and retry without duplicate news items.
- Unreadable content leaves headline/date/bindings unknown and publication eligibility false.
- Non-BBC hosts, redirects and oversized responses fail closed within the existing bounds.
- A missing publication date is not replaced with the capture time and labelled as source publication.
- Unrelated content, ambiguous identities and related-story mentions cannot create false project/company bindings.
- Existing project data, live release pointers, immutable releases and other repositories are unchanged.

## Verification performed in this deposition

The receipt was locally parsed as JSON; its exact host/path, null article facts, empty bindings, disabled publication and disabled automatic ingestion were checked. This is not a live-fetch, engine-integration, browser or deployment test. Only the receipt and this handoff are part of the source-only deposition; no workflow was dispatched.
