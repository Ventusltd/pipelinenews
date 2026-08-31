"""Generate cartridge.json: report the distance, never grade it.

THE PROBLEM
-----------
GRID and SUB tinted their number by band -- STRONG green, MODERATE yellow,
DISTANT orange, REMOTE red -- and the payload carried those labels through to
the tooltip. That is a verdict on a named project's grid position, and it is
not one this page can stand behind.

A developer may build their own substation. Distance to a mapped asset says
nothing about whether a connection is obtainable, what it costs, or whether
anyone intends to use that asset at all. "REMOTE" on somebody's scheme is an
opinion wearing the clothes of a measurement, and the register it sits beside
is read by people making decisions about those schemes.

THE RULE
--------
Report the measurement and let the maths and the tools do the talking. A
distance, its method and its limits are facts. A grade is not.

WHAT CHANGES
------------
In the table: the four band colours become one neutral colour, and the
data-band attribute stops being emitted, so nothing downstream can style or
read a verdict back out of the DOM.

In the grid proximity dashboard, which the first attempt missed entirely --
the band survived in five places there. The GRID column printed the band as
its whole value, so the column said "strong" where it should say a distance.
Sorting by GRID sorted by the verdict. The readout was headed by it. The
project drawer repeated it. And the drawer announced "Target acquired", which
is targeting language about somebody's site and goes.

The distances, the voltages, the caveats and the working are untouched: this
removes a judgement, not information.

    python make_cartridge.py --parent 202608312114-pipelinenews
"""

import argparse, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
RELEASES = os.path.join(REPO, "releases")
APP = "assets/202608291447-app.mjs"
PROX = "assets/202608311610-grid-proximity.mjs"


def read(p):
    return io.open(p, encoding="utf-8", newline="").read()


