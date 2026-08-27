#!/usr/bin/env python3
"""Validate and stage the immutable modular PipelineNews Pages release.

This is the PipelineNews equivalent of GlobalGrid2050's trusted Pages build gate:
validate the exact committed release, reconstruct the already-public historical
closure, overlay the modular release and its shared data cartridges, then hand the
closed site tree to GitHub Pages.
"""

from __future__ import annotations

import argparse
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
SAFE_RELEASE_OUTPUT_RE = re.compile(r"^releases/[A-Za-z0-9._/-]+$")
IMPORT_RE = re.compile(r"\bfrom\s+[\"']([^\"']+)[\"']|\bimport\s+[\"']([^\"']+)[\"']")
RUNTIME_JSON_RE = re.compile(
    r"[\"']((?:\.{1,2}/)*(?:data|manifests)/[^\"']+\.(?:json|geojson))[\"']"
)


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


def non_deploying_candidate_outputs(root: Path, release: dict) -> set[str]:
    """Validate fast-candidate manifests and return paths barred from Pages."""
    build = root / "build"
    if not build.is_dir():
        return set()
    manifests = sorted(build.glob("*-v8-fast-site-manifest.json"))
    excluded: set[str] = set()
    owners: dict[str, str] = {}
    protected = {"releases/current.json", "releases/candidate.json", release["release_path"]}
    protected.update(record["path"] for record in release["manifest"]["outputs"])

    for manifest_path in manifests:
        match = FAST_CANDIDATE_MANIFEST_RE.fullmatch(manifest_path.name)
        require(match is not None, f"invalid fast candidate manifest name: {manifest_path.name}")
        relative_manifest = manifest_path.relative_to(root).as_posix()
        require_no_symlink_components(root, relative_manifest, "fast candidate manifest path")
        require(manifest_path.is_file(), f"fast candidate manifest is not a file: {relative_manifest}")
        manifest = read_json(manifest_path)
        require(isinstance(manifest, dict), f"fast candidate manifest is not an object: {relative_manifest}")
        require(manifest.get("schema") == FAST_CANDIDATE_SCHEMA, f"fast candidate schema changed: {relative_manifest}")
        generation = match.group(1)
        require(manifest.get("generation") == generation, f"fast candidate generation mismatch: {relative_manifest}")
        deployment = manifest.get("deployment")
        require(
            deployment in ("not-authorised", "authorised"),
            f"unsupported fast candidate deployment state in {relative_manifest}: {deployment!r}",
        )
        outputs = manifest.get("outputs")
        require(isinstance(outputs, list) and outputs, f"fast candidate has no outputs: {relative_manifest}")
        manifest_paths: set[str] = set()
        for index, record in enumerate(outputs):
            label = f"fast candidate output {index} in {relative_manifest}"
            require(isinstance(record, dict), f"{label} is not an object")
            relative = normalise_candidate_output_path(record.get("path"), label)
            require(relative not in manifest_paths, f"duplicate path in {relative_manifest}: {relative}")
            manifest_paths.add(relative)
            require(relative not in ("releases/current.json", "releases/candidate.json"), f"candidate may not declare a public pointer: {relative}")
            require(Path(relative).name.startswith(generation), f"candidate output generation mismatch: {relative}")
            require(isinstance(record.get("bytes"), int) and record["bytes"] >= 0, f"invalid byte count for {relative}")
            require(bool(re.fullmatch(r"[0-9a-f]{64}", str(record.get("sha256", "")))), f"invalid SHA-256 for {relative}")
            require_no_symlink_components(root, relative, "fast candidate output path")
            verify_record(root, record, "fast candidate output")
            previous = owners.get(relative)
            require(previous is None, f"candidate output declared by both {previous} and {relative_manifest}: {relative}")
            owners[relative] = relative_manifest
            if deployment == "not-authorised":
                require(relative not in protected, f"non-deploying candidate overlaps the governed release: {relative}")
                archived = root / ARCHIVE / relative
                require(not archived.exists() and not archived.is_symlink(), f"non-deploying candidate overlaps historical public path: {relative}")
                excluded.add(relative)
    return excluded


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

    excluded_candidates = non_deploying_candidate_outputs(root, release)
    copy_release_tree(root / "releases", site / "releases", excluded_candidates)
    copy_tree(root / "data", site / "data")
    (site / ".nojekyll").touch()

    for relative in excluded_candidates:
        require(not (site / relative).exists(), f"non-deploying candidate entered Pages artifact: {relative}")

    required = [
        "newsv1/index.html", "newsv7/index.html", "202608260159-pipelinenews/index.html",
        "objects/data/sha256/3d2cd9cba8581bbc8c4e7434deb0c584d3969639a00926393cf011e2c3f8a00b.json",
        "releases/current.json", release["release_path"],
    ]
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
    args = parser.parse_args()

    root = Path(args.root).resolve()
    release = validate_release(root, args.generation)
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
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"PAGES BUILD GATE FAILED: {error}", file=sys.stderr)
        raise
