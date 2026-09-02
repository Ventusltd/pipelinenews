"""Generate cartridge.json: the nearest mapped substation is not the nearest substation.

The GRID + SUB strip says what it measures:

    straight-line km to the nearest mapped circuit and to the nearest
    substation at 33 kV or above

"Mapped" is doing quiet work in that sentence. The SUB figure is the distance
to the nearest point in a layer, and the layer is known to be incomplete. The
product that publishes the layer's transmission end says so itself. In
Ventusltd/data-grid-gb derived/connection-points.v3.json, read on
2 September 2026:

    counts.connection_points   886
    counts.with_location       502
    join.unlocated             384
    join.unlocated_are_published
        "a site nobody has mapped is published without coordinates rather
         than dropped"
    join.why
        "ETYS names substations and does not locate them"

So of the 886 transmission substations NESO names at 132 kV and above, the
Atlas can place 502 on the map and 384 have no coordinates at all. A project
whose true nearest substation is one of the 384 will be shown a distance to
some other, mapped, substation - a larger number than the truth, presented
with two decimal places.

The strip already carries, on hover, "Absence from a mapped layer is not
absence on the ground" (payload.caveat.coverage, from
data/202608311800-grid-distance.json in the parent release). That is the
principle; it has never been given its size. This cartridge adds the size,
with the product's own numbers, in the sentence the reader actually sees,
and keeps every existing word of the strip.

Nothing here grades a distance. Nothing here claims capacity or headroom. The
numbers are the ones published in the file named above and no others.

This cartridge changes one string in one file. It adds no payload, makes no
network call at render time, and touches no other surface.

    python tools/intelligence/cartridges/mapped-is-not-nearest/make_cartridge.py \
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
    # in the file rather than the middle dot it denotes. This clause sits in
    # the middle of the strip, so the cartridges that extend its tail (the
    # refusal) and its count (the "within 2 km" clause) anchor elsewhere and
    # can be applied in any order with this one.
    scope = "to the nearest substation at 33 kV or above \\u00b7 "
    anchor(app, scope, "the GRID + SUB strip's statement of what it measures")

    added = ("nearest mapped is not nearest: of the 886 transmission "
             "substations NESO names at 132 kV and above, the Atlas locates "
             "502 and publishes the other 384 without coordinates rather "
             "than dropping them, so the nearest mapped substation may not "
             "be the nearest substation \\u00b7 ")

    cartridge = {
        "key": "mapped_is_not_nearest",
        "summary": (
            "The GRID + SUB strip states the size of the gap in the mapped "
            "layer: 886 transmission substations named by NESO, 502 located, "
            "384 published without coordinates. The nearest mapped "
            "substation may not be the nearest substation."
        ),
        "modifies_existing_dashboard": True,
        "modification_note": "Extends one strip caption. No payload, no render-time network call.",
        "repairs": {
            "app": [
                {
                    "label": "the strip gives the coverage limit its size, without dropping a caveat",
                    "from": scope,
                    "to": scope + added,
                }
            ]
        },
        "registry_entry": {
            "schema": "pipelinenews.mapped-is-not-nearest.v1",
            "generation": "{GEN}",
            "usage_context": "NON_COMMERCIAL_OPEN_SOURCE",
            "usage_context_establishes_upstream_rights": False,
            "activation": "render-time; no payload",
            "additive_only": False,
            "mutates_existing_dashboard": "extends the GRID + SUB strip caption",
            "network_at_runtime": False,
            "rule": (
                "A distance to the nearest mapped feature is a distance to a "
                "layer, not to the network. Where the layer's own publisher "
                "states its coverage, the strip states it too, in the "
                "publisher's numbers: 886 named, 502 located, 384 without "
                "coordinates. Absence from a mapped layer is not absence on "
                "the ground, and the existing caveats stay verbatim. No "
                "grade, no headroom, no capacity is implied."
            ),
            "found_by": (
                "Reading counts and join in Ventusltd/data-grid-gb "
                "derived/connection-points.v3.json on 2 September 2026 "
                "beside the strip in the parent release. The strip said "
                "'nearest mapped' and the hover said 'absence from a mapped "
                "layer is not absence on the ground'; neither said how much "
                "of the transmission network the layer fails to place, and "
                "the publisher had already counted it."
            ),
            "upstream": (
                "NESO Electricity Ten Year Statement 2025, Appendix B, joined "
                "to OpenStreetMap-derived substation geometry via "
                "Ventusltd/data-grid-gb derived/connection-points.v3.json "
                "(counts.connection_points 886, counts.with_location 502, "
                "join.unlocated 384)"
            ),
        },
    }

    out = os.path.join(HERE, "cartridge.json")
    io.open(out, "w", encoding="utf-8", newline="\n").write(
        json.dumps(cartridge, indent=2, ensure_ascii=False) + "\n")
    print("wrote %s (parent %s)" % (out, args.parent))


if __name__ == "__main__":
    main()