def anchor(text, needle, label):
    n = text.count(needle)
    if n != 1:
        raise SystemExit("anchor %r occurs %d times, expected 1:\n%s"
                         % (label, n, needle[:200]))
    return needle


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parent", default="202608312114-pipelinenews")
    a = ap.parse_args()
    parent = os.path.join(RELEASES, a.parent)
    idx = read(os.path.join(parent, "index.html"))
    app = read(os.path.join(parent, APP))
    prox = read(os.path.join(parent, PROX))

    ri, ra, rp = [], [], []

    # ---- the table -----------------------------------------------------
    old_css = (
        '    .action-metric[data-band="STRONG"] b { color: #6fd18a; }\n'
        '    .action-metric[data-band="MODERATE"] b { color: #d8c96a; }\n'
        '    .action-metric[data-band="DISTANT"] b { color: #d89a6a; }\n'
        '    .action-metric[data-band="REMOTE"] b { color: #b06a6a; }')
    new_css = (
        '    /* One colour for every distance. A green-to-red scale grades a named\n'
        '       project\'s grid position, and a developer may build their own\n'
        '       substation: proximity to a mapped asset is not a verdict on the\n'
        '       scheme. Report the measurement, let the tools do the talking. */\n'
        '    .action-metric b { color: #5fbdc2; }')
    ri.append({"label": "one neutral colour for every distance, no green-to-red grade",
               "from": anchor(idx, old_css, "band colours"), "to": new_css})

    # A second green-to-red set, on .grid-cell, with nothing in the release
    # emitting that class any more. Dead rules are not harmless: this one is a
    # working grading scale sitting in the stylesheet, and the next edit that
    # needs a grid cell will find it and use it.
    dead_css = (
        '    .grid-cell[data-band="STRONG"] .km { color: #6fd18a; }\n'
        '    .grid-cell[data-band="MODERATE"] .km { color: #d8c96a; }\n'
        '    .grid-cell[data-band="DISTANT"] .km { color: #d89a6a; }\n'
        '    .grid-cell[data-band="REMOTE"] .km { color: #b06a6a; }')
    ri.append({
        "label": "remove the second, unused green-to-red scale on .grid-cell",
        "from": anchor(idx, dead_css, "grid-cell band colours"),
        "to": ('    /* A second green-to-red scale lived here for .grid-cell, which\n'
               '       nothing emits any more. Removed rather than left: a dead grading\n'
               '       rule is one edit away from being a live one. */')})

    old_attr = '  const band = hit.b ? ` data-band="${escapeHtml(hit.b)}"` : "";'
    new_attr = ('  // No band attribute is emitted, so nothing downstream can style or read\n'
                '  // a verdict back out of the DOM. The distance is the whole claim.\n'
                '  const band = "";')
    ra.append({"label": "stop emitting the band attribute",
               "from": anchor(app, old_attr, "band attribute"), "to": new_attr})

    # ---- the grid proximity dashboard ----------------------------------
    # The GRID column printed the band as its entire value. It becomes the
    # measurement it was standing in front of: the nearest circuit, which is
    # what the working behind the button is about.
    rp.append({
        "label": "GRID reports the nearest circuit, not a verdict on it",
        "from": anchor(prox, """      ["_gp", "GRID", (r) => `<button class="gp-lock" type="button" data-why="${esc(r.ref)}"
        title="show the working">${esc(r.grid_probable.band.toLowerCase())}</button>`],""",
                       "grid column"),
        "to": """      // Was the band -- "strong", "remote" -- as the whole cell. A distance is
      // a measurement and a band is a verdict on somebody's scheme, so the
      // cell now shows the measurement and the working stays one click away.
      ["_gp", "GRID", (r) => `<button class="gp-lock" type="button" data-why="${esc(r.ref)}"
        title="show the working">${r.circuit ? km(r.circuit.km) : "n/a"}</button>`],"""})

    rp.append({
        "label": "sorting by GRID sorts by distance, not by verdict",
        "from": anchor(prox, '        : k === "_gp" ? BAND_RANK[r.grid_probable.band]',
                       "grid sort"),
        "to": '        : k === "_gp" ? (r.circuit ? r.circuit.km : Infinity)'})

    rp.append({
        "label": "the readout is headed by the project, not by a grade",
        "from": anchor(prox, '          box.innerHTML = `<div class="gp-readout"><h4>${esc(r.grid_probable.band)} · ${esc(r.name)}</h4>',
                       "readout heading"),
        "to": '          box.innerHTML = `<div class="gp-readout"><h4>${esc(r.name)}</h4>'})

    rp.append({
        "label": "the drawer states a distance where it stated a grade",
        "from": anchor(prox, '            <dt>GRID</dt><dd>${esc((row.grid_probable && row.grid_probable.band || "").toLowerCase())}</dd>',
                       "drawer band"),
        "to": '            <dt>NEAREST CIRCUIT</dt><dd>${row.circuit ? km(row.circuit.km) + " · " + row.circuit.kv + " kV" : "n/a"}</dd>'})

    rp.append({
        "label": "no targeting language over somebody's site",
        "from": anchor(prox, '          <h4>${t >= 1 ? "Target acquired" : "Acquiring…"}</h4>',
                       "target acquired"),
        "to": '          <h4>${t >= 1 ? "In range" : "Measuring…"}</h4>'})

    # BAND_RANK now has no reader. Leaving a dead verdict table in the source
    # invites the next edit to reach for it.
    rp.append({
        "label": "remove the rank table the verdict was sorted by",
        "from": anchor(prox, 'const BAND_RANK = { STRONG: 0, MODERATE: 1, DISTANT: 2, REMOTE: 3, UNKNOWN: 4 };',
                       "band rank"),
        "to": '/* BAND_RANK is gone with the grading it ordered. Nothing sorts by verdict. */'})

    man = {
        "key": "no_grading",
        "summary": ("Grid proximity reports distances and no longer grades them. "
                    "The green-to-red bands, the data-band attribute, the GRID "
                    "column's verdict and the targeting language are gone."),
        "modifies_existing_dashboard": True,
        "modification_note": (
            "Replaces the four band colours with one neutral colour; stops "
            "emitting data-band; makes the GRID column and its sort the nearest "
            "circuit distance; removes the band from the readout heading and the "
            "project drawer; replaces \"Target acquired\" with \"In range\"; and "
            "deletes BAND_RANK, which no longer has a reader."),
        "repairs": {
            "index.html": ri,
            "app": ra,
            "assets": [{"path": PROX, "edits": rp}],
        },
    }

    out = os.path.join(HERE, "cartridge.json")
    io.open(out, "w", encoding="utf-8", newline="").write(
        json.dumps(man, ensure_ascii=False, indent=2) + "\n")
    print("wrote cartridge.json")
    print("  index.html repairs      %d" % len(ri))
    print("  app.mjs repairs         %d" % len(ra))
    print("  grid-proximity repairs  %d" % len(rp))
    return 0


if __name__ == "__main__":
    sys.exit(main())
