"""Generate cartridge.json: clean the newspaper, and the sector panel.

TWO SURFACES, ONE CAUSE
-----------------------
Both were showing whatever a collector returned, without asking whether it was
about the thing it was filed under.

THE NEWSPAPER. 136 headlines, all displayed. The payload already marked 89 as
unbound -- role DISCOVERY_ONLY, canonical_relevant false. Those rows carry an
EMPTY repd_ref, yet each was printed under a project name taken from elsewhere,
so the page said a New Jersey storage consultation was an update on Wilton
International, and that a care home award belonged to The Grange solar farm.

Two kinds of story earn a place now, and they are not the same kind. BOUND:
the register ties it to a project, and it keeps its caption. SECTOR: it is
about solar, storage, grid, an inverter, a data centre or a named capacity,
anywhere in the world -- real trade news, no caption, because no project has
been established for it. Eight stories match neither: two care homes that
collided on a project name, a ring road and a port.

THE SECTOR PANEL. Seven topics, 51 items, and the collector returned a generic
government feed for six of them:

    DATA_CENTRES              9 of 9 on topic
    GREAT_GRID_UPGRADE        1 of 6
    INVERTER_SECURITY_POLICY  2 of 12
    MV_HV_COMPONENTS          0 of 6
    WORLDWIDE_PV              0 of 6
    ENERGY_SECURITY_HORMUZ    0 of 6
    ENERGY_SECURITY_UKRAINE   0 of 6

"Biometrics and Surveillance Camera Commissioner FOI responses 2026" appears
under five different topics. So does "The economic benefits of touring and
impact of EU exit". Under INVERTERS · SECURITY sat a cleared fly-tipping site
in Kidlington, Scottish military firing times and a statement on Syria.

That is not something an item filter fixes. Six topics have no intelligence in
them, and filtering items would leave six near-empty sections still claiming to
cover a subject. Only DATA_CENTRES is shown; the panel says the rest are
withheld and why, and their rows stay in the payload so a fixed collector can
restore them without another release here.

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
    idx = read(os.path.join(parent, "index.html"))
    app = read(os.path.join(parent, APP))
    registry = json.loads(read(os.path.join(parent, "data/202608291447-registry.json")))
    old_sector = registry["supplemental_assets"]["sector_intelligence"]

    ri, ra = [], []

    # ---- the newspaper --------------------------------------------------
    ra.append({
        "label": "keep project-bound and sector-relevant stories, drop the rest",
        "from": anchor(app, "    newsRows = payload.rows;", "news ingest"),
        "to": r"""    // BOUND keeps its caption; SECTOR is real trade news with no project
    // established, so it carries none. Everything else goes.
    //
    // The sector test reads the headline, which is an inference and is treated
    // as one: it decides what to SHOW, and is never used to claim a story is
    // about a project.
    const NEWS_SECTOR = /\b(solar|pv|photovolta|battery|bess|storage|ldes|grid|inverter|substation|transmission|curtail|ppa|renewab|wind|electrolys|interconnector|flexibilit|flexitricity|energy hub|energy park|power plant|megawatt|data ?centres?|datacentres?|data ?centers?)\b/i;
    const NEWS_CAPACITY = /\b\d[\d,.]*\s?(mw|mwh|gw|gwh|kw)\b/i;
    const NEWS_OFFTOPIC = /\b(care home|care centre|care award|ring road|dibden|solent gateway)\b/i;
    // Engineering and business only. Geopolitics is somebody else's page.
    const NEWS_NEUTRAL = /\b(iran|ukraine|russia|israel|gaza|war|sanction|missile|conflict)\b/i;

    const newsBound = (row) =>
      row[NEWS_FIELD.eligible] === true
      && row[NEWS_FIELD.canonical] === true
      && String(row[NEWS_FIELD.role] || "") === "PRIMARY_MATCH"
      && String(row[NEWS_FIELD.repdRef] || "").trim() !== "";

    const newsSector = (row) => {
      const headline = String(row[NEWS_FIELD.headline] || "");
      if (NEWS_OFFTOPIC.test(headline) || NEWS_NEUTRAL.test(headline)) return false;
      return NEWS_SECTOR.test(headline) || NEWS_CAPACITY.test(headline);
    };

    const allNews = payload.rows;
    newsRows = allNews.filter((row) => newsBound(row) || newsSector(row));
    runtimeEvidence.newsBound = allNews.filter(newsBound).length;
    runtimeEvidence.newsSector = newsRows.length - runtimeEvidence.newsBound;
    runtimeEvidence.newsDropped = allNews.length - newsRows.length;"""})

    ra.append({
        "label": "the meta line counts bound, sector and withheld",
        "from": anchor(
            app,
            '    document.getElementById("newsMeta").textContent = `${registry.news_counts.uk} UK · ${registry.news_counts.international} international (${registry.news_counts.us} US · ${registry.news_counts.europe} Europe · ${registry.news_counts.other} other) · ${registry.news_counts.all} headlines · immutable compact edition`;',
            "news meta"),
        "to": r"""    document.getElementById("newsMeta").textContent =
      `${runtimeEvidence.newsBound.toLocaleString("en-GB")} bound to a REPD project · `
      + `${runtimeEvidence.newsSector.toLocaleString("en-GB")} sector headlines, no project binding · `
      + `${runtimeEvidence.newsDropped.toLocaleString("en-GB")} withheld as off-topic · immutable compact edition`;"""})

    ra.append({
        "label": "no project caption without a REPD reference",
        "from": anchor(app, '  const projectName = row[NEWS_FIELD.project] || "";',
                       "project caption"),
        "to": """  // With no repd_ref there is no project this story is about, so it must not
  // carry one. This is what captioned a New Jersey storage story "Wilton
  // International, Greystones Road".
  const projectName = String(row[NEWS_FIELD.repdRef] || "").trim()
    ? (row[NEWS_FIELD.project] || "")
    : "";"""})

    for mode in ("INTERNATIONAL", "US", "EUROPE"):
        needle = '<button data-news="%s">%s</button>' % (mode, mode)
        ri.append({"label": "remove the %s filter; its stories now sit in one list" % mode,
                   "from": anchor(idx, needle, "%s button" % mode), "to": ""})

    entry = json.loads(json.dumps(old_sector))
    entry["generation"] = "{GEN}"
    entry["cartridge"] = dict(entry["cartridge"],
                              generation="{GEN}",
                              filename="{GEN}-sector-intelligence.mjs",
                              path="assets/{GEN}-sector-intelligence.mjs",
                              sha256="", bytes=0)
    entry["topics_shown"] = ["DATA_CENTRES"]
    entry["topics_withheld"] = {
        "GREAT_GRID_UPGRADE": "1 of 6 items on topic",
        "INVERTER_SECURITY_POLICY": "2 of 12 items on topic",
        "MV_HV_COMPONENTS": "0 of 6",
        "WORLDWIDE_PV": "0 of 6",
        "ENERGY_SECURITY_HORMUZ": "0 of 6, and geopolitical",
        "ENERGY_SECURITY_UKRAINE": "0 of 6, and geopolitical",
    }
    entry["why_withheld"] = (
        "The collector returned a generic government feed for six of seven "
        "topics. One item, a Biometrics Commissioner FOI response, appears "
        "under five different topics. The rows remain in the payload so a fixed "
        "collector restores the topics without another release here.")

    # A cartridge may not overwrite an existing registry key, and it should not:
    # the old entry is what the previous release attested. So the corrected
    # module is registered under its own key and the app is repointed at it.
    ra.append({
        "label": "read the sector panel from the corrected registry entry",
        "from": anchor(app, "  const entry = registry.supplemental_assets?.sector_intelligence;",
                       "sector registry lookup"),
        "to": """  const entry = registry.supplemental_assets?.sector_intelligence_clean
    || registry.supplemental_assets?.sector_intelligence;"""})

    man = {
        "key": "sector_intelligence_clean",
        "summary": ("Newspaper shows only project-bound and sector-relevant "
                    "headlines; the sector panel shows only the one topic whose "
                    "items are actually on topic."),
        "modifies_existing_dashboard": True,
        "modification_note": ("Filters the news payload at ingest, removes the "
                              "project caption for unbound stories, deletes three "
                              "geography filters, and replaces the sector "
                              "intelligence module with one that shows only "
                              "DATA_CENTRES and states what is withheld."),
        "repairs": {"index.html": ri, "app": ra},
        "hash_fields": [
            {"at": ["cartridge", "sha256"], "path": "assets/{GEN}-sector-intelligence.mjs"},
        ],
        "registry_entry": entry,
    }

    out = os.path.join(HERE, "cartridge.json")
    io.open(out, "w", encoding="utf-8", newline="").write(
        json.dumps(man, ensure_ascii=False, indent=2) + "\n")
    print("wrote cartridge.json")
    print("  index.html repairs  %d" % len(ri))
    print("  app.mjs repairs     %d" % len(ra))
    print("  sector module replaced, topics shown: DATA_CENTRES")
    return 0


if __name__ == "__main__":
    sys.exit(main())
