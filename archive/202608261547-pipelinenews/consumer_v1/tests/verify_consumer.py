#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "consumer_v1"


def load(path):
    return json.loads(path.read_bytes())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


contract = load(BASE / "contracts/release.consumer-v1.json")
expected = contract["expected"]
overlay = load(BASE / "data/intelligence_overlay.json")
guard = load(BASE / "data/interface_guard.json")
manifest = load(BASE / "data/build_manifest.json")

assert contract["status"] == overlay["status"] == manifest["status"] == "CANDIDATE"
assert guard["status"] == "PASS"
assert guard["counts"] == {
    "all_headlines": expected["all_headlines"],
    "uk_headlines": expected["uk_headlines"],
    "international_headlines": expected["international_headlines"],
    "us": expected["us"],
    "europe": expected["europe"],
    "international_other": expected["international_other"],
}
assert guard["url_order_hashes"] == expected["url_order_hashes"]
assert guard["beacon_fen"]["matches"] == 1
assert guard["beacon_fen"]["repd_ref"] == expected["beacon_fen_repd_ref"]
assert guard["beacon_fen"]["gg_project_id"] == "GG2050-REPD-13599"
assert guard["interface"] == {
    "project_table_columns": expected["project_table_columns"],
    "mobile_horizontal_scroll": True,
    "mobile_columns_preserved": True,
}

assert overlay["project_signal_action"] == "NO_CHANGE"
assert overlay["counts"] == {
    "reasons_to_research": expected["publishable_reasons"],
    "data_centre_sources": expected["data_centre_sources"],
    "data_centre_observations": expected["data_centre_observations"],
    "data_centre_link_decisions": expected["data_centre_link_decisions"],
}
assert overlay["reasons_to_research"] == []
assert all(row["decision"].startswith("ABSTAIN") for row in overlay["data_centre_link_decisions"])
assert [row["source_id"] for row in overlay["data_centre_sources"]] == sorted(row["source_id"] for row in overlay["data_centre_sources"])
assert [row["evidence_id"] for row in overlay["data_centre_observations"]] == sorted(row["evidence_id"] for row in overlay["data_centre_observations"])
assert [row["link_decision_id"] for row in overlay["data_centre_link_decisions"]] == sorted(row["link_decision_id"] for row in overlay["data_centre_link_decisions"])

forbidden = {"repd_ref", "gg_project_id", "project_id", "project_signal_eligible", "eligible_for_news_signal"}
for collection in ("data_centre_sources", "data_centre_observations", "data_centre_link_decisions"):
    assert not any(forbidden.intersection(row) for row in overlay[collection]), f"renewable identity leaked into {collection}"

sql = (BASE / "sql/projections.sql").read_text(encoding="utf-8")
assert sql.upper().count("ORDER BY") == 4
assert "PUBLISH_REASON_TO_RESEARCH" in sql
artifact_map = {item["path"]: item for item in manifest["artifacts"]}
for name in ("intelligence_overlay.json", "interface_guard.json"):
    path = BASE / "data" / name
    assert artifact_map[f"consumer_v1/data/{name}"]["sha256"] == sha(path)
assert manifest["checks"] == {
    "explicit_order_queries": 4,
    "publishable_reasons": 0,
    "data_centre_project_signal_links": 0,
    "newsv1_interface_changed": False,
}
print("PASS ConsumerV1 verifier: 133/45/19/4/9/6, Beacon Fen 13599, 11 columns, mobile scroll, zero domain leakage")
