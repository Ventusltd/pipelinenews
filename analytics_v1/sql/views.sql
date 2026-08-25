-- Generated deterministic DuckDB views; execute with analytics_v1/parquet as working directory.
CREATE OR REPLACE VIEW v_newsv2_event_assertions AS SELECT * FROM read_parquet('newsv2_event_assertions.parquet');
CREATE OR REPLACE VIEW v_newsv3_organisation_labels AS SELECT * FROM read_parquet('newsv3_organisation_labels.parquet');
CREATE OR REPLACE VIEW v_newsv3_project_operator_roles AS SELECT * FROM read_parquet('newsv3_project_operator_roles.parquet');
CREATE OR REPLACE VIEW v_newsv3_transaction_role_decisions AS SELECT * FROM read_parquet('newsv3_transaction_role_decisions.parquet');
CREATE OR REPLACE VIEW v_newsv4_source_health AS SELECT * FROM read_parquet('newsv4_source_health.parquet');
CREATE OR REPLACE VIEW v_newsv5_reason_decisions AS SELECT * FROM read_parquet('newsv5_reason_decisions.parquet') ORDER BY source_display_order, reason_decision_id;
CREATE OR REPLACE VIEW v_newsv6_dc_sources AS SELECT * FROM read_parquet('newsv6_dc_sources.parquet');
CREATE OR REPLACE VIEW v_newsv6_dc_observations AS SELECT * FROM read_parquet('newsv6_dc_observations.parquet');
CREATE OR REPLACE VIEW v_newsv6_dc_link_decisions AS SELECT * FROM read_parquet('newsv6_dc_link_decisions.parquet');
