# Ventus sales and deal intelligence roadmap

Snapshot: 2026-08-25

## Proven base

- NewsV1 preserves the frozen GlobalGrid V9.7 order and 7,680-project / 133-headline release contract.
- V9.5.1 supplies 45 canonical UK project-bound headlines, including the Beacon Fen REPD 13599 identity canary.
- `data-gb-electricity` proves typed, partitioned, hash-audited Parquet backfills; its failed monthly updater is a warning not to claim freshness without successful runs.
- `data-centres-gb` proves useful provenance concepts and a static landing page, but no deployed API or validated extracted data product was observed.
- Ventus podcast evidence supports market-pain vocabulary, not prospect or relationship claims.

## Intelligence layers

1. **Public evidence** — immutable source observations, URLs, source time, source register and hashes.
2. **Derived intelligence** — versioned entity links, event assertions, commercial-role assertions and transparent reason-to-research rules.
3. **Private sales workflow** — contacts, outreach, relationship notes, deal stage, priority and owner; never committed to the public repository.

## Frozen five-release sequence

| Release | One material capability | Primary acceptance gate |
|---|---|---|
| NewsV2 | Material-event assertion ledger and REPD delta-ready contract | 45 deterministic rows; event verification separate from canonical identity; Beacon Fen 13599 not 13600 |
| NewsV3 | Organisation entities and explicit commercial party roles | No role without direct evidence; accepted/rejected/abstained role ledger |
| NewsV4 | Explicit grid milestones and constraints | Official-source milestone, capacity type and as-of date remain separate |
| NewsV5 | Transparent public-evidence opportunity reasons | Every reason cites evidence and rule; no private CRM or invented probability |
| NewsV6 | Separate UK data-centre evidence namespace | Campus/facility/building and IT/requested/contracted/operational capacity distinctions enforced |

Each release is a new directory and contract. Never edit an earlier version in place. A release candidate must contain a real feature, deterministic build, tests, source policy and recovery path. Empty directories and untested `LIVE` labels do not count as versions.

## Missing modules after NewsV2

- Source-health and freshness ledger.
- Official REPD delta adapter with before/after assertions.
- Organisation aliases and time-bounded roles.
- Structured CfD, finance, procurement and grid milestones.
- Campus/facility/building data-centre identity.
- Public reason-to-research rules and private CRM handoff contract.

## Source policy

Always credit and link publishers. Do not reproduce article bodies. Use public official data only within applicable terms and retain source/as-of metadata. Data Center Map remains a credited outbound directory link unless licensed extraction is established. A BBC or podcast article can guide vocabulary and research, but it cannot replace primary-source verification of a site, capacity, role or deal.

## Release gate

Before commit: validate the relevant repository skills; run exact counts, keys, hashes, canaries and null-policy tests; label browser proof separately from static proof; record `PASS`, `FAIL`, `BLOCKED` or `NOT TESTED`; freeze the predecessor; and make rollback explicit.
