#!/usr/bin/env python3
import hashlib, json
from pathlib import Path
import duckdb, pyarrow.parquet as pq

ROOT=Path(__file__).resolve().parents[2]; A=ROOT/"analytics_v1"
load=lambda p: json.loads(p.read_bytes()); sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
contract=load(A/"contracts/storage.v1.json"); spec=load(A/"contracts/parquet-build.v1.json"); audit=load(A/"reports/parquet_audit.json"); manifest=load(A/"data/parquet_manifest.json")
assert audit["status"]=="PASS" and manifest["status"]=="CANDIDATE"
assert audit["counts"]=={"tables":9,"source_rows":208,"parquet_rows":208,"duplicate_key_groups":0,"required_null_key_rows":0,"schema_mismatches":0,"duckdb_view_mismatches":0,"cross_domain_identity_links":0}
assert manifest["base_contract_sha256"]==sha(A/"contracts/storage.v1.json") and manifest["build_spec_sha256"]==sha(A/"contracts/parquet-build.v1.json")
assert len(list((A/"parquet").glob("*.parquet")))==9 and manifest["database_artifact"] is None
artifact_map={x["path"]:x for x in manifest["artifacts"]}
con=duckdb.connect(":memory:")
for table in contract["tables"]:
    path=A/"parquet"/f"{table['table_id']}.parquet"; rel=f"analytics_v1/parquet/{path.name}"
    assert artifact_map[rel]["sha256"]==sha(path)
    arrow=pq.read_table(path); assert arrow.num_rows==table["expected_rows"]
    keys=["\u001f".join(str(row[key]) for key in table["key"]) for row in arrow.to_pylist()]
    assert len(keys)==len(set(keys)) and all("None" not in key for key in keys)
    assert con.execute(f"SELECT count(*) FROM read_parquet('{path.as_posix()}')").fetchone()[0]==table["expected_rows"]
assert contract["reconciliation_law"]["renewable_to_data_centre_identity_links_allowed"] is False
assert audit["domain_boundary"]["identity_bridge_decision"]=="ABSTAIN_NO_AUTHORISED_BRIDGE"
print("PASS independent Parquet verifier: 9 tables / 208 rows / schemas, keys, hashes and DuckDB reads")
