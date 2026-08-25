# Pipeline News

Pipeline News is the independent news-data and intelligence engine for the GlobalGrid2050 federation.

It is the clean-room successor to the renewable-energy news discovery, geographic classification and authoritative project-entity binding logic developed through GlobalGrid2050 V1 to V9.7.

Pipeline News owns news ingestion, normalisation, evidence, classification, decision ledgers and published data products. GlobalGrid2050 remains the presentation layer and consumes pinned, validated Pipeline News releases.

The first production milestone is Pipeline News V1.0.0. It must reproduce the current GlobalGrid V9.7 feed and visible ordering exactly before any new source, ranking system or model is permitted to alter the public output.

## AI read first

This repository follows the GlobalGrid2050 Data Discipline Manual:

https://github.com/Ventusltd/globalgrid2050-hompage/blob/main/docs/DATA_DISCIPLINE_MANUAL.md

Repository-local implementation skill: [`build-auditable-duckdb-parquet`](skills/build-auditable-duckdb-parquet/SKILL.md). Read it before creating or changing any DuckDB, Parquet, audit, backfill, update or release pipeline.

Repository-local performance skill: [`build-progressive-static-data-ui`](skills/build-progressive-static-data-ui/SKILL.md). Read it before changing browser loading, caching, table rendering, search, filtering, mobile behaviour or performance tests.

Repository-local intelligence skill: [`build-source-grounded-sales-intelligence`](skills/build-source-grounded-sales-intelligence/SKILL.md). Read it before adding material events, organisations, commercial roles, opportunity reasons, podcast evidence or data-centre intelligence.

Read that manual, this README, the local CHANGELOG, the source register and the contracts before patching, porting, backfilling, scheduling, publishing or wiring this repository to a UI.

Green is not proof. File count is not proof. Size is not proof. A rendered browser page is not proof. The proof is that the data obeys its declared law at its declared grain and key.

## Active build plan — frozen NewsV1 and NewsV2 candidate

Status: NewsV1 is deployed with live desktop runtime proof. NewsV2 is a tested, data-first material-event ledger candidate and does not change the public interface.

Public release path: `https://ventusltd.github.io/pipelinenews/newsv1/`.

This is the new PipelineNews numbering lineage for the post-V9.7 performance release. GlobalGrid V9.7 remains byte-frozen at source commit `824a23cd0cf9f90a9df942f1b37a09c2dc6472b7`, subtree `4fca94ede95789ade9490258a2323c00c13ec2ea`.

Timing law for every continuation, including after context loss:

- Execute three consecutive coherent work blocks where useful.
- Target approximately 300 seconds for the whole turn, with a normal range of 120 to 500 seconds.
- At the midpoint, one explicit extension to 1,000 seconds is allowed only for a named acceptance gate that is still making progress.
- The extension may be used once; never turn it into polling, looping, hanging or zombie mode.
- At the hard stop, record completed checks, failures and the exact next pass here before returning control.
- Never guess around a failed prerequisite; mark it `BLOCKED` or `NOT TESTED`.

Locked scope and acceptance contract:

- Preserve the V9.7 visual order, controls, cards, eleven project columns and contained mobile horizontal scrolling.
- Preserve 7,680 projects, 356,474.09 MW, 133 ALL, 45 UK, 19 international, 4 US, 9 Europe and 6 international-other.
- Preserve Beacon Fen as PRIMARY_MATCH to REPD 13599 and never 13600.
- Keep every legacy release and archived byte unchanged.
- Change performance architecture only: progressive project hydration, bounded visible rows, immutable-asset caching, one news request, no duplicate full-table render and deferred chart loading.

Frozen five-release queue:

1. NewsV2 — material-event assertions and REPD delta-ready contracts.
2. NewsV3 — organisations and directly evidenced commercial party roles.
3. NewsV4 — explicit grid milestones, constraints and proven Atlas/Energy Tracking adapters.
4. NewsV5 — transparent public-evidence reasons to research an opportunity.
5. NewsV6 — a separate UK data-centre evidence namespace.

Every version needs a material capability, deterministic build, contract, tests and frozen recovery path. Never count an empty directory, an untested label or a mutation of an older release as a new version.

Bounded passes:

1. Audit both repository heads, PipelineNews skills/README/Pages and the frozen V9.7 source.
2. Add and validate the Atlas-derived progressive static-data UI skill cartridge.
3. Create `newsv1/` as a self-contained, provenance-pinned consumer of the frozen V9.7 runtime data.
4. Implement progressive loading and a 100-row page window without changing filters, sort, export or mobile table semantics.
5. Run data-count, capacity, news-order, Beacon Fen, DOM-budget, URL, mobile CSS and frozen-history checks.
6. Commit PipelineNews `main`, deploy only `newsv1/` through GitHub Pages and verify the live bytes.
7. Append News V1 immediately after V9.7 in the GlobalGrid root directory, commit `main` and verify both public URLs.

Latest recovery checkpoint:

- `PASS` — both repository skill cartridges validate.
- `PASS` — 7,680 unique canonical projects, 356,474.09 MW, technology totals, geometry totals and all 16 partition hashes.
- `PASS` — 133/45/19/4/9/6 news contract, exact feed and ledger hashes, and Beacon Fen REPD 13599 canary.
- `PASS` — eleven columns, 100-row DOM window, first verified partition preview, local-first news, bounded concurrency, timeouts, caching rules and non-blocking pinned charts.
- `PASS` — Pages staging produces a bounded 10.1 MB runtime artifact and excludes the frozen archive, fixtures and tests.
- `PASS` — the tracked PipelineNews legacy archive and importer are unchanged.
- `BLOCKED` — local Playwright rendering because this runner has no installed Chromium binary and the single browser download attempt failed with a remote certificate/502 response; do not reinterpret static checks as browser proof.
- `PASS` — PipelineNews `main` commit `d1f573fb6421903e37e164edafcc3c8cae2407f0` and GlobalGrid directory commit `cfb32796e4a3c45a0ab7bec53623b96c84a818a4` are published.
- `PASS` — PipelineNews Pages retry `32791931375` completed both build and deploy after Pages enablement.
- `PASS` — deployed index, release contract, project manifest, first/last project partitions, 133-item news feed, application module and inherited mobile CSS are byte-identical to the committed release.
- `PASS` — the deployed contract and manifest both declare 7,680 projects, the feed declares 133 total / 45 canonical UK headlines, and the live GlobalGrid homepage contains the News V1 URL.
- `PASS` — live desktop JavaScript at 1363×936: 7,680 projects, 356,474 MW, 133/45/19/4/9 news counts, 100-row pages, filters, pagination, contained table overflow and Beacon Fen 13599 binding; no application console errors.
- `BLOCKED` — live mobile runtime at 390/430/440/768 because the cloud browser does not expose viewport resizing. Static mobile CSS, contained-scroll and eleven-column gates pass; that is not runtime proof.
- `PASS` — NewsV2 deterministically builds 45 material-event assertions with exact 8 acquisition / 13 consent / 2 contract / 4 financial-close / 17 project-update / 1 refusal counts, preserves source order and keeps all commercial roles and values null.
- `PASS` — NewsV2 pins the source SHA-256, retains Beacon Fen REPD 13599 and excludes sibling 13600, and leaves NewsV1 bytes and visible UI unchanged.
- `PASS` — bounded Atlas V8 and UK Energy Tracking V6 adapter audit: deployed Atlas code matches the repository but most nested datasets are frozen April snapshots; Energy V6 payloads are frozen at 18 June despite historical `health: ok` fields.
- `PASS` — reusable adapter/freshness contract recorded in `reports/ATLAS_V8_ENERGY_V6_ADAPTER_AUDIT.md`; no proven grid-constraint feed was found, so none may be inferred from frequency, interconnector or proximity data.
- `PASS` — NewsV3 candidate commit `c001b7018f6107ac9abebe6deab312e303817915` deterministically builds 28 unresolved operator labels, 29 project/operator-label source claims and 45 explicit transaction-role abstentions; every declared key is unique and non-null.
- `PASS` — NewsV3 preserves `Firma Energy / IB Vogt` as one unsplit unresolved label, keeps every buyer/seller/lender/EPC/ICP/OEM/supplier/adviser field null, retains Beacon Fen on 13599 and excludes 13600. NewsV1 and NewsV2 regressions pass.
- `PASS` — NewsV4 candidate commit `f467febc6ba5d6b7c61e0ee42bc9bb3f4193333e` deterministically builds six source-health decisions: 0 current, 1 stale, 4 degraded and 1 unavailable; all six keys are unique and non-null.
- `PASS` — NewsV4 independently rebuilds artifact SHA-256 `5aa7f2bef3d99d2cc50c81695da406ccdd3f315c88237ecf0de2c0568deefd0d`, records five stale/one unknown freshness states, forbids identity/event/grid/deal use and leaves NewsV1–NewsV3 green.
- `PASS` — NewsV5 candidate commit `9ffdb64fca4dbb4cc2e41ec1315e8444c71ce1c7` deterministically builds 45 transparent reason decisions, all `HOLD_FOR_VERIFICATION`, with six separate event-to-capability rules and six theme-vocabulary rows; the compact browser projection correctly contains zero unsupported reasons.
- `PASS` — NewsV5 independently rebuilds ledger SHA-256 `fbce604f865341391316917cb14d6319f8b1fdbb503a971a19a7c7d0ecfec06a`, proves 45 unique non-null keys, enforces six hostile negatives as 2 hold / 1 reject / 3 abstain, preserves Beacon Fen 13599 and leaves NewsV1–NewsV4 green.
- Next bounded pass: build NewsV6 as a separate `PN-DC-*` UK data-centre evidence namespace with a pinned source/licence register, explicit facility/campus/building and capacity-type laws, and hostile near-duplicate abstentions.

## Overnight automation master score — authoritative

This section is the long-form score for the `Advance Pipeline News` automation. The automation prompt must remain short: resolve PipelineNews `main`, read this entire README and the relevant repository skills, then execute the first incomplete movement below. This README—not a remembered chat summary—is the authority after context loss or prompt truncation.

The score is ordered. Do not skip a failed movement to manufacture version numbers. Do not redo a movement whose remote commit, artifacts and independent tests are already proven. If the named clock slot and repository state disagree, follow repository state and perform the first incomplete movement.

### Performance and anti-zombie law

- The 02:00 Europe/London run performs exactly one short coherent block, targets 120–300 seconds and stops before 500 seconds.
- Runs after 02:00 may perform up to three consecutive coherent blocks. Review evidence after each block before choosing the next.
- Later runs target about 300 seconds total and normally stop by 500 seconds.
- At the midpoint of a later run, one extension to 1,000 seconds is permitted only after naming the still-progressing acceptance gate and stating why stopping would strand a nearly complete proof.
- Never extend twice. Never sleep, busy-poll, broadly retry, repeatedly clone, or wait on a workflow without doing other bounded work.
- If doubt remains after a block, sacrifice the next build block for independent review.
- Stop on permissions, source-licence ambiguity, remote-head movement, frozen-byte change, partial input, schema drift, failed canary or an unverified destructive action.
- Finish every run with `WHERE`, `WHAT`, `PROOF`, `WHY`, `DOUBT`, `NEXT` and the exact remote commit when one exists.

### Scheduled movements

| UK slot | Intended movement | Minimum useful finish |
|---|---|---|
| 02:00 | Movement 1 — NewsV3 organisation and role evidence | One deterministic builder/test checkpoint or an exact blocker; one block only |
| 03:00 | Review Movement 1, then Movement 2 — NewsV4 market/grid context | NewsV3 independently re-proven; NewsV4 source-health/freshness product tested |
| 04:00 | Review Movement 2, then Movement 3 — NewsV5 reasons to research | NewsV4 independently re-proven; transparent reason rules tested |
| 05:00 | Review Movement 3, then Movement 4 — NewsV6 data-centre namespace | NewsV5 independently re-proven; data-centre candidates and source rules tested |
| 06:00 | Movement 5 — analytical storage and cross-version reconciliation | Typed Parquet/DuckDB path where dependencies permit, or a tested staged contract with explicit blocker |
| 07:00 | Movement 6 — consumer projection and interface protection | Compact immutable projections, unchanged NewsV1 ordering/mobile semantics, regression proof |
| 08:00 | Movement 7 — independent recovery review | Five real versions accounted for, failures labelled, main clean, handover complete |

These slots are recovery hints, not permission to skip work. A later run always starts at the first incomplete movement.

### Dynamic next-run baton

Every scheduled run must adapt the following run from proved results, not from the clock alone.

Current baton:

