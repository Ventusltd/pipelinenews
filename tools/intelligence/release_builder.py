"""PipelineNews release builder — one timestamp, one discovery cartridge.

THE ARCHITECTURE THIS IMPLEMENTS
--------------------------------
Take a working app. Stamp a new timestamp. Add ONE discovery cartridge to the
UI. If the result is wrong, do not debug it — build again from an earlier
timestamp. Every timestamp is a complete working app, because the file sizes
are trivial and the UI is the control surface.

Rollback is therefore not a git operation, an undo, or a revert. It is
`--from` an earlier timestamp. Nothing is ever edited in place: releases are
`immutable_after_publication`.

    python release_builder.py --list
    python release_builder.py --from 202608300309-pipelinenews --cartridge project-intelligence
    python release_builder.py --check 202608311304-pipelinenews

`--gen` defaults to the current UTC minute, read from the clock and never
chosen, because cvaa's monotonic-utc-generations vaccine requires a generation
within 15 minutes of its commit time and says generations are read, not picked.

A cartridge package is a directory containing:
    cartridge.json      the manifest: files, the UI section, the loader
    assets/*            files copied into the release's assets/
    data/*              files copied into the release's data/

Pure stdlib. No network. No git operation. Writes only a NEW release directory.
"""

import argparse
import atexit
import datetime
import hashlib
import io
import json
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# tools/intelligence/ -> repo root -> releases/
REPO = os.path.dirname(os.path.dirname(HERE))
RELEASES = os.path.join(REPO, "releases")
CARTRIDGES = os.path.join(HERE, "cartridges")

APP = "assets/202608291447-app.mjs"
REGISTRY = "data/202608291447-registry.json"
ANALYTICS_ANCHOR = '    <h2 class="section-title">REPD PIPELINE ANALYTICS</h2>'


# --------------------------------------------------------------------- utils

def utc_stamp():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d%H%M")


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def read(p):
    return io.open(p, encoding="utf-8").read()


def write(p, t):
    io.open(p, "w", encoding="utf-8", newline="").write(t)


def walk(root):
    out = []
    for base, _d, names in os.walk(root):
        for n in names:
            out.append(os.path.relpath(os.path.join(base, n), root).replace("\\", "/"))
    return sorted(out)


# Text extensions git stores with LF. Anything not listed is left untouched,
# because a stray byte change in a parquet or an image is a corruption.
TEXT_EXT = {".html", ".htm", ".css", ".js", ".mjs", ".json", ".txt", ".md",
            ".yml", ".yaml", ".csv", ".svg", ".sha256", ".geojson"}


def normalise_to_lf(root):
    """Rewrite CRLF to LF across a copied release tree.

    THIS IS NOT COSMETIC. A Windows checkout holds CRLF; git holds LF; and the
    release manifests record the LF byte counts and SHA-256 digests. Copying
    the working tree therefore produces a release whose every inherited file is
    a few hundred bytes larger than its own manifest says, and the repository's
    Pages gate rejects it — correctly.

    Measured on a real build: app.mjs +2,823 bytes, index.html +935, and 35
    records mismatched in total. Nothing in the release was wrong except the
    line endings, and no verifier in this suite caught it, because they all
    hashed the same wrong bytes consistently.
    """
    fixed = 0
    for rel in walk(root):
        if os.path.splitext(rel)[1].lower() not in TEXT_EXT:
            continue
        path = os.path.join(root, rel)
        with open(path, "rb") as fh:
            raw = fh.read()
        if b"\r\n" not in raw:
            continue
        with open(path, "wb") as fh:
            fh.write(raw.replace(b"\r\n", b"\n"))
        fixed += 1
    if fixed:
        print("  normalised %d text files to LF (matching what git stores)" % fixed)
    return fixed


