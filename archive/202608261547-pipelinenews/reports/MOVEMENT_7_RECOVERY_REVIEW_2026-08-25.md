# Movement 7 independent recovery review

Date: 2026-08-25  
Repository: `Ventusltd/pipelinenews`  
Branch: `main`  
Audit base: `252fa34132ea555538764f832f79b5dfe4445ee7`  
Classification: `PASS`

Movement 7 is complete as a recovery audit. Every numbered candidate from NewsV2 through NewsV6, the Movement 5 analytical release and the Movement 6 consumer projection is accounted for and independently rebuilt. The remaining deployment, mobile-runtime and archive-evidence gaps are recorded below; none is reworded as a release pass.

## Recovery table

| Release | Feature commit | Artifact commit | Contract | Builder and artifacts | Test | Result | Live status | Rollback |
|---|---|---|---|---|---|---|---|---|
| NewsV2 | `ab093820a819437b01f94c116e27b784f333f3e8` | same commit | `newsv2/contracts/release.newsv2.json` | `build-material-event-ledger.mjs`; assertion ledger and manifest | `bash newsv2/tests/run_newsv2.sh` | `PASS` — 45 assertions: 8 acquisition, 13 consent, 2 contract, 4 financial close, 17 project update, 1 refusal; Beacon Fen 13599; no commercial inference | Data-only `CANDIDATE`; not live | Discard NewsV2; frozen NewsV1 remains independently deployable |
| NewsV3 | `c001b7018f6107ac9abebe6deab312e303817915` | same commit | `newsv3/contracts/release.newsv3.json` | `build-organisation-role-evidence.mjs`; organisation/role evidence and manifest | `bash newsv3/tests/run_newsv3.sh` | `PASS` — 28 labels, 29 project/operator claims, 45 transaction-role abstentions; composite label preserved | Data-only `CANDIDATE`; not live | Discard NewsV3; NewsV2 and NewsV1 remain reproducible |
| NewsV4 | `f467febc6ba5d6b7c61e0ee42bc9bb3f4193333e` | same commit | `newsv4/contracts/release.newsv4.json` | `build-source-health-context.mjs`; source-health context and manifest | `bash newsv4/tests/run_newsv4.sh` | `PASS` — 6 decisions: 0 current, 1 stale, 4 degraded, 1 unavailable; context-only protections enforced | Data-only `CANDIDATE`; not live | Discard NewsV4; NewsV3 and predecessors remain reproducible |
| NewsV5 | `9ffdb64fca4dbb4cc2e41ec1315e8444c71ce1c7` | same commit | `newsv5/contracts/release.newsv5.json` | `build-reason-decisions.mjs`; decision ledger, empty browser projection and manifest | `bash newsv5/tests/run_newsv5.sh` | `PASS` — 45 holds, zero publishable reasons and 6 hostile negatives enforced | Data-only `CANDIDATE`; not live | Discard NewsV5; NewsV4 and predecessors remain reproducible |
| NewsV6 | `a2259bf3c8a9f2b9b2cfaa39e223c299224c5c81` | same commit | `newsv6/contracts/release.newsv6.json` | `build-data-centre-evidence.mjs`; evidence product and manifest | `bash newsv6/tests/run_newsv6.sh` | `PASS` — 6 governed sources, 2 exact observations, 2 abstained link decisions, zero identity links and 5 hostile abstentions | Data-only `CANDIDATE`; not live | Discard NewsV6; NewsV5 and predecessors remain reproducible |
| Analytics V1 / Movement 5 | `7f799df7f85c453307eb95573d4fa932bd6884dc` | `684d556671e79d09f9988fb3cd318e62823816e8` | `analytics_v1/contracts/parquet-build.v1.json` | `build_parquet.py`; 9 zstd Parquet tables, SQL views, manifest and audit | `bash analytics_v1/tests/run-parquet.sh` | `PASS` — 208 source rows = 208 Parquet rows; zero duplicate/null/schema/view/domain failures; byte-identical rebuild | Analytical `CANDIDATE`; no browser or `.duckdb` release | Discard generated Parquet/SQL/audit/manifest; NewsV2–NewsV6 remain reproducible |
| Consumer V1 / Movement 6 | `060c5b69448ad1290185c653f45349f587222ebf`, corrected by `1722ac99aee0fdc826c6af2aa19b4f2f5fbd7a54` | `8960a1635d49dcd9f065fb5e0caeaa363da1573c` | `consumer_v1/contracts/release.consumer-v1.json` | `build_consumer.py`; ordered intelligence overlay, interface guard and manifest | `bash consumer_v1/tests/run_consumer.sh` | `PASS` — 4 explicit ordered projections; 133/45/19/4/9/6 order; Beacon Fen 13599; 11 columns; contained mobile scroll; zero domain leakage | Data-only `CANDIDATE`; not wired to NewsV1 | Remove ConsumerV1 only; all predecessors remain byte-frozen and reproducible |

