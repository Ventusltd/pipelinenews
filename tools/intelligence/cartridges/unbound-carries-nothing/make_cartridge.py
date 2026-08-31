"""Generate cartridge.json: an unbound story carries no project detail at all.

202608312109 blanked the project NAME when a story had no repd_ref. Looking at
the live page showed that was half a fix: the same template still printed the
capacity, the operator and the county from the same unbound row, so

  "APA to build 104MWh battery storage system for Evolution Mining's Ernest
   Henry operations in Australia"        ->  99.9 MW - EVOLUTION POWER - Kent

  "US utilities Appalachian Power and 3CE launch RFPS seeking BESS capacity in
   Virginia, California"                 ->  49.9 MW - INFINIS SOLAR - Cleveland

An Australian mine story labelled Kent is the same false statement the name fix
was meant to end, wearing different fields. Bind or say nothing: with no
repd_ref there is no project, so there is no capacity, no operator and no county
to report either.

The sector strip also still advertised the withheld topics by name, including
the two geopolitical ones. It now names only what it shows.
"""

import argparse, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
RELEASES = os.path.join(REPO, "releases")
APP = "assets/202608291447-app.mjs"

def read(p): return io.open(p, encoding="utf-8", newline="").read()

def anchor(text, needle, label):
    n = text.count(needle)
    if n != 1:
        raise SystemExit("anchor %r occurs %d times, expected 1" % (label, n))
    return needle

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parent", default="202608312109-pipelinenews")
    a = ap.parse_args()
    parent = os.path.join(RELEASES, a.parent)
    idx = read(os.path.join(parent, "index.html"))
    app = read(os.path.join(parent, APP))

    dot = "·"
    old_caption = ('<p><span class="project">${escapeHtml(projectName)}${capacity ? ` %s '
                   '${capacity.toLocaleString("en-GB")} MW` : ""}</span>'
                   '${row[NEWS_FIELD.operator] ? ` %s ${escapeHtml(row[NEWS_FIELD.operator])}` : ""}'
                   '${row[NEWS_FIELD.county] ? ` %s ${escapeHtml(row[NEWS_FIELD.county])}` : ""}</p>'
                   % (dot, dot, dot))
    new_caption = ('<p>${projectName ? `<span class="project">${escapeHtml(projectName)}'
                   '${capacity ? ` %s ${capacity.toLocaleString("en-GB")} MW` : ""}</span>'
                   '${row[NEWS_FIELD.operator] ? ` %s ${escapeHtml(row[NEWS_FIELD.operator])}` : ""}'
                   '${row[NEWS_FIELD.county] ? ` %s ${escapeHtml(row[NEWS_FIELD.county])}` : ""}` '
                   ': `<span class="news-unbound">sector headline %s no project binding</span>`}</p>'
                   % (dot, dot, dot, dot))

    ra = [{"label": "an unbound story carries no capacity, operator or county either",
           "from": anchor(app, old_caption, "news caption"),
           "to": new_caption}]

    old_strip = ("Data centres %s inverter security/policy %s Strait of Hormuz %s Ukraine "
                 "%s Great Grid Upgrade %s worldwide PV %s MV/HV components." % ((dot,) * 6))
    ri = [{"label": "the strip names only the topic that is shown",
           "from": anchor(idx, old_strip, "sector strip"),
           "to": ("Data centres. Six further topics are withheld: the collector returned a "
                  "generic government feed rather than results on those subjects.")}]

    man = {
        "key": "unbound_carries_nothing",
        "summary": ("An unbound story carries no project name, capacity, operator or "
                    "county. The sector strip names only the topic it shows."),
        "modifies_existing_dashboard": True,
        "modification_note": "Rewrites the newspaper caption and the sector strip text.",
        "repairs": {"index.html": ri, "app": ra},
        "registry_entry": {
            "schema": "pipelinenews.unbound-carries-nothing.v1",
            "generation": "{GEN}",
            "usage_context": "NON_COMMERCIAL_OPEN_SOURCE",
            "usage_context_establishes_upstream_rights": False,
            "activation": "render-time; no payload",
            "additive_only": False,
            "mutates_existing_dashboard": "removes project detail from unbound stories",
            "network_at_runtime": False,
            "rule": ("With no repd_ref there is no project, so no capacity, operator or "
                     "county is reported. Bind or say nothing."),
            "found_by": ("Looking at the rendered page. A DOM read of the caption element "
                         "showed the name was blank and passed; the operator and county sat "
                         "in sibling text and still read 'Kent' under an Australian story."),
        },
    }
    io.open(os.path.join(HERE, "cartridge.json"), "w", encoding="utf-8", newline="").write(
        json.dumps(man, ensure_ascii=False, indent=2) + "\n")
    print("wrote cartridge.json:", len(ri), "index repairs,", len(ra), "app repairs")
    return 0

if __name__ == "__main__":
    sys.exit(main())
