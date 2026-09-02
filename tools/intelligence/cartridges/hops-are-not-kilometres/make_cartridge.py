"""Generate cartridge.json: a kilometre is not a connection.

The grid proximity panel's CONNECT view is headed AUTO-DRAWN CONNECTIONS and
explains, correctly, what its two lines per project are: the site to the
nearest point on the nearest circuit, and the site to the nearest mapped
substation, measured as straight lines. Every caveat it carries is right and
stays. But the view is called CONNECTIONS, its lines have a length in
kilometres, and nothing on it says that the kilometre is a different
quantity from the thing that decides whether two sites are joined at all.

On 1 September 2026 the Atlas gained electrical distance measured in
published circuits: for a declared site, how many circuits away each
neighbouring site is, on the network NESO publishes. That is not a shorter
kilometre; it is a different question. Two sites a few kilometres apart can
share no circuit. The two ends of one circuit can be a long way apart: read
on 2 September 2026 from Ventusltd/data-grid-gb
derived/gb-transmission-network.v1.json, the longest circuit NESO publishes
is PEMB41 to WALH41 at 223.195 km of route (ohl_km + cable_km), and 17 of
the 1,392 circuits publish more than 100 km of route. Those are the
published route lengths, not straight lines between the ends, and they are
the only lengths this docstring cites.

So the CONNECT caption gains one clause: a kilometre is not a connection,
and MAP is where the count of published circuits is reported. The panel
keeps reporting exactly what it reported - straight-line kilometres - and
keeps every word it already said about them.

Nothing here grades a distance and nothing here claims capacity, headroom or
availability; a circuit count says whether sites are joined on the published
network, not what could flow between them.

This cartridge changes one string in one file. It adds no payload, makes no
network call at render time, and touches no other surface.

    python tools/intelligence/cartridges/hops-are-not-kilometres/make_cartridge.py \
        --parent 202608312339-pipelinenews
"""

import argparse
import io
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
RELEASES = os.path.join(REPO, "releases")
PROX = "assets/202608311610-grid-proximity.mjs"


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
    prox = read(os.path.join(parent, PROX))

    # The last sentence the CONNECT caption writes in its own words before it
    # hands over to the payload's substation caveat. Plain text inside a
    # template literal, no escapes.
    perpendicular = ("The circuit point is a true perpendicular onto the line, "
                     "not the nearest drawn vertex.")
    anchor(prox, perpendicular, "the CONNECT caption's perpendicular sentence")

    added = ("\n        A kilometre is not a connection: two sites a few kilometres "
             "apart can share no published circuit, and the two ends of one "
             "published circuit can be over 200 km of route apart. This panel "
             "reports straight-line kilometres only; MAP reports the count of "
             "published circuits between the declared site and its neighbours.")

    cartridge = {
        "key": "hops_are_not_kilometres",
        "summary": (
            "The grid proximity panel's CONNECT caption says that a kilometre "
            "is not a connection and that MAP reports the count of published "
            "circuits between sites. Every existing caveat is kept."
        ),
        "modifies_existing_dashboard": True,
        "modification_note": "Extends one caption in the grid proximity module. No payload, no render-time network call.",
        "repairs": {
            "assets": [
                {
                    "path": PROX,
                    "edits": [
                        {
                            "label": "the CONNECT caption separates kilometres from circuits, without dropping a caveat",
                            "from": perpendicular,
                            "to": perpendicular + added,
                        }
                    ],
                }
            ]
        },
        "registry_entry": {
            "schema": "pipelinenews.hops-are-not-kilometres.v1",
            "generation": "{GEN}",
            "usage_context": "NON_COMMERCIAL_OPEN_SOURCE",
            "usage_context_establishes_upstream_rights": False,
            "activation": "render-time; no payload",
            "additive_only": False,
            "mutates_existing_dashboard": "extends the grid proximity CONNECT caption",
            "network_at_runtime": False,
            "rule": (
                "A straight-line kilometre and a count of published circuits "
                "are different quantities and neither is a cable route, a "
                "connection length, a grade or headroom. The panel reports "
                "the kilometre and says so; the circuit count is reported "
                "where it is measured, in MAP. The only length cited is a "
                "published route length: the longest circuit in NESO's "
                "Appendix B is 223.195 km of route."
            ),
            "found_by": (
                "Reading the CONNECT view after the Atlas gained circuit-count "
                "distance on 1 September 2026. The view is titled "
                "AUTO-DRAWN CONNECTIONS, draws lines with lengths, and "
                "nowhere said that length in kilometres is not the quantity "
                "that decides whether two sites are joined. The route "
                "lengths were read from circuits[].ohl_km and cable_km in "
                "Ventusltd/data-grid-gb derived/gb-transmission-network.v1.json "
                "on 2 September 2026."
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
