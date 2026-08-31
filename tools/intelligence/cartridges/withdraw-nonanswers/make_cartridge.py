"""Withdraw two intelligence panels that answer no defensible user question.

Relationship Evidence contains three ABSTAIN/NO-join rows. Project Intelligence
mixes window position, planning state, construction state and missing-data
states under "where to look first". Neither helps a user decide anything, and
both were explicitly rejected in the live UI review.

The immutable assets remain registered for provenance. This cartridge removes
their launch surfaces and boot bindings, corrects the 132/136 headline copy,
and makes the one retained Sector topic explicit.
"""

import argparse
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
RELEASES = os.path.join(REPO, "releases")
APP = "assets/202608291447-app.mjs"
SECTOR = "assets/202608312109-sector-intelligence.mjs"


def read(path):
    # release_builder normalises the copied release to the LF bytes GitHub
    # Pages serves before it applies repairs. Generate anchors against those
    # bytes, not against a Windows checkout's CRLF working copy.
    return io.open(path, encoding="utf-8", newline="").read().replace("\r\n", "\n")


def once(text, needle, label):
    count = text.count(needle)
    if count != 1:
        raise SystemExit("anchor %r occurs %d times, expected 1" % (label, count))
    return needle


def section(text, labelled_by):
    start_marker = (
        '    <section class="meta sector-intelligence-launch" '
        'aria-labelledby="%s">' % labelled_by)
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit("section %s not found" % labelled_by)
    end_marker = "\n    </section>"
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit("section %s has no close" % labelled_by)
    return text[start:end + len(end_marker)]


def line_containing(text, needle, label):
    matches = [line for line in text.splitlines() if needle in line]
    if len(matches) != 1:
        raise SystemExit("line %r occurs %d times, expected 1" % (label, len(matches)))
    return matches[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parent", default="202608312212-pipelinenews")
    args = parser.parse_args()
    parent = os.path.join(RELEASES, args.parent)
    index = read(os.path.join(parent, "index.html"))
    app = read(os.path.join(parent, APP))
    sector = read(os.path.join(parent, SECTOR))

    status_line = line_containing(index, '136 HEADLINES', "static headline total")
    release_meta_line = line_containing(
        app,
        'document.getElementById("releaseMeta").textContent =',
        "runtime release meta")

    manifest = {
        "key": "withdraw_nonanswers",
        "summary": (
            "Withdraws Relationship and Project Intelligence non-answers and "
            "makes the visible news and Sector counts truthful."),
        "modifies_existing_dashboard": True,
        "modification_note": (
            "Removes two rejected launch surfaces and their boot bindings; "
            "reports 132 shown headlines, four withheld, and one evidenced "
            "Sector topic without claiming the old payload was deleted."),
        "registry_repairs": [
            {
                "key": "relationship_governance_status",
                "set": {
                    "ui_state": "WITHDRAWN",
                    "ui_withdrawal_reason": (
                        "Three rows all abstain and assert no join; retained as "
                        "provenance, not exposed as product intelligence."),
                },
            },
            {
                "key": "project_intelligence",
                "set": {
                    "ui_state": "WITHDRAWN",
                    "ui_withdrawal_reason": (
                        "The projection mixes incompatible lifecycle and "
                        "missing-data taxonomies; retained for audit only."),
                },
            },
        ],
        "repairs": {
            "index.html": [
                {
                    "label": "masthead reports the edition actually shown",
                    "from": status_line,
                    "to": ('      <div class="status">● 132 SHOWN · 47 PROJECT-BOUND '
                           '· 85 SECTOR · 4 WITHHELD · FULL ≥1 MW</div>'),
                },
                {
                    "label": "sector copy no longer repeats the stale 136 total",
                    "from": once(
                        index,
                        "The generic 136-headline newspaper remains separate and unchanged.",
                        "sector stale headline total"),
                    "to": "The filtered news edition remains separate and cannot create project identity.",
                },
                {
                    "label": "withdraw relationship abstention ledger from the product UI",
                    "from": section(index, "federatedRelationshipHeading"),
                    "to": "",
                },
                {
                    "label": "withdraw project-intelligence mixed taxonomy from the product UI",
                    "from": section(index, "projectIntelHeading"),
                    "to": "",
                },
            ],
            "app": [
                {
                    "label": "sector launcher reports one evidenced topic",
                    "from": once(
                        app,
                        'meta.textContent = "WAIT · seven topics · choose one to request the compact Parquet-derived payload";',
                        "seven-topic sector meta"),
                    "to": ('meta.textContent = "WAIT · one evidenced topic · choose it to request '
                           'the compact Parquet-derived payload";'),
                },
                {
                    "label": "do not bind the withdrawn relationship non-answer",
                    "from": once(app, "  bindFederatedRelationships();", "relationship boot binding"),
                    "to": "  // Relationship abstention ledger withdrawn from the product UI.",
                },
                {
                    "label": "do not bind the withdrawn project mixed taxonomy",
                    "from": once(app, "  bindProjectIntelligence();", "project-intelligence boot binding"),
                    "to": "  // Project mixed-taxonomy panel withdrawn from the product UI.",
                },
                {
                    "label": "release meta names only the retained visible surfaces",
                    "from": release_meta_line,
                    "to": ('  document.getElementById("releaseMeta").textContent = '
                           '`Live News + evidenced sector intelligence + Atlas V9 deep-link successor '
                           '· 132 shown headlines · 4 withheld off-topic · ${rows.length.toLocaleString("en-GB")} '
                           'canonical projects · ${registry.performance.maximum_physical_project_rows} physical rows '
                           '· TIMESTAMPED RELEASE · POINTER-CONTROLLED`;'),
                },
            ],
            "assets": [
                {
                    "path": SECTOR,
                    "edits": [
                        {
                            "label": "sector module describes the filtered edition",
                            "from": once(
                                sector,
                                "Sector context is separate from the 136-headline newspaper and cannot create or alter REPD project identity.",
                                "sector module stale headline total"),
                            "to": "Sector context is separate from the filtered news edition and cannot create or alter REPD project identity.",
                        }
                    ],
                }
            ],
        },
    }

    output = os.path.join(HERE, "cartridge.json")
    io.open(output, "w", encoding="utf-8", newline="").write(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print("wrote cartridge.json: two panels withdrawn; counts and Sector copy repaired")
    return 0


if __name__ == "__main__":
    sys.exit(main())
