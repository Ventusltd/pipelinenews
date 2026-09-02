"""Generate cartridge.json: a rating is per season, and the season is named.

WHAT WAS CHECKED FIRST
----------------------
Whether Pipeline News quotes any MVA rating at all. It does not. A
case-insensitive search of every .html, .mjs and .css file in the parent
release 202608312339-pipelinenews for MVA, rating, season, winter and summer
finds one hit, and it is the word "corroborating" in
assets/202608311343-project-intelligence.mjs. The GRID and SUB chips quote
kilometres and kilovolts; the grid proximity panel quotes kilometres,
kilovolts and MW of the project itself. No surface quotes a circuit rating,
so there is no unseasoned rating to season. The second branch of the task
applies: the strip states that the ratings shown in the Atlas are per season
and never summed.

WHY THE SEASON MATTERS
----------------------
Read on 2 September 2026 from Ventusltd/data-grid-gb
derived/gb-transmission-network.v1.json, whose 1,392 circuits each carry
winter_mva, spring_mva, summer_mva and autumn_mva:

    circuits publishing winter_mva     1,392 of 1,392
    circuits publishing spring_mva     1,391
    circuits publishing summer_mva     1,276
    circuits publishing autumn_mva     1,276
    summer differs from winter         1,081 of the 1,276 that publish both
    winter >= summer                   1,273 of those 1,276

A rating quoted without its season is therefore ambiguous on most of the
network, and winter is the generous one. The Atlas shows every season the
operator publishes and names it; it does not add a site's circuit ratings
together, because that sum is not a quantity that exists in the network.

The strip already refuses headroom - "not a cable route, and not headroom"
- and that refusal is kept verbatim. This clause says something narrower:
what a rating IS when the reader sees one in the Atlas, so that no reader
carries a winter figure into a summer question, or a total into anything.

This cartridge changes one string in one file. It adds no payload, makes no
network call at render time, and touches no other surface.

    python tools/intelligence/cartridges/season-is-named/make_cartridge.py \
        --parent 202608312339-pipelinenews
"""

import argparse
import io
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
RELEASES = os.path.join(REPO, "releases")
APP = "assets/202608291447-app.mjs"


def read(path):
    return io.open(path, encoding="utf-8", newline="").read()


def anchor(text, needle, label):
    """A repair is an exact substitution, so the anchor must be unique.

    Asserting the count here rather than at build time means a parent whose
    text has moved fails while the cartridge is being written, with a name
    attached, instead of failing inside the builder with a diff.
    """
    n = text.count(needle)
    if n != 1:
        raise SystemExit("anchor %r occurs %d times, expected 1" % (label, n))
    return needle


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parent", default="202608312339-pipelinenews")
    args = ap.parse_args()

    parent = os.path.join(RELEASES, args.parent)
    if not os.path.isdir(parent):
        raise SystemExit("no such release: %s" % parent)
    app = read(os.path.join(parent, APP))

    # The literal source bytes, including the · escape as it is written
    # in the file rather than the middle dot it denotes. This is the end of
    # the strip's count clause, immediately before the refusal; the cartridge
    # that extends the refusal anchors on the refusal itself, so the two are
    # independent and can be applied in either order.
    count_clause = "within 2 km of a circuit \\u00b7 "
    anchor(app, count_clause, "the GRID + SUB strip's count clause")

    added = ("no MVA rating is quoted here; the ratings the Atlas shows are "
             "per season, named, and never summed \\u2014 NESO publishes a "
             "winter rating for all 1,392 circuits and a summer rating for "
             "1,276, and summer differs from winter on 1,081 of those "
             "\\u00b7 ")

    cartridge = {
        "key": "season_is_named",
        "summary": (
            "Pipeline News quotes no MVA rating. The GRID + SUB strip now "
            "says so, and says that the ratings the Atlas shows are per "
            "season, named, and never summed, with NESO's own counts of "
            "which circuits publish which season."
        ),
        "modifies_existing_dashboard": True,
        "modification_note": "Extends one strip caption. No payload, no render-time network call.",
        "repairs": {
            "app": [
                {
                    "label": "the strip names the season a rating belongs to, without dropping a caveat",
                    "from": count_clause,
                    "to": count_clause + added,
                }
            ]
        },
        "registry_entry": {
            "schema": "pipelinenews.season-is-named.v1",
            "generation": "{GEN}",
            "usage_context": "NON_COMMERCIAL_OPEN_SOURCE",
            "usage_context_establishes_upstream_rights": False,
            "activation": "render-time; no payload",
            "additive_only": False,
            "mutates_existing_dashboard": "extends the GRID + SUB strip caption",
            "network_at_runtime": False,
            "rule": (
                "A rating without its season is ambiguous: NESO publishes a "
                "summer rating on 1,276 of 1,392 circuits and it differs "
                "from winter on 1,081 of them. Every rating the Atlas shows "
                "names its season and none is summed across circuits. A "
                "rating is still not headroom, and the strip's refusal on "
                "that point is kept verbatim. Pipeline News itself quotes "
                "no MVA figure and now says so."
            ),
            "found_by": (
                "Searching every .html, .mjs and .css file in the parent "
                "release for MVA, rating, season, winter and summer: one "
                "hit, the word 'corroborating'. Then reading the four "
                "seasonal fields on every circuit in Ventusltd/data-grid-gb "
                "derived/gb-transmission-network.v1.json on 2 September "
                "2026 and counting which are published and where they "
                "differ."
            ),
            "upstream": (
                "NESO Electricity Ten Year Statement 2025, Appendix B, via "
                "Ventusltd/data-grid-gb derived/gb-transmission-network.v1.json "
                "(circuits[].winter_mva, spring_mva, summer_mva, autumn_mva)"
            ),
        },
    }

    out = os.path.join(HERE, "cartridge.json")
    io.open(out, "w", encoding="utf-8", newline="\n").write(
        json.dumps(cartridge, indent=2, ensure_ascii=False) + "\n")
    print("wrote %s (parent %s)" % (out, args.parent))


if __name__ == "__main__":
    main()
