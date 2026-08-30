#!/usr/bin/env python3
# Extend the PipelineNews Pages gate for the current Atlas-link v2 release.

from pathlib import Path

TARGET = Path("atman/202608262014-build-pages.py")


def replace_once(text: str, before: str, after: str, label: str) -> str:
    count = text.count(before)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(before, after)


def main() -> None:
    text = TARGET.read_text(encoding="utf-8")
    helper_anchor = "\ndef validate_timestamp_folder_release(root: Path, release_id: str) -> dict:\n"
    helpers = r'''
def _atlas_link_v2_outputs(root: Path, folder_relative: str) -> tuple[list[dict], set[str]]:
    ledger_relative = f"{folder_relative}/sha256sums.txt"
    ledger = repository_path(root, ledger_relative)
    require(ledger.is_file(), "Atlas-link SHA ledger missing")
    records: list[dict] = []
    declared: set[str] = set()
    for number, raw in enumerate(ledger.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip():
            continue
        digest, separator, local = raw.partition("  ")
        require(separator == "  " and bool(SHA256_RE.fullmatch(digest)), f"bad Atlas-link ledger line {number}")
        require(
            local and "\\" not in local and "\x00" not in local
            and not Path(local).is_absolute()
            and posixpath.normpath(local) == local
            and all(part not in ("", ".", "..") for part in local.split("/")),
            f"unsafe Atlas-link ledger path {number}",
        )
        relative = f"{folder_relative}/{local}"
        require(relative not in declared, f"duplicate Atlas-link ledger path: {relative}")
        require_no_symlink_components(root, relative, "Atlas-link release")
        target = repository_path(root, relative)
        require(target.is_file(), f"Atlas-link file missing: {relative}")
        record = {"path": relative, "bytes": target.stat().st_size, "sha256": digest}
        verify_record(root, record, "Atlas-link ledger output")
        records.append(record)
        declared.add(relative)
    require(records, "Atlas-link SHA ledger is empty")
    ledger_record = {
        "path": ledger_relative,
        "bytes": ledger.stat().st_size,
        "sha256": sha256(ledger),
    }
    return records + [ledger_record], declared


def validate_current_atlas_link_v2(
    root: Path,
    release_id: str,
    generation: str,
    folder_relative: str,
    folder: Path,
    release_manifest_relative: str,
    release_manifest_path: Path,
    release_manifest: dict,
    build_manifest_relative: str,
    build_manifest: dict,
) -> dict:
    require(release_manifest.get("schema") == "pipelinenews.current-atlas-link-release.v2", "Atlas-link release schema changed")
    require(build_manifest.get("schema") == "pipelinenews.current-atlas-link-build-manifest.v2", "Atlas-link build schema changed")
    for manifest in (release_manifest, build_manifest):
        require(manifest.get("generation") == generation and manifest.get("release_id") == release_id, "Atlas-link identity changed")
    require(release_manifest.get("classification") == "CURRENT_ATLAS_LINK_CANDIDATE", "Atlas-link release classification changed")
    require(release_manifest.get("immutable_after_publication") is True, "Atlas-link release is not immutable")
    require(release_manifest.get("parent_release_id") == "202608291447-pipelinenews", "Atlas-link parent changed")
    require(release_manifest.get("atlas_release_id") == "202608300453-atlas-v9", "Atlas-link receiver changed")
    require(
        release_manifest.get("atlas_live_url")
        == "https://ventusltd.github.io/gridatlas/202608300453-atlas-v9/",
        "Atlas-link receiver URL changed",
    )
    require(
        all(release_manifest.get(key) == 0 for key in ("data_changes", "news_changes", "project_changes"))
        and release_manifest.get("application_changes") == 1,
        "Atlas-link product boundary changed",
    )
    route = release_manifest.get("exact_identity_route") or {}
    require(
        route.get("parameter") == "repd_ref"
        and route.get("golden_repd_ref") == "13599"
        and route.get("broad_search_supplement_requests_expected") == 0,
        "Atlas-link exact identity route changed",
    )
    require(build_manifest.get("classification") == "DETERMINISTIC_RECEIVER_ONLY_BUILD", "Atlas-link build classification changed")
    require(build_manifest.get("source_release_id") == "202608291447-pipelinenews", "Atlas-link source release changed")
    source_commit = require_git_commit(root, build_manifest.get("source_commit"), "Atlas-link source commit")
    require(
        all(build_manifest.get(key) == 0 for key in ("data_changes", "news_changes", "project_changes"))
        and build_manifest.get("application_changes") == 1
        and build_manifest.get("deep_link_logic_changes") == 2
        and len(build_manifest.get("deep_link_repairs") or []) == 2,
        "Atlas-link build boundary changed",
    )

    atlas_relative = f"{folder_relative}/atlas-link-manifest.json"
    atlas = read_json(repository_path(root, atlas_relative))
    require(atlas.get("schema") == "pipelinenews.atlas-current-link-manifest.v1", "Atlas-link binding schema changed")
    require(atlas.get("classification") == "VERIFIED_GRIDATLAS_V9_RECEIVER_BOUND", "Atlas-link binding classification changed")
    identity = atlas.get("identity") or {}
    require(
        atlas.get("pipeline_release_id") == release_id
        and (atlas.get("atlas") or {}).get("release_id") == "202608300453-atlas-v9"
        and identity.get("parameter") == "repd_ref"
        and identity.get("rule") == "EXACT_REPD_REF_ONLY"
        and identity.get("golden_repd_ref") == "13599"
        and identity.get("golden_url")
        == "https://ventusltd.github.io/gridatlas/202608300453-atlas-v9/?repd_ref=13599",
        "Atlas-link binding changed",
    )

    outputs, declared = _atlas_link_v2_outputs(root, folder_relative)
    record_by_path = {record["path"]: record for record in outputs}
    required = {
        f"{folder_relative}/index.html",
        release_manifest_relative,
        build_manifest_relative,
        atlas_relative,
    }
    require(required.issubset(declared), "Atlas-link ledger omits required evidence")

    build_declared: set[str] = set()
    files = build_manifest.get("files")
    require(isinstance(files, list) and files, "Atlas-link build file list missing")
    for index, record in enumerate(files):
        require(isinstance(record, dict) and set(record) == {"path", "bytes", "sha256"}, f"Atlas-link build record {index} changed")
        local = record["path"]
        require(not Path(local).is_absolute() and posixpath.normpath(local) == local, f"unsafe Atlas-link build path: {local}")
        relative = f"{folder_relative}/{local}"
        require(relative in declared, f"Atlas-link build path absent from ledger: {relative}")
        expected = record_by_path[relative]
        require(record["bytes"] == expected["bytes"] and record["sha256"] == expected["sha256"], f"Atlas-link build record differs: {relative}")
        require(relative not in build_declared, f"duplicate Atlas-link build record: {relative}")
        build_declared.add(relative)
    require(
        declared - build_declared == {release_manifest_relative, build_manifest_relative},
        "Atlas-link build and SHA ledgers differ",
    )

    actual = {
        path.relative_to(root).as_posix()
        for path in folder.rglob("*")
        if path.is_file()
    }
    require(not any(path.is_symlink() for path in folder.rglob("*")), "symlink in Atlas-link release")
    require(actual == {record["path"] for record in outputs}, "Atlas-link folder closure differs from ledger")

    release_commit = git_text(root, "log", "--diff-filter=A", "-1", "--format=%H", "--", release_manifest_relative)
    require(bool(COMMIT_RE.fullmatch(release_commit)), "Atlas-link release is not committed")
    require(git_text(root, "show", "-s", "--format=%P", release_commit).split() == [source_commit], "Atlas-link release parent changed")
    changes = {
        line for line in git_text(root, "diff-tree", "--no-commit-id", "--name-only", "-r", release_commit).splitlines()
        if line
    }
    require(changes == actual, "Atlas-link release commit differs from folder closure")
    for record in outputs:
        require_commit_file(root, release_commit, record["path"], record["sha256"], "Atlas-link committed output")

    text_files = "\n".join(
        path.read_text(encoding="utf-8")
        for path in folder.rglob("*")
        if path.is_file()
        and (path.suffix in {".html", ".mjs", ".js"} or path.name == "atlas-link-manifest.json")
        and path.name not in {"build-manifest.json", "release-manifest.json"}
        and "provenance" not in path.parts
    )
    require(FORBIDDEN_ATLAS_V8_RECEIVER not in text_files, "Atlas V8 receiver leaked into Atlas-link release")
    require("202608291430-atlas-v9" not in text_files, "superseded Atlas V9 receiver leaked")
    require("202608300453-atlas-v9" in text_files, "current Atlas V9 receiver absent")

    return {
        "release_id": release_id,
        "generation": generation,
        "kind": "current-atlas-link-v2",
        "folder_path": f"{folder_relative}/",
        "index_path": f"{folder_relative}/index.html",
        "index_sha256": record_by_path[f"{folder_relative}/index.html"]["sha256"],
        "manifest_path": release_manifest_relative,
        "manifest_sha256": sha256(release_manifest_path),
        "manifest": release_manifest,
        "outputs": outputs,
        "release_commit": release_commit,
    }


def validate_current_or_predecessor_pointer(root: Path, timestamp_folder: dict) -> dict | None:
    state_relative = Path("state/live-set.json")
    if not (root / state_relative).is_file():
        return None
    state_payload = (root / state_relative).read_bytes()
    pointer = json.loads(state_payload)
    schema = pointer.get("schema")
    require(schema in {"pipelinenews.live-pointer.v3", "pipelinenews.live-pointer.v4"}, "live pointer schema changed")
    current_relative = Path("releases/current-v4.json" if schema.endswith(".v4") else "releases/current-v3.json")
    require((root / current_relative).is_file(), "matching live pointer copy missing")
    require((root / current_relative).read_bytes() == state_payload, "live pointer copies differ")
    release_id = pointer.get("release_id")
    require(
        pointer.get("classification") == "VERIFIED_LIVE_TIMESTAMPED_RELEASE"
        and isinstance(release_id, str)
        and TIMESTAMP_FOLDER_RE.fullmatch(release_id),
        "live pointer identity changed",
    )
    require(pointer.get("entrypoint") == f"releases/{release_id}/index.html", "live pointer entrypoint changed")
    require(repository_path(root, pointer["entrypoint"]).is_file(), "live pointer entrypoint missing")
    release_binding = pointer.get("release_manifest") or {}
    build_binding = pointer.get("build_manifest") or {}
    verify_record(root, release_binding, "live pointer release manifest")
    verify_record(root, build_binding, "live pointer build manifest")
    deployed = require_git_commit(root, pointer.get("deployed_commit"), "live pointer deployed commit")
    owner = git_text(root, "log", "--diff-filter=A", "-1", "--format=%H", "--", release_binding["path"])
    proof = pointer.get("public_proof") or {}
    require(proof.get("synthetic_receiver") is False and proof.get("route_interceptions") == 0, "live pointer proof changed")
    public_paths = [current_relative, state_relative, Path("state/atlas-v9-current.json")]

    if schema.endswith(".v4"):
        require(release_id == timestamp_folder["release_id"], "v4 pointer does not bind candidate")
        require(owner == timestamp_folder["release_commit"], "v4 pointer release owner changed")
        subprocess.run(["git", "merge-base", "--is-ancestor", owner, deployed], cwd=root, check=True, capture_output=True)
        atlas_binding = pointer.get("atlas_link_manifest") or {}
        verify_record(root, atlas_binding, "v4 pointer Atlas manifest")
        receiver = pointer.get("atlas_v9_receiver") or {}
        require(
            receiver.get("release_id") == "202608300453-atlas-v9"
            and receiver.get("base_url") == "https://ventusltd.github.io/gridatlas/202608300453-atlas-v9/"
            and receiver.get("identity_rule") == "EXACT_REPD_REF_ONLY"
            and receiver.get("query_parameter") == "repd_ref"
            and receiver.get("golden_repd_ref") == "13599",
            "v4 pointer Atlas receiver changed",
        )
        proof_path = proof.get("path")
        require(
            proof.get("classification") == "VERIFIED_PUBLIC_PIPELINENEWS_ATLAS_V9_DEEP_LINK"
            and proof.get("receiver_url")
            == "https://ventusltd.github.io/gridatlas/202608300453-atlas-v9/?repd_ref=13599"
            and isinstance(proof_path, str)
            and repository_path(root, proof_path).is_file()
            and sha256(repository_path(root, proof_path)) == proof.get("sha256"),
            "v4 pointer public proof changed",
        )
        public_paths.append(Path("state/atlas-v9-link-contract.json"))
        expected_changes = {
            current_relative.as_posix(),
            state_relative.as_posix(),
            "state/atlas-v9-link-contract.json",
            "machine-learning/proofs/202608300309-local-atlas-v9-deep-link-proof.json",
            "machine-learning/proofs/202608300309-public-atlas-v9-deep-link-proof.json",
        }
    else:
        require(release_id == "202608291447-pipelinenews" and owner == deployed, "predecessor pointer changed")
        receiver = pointer.get("atlas_v9_receiver") or {}
        require(
            receiver.get("base_url") == "https://ventusltd.github.io/gridatlas/202608291430-atlas-v9/"
            and receiver.get("golden_repd_ref") == "16135",
            "predecessor Atlas receiver changed",
        )
        expected_changes = {current_relative.as_posix(), state_relative.as_posix()}

    pointer_commit = git_text(root, "log", "-1", "--format=%H", "--", current_relative.as_posix())
    require(
        pointer_commit == git_text(root, "log", "-1", "--format=%H", "--", state_relative.as_posix()),
        "live pointer copies were not committed together",
    )
    require(git_text(root, "show", "-s", "--format=%P", pointer_commit).split() == [deployed], "live pointer parent changed")
    changes = {
        line for line in git_text(root, "diff-tree", "--no-commit-id", "--name-only", "-r", pointer_commit).splitlines()
        if line
    }
    require(changes == expected_changes, "live pointer commit changed unexpected paths")
    subprocess.run(["git", "merge-base", "--is-ancestor", pointer_commit, "HEAD"], cwd=root, check=True, capture_output=True)

    existing_public = [relative for relative in public_paths if (root / relative).is_file()]
    return {
        "paths": [relative.as_posix() for relative in existing_public],
        "bytes": len(state_payload),
        "sha256": hashlib.sha256(state_payload).hexdigest(),
        "pointer": pointer,
    }
'''
    text = replace_once(text, helper_anchor, helpers + helper_anchor, "Atlas-link v2 helpers")

    schema_anchor = '    require(release_manifest.get("schema") == TIMESTAMP_FOLDER_RELEASE_SCHEMA, "timestamp release schema changed")\n'
    schema_branch = '''    if release_manifest.get("schema") == "pipelinenews.current-atlas-link-release.v2":
        return validate_current_atlas_link_v2(
            root,
            release_id,
            generation,
            folder_relative,
            folder,
            release_manifest_relative,
            release_manifest_path,
            release_manifest,
            build_manifest_relative,
            build_manifest,
        )

''' + schema_anchor
    text = replace_once(text, schema_anchor, schema_branch, "Atlas-link schema branch")

    legacy_return = '''        "manifest_sha256": sha256(release_manifest_path),
        "manifest": release_manifest,
    }
'''
    text = replace_once(
        text,
        legacy_return,
        '''        "manifest_sha256": sha256(release_manifest_path),
        "manifest": release_manifest,
        "outputs": outputs,
    }
''',
        "legacy timestamp outputs",
    )

    reference = 'timestamp_folder["manifest"]["outputs"]'
    if text.count(reference) != 2:
        raise RuntimeError(f"timestamp output consumers changed: {text.count(reference)}")
    text = text.replace(reference, 'timestamp_folder["outputs"]')

    pointer_call = '    live_pointer = validate_live_pointer(root, release.get("timestamp_folder"))\n'
    text = replace_once(
        text,
        pointer_call,
        '''    timestamp_folder = release.get("timestamp_folder")
    if timestamp_folder is not None and timestamp_folder.get("kind") == "current-atlas-link-v2":
        live_pointer = validate_current_or_predecessor_pointer(root, timestamp_folder)
    else:
        live_pointer = validate_live_pointer(root, timestamp_folder)
''',
        "live pointer dispatch",
    )

    stage_pointer = '''    live_pointer = release.get("live_pointer")
    if live_pointer is not None:
        copy_file(root, site, "state/live-set.json")
'''
    text = replace_once(
        text,
        stage_pointer,
        '''    live_pointer = release.get("live_pointer")
    if live_pointer is not None:
        for relative in live_pointer["paths"]:
            copy_file(root, site, relative)
''',
        "staged live pointer paths",
    )

    TARGET.write_text(text, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
