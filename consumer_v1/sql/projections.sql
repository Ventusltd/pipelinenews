-- ConsumerV1 publication queries. Physical Parquet scan order is never a display contract.
SELECT payload_json
FROM read_parquet('analytics_v1/parquet/newsv5_reason_decisions.parquet')
WHERE decision = 'PUBLISH_REASON_TO_RESEARCH'
ORDER BY source_display_order, reason_decision_id;

SELECT payload_json
FROM read_parquet('analytics_v1/parquet/newsv6_dc_sources.parquet')
ORDER BY source_id;

SELECT payload_json
FROM read_parquet('analytics_v1/parquet/newsv6_dc_observations.parquet')
ORDER BY evidence_id;

SELECT payload_json
FROM read_parquet('analytics_v1/parquet/newsv6_dc_link_decisions.parquet')
ORDER BY link_decision_id;
