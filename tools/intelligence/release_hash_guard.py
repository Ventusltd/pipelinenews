"""No truncation of previous work: every existing release byte must survive.

    python release_hash_guard.py --snapshot before.sha256
    ... build a release ...
    python release_hash_guard.py --verify before.sha256 --allow-new 202611132345-pipelinenews

--snapshot writes `sha256  path` for every file under releases/. --verify
recomputes them and fails if any recorded file changed or disappeared, or if
a file appeared anywhere other than inside the --allow-new release folders.
Stdlib only, read-only on releases/.
"""

import argparse
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def tree(root):
    out = {}
    base = os.path.join(root, "releases")
    for d, _dirs, names in os.walk(base):
        for n in names:
            full = os.path.join(d, n)
            out[os.path.relpath(full, root).replace(os.sep, "/")] = digest(full)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=REPO)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--snapshot")
    g.add_argument("--verify")
    ap.add_argument("--allow-new", action="append", default=[])
    a = ap.parse_args(argv)
    now = tree(a.repo)
    if a.snapshot:
        with open(a.snapshot, "w", encoding="utf-8", newline="\n") as fh:
            for path in sorted(now):
                fh.write("%s  %s\n" % (now[path], path))
        print("snapshot: %d files" % len(now))
        return 0
    before = {}
    with open(a.verify, encoding="utf-8") as fh:
        for line in fh:
            d, p = line.rstrip("\n").split("  ", 1)
            before[p] = d
    allowed = tuple("releases/%s/" % r for r in a.allow_new)
    changed = sorted(p for p in before if p in now and now[p] != before[p])
    missing = sorted(p for p in before if p not in now)
    added = sorted(p for p in now if p not in before)
    stray = [p for p in added if not p.startswith(allowed)]
    for label, items in (("changed", changed), ("missing", missing), ("unexpected new", stray)):
        print("  [%s] %-15s %s" % ("PASS" if not items else "FAIL", label,
                                   "none" if not items else items[:5]))
    print("  %d recorded files verified, %d new files inside %s"
          % (len(before) - len(changed) - len(missing), len(added) - len(stray), list(a.allow_new) or "-"))
    return 1 if (changed or missing or stray) else 0


if __name__ == "__main__":
    sys.exit(main())