def refresh_sha256_sidecars(target):
    """Rewrite every `<file>.sha256` to attest the file as it now stands.

    A cartridge ships its payload as `{GEN}-thing.json` plus a sidecar digest,
    and the build substitutes {GEN} in BOTH -- which changes the payload's
    bytes after the sidecar was written. The sidecar then attests a file that
    no longer exists, and nothing catches it: app.mjs verifies against the
    registry digest, and sha256sums.txt is regenerated from scratch.

    Measured on 202608311610: the shipped grid-proximity sidecar said
    c6ef7879..., the file hashed 49aaf5c3.... A file whose only job is to
    attest its neighbour, getting its neighbour wrong, is worse than no file.
    Published releases are immutable, so that one stays as it is; this repairs
    it going forward, for inherited sidecars as well as new ones.
    """
    fixed = 0
    for rel in walk(target):
        if not rel.endswith(".sha256"):
            continue
        subject = rel[:-len(".sha256")]
        subject_abs = os.path.join(target, subject)
        if not os.path.exists(subject_abs):
            continue
        path = os.path.join(target, rel)
        want = sha256_file(subject_abs)
        line = "%s  %s\n" % (want, os.path.basename(subject))
        if read(path) != line:
            write(path, line)
            fixed += 1
            print("    %s now attests %s" % (rel, want[:12]))
    print("  %d sha256 sidecar(s) rewritten" % fixed)
    return fixed


