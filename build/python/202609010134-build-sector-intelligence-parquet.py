#!/usr/bin/env python3
"""Write, audit and publish the three PipelineNews sector-intelligence grains.

GitHub Actions is the intended execution plane. The program writes each
declared dataset to generation-scoped staging, audits that physical ZSTD
Parquet, publishes it to the candidate root, reads the landed file back with
DuckDB, and only then derives the bounded lazy-browser JSON.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import shutil
import sys
from typing import Any, Iterable


GENERATION = "202609010134"
CONTRACT_SCHEMA = "pipelinenews.sector-intelligence-contract.v3"
LEDGER_SCHEMA = "pipelinenews.sector-intelligence-ledger.v3"
USAGE_CONTEXT = "NON_COMMERCIAL_OPEN_SOURCE"
DATASETS = ("sector_items", "sector_item_topics", "sector_project_bindings")
DATASET_DIRECTORIES = {
    "sector_items": "sector-items",
    "sector_item_topics": "sector-item-topics",
    "sector_project_bindings": "sector-project-bindings",
}
FORBIDDEN_ITEM_FIELDS = {
    "repd_ref", "gg_project_id", "project", "technology", "capacity_mw", "operator", "county", "related_context_repd_ref"
}


class BuildError(RuntimeError):
    """A fail-closed data-law violation."""


def load_json(path: pathlib.Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise BuildError(f"JSON root must be an object: {path}")
    return value


def json_bytes(value: Any, *, pretty: bool = True) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2 if pretty else None,
                       separators=None if pretty else (",", ":")) + "\n").encode("utf-8")


def write_json(path: pathlib.Path, value: Any, *, pretty: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_bytes(json_bytes(value, pretty=pretty))
    os.replace(temporary, path)


def sha256_file(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def duckdb_module():
    try:
        import duckdb  # type: ignore
    except ModuleNotFoundError as exc:
        raise BuildError("DuckDB is required at the workflow-pinned version") from exc
    return duckdb


def checked_root(value: pathlib.Path, label: str) -> pathlib.Path:
    resolved = value.resolve()
    if GENERATION not in str(resolved):
        raise BuildError(f"{label} must contain generation {GENERATION}")
    if resolved == pathlib.Path(resolved.anchor):
        raise BuildError(f"{label} cannot be the filesystem root")
    return resolved


def sql_path(path: pathlib.Path) -> str:
    return str(path.resolve()).replace("'", "''")


def sql_identifier(value: str) -> str:
    if not value.replace("_", "").isalnum():
        raise BuildError(f"unsafe SQL identifier: {value}")
    return f'"{value}"'


def validate_contract(contract: dict[str, Any]) -> dict[str, dict[str, Any]]:
    if contract.get("schema") != CONTRACT_SCHEMA or contract.get("generation") != GENERATION:
        raise BuildError("contract identity mismatch")
    posture = contract.get("project_posture", {})
    if posture.get("application") != USAGE_CONTEXT or posture.get("application_usage_establishes_upstream_rights") is not False:
        raise BuildError("non-commercial application context is not separated from upstream rights")
    if contract.get("time_provenance") != {
        "generation_label_timezone": "Europe/London",
        "generation_label_utc_anchor": "2026-08-27T20:30:00Z",
        "live_collection_anchor_field": "collection_anchor_at",
        "live_collection_anchor_basis": "ACTIONS_LIVE_COLLECTION_STARTED_AT",
        "github_run_id_is_execution_provenance": True,
        "collection_anchor_claims_wall_clock_fetch_time": True,
    }:
        raise BuildError("time provenance contract changed")
    definitions = contract.get("datasets", [])
    if [definition.get("name") for definition in definitions] != list(DATASETS):
        raise BuildError("exact three-dataset order changed")
    by_name = {definition["name"]: definition for definition in definitions}
    expected_keys = {
        "sector_items": ["intelligence_item_id"],
        "sector_item_topics": ["intelligence_item_id", "topic_code"],
        "sector_project_bindings": ["intelligence_item_id", "repd_ref", "binding_role"],
    }
    for name in DATASETS:
        definition = by_name[name]
        if definition.get("key") != expected_keys[name]:
            raise BuildError(f"declared key changed: {name}")
        columns = definition.get("columns", [])
        names = [column.get("name") for column in columns]
        if not names or len(names) != len(set(names)):
            raise BuildError(f"schema is empty or duplicated: {name}")
        if not set(definition["key"]).issubset(names):
            raise BuildError(f"key is absent from schema: {name}")
        for column in columns:
            if column.get("duckdb_type") not in {"VARCHAR", "TIMESTAMP", "BIGINT", "DOUBLE", "BOOLEAN"}:
                raise BuildError(f"unsupported physical type: {name}:{column}")
    if contract.get("physical_layout", {}).get("compression") != "ZSTD":
        raise BuildError("ZSTD is mandatory")
    if contract.get("physical_layout", {}).get("generation_target_policy") != \
            "IMMUTABLE_FULL_GENERATION_WRITE_FROM_EMPTY_TARGET":
        raise BuildError("immutable full-generation empty-target policy changed")
    if contract.get("physical_layout", {}).get("path_template") != \
            f"releases/data/intelligence/{GENERATION}/{{dataset_directory}}/{GENERATION}-part-000.parquet":
        raise BuildError("physical release path template changed")
    if contract.get("physical_layout", {}).get("dataset_directories") != DATASET_DIRECTORIES:
        raise BuildError("physical dataset directory closure changed")
    if contract.get("federation", {}).get("data_centres", {}).get("owner_parquet_copied") is not False:
        raise BuildError("owner Parquet must not be copied into PipelineNews")
    return by_name


def validate_ledger(ledger: dict[str, Any], contract: dict[str, Any], definitions: dict[str, dict[str, Any]]) -> None:
    if ledger.get("schema") != LEDGER_SCHEMA or ledger.get("generation") != GENERATION:
        raise BuildError("ledger identity mismatch")
    if ledger.get("usage_context") != USAGE_CONTEXT or ledger.get("usage_context_establishes_upstream_rights") is not False:
        raise BuildError("ledger usage/right separation changed")
    collection_anchor = ledger.get("collection_anchor_at")
    if not isinstance(collection_anchor, str) or not collection_anchor.endswith("Z"):
        raise BuildError("collection anchor must be a normalized UTC timestamp")
    try:
        dt.datetime.fromisoformat(collection_anchor.replace("Z", "+00:00"))
    except ValueError as exc:
        raise BuildError("collection anchor is not an ISO timestamp") from exc
    if ledger.get("collection_anchor_basis") not in {
        contract["time_provenance"]["live_collection_anchor_basis"],
        "SYNTHETIC_FIXTURE_GENERATION_ANCHOR",
    }:
        raise BuildError("collection anchor basis changed")
    datasets = ledger.get("datasets", {})
    if list(datasets) != list(DATASETS):
        raise BuildError("ledger dataset order changed")
    for name in DATASETS:
        columns = [column["name"] for column in definitions[name]["columns"]]
        entry = datasets[name]
        if entry.get("fields") != columns:
            raise BuildError(f"ledger schema differs from contract: {name}")
        rows = entry.get("rows")
        if not isinstance(rows, list):
            raise BuildError(f"ledger rows are not an array: {name}")
        keys = definitions[name]["key"]
        identities: list[tuple[Any, ...]] = []
        for row in rows:
            if list(row) != columns:
                raise BuildError(f"ledger row order differs from schema: {name}")
            identity = tuple(row.get(key) for key in keys)
            if any(value is None or (isinstance(value, str) and not value.strip()) for value in identity):
                raise BuildError(f"null/empty declared key: {name}")
            identities.append(identity)
            if row.get("generation") != GENERATION:
                raise BuildError(f"row generation changed: {name}")
            if name == "sector_items" and row.get("collection_anchor_at") != collection_anchor:
                raise BuildError("sector item collection anchor differs from ledger provenance")
            if row.get("eligible_for_news_signal") is not False:
                raise BuildError(f"sector row attempted to drive generic news: {name}")
        if len(identities) != len(set(identities)):
            raise BuildError(f"duplicate declared key: {name}")
    item_ids = {row["intelligence_item_id"] for row in datasets["sector_items"]["rows"]}
    for row in datasets["sector_item_topics"]["rows"]:
        if row["intelligence_item_id"] not in item_ids:
            raise BuildError("orphan sector topic")
    for row in datasets["sector_project_bindings"]["rows"]:
        if row["intelligence_item_id"] not in item_ids:
            raise BuildError("orphan sector project binding")
    serialised_items = json.dumps(datasets["sector_items"]["rows"], ensure_ascii=False)
    for field in FORBIDDEN_ITEM_FIELDS:
        if f'"{field}"' in serialised_items:
            raise BuildError(f"query-context identity field entered sector_items: {field}")
    evidence = ledger.get("policy_evidence", {})
    if evidence.get("generic_data_centre_rows_sanitised") != contract["invariants"]["data_centre_generic_rows_sanitised"]:
        raise BuildError("the six frozen data-centre rows were not sanitised")
    if evidence.get("query_context_used_for_project_identity") is not False:
        raise BuildError("query context was used for project identity")
    if evidence.get("owner_parquet_copied") is not False:
        raise BuildError("owner Parquet copy was claimed")
    if len(datasets["sector_project_bindings"]["rows"]) != 0:
        raise BuildError("this generation has no evidence-backed sector project bindings")
    statuses = ledger.get("source_statuses")
    if not isinstance(statuses, list) or [row.get("source_id") for row in statuses] != sorted(
            source["id"] for source in contract["sources"]):
        raise BuildError("source status closure differs from the contract")
    status_fields = {
        "source_id", "result", "requested", "response_bytes", "response_sha256", "content_type",
        "retained_items", "error_code"
    }
    if any(set(row) != status_fields for row in statuses):
        raise BuildError("source status schema changed")
    policy = ledger.get("policy_evidence")
    if not isinstance(policy, dict) or policy.get("network_requests") != contract["limits"]["maximum_network_requests"]:
        raise BuildError("source policy evidence is missing or inconsistent")
    compact_receipt_text = json.dumps({"source_statuses": statuses, "policy_evidence": policy}, ensure_ascii=False).lower()
    for forbidden in ("authorization", "bearer ", "api_key", "api-key", "credential", "password", "secret"):
        if forbidden in compact_receipt_text:
            raise BuildError("secret-shaped material entered the compact source receipt")


def expected_schema(definition: dict[str, Any]) -> list[tuple[str, str]]:
    return [(column["name"], column["duckdb_type"]) for column in definition["columns"]]


def audit_file(connection, parquet_path: pathlib.Path, definition: dict[str, Any], stage: str) -> dict[str, Any]:  # noqa: ANN001
    quoted_path = sql_path(parquet_path)
    parquet_scan = f"read_parquet('{quoted_path}', hive_partitioning=false)"
    described = connection.execute(f"DESCRIBE SELECT * FROM {parquet_scan}").fetchall()
    actual_schema = [(row[0], row[1]) for row in described]
    if actual_schema != expected_schema(definition):
        raise BuildError(f"{stage} schema mismatch: {definition['name']}:{actual_schema}")
    row_count = int(connection.execute(f"SELECT count(*) FROM {parquet_scan}").fetchone()[0])
    key_select = ", ".join(sql_identifier(name) for name in definition["key"])
    distinct_keys = int(connection.execute(
        f"SELECT count(*) FROM (SELECT {key_select} FROM {parquet_scan} GROUP BY {key_select})"
    ).fetchone()[0])
    key_null_predicate = " OR ".join(f"{sql_identifier(name)} IS NULL" for name in definition["key"])
    null_keys = int(connection.execute(
        f"SELECT count(*) FROM {parquet_scan} WHERE {key_null_predicate}"
    ).fetchone()[0])
    key_blank_predicate = " OR ".join(
        f"trim(CAST({sql_identifier(name)} AS VARCHAR)) = ''" for name in definition["key"]
    )
    blank_keys = int(connection.execute(
        f"SELECT count(*) FROM {parquet_scan} WHERE {key_blank_predicate}"
    ).fetchone()[0])
    duplicate_groups = int(connection.execute(
        f"SELECT count(*) FROM (SELECT {key_select}, count(*) AS n FROM {parquet_scan} "
        f"GROUP BY {key_select} HAVING n > 1)"
    ).fetchone()[0])
    if row_count != distinct_keys or null_keys != 0 or blank_keys != 0 or duplicate_groups != 0:
        raise BuildError(f"{stage} key invariant failed: {definition['name']}")
    all_columns = ", ".join(sql_identifier(column["name"]) for column in definition["columns"])
    expected_minus_physical = int(connection.execute(
        f"SELECT count(*) FROM ((SELECT {all_columns} FROM staged_dataset) "
        f"EXCEPT ALL (SELECT {all_columns} FROM {parquet_scan}))"
    ).fetchone()[0])
    physical_minus_expected = int(connection.execute(
        f"SELECT count(*) FROM ((SELECT {all_columns} FROM {parquet_scan}) "
        f"EXCEPT ALL (SELECT {all_columns} FROM staged_dataset))"
    ).fetchone()[0])
    if expected_minus_physical != 0 or physical_minus_expected != 0:
        raise BuildError(f"{stage} full typed value equality failed: {definition['name']}")
    null_counts: dict[str, int] = {}
    for column in definition["columns"]:
        if not column["nullable"]:
            name = column["name"]
            count = int(connection.execute(
                f"SELECT count(*) FROM {parquet_scan} WHERE {sql_identifier(name)} IS NULL"
            ).fetchone()[0])
            null_counts[name] = count
            if count != 0:
                raise BuildError(f"{stage} required field is null: {definition['name']}:{name}")
    compressions = sorted({row[0] for row in connection.execute(
        f"SELECT DISTINCT compression FROM parquet_metadata('{quoted_path}')"
    ).fetchall()})
    if row_count > 0 and compressions != ["ZSTD"]:
        raise BuildError(f"{stage} compression is not ZSTD: {definition['name']}:{compressions}")
    if row_count == 0 and compressions:
        raise BuildError(f"{stage} empty Parquet unexpectedly reports column chunks: {definition['name']}")
    return {
        "dataset": definition["name"],
        "stage": stage,
        "path": (
            f"staging/dataset={definition['name']}/part-000.parquet"
            if stage == "STAGE"
            else f"releases/data/intelligence/{GENERATION}/{DATASET_DIRECTORIES[definition['name']]}/{GENERATION}-part-000.parquet"
        ),
        "rows": row_count,
        "distinct_declared_keys": distinct_keys,
        "null_declared_keys": null_keys,
        "blank_declared_keys": blank_keys,
        "duplicate_key_groups": duplicate_groups,
        "expected_minus_physical_rows": expected_minus_physical,
        "physical_minus_expected_rows": physical_minus_expected,
        "full_typed_value_equality": True,
        "required_null_counts": null_counts,
        "schema": [{"name": name, "duckdb_type": kind} for name, kind in actual_schema],
        "compression": compressions,
        "compression_status": "PASS_ZSTD" if row_count else "NOT_APPLICABLE_EMPTY_NO_COLUMN_CHUNKS",
        "bytes": parquet_path.stat().st_size,
        "sha256": sha256_file(parquet_path),
    }


def publish_file(source: pathlib.Path, destination: pathlib.Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with source.open("rb") as source_handle, destination.open("xb") as destination_handle:
        shutil.copyfileobj(source_handle, destination_handle, length=1024 * 1024)


def json_value(value: Any) -> Any:
    if isinstance(value, dt.datetime):
        return value.replace(tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z")
    return value


def build_browser_projection(connection, landed: dict[str, pathlib.Path], contract: dict[str, Any]) -> dict[str, Any]:  # noqa: ANN001
    item_path = sql_path(landed["sector_items"])
    topic_path = sql_path(landed["sector_item_topics"])
    binding_path = sql_path(landed["sector_project_bindings"])
    query = f"""
      WITH bindings AS (
        SELECT intelligence_item_id, count(*) AS binding_count,
               bool_or(eligible_for_news_signal) AS any_signal
        FROM read_parquet('{binding_path}', hive_partitioning=false)
        GROUP BY intelligence_item_id
      )
      SELECT
        t.topic_code,
        t.display_rank AS topic_display_rank,
        i.intelligence_item_id,
        i.item_kind,
        i.title,
        i.summary,
        i.canonical_url,
        i.source_published_at,
        i.observed_at,
        i.staleness_state,
        i.status,
        i.evidence_class,
        i.source_id,
        i.source_licence_id,
        i.source_terms_url,
        i.redistribution_rights,
        i.attribution,
        i.owner_repository,
        i.owner_generation,
        i.owner_record_id,
        i.generic_article_id,
        i.value_min,
        i.value_max,
        i.unit,
        CASE WHEN i.generic_article_id IS NOT NULL
          THEN 'SECTOR CONTEXT ONLY — QUERY PROJECT IDENTITY REMOVED'
          ELSE 'SECTOR CONTEXT ONLY — NOT A PROJECT BINDING' END AS binding_label,
        coalesce(b.binding_count, 0) AS project_binding_count,
        coalesce(b.any_signal, false) AS eligible_for_news_signal
      FROM read_parquet('{item_path}', hive_partitioning=false) i
      JOIN read_parquet('{topic_path}', hive_partitioning=false) t USING (intelligence_item_id)
      LEFT JOIN bindings b USING (intelligence_item_id)
      ORDER BY t.display_rank, t.topic_code,
               i.source_published_at DESC NULLS LAST,
               i.observed_at DESC,
               i.intelligence_item_id
    """
    description = connection.execute(f"DESCRIBE {query}").fetchall()
    fields = [row[0] for row in description]
    rows = [[json_value(value) for value in row] for row in connection.execute(query).fetchall()]
    maximum = int(contract["browser_projection"]["maximum_rows_per_topic"])
    counts: dict[str, int] = {}
    bounded: list[list[Any]] = []
    for row in rows:
        topic = row[0]
        counts[topic] = counts.get(topic, 0) + 1
        if counts[topic] <= maximum:
            bounded.append(row)
    if any(row[-1] is not False or row[-2] != 0 for row in bounded):
        raise BuildError("browser projection acquired a project signal or binding")
    return {
        "schema": contract["browser_projection"]["schema"],
        "generation": GENERATION,
        "usage_context": USAGE_CONTEXT,
        "usage_context_establishes_upstream_rights": False,
        "derived_only_from_landed_parquet_duckdb_readback": True,
        "display_order": contract["browser_projection"]["display_order"],
        "fields": fields,
        "rows": bounded,
        "topic_counts_before_browser_limit": counts,
        "maximum_rows_per_topic": maximum,
        "project_bindings": 0,
        "eligible_for_news_signal": False,
        "generic_news_rows_mutated": False,
        "deployment": "not-authorised",
    }


def build(contract: dict[str, Any], ledger: dict[str, Any], ledger_bytes: bytes, out_root: pathlib.Path,
          stage_root: pathlib.Path, audit_path: pathlib.Path) -> dict[str, Any]:
    definitions = validate_contract(contract)
    validate_ledger(ledger, contract, definitions)
    out_root = checked_root(out_root, "output root")
    stage_root = checked_root(stage_root, "stage root")
    landed_generation_root = out_root / "releases" / "data" / "intelligence" / GENERATION
    browser_path = out_root / pathlib.Path(contract["browser_projection"]["path"])
    if landed_generation_root.exists() or browser_path.exists():
        raise BuildError("generation-scoped output target is not empty")
    out_root.mkdir(parents=True, exist_ok=True)
    stage_root.mkdir(parents=True, exist_ok=True)
    if any(stage_root.iterdir()):
        raise BuildError("generation-scoped staging target is not empty")
    duckdb = duckdb_module()
    connection = duckdb.connect(":memory:")
    connection.execute("SET threads=1")
    connection.execute("SET preserve_insertion_order=true")
    connection.execute("PRAGMA enable_verification")
    audit_records: list[dict[str, Any]] = []
    landed_paths: dict[str, pathlib.Path] = {}
    for name in DATASETS:
        definition = definitions[name]
        columns = definition["columns"]
        column_names = [column["name"] for column in columns]
        definitions_sql = ", ".join(
            f"{sql_identifier(column['name'])} {column['duckdb_type']}" for column in columns
        )
        connection.execute("DROP TABLE IF EXISTS staged_dataset")
        connection.execute(f"CREATE TABLE staged_dataset ({definitions_sql})")
        rows = ledger["datasets"][name]["rows"]
        if rows:
            placeholders = ", ".join("?" for _ in column_names)
            connection.executemany(
                f"INSERT INTO staged_dataset VALUES ({placeholders})",
                [[row[column] for column in column_names] for row in rows],
            )
        order_sql = ", ".join(sql_identifier(key) for key in definition["key"])
        stage_path = stage_root / f"dataset={name}" / "part-000.parquet"
        stage_path.parent.mkdir(parents=True, exist_ok=True)
        if stage_path.exists():
            raise BuildError(f"immutable stage file already exists: {name}")
        connection.execute(
            f"COPY (SELECT * FROM staged_dataset ORDER BY {order_sql}) TO '{sql_path(stage_path)}' "
            "(FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 122880)"
        )
        stage_audit = audit_file(connection, stage_path, definition, "STAGE")
        landed_path = landed_generation_root / DATASET_DIRECTORIES[name] / f"{GENERATION}-part-000.parquet"
        publish_file(stage_path, landed_path)
        landed_audit = audit_file(connection, landed_path, definition, "LANDED")
        if stage_audit["sha256"] != landed_audit["sha256"] or stage_audit["rows"] != landed_audit["rows"]:
            raise BuildError(f"landed file differs from its audited stage: {name}")
        landed_paths[name] = landed_path
        audit_records.append({"stage": stage_audit, "landed": landed_audit})
    browser = build_browser_projection(connection, landed_paths, contract)
    write_json(browser_path, browser)
    source_ledger_identity = {
        "schema": ledger["schema"],
        "bytes": len(ledger_bytes),
        "sha256": sha256_bytes(ledger_bytes),
        "collection_anchor_at": ledger["collection_anchor_at"],
        "collection_anchor_basis": ledger["collection_anchor_basis"],
        "source_statuses": ledger["source_statuses"],
        "policy_evidence": ledger["policy_evidence"],
    }
    source_receipt = {
        "schema": "pipelinenews.sector-intelligence-source-ledger-receipt.v3",
        "generation": GENERATION,
        "usage_context": USAGE_CONTEXT,
        "application_usage_establishes_upstream_rights": False,
        "source_ledger": source_ledger_identity,
        "dataset_rows": {
            name: len(ledger["datasets"][name]["rows"]) for name in DATASETS
        },
        "retained_raw_html_bytes": 0,
        "retained_article_body_bytes": 0,
        "retained_search_snippet_characters": 0,
        "deployment": "not-authorised",
    }
    source_receipt_path = (
        landed_generation_root /
        f"{GENERATION}-source-ledger-receipt.json"
    )
    write_json(source_receipt_path, source_receipt)
    source_receipt_record = {
        "path": f"releases/data/intelligence/{GENERATION}/{GENERATION}-source-ledger-receipt.json",
        "bytes": source_receipt_path.stat().st_size,
        "sha256": sha256_file(source_receipt_path),
    }
    audit = {
        "schema": "pipelinenews.sector-intelligence-parquet-audit.v3",
        "generation": GENERATION,
        "status": "PASS",
        "duckdb_version": duckdb.__version__,
        "usage_context": USAGE_CONTEXT,
        "application_usage_establishes_upstream_rights": False,
        "source_ledger": {
            **source_ledger_identity,
            "sanitized_receipt": source_receipt_record,
        },
        "datasets": audit_records,
        "summary": {
            "datasets": 3,
            "total_rows": sum(record["landed"]["rows"] for record in audit_records),
            "sector_items": audit_records[0]["landed"]["rows"],
            "sector_item_topics": audit_records[1]["landed"]["rows"],
            "sector_project_bindings": audit_records[2]["landed"]["rows"],
            "all_nonempty_column_chunks_zstd": True,
            "all_schemas_exact": True,
            "rows_equal_distinct_declared_keys": True,
            "null_declared_keys": 0,
            "blank_declared_keys": 0,
            "duplicate_key_groups": 0,
            "full_typed_value_equality": True,
            "browser_rows": len(browser["rows"]),
            "browser_derived_only_from_landed_parquet": True,
            "generic_news_rows_mutated": False,
            "owner_parquet_copied": False,
        },
        "deployment": "not-authorised",
    }
    write_json(audit_path, audit)
    connection.close()
    return {
        "audit": audit,
        "browser": browser,
        "browser_path": browser_path,
        "source_receipt_path": source_receipt_path,
    }


def parse_arguments(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contract", required=True)
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--out-root", required=True)
    parser.add_argument("--stage-root", required=True)
    parser.add_argument("--audit", required=True)
    return parser.parse_args(list(argv) if argv is not None else None)


def main(argv: Iterable[str] | None = None) -> None:
    arguments = parse_arguments(argv)
    ledger_path = pathlib.Path(arguments.ledger)
    ledger_bytes = ledger_path.read_bytes()
    result = build(
        load_json(pathlib.Path(arguments.contract)),
        json.loads(ledger_bytes),
        ledger_bytes,
        pathlib.Path(arguments.out_root),
        pathlib.Path(arguments.stage_root),
        pathlib.Path(arguments.audit),
    )
    print(json.dumps({
        "status": "PASS",
        "generation": GENERATION,
        **result["audit"]["summary"],
        "deployment": "not-authorised",
    }, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, BuildError, KeyError, TypeError, ValueError) as error:
        print(f"sector Parquet build failed closed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
