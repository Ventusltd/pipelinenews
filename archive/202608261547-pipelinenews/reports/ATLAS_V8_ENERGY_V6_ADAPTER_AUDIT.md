# Atlas V8 and UK Energy Tracking V6 adapter audit

Audit date: 2026-08-25  
Mode: read-only repository and deployed-byte inspection

## Executive decision

Atlas V8 and UK Energy Tracking V6 contain valuable adapter and runtime patterns, but their deployed data must not be described as live or current.

- The deployed Atlas HTML and engine match the repository implementation, but most nested Atlas data files are static snapshots last traceable to April 2026. The workflows inside `repd_grid_atlasv8/.github/workflows/` are not active repository workflows, while relevant root workflows are manual-only or write different paths.
- The deployed Energy Tracking V6 JSON files are readable and report successful historical fetches, but their payload clocks stopped on 18 June 2026. A field such as `health: ok` means that the last fetch succeeded; it is not a freshness proof.
- Neither product has a proven current grid-constraint source suitable for a PipelineNews project or deal assertion.

The safe reuse is their adapter discipline and source vocabulary, not their current `live` labels or cached snapshots.

## Verified anchors

| Product | Audited source state | Deployed evidence | Decision |
|---|---|---|---|
| Atlas V8 | Latest Atlas path commit `7135d8cc`; deployed HTML and engine hashes match | <https://globalgrid2050.com/repd_grid_atlasv8/> | Runtime implementation proven; dataset freshness varies and is mostly unmanifested |
| Energy Tracking V6 | GlobalGrid commit `cfb32796e4a3c45a0ab7bec53623b96c84a818a4` | <https://globalgrid2050.com/uk_energy_tracking_v6/> | Static site proven; current payloads are approximately 67 days stale at audit time |

Primary evidence links:

- [Atlas V8 source tree at the audited path commit](https://github.com/Ventusltd/globalgrid2050/tree/7135d8cc/repd_grid_atlasv8)
- [Current root REPD adapter](https://github.com/Ventusltd/globalgrid2050/blob/cfb32796e4a3c45a0ab7bec53623b96c84a818a4/scripts/repd_updater.py)
- [Energy updater](https://github.com/Ventusltd/globalgrid2050/blob/cfb32796e4a3c45a0ab7bec53623b96c84a818a4/scripts/update_uk_energy_v6.py), [price updater](https://github.com/Ventusltd/globalgrid2050/blob/cfb32796e4a3c45a0ab7bec53623b96c84a818a4/scripts/update_uk_price_v6.py) and [frequency updater](https://github.com/Ventusltd/globalgrid2050/blob/cfb32796e4a3c45a0ab7bec53623b96c84a818a4/scripts/update_uk_frequency_v6.py)
- [Deployed energy](https://globalgrid2050.com/uk_energy_tracking_v6/live_grid_energy.json), [price/carbon](https://globalgrid2050.com/uk_energy_tracking_v6/live_grid_price.json) and [frequency](https://globalgrid2050.com/uk_energy_tracking_v6/live_grid_frequency.json) artifacts
- [Elexon BMRS API licence](https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-use-bmrs-api/), [NESO Carbon Intensity terms](https://github.com/carbon-intensity/terms/) and [PVLive API project](https://github.com/SheffieldSolar/PV_Live-API)

## Atlas V8 adapter inventory

### REPD

The root `scripts/repd_updater.py` is a real DESNZ discovery and transformation adapter. It validates required fields, transforms British National Grid coordinates, classifies technologies and can emit official identifiers and milestone fields.

The deployed Atlas `repd_master.json` is not that new canonical output. It contains 10,784 features, declares Q1 2026 / 1 June 2026 sync evidence, and lacks `repd_ref`. The current root workflow is manual-only. Therefore:

- use the newer adapter only after a controlled rebuild and independent schema/hash audit;
- do not call the deployed Atlas REPD data Q2-current or canonical;
- retain strict official-ID resolution; coordinates and names remain navigation hints, not identity proof.

### OSM and infrastructure context

Atlas contains Overpass adapters for voltage lines and substations, data centres, industrial sites, airports, power plants, rail, roads, supermarkets, stadiums, motorway services, ports, subsea cables and hydrocarbon infrastructure. The deployed snapshots prove that these files render, not that they are current or authoritative.

Important limitations:

- the nested data files lack a consistent fetched time, source URL, licence, raw hash and source-record manifest;
- a label such as `UKPN (est)` is an estimate, not ownership evidence;
- proximity to a line or substation is not a connection agreement;
- four deep-subsea corridors are explicitly illustrative;
- the claimed GEM hydrocarbon merge is configuration-only because the input CSV is absent;
- present 33 kV regional files are not wired into the live interface.

Keep all OSM-derived features in a contextual namespace and label them `reported`, `derived`, `estimated` or `illustrative`.

### Other Atlas adapters

- NAEI heavy emitters: a genuine spreadsheet adapter and a 2,458-point deployed snapshot, but the source year is 2023 and one N2O conversion description conflicts with code. Re-audit the derivation before reuse.
- Open Charge Map: a genuine >=100 kW GB fetcher with retry handling and a 1,044-point snapshot, but the output omits stable source IDs, fetched time and a manifest.
- FX and metal prices: unofficial Yahoo chart endpoints plus hard-coded fallbacks; not Atlas layers and not proven News APIs.

## Energy Tracking V6 adapter inventory

### Reusable after hardening

1. **Elexon settled System Prices** — strongest price contract, keyed by settlement date and period. Add completeness gates because per-day failures can currently leave a partial range.
2. **Elexon FUELINST** — useful provisional generation mix keyed by period start and fuel type. The displayed `demandGW` is a sum of grouped generation/import categories, not an independently sourced demand observation.
3. **NESO Carbon Intensity** — retain the source interval as the record key; the V6 projection drops it and is not suitable for historical deduplication as-is.
4. **PVLive** — migrate to the production endpoint and retain GSP and revision timestamps before use. Historical observations can be revised.

### Do not reuse as claimed

- V6 labels Market Index Price as System/imbalance Price; these are different contracts.
- The frequency adapter heuristically accepts any 45–55 numeric field and may substitute the observation time; it is not authoritative.
- No proven live grid-constraint adapter exists in V6. Frequency, interconnector summaries and static trend pages do not establish constraint, curtailment or project causation.
- Oil, fuel and EV benchmark products lack sufficient current terms/freshness evidence for automated commercial intelligence.

### Current deployed clocks

At the audit time, the deployed files reported:

- energy: `2026-06-18T21:14:13Z`;
- price/carbon: `2026-06-18T21:14:15Z`;
- frequency: `2026-06-18T21:52:31Z`.

The last successful workflow runs were also 18 June, and the current relevant workflows are manual-only. Preserve old data only as an explicitly `STALE` last-known-good snapshot; never silently present it as live.

## Required PipelineNews adapter contract

Every future adapter must publish:

```text
source_id
source_owner
authoritative_tier
source_page_url
source_record_url or stable source_record_id
licence and required attribution
adapter_id and adapter_version
schema_version
actual scheduler path and enabled state
observed_at, source_updated_at, ingested_at and fresh_until
HTTP ETag and Last-Modified when available
attempt_count and fetch_status
raw_sha256, prior_raw_sha256 and output_sha256
record_count, distinct_key_count, null_key_count and duplicate_groups
evidence_class: reported | derived | estimated | illustrative
last_known_good_commit
```

The adapter must fail closed without overwriting the last-known-good product. A consumer must show `CURRENT`, `STALE`, `DEGRADED` or `UNAVAILABLE`, based on timestamps and gates rather than a historical health flag.

## Release routing

- **NewsV3:** organisation namespace and directly evidenced role assertions; no Atlas proximity inference.
- **NewsV4:** separate energy-market context using hardened settled System Prices, provisional FUELINST and interval-preserving carbon records. Add immutable snapshot/delta and freshness ledgers.
- **NewsV5:** opportunity reasons may use market context only as contextual evidence, never project or deal confirmation.
- **NewsV6:** data-centre identity remains separate from REPD, OSM and organisation namespaces. Atlas OSM data-centre points may be discovery candidates only.

All source fetches belong in controlled build automation. Browser consumers should use same-origin, manifest-first, immutable assets with bounded concurrency and timeouts.
