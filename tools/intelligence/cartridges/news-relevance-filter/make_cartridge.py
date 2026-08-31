"""Generate cartridge.json: show only stories that are actually about a project.

WHAT WAS WRONG
--------------
The newspaper shipped 136 headlines and displayed all of them. The payload
already classified 89 of those as not relevant -- role DISCOVERY_ONLY,
canonical_relevant false, eligible_for_news_signal false -- and 19 of them as
explicitly not in the UK. They were rendered anyway.

Worse than clutter, each one was captioned with a project. Those rows carry an
EMPTY repd_ref, so the caption came from a nearby row rather than from the
story, and the page told a reader:

  "New Jersey Board of Public Utilities releases 150MW BTM energy storage
   proposal"  ->  Wilton International, Greystones Road
  "AER says battery storage is reshaping Australia's NEM"
                 ->  Longhedge Solar Farm, 49.9 MW
  "The Grange celebrates Forest Healthcare's National Care Award"
                 ->  The Grange, 49.9 MW

The last is a name collision with a care home. A reader scanning headlines sees
a UK project name under a story that has nothing to do with it, which is not
noise -- it is a false statement about a named scheme.

THE FIX
-------
The classification is already in the payload, so nothing is inferred here. A
story is kept only when the register says it is bound to a project:
eligible_for_news_signal true, canonical_relevant true, role PRIMARY_MATCH and
a non-empty repd_ref. Everything else is dropped at ingest, so no view, filter
or pager can surface it.

The project caption is additionally guarded: with no repd_ref there is no
project to name, whatever else is true. Belt and braces, because the caption is
the part that made a wrong story into a wrong claim.

The three geography buttons go with the stories. Their entire content was the
non-UK set; leaving them would leave three controls that can only ever report
finding nothing.

    python make_cartridge.py --parent 202608312037-pipelinenews
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


def read(path):
    return io.open(path, encoding="utf-8", newline="").read()


def anchor(text, needle, label):
    n = text.count(needle)
    if n != 1:
        raise SystemExit("anchor %r occurs %d times, expected 1:\n%s"
                         % (label, n, needle[:200]))
    return needle


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parent", default="202608312037-pipelinenews")
    a = ap.parse_args()

    parent = os.path.join(RELEASES, a.parent)
    if not os.path.isdir(parent):
        raise SystemExit("no such parent release: %s" % parent)
    idx = read(os.path.join(parent, "index.html"))
    app = read(os.path.join(parent, APP))

    ri, ra = [], []

    # ---- the predicate, and the ingest filter ---------------------------
    from_rows = anchor(app, "    newsRows = payload.rows;", "news ingest")
    to_rows = """    // Only stories the register says are bound to a project. All four
    // conditions come from the payload; none is inferred here.
    //
    // Filtering at INGEST rather than in a view is deliberate: the newspaper
    // has a mode filter, a pager and a search, and a story that survives
    // anywhere will eventually be shown somewhere. Dropping it here means no
    // view can surface it.
    const relevantNews = (row) =>
      row[NEWS_FIELD.eligible] === true
      && row[NEWS_FIELD.canonical] === true
      && String(row[NEWS_FIELD.role] || "") === "PRIMARY_MATCH"
      && String(row[NEWS_FIELD.repdRef] || "").trim() !== "";
    const allNews = payload.rows;
    newsRows = allNews.filter(relevantNews);
    runtimeEvidence.newsDropped = allNews.length - newsRows.length;"""
    ra.append({"label": "keep only stories bound to a project",
               "from": from_rows, "to": to_rows})

    # ---- the meta line must describe what is shown ----------------------
    from_meta = anchor(
        app,
        '    document.getElementById("newsMeta").textContent = `${registry.news_counts.uk} UK · ${registry.news_counts.international} international (${registry.news_counts.us} US · ${registry.news_counts.europe} Europe · ${registry.news_counts.other} other) · ${registry.news_counts.all} headlines · immutable compact edition`;',
        "news meta")
    to_meta = """    // Say what is on the page and what was withheld, rather than quoting a
    // headline count the reader can no longer see.
    document.getElementById("newsMeta").textContent =
      `${newsRows.length.toLocaleString("en-GB")} headlines bound to a REPD project · `
      + `${runtimeEvidence.newsDropped.toLocaleString("en-GB")} withheld as unbound `
      + `(no project signal, or not UK) · immutable compact edition`;"""
    ra.append({"label": "the meta line counts what is shown, and what was withheld",
               "from": from_meta, "to": to_meta})

    # ---- never caption a story with a project it is not about -----------
    from_name = anchor(app, '  const projectName = row[NEWS_FIELD.project] || "";',
                       "project caption")
    to_name = """  // With no repd_ref there is no project this story is about, so it must not
  // carry one. This is what turned a New Jersey storage story into a headline
  // captioned "Wilton International, Greystones Road".
  const projectName = String(row[NEWS_FIELD.repdRef] || "").trim()
    ? (row[NEWS_FIELD.project] || "")
    : "";"""
    ra.append({"label": "no project caption without a REPD reference",
               "from": from_name, "to": to_name})

    # ---- the geography buttons go with the stories ----------------------
    for mode in ("INTERNATIONAL", "US", "EUROPE"):
        needle = '<button data-news="%s">%s</button>' % (mode, mode)
        ri.append({"label": "remove the %s filter; its content is gone" % mode,
                   "from": anchor(idx, needle, "%s button" % mode), "to": ""})

    man = {
        "key": "news_relevance_filter",
        "summary": ("Show only headlines the register binds to a project. 89 of "
                    "136 were classified DISCOVERY_ONLY, not canonical and not "
                    "eligible, and were displayed anyway -- each captioned with "
                    "a project it was not about."),
        "modifies_existing_dashboard": True,
        "modification_note": ("This cartridge is NOT panel-only. It filters the "
                              "news payload at ingest, rewrites the newspaper "
                              "meta line, removes the project caption for "
                              "unbound stories and deletes three geography "
                              "filters whose content no longer exists."),
        "repairs": {"index.html": ri, "app": ra},
        "registry_entry": {
            "schema": "pipelinenews.news-relevance-filter.v1",
            "generation": "{GEN}",
            "usage_context": "NON_COMMERCIAL_OPEN_SOURCE",
            "usage_context_establishes_upstream_rights": False,
            "activation": "applied to the news payload at ingest; no payload of its own",
            "additive_only": False,
            "mutates_existing_dashboard": ("filters the newspaper to project-bound "
                                           "stories and removes the geography filters"),
            "network_at_runtime": False,
            "rule": {
                "kept": "eligible_for_news_signal AND canonical_relevant AND "
                        "role == PRIMARY_MATCH AND repd_ref is not empty",
                "source": "every condition is a field already in the news payload; "
                          "nothing is inferred or re-classified here",
                "measured_on_202608312037": {
                    "headlines": 136,
                    "kept": 47,
                    "withheld": 89,
                    "role_discovery_only": 88,
                    "explicitly_non_uk": 19,
                },
            },
            "why_the_caption_mattered": (
                "Withheld rows carry an empty repd_ref but were still printed "
                "under a project name taken from elsewhere, so a New Jersey "
                "storage consultation appeared as an update on Wilton "
                "International and a care-home award appeared under The Grange "
                "solar farm. A wrong story is clutter; a wrong story captioned "
                "with a real scheme is a false statement about that scheme."),
        },
    }

    out = os.path.join(HERE, "cartridge.json")
    io.open(out, "w", encoding="utf-8", newline="").write(
        json.dumps(man, ensure_ascii=False, indent=2) + "\n")
    print("wrote cartridge.json")
    print("  index.html repairs  %d" % len(ri))
    print("  app.mjs repairs     %d" % len(ra))
    print("  every anchor verified unique in %s" % a.parent)
    return 0


if __name__ == "__main__":
    sys.exit(main())