| Field | Value |
|---|---|
| Last proven feature commit | `9ffdb64fca4dbb4cc2e41ec1315e8444c71ce1c7` |
| Outcome | `PASS` — NewsV5 CANDIDATE committed and read back with 45 deterministic `HOLD_FOR_VERIFICATION` decisions, zero unsupported browser reasons, six modular capability rules, six theme-vocabulary rows, hostile-negative result `2 HOLD / 1 REJECT / 3 ABSTAIN`, ledger SHA-256 `fbce604f865341391316917cb14d6319f8b1fdbb503a971a19a7c7d0ecfec06a` and green NewsV1–NewsV4 regressions |
| Next movement | Movement 4 — NewsV6 UK data-centre evidence namespace |
| Next acceptance gate | Build a deterministic `PN-DC-*` source/licence register, separately keyed campus/facility/building candidates and cross-source decision ledger; preserve OSM type/id for Atlas discovery rows, keep BBC and Data Center Map as credited outbound research links only, and prove positive fixtures plus hostile near-duplicate/name/proximity abstentions while NewsV5 remains green |
| Doubt to resolve | The audited Atlas data-centre layer is discovery evidence rather than official facility, capacity, lifecycle or role proof; a pinned source snapshot and at least one terms-compatible official public record must be identified before any candidate can be promoted beyond discovery-only |
| Next-run budget | Up to three reviewed blocks; target about 300 seconds, normal hard stop 500 seconds; use the single 1,000-second extension only if the pinned-source/licence and hostile-identity gate is demonstrably near completion |

At the end of every run:

1. review the feature commit from remote and classify it `PASS`, `FAIL`, `BLOCKED` or `NOT TESTED`;
2. replace every value in the current baton with the actual result, first incomplete movement, exact next gate, remaining doubt and next-run block budget;
3. commit that baton as a small documentation handoff after the feature review, so it can cite the proven feature commit without a circular hash;
4. read the baton commit back from remote;
5. leave the fixed 02:00–08:00 schedule unchanged—do not create a duplicate task or restart its recurrence count.

The next invocation must read the current baton before selecting work. If the baton conflicts with contracts/tests at remote `main`, contracts and test evidence win; repair the baton before building. This README handoff is the result-driven update to the next automation run.

### Overture — mandatory preflight every run

1. Read this README from the current remote `main`, not from a stale checkout.
2. Read the full relevant skill cartridges:
   - `skills/build-auditable-duckdb-parquet/SKILL.md` for every data product;
   - `skills/build-source-grounded-sales-intelligence/SKILL.md` for every claim, role, opportunity or data-centre feature;
   - `skills/build-progressive-static-data-ui/SKILL.md` before any browser or projection change.
3. Resolve the remote `main` SHA and compare it with the checkout before editing.
4. Read the latest recovery checkpoint, release contract, manifest, tests and the prior run's commit.
5. Run the predecessor's smallest decisive test before extending it.
6. Declare the current movement, grain, key, source of truth, null law, evidence class and rollback point in commentary.
7. Work directly on `main` only because Vikram explicitly authorised it. Use one small fast-forward commit per independently proven checkpoint.

### Immutable federation law

- GlobalGrid V1–V9.7 and PipelineNews NewsV1 are frozen evidence. Never edit their bytes.
- NewsV2 and every later committed candidate become frozen predecessors when a successor starts.
- A directory is not a version. A version counts only when it has a material capability, deterministic builder, declared contract, source attribution, independent tests, audit manifest and recovery path.
- `DRAFT` means design only. `CANDIDATE` means its declared tests pass. `LIVE` requires deployed-byte and runtime proof. Never promote by wording alone.
- Keep news/event algorithms in separate modules so a new module can be added without rewriting identity, ranking or presentation.
- Preserve the current visible project/news order. Physical Parquet or JSON order never silently becomes display order; store and query an explicit rank.
- Never add a new release to the GlobalGrid homepage until it has a separately addressable deployed URL and verified committed bytes.

### Evidence layers

Keep three layers physically and semantically separate:

1. **Public evidence** — source owner, source page and record URL, licence/attribution, raw observation, observed/source-updated/ingested times, adapter version and hashes.
2. **Derived intelligence** — versioned entity links, event assertions, role assertions, freshness decisions and reason-to-research rules with limitations.
3. **Private sales workflow** — contacts, outreach, relationship notes, ownership, priority, budget, probability and deal stage. This never enters the public repository.

No source means `ABSTAIN`. A publisher headline is a `SOURCE_CLAIM`, not an independently verified event. Podcast appearance is theme evidence, not a prospect, customer, partner or referral. Proximity is context, not a grid connection. Market conditions are context, not proof of a project event or sale.

### Movement 1 — NewsV3 organisation and role evidence

Goal: turn raw organisation mentions into a strict namespace and record only directly evidenced roles without inventing transaction parties.

Pinned inputs:

- `newsv1/dist/major_project_news_v9_5_1.json`, SHA-256 `cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd`;
- `newsv2/data/material_event_assertions.json`, SHA-256 `329ae3cdbecfaa486bfca435100604aae08e2be14f2732ad2da78ad075304e31`.

Required products:

- `organisation_labels`: one row per exact normalised REPD operator label; stable hash key; expected 28 rows; status `UNRESOLVED_SOURCE_LABEL`.
- `project_operator_role_assertions`: one row per project × exact operator-label pair; expected 29 rows; role `REPD_PROJECT_OPERATOR_LABEL`; evidence points to the pinned REPD-derived source field.
- `transaction_role_decisions`: one row per NewsV2 assertion; expected 45 rows; buyer, seller, lender, EPC, ICP, OEM, supplier and adviser remain null with `ABSTAIN_NO_DIRECT_ROLE_EVIDENCE`.

Hard rules:

- Do not split composite labels such as `Firma Energy / IB Vogt`; a slash, ampersand or parenthesis does not prove separate legal entities or roles.
- Exact label normalisation may collapse Unicode and whitespace for keys but must preserve the raw label.
- A REPD operator label is not automatically a buyer, seller, developer, owner, EPC or current corporate identity.
- Preserve Beacon Fen's project link to `GG2050-REPD-13599`; never attach its article to 13600.
- Builder and verifier must be separate modules. Require 28/29/45 exact counts, unique non-null keys, composite-label canary, all transaction roles null, input hashes and byte-deterministic rebuild.

Movement 1 is complete only when its contract is `CANDIDATE`, manifest hashes every input/module/artifact, all tests pass twice with identical outputs, predecessor tests pass, and the remote commit is read back.

### Movement 2 — NewsV4 energy-market and grid context

Goal: create a separate contextual data module with truthful source freshness. It must never participate in article identity, project binding or opportunity scoring.

Adopt only the proven/hardenable contracts from `reports/ATLAS_V8_ENERGY_V6_ADAPTER_AUDIT.md`:

