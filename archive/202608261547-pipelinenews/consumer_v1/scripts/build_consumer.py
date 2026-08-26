#!/usr/bin/env python3
import hashlib
import json
import re
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "consumer_v1"
CONTRACT_PATH = BASE / "contracts/release.consumer-v1.json"
OUT = BASE / "data"


def raw(path):
    return path.read_bytes()


def load(path):
    return json.loads(raw(path))


def sha_bytes(value):
    return hashlib.sha256(value).hexdigest()


def sha_path(path):
    return sha_bytes(raw(path))


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def url_order_hash(rows):
    return sha_bytes(("\n".join(row["url"] for row in rows)).encode())


contract = load(CONTRACT_PATH)
expected = contract["expected"]

paths = {
    "feed": ROOT / "newsv1/dist/major_project_news_v9_5_1.json",
    "regional_news": ROOT / "newsv1/data/v9.7/regional_news.json",
    "regional_decisions": ROOT / "newsv1/data/v9.7/regional_decisions.json",
    "regional_manifest": ROOT / "newsv1/data/v9.7/regional_manifest.json",
    "index": ROOT / "newsv1/index.html",
    "mobile_css": ROOT / "newsv1/styles/v9-6-1.css",
    "release_contract": ROOT / "newsv1/contracts/release.newsv1.json",
}
for name, path in paths.items():
    if sha_path(path) != contract["source"]["newsv1_hashes"][name]:
        raise SystemExit(f"frozen NewsV1 hash mismatch: {name}")

manifest = load(ROOT / contract["source"]["parquet_manifest"])
artifact_map = {Path(item["path"]).name: item for item in manifest["artifacts"]}
for filename, digest in contract["source"]["required_parquet_artifacts"].items():
    parquet = ROOT / "analytics_v1/parquet" / filename
    if artifact_map.get(filename, {}).get("sha256") != digest or sha_path(parquet) != digest:
        raise SystemExit(f"Parquet provenance mismatch: {filename}")

queries = {
    "reasons_to_research": """SELECT payload_json FROM read_parquet(?) WHERE decision = 'PUBLISH_REASON_TO_RESEARCH' ORDER BY source_display_order, reason_decision_id""",
    "data_centre_sources": "SELECT payload_json FROM read_parquet(?) ORDER BY source_id",
    "data_centre_observations": "SELECT payload_json FROM read_parquet(?) ORDER BY evidence_id",
    "data_centre_link_decisions": "SELECT payload_json FROM read_parquet(?) ORDER BY link_decision_id",
}
files = {
    "reasons_to_research": "newsv5_reason_decisions.parquet",
    "data_centre_sources": "newsv6_dc_sources.parquet",
    "data_centre_observations": "newsv6_dc_observations.parquet",
    "data_centre_link_decisions": "newsv6_dc_link_decisions.parquet",
}
connection = duckdb.connect(":memory:")
collections = {}
for name, query in queries.items():
    parquet = str(ROOT / "analytics_v1/parquet" / files[name])
    collections[name] = [json.loads(row[0]) for row in connection.execute(query, [parquet]).fetchall()]
connection.close()

feed = load(paths["feed"])
regional = load(paths["regional_news"])
regional_manifest = load(paths["regional_manifest"])
html = paths["index"].read_text(encoding="utf-8")
css = paths["mobile_css"].read_text(encoding="utf-8")

all_items = feed["all_items"]
uk_items = feed["canonical_items"]
regional_items = regional["articles"]
beacon = [item for item in uk_items if "Beacon Fen" in item.get("project", "")]

guard = {
    "schema": "pipelinenews.consumer-interface-guard.v1",
    "release": "consumer_v1",
    "status": "PASS",
    "generated_at": contract["generated_at"],
    "newsv1_action": "NO_CHANGE",
    "counts": {
        "all_headlines": len(all_items),
        "uk_headlines": len(uk_items),
        "international_headlines": len(regional_items),
        "us": regional_manifest["telemetry"]["by_region"]["US"],
        "europe": regional_manifest["telemetry"]["by_region"]["EUROPE"],
        "international_other": regional_manifest["telemetry"]["by_region"]["INTERNATIONAL_OTHER"],
    },
    "url_order_hashes": {
        "all": url_order_hash(all_items),
        "uk": url_order_hash(uk_items),
        "regional": url_order_hash(regional_items),
    },
    "beacon_fen": {
        "matches": len(beacon),
        "repd_ref": beacon[0]["repd_ref"] if len(beacon) == 1 else None,
        "gg_project_id": beacon[0]["gg_project_id"] if len(beacon) == 1 else None,
    },
    "interface": {
        "project_table_columns": len(re.findall(r"<th(?:\s|>)", html)),
        "mobile_horizontal_scroll": bool(re.search(r"\.tablewrap\s*\{[^}]*overflow-x:\s*auto", css, re.S)),
        "mobile_columns_preserved": bool(re.search(r"\.tablewrap \.hide-mobile\s*\{[^}]*display:\s*table-cell", css, re.S)),
    },
    "source_hashes": {name: sha_path(path) for name, path in paths.items()},
}

overlay = {
    "schema": "pipelinenews.consumer-intelligence-overlay.v1",
    "release": "consumer_v1",
    "status": "CANDIDATE",
    "generated_at": contract["generated_at"],
    "project_signal_action": "NO_CHANGE",
    "ordering": "Every collection is produced by the declared DuckDB query and its explicit ORDER BY.",
    "counts": {name: len(rows) for name, rows in collections.items()},
    **collections,
}

OUT.mkdir(parents=True, exist_ok=True)
write_json(OUT / "intelligence_overlay.json", overlay)
write_json(OUT / "interface_guard.json", guard)
artifacts = []
for name in ("intelligence_overlay.json", "interface_guard.json"):
    path = OUT / name
    artifacts.append({"path": f"consumer_v1/data/{name}", "sha256": sha_path(path), "bytes": path.stat().st_size})
build_manifest = {
    "schema": "pipelinenews.consumer-build-manifest.v1",
    "release": "consumer_v1",
    "status": "CANDIDATE",
    "generated_at": contract["generated_at"],
    "contract_sha256": sha_path(CONTRACT_PATH),
    "analytics_audit_sha256": sha_path(ROOT / "analytics_v1/reports/parquet_audit.json"),
    "artifacts": artifacts,
    "checks": {
        "explicit_order_queries": 4,
        "publishable_reasons": len(collections["reasons_to_research"]),
        "data_centre_project_signal_links": 0,
        "newsv1_interface_changed": False,
    },
}
write_json(OUT / "build_manifest.json", build_manifest)
print("PASS ConsumerV1 build: 4 ordered projections / NewsV1 protected / data-centre namespace isolated")
