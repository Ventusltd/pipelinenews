"""Repair Sector Intelligence identity and the remaining distance verdict.

The clean sector module is new code over the immutable 202608272130 payload.
Its one GENERATION constant was used for both identities, so the registry's
202608312109 module contract could not match the 202608272130 payload at the
same time. The browser rejects it before mount.

This repair separates module and payload generations. It also removes the last
connection-quality claim from the distance sorter: "best-connected" becomes a
literal description of the ordering.
"""

import argparse
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
RELEASES = os.path.join(REPO, "releases")
SECTOR = "assets/202608312109-sector-intelligence.mjs"
PROXIMITY = "assets/202608311610-grid-proximity.mjs"


def read(path):
    return io.open(path, encoding="utf-8", newline="").read()


def one(text, needle, label):
    count = text.count(needle)
    if count != 1:
        raise SystemExit("anchor %r occurs %d times, expected 1" % (label, count))
    return needle


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parent", default="202608312202-pipelinenews")
    args = parser.parse_args()
    parent = os.path.join(RELEASES, args.parent)
    sector = read(os.path.join(parent, SECTOR))
    proximity = read(os.path.join(parent, PROXIMITY))

    module_identity = (
        '// This module is a new cartridge over the immutable 202608272130 payload.\n'
        '// The two identities must not be collapsed into one constant.\n'
        'const GENERATION = "202608312109";\n'
        'const PAYLOAD_GENERATION = "202608272130";')

    manifest = {
        "key": "sector_open_neutral_sort",
        "summary": (
            "Sector Intelligence opens with separate module/payload identity; "
            "grid distance sorting makes no connection-quality claim."),
        "modifies_existing_dashboard": True,
        "modification_note": (
            "Separates the 202608312109 clean module contract from its immutable "
            "202608272130 payload identity and replaces best-connected with a "
            "literal shortest-distance ordering description."),
        "repairs": {
            "assets": [
                {
                    "path": SECTOR,
                    "edits": [
                        {
                            "label": "separate module identity from payload identity",
                            "from": one(
                                sector,
                                'const GENERATION = "202608272130";',
                                "collapsed sector identity"),
                            "to": module_identity,
                        },
                        {
                            "label": "validate the immutable payload against its own generation",
                            "from": one(
                                sector,
                                "payload.generation !== GENERATION",
                                "payload generation check"),
                            "to": "payload.generation !== PAYLOAD_GENERATION",
                        },
                    ],
                },
                {
                    "path": PROXIMITY,
                    "edits": [
                        {
                            "label": "describe the distance ordering without judging connection quality",
                            "from": one(
                                proximity,
                                "sorting by circuit distance puts the best-connected first.",
                                "best-connected claim"),
                            "to": "sorting by mapped circuit distance orders the measurements shortest first.",
                        }
                    ],
                },
            ]
        },
    }

    output = os.path.join(HERE, "cartridge.json")
    io.open(output, "w", encoding="utf-8", newline="").write(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print("wrote cartridge.json")
    print("  sector identity repairs  2")
    print("  proximity copy repairs   1")
    return 0


if __name__ == "__main__":
    sys.exit(main())
