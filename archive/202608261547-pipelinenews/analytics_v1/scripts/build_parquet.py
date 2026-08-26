#!/usr/bin/env python3
import hashlib, json, shutil
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[2]
ANALYTICS = ROOT / "analytics_v1"
BASE_PATH = ANALYTICS / "contracts/storage.v1.json"
SPEC_PATH = ANALYTICS / "contracts/parquet-build.v1.json"
PARQUET_DIR = ANALYTICS / "parquet"
SQL_PATH = ANALYTICS / "sql/views.sql"
AUDIT_PATH = ANALYTICS / "reports/parquet_audit.json"
MANIFEST_PATH = ANALYTICS / "data/parquet_manifest.json"

def raw(path): return path.read_bytes()
def load(path): return json.loads(raw(path))
def sha(value): return hashlib.sha256(value).hexdigest()
def stable_json(value): return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
def iso_time(value):
    if value is None: return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None: parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)

TYPE_MAP = {"VARCHAR": pa.string(), "BIGINT": pa.int64(), "DOUBLE": pa.float64(), "TIMESTAMP": pa.timestamp("us", tz="UTC")}
base, spec = load(BASE_PATH), load(SPEC_PATH)
if sha(raw(BASE_PATH)) != spec["base_contract"]["sha256"]: raise SystemExit("base contract hash mismatch")
if duckdb.__version__ != spec["runtime"]["duckdb"] or pa.__version__ != spec["runtime"]["pyarrow"]: raise SystemExit("runtime version mismatch")

products = {}
for item in base["inputs"]:
    path = ROOT / item["path"]
    if sha(raw(path)) != item["sha256"]: raise SystemExit(f"input hash mismatch: {item['path']}")
    products[item["release"]] = load(path)

staging = ANALYTICS / ".parquet-staging"
if staging.exists(): shutil.rmtree(staging)
staging.mkdir(parents=True)
table_audits, view_lines = [], []

for table in base["tables"]:
    source_rows = products[table["release"]][table["array_path"]]
    fields = [pa.field(name, TYPE_MAP[kind], nullable=nullable) for name, kind, nullable in table["columns"]]
    schema = pa.schema(fields, metadata={b"pipelinenews.table_id": table["table_id"].encode(), b"pipelinenews.grain": table["grain"].encode()})
    projected = []
    for source in source_rows:
        row = {}
        for name, kind, _nullable in table["columns"]:
            value = stable_json(source) if name == "payload_json" else source.get(name)
            row[name] = iso_time(value) if kind == "TIMESTAMP" else value
        projected.append(row)
    arrow = pa.Table.from_pylist(projected, schema=schema)
    path = staging / f"{table['table_id']}.parquet"
    pq.write_table(arrow, path, compression="zstd", use_dictionary=False, write_statistics=True, version="2.6", data_page_version="1.0", row_group_size=65536)
    readback = pq.read_table(path)
    if not readback.schema.equals(schema, check_metadata=True): raise SystemExit(f"schema mismatch: {table['table_id']}")
    rows = readback.to_pylist(); keys = ["\u001f".join(str(row[key]) for key in table["key"]) for row in rows]
    null_keys = sum(any(row[key] is None or row[key] == "" for key in table["key"]) for row in rows)
    duplicates = len(rows) - len(set(keys))
    if len(rows) != table["expected_rows"] or duplicates or null_keys: raise SystemExit(f"key law failed: {table['table_id']}")
    metadata = pq.ParquetFile(path).metadata
    codecs = sorted({metadata.row_group(r).column(c).compression for r in range(metadata.num_row_groups) for c in range(metadata.num_columns)})
    if codecs != ["ZSTD"]: raise SystemExit(f"compression mismatch: {table['table_id']}")
    table_audits.append({"table_id":table["table_id"],"source_rows":len(source_rows),"parquet_rows":len(rows),"distinct_declared_keys":len(set(keys)),"duplicate_key_groups":duplicates,"required_null_key_rows":null_keys,"schema":str(schema),"schema_match":True,"compression":codecs,"bytes":path.stat().st_size,"sha256":sha(raw(path))})
    order = " ORDER BY source_display_order, reason_decision_id" if table["table_id"] == "newsv5_reason_decisions" else ""
    view_lines.append(f"CREATE OR REPLACE VIEW v_{table['table_id']} AS SELECT * FROM read_parquet('{table['table_id']}.parquet'){order};")

sql = "-- Generated deterministic DuckDB views; execute with analytics_v1/parquet as working directory.\n" + "\n".join(view_lines) + "\n"
(ANALYTICS / "sql").mkdir(exist_ok=True)
SQL_PATH.write_text(sql, encoding="utf-8")
connection = duckdb.connect(":memory:")
for table in base["tables"]:
    path = (staging / f"{table['table_id']}.parquet").as_posix().replace("'", "''")
    connection.execute(f"CREATE VIEW v_{table['table_id']} AS SELECT * FROM read_parquet('{path}')")
    if connection.execute(f"SELECT count(*) FROM v_{table['table_id']}").fetchone()[0] != table["expected_rows"]: raise SystemExit(f"DuckDB view mismatch: {table['table_id']}")
connection.close()

if PARQUET_DIR.exists(): shutil.rmtree(PARQUET_DIR)
staging.rename(PARQUET_DIR)
audit = {"schema":"pipelinenews.parquet-audit.v1","status":"PASS","generated_at":base["generated_at"],"runtime":{"python":"3.11","duckdb":duckdb.__version__,"pyarrow":pa.__version__},"counts":{"tables":len(table_audits),"source_rows":sum(x["source_rows"] for x in table_audits),"parquet_rows":sum(x["parquet_rows"] for x in table_audits),"duplicate_key_groups":sum(x["duplicate_key_groups"] for x in table_audits),"required_null_key_rows":sum(x["required_null_key_rows"] for x in table_audits),"schema_mismatches":sum(not x["schema_match"] for x in table_audits),"duckdb_view_mismatches":0,"cross_domain_identity_links":0},"domain_boundary":{"renewable_namespace":"GG2050-REPD-*","data_centre_namespace":"PN-DC-*","identity_bridge_decision":"ABSTAIN_NO_AUTHORISED_BRIDGE"},"tables":table_audits}
AUDIT_PATH.write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
artifacts = [{"path":f"analytics_v1/parquet/{p.name}","sha256":sha(raw(p)),"bytes":p.stat().st_size} for p in sorted(PARQUET_DIR.glob("*.parquet"))]
artifacts += [{"path":"analytics_v1/sql/views.sql","sha256":sha(raw(SQL_PATH)),"bytes":SQL_PATH.stat().st_size},{"path":"analytics_v1/reports/parquet_audit.json","sha256":sha(raw(AUDIT_PATH)),"bytes":AUDIT_PATH.stat().st_size}]
manifest = {"schema":"pipelinenews.parquet-release-manifest.v1","status":"CANDIDATE","generated_at":base["generated_at"],"base_contract_sha256":sha(raw(BASE_PATH)),"build_spec_sha256":sha(raw(SPEC_PATH)),"inputs":base["inputs"],"artifacts":artifacts,"checks":audit["counts"],"database_artifact":None,"database_policy":"DuckDB views are recreated from immutable Parquet; no database file is committed."}
MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"PASS Parquet build: {audit['counts']['tables']} tables / {audit['counts']['parquet_rows']} rows / zstd / DuckDB readback")