- Elexon settled System Prices keyed by settlement date × settlement period, with a completeness manifest;
- Elexon FUELINST keyed by period start × fuel type and labelled provisional;
- NESO Carbon Intensity keyed by retained source interval;
- PVLive only after the production endpoint, GSP identity, revision timestamps and data terms are recorded.

Do not copy V6 labels blindly. Market Index Price is not System/imbalance Price. Summed generation/import categories are not an independently observed demand series. Frequency is not a constraint record. No proven grid-constraint feed was found in V6.

Every source-health row requires source/record URLs, licence and attribution, adapter/schema versions, actual scheduler state, observed/source-updated/ingested/fresh-until times, raw/prior/output hashes, attempts, status, counts, duplicate/null gates and last-known-good commit. Derive `CURRENT`, `STALE`, `DEGRADED` or `UNAVAILABLE`; never trust `health: ok` as freshness.

The smallest valid NewsV4 material feature is a deterministic source-health/freshness and market-context snapshot with honest stale states. It may remain `CANDIDATE`; do not fake current observations to make it look live.

### Movement 3 — NewsV5 transparent reasons to research

Goal: explain why a verified public event or context may deserve human research, without claiming that an opportunity or relationship exists.

Build separate modules for:

- event-to-capability rules;
- market-pain vocabulary;
- evidence reconciliation;
- reason decision ledger;
- compact browser projection.

Every published reason requires `reason_id`, rule/version, project/entity key, triggering evidence IDs, evidence classes, source URLs, claim status, explanation, limitations and decision. Valid decisions are `PUBLISH_REASON_TO_RESEARCH`, `HOLD_FOR_VERIFICATION`, `REJECT` and `ABSTAIN`.

Use `reports/public-source-sales-theme-audit.v1.json` only as search vocabulary. It cannot establish a named prospect, relationship, budget, contact, purchase intent or probability. No private CRM field enters the public product.

Test hostile negatives: shared names, composite operator labels, a podcast guest with no project evidence, a stale market record, a headline with no verified event and a nearby substation with no connection evidence.

### Movement 4 — NewsV6 UK data-centre evidence namespace

Goal: create a separately keyed data-centre candidate and evidence product that can coexist with renewables without contaminating REPD identity.

Required distinctions:

- campus vs facility vs building;
- operator label vs owner vs developer vs occupier;
- operational vs construction vs planned vs proposed vs unknown;
- IT load vs requested grid capacity vs contracted capacity vs operational capacity;
- reported vs derived vs estimated vs illustrative evidence.

Allowed initial sources:

- official public planning, environmental, grid and company records within their terms;
- Atlas OSM data-centre points as discovery candidates only, preserving OSM type/id and observation limitations;
- BBC and Data Center Map as credited outbound research links, not copied datasets or proof of a site/capacity/role.

Never scrape or reproduce Data Center Map content without established permission. A directory listing is not an official capacity or ownership record. A BBC map/article is publisher evidence and a discovery route, not the system of record.

Use a namespace such as `PN-DC-*`, never a REPD project ID. Cross-source links require an explicit decision ledger and must abstain on fuzzy name/proximity alone. The release needs positive fixtures, hostile near-duplicate negatives and a source/licence register.

### Movement 5 — DuckDB/Parquet analytical discipline

For every keyed analytical product declare a pinned physical schema and prove after physical readback:

```text
total_rows = distinct_declared_keys
duplicate_key_groups = 0
required_null_key_rows = 0
written_schema = pinned_schema
readback_schema = pinned_schema
```

Use zstd Parquet as the analytical release product and DuckDB for deterministic transform/query/verification when dependencies are available. Keep historical backfill separate from forward updates, converge both into one canonical schema and fully rewrite touched partitions. Produce browser JSON only from explicit ordered queries.

If the runner lacks DuckDB/PyArrow, do not install arbitrary dependencies or pretend JSON is Parquet. Commit a tested schema/plan only if it materially advances the next safe run, label the physical build `BLOCKED`, and record the exact dependency gate.

### Movement 6 — consumer and interface protection

- NewsV1 remains the public UI recovery point until a later consumer release is independently deployable.
- Keep initial project rows <=100 and total initial DOM elements <10,000.
- Preserve all eleven columns inside the contained horizontal scroller at 390, 430, 440 and 768 CSS pixels.
- Use manifest-first immutable partitions, bounded concurrency, timeouts, in-flight request deduplication and explicit `WAIT/LOAD/OK/EMPTY/FAIL` states.
- Optional news, context or data-centre failure must not erase the last-known-good project table or trigger a second full-table render.
- Static CSS tests are not mobile runtime proof. Label unavailable browser widths `BLOCKED` or `NOT TESTED`.

### Movement 7 — independent recovery review

Account for each claimed version in a table containing feature, commit, contract, builder, artifacts, test command, result, live status and rollback. Re-run all release tests from a clean checkout. Verify frozen-tree hashes, exact remote head and README checkpoint. Inspect GitHub Actions only with targeted calls; a green workflow is supporting evidence, not data proof.

If fewer than NewsV2–NewsV6 qualify, say so plainly and name the failed gate. Never create an empty version to meet the target. Preserve every useful report and exact next command for the next human or automation run.

### Commit and review cadence

For each coherent block:

1. inspect remote head;
2. edit only the current movement;
3. run the current and predecessor gates;
4. run `git diff --check` and inspect every changed path;
5. commit atomically to remote `main` without force;
6. fetch the changed contract/manifest/README at the new commit;
7. classify the block `PASS`, `FAIL`, `BLOCKED` or `NOT TESTED`;
8. update this checkpoint and select or decline the next block.

If remote `main` moves before ref update, stop and reconcile. Never force over another writer. Never mutate or delete historical releases. Never call a candidate `LIVE` merely because GitHub Pages deployed something.

### End-of-run orchestration report

Use this exact compact structure so the next run can recover:

```text
WHERE: repository, branch, commit, release/movement
WHAT: one material capability or review completed
PROOF: counts, keys, hashes, canaries, tests and deployed evidence
WHY: concrete Ventus sales/deal-intelligence value
DOUBT: remaining uncertainty, BLOCKED/NOT TESTED evidence, no euphemisms
NEXT: first incomplete movement and one exact bounded action
```

The score wins by truthful compounding: source evidence first, derived intelligence second, private sales action elsewhere. More modules are valuable only when their boundaries stay inspectable.

## Operating protocol

