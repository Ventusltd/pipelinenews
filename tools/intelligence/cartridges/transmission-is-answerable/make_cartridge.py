"""Generate cartridge.json: the strip stops ending on what cannot be answered.

The GRID + SUB strip has ended, correctly, on a refusal:

    not a cable route, and not headroom - fault level and thermal headroom
    need DNO network data such as source impedance and a connection study

Every word of that is still true and none of it is removed. But it was the
LAST thing the reader was told, and on 1 September 2026 it stopped being the
whole story. The Atlas now reads NESO's published transmission network
(Electricity Ten Year Statement 2025, Appendix B) and can answer, for the
site a project declares:

  - the circuits and transformers that actually land there, per voltage;
  - their published ratings in every season the operator publishes, never
    added together, because the sum of a site's circuit ratings is not a
    quantity that exists in the network;
  - how many published circuits away a neighbouring site is - which is a
    different question from how many kilometres, and the one that decides
    whether two sites are connected at all;
  - and where this project's own output would flow, on a declared DC model
    that states its equations, its 100 MVA base, its named slack and every
    assumption it makes.

So the strip gains one clause naming what MAP now opens. The refusal keeps
its place: distance is still not a route, a rating is still not headroom,
and the DC model is still not a loading, because what is already flowing on
those circuits is published nowhere.

This cartridge changes one string in one file. It adds no payload, makes no
network call at render time, and touches no other surface.

    python tools/intelligence/cartridges/transmission-is-answerable/make_cartridge.py \
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

    # The literal source bytes, including the — escape as it is written
    # in the file rather than the em dash it denotes.
    tail = ("not a cable route, and not headroom \\u2014 fault level and "
            "thermal headroom need DNO network data such as source impedance "
            "and a connection study")
    anchor(app, tail, "the GRID + SUB refusal")

    added = (" \\u00b7 the published transmission network is now answerable: "
             "MAP opens the circuits that land at the declared site, their "
             "ratings in every season the operator publishes, how many "
             "circuits away its neighbours are, and where this output would "
             "flow on a declared DC model")

    cartridge = {
        "key": "transmission_is_answerable",
        "summary": (
            "The GRID + SUB strip keeps every refusal and stops ending on "
            "one: it names what the Atlas can now answer from NESO's "
            "published transmission network."
        ),
        "modifies_existing_dashboard": True,
        "modification_note": "Extends one strip caption. No payload, no render-time network call.",
        "repairs": {
            "app": [
                {
                    "label": "the strip names what MAP can now answer, without dropping a caveat",
                    "from": tail,
                    "to": tail + added,
                }
            ]
        },
        "registry_entry": {
            "schema": "pipelinenews.transmission-is-answerable.v1",
            "generation": "{GEN}",
            "usage_context": "NON_COMMERCIAL_OPEN_SOURCE",
            "usage_context_establishes_upstream_rights": False,
            "activation": "render-time; no payload",
            "additive_only": False,
            "mutates_existing_dashboard": "extends the GRID + SUB strip caption",
            "network_at_runtime": False,
            "rule": (
                "Distance is not a route and a rating is not headroom - both "
                "refusals are kept verbatim. What is added is only what is "
                "actually answerable from a published source: the circuits "
                "and transformers at the declared site, their seasonal "
                "ratings never summed, the count of circuits to a "
                "neighbouring site, and a declared DC injection response. "
                "The DC model is not a loading: what is already flowing on "
                "those circuits is published nowhere."
            ),
            "found_by": (
                "Reading the strip after the Atlas gained the published "
                "network on 1 September 2026. The sentence was accurate and "
                "had become incomplete: it told the reader what could not be "
                "answered and no longer mentioned what could."
            ),
            "upstream": (
                "NESO Electricity Ten Year Statement 2025, Appendix B, via "
                "Ventusltd/data-grid-gb derived/gb-transmission-network.v1.json"
            ),
        },
    }

    out = os.path.join(HERE, "cartridge.json")
    io.open(out, "w", encoding="utf-8", newline="\n").write(
        json.dumps(cartridge, indent=2, ensure_ascii=False) + "\n")
    print("wrote %s (parent %s)" % (out, args.parent))


if __name__ == "__main__":
    main()