def refresh_build_manifest(target, release_id):
    """Recompute every byte count and digest the build manifest records.

    The manifest is inherited from the parent, so every file this build changed
    -- index.html, app.mjs, the registry, the atlas link manifest -- still
    carries the parent's numbers until they are rewritten here. Leaving them
    stale is what a hash-verified release is specifically designed to catch.
    """
    path = os.path.join(target, "build-manifest.json")
    if not os.path.exists(path):
        return 0
    doc = json.loads(read(path))

    def visit(node):
        count = 0
        if isinstance(node, dict):
            if "path" in node and isinstance(node.get("path"), str):
                f = os.path.join(target, node["path"])
                if os.path.exists(f):
                    if "bytes" in node:
                        node["bytes"] = os.path.getsize(f)
                        count += 1
                    if "sha256" in node:
                        node["sha256"] = sha256_file(f)
            for v in node.values():
                count += visit(v)
        elif isinstance(node, list):
            for v in node:
                count += visit(v)
        return count

    updated = visit(doc)
    write(path, json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    print("  refreshed %d records in build-manifest.json" % updated)
    return updated


def apply_once(text, old, new, label, expect=1):
    n = text.count(old)
    if n != expect:
        raise SystemExit("PATCH FAILED [%s]: expected %d, found %d" % (label, expect, n))
    print("    %-52s %d" % (label, n))
    return text.replace(old, new)


def releases():
    if not os.path.isdir(RELEASES):
        return []
    out = []
    for name in sorted(os.listdir(RELEASES)):
        d = os.path.join(RELEASES, name)
        if os.path.isdir(d) and os.path.exists(os.path.join(d, "index.html")):
            out.append(name)
    return out


# ---------------------------------------------------------------------- list

def cmd_list():
    rel = releases()
    if not rel:
        print("no releases found in %s" % RELEASES)
        return 1
    print("Rollback points — every one is a complete working app.\n")
    print("  %-34s %-8s %-9s %s" % ("RELEASE", "FILES", "CARTRIDGES", "ADDED PANELS"))
    for name in rel:
        d = os.path.join(RELEASES, name)
        files = walk(d)
        reg_path = os.path.join(d, REGISTRY)
        panels = []
        if os.path.exists(reg_path):
            try:
                sup = json.loads(read(reg_path)).get("supplemental_assets") or {}
                panels = sorted(sup.keys())
            except ValueError:
                panels = ["<unreadable registry>"]
        print("  %-34s %-8d %-9d %s"
              % (name, len(files), len(panels), ", ".join(panels) or "—"))
    print("\nBuild from any of them:")
    print("  python release_builder.py --from %s --cartridge <name>" % rel[-1])
    print("\nAvailable cartridges:")
    if os.path.isdir(CARTRIDGES):
        for c in sorted(os.listdir(CARTRIDGES)):
            man = os.path.join(CARTRIDGES, c, "cartridge.json")
            if os.path.exists(man):
                m = json.loads(read(man))
                print("  %-26s %s" % (c, m.get("summary", "")))
    else:
        print("  (none — create %s/<name>/cartridge.json)" % CARTRIDGES)
    return 0


# --------------------------------------------------------------------- build

def cmd_build(parent_id, cartridge_name, gen, atlas_target):
    parent = os.path.join(RELEASES, parent_id)
    if not os.path.isdir(parent):
        raise SystemExit("no such parent release: %s" % parent)

    pkg = os.path.join(CARTRIDGES, cartridge_name)
    man_path = os.path.join(pkg, "cartridge.json")
    if not os.path.exists(man_path):
        raise SystemExit("no cartridge manifest: %s" % man_path)
    man = json.loads(read(man_path))

    release_id = "%s-pipelinenews" % gen
    target = os.path.join(RELEASES, release_id)
    if os.path.exists(target):
        raise SystemExit("release already exists (immutable): %s\n"
                         "Bump the generation or delete it deliberately." % target)

    # A new timestamp must sort after its parent, or the ordering the whole
    # system relies on runs backwards.
    if gen <= parent_id[:12]:
        raise SystemExit("generation %s is not after parent %s; generations are "
                         "monotonic" % (gen, parent_id[:12]))

    print("Building %s\n  from    %s\n  adding  %s\n" % (release_id, parent_id, cartridge_name))

    before = {p: sha256_file(os.path.join(parent, p)) for p in walk(parent)}
    shutil.copytree(parent, target)
    normalise_to_lf(target)

    # A build that fails part-way must leave NOTHING behind. A half-written
    # release directory looks like a real release to every later command — it
    # has an index.html, so --list shows it and --from will build on it — and
    # the whole rollback model depends on every timestamp being complete.
    # This is not hypothetical: it happened, and the corrupt release carried
    # its parent's registry entry and import while looking fine from outside.
    build_ok = {"done": False}

    def _discard_partial():
        if not build_ok["done"] and os.path.isdir(target):
            shutil.rmtree(target, ignore_errors=True)
            sys.stderr.write("\nbuild failed; discarded partial release %s\n" % release_id)

    atexit.register(_discard_partial)
    print("  %d files carried forward\n" % len(before))

    key = man["key"]
    stamped = {}      # placeholder -> value used across the manifest
    stamped["{GEN}"] = gen

    def sub(text):
        for k, v in stamped.items():
            text = text.replace(k, v)
        return text

    # ---- 1. copy the cartridge's own files -------------------------------
    print("  new files")
    added = []
    for sub_dir in ("assets", "data"):
        src_dir = os.path.join(pkg, sub_dir)
        if not os.path.isdir(src_dir):
            continue
        for name in sorted(os.listdir(src_dir)):
            dest_name = sub(name)
            src_file = os.path.join(src_dir, name)
            dst_file = os.path.join(target, sub_dir, dest_name)

            # {GEN} must be substituted in CONTENT as well as in filenames.
            # The cartridge declares its own generation, and app.mjs asserts
            # cartridge.CONTRACT.generation === entry.generation before it will
            # mount. Leaving the placeholder in the body ships a panel that
            # throws on open and shows "unavailable" — caught by render_proof.
            if os.path.splitext(name)[1].lower() in TEXT_EXT:
                body = io.open(src_file, encoding="utf-8", newline="").read()
                if "{GEN}" in body:
                    write(dst_file, sub(body))
                    added.append("%s/%s" % (sub_dir, dest_name))
                    print("    %s  ({GEN} substituted in body)" % added[-1])
                    continue
            # --atlas-target flips the cartridge's own ACTIVE_TARGET constant,
            # so which atlas a release points at is a build input, not an edit.
            if atlas_target and name.endswith('.mjs'):
                text = read(src_file)
                if 'const ACTIVE_TARGET' in text:
                    text = re.sub(r'const ACTIVE_TARGET = "\w+"',
                                  'const ACTIVE_TARGET = "%s"' % atlas_target, text)
                    write(dst_file, text)
                    print('    (atlas target set to %s)' % atlas_target)
                else:
                    shutil.copyfile(src_file, dst_file)
            else:
                shutil.copyfile(src_file, dst_file)
            added.append("%s/%s" % (sub_dir, dest_name))
            print("    %s" % added[-1])

    # ---- 2. index.html : the UI section, plus any declared repairs --------
    print("\n  index.html")
    idx = read(os.path.join(target, "index.html"))
    for rep in man.get("repairs", {}).get("index.html", []):
        idx = apply_once(idx, sub(rep["from"]), sub(rep["to"]), rep["label"],
                         rep.get("expect", 1))
    if man.get("section"):
        idx = apply_once(idx, ANALYTICS_ANCHOR, sub(man["section"]) + ANALYTICS_ANCHOR,
                         "UI section for %s" % key)
    idx = apply_once(idx, "<title>", "<title>", "title tag present", idx.count("<title>"))
    write(os.path.join(target, "index.html"), idx)

    # ---- 3. app.mjs : loader, plus any declared repairs -------------------
    print("\n  %s" % APP)
    app = read(os.path.join(target, APP))
    for rep in man.get("repairs", {}).get("app", []):
        app = apply_once(app, sub(rep["from"]), sub(rep["to"]), rep["label"],
                         rep.get("expect", 1))
    if man.get("loader"):
        app = apply_once(app, "async function boot() {",
                         sub(man["loader"]) + "async function boot() {",
                         "loader for %s" % key)
        app = apply_once(app, "  bindFederatedRelationships();",
                         "  bindFederatedRelationships();\n  %s" % sub(man["bind_call"]),
                         "bind call in boot()")
    write(os.path.join(target, APP), app)

    # ---- 4. registry -----------------------------------------------------
    print("\n  %s" % REGISTRY)
    reg_path = os.path.join(target, REGISTRY)
    reg = json.loads(read(reg_path))
    entry = json.loads(sub(json.dumps(man["registry_entry"])))
    for ref in man.get("hash_fields", []):
        node, rel_path = entry, sub(ref["path"])
        for step in ref["at"][:-1]:
            node = node[step]
        abs_path = os.path.join(target, rel_path)
        node[ref["at"][-1]] = sha256_file(abs_path)
        node["bytes"] = os.path.getsize(abs_path)
    if key in reg.get("supplemental_assets", {}):
        raise SystemExit("registry already carries %s" % key)
    reg.setdefault("supplemental_assets", {})[key] = entry
    # Every INHERITED cartridge entry still carries the parent's digest, and
    # the parent's digest was taken from a Windows working copy holding CRLF.
    # normalise_to_lf has since rewritten those files to the LF bytes that
    # actually ship, so the inherited digests now describe bytes no one will
    # ever receive. Measured on 202608311610: the registry claims
    # grid-proximity.mjs is 34,239 bytes (3265e118...), the file on the server
    # is 33,541 (8703fce7...). The build manifest is already re-derived after
    # normalisation for exactly this reason; the registry never was.
    print("    re-deriving inherited digests after LF normalisation")
    for other_key, other in sorted((reg.get("supplemental_assets") or {}).items()):
        for kind in ("cartridge", "payload"):
            node = other.get(kind)
            if not isinstance(node, dict) or "path" not in node:
                continue
            abs_path = os.path.join(target, node["path"])
            if not os.path.exists(abs_path):
                continue
            digest, size = sha256_file(abs_path), os.path.getsize(abs_path)
            if node.get("sha256") != digest or node.get("bytes") != size:
                print("      %s.%s  %s -> %s" % (other_key, kind,
                                                 str(node.get("sha256"))[:12], digest[:12]))
                node["sha256"], node["bytes"] = digest, size
    write(reg_path, json.dumps(reg, indent=2, ensure_ascii=False) + "\n")
    print("    supplemental_assets.%s" % key)

    # ---- 5. manifests ----------------------------------------------------
    print("\n  manifests")
    rel = json.loads(read(os.path.join(target, "release-manifest.json")))
    rel.update({
        "schema": "pipelinenews.additive-cartridge-release.v1",
        "generation": gen,
        "release_id": release_id,
        "parent_release_id": parent_id,
        "classification": ("DASHBOARD_MODIFYING_CARTRIDGE"
                           if man.get("modifies_existing_dashboard")
                           else "ADDITIVE_DISCOVERY_CARTRIDGE"),
        "cartridge_added": key,
        "cartridges_present": sorted(reg["supplemental_assets"].keys()),
        # Hard-coding False was true while every cartridge was a self-contained
        # panel. A cartridge that patches the table renderer is not additive,
        # and a manifest that says it is would be the one place a reader goes
        # to find out. The cartridge declares it; the manifest records it.
        "existing_dashboard_modified": bool(man.get("modifies_existing_dashboard")),
        "existing_dashboard_modification": man.get("modification_note") or None,
        "generation_source": "read from UTC clock at build time, never chosen",
        "rollback": "build again with --from an earlier release; nothing is edited in place",
        "immutable_after_publication": True,
        "deployment": "not-authorised",
        "runtime_verified": False,
    })
    if atlas_target:
        rel["atlas_target"] = atlas_target
    write(os.path.join(target, "release-manifest.json"),
          json.dumps(rel, indent=2, sort_keys=True, ensure_ascii=False) + "\n")
    print("    release-manifest.json")

    refresh_sha256_sidecars(target)
    refresh_build_manifest(target, release_id)

    files = [f for f in walk(target) if f != "sha256sums.txt"]
    write(os.path.join(target, "sha256sums.txt"),
          "".join("%s  %s\n" % (sha256_file(os.path.join(target, f)), f) for f in files))
    print("    sha256sums.txt (%d files)" % len(files))

    # ---- 6. the parent must be untouched ---------------------------------
    after = {p: sha256_file(os.path.join(parent, p)) for p in walk(parent)}
    if after != before:
        raise SystemExit("FAIL: the parent release changed. That must never happen.")
    print("\n  %s unchanged (%d files, byte-for-byte)" % (parent_id, len(after)))
    build_ok["done"] = True
    print("\nBuilt %s" % release_id)
    print("  unhappy with it? python release_builder.py --from %s --cartridge <other>"
          % parent_id)
    return 0


# --------------------------------------------------------------------- check

def cmd_check(release_id):
    target = os.path.join(RELEASES, release_id)
    if not os.path.isdir(target):
        raise SystemExit("no such release: %s" % target)
    print("Checking %s\n" % release_id)
    ok = True

    listed = {}
    for line in io.open(os.path.join(target, "sha256sums.txt"), encoding="utf-8"):
        digest, name = line.rstrip("\n").split("  ", 1)
        listed[name] = digest
    actual = {f for f in walk(target) if f != "sha256sums.txt"}
    bad = [n for n, d in listed.items()
           if n in actual and sha256_file(os.path.join(target, n)) != d]
    for label, items in (("unlisted files", sorted(actual - set(listed))),
                         ("listed but absent", sorted(set(listed) - actual)),
                         ("digest mismatch", bad)):
        print("  [%s] %-20s %s" % ("PASS" if not items else "FAIL", label,
                                   "none" if not items else items[:4]))
        ok &= not items

    reg = json.loads(read(os.path.join(target, REGISTRY)))
    idx = read(os.path.join(target, "index.html"))
    app = read(os.path.join(target, APP))
    for key, entry in sorted((reg.get("supplemental_assets") or {}).items()):
        for kind in ("cartridge", "payload"):
            node = entry.get(kind)
            if not node or "path" not in node:
                continue
            p = os.path.join(target, node["path"])
            good = os.path.exists(p) and sha256_file(p) == node.get("sha256")
            print("  [%s] %s.%s digest" % ("PASS" if good else "FAIL", key, kind))
            ok &= good
        host = entry.get("host_id")
        if host:
            present = ('id="%s"' % host) in idx
            print("  [%s] %s host present in UI" % ("PASS" if present else "FAIL", key))
            ok &= present
        bind = entry.get("bind_call")
        if bind:
            wired = bind in app
            print("  [%s] %s loader wired in boot()" % ("PASS" if wired else "FAIL", key))
            ok &= wired
    print()
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--list", action="store_true", help="show rollback points and cartridges")
    ap.add_argument("--from", dest="parent", help="parent release id to build from")
    ap.add_argument("--cartridge", help="cartridge package name under cartridges/")
    ap.add_argument("--gen", help="12-digit generation (default: current UTC minute)")
    ap.add_argument("--atlas-target", choices=["legacy", "ported"],
                    help="record which atlas this release points at")
    ap.add_argument("--check", help="verify an existing release")
    a = ap.parse_args()

    if a.list:
        return cmd_list()
    if a.check:
        return cmd_check(a.check)
    if a.parent and a.cartridge:
        return cmd_build(a.parent, a.cartridge, a.gen or utc_stamp(), a.atlas_target)
    ap.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