- Work audit-first and verify repository state against GitHub before editing.
- Work directly on main unless Vikram explicitly changes that instruction.
- Use small reversible commits.
- Never overwrite or delete historical versions.
- Never modify frozen releases in place.
- Use three coherent work blocks where the task supports them; target 120–500 seconds total and approximately 300 seconds.
- Permit one explicitly named extension to 1,000 seconds only at the midpoint while a concrete acceptance gate is still progressing.
- Stop at the declared limit rather than hanging, polling or looping.
- Report counts, keys, hashes, canaries and exact test results.
- Report PASS, FAIL, BLOCKED or NOT TESTED plainly.
- Stop if a prerequisite, source commit or output cannot be verified.

## Federation boundaries

Pipeline News owns:

- Source adapters and source-health reporting.
- News discovery.
- Canonical URL resolution.
- Article identity.
- Source attribution.
- Near-duplicate and syndication collapse.
- Technology classification.
- Geography classification.
- UK vetoes.
- Candidate generation.
- Rule-based project binding.
- Regional classification.
- Event and relevance classification.
- Publication ranking and explicit display order.
- Complete acceptance, rejection and abstention ledgers.
- Typed Parquet products.
- Compact browser-facing JSON projections.
- Release manifests, hashes and audit reports.

GlobalGrid2050 owns:

- The user interface.
- Newspaper controls, cards, search and filters.
- The project table and mobile rendering.
- Same-origin committed snapshots imported from approved Pipeline News releases.
- A dependency contract identifying the exact Pipeline News commit and artifact hashes.

Pipeline News does not own or alter official REPD facts.

Official REPD identity, capacity, status, dates and references remain authoritative project-source data. Pipeline News may consume a pinned project snapshot for deterministic matching, but it must record the source commit and hash. News intelligence may never overwrite official facts.

## Verified repository anchors

Pipeline News repository:

- Repository: Ventusltd/pipelinenews
- Starting main commit: 691175e257f430a27ad962bd4abdd9ef1934975e
- Starting tree: 956fc4adbc245c5bb24199918f97fa6a77db1e3c
- Existing production code at that commit: none
- Existing tags or releases at that commit: none

GlobalGrid V9.7 baseline:

- Repository: Ventusltd/globalgrid2050
- Merged main commit: 824a23cd0cf9f90a9df942f1b37a09c2dc6472b7
- V9.7 subtree: 4fca94ede95789ade9490258a2323c00c13ec2ea
- Frozen V9.6.2 parent subtree: 99d3b5d80be77b43c9819a571f468913e6132d07
- Live candidate: https://globalgrid2050.com/uk_renewables_pipeline/v9.7/

Data architecture reference:

- Repository: Ventusltd/data-gb-electricity
- Audited main commit: 7c492745c974f6b8610cb1209f996b1553abb498

## Historical release policy

GlobalGrid V9.7 is deployed and validated but remains labelled CANDIDATE in its release contract.

Do not alter V9.7.

Do not repair or reuse V9.6 as a production base. V9.6 is discontinued historical evidence.

GlobalGrid V9.8 must be a new separately addressable consumer release. It must not mutate V9.7.

Pipeline News V1 is a separate data-engine version. It is not itself called GlobalGrid V9.8.

## Legacy archive and known omission

The current legacy archive records this GlobalGrid source commit:

bcf966f21ba778b8e739c5caba47e00ac01f8a2c

The original importer copied:

- V1 to V6 standalone dashboard files.
- The complete v7 directory.
- The complete v8 directory.
- The complete v9 directory.

Those copied files are immutable engineering evidence and must remain byte-identical.

The importer omitted these sibling releases that already existed at the recorded source commit:

- v9.4
- v9.5
- v9.5.1
- v9.6
- v9.6.1
- v9.6.2

V9.7 was created later and is also absent from the original archive.

Before production work:

1. Do not modify any existing archived byte.
2. Add exact V9.4 to V9.6.2 evidence from commit bcf966f21ba778b8e739c5caba47e00ac01f8a2c.
3. Add exact V9.7 migration evidence from commit 824a23cd0cf9f90a9df942f1b37a09c2dc6472b7.
4. Record the source commit and Git tree for every release.
5. Add an ARCHIVE_MANIFEST.json covering the archive.
6. Convert the importer into a verification-only mechanism.
7. Add CI that fails if any frozen archived byte changes.
8. Tag the completed evidence boundary, for example legacy-globalgrid-v1-v9.7-2026-08-24.

The broken V9.6 release should remain present and clearly discontinued. It is recovery evidence, not a production dependency.

## V1 release sequence

Use immutable release candidates:

- v1.0.0-rc.1: exact GlobalGrid V9.7 parity.
- v1.0.0-rc.2: independently audited parity plus hardened release machinery.
- v1.0.0: first approved independent production engine.

New discovery sources and ranking changes belong in a later version. They must not be introduced before rc.1 proves the existing feed can be recreated exactly.

## DuckDB and Parquet architecture

Follow the good data discipline demonstrated by data-gb-electricity:

- DuckDB is the transformation, query and validation engine.
- Typed Parquet is the analytical system of record.
- Use Hive-style partitions.
- Use zstd compression.
- Declare each dataset grain and stable key.
- Pin schemas before writing.
- Rewrite complete touched partitions rather than appending blindly.
- Deduplicate before writing.
- Read every written partition back.
- Validate schema and keys again after readback.
- Record source endpoints and trust status.
- Write JSON audit reports for every serious run.
- Keep historical backfill and forward update paths separate.
- Fail loudly on empty responses, null keys, duplicate keys and schema drift.

Do not copy weaknesses observed in the reference repository:

- Do not rely on ordinary Git history alone as a release mechanism.
- Do not treat an unproven scheduled updater as production.
- Do not leave obsolete script names in the documentation.
- Do not omit formal contracts, manifests and content hashes.
- Do not claim success because a workflow exists or turns green.

A committed DuckDB database is not mandatory. DuckDB may be the reproducible engine while Parquet remains the committed product. If a database is published later, it must be reproducible, versioned and hashed.

