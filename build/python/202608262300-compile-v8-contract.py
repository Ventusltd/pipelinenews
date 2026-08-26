#!/usr/bin/env python3
"""Fail-closed compiler contract for a PipelineNews V8 candidate."""
import argparse, hashlib, json, re
from pathlib import Path
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    p=argparse.ArgumentParser();p.add_argument("--stamp",required=True);p.add_argument("--base",required=True);p.add_argument("--project-engine",required=True);p.add_argument("--foundation-proof",required=True);p.add_argument("--companies-manifest",required=True);p.add_argument("--output",required=True)
    a=p.parse_args();assert re.fullmatch(r"\d{12}",a.stamp)
    base=Path(a.base);engine=Path(a.project_engine);proof_path=Path(a.foundation_proof);companies=Path(a.companies_manifest);out=Path(a.output)
    if not base.exists() or not engine.exists() or not proof_path.exists() or not companies.exists():raise RuntimeError("Pinned compiler input missing")
    company=json.loads(companies.read_text())
    if company.get("schema")!="companies-house-manifest-v1":raise RuntimeError("Wrong company manifest schema")
    source=engine.read_text()
    if "body.innerHTML = filtered.map" in source:raise RuntimeError("Full-table renderer forbidden")
    if "filtered.slice(" not in source:raise RuntimeError("Bounded project window missing")
    proof=json.loads(proof_path.read_text())
    if proof.get("reachable")!=7680 or proof.get("max_dom_elements",999999)>=15000:raise RuntimeError("V8 foundation proof failed")
    manifest={"schema":"pipelinenews-v8-compile-manifest-v1","stamp":a.stamp,"base":{"path":str(base),"sha256":sha(base)},"project_engine":{"path":str(engine),"sha256":sha(engine)},"foundation_proof":{"path":str(proof_path),"sha256":sha(proof_path),**proof},"companies":{"path":str(companies),"sha256":sha(companies),"files":company["files"]},"deployment":"not-authorised","performance_gates":{"maximum_physical_project_rows":60,"maximum_mobile_dom_elements":15000,"all_records_reachable":True}}
    out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(manifest,indent=2)+"\n")
if __name__=="__main__":main()
