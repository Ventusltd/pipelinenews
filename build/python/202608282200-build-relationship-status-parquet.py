#!/usr/bin/env python3
"""Build the three-row abstention-first federated relationship projection."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import duckdb


GENERATION = "202608282200"
DATASET = "relationship_governance_status"
RELATIVE_PARQUET = (
    f"releases/data/intelligence/{GENERATION}/"
    f"relationship-governance-status/{GENERATION}-part-000.parquet"
)
RELATIVE_BROWSER = f"releases/data/{GENERATION}-relationship-governance-status.json"


def read_json(path: Path) -> tuple[bytes, dict]:
    raw = path.read_bytes()
    return raw, json.loads(raw)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def canonical(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def validate_contracts(frozen: dict, companies: dict, data_centres: dict) -> None:
    require(frozen["schema"] == "pipelinenews.federated-relationship-intelligence-contract.v1", "frozen schema")
    require(frozen["generation"] == "202608282041", "frozen generation")
    require(companies["schema"] == "federated-company-repd-relationship-contract-v1", "companies schema")
    require(companies["owner"] == "Ventusltd/companies", "companies owner")
    require(companies["lineage"]["candidate_commit"] == "407ff7f0a4d3f29a022845153364c9966075dbe7", "companies candidate")
    require(companies["verified_candidate"]["company_repd_candidate_rows"] == 482030, "companies rows")
    require(companies["verified_candidate"]["solar_company_repd_candidate_rows"] == 346233, "solar rows")
    require(companies["relationship_policy"]["role"] == "UNKNOWN", "companies role")
    require(companies["relationship_policy"]["default_consumer_decision"] == "ABSTAIN", "companies decision")
    require(companies["relationship_policy"]["identity_posture"] == "CANDIDATE_ONLY_NOT_CONFIRMED_OWNERSHIP", "companies identity")
    require(companies["privacy_and_storage"]["pipeline_news_may_copy_bulk_company_data"] is False, "companies copy law")
    require(companies["publication"]["promotion_eligible"] is False, "companies promotion law")
    require(data_centres["schema"] == "data-centre-company-federation-contract-v1", "data-centres schema")
    require(data_centres["owner"] == "Ventusltd/data-centres-gb", "data-centres owner")
    require(data_centres["lineage"]["candidate_commit"] == "b2be24b3673a2532b3deab87f90861ca59e730fd", "data-centres candidate")
    require(data_centres["verified_candidate"]["element_rows"] == 306, "data-centre source rows")
    require(data_centres["relationship_dataset"]["rows"] == 612, "data-centre relationship rows")
    require(data_centres["closed_vocabulary"]["adjudication_decision"] == {"ABSTAIN": 612}, "data-centre decision")
    require(data_centres["closed_vocabulary"]["eligible_for_join"] == {"false": 612}, "data-centre join law")
    require(data_centres["interpretation"]["relationship_type_is_requested_slot_not_asserted_role"] is True, "requested-slot law")
    require(data_centres["interpretation"]["company_number_required_for_any_join"] is True, "company-number law")
    require(data_centres["privacy_and_storage"]["pipeline_news_may_copy_bulk_source_data"] is False, "data-centre copy law")
    require(data_centres["provenance_and_rights"]["datacentermap_network_requests"] == 0, "Data Center Map law")


def build_rows(frozen: dict, companies: dict, data_centres: dict) -> list[tuple]:
    upstream = {item["id"]: item for item in frozen["upstream_contracts"]}
    company_pin = upstream["COMPANY_REPD_CANDIDATES"]
    centre_pin = upstream["DATA_CENTRE_COMPANY_SLOTS"]
    rows = [
        (
            "COMPANY_REPD", "ALL_CANDIDATES", GENERATION, "Ventusltd/companies",
            company_pin["commit"], company_pin["sha256"], companies["lineage"]["candidate_commit"],
            companies["verified_candidate"]["company_repd_candidate_rows"], "UNKNOWN", "ABSTAIN",
            companies["relationship_policy"]["identity_posture"], False,
            "Name-derived candidate evidence only; ownership and project identity remain unconfirmed.",
        ),
        (
            "COMPANY_REPD", "SOLAR_SUBSET", GENERATION, "Ventusltd/companies",
            company_pin["commit"], company_pin["sha256"], companies["lineage"]["candidate_commit"],
            companies["verified_candidate"]["solar_company_repd_candidate_rows"], "UNKNOWN", "ABSTAIN",
            companies["relationship_policy"]["identity_posture"], False,
            "Solar subset of name-derived candidates; no ownership, operator or developer role is asserted.",
        ),
        (
            "DATA_CENTRE_COMPANY", "OWNER_OPERATOR_SLOTS", GENERATION, "Ventusltd/data-centres-gb",
            centre_pin["commit"], centre_pin["sha256"], data_centres["lineage"]["candidate_commit"],
            data_centres["relationship_dataset"]["rows"], "UNASSERTED_OWNER_OR_OPERATOR_SLOT", "ABSTAIN",
            data_centres["source_element_dataset"]["facility_identity_status"], False,
            "Requested role slots are not asserted relationships; a verified company number is required.",
        ),
    ]
    rows.sort(key=lambda row: (row[0], row[1]))
    require(len(rows) == 3 and len({(r[0], r[1]) for r in rows}) == 3, "declared key")
    require(all(r[9] == "ABSTAIN" and r[11] is False for r in rows), "abstention law")
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contract", required=True, type=Path)
    parser.add_argument("--companies", required=True, type=Path)
    parser.add_argument("--data-centres", required=True, type=Path)
    parser.add_argument("--out-root", required=True, type=Path)
    parser.add_argument("--audit", required=True, type=Path)
    args = parser.parse_args()

    frozen_raw, frozen = read_json(args.contract)
    companies_raw, companies = read_json(args.companies)
    centres_raw, data_centres = read_json(args.data_centres)
    validate_contracts(frozen, companies, data_centres)
    rows = build_rows(frozen, companies, data_centres)

    parquet_path = args.out_root / RELATIVE_PARQUET
    browser_path = args.out_root / RELATIVE_BROWSER
    parquet_path.parent.mkdir(parents=True, exist_ok=False)
    browser_path.parent.mkdir(parents=True, exist_ok=True)
    require(not parquet_path.exists() and not browser_path.exists(), "immutable target already exists")

    con = duckdb.connect()
    con.execute("""
        CREATE TABLE relationship_governance_status (
          relationship_family VARCHAR NOT NULL,
          segment VARCHAR NOT NULL,
          generation VARCHAR NOT NULL,
          source_repository VARCHAR NOT NULL,
          source_commit VARCHAR NOT NULL,
          source_contract_sha256 VARCHAR NOT NULL,
          candidate_commit VARCHAR NOT NULL,
          candidate_rows BIGINT NOT NULL,
          requested_role VARCHAR NOT NULL,
          decision VARCHAR NOT NULL,
          identity_posture VARCHAR NOT NULL,
          eligible_for_join BOOLEAN NOT NULL,
          caveat VARCHAR NOT NULL
        )
    """)
    con.executemany("INSERT INTO relationship_governance_status VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", rows)
    escaped = str(parquet_path).replace("'", "''")
    con.execute(f"COPY (SELECT * FROM relationship_governance_status ORDER BY relationship_family, segment) TO '{escaped}' (FORMAT PARQUET, COMPRESSION ZSTD)")
    con.close()

    landed = duckdb.connect()
    escaped = str(parquet_path).replace("'", "''")
    readback = landed.execute(f"SELECT * FROM read_parquet('{escaped}', hive_partitioning=false) ORDER BY relationship_family, segment").fetchall()
    columns = [item[0] for item in landed.description]
    row_count, distinct_count, null_keys, joinable, non_abstain = landed.execute(f"""
      SELECT count(*), count(DISTINCT (relationship_family, segment)),
             count(*) FILTER (WHERE relationship_family IS NULL OR segment IS NULL),
             count(*) FILTER (WHERE eligible_for_join),
             count(*) FILTER (WHERE decision <> 'ABSTAIN')
      FROM read_parquet('{escaped}', hive_partitioning=false)
    """).fetchone()
    compression = [row[0] for row in landed.execute(f"SELECT DISTINCT compression FROM parquet_metadata('{escaped}') ORDER BY compression").fetchall()]
    landed.close()
    require(readback == rows, "full typed landed readback")
    require((row_count, distinct_count, null_keys, joinable, non_abstain) == (3, 3, 0, 0, 0), "landed hard gates")
    require(compression == ["ZSTD"], "Parquet compression")

    browser_rows = [dict(zip(columns, row, strict=True)) for row in readback]
    browser = {
        "schema": "pipelinenews.federated-relationship-status-browser.v1",
        "generation": GENERATION,
        "heading": frozen["browser_projection"]["safe_heading"],
        "decision_posture": "ABSTENTION_FIRST",
        "project_bindings": 0,
        "confirmed_ownership_rows": 0,
        "confirmed_operator_rows": 0,
        "rows": browser_rows,
    }
    browser_bytes = json.dumps(browser, ensure_ascii=False, indent=2).encode() + b"\n"
    browser_path.write_bytes(browser_bytes)

    parquet_bytes = parquet_path.read_bytes()
    audit = {
        "schema": "pipelinenews.relationship-governance-parquet-audit.v1",
        "generation": GENERATION,
        "dataset": DATASET,
        "duckdb_version": duckdb.__version__,
        "compression": compression,
        "declared_key": ["relationship_family", "segment"],
        "rows": row_count,
        "distinct_declared_keys": distinct_count,
        "null_declared_keys": null_keys,
        "duplicate_key_groups": row_count - distinct_count,
        "non_abstain_rows": non_abstain,
        "eligible_for_join_rows": joinable,
        "project_bindings": 0,
        "confirmed_ownership_rows": 0,
        "confirmed_operator_rows": 0,
        "full_typed_value_equality": True,
        "inputs": [
            {"id": "FROZEN_CONTRACT", "bytes": len(frozen_raw), "sha256": sha256(frozen_raw)},
            {"id": "COMPANY_REPD_CANDIDATES", "bytes": len(companies_raw), "sha256": sha256(companies_raw)},
            {"id": "DATA_CENTRE_COMPANY_SLOTS", "bytes": len(centres_raw), "sha256": sha256(centres_raw)},
        ],
        "outputs": [
            {"path": RELATIVE_PARQUET, "bytes": len(parquet_bytes), "sha256": sha256(parquet_bytes)},
            {"path": RELATIVE_BROWSER, "bytes": len(browser_bytes), "sha256": sha256(browser_bytes)},
        ],
        "record_universe_sha256": sha256(canonical(browser_rows)),
        "raw_archives_copied": 0,
        "person_names_copied": 0,
        "status": "PASS",
    }
    args.audit.parent.mkdir(parents=True, exist_ok=True)
    args.audit.write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "rows": row_count, "parquet": RELATIVE_PARQUET, "browser": RELATIVE_BROWSER}, sort_keys=True))


if __name__ == "__main__":
    main()