## Proposed repository structure

    README.md
    DATA_SOURCES.md
    NEWS_CONTRACT.md
    DEFINITIONS.md
    CHANGELOG.md
    KNOWN_GAPS.md

    contracts/
      v1/
        source-snapshot.schema.json
        article.schema.json
        article-source.schema.json
        candidate-binding.schema.json
        binding-decision.schema.json
        regional-decision.schema.json
        publication-item.schema.json
        display-record.schema.json
        build-run.schema.json
        module-registry.json
        release.schema.json

    src/pipelinenews/
      adapters/
      normalise/
      deduplicate/
      technology/
      geography/
      identity/
      classify/
      rank/
      ledger/
      export/

    pipelines/
      bootstrap_v9_7.py
      fetch_latest_news.py
      build_release.py
      validate_release.py
      publish_release.py

    fixtures/
      v9.7-baseline/
      identity-positive/
      identity-negative/
      regional-positive/
      hostile-negative/

    data/
      dataset=source_snapshots/year=YYYY/month=M/
      dataset=articles/year=YYYY/month=M/
      dataset=article_sources/year=YYYY/month=M/
      dataset=candidate_bindings/year=YYYY/month=M/
      dataset=binding_decisions/year=YYYY/month=M/
      dataset=regional_decisions/year=YYYY/month=M/
      dataset=publication_items/release=vX.Y.Z/
      dataset=display_records/release=vX.Y.Z/
      dataset=build_runs/year=YYYY/month=M/

    dist/
      releases/
        v1.0.0-rc.1/
          parquet/
          browser/
          contracts/
          manifest.json
      current.json

    reports/
      latest_pipeline_audit.json
      latest_source_health.json
      latest_parity_report.json
      releases/

## Mandatory grains and keys

### Source snapshots

Grain: one row per source-adapter retrieval.

Key: source_snapshot_id.

Required fields:

- source_snapshot_id
- adapter_id
- source_id
- retrieved_at_utc
- request_url
- response_status
- content_sha256
- licence_or_usage_mode
- module_version
- build_run_id

### Articles

Grain: one row per canonical article identity.

Key: article_id.

Article identity must be deterministic and based on a normalised canonical URL. URL aliases and redirects must be retained separately so a publisher redirect does not silently duplicate or erase an article.

Required fields:

- article_id
- canonical_url
- original_url
- headline
- source_id
- source_name
- published_at
- retrieved_at
- language
- content_hash
- syndication_cluster_id
- source_snapshot_id
- attribution_text
- licence_or_usage_mode

### Article sources and aliases

Grain: one row per article and source URL relationship.

Key: article_id plus source_url.

This table preserves redirects, syndicated copies and alternate links without creating duplicate publication records.

### Candidate bindings

Grain: one row per article, candidate entity, binder version and project-spine snapshot.

Key: article_id plus candidate_entity_id plus binder_version plus project_snapshot_sha256.

Evidence must preserve:

- Project-name anchors.
- Operator anchors.
- Geography anchors.
- Planning-reference anchors.
- Technology compatibility.
- Capacity corroboration.
- Foreign-location conflicts.
- Collision warnings.
- Score components.
- Rules triggered.

### Binding decisions

Grain: one row per article, binder version and project-spine snapshot.

Key: article_id plus binder_version plus project_snapshot_sha256.

Allowed decisions:

- PRIMARY_MATCH
- RELATED_DEVELOPMENT
- DISCOVERY_ONLY
- REJECT
- ABSTAIN

Every accepted, rejected and abstained article remains in the ledger.

### Regional decisions

Grain: one row per article and regional-classifier version.

Key: article_id plus regional_classifier_version.

Every record preserves technology evidence, geography evidence, UK evidence, utility context, country, region, decision, reason, classifier version and source-snapshot hash.

Every regional article must have project_signal_eligible set to false.

### Publication items

Grain: one row per release and article.

Key: release_id plus article_id.

### Display records

Grain: one row per release, view and display position.

Key: release_id plus view_id plus display_rank.

The publication sequence must be explicit. Physical Parquet or DuckDB scan order is never a display contract.

## GlobalGrid V9.7 parity baseline

The inherited headline input is:

globalgrid2050/dist/major_project_news_v9_5_1.json

SHA-256:

cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd

Baseline counts:

- ALL headlines: 133
- Canonical UK: 45
- V9.4 breadth baseline: 125
- Decision-ledger rows: 133
- Accepted international: 19
- US: 4
- Europe: 9
- International other: 6

Frozen hashes:

- Regional news: 905237ddcbc71761f21d8c78961931676ac0c585030d29af95c75c7772254a99
- Regional decisions: 66f9e8803c6d0d0e847950dc5002a2df3b1f1ac0451de0f76a931256ddcc7409
- Regional manifest: 494030710673dea0e4db52937d2243966fc47639a406a335df5d6bbd4e575467
- V9.7 module registry: a4f2b9a1bb91a517874c8cd84f81eeeb1fa3715cf220f6dee5c07bdbcbcc9109

URL-order hashes:

- ALL 133: da4d119c55eaf1bf963402698ca1615448f4b3961f349bd393d24e1a1043eed8
- Canonical UK 45: 341b8ab1baf327f301e128d9c6a770da42e6a734734fb96a06fc177d407ddd35
- Regional 19: 68a7e9e8ba11426abf8af7b1c6333b7177b425f401cbe8832da335e7eef2f37a

Pipeline News v1.0.0-rc.1 must reproduce these counts and ordered sequences before any new source adapter changes the public output.

## Display-order law

The producer owns display order because the GlobalGrid V9.7 browser filters and maps arrays without sorting them.

Current all_items order:

published descending, then headline descending.

Current canonical_items order:

published descending, then confidence descending, then headline descending.

The UK browser view does not render canonical_items directly. It filters all_items where canonical_relevant is true. The UK view must therefore retain the relevant stories' relative positions from all_items.

Regional classification iterates all_items without re-sorting. The accepted 19 regional stories preserve their relative positions from the 133-item source array.

Pipeline News must emit stable display_rank values.

Every publication query must include an explicit ORDER BY.

An unordered Parquet or DuckDB scan must never control the browser sequence.

New ranking intelligence must create a new immutable release rather than reordering an old one.

## Current interface contract

The visible newspaper controls remain in this order:

ALL, UK, INTERNATIONAL, US, EUROPE, SOLAR, BESS, CONSENT, CONSTRUCTION, OPERATIONAL, FINANCE / M&A, SEARCH.

Default view: ALL.

Semantics:

- ALL displays all 133 inherited items, including discovery-only articles.
- UK displays the 45 canonically bound items in their relative all_items order.
- INTERNATIONAL displays all 19 accepted regional articles.
- US displays the four US regional articles.
- EUROPE displays the nine European regional articles.
- Six other regional stories appear within INTERNATIONAL.
- SOLAR, BESS and event filters operate on the 133-item inherited feed.
- UK and ALL search cover headline, project, operator, county, source, event, REPD Ref and GlobalGrid ID.
- Regional search covers headline, source, technology, country and region.
- Regional stories never update project-table signals.
- Project-table news signals come only from canonical PRIMARY_MATCH items.