## Independent replay proof

- A fresh clone resolved remote `main` exactly to `252fa34132ea555538764f832f79b5dfe4445ee7` before testing.
- `bash newsv1/tests/run_newsv1.sh`, `bash analytics_v1/tests/run-parquet.sh` and `bash consumer_v1/tests/run_consumer.sh` all passed twice.
- The independent replay used DuckDB `1.3.2` and PyArrow `20.0.0`. GitHub Actions run `32820106133` separately proves the declared Python `3.11` build.
- Twenty-one generated JSON, Parquet, SQL, manifest and audit artifacts retained identical SHA-256 values across the second build.
- `git diff --exit-code` passed after both rebuilds; the clean checkout contained no generated drift.
- Frozen NewsV1 tree `2d6247c067aa5fad49995dcb9029d6cdb9898994` is unchanged from the pre-audit head. The imported legacy tree remains `03e76055af1f74a5ffe3d9bbbb22184ff631e4d0`.
- Frozen NewsV1 canaries remain: 7,680 projects, 356,474.09 MW, 133/45/19/4/9/6 news, Beacon Fen REPD 13599, 11 columns and 100-row pages.

## Deployment-boundary finding

`FAIL` at pre-audit head `7d22c82e21d783b5b5906ce1a07ed8ab21fb7c4c`: automatic branch/Jekyll Pages run `32820238938` placed Analytics V1, Consumer V1, NewsV2–NewsV6, reports, skills and the legacy archive in a 13,069,151-byte Pages artifact, contrary to the NewsV1-only publication law.

`PASS` for public-boundary containment at `252fa34132ea555538764f832f79b5dfe4445ee7`: `_config.yml` excludes every non-NewsV1 directory and non-runtime NewsV1 file. Run `32825901479` produced a 1,195,373-byte artifact containing the 43 whitelisted NewsV1 runtime files. Its only additional file is Jekyll-generated `assets/css/style.css`; excluded candidates and archives are absent.

`BLOCKED`: GitHub Pages is still configured for branch/Jekyll publication rather than the canonical `.github/workflows/pages.yml` deployment. Changing the repository setting requires an authenticated GitHub settings session. Until then, `_config.yml` is the enforced repository-side safety boundary.

## Honest remaining gaps

- `NOT TESTED` — live NewsV1 runtime at widths 390, 430, 440 and 768. Static CSS, 11-column and contained-scroll gates pass; they are not mobile runtime proof.
- `BLOCKED` — the legacy import is an unchanged snapshot from GlobalGrid commit `bcf966f21ba778b8e739c5caba47e00ac01f8a2c`. It contains V1–V6 files and the `v7`, `v8` and `v9` directories, but not the later separately named `v9.4`–`v9.7` directories. It also has no archive manifest or immutable-tree CI. Do not mutate the archive during a recovery review; resolve this as a separate evidence-import decision.
- `PASS WITH HISTORICAL CONTEXT` — `analytics_v1/contracts/storage.v1.json`, `dependency_audit.json` and `cross_version_reconciliation.json` preserve the original blocked local-runner preflight. They are superseded for the physical candidate by `parquet-build.v1.json`, `parquet_manifest.json` and `parquet_audit.json`; their historical status must not be mistaken for the current analytical result.
- NewsV4 has no proven current grid-constraint feed, NewsV5 has zero publishable reasons by design, and NewsV6 has only two exact observations with all capacity fields null.

## Next bounded maintenance gate

1. Switch GitHub Pages source from branch/Jekyll to GitHub Actions.
2. Run `.github/workflows/pages.yml` and prove the deployed artifact contains only its NewsV1 whitelist plus `.nojekyll`.
3. Keep ConsumerV1 disconnected and create no NewsV7 or GlobalGrid V9.8 until separately authorised.
4. Decide whether the immutable legacy archive should be extended with separately named V9.4–V9.7 evidence in a new archive release rather than by rewriting the existing snapshot.
