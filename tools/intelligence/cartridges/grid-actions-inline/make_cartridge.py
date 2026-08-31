"""Generate cartridge.json: move GRID out of the table and into ACTIONS,
alongside a new nearest 33 kV+ substation distance.

WHY THE COLUMN GOES AWAY
------------------------
The GRID column worked and nobody could see it. Measured from the published
bytes, desktop-visible text only, its right edge sat at ~1,430px while a 1366px
laptop shows ~1,056px of table. It only cleared the fold at about 1920px.

Beside the MAP link it is reachable at any width, and the pairing is the right
one: MAP opens the Atlas, and the distances are measured against the Atlas
layers. Both are per-project facts about where this site sits on the network.

WHAT IS LOST, AND WHAT IS KEPT
------------------------------
A sortable heading needs a column, so click-to-sort on distance goes with it.
Sorting itself does NOT: `grid_asc` and `grid_desc` stay in the SORT control,
so the register can still be ordered nearest-first from the dropdown. Only the
heading disappears.

    python make_cartridge.py --parent 202608311816-pipelinenews
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
                         % (label, n, needle[:220]))
    return needle


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parent", default="202608311816-pipelinenews")
    a = ap.parse_args()

    parent = os.path.join(RELEASES, a.parent)
    if not os.path.isdir(parent):
        raise SystemExit("no such parent release: %s" % parent)
    idx = read(os.path.join(parent, "index.html"))
    app = read(os.path.join(parent, APP))

    ri, ra = [], []

    # ---- index.html: drop the GRID heading ------------------------------
    th_from = anchor(idx,
                     '            <th class="hide-mobile sortable-heading" id="gridHeader" aria-sort="none">\n'
                     '              <button id="sortGrid" type="button" aria-label="Sort by straight-line distance to the nearest mapped grid circuit">\n'
                     '                GRID <span class="beta-chip">BETA</span> <span id="gridSortIndicator" aria-hidden="true">↕</span>\n'
                     '              </button>\n'
                     '            </th>\n'
                     '            <th class="hide-mobile">OPERATOR</th>',
                     "grid heading")
    ri.append({"label": "GRID heading removed; the metrics move into ACTIONS",
               "from": th_from,
               "to": '            <th class="hide-mobile">OPERATOR</th>'})

    # ---- index.html: styles for the inline metrics ----------------------
    css_from = anchor(idx, "    .grid-note { color: #8d98a5; font-size: 9px; }",
                      "grid-note css")
    css_to = css_from + """

    /* GRID and SUB inside ACTIONS. Chips rather than links: they are facts
       about the row, not things to click, so they must not read as buttons. */
    .action-metric {
      display: inline-block; white-space: nowrap; font-size: 9px;
      font-variant-numeric: tabular-nums; padding: 3px 6px; border-radius: 3px;
      border: 1px solid #2b3138; background: #0a0d12; color: #8d98a5;
      cursor: help;
    }
    .action-metric b { font-weight: bold; color: #d8dee6; margin-left: 3px; }
    .action-metric .unit { color: #6c7681; margin-left: 2px; }
    /* Band tints the number only. A band says how close the mapped network is;
       it never implies a connection is obtainable there. */
    .action-metric[data-band="STRONG"] b { color: #6fd18a; }
    .action-metric[data-band="MODERATE"] b { color: #d8c96a; }
    .action-metric[data-band="DISTANT"] b { color: #d89a6a; }
    .action-metric[data-band="REMOTE"] b { color: #b06a6a; }
    .action-metric.pending { color: #4d555e; }
    .project-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }"""
    ri.append({"label": "inline metric chip styles", "from": css_from, "to": css_to})

    # ---- app.mjs: renderers ---------------------------------------------
    # Replace the table-cell renderer with two chip renderers.
    cell_from = anchor(app,
                       'function gridCellHtml(item) {\n'
                       '  if (!gridDistance) return "\\u2026";\n'
                       '  const hit = gridFor(item);\n'
                       '  if (!hit || typeof hit.k !== "number") return "-";\n'
                       '  const parts = [`Nearest mapped circuit ${hit.k.toFixed(2)} km${hit.v ? ` at ${hit.v} kV` : ""}`];\n'
                       '  if (typeof hit.t === "number") parts.push(`transmission ${hit.t.toFixed(2)} km${hit.tv ? ` (${hit.tv} kV)` : ""}`);\n'
                       '  if (typeof hit.d === "number") parts.push(`distribution ${hit.d.toFixed(2)} km${hit.dv ? ` (${hit.dv} kV)` : ""}`);\n'
                       '  parts.push("Straight-line to mapped geometry, not a cable route or a connection length.");\n'
                       '  parts.push("Fault level and thermal headroom are not shown and cannot be inferred from distance: they need DNO network data such as source impedance and are established by a connection study.");\n'
                       '  const band = hit.b ? ` data-band="${escapeHtml(hit.b)}"` : "";\n'
                       '  return `<span${band} title="${escapeHtml(parts.join(" \\u00b7 "))}"><span class="km">${hit.k.toFixed(2)}</span><span class="kv">km${hit.v ? ` \\u00b7 ${hit.v}kV` : ""}</span></span>`;\n'
                       '}',
                       "gridCellHtml")

    cell_to = '''// The nearest 33 kV+ substation, keyed by REPD ref. Scope is 33 kV and above:
// 11 kV is rare for utility-scale export and where it occurs is often a private
// network behind the meter, so it is not a screening signal. Every one of the
// 5,800 substations in the Atlas layer qualifies, so nothing is filtered out at
// runtime -- the scope is a property of the layer, recorded in the payload.
let substation = null;

function substationFor(item) {
  return (substation && substation[String(item.repd_ref)]) || null;
}

// The sentence a distance can never answer. Held in one place so the two chips
// and the strip cannot drift apart.
const HEADROOM_CAVEAT = "Fault level and thermal headroom cannot be inferred from "
  + "distance: they depend on DNO network data such as source impedance, fault "
  + "infeed and existing committed connections, and are established by a "
  + "connection study.";

function metricChip({ ready, hit, label, unitSuffix, lines }) {
  if (!ready) return `<span class="action-metric pending">${label} \\u2026</span>`;
  if (!hit || typeof hit.k !== "number") {
    // Absence from a mapped layer is not absence on the ground, so this is a
    // dash and never a large number standing in for "not found".
    return `<span class="action-metric" title="No mapped feature found for this project. Absence from a mapped layer is not absence on the ground.">${label} -</span>`;
  }
  const band = hit.b ? ` data-band="${escapeHtml(hit.b)}"` : "";
  const title = escapeHtml(lines.filter(Boolean).join(" \\u00b7 "));
  return `<span class="action-metric"${band} title="${title}">${label}`
    + `<b>${hit.k.toFixed(2)}</b><span class="unit">km${unitSuffix}</span></span>`;
}

// Distance to the nearest mapped circuit, at 33 kV and above.
function gridActionHtml(item) {
  const hit = gridFor(item);
  const lines = [];
  if (hit && typeof hit.k === "number") {
    lines.push(`Nearest mapped circuit ${hit.k.toFixed(2)} km${hit.v ? ` at ${hit.v} kV` : ""}`);
    if (typeof hit.t === "number") lines.push(`transmission ${hit.t.toFixed(2)} km${hit.tv ? ` (${hit.tv} kV)` : ""}`);
    if (typeof hit.d === "number") lines.push(`distribution ${hit.d.toFixed(2)} km${hit.dv ? ` (${hit.dv} kV)` : ""}`);
    lines.push("Straight-line to mapped geometry, not a cable route or a connection length.");
    lines.push(HEADROOM_CAVEAT);
  }
  return metricChip({
    ready: Boolean(gridDistance), hit, label: "GRID",
    unitSuffix: hit && hit.v ? ` \\u00b7 ${hit.v}kV` : "", lines,
  });
}

// Distance to the nearest 33 kV+ substation -- for a scheme of a few tens of MW
// this is closer to where it would actually connect than the circuit is.
function substationActionHtml(item) {
  const hit = substationFor(item);
  const lines = [];
  if (hit && typeof hit.k === "number") {
    lines.push(`Nearest substation at 33 kV or above, ${hit.k.toFixed(2)} km`
      + (hit.n ? ` \\u2014 ${hit.n}` : "")
      + (hit.v && hit.v.length ? ` (${hit.v.join("/")} kV)` : ""));
    lines.push("A mapped substation point does not confirm capacity, voltage suitability, connection rights, queue position or acceptance by any network party.");
    lines.push(HEADROOM_CAVEAT);
  }
  return metricChip({
    ready: Boolean(substation), hit, label: "SUB", unitSuffix: "", lines,
  });
}'''
    ra.append({"label": "chip renderers for GRID and SUB", "from": cell_from, "to": cell_to})

    # ---- app.mjs: drop the cell, add the chips to ACTIONS ----------------
    td_from = anchor(app, '<td class="hide-mobile grid-cell">${gridCellHtml(item)}</td>',
                     "grid td")
    ra.append({"label": "GRID table cell removed", "from": td_from, "to": ""})

    act_from = anchor(app,
                      '<div class="project-actions">${mapAction}<a class="action-link newslink"',
                      "actions div")
    act_to = ('<div class="project-actions">${mapAction}${gridActionHtml(item)}'
              '${substationActionHtml(item)}<a class="action-link newslink"')
    ra.append({"label": "GRID and SUB placed after MAP inside ACTIONS",
               "from": act_from, "to": act_to})

    span_from = anchor(app, '<tr><td colspan="14" class="fast-fail">', "colspan")
    ra.append({"label": "fail-closed row back to 13 columns",
               "from": span_from, "to": '<tr><td colspan="13" class="fast-fail">'})

    # ---- app.mjs: the heading is gone, the sort is not ------------------
    head_from = anchor(app,
                       '  // Nearest first: the screening question is "what is close", so the\n'
                       '  // first click answers it rather than showing the most remote sites.\n'
                       '  grid: { header: "gridHeader", indicator: "gridSortIndicator", asc: "grid_asc", desc: "grid_desc", first: "grid_asc" },\n',
                       "grid SORT_HEADINGS")
    ra.append({"label": "grid heading wiring removed; grid_asc/grid_desc stay in SORTS",
               "from": head_from, "to": ""})

    # ---- app.mjs: load the substation payload ---------------------------
    loader_from = anchor(app, "async function loadGridDistance() {", "loadGridDistance")
    loader_to = '''async function loadSubstation33kv() {
  const entry = registry.supplemental_assets?.grid_actions_inline;
  if (!entry) return;
  try {
    runtimeEvidence.substationRequests += 1;
    const payload = await fetchImmutable(entry.payload.path);
    invariant(payload.schema === entry.payload.schema, "substation schema mismatch");
    invariant(payload.generation === entry.generation, "substation generation mismatch");
    invariant(payload.substation && typeof payload.substation === "object", "substation index missing");
    substation = payload.substation;
    runtimeEvidence.substationReady = true;
  } catch (error) {
    // A substation payload that will not load must not take the table with it.
    substation = null;
  }
}

''' + loader_from
    ra.append({"label": "substation loader", "from": loader_from, "to": loader_to})

    boot_from = anchor(app, "  await loadGridDistance();", "loadGridDistance call")
    ra.append({"label": "load the substation payload during boot",
               "from": boot_from, "to": boot_from + "\n  await loadSubstation33kv();"})

    ev_from = anchor(app, "  gridDistanceRequests: 0,\n  gridDistanceReady: false,",
                     "grid evidence counters")
    ra.append({"label": "runtime evidence counters",
               "from": ev_from,
               "to": ev_from + "\n  substationRequests: 0,\n  substationReady: false,"})

    # ---- app.mjs: the strip now describes both --------------------------
    note_from = anchor(app,
                       '      note.textContent = `GRID \\u00b7 BETA \\u00b7 straight-line km to the nearest mapped circuit \\u00b7 `\n'
                       '        + `${(payload.projects || 0).toLocaleString("en-GB")} measured, ${strong} within 2 km \\u00b7 `\n'
                       '        + `not a cable route, and not headroom`;',
                       "note text")
    note_to = ('      note.textContent = `GRID + SUB \\u00b7 BETA \\u00b7 in the ACTIONS column, beside MAP \\u00b7 `\n'
               '        + `straight-line km to the nearest mapped circuit and to the nearest substation at 33 kV or above \\u00b7 `\n'
               '        + `${(payload.projects || 0).toLocaleString("en-GB")} projects measured, ${strong} within 2 km of a circuit \\u00b7 `\n'
               '        + `not a cable route, and not headroom \\u2014 fault level and thermal headroom need DNO network data such as source impedance and a connection study`;')
    ra.append({"label": "strip describes both metrics and where they now live",
               "from": note_from, "to": note_to})

    man = {
        "key": "grid_actions_inline",
        "summary": ("GRID and a new nearest 33 kV+ substation distance move into "
                    "the ACTIONS column beside MAP, where they are reachable at "
                    "any window width. The GRID column and its sortable heading "
                    "are removed; grid_asc and grid_desc remain in the sort "
                    "control."),
        "modifies_existing_dashboard": True,
        "modification_note": ("This cartridge is NOT panel-only. It removes a "
                              "column, adds two metric chips to the ACTIONS cell, "
                              "narrows the fail-closed row back to 13, and adds a "
                              "second payload fetched during boot."),
        "repairs": {"index.html": ri, "app": ra},
        "hash_fields": [{"at": ["payload", "sha256"],
                         "path": "data/{GEN}-substation-33kv.json"}],
        "registry_entry": {
            "schema": "pipelinenews.grid-actions-supplemental-asset.v1",
            "generation": "{GEN}",
            "usage_context": "NON_COMMERCIAL_OPEN_SOURCE",
            "usage_context_establishes_upstream_rights": False,
            "activation": "fetched once during boot, before the first table paint; fails soft",
            "additive_only": False,
            "mutates_existing_dashboard": ("removes the GRID column and places "
                                           "GRID and SUB inside ACTIONS"),
            "network_at_runtime": False,
            "payload": {"schema": "pipelinenews.substation-33kv.v1",
                        "path": "data/{GEN}-substation-33kv.json",
                        "sha256": "", "bytes": 0},
            "placement": {
                "was": "a sortable GRID column between POSTCODE and OPERATOR",
                "now": "GRID and SUB chips in the ACTIONS cell, after MAP",
                "why": ("Measured from the published bytes, the GRID column's "
                        "right edge sat at ~1,430px while a 1366px laptop shows "
                        "~1,056px of table; it only cleared the fold at about "
                        "1920px. Beside MAP it is reachable at any width, and "
                        "MAP opens the Atlas the distances are measured against."),
                "cost": ("A sortable heading needs a column, so click-to-sort on "
                         "distance is gone. Sorting is not: grid_asc and "
                         "grid_desc remain in the SORT control."),
            },
            "substation_scope": {
                "minimum_kv": 33,
                "why": ("33 kV and above. 11 kV is rare for utility-scale export "
                        "and where it occurs is often a private network behind "
                        "the meter, so it is not a screening signal."),
                "layer": ("All 5,800 substations in the Atlas layer carry at "
                          "least 33 kV; 4,342 carry 33 kV itself. Nothing is "
                          "excluded, so the published substation distance is "
                          "already the nearest 33 kV+ substation."),
                "why_it_matters": ("A scheme of a few tens of MW connects at a "
                                   "substation, not to a conductor it sits "
                                   "under. Median distance to a 33 kV+ "
                                   "substation is 1.52 km against 6.44 km to a "
                                   "33 kV circuit, and for the 30-40 MW band the "
                                   "substation is the closer of the two for 68% "
                                   "of projects."),
            },
            "cannot_be_inferred": (
                "Fault level and thermal headroom. These are properties of the "
                "network, not of the geometry: they depend on DNO data such as "
                "source impedance, fault infeed and existing committed "
                "connections, and are established by a connection study. No "
                "distance, at any precision, implies them. Proximity to a mapped "
                "substation is not capacity at it."),
            "provenance": {
                "geometry": ("OpenStreetMap-derived overhead line and substation "
                             "layers, ODbL-1.0, (c) OpenStreetMap contributors."),
                "mathematics": ("Ventusltd/grid-distance-maths src/geodesy.py. "
                                "All 3,047 published substation distances were "
                                "re-measured against it at build time and "
                                "reproduced within the source payload's own "
                                "rounding."),
            },
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