Card semantics remain:

- Canonical: RELEVANT confidence percentage, PRIMARY_MATCH and REPD reference.
- Non-canonical: DISCOVERY ONLY and no project signal.
- Regional: region, country, source, classifier version, ledger status and no REPD project signal.

GlobalGrid V9.8 may initially change only its news data adapter. It must not redesign the newspaper, controls, project table or mobile interface.

Inherited project-interface invariants:

- 7,680 projects.
- 356,474.09 MW.
- Eleven project-table columns.
- Horizontal project-table scrolling on mobile.
- No full-page horizontal overflow at 390, 430, 440 or 768 pixels.

## Browser compatibility projection

Pipeline News must publish both:

1. A modern Pipeline News V1 contract.
2. A separate GlobalGrid compatibility projection.

The compatibility exporter initially preserves:

- Schema globalgrid2050.major-project-news.v9.5.1.
- Release 9.5.1.
- Arrays all_items and canonical_items.
- Matching all_headline_count.
- Matching relevant_headline_count.
- v9_4_baseline_headline_count equal to 125.
- Boolean canonical_relevant on every all_items record.
- PRIMARY_MATCH and eligible_for_news_signal true on every canonical item.
- A non-empty repd_ref.
- A gg_project_id matching GG2050-REPD plus the reference.
- The exact Beacon Fen contract.

It also reproduces:

- regional_news.json
- regional_decisions.json
- regional_manifest.json

Every browser artifact must be traceable to:

- A declared Parquet query.
- Explicit SQL ordering.
- Row counts.
- Content hashes.
- Schema version.
- Pipeline commit.
- Module versions.
- Project-spine snapshot hash.
- Build timestamp.
- Release ID.

## Non-negotiable project-identity rules

- REPD Ref ID is the authoritative external identifier.
- Canonical project ID is GG2050-REPD plus the official Ref ID.
- Physical development grouping is separate from project identity.
- Co-located solar and BESS remain separate official records.
- One article may have only one PRIMARY_MATCH.
- RELATED_DEVELOPMENT cannot drive the primary project signal.
- Foreign-location evidence vetoes a UK binding.
- Technology compatibility is mandatory.
- Capacity is corroboration only and never establishes identity.
- News capacity is stored separately as news_capacity_mw.
- News never changes official REPD capacity.
- News never changes official REPD status.
- News-derived events retain the asterisk convention because they remain headline-derived.
- Administrative names are split safely at commas, spaced dashes and the word near.
- Development duplicates are grouped with gg_development_id without merging official records.
- Strong-anchor floor remains 52.
- Weak-anchor floor remains 68.
- Single-token project stems require adjacent descriptive evidence.
- Foreign-collision stems require exact-name evidence.
- Rejection telemetry is published.
- Default classification is ABSTAIN.
- A model never invents an identifier.
- A model never establishes, overwrites or repairs identity from free text.
- Any future model may only verify a bounded rule-generated candidate set.
- A verifier must support a mandatory NONE result.
- Rule-based identity remains authoritative.

## Beacon Fen production sentinel

Correct binding:

- Project: Beacon Fen Energy Park
- Developer evidence: Low Carbon
- Technology: solar
- Official capacity: 400 MW
- REPD Ref: 13599
- GlobalGrid ID: GG2050-REPD-13599
- Role: PRIMARY_MATCH
- Eligible for news signal: true

It must never bind to the co-located BESS record 13600.

The headline Beacon Fen Energy Park development consent decision announced must survive the UK filter.

The separate discovery headline Low Carbon wins permit for 400MW UK solar farm must not create another primary binding solely from developer and capacity evidence.

## Hostile fixtures

Carry forward and expand positive and negative evaluation fixtures.

Mandatory negatives include:

- Foreign projects sharing a UK project stem.
- New Jersey and other US stories.
- Australian storage-market stories.
- Irish storage projects.
- Generic company announcements.
- Technology articles with no project.
- Planning prose with no energy project.
- Capacity-only coincidences.
- Operator-only coincidences.
- Cable-landing, healthcare, airport or industrial stories wrongly treated as renewable projects.
- Duplicate syndicated headlines.
- Project names embedded in unrelated prose.
- Canadian Solar used as a company name rather than geographic evidence.
- Kintore, Wilton and Longhedge leakage sentinels.
- The Grange healthcare headline.

Every rejected or abstained record remains in the decision ledger with a deterministic reason.

## Modular intelligence

New modules must be independently extensible. Each module has:

- A unique ID.
- One declared responsibility.
- A version.
- Input and output contracts.
- Evidence fields.
- A clear failure mode.
- Tests.
- A registry entry.
- A content hash.

Initial module families:

- Source adapters.
- URL canonicalisation.
- Attribution.
- Exact deduplication.
- Syndication collapse.
- Technology evidence.
- Geography evidence.
- UK veto.
- Project candidate blocking.
- Identity scoring.
- Rule-based verification.
- Event classification.
- Regional classification.
- Relevance classification.
- Publication ranking.
- Decision ledger.
- Browser exporter.
- Manifest writer.

Future domain modules may include renewables, grid, data centres, interconnectors, EV and industrial demand. Do not implement future-domain expansion in the parity release.

For future data-centre news, visibly credit and link original sources. Data Center Map remains an outbound directory link unless licensed. Independent facility intelligence should come from official and open sources such as OSM, DSIT, Ofgem, NESO and planning data.

## News aggregation and source policy

Pipeline News is an aggregator, not a republication engine.

It may store:

- Headline.
- Publisher.
- Publication date.
- Canonical URL.
- Concise independently written summary.
- Technology.
- Geography.
- Event.
- Project binding.
- Provenance.
- Retrieval timestamp.
- Classification evidence.
- Direct original link.

It must not commit copied full articles or reproduce third-party maps and images without permission.

DATA_SOURCES.md must record each adapter's publisher, endpoint, access method, grain, update frequency, usage mode, trust status, known limitations, deduplication and failure behaviour.

Prefer original publishers and official sources. Collapse syndicated copies into one article cluster while retaining source aliases.

## Write, audit, publish

Every release build follows this sequence:

1. Retrieve or load a declared source snapshot.
2. Hash and record it.
3. Normalise articles.
4. Canonicalise URLs.
5. Deduplicate by the declared key.
6. Generate bounded project candidates.
7. Apply technology and geography vetoes.
8. Apply deterministic identity rules.
9. Classify remaining unbound articles regionally.
10. Write staged Parquet.
11. Read the written Parquet back.
12. Validate schema.
13. Validate keys.
14. Validate null-key counts.
15. Generate explicit display ranks.
16. Generate browser JSON with explicit SQL ordering.
17. Hash every output.
18. Run parity and hostile tests.
19. Write audit and release manifests.
20. Publish only when every invariant passes.

A failed source must not replace the last-known-good release with empty or partial data.

## Workflow discipline

Keep workflows few:

1. ci.yml for schema, unit, ledger, parity, deterministic-build and archive-integrity checks.
2. update-news.yml for bounded manual updates initially.
3. release.yml for immutable release artifacts and tags.

Scheduling remains disabled until a manual end-to-end update is independently verified. When approved, use the established 05:29 UTC update time unless changed by the owner.

Use Python 3.11, pinned dependencies, concurrency controls, timeouts, fail-loud shell settings, dry-run defaults and an explicit apply flag.

An unattended workflow never commits unvalidated output.

## Hard release gates

### Archive integrity

- Existing archived bytes unchanged.
- Missing V9.4 to V9.7 evidence captured exactly.
- Source commits and tree hashes recorded.
- Archive manifest matches every file.
- CI detects mutation.

### Schema and keys

- Every Parquet table matches its pinned schema.
- Rows equal distinct declared keys.
- Duplicate-key groups equal zero.
- Required null-key rows equal zero.
- Readback schema equals the pre-write schema.

### V9.7 parity

- 133 ALL.
- 45 UK.
- 19 international.
- 4 US.
- 9 Europe.
- 6 international-other.
- 133 complete decisions.
- Content and order hashes match.
- UK is filtered from all_items without reordering.
- Regional items preserve relative order.
- No unordered scan controls publication order.

### Identity

- One or zero PRIMARY_MATCH decisions per article.
- Every primary match has one authoritative REPD Ref.
- Every canonical GlobalGrid ID matches that reference.
- Capacity-only identity is impossible.
- Foreign and technology vetoes run before acceptance.
- Beacon Fen binds only to 13599.
- Beacon Fen never binds to 13600.
- Regional articles contain no project, REPD, operator, county or capacity metadata.
- Regional project_signal_eligible is always false.

### Ledger

- Every input has a decision.
- Every acceptance has evidence.
- Every rejection and abstention has a deterministic reason.
- Source snapshot, module version and project-spine hash are present.
- Decision totals reconcile to input count.

### Publication

- Every published article has source, date, URL and attribution.
- Full third-party articles are absent.
- The manifest hashes every Parquet, JSON and contract output.
- The same input rebuild produces zero byte difference.
- Frozen release directories remain byte-identical.
- current.json is the only mutable release pointer.

### Independent verification

An independent clean checkout recalculates keys, counts, hashes, order, Beacon Fen, hostile negatives and the derivation of browser JSON from Parquet.

## GlobalGrid V9.8 integration

Frozen V9.7 must never fetch a mutable endpoint.

After Pipeline News V1 parity passes:

1. Freeze and tag the approved Pipeline News release.
2. Create GlobalGrid V9.8 as a new directory.
3. Add a source contract containing the Pipeline News repository, commit, release and artifact hashes.
4. Import the compact browser JSON into V9.8 as a same-origin committed snapshot.
5. Change only the V9.8 news adapter initially.
6. Preserve controls, card formatting, display order, project table and mobile interface.
7. Run the inherited V1 to V9.7 regression chain.
8. Test 390, 430, 440 and 768 pixel widths.
9. Verify deployed bytes with cache-busted URLs.
10. Add V9.8 after V9.7 in the GlobalGrid directory without changing old entries.
11. Keep V9.7 byte-identical.

## Bounded implementation plan

### Pass 1: audit and contracts

Verify repository SHAs, worktrees, archive hashes and baseline artifacts. Write the V1 scope and data contracts. Stop if any source differs.

### Pass 2: complete archive evidence

Add the omitted V9.4 to V9.7 evidence without modifying existing archive bytes. Add the archive manifest and integrity check. Commit to main and report hashes.

### Pass 3: scaffold V1

Add the discipline pointer, source register, contracts, definitions, changelog, schemas, module registry, pinned dependencies and minimal CI.

### Pass 4: build the parity importer

Load exact V9.7 artifacts, transform them into typed Parquet and produce the source, article, binding, decision, publication and display datasets.

### Pass 5: port modular decisions

Port the source adapter, technology evidence, geography evidence, UK veto, regional classifier, ledger and deterministic writer as separate registered modules.

### Pass 6: compatibility exports

Generate Pipeline News V1 JSON, GlobalGrid-compatible JSON, regional outputs, source health and a complete manifest.

### Pass 7: parity and hostile tests

Verify counts, content hashes, order hashes, Beacon Fen, hostile negatives, regional sanitisation, deterministic rebuild and Parquet readback.

### Pass 8: freeze v1.0.0-rc.1

Publish the immutable release directory, commit to main, tag the release candidate and stop for owner review.

### Pass 9: independent audit

Use a clean checkout or independent agent. Any repair becomes a new release candidate. Never alter rc.1.

### Pass 10: GlobalGrid V9.8

Proceed after Pipeline News approval. Create the new consumer version, pin and import the approved output, preserve the interface, deploy and stop for visual review.

## Completion report

Every completed pass reports:

- Repository and branch.
- Starting and ending SHA.
- Commit message.
- Files changed.
- Release path.
- Source snapshot and hash.
- Parquet rows and distinct keys.
- Duplicate and null-key counts.
- Decision totals.
- Regional counts.
- Display-order hashes.
- Beacon Fen result.
- Hostile-negative result.
- Artifact hashes.
- Workflow URLs.
- Frozen directories proved unchanged.
- Anything blocked or not tested.

Do not report only that checks are green.

## Stop conditions

Stop if:

- V9.7 would need modification.
- Archived bytes change unexpectedly.
- A source commit cannot be verified.
- Counts or order hashes differ during parity.
- Beacon Fen fails.
- Capacity establishes identity.
- A regional story obtains a project signal.
- A source failure emits empty or partial public data.
- A required grain, key or schema is undefined.
- Unrelated changes overlap the task.
- GitHub permissions prevent verification.
- Work approaches the active-time limit.

## Central rule

Build Pipeline News as the independent DuckDB and Parquet news engine, prove exact V9.7 content and display-order parity first, freeze every release, and only then let a new GlobalGrid V9.8 consume the pinned output without changing the current interface.
