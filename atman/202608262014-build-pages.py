#!/usr/bin/env python3
"""Validate and stage the immutable modular PipelineNews Pages release.

This is the PipelineNews equivalent of GlobalGrid2050's trusted Pages build gate:
validate the exact committed release, reconstruct the already-public historical
closure, overlay the modular release and its shared data cartridges, then hand the
closed site tree to GitHub Pages.
"""

from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import posixpath
import re
import shutil
import subprocess
import sys
from urllib.parse import urljoin, urlsplit


ARCHIVE = Path("archive/202608261547-pipelinenews")
EXPECTED_SCHEMA = "pipelinenews.compiled-release.v1"
EXPECTED_PROJECTS = 7_680
EXPECTED_HEADLINES = 133
EXPECTED_UK_HEADLINES = 45
EXPECTED_OUTPUTS = 22
EXPECTED_INPUTS = 60
EXPECTED_GENERATED_FILES = 23
EXPECTED_IMPORTS = 18
EXPECTED_PROJECT_PARTITIONS = 16
EXPECTED_ATLAS_PARTITIONS = 18
GENERATION_RE = re.compile(r"^\d{12}$")
FAST_CANDIDATE_SCHEMA = "pipelinenews.v8.fast-site-candidate.v1"
FAST_CANDIDATE_MANIFEST_RE = re.compile(r"^(\d{12})-v8-fast-site-manifest\.json$")
FAST_AUTHORISATION_SCHEMA = "pipelinenews.v8.fast-pages-authorisation.v1"
FAST_AUTHORISATION_RE = re.compile(r"^(\d{12})-v8-fast-pages-authorisation\.json$")
SAFE_RELEASE_OUTPUT_RE = re.compile(r"^releases/[A-Za-z0-9._/-]+$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
ISO_8601_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$")
IMPORT_RE = re.compile(r"\bfrom\s+[\"']([^\"']+)[\"']|\bimport\s+[\"']([^\"']+)[\"']")
RUNTIME_JSON_RE = re.compile(
    r"[\"']((?:\.{1,2}/)*(?:data|manifests)/[^\"']+\.(?:json|geojson))[\"']"
)
TIMESTAMP_FOLDER_RE = re.compile(r"^(\d{12})-pipelinenews$")
TIMESTAMP_FOLDER_RELEASE_SCHEMA = "pipelinenews.timestamp-folder-successor.v1"
TIMESTAMP_FOLDER_BUILD_SCHEMA = "pipelinenews.timestamp-folder-build-manifest.v1"
TIMESTAMP_FOLDER_REGISTRY_SCHEMA = "pipelinenews.v9.timestamp-folder-registry.v1"
TIMESTAMP_FOLDER_FUNCTIONAL_FILES = 37
TIMESTAMP_FOLDER_TOTAL_FILES = 40
TIMESTAMP_FOLDER_INHERITED_FILES = 33
TIMESTAMP_FOLDER_SHARED_FILES = 29
TIMESTAMP_FOLDER_PARENT_FILES = 4
TIMESTAMP_FOLDER_PROVENANCE_FILES = 1
FORBIDDEN_ATLAS_V8_RECEIVER = "globalgrid2050.com/repd_grid_atlasv8"
ATLAS_V9_SOURCE_PARENT = "693ccda8e6288d449763ce2b3a4ba16ed7b93fee"


class RuntimeAssets(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.styles: list[str] = []
        self.scripts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "link" and "stylesheet" in (values.get("rel") or "").split():
            if values.get("href"):
                self.styles.append(values["href"])
        if tag == "script" and values.get("src"):
            self.scripts.append(values["src"])


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def repository_path(root: Path, relative: str) -> Path:
    require(not Path(relative).is_absolute(), f"absolute repository path: {relative}")
    resolved = (root / relative).resolve()
    require(resolved == root or root in resolved.parents, f"path escapes repository: {relative}")
    return resolved


def web_path(document: str, reference: str) -> str | None:
    """Resolve browser fetch/asset references against the Window document base."""
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc:
        return None
    if reference.startswith("#"):
        return None
    resolved = urlsplit(urljoin(f"/{document}", reference)).path
    normalised = posixpath.normpath(resolved).lstrip("/")
    require(not normalised.startswith("../"), f"web path escapes publication root: {reference}")
    return normalised


def verify_record(root: Path, record: dict, label: str) -> Path:
    relative = record.get("path")
    require(isinstance(relative, str) and relative, f"{label} has no path")
    target = repository_path(root, relative)
    require(target.is_file(), f"missing {label}: {relative}")
    require(target.stat().st_size == record.get("bytes"), f"byte mismatch for {relative}")
    require(sha256(target) == record.get("sha256"), f"SHA-256 mismatch for {relative}")
    return target


def select_release(root: Path, requested: str) -> tuple[str, Path, dict]:
    manifests = sorted((root / "releases/manifests").glob("*-release-manifest.json"))
    require(manifests, "no compiled release manifests")
    if requested == "latest":
        manifest_path = manifests[-1]
        generation = manifest_path.name.removesuffix("-release-manifest.json")
    else:
        require(bool(GENERATION_RE.fullmatch(requested)), "generation must be latest or YYYYMMDDHHMM")
        generation = requested
        manifest_path = root / f"releases/manifests/{generation}-release-manifest.json"
    require(manifest_path.is_file(), f"missing release manifest for {generation}")
    return generation, manifest_path, read_json(manifest_path)


def run_compiler(root: Path, manifest: dict, generation: str) -> dict:
    compiler = manifest.get("compiler", {})
    compiler_path = repository_path(root, compiler.get("path", ""))
    require(compiler_path.is_file(), f"missing compiler: {compiler_path}")
    require(sha256(compiler_path) == compiler.get("sha256"), "compiler SHA-256 mismatch")
    require(compiler_path.name == f"{generation}-compile-index.mjs", "compiler generation mismatch")
    completed = subprocess.run(
        ["node", str(compiler_path), "--check"],
        cwd=root,
        check=True,
        text=True,
        capture_output=True,
    )
    result = json.loads(completed.stdout)
    expected = {
        "generation": f"{generation}-index",
        "output_files": EXPECTED_GENERATED_FILES,
        "input_files": EXPECTED_INPUTS,
        "project_count": EXPECTED_PROJECTS,
        "status": "CHECKED",
    }
    for key, value in expected.items():
        require(result.get(key) == value, f"compiler {key}: expected {value!r}, got {result.get(key)!r}")
    return result


def validate_html_and_modules(root: Path, manifest: dict, generation: str) -> None:
    document = f"releases/{generation}-index.html"
    html_path = repository_path(root, document)
    parser = RuntimeAssets()
    parser.feed(html_path.read_text(encoding="utf-8"))
    require(len(parser.styles) == 6, f"expected 6 stylesheets, found {len(parser.styles)}")
    require(len(parser.scripts) == 3, f"expected 3 scripts, found {len(parser.scripts)}")
    for reference in parser.styles + parser.scripts:
        target = web_path(document, reference)
        require(target is not None, f"external runtime asset is forbidden: {reference}")
        require(repository_path(root, target).is_file(), f"missing HTML runtime asset: {reference} -> {target}")

    modules = sorted(
        record["path"] for record in manifest["outputs"]
        if record["path"].startswith("releases/javascript/") and record["path"].endswith(".js")
    )
    require(len(modules) == 13, f"expected 13 emitted modules, found {len(modules)}")
    import_count = 0
    runtime_references: set[str] = set()
    for relative in modules:
        module_path = repository_path(root, relative)
        subprocess.run(["node", "--check", str(module_path)], cwd=root, check=True, capture_output=True)
        source = module_path.read_text(encoding="utf-8")
        for match in IMPORT_RE.finditer(source):
            specifier = match.group(1) or match.group(2)
            require(specifier.startswith(("./", "../")), f"non-local module import in {relative}: {specifier}")
            resolved = posixpath.normpath(posixpath.join(posixpath.dirname(relative), specifier))
            require(repository_path(root, resolved).is_file(), f"missing module import: {relative} -> {specifier}")
            import_count += 1
        runtime_references.update(RUNTIME_JSON_RE.findall(source))
    require(import_count == EXPECTED_IMPORTS, f"expected {EXPECTED_IMPORTS} imports, found {import_count}")
    require(manifest["substitutions"]["javascript_imports"] == import_count, "import count disagrees with manifest")

    expected_runtime = {
        f"../data/contracts/{generation}-release-v9-1.json",
        "../data/contracts/202608261737-release-v9-5-1.json",
        f"../data/news/{generation}-major-project-news-v9-5-1.json",
        f"manifests/{generation}-build-manifest-v9-1.json",
    }
    require(runtime_references == expected_runtime, f"runtime data-reference set changed: {sorted(runtime_references)}")
    for reference in runtime_references:
        target = web_path(document, reference)
        require(target is not None and repository_path(root, target).is_file(), f"unreachable runtime data: {reference}")


def validate_data(root: Path, manifest: dict, generation: str) -> tuple[dict, dict]:
    build_path = root / f"releases/manifests/{generation}-build-manifest-v9-1.json"
    build = read_json(build_path)
    projects = build.get("project_partitions", [])
    atlas = build.get("atlas_partitions", [])
    require(len(projects) == EXPECTED_PROJECT_PARTITIONS, "project partition count changed")
    require(len(atlas) == EXPECTED_ATLAS_PARTITIONS, "atlas partition count changed")
    require(build.get("project_count") == EXPECTED_PROJECTS, "project total changed")
    require(build.get("capacity_mw") == 356474.09, "capacity total changed")
    require(build.get("largest_mw") == 4100, "largest project changed")
    require(build.get("solar_count") == 3563, "solar count changed")
    require(build.get("bess_count") == 1609, "BESS count changed")
    require(build.get("wind_onshore_count") == 2399, "onshore wind count changed")
    require(build.get("wind_offshore_count") == 109, "offshore wind count changed")

    document = f"releases/{generation}-index.html"
    counted_projects = 0
    for entry in projects:
        target = web_path(document, entry["path"])
        require(target is not None, f"invalid project path: {entry['path']}")
        path = repository_path(root, target)
        require(path.is_file(), f"missing project partition: {target}")
        require(sha256(path) == entry["sha256"], f"project partition hash mismatch: {target}")
        payload = read_json(path)
        require(payload["record_count"] == entry["record_count"], f"project record count mismatch: {target}")
        require(len(payload["projects"]) == entry["record_count"], f"project payload mismatch: {target}")
        counted_projects += len(payload["projects"])
    require(counted_projects == EXPECTED_PROJECTS, f"partition project total: {counted_projects}")

    counted_features = 0
    for entry in atlas:
        target = web_path(document, entry["path"])
        require(target is not None, f"invalid atlas path: {entry['path']}")
        path = repository_path(root, target)
        require(path.is_file(), f"missing atlas partition: {target}")
        require(sha256(path) == entry["sha256"], f"atlas partition hash mismatch: {target}")
        features = read_json(path)["features"]
        require(len(features) == entry["feature_count"], f"atlas feature count mismatch: {target}")
        counted_features += len(features)
    require(counted_features == build["geometry_count"], "atlas geometry total changed")

    news_path = root / f"data/news/{generation}-major-project-news-v9-5-1.json"
    news = read_json(news_path)
    require(len(news.get("all_items", [])) == EXPECTED_HEADLINES, "headline total changed")
    require(len(news.get("canonical_items", [])) == EXPECTED_UK_HEADLINES, "UK headline total changed")
    return build, news


def validate_release(root: Path, requested: str) -> dict:
    generation, manifest_path, manifest = select_release(root, requested)
    require(manifest.get("schema") == EXPECTED_SCHEMA, "release manifest schema changed")
    require(manifest.get("generation") == f"{generation}-index", "release generation mismatch")
    require(manifest.get("trusted_parent") == "GlobalGrid2050 V9.6.2", "trusted parent changed")
    require(manifest.get("status") == "COMPILED_AWAITING_BROWSER_ATTESTATION", "unexpected release state")
    require(
        manifest.get("public_url") == f"https://ventusltd.github.io/pipelinenews/releases/{generation}-index.html",
        "public release URL changed",
    )
    discipline = manifest.get("discipline", {})
    require(discipline.get("data_cartridges_copied") is False, "release must not duplicate data cartridges")
    require(discipline.get("release_references_immutable_data_cartridges") is True, "shared cartridge discipline changed")
    require(len(manifest.get("inputs", [])) == EXPECTED_INPUTS, "input record count changed")
    require(len(manifest.get("outputs", [])) == EXPECTED_OUTPUTS, "output record count changed")
    substitutions = manifest.get("substitutions", {})
    require(substitutions.get("html_asset_and_navigation_urls") == 25, "HTML substitution count changed")
    require(substitutions.get("project_manifest_paths") == EXPECTED_PROJECT_PARTITIONS, "project path rewrite count changed")
    require(substitutions.get("atlas_manifest_paths") == EXPECTED_ATLAS_PARTITIONS, "atlas path rewrite count changed")
    require(substitutions.get("chart_js_pinned_locally") == "4.5.1", "Chart.js pin changed")
    require(substitutions.get("mutable_news_sources_removed") is True, "mutable news source returned")

    seen: set[str] = set()
    for record in manifest["inputs"]:
        require(record["path"] not in seen, f"duplicate manifest path: {record['path']}")
        seen.add(record["path"])
        verify_record(root, record, "input")
    for record in manifest["outputs"]:
        require(record["path"] not in seen, f"duplicate manifest path: {record['path']}")
        seen.add(record["path"])
        verify_record(root, record, "output")
    require(manifest_path.is_file(), "release manifest disappeared")

    compiler_result = run_compiler(root, manifest, generation)
    validate_html_and_modules(root, manifest, generation)
    build, news = validate_data(root, manifest, generation)
    html_record = next(record for record in manifest["outputs"] if record["path"] == f"releases/{generation}-index.html")
    return {
        "generation": generation,
        "manifest": manifest,
        "compiler": compiler_result,
        "build": build,
        "news": news,
        "release_path": f"releases/{generation}-index.html",
        "release_sha256": html_record["sha256"],
        "public_url": manifest["public_url"],
    }


def validate_timestamp_folder_release(root: Path, release_id: str) -> dict:
    """Validate one immutable, folder-local successor without promoting a pointer."""
    match = TIMESTAMP_FOLDER_RE.fullmatch(release_id)
    require(match is not None, "timestamp folder release must be YYYYMMDDHHMM-pipelinenews")
    generation = match.group(1)
    folder_relative = f"releases/{release_id}"
    folder = repository_path(root, folder_relative)
    require(folder.is_dir() and not folder.is_symlink(), f"missing timestamp release folder: {folder_relative}")
    require_no_symlink_components(root, folder_relative, "timestamp release folder")

    release_manifest_relative = f"{folder_relative}/release-manifest.json"
    build_manifest_relative = f"{folder_relative}/build-manifest.json"
    release_manifest_path = repository_path(root, release_manifest_relative)
    build_manifest_path = repository_path(root, build_manifest_relative)
    require(release_manifest_path.is_file(), "timestamp release manifest is missing")
    require(build_manifest_path.is_file(), "timestamp build manifest is missing")
    release_manifest = read_json(release_manifest_path)
    build_manifest = read_json(build_manifest_path)

    require(release_manifest.get("schema") == TIMESTAMP_FOLDER_RELEASE_SCHEMA, "timestamp release schema changed")
    require(build_manifest.get("schema") == TIMESTAMP_FOLDER_BUILD_SCHEMA, "timestamp build schema changed")
    for manifest in (release_manifest, build_manifest):
        require(manifest.get("generation") == generation, "timestamp manifest generation mismatch")
        require(manifest.get("release_id") == release_id, "timestamp manifest release ID mismatch")
    require(release_manifest.get("immutable") is True, "timestamp release is not immutable")
    require(
        release_manifest.get("classification") == "IMMUTABLE_TIMESTAMPED_RELEASE",
        "timestamp release classification changed",
    )
    require(
        release_manifest.get("entrypoint") == f"{folder_relative}/index.html",
        "timestamp entrypoint is not folder-local index.html",
    )
    require(
        release_manifest.get("public_url")
        == f"https://ventusltd.github.io/pipelinenews/{folder_relative}/",
        "timestamp public URL changed",
    )
    require(
        release_manifest.get("publication_control", {}).get("pointer_and_attestation_live_outside_release_folder") is True,
        "pointer state entered immutable release bytes",
    )
    require(
        release_manifest.get("folder_contract", {}).get("pointer_state_encoded_in_release") is False,
        "immutable release encodes transient pointer state",
    )

    functional = build_manifest.get("functional_files")
    outputs = release_manifest.get("outputs")
    require(isinstance(functional, list), "timestamp functional output list missing")
    require(isinstance(outputs, list), "timestamp release output list missing")
    require(len(functional) == TIMESTAMP_FOLDER_FUNCTIONAL_FILES, "timestamp functional file count changed")
    require(len(outputs) == TIMESTAMP_FOLDER_TOTAL_FILES - 1, "timestamp declared output count changed")
    require(
        build_manifest.get("functional_file_count") == TIMESTAMP_FOLDER_FUNCTIONAL_FILES,
        "timestamp functional count field changed",
    )
    require(
        build_manifest.get("inherited_functional_files") == TIMESTAMP_FOLDER_INHERITED_FILES,
        "timestamp inherited functional count changed",
    )
    require(
        build_manifest.get("shared_dependency_files") == TIMESTAMP_FOLDER_SHARED_FILES,
        "timestamp shared dependency count changed",
    )
    require(
        build_manifest.get("inherited_parent_output_files") == TIMESTAMP_FOLDER_PARENT_FILES,
        "timestamp inherited parent output count changed",
    )
    require(
        build_manifest.get("parent_evidence", {}).get("exact_manifest", {}).get("sha256")
        == "025daf70f1c4b9c9a7c84a70d41ceb50e96232771f736faa309ca92c2c9c134d",
        "permanent parent evidence changed",
    )
    require(
        build_manifest.get("parent_evidence", {}).get("exact_manifest", {}).get("bytes") == 25073,
        "permanent parent evidence byte count changed",
    )
    require(
        build_manifest.get("provenance_files") == TIMESTAMP_FOLDER_PROVENANCE_FILES,
        "timestamp provenance file count changed",
    )

    declared: set[str] = set()
    for label, records in (("timestamp functional file", functional), ("timestamp output", outputs)):
        local_seen: set[str] = set()
        for index, record in enumerate(records):
            require(isinstance(record, dict), f"{label} {index} is not an object")
            require(set(record) == {"path", "bytes", "sha256"}, f"unexpected fields in {label} {index}")
            relative = normalise_candidate_output_path(record.get("path"), f"{label} {index}")
            require(relative.startswith(f"{folder_relative}/"), f"{label} escapes timestamp folder: {relative}")
            require(relative not in local_seen, f"duplicate {label}: {relative}")
            local_seen.add(relative)
            verify_record(root, record, label)
        if label == "timestamp output":
            declared = local_seen
    require(
        {record["path"] for record in functional}.issubset(declared),
        "functional closure is not contained in timestamp outputs",
    )
    require(build_manifest_relative in declared, "build manifest is not a declared output")
    require(release_manifest_relative not in declared, "release manifest must not self-hash")
    require(
        release_manifest.get("build_manifest")
        == next(record for record in outputs if record["path"] == build_manifest_relative),
        "release/build manifest binding changed",
    )

    actual = {
        path.relative_to(root).as_posix()
        for path in folder.rglob("*")
        if path.is_file()
    }
    require(not any(path.is_symlink() for path in folder.rglob("*")), "symlink in timestamp release")
    require(actual == declared | {release_manifest_relative}, "timestamp folder closure differs from manifest")
    require(len(actual) == TIMESTAMP_FOLDER_TOTAL_FILES, "timestamp total file count changed")

    source_commit = require_git_commit(root, release_manifest.get("source_commit"), "timestamp source commit")
    release_commit = git_text(root, "log", "-1", "--format=%H", "--", release_manifest_relative)
    require(bool(COMMIT_RE.fullmatch(release_commit)), "timestamp release manifest is not committed")
    release_parents = git_text(root, "show", "-s", "--format=%P", release_commit).split()
    require(release_parents == [source_commit], "timestamp release commit is not a one-parent child of source commit")
    release_changes = {
        line for line in git_text(
            root, "diff-tree", "--no-commit-id", "--name-only", "-r", release_commit
        ).splitlines() if line
    }
    require(release_changes == actual, "timestamp release commit differs from exact 40-file folder closure")
    for record in outputs:
        require_commit_file(root, release_commit, record["path"], record["sha256"], "timestamp committed output")
    require_commit_file(
        root,
        release_commit,
        release_manifest_relative,
        sha256(release_manifest_path),
        "timestamp committed release manifest",
    )
    pointers_present = any((root / relative).is_file() for relative in ("releases/current-v3.json", "state/live-set.json"))
    if not pointers_present:
        require(git_text(root, "rev-parse", "HEAD") == release_commit, "unpromoted timestamp release is not deployment HEAD")

    registry_path = folder / f"data/{generation}-registry.json"
    registry = read_json(registry_path)
    require(registry.get("schema") == TIMESTAMP_FOLDER_REGISTRY_SCHEMA, "timestamp registry schema changed")
    require(registry.get("generation") == generation, "timestamp registry generation changed")
    require(registry.get("classification") == "IMMUTABLE_TIMESTAMPED_RELEASE", "registry classification changed")
    require("deployment" not in registry, "transient deployment state entered registry")

    # Provenance is an exact historical manifest and therefore records the old
    # receiver. Leakage policy applies to executable/functional release bytes.
    functional_paths = [repository_path(root, record["path"]) for record in functional]
    text = "\n".join(
        path.read_text(encoding="utf-8")
        for path in functional_paths
        if path.suffix in {".html", ".mjs", ".js", ".json", ".css"}
    )
    require(FORBIDDEN_ATLAS_V8_RECEIVER not in text, "old Atlas V8 receiver leaked into timestamp release")
    require("NOT DEPLOYED" not in text and "NOT CURRENT" not in text, "transient release wording leaked")
    require("DEEP-LINK CANDIDATE" not in text and "fast candidate" not in text, "candidate product-state wording leaked")

    index_record = next(record for record in outputs if record["path"] == f"{folder_relative}/index.html")
    return {
        "release_id": release_id,
        "generation": generation,
        "folder_path": f"{folder_relative}/",
        "index_path": index_record["path"],
        "index_sha256": index_record["sha256"],
        "manifest_path": release_manifest_relative,
        "manifest_sha256": sha256(release_manifest_path),
        "manifest": release_manifest,
    }


def validate_live_pointer(root: Path, timestamp_folder: dict | None) -> dict | None:
    pointer_paths = [Path("releases/current-v3.json"), Path("state/live-set.json")]
    existing = [(root / relative).is_file() for relative in pointer_paths]
    require(existing in ([False, False], [True, True]), "live pointer copies must be absent or both present")
    if not all(existing):
        return None
    require(timestamp_folder is not None, "live pointer exists without validated timestamp release")
    for relative in pointer_paths:
        require_no_symlink_components(root, relative.as_posix(), "live pointer")
    first = (root / pointer_paths[0]).read_bytes()
    second = (root / pointer_paths[1]).read_bytes()
    require(first == second, "current-v3 and live-set pointer bytes differ")
    pointer = json.loads(first)
    release_id = timestamp_folder["release_id"]
    expected = {
        "schema": "pipelinenews.live-pointer.v3",
        "generation": timestamp_folder["generation"],
        "release_id": release_id,
        "classification": "VERIFIED_LIVE_TIMESTAMPED_RELEASE",
        "route": f"/pipelinenews/releases/{release_id}/",
        "entrypoint": f"releases/{release_id}/index.html",
    }
    for key, value in expected.items():
        require(pointer.get(key) == value, f"live pointer {key} changed")
    require(bool(COMMIT_RE.fullmatch(pointer.get("release_source_commit", ""))), "invalid live pointer release source")
    require(bool(COMMIT_RE.fullmatch(pointer.get("deployed_commit", ""))), "invalid live pointer deployed commit")
    require(
        isinstance(pointer.get("verified_at_utc"), str) and bool(ISO_8601_RE.fullmatch(pointer["verified_at_utc"])),
        "invalid live pointer verification timestamp",
    )
    proof = pointer.get("public_proof", {})
    require(str(proof.get("pages_run_id", "")).isdigit(), "live pointer has no Pages run")
    require(bool(SHA256_RE.fullmatch(proof.get("browser_proof_sha256", ""))), "live pointer browser proof hash changed")
    require(bool(SHA256_RE.fullmatch(proof.get("comparator_report_sha256", ""))), "live pointer comparator hash changed")
    require(bool(SHA256_RE.fullmatch(proof.get("equivalence_report_sha256", ""))), "live pointer equivalence hash changed")
    require(proof.get("synthetic_receiver") is False, "live pointer permits synthetic receiver")
    require(proof.get("route_interceptions") == 0, "live pointer proof was intercepted")
    receiver_contract = timestamp_folder["manifest"].get("atlas_v9_deep_link", {})
    receiver_base = receiver_contract.get("base_url", "")
    contractual_golden = str(receiver_contract.get("golden_repd_ref", ""))
    require(bool(re.fullmatch(r"https://ventusltd\.github\.io/gridatlas/\d{12}-atlas-v9/", receiver_base)), "timestamp receiver URL changed")
    require(bool(re.fullmatch(r"\d+", contractual_golden)), "timestamp contractual golden changed")
    require(
        pointer.get("atlas_v9_receiver", {}).get("pointer") == receiver_contract.get("pointer")
        and pointer.get("atlas_v9_receiver", {}).get("pointer_commit") == receiver_contract.get("pointer_commit")
        and pointer.get("atlas_v9_receiver", {}).get("golden_repd_ref") == contractual_golden,
        "live pointer GridAtlas binding changed",
    )
    require(proof.get("receiver_url") == f"{receiver_base}?repd_ref={contractual_golden}", "live pointer receiver URL changed")
    receiver_cards = proof.get("receiver_evidence", {}).get("cards", [])
    require(
        isinstance(receiver_cards, list)
        and any(f"REPD {contractual_golden}" in str(card) for card in receiver_cards),
        "live pointer has no durable contractual-golden receiver card",
    )
    release_binding = pointer.get("release_manifest", {})
    build_binding = pointer.get("build_manifest", {})
    require(release_binding.get("path") == timestamp_folder["manifest_path"], "live pointer release binding path changed")
    require(release_binding.get("sha256") == timestamp_folder["manifest_sha256"], "live pointer release binding hash changed")
    verify_record(root, release_binding, "live pointer release manifest")
    verify_record(root, build_binding, "live pointer build manifest")
    release_commit = git_text(root, "log", "-1", "--format=%H", "--", timestamp_folder["manifest_path"])
    require(release_commit == pointer["deployed_commit"], "live pointer deployed commit does not own immutable release")
    pointer_commits = {
        git_text(root, "log", "-1", "--format=%H", "--", relative.as_posix())
        for relative in pointer_paths
    }
    require(len(pointer_commits) == 1, "live pointer copies were not committed together")
    pointer_commit = next(iter(pointer_commits))
    require(pointer_commit == git_text(root, "rev-parse", "HEAD"), "live pointer commit is not deployment HEAD")
    parents = git_text(root, "show", "-s", "--format=%P", pointer_commit).split()
    require(parents == [release_commit], "live pointer commit is not a one-parent child of deployed release")
    pointer_changes = {
        line for line in git_text(
            root, "diff-tree", "--no-commit-id", "--name-only", "-r", pointer_commit
        ).splitlines() if line
    }
    require(pointer_changes == {path.as_posix() for path in pointer_paths}, "live pointer commit changed paths outside two pointers")
    return {
        "paths": [relative.as_posix() for relative in pointer_paths],
        "bytes": len(first),
        "sha256": hashlib.sha256(first).hexdigest(),
        "pointer": pointer,
    }


def copy_file(source_root: Path, site_root: Path, relative: str) -> None:
    source = source_root / relative
    require(source.is_file(), f"historical publication input missing: {source}")
    target = site_root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def copy_tree(source: Path, target: Path) -> None:
    require(source.is_dir(), f"historical publication tree missing: {source}")
    shutil.copytree(source, target, dirs_exist_ok=True)


def require_no_symlink_components(root: Path, relative: str, label: str) -> None:
    current = root
    for component in relative.split("/"):
        current = current / component
        require(not current.is_symlink(), f"symlink in {label}: {relative}")


def normalise_candidate_output_path(value: object, label: str) -> str:
    require(isinstance(value, str) and value, f"{label} has no path")
    require("\\" not in value and "\x00" not in value, f"invalid path in {label}: {value!r}")
    require(bool(SAFE_RELEASE_OUTPUT_RE.fullmatch(value)), f"unsafe release path in {label}: {value}")
    normalised = posixpath.normpath(value)
    require(normalised == value, f"non-normalised path in {label}: {value}")
    components = value.split("/")
    require(all(component not in ("", ".", "..") for component in components), f"unsafe path in {label}: {value}")
    require(components[0] == "releases" and len(components) > 1, f"candidate output is outside releases/: {value}")
    return value


def compact_json_sha256(value: object) -> str:
    encoded = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def iso8601_instant(value: str) -> datetime:
    require(bool(ISO_8601_RE.fullmatch(value)), f"invalid ISO-8601 timestamp: {value!r}")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def git_text(root: Path, *arguments: str) -> str:
    completed = subprocess.run(
        ["git", *arguments],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    return completed.stdout.strip()


def require_git_commit(root: Path, commit: object, label: str) -> str:
    require(isinstance(commit, str) and bool(COMMIT_RE.fullmatch(commit)), f"invalid {label}: {commit!r}")
    subprocess.run(
        ["git", "cat-file", "-e", f"{commit}^{{commit}}"],
        cwd=root,
        check=True,
        capture_output=True,
    )
    return commit


def require_commit_file(root: Path, commit: str, relative: str, expected_sha256: str, label: str) -> None:
    completed = subprocess.run(
        ["git", "show", f"{commit}:{relative}"],
        cwd=root,
        check=True,
        capture_output=True,
    )
    actual = hashlib.sha256(completed.stdout).hexdigest()
    require(actual == expected_sha256, f"{label} changed at {commit}: {relative}")


def candidate_publication_boundary(root: Path, release: dict) -> tuple[set[str], set[str]]:
    """Return excluded and owner-authorised immutable fast-candidate outputs."""
    build = root / "build"
    if not build.exists():
        return set(), set()
    require(build.is_dir() and not build.is_symlink(), f"invalid candidate build directory: {build}")

    manifests = sorted(build.glob("*-v8-fast-site-manifest.json"))
    candidates: dict[str, dict] = {}
    owners: dict[str, str] = {}
    protected = {"releases/current.json", "releases/candidate.json", release["release_path"]}
    protected.update(record["path"] for record in release["manifest"]["outputs"])
    protected.update(
        record["path"] for record in release["manifest"]["inputs"]
        if record["path"].startswith("releases/")
    )

    for manifest_path in manifests:
        match = FAST_CANDIDATE_MANIFEST_RE.fullmatch(manifest_path.name)
        require(match is not None, f"invalid fast candidate manifest name: {manifest_path.name}")
        generation = match.group(1)
        relative_manifest = f"build/{generation}-v8-fast-site-manifest.json"
        require(manifest_path.relative_to(root).as_posix() == relative_manifest, f"misplaced fast candidate manifest: {manifest_path}")
        require_no_symlink_components(root, relative_manifest, "fast candidate manifest path")
        require(manifest_path.is_file(), f"fast candidate manifest is not a file: {relative_manifest}")
        manifest = read_json(manifest_path)
        require(isinstance(manifest, dict), f"fast candidate manifest is not an object: {relative_manifest}")
        require(manifest.get("schema") == FAST_CANDIDATE_SCHEMA, f"fast candidate schema changed: {relative_manifest}")
        require(manifest.get("generation") == generation, f"fast candidate generation mismatch: {relative_manifest}")
        require(
            manifest.get("deployment") == "not-authorised",
            f"immutable fast candidate deployment state changed: {relative_manifest}",
        )
        source_commit = manifest.get("source_commit")
        require(isinstance(source_commit, str) and bool(COMMIT_RE.fullmatch(source_commit)), f"invalid candidate source commit: {relative_manifest}")
        build_run = manifest.get("github_run_id")
        require(isinstance(build_run, str) and build_run.isdigit(), f"invalid candidate build run: {relative_manifest}")
        cache_identity = manifest.get("cache_identity")
        require(isinstance(cache_identity, str) and bool(SHA256_RE.fullmatch(cache_identity)), f"invalid candidate cache identity: {relative_manifest}")

        outputs = manifest.get("outputs")
        require(isinstance(outputs, list) and outputs, f"fast candidate has no outputs: {relative_manifest}")
        manifest_paths: set[str] = set()
        output_records: dict[str, dict] = {}
        for index, record in enumerate(outputs):
            label = f"fast candidate output {index} in {relative_manifest}"
            require(isinstance(record, dict), f"{label} is not an object")
            require(set(record) == {"path", "bytes", "sha256"}, f"unexpected fields in {label}")
            relative = normalise_candidate_output_path(record.get("path"), label)
            require(relative not in manifest_paths, f"duplicate path in {relative_manifest}: {relative}")
            manifest_paths.add(relative)
            output_records[relative] = record
            require(relative not in protected, f"candidate overlaps the governed release: {relative}")
            require(Path(relative).name.startswith(generation), f"candidate output generation mismatch: {relative}")
            require(isinstance(record.get("bytes"), int) and record["bytes"] >= 0, f"invalid byte count for {relative}")
            require(isinstance(record.get("sha256"), str) and bool(SHA256_RE.fullmatch(record["sha256"])), f"invalid SHA-256 for {relative}")
            require_no_symlink_components(root, relative, "fast candidate output path")
            verify_record(root, record, "fast candidate output")
            previous = owners.get(relative)
            require(previous is None, f"candidate output declared by both {previous} and {relative_manifest}: {relative}")
            owners[relative] = relative_manifest
            archived = root / ARCHIVE / relative
            require(not archived.exists() and not archived.is_symlink(), f"candidate overlaps historical public path: {relative}")

        candidate_path = f"releases/{generation}-v8-fast-candidate.html"
        require(candidate_path in output_records, f"candidate HTML is missing: {candidate_path}")
        require(generation not in candidates, f"duplicate fast candidate generation: {generation}")
        candidates[generation] = {
            "manifest": manifest,
            "manifest_path": relative_manifest,
            "manifest_sha256": sha256(manifest_path),
            "outputs": outputs,
            "output_records": output_records,
            "output_paths": manifest_paths,
            "candidate_path": candidate_path,
        }

    owned_paths = sorted(owners)
    for index, relative in enumerate(owned_paths):
        require(
            not any(other.startswith(f"{relative}/") for other in owned_paths[index + 1:]),
            f"candidate path collision: {relative}",
        )

    authorisations_dir = build / "authorisations"
    authorisations: dict[str, tuple[Path, dict]] = {}
    if authorisations_dir.exists():
        require(authorisations_dir.is_dir() and not authorisations_dir.is_symlink(), "invalid fast authorisations directory")
        for authorisation_path in sorted(authorisations_dir.iterdir()):
            relative_authorisation = authorisation_path.relative_to(root).as_posix()
            require_no_symlink_components(root, relative_authorisation, "fast authorisation path")
            require(authorisation_path.is_file(), f"fast authorisation is not a file: {relative_authorisation}")
            match = FAST_AUTHORISATION_RE.fullmatch(authorisation_path.name)
            require(match is not None, f"invalid fast authorisation filename: {relative_authorisation}")
            generation = match.group(1)
            expected_relative = f"build/authorisations/{generation}-v8-fast-pages-authorisation.json"
            require(relative_authorisation == expected_relative, f"misplaced fast authorisation: {relative_authorisation}")
            require(generation not in authorisations, f"duplicate fast authorisation: {generation}")
            authorisation = read_json(authorisation_path)
            require(isinstance(authorisation, dict), f"fast authorisation is not an object: {relative_authorisation}")
            authorisations[generation] = (authorisation_path, authorisation)

    require(set(authorisations).issubset(candidates), "fast authorisation has no matching immutable candidate")
    require(len(authorisations) <= 1, "at most one fast candidate may be authorised")

    # A newer immutable candidate may deliberately reuse outputs from older
    # candidates. Authorising the newest timestamp must therefore carry the
    # complete, hash-bound predecessor chain into Pages; otherwise the newest
    # route would be published with its inherited runtime files quarantined.
    progressive_generations: set[str] = set(authorisations)
    progressive_dependencies: dict[str, set[str]] = {}
    pending_generations = list(progressive_generations)
    while pending_generations:
        generation = pending_generations.pop()
        candidate = candidates[generation]
        inputs = candidate["manifest"].get("inputs")
        require(isinstance(inputs, list), f"fast candidate inputs changed: {candidate['manifest_path']}")
        dependencies: set[str] = set()
        for index, record in enumerate(inputs):
            require(isinstance(record, dict), f"fast candidate input {index} is not an object: {candidate['manifest_path']}")
            relative = record.get("path")
            owner_manifest = owners.get(relative) if isinstance(relative, str) else None
            if owner_manifest is None:
                continue
            owner_match = FAST_CANDIDATE_MANIFEST_RE.fullmatch(Path(owner_manifest).name)
            require(owner_match is not None, f"candidate dependency owner is invalid: {owner_manifest}")
            dependency_generation = owner_match.group(1)
            require(
                dependency_generation < generation,
                f"candidate dependency is not an older timestamp: {generation} -> {dependency_generation}",
            )
            dependency_record = candidates[dependency_generation]["output_records"][relative]
            require(
                record == dependency_record,
                f"candidate dependency binding differs from its immutable output: {relative}",
            )
            dependencies.add(dependency_generation)
            if dependency_generation not in progressive_generations:
                progressive_generations.add(dependency_generation)
                pending_generations.append(dependency_generation)
        progressive_dependencies[generation] = dependencies

    excluded: set[str] = set()
    authorised: set[str] = set()

    for generation, candidate in candidates.items():
        if generation not in progressive_generations:
            excluded.update(candidate["output_paths"])
            continue

        authorised.update(candidate["output_paths"])
        if generation not in authorisations:
            continue

        authorisation_path, authorisation = authorisations[generation]
        relative_authorisation = authorisation_path.relative_to(root).as_posix()
        expected_fields = {
            "schema", "generation", "scope", "deployment", "candidate_manifest", "candidate",
            "outputs", "outputs_sha256", "output_closure_sha256", "candidate_output_commit",
            "authorisation_source_commit", "github_run_id", "authorised_by",
            "authorised_at_source_commit", "evidence", "stable_route_promoted",
            "globalgrid_catalogue_changed",
        }
        require(set(authorisation) == expected_fields, f"fast authorisation fields changed: {relative_authorisation}")
        require(authorisation.get("schema") == FAST_AUTHORISATION_SCHEMA, f"fast authorisation schema changed: {relative_authorisation}")
        require(authorisation.get("generation") == generation, f"fast authorisation generation mismatch: {relative_authorisation}")
        require(authorisation.get("scope") == "github-pages-immutable-candidate", f"fast authorisation scope changed: {relative_authorisation}")
        require(authorisation.get("deployment") == "authorised", f"fast authorisation deployment state changed: {relative_authorisation}")
        require(authorisation.get("stable_route_promoted") is False, "fast authorisation may not promote the stable route")
        require(authorisation.get("globalgrid_catalogue_changed") is False, "fast authorisation may not change GlobalGrid")

        candidate_manifest = authorisation.get("candidate_manifest")
        require(isinstance(candidate_manifest, dict) and set(candidate_manifest) == {"path", "sha256"}, "invalid candidate manifest binding")
        require(candidate_manifest.get("path") == candidate["manifest_path"], "authorisation names the wrong candidate manifest")
        require(candidate_manifest.get("sha256") == candidate["manifest_sha256"], "candidate manifest SHA-256 changed")

        candidate_binding = authorisation.get("candidate")
        require(isinstance(candidate_binding, dict) and set(candidate_binding) == {"source_commit", "build_run", "cache_identity"}, "invalid candidate identity binding")
        manifest = candidate["manifest"]
        require(candidate_binding.get("source_commit") == manifest.get("source_commit"), "candidate source commit binding changed")
        require(candidate_binding.get("build_run") == manifest.get("github_run_id"), "candidate build run binding changed")
        require(candidate_binding.get("cache_identity") == manifest.get("cache_identity"), "candidate cache identity binding changed")
        require(authorisation.get("outputs") == candidate["outputs"], "authorised output closure differs from candidate manifest")
        closure_sha256 = compact_json_sha256(candidate["outputs"])
        require(authorisation.get("outputs_sha256") == closure_sha256, "authorised output closure SHA-256 changed")
        require(authorisation.get("output_closure_sha256") == closure_sha256, "authorised output closure alias changed")

        candidate_output_commit = require_git_commit(root, authorisation.get("candidate_output_commit"), "candidate output commit")
        authorisation_source_commit = require_git_commit(root, authorisation.get("authorisation_source_commit"), "authorisation source commit")
        authorisation_commit = git_text(root, "log", "-1", "--format=%H", "--", relative_authorisation)
        require(bool(COMMIT_RE.fullmatch(authorisation_commit)), "authorisation record is not committed")
        authorisation_parents = git_text(root, "show", "-s", "--format=%P", authorisation_commit).split()
        require(len(authorisation_parents) == 1, "authorisation commit must have exactly one parent")
        require(authorisation_parents[0] == authorisation_source_commit, "authorisation commit parent differs from authorised source")
        changed_paths = {
            line for line in git_text(
                root,
                "diff-tree",
                "--no-commit-id",
                "--name-only",
                "-r",
                authorisation_commit,
            ).splitlines() if line
        }
        require(changed_paths == {relative_authorisation}, "authorisation commit changes paths outside its immutable record")
        require_commit_file(
            root,
            authorisation_commit,
            relative_authorisation,
            sha256(authorisation_path),
            "authorisation record",
        )
        require(
            git_text(root, "log", "-1", "--format=%H", "--", candidate["manifest_path"]) == candidate_output_commit,
            "candidate output commit does not own the immutable manifest",
        )
        require_commit_file(root, candidate_output_commit, candidate["manifest_path"], candidate["manifest_sha256"], "candidate manifest")
        for record in candidate["outputs"]:
            require_commit_file(root, candidate_output_commit, record["path"], record["sha256"], "candidate output")
        changed_public_paths = {
            line for line in git_text(
                root,
                "diff",
                "--name-only",
                ATLAS_V9_SOURCE_PARENT,
                "HEAD",
                "--",
                "releases",
                "data",
                "archive",
                "state",
            ).splitlines() if line
        }
        allowed_public_changes: set[str] = set()
        timestamp_folder = release.get("timestamp_folder")
        if timestamp_folder is not None:
            allowed_public_changes.update(record["path"] for record in timestamp_folder["manifest"]["outputs"])
            allowed_public_changes.add(timestamp_folder["manifest_path"])
        live_pointer = release.get("live_pointer")
        if live_pointer is not None:
            allowed_public_changes.update(live_pointer["paths"])
        require(
            changed_public_paths.issubset(allowed_public_changes),
            f"legacy public tree changed outside exact Atlas V9 release/pointers: {sorted(changed_public_paths - allowed_public_changes)}",
        )
        subprocess.run(
            ["git", "merge-base", "--is-ancestor", ATLAS_V9_SOURCE_PARENT, "HEAD"],
            cwd=root,
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["git", "merge-base", "--is-ancestor", manifest["source_commit"], candidate_output_commit],
            cwd=root,
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["git", "merge-base", "--is-ancestor", authorisation_source_commit, "HEAD"],
            cwd=root,
            check=True,
            capture_output=True,
        )
        expected_timestamp = git_text(root, "show", "-s", "--format=%cI", authorisation_source_commit)
        timestamp = authorisation.get("authorised_at_source_commit")
        require(isinstance(timestamp, str), "invalid authorisation source timestamp")
        require(iso8601_instant(timestamp) == iso8601_instant(expected_timestamp), "authorisation timestamp differs from source commit")
        require(isinstance(authorisation.get("github_run_id"), str) and authorisation["github_run_id"].isdigit(), "invalid authorisation run ID")
        require(isinstance(authorisation.get("authorised_by"), str) and authorisation["authorised_by"].strip(), "missing authorising actor")
        evidence = authorisation.get("evidence")
        expected_evidence = {
            "actor": authorisation["authorised_by"],
            "run_id": authorisation["github_run_id"],
            "source": authorisation_source_commit,
            "authorised_at_utc": timestamp,
        }
        require(evidence == expected_evidence, "authorisation workflow evidence changed")

        candidate_verifier = f"build/javascript/{generation}-verify-v8-fast-browser.mjs"
        require_no_symlink_components(root, candidate_verifier, "fast candidate browser verifier")
        verifier_path = repository_path(root, candidate_verifier)
        require(verifier_path.is_file(), f"missing fast candidate browser verifier: {candidate_verifier}")
        subprocess.run(
            ["node", "--check", str(verifier_path)],
            cwd=root,
            check=True,
            capture_output=True,
        )

        release["candidate_generation"] = generation
        release["candidate_path"] = candidate["candidate_path"]
        release["candidate_sha256"] = candidate["output_records"][candidate["candidate_path"]]["sha256"]
        release["candidate_verifier"] = candidate_verifier
        release["candidate_authorisation"] = relative_authorisation

    if authorisations:
        release["candidate_chain"] = sorted(progressive_generations)
        release["candidate_dependencies"] = {
            generation: sorted(progressive_dependencies.get(generation, set()))
            for generation in sorted(progressive_generations)
        }
        release["candidate_outputs"] = [
            record
            for generation in sorted(progressive_generations)
            for record in candidates[generation]["outputs"]
        ]

    require(excluded.isdisjoint(authorised), "candidate output is both excluded and authorised")
    return excluded, authorised


def copy_release_tree(source: Path, target: Path, excluded: set[str]) -> None:
    """Overlay committed releases without copying non-deploying candidates."""
    require(source.is_dir(), f"release publication tree missing: {source}")
    target.mkdir(parents=True, exist_ok=True)
    for candidate in sorted(source.rglob("*")):
        relative = candidate.relative_to(source).as_posix()
        public_relative = f"releases/{relative}"
        require(not candidate.is_symlink(), f"symlink in release publication tree: {public_relative}")
        if public_relative in excluded:
            require(candidate.is_file(), f"excluded candidate output is not a file: {public_relative}")
            continue
        destination = target / relative
        if candidate.is_dir():
            destination.mkdir(parents=True, exist_ok=True)
        elif candidate.is_file():
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(candidate, destination)
        else:
            raise AssertionError(f"unsupported release publication entry: {public_relative}")


def stage_legacy_apps(archive: Path, site: Path) -> None:
    v1_files = [
        "newsv1/index.html", "newsv1/MIGRATION_MANIFEST.json",
        "newsv1/scripts/app-newsv1.js", "newsv1/scripts/core/plugin-host.js",
        "newsv1/scripts/core/project-filter-v9-2.js", "newsv1/scripts/core/state.js",
        "newsv1/scripts/core/utils.js", "newsv1/scripts/data/canonical-projects-newsv1-release.js",
        "newsv1/scripts/data/canonical-projects-newsv1.js",
        "newsv1/scripts/plugins/capacity-presentation-v9-3.js", "newsv1/scripts/plugins/gauges-v9-2.js",
        "newsv1/scripts/plugins/newspaper-newsv1-base.js", "newsv1/scripts/plugins/newspaper-newsv1.js",
        "newsv1/scripts/plugins/projects-newsv1.js", "newsv1/styles/v7.css",
        "newsv1/styles/mobile.css", "newsv1/styles/v9-3.css", "newsv1/styles/v9-4.css",
        "newsv1/styles/v9-5-1.css", "newsv1/styles/v9-6-1.css",
        "newsv1/styles/performance-newsv1.css", "newsv1/contracts/release.newsv1.json",
        "newsv1/contracts/release.v9.1.json", "newsv1/data/v9.1/build_manifest.json",
        "newsv1/data/v9.7/regional_manifest.json", "newsv1/data/v9.7/regional_news.json",
        "newsv1/dist/major_project_news_v9_5_1.json",
    ]
    v7_files = [
        "newsv7/index.html", "newsv7/MIGRATION_MANIFEST.json",
        "newsv7/scripts/app-newsv7.js", "newsv7/scripts/core/plugin-host.js",
        "newsv7/scripts/core/project-filter-v9-2.js", "newsv7/scripts/core/state.js",
        "newsv7/scripts/core/utils.js", "newsv7/scripts/data/canonical-projects-newsv7-release.js",
        "newsv7/scripts/data/canonical-projects-newsv7.js",
        "newsv7/scripts/plugins/capacity-presentation-v9-3.js", "newsv7/scripts/plugins/gauges-v9-2.js",
        "newsv7/scripts/plugins/intelligence-newsv7.js", "newsv7/scripts/plugins/newspaper-newsv7-base.js",
        "newsv7/scripts/plugins/newspaper-newsv7.js", "newsv7/scripts/plugins/projects-newsv7.js",
        "newsv7/styles/v7.css", "newsv7/styles/mobile.css", "newsv7/styles/v9-3.css",
        "newsv7/styles/v9-4.css", "newsv7/styles/v9-5-1.css", "newsv7/styles/v9-6-1.css",
        "newsv7/styles/performance-newsv7.css", "newsv7/styles/intelligence-newsv7.css",
        "newsv7/contracts/release.newsv7.json", "newsv7/contracts/release.v9.1.json",
        "newsv7/data/v9.1/build_manifest.json", "newsv7/data/v9.7/regional_manifest.json",
        "newsv7/data/v9.7/regional_news.json", "newsv7/data/newsv7/cumulative_intelligence.json",
        "newsv7/data/newsv7/build_manifest.json", "newsv7/dist/major_project_news_v9_5_1.json",
    ]
    for relative in v1_files + v7_files:
        copy_file(archive, site, relative)
    copy_tree(archive / "newsv1/data/v9.1/projects", site / "newsv1/data/v9.1/projects")
    copy_tree(archive / "newsv7/data/v9.1/projects", site / "newsv7/data/v9.1/projects")


def stage_site(root: Path, site: Path, release: dict) -> None:
    require(not site.exists(), f"staging destination already exists: {site}")
    site.mkdir(parents=True)
    archive = root / ARCHIVE
    require(archive.is_dir(), f"missing archived public closure: {archive}")
    stage_legacy_apps(archive, site)

    timestamp_releases = sorted(
        path for path in archive.iterdir()
        if path.is_dir() and re.fullmatch(r"\d{12}-(?:PipelineNews|pipelinenews)", path.name)
    )
    require(len(timestamp_releases) == 9, f"historical timestamp release count: {len(timestamp_releases)}")
    for source in timestamp_releases:
        copy_tree(source, site / source.name)
    copy_tree(archive / "objects", site / "objects")
    copy_tree(archive / "releases", site / "releases")
    if (archive / "attestations").is_dir():
        copy_tree(archive / "attestations", site / "attestations")

    pointer_name = "current.json" if (archive / "attestations/202608260159-pipelinenews-closure.json").is_file() else "candidate.json"
    pointer = read_json(archive / "releases" / pointer_name)
    governed_manifest = read_json(repository_path(archive, pointer["manifest"]))
    for proof in governed_manifest.get("proof", []):
        relative = proof.get("path", "")
        if relative.startswith("reports/"):
            copy_file(archive, site, relative)

    excluded_candidates, authorised_candidates = candidate_publication_boundary(root, release)
    copy_release_tree(root / "releases", site / "releases", excluded_candidates)
    copy_tree(root / "data", site / "data")
    live_pointer = release.get("live_pointer")
    if live_pointer is not None:
        copy_file(root, site, "state/live-set.json")
    (site / ".nojekyll").touch()

    for relative in excluded_candidates:
        require(not (site / relative).exists(), f"non-deploying candidate entered Pages artifact: {relative}")
    authorised_records = {
        record["path"]: record for record in release.get("candidate_outputs", [])
    }
    require(set(authorised_records) == authorised_candidates, "authorised candidate record set changed")
    for relative in authorised_candidates:
        verify_record(site, authorised_records[relative], "staged authorised candidate output")
    timestamp_folder = release.get("timestamp_folder")
    if timestamp_folder is not None:
        for record in timestamp_folder["manifest"]["outputs"]:
            verify_record(site, record, "staged timestamp-folder output")
        timestamp_manifest = timestamp_folder["manifest_path"]
        require((site / timestamp_manifest).is_file(), "staged timestamp release manifest is missing")
        require(
            sha256(site / timestamp_manifest) == timestamp_folder["manifest_sha256"],
            "staged timestamp release manifest changed",
        )

    required = [
        "newsv1/index.html", "newsv7/index.html", "202608260159-pipelinenews/index.html",
        "objects/data/sha256/3d2cd9cba8581bbc8c4e7434deb0c584d3969639a00926393cf011e2c3f8a00b.json",
        "releases/current.json", release["release_path"],
    ]
    if timestamp_folder is not None:
        required.extend([timestamp_folder["index_path"], timestamp_folder["manifest_path"]])
    if live_pointer is not None:
        required.extend(live_pointer["paths"])
    for relative in required:
        require((site / relative).is_file(), f"staged public path missing: {relative}")
    forbidden_roots = ["ui", "index", "atman", "archive"]
    for relative in forbidden_roots:
        require(not (site / relative).exists(), f"source tree was published: {relative}")
    require(not any(path.name == "tests" for path in site.rglob("tests")), "test tree was published")
    require(not any(path.is_symlink() for path in site.rglob("*")), "symlink in Pages artifact")

    manifest = release["manifest"]
    for record in manifest["outputs"]:
        verify_record(site, record, "staged output")
    for record in manifest["inputs"]:
        if record["path"].startswith("data/"):
            verify_record(site, record, "staged shared data")
    validate_html_and_modules(site, manifest, release["generation"])
    validate_data(site, manifest, release["generation"])


def emit_github_outputs(release: dict, site: Path | None) -> None:
    output_path = os.environ.get("GITHUB_OUTPUT")
    if not output_path:
        return
    values = {
        "generation": release["generation"],
        "release_path": release["release_path"],
        "release_sha256": release["release_sha256"],
        "public_url": release["public_url"],
        "project_count": EXPECTED_PROJECTS,
        "headline_count": EXPECTED_HEADLINES,
    }
    for key in ("candidate_generation", "candidate_path", "candidate_sha256", "candidate_verifier"):
        if key in release:
            values[key] = release[key]
    timestamp_folder = release.get("timestamp_folder")
    if timestamp_folder is not None:
        values.update({
            "timestamp_folder_release": timestamp_folder["release_id"],
            "timestamp_folder_generation": timestamp_folder["generation"],
            "timestamp_folder_path": timestamp_folder["folder_path"],
            "timestamp_folder_index_path": timestamp_folder["index_path"],
            "timestamp_folder_index_sha256": timestamp_folder["index_sha256"],
            "timestamp_folder_manifest_path": timestamp_folder["manifest_path"],
            "timestamp_folder_manifest_sha256": timestamp_folder["manifest_sha256"],
        })
    live_pointer = release.get("live_pointer")
    if live_pointer is not None:
        values.update({
            "live_pointer": "true",
            "live_pointer_sha256": live_pointer["sha256"],
            "live_pointer_bytes": live_pointer["bytes"],
        })
    if site is not None:
        files = [path for path in site.rglob("*") if path.is_file()]
        values["staged_files"] = len(files)
        values["staged_bytes"] = sum(path.stat().st_size for path in files)
    with Path(output_path).open("a", encoding="utf-8") as handle:
        for key, value in values.items():
            handle.write(f"{key}={value}\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".", help="repository root")
    parser.add_argument("--generation", default="latest", help="latest or YYYYMMDDHHMM")
    parser.add_argument("--stage", help="fresh Pages staging directory")
    parser.add_argument("--timestamp-folder-release", help="optional immutable YYYYMMDDHHMM-pipelinenews folder")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    release = validate_release(root, args.generation)
    if args.timestamp_folder_release:
        release["timestamp_folder"] = validate_timestamp_folder_release(root, args.timestamp_folder_release)
    live_pointer = validate_live_pointer(root, release.get("timestamp_folder"))
    if live_pointer is not None:
        release["live_pointer"] = live_pointer
    site = Path(args.stage).resolve() if args.stage else None
    if site is not None:
        stage_site(root, site, release)
    emit_github_outputs(release, site)
    summary = {
        "status": "CHECKED_AND_STAGED" if site else "CHECKED",
        "generation": release["generation"],
        "release_path": release["release_path"],
        "release_sha256": release["release_sha256"],
        "project_count": EXPECTED_PROJECTS,
        "headline_count": EXPECTED_HEADLINES,
        "site": str(site) if site else None,
    }
    for key in ("candidate_generation", "candidate_path", "candidate_sha256", "candidate_verifier"):
        if key in release:
            summary[key] = release[key]
    if "timestamp_folder" in release:
        summary["timestamp_folder"] = {
            key: value for key, value in release["timestamp_folder"].items()
            if key != "manifest"
        }
    if "live_pointer" in release:
        summary["live_pointer"] = {
            "paths": release["live_pointer"]["paths"],
            "bytes": release["live_pointer"]["bytes"],
            "sha256": release["live_pointer"]["sha256"],
        }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"PAGES BUILD GATE FAILED: {error}", file=sys.stderr)
        raise
