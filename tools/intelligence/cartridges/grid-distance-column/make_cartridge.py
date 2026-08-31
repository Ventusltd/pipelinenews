"""Generate cartridge.json for the grid-distance column.

The manifest is a list of exact from -> to string repairs against the parent
release. Typing those anchors by hand is how you ship a build that fails on an
invisible character: the sort options contain both an em dash and an en dash,
and the table markup is indentation-sensitive.

So the anchors are not typed. They are READ out of the parent release and
asserted unique before the manifest is written. If an anchor is missing or
appears twice, this stops rather than producing a manifest that will fail
half-way through a build.

    python make_cartridge.py --parent 202608311731-pipelinenews
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
    """Assert a repair anchor exists exactly once, and hand it back."""
    n = text.count(needle)
    if n != 1:
        raise SystemExit("anchor %r occurs %d times, expected 1:\n%s"
                         % (label, n, needle[:200]))
    return needle


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parent", default="202608311731-pipelinenews")
    a = ap.parse_args()

    parent = os.path.join(RELEASES, a.parent)
    if not os.path.isdir(parent):
        raise SystemExit("no such parent release: %s" % parent)
    idx = read(os.path.join(parent, "index.html"))
    app = read(os.path.join(parent, APP))

    repairs_index = []
    repairs_app = []

    # ---- 1. styles -------------------------------------------------------
    css_from = anchor(idx, "    .locality-note { color: #8d98a5; font-size: 9px; }",
                      "locality-note css")
    css_to = css_from + """

    /* GRID column. The BETA chip is a scope marker, not a disclaimer: the
       measurement is published and checked, and the chip says which questions
       it does not answer. Amber rather than red for that reason. */
    .beta-chip {
      font-size: 8px; letter-spacing: .06em; padding: 1px 3px; border-radius: 2px;
      background: #3a2f12; color: #e0b050; border: 1px solid #6a5320;
      vertical-align: 1px;
    }
    .grid-cell { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .grid-cell .km { color: #d8dee6; }
    .grid-cell .kv { color: #8d98a5; font-size: 9px; margin-left: 3px; }
    /* Band tints the distance only. Bands describe how close the mapped
       network is; they never imply a connection is obtainable. */
    .grid-cell[data-band="STRONG"] .km { color: #6fd18a; }
    .grid-cell[data-band="MODERATE"] .km { color: #d8c96a; }
    .grid-cell[data-band="DISTANT"] .km { color: #d89a6a; }
    .grid-cell[data-band="REMOTE"] .km { color: #b06a6a; }
    .grid-note { color: #8d98a5; font-size: 9px; }"""
    repairs_index.append({"label": "GRID column styles and BETA chip",
                          "from": css_from, "to": css_to})

    # ---- 2. table heading ------------------------------------------------
    th_from = anchor(idx,
                     '            <th class="hide-mobile">OPERATOR</th>\n'
                     '            <th>TECHNOLOGY</th>',
                     "operator/technology headings")
    th_to = ('            <th class="hide-mobile sortable-heading" id="gridHeader" aria-sort="none">\n'
             '              <button id="sortGrid" type="button" aria-label="Sort by straight-line distance to the nearest mapped grid circuit">\n'
             '                GRID <span class="beta-chip">BETA</span> <span id="gridSortIndicator" aria-hidden="true">↕</span>\n'
             '              </button>\n'
             '            </th>\n') + th_from
    repairs_index.append({"label": "GRID heading, sortable, after POSTCODE",
                          "from": th_from, "to": th_to})

    # ---- 3. the note beside the filters ----------------------------------
    note_from = anchor(idx,
                       '      <span class="locality-note" id="localityNote">TOWN + POSTCODE · loading…</span>',
                       "locality note span")
    note_to = (note_from + '\n'
               '      <span class="grid-note" id="gridDistanceNote">GRID · loading…</span>')
    repairs_index.append({"label": "GRID note beside the locality note",
                          "from": note_from, "to": note_to})

    # ---- 4. sort options -------------------------------------------------
    # Read the postcode option line out of the file so the dashes match.
    line = [ln for ln in idx.split("\n") if 'value="postcode_desc"' in ln]
    if len(line) != 1:
        raise SystemExit("expected exactly one postcode_desc option")
    opt_from = anchor(idx, line[0], "postcode_desc option")
    opt_to = (opt_from + '\n'
              '        <option value="grid_asc">SORT: GRID DISTANCE — NEAREST</option>\n'
              '        <option value="grid_desc">SORT: GRID DISTANCE — FURTHEST</option>')
    repairs_index.append({"label": "GRID sort options in the sort select",
                          "from": opt_from, "to": opt_to})

    # ---- 5. app: sort modes ---------------------------------------------
    sorts_from = anchor(app,
                        'const SORTS = new Set(["capacity_desc", "capacity_asc", "updated_desc", "updated_asc",\n'
                        '  "county_asc", "county_desc", "town_asc", "town_desc", "postcode_asc", "postcode_desc"]);',
                        "SORTS set")
    sorts_to = ('const SORTS = new Set(["capacity_desc", "capacity_asc", "updated_desc", "updated_asc",\n'
                '  "county_asc", "county_desc", "town_asc", "town_desc", "postcode_asc", "postcode_desc",\n'
                '  "grid_asc", "grid_desc"]);')
    repairs_app.append({"label": "grid sort modes", "from": sorts_from, "to": sorts_to})

    head_from = anchor(app,
                       '  postcode: { header: "postcodeHeader", indicator: "postcodeSortIndicator", asc: "postcode_asc", desc: "postcode_desc", first: "postcode_asc" },',
                       "postcode SORT_HEADINGS entry")
    head_to = (head_from + '\n'
               '  // Nearest first: the screening question is "what is close", so the\n'
               '  // first click answers it rather than showing the most remote sites.\n'
               '  grid: { header: "gridHeader", indicator: "gridSortIndicator", asc: "grid_asc", desc: "grid_desc", first: "grid_asc" },')
    repairs_app.append({"label": "grid heading wiring", "from": head_from, "to": head_to})

    # ---- 6. app: the payload and its accessor ---------------------------
    state_from = anchor(app,
                        'function localityFor(item) {\n'
                        '  return (locality && locality[String(item.repd_ref)]) || null;\n'
                        '}',
                        "localityFor")
    state_to = state_from + '''

// The grid-distance payload: the nearest mapped circuit per REPD ref, carried
// across from the GRID panel's own payload and verified at build time against
// Ventusltd/grid-distance-maths. Slim on purpose -- the panel's payload is
// 5.5 MB and is fetched only when a user opens it; this is 240 KB and is
// fetched once at boot because a column needs every row.
//
// Null until it lands, and null forever if the fetch fails. The column then
// reads "-" and every other column is untouched.
let gridDistance = null;

function gridFor(item) {
  return (gridDistance && gridDistance[String(item.repd_ref)]) || null;
}

// A distance the register cannot support is a dash, never a zero and never a
// large number standing in for "not found". Absence from a mapped layer is not
// absence on the ground.
function gridCellHtml(item) {
  if (!gridDistance) return "\\u2026";
  const hit = gridFor(item);
  if (!hit || typeof hit.k !== "number") return "-";
  const parts = [`Nearest mapped circuit ${hit.k.toFixed(2)} km${hit.v ? ` at ${hit.v} kV` : ""}`];
  if (typeof hit.t === "number") parts.push(`transmission ${hit.t.toFixed(2)} km${hit.tv ? ` (${hit.tv} kV)` : ""}`);
  if (typeof hit.d === "number") parts.push(`distribution ${hit.d.toFixed(2)} km${hit.dv ? ` (${hit.dv} kV)` : ""}`);
  parts.push("Straight-line to mapped geometry, not a cable route or a connection length.");
  parts.push("Fault level and thermal headroom are not shown and cannot be inferred from distance: they need DNO network data such as source impedance and are established by a connection study.");
  const band = hit.b ? ` data-band="${escapeHtml(hit.b)}"` : "";
  return `<span${band} title="${escapeHtml(parts.join(" \\u00b7 "))}"><span class="km">${hit.k.toFixed(2)}</span><span class="kv">km${hit.v ? ` \\u00b7 ${hit.v}kV` : ""}</span></span>`;
}'''
    repairs_app.append({"label": "grid payload state and cell renderer",
                        "from": state_from, "to": state_to})

    # ---- 7. app: the cell ------------------------------------------------
    cell_from = anchor(app,
                       '<td class="hide-mobile reference-cell">${escapeHtml(place?.postcode || "-")}</td>',
                       "postcode cell")
    cell_to = cell_from + '<td class="hide-mobile grid-cell">${gridCellHtml(item)}</td>'
    repairs_app.append({"label": "GRID cell in the row", "from": cell_from, "to": cell_to})

    # ---- 8. app: the sort ------------------------------------------------
    sort_from = anchor(app,
                       '  } else if (sortMode === "postcode_asc" || sortMode === "postcode_desc") {\n'
                       '    const direction = sortMode === "postcode_asc" ? 1 : -1;\n'
                       '    next.sort((left, right) =>\n'
                       '      compareText(localityFor(project(left))?.postcode, localityFor(project(right))?.postcode, direction) || left - right);',
                       "postcode sort branch")
    sort_to = sort_from + '''
  } else if (sortMode === "grid_asc" || sortMode === "grid_desc") {
    // Blanks sort last in BOTH directions, exactly as postcode does. A project
    // with no mapped circuit has not got an infinite distance and has not got a
    // zero one; pushing it to the bottom either way keeps the measured rows
    // contiguous, which is the whole point of sorting by proximity.
    const direction = sortMode === "grid_asc" ? 1 : -1;
    next.sort((left, right) => {
      const a = gridFor(project(left))?.k;
      const b = gridFor(project(right))?.k;
      const aMissing = typeof a !== "number";
      const bMissing = typeof b !== "number";
      if (aMissing && bMissing) return left - right;
      if (aMissing) return 1;
      if (bMissing) return -1;
      return (a - b) * direction || left - right;
    });'''
    repairs_app.append({"label": "grid distance sort, blanks last both ways",
                        "from": sort_from, "to": sort_to})

    # ---- 9. app: the loader ---------------------------------------------
    loader_from = anchor(app, "async function loadLocality() {", "loadLocality")
    loader_to = '''async function loadGridDistance() {
  const entry = registry.supplemental_assets?.grid_distance_column;
  const note = document.getElementById("gridDistanceNote");
  if (!entry) {
    if (note) note.textContent = "GRID \\u00b7 not in this release";
    return;
  }
  try {
    runtimeEvidence.gridDistanceRequests += 1;
    const payload = await fetchImmutable(entry.payload.path);
    invariant(payload.schema === entry.payload.schema, "grid-distance schema mismatch");
    invariant(payload.generation === entry.generation, "grid-distance generation mismatch");
    invariant(payload.grid && typeof payload.grid === "object", "grid-distance index missing");
    gridDistance = payload.grid;
    runtimeEvidence.gridDistanceReady = true;
    if (note) {
      const counts = payload.bands?.counts || {};
      const strong = (counts.STRONG || 0).toLocaleString("en-GB");
      note.textContent = `GRID \\u00b7 BETA \\u00b7 straight-line km to the nearest mapped circuit \\u00b7 `
        + `${(payload.projects || 0).toLocaleString("en-GB")} measured, ${strong} within 2 km \\u00b7 `
        + `not a cable route, and not headroom`;
      // The full scope of the BETA sits on hover rather than in the strip, so
      // the caveat is one gesture away without crowding the filter row.
      note.title = [
        payload.caveat?.distance,
        payload.caveat?.headroom,
        payload.caveat?.coverage,
        payload.beta?.not_covered?.length
          ? "Not covered in this beta: " + payload.beta.not_covered.join("; ")
          : "",
        payload.earth_model
          ? `Measured on ${payload.earth_model.formula} at R = ${payload.earth_model.radius_km} km using ${payload.earth_model.implementation}; every published distance re-measured and reproduced at build time.`
          : "",
      ].filter(Boolean).join("\\n\\n");
    }
  } catch (error) {
    // A grid payload that will not load must not take the table with it.
    gridDistance = null;
    if (note) note.textContent = "GRID \\u00b7 unavailable in this session";
  }
}

''' + loader_from
    repairs_app.append({"label": "grid-distance loader", "from": loader_from, "to": loader_to})

    boot_from = anchor(app, "  await loadLocality();", "loadLocality call in boot")
    boot_to = boot_from + "\n  await loadGridDistance();"
    repairs_app.append({"label": "load the grid payload during boot",
                        "from": boot_from, "to": boot_to})

    ev_from = anchor(app, "  localityRequests: 0,\n  localityReady: false,",
                     "runtimeEvidence locality fields")
    ev_to = ev_from + "\n  gridDistanceRequests: 0,\n  gridDistanceReady: false,"
    repairs_app.append({"label": "runtime evidence counters", "from": ev_from, "to": ev_to})

    span_from = anchor(app, '<tr><td colspan="13" class="fast-fail">', "fail-closed colspan")
    span_to = '<tr><td colspan="14" class="fast-fail">'
    repairs_app.append({"label": "fail-closed row spans the new column count",
                        "from": span_from, "to": span_to})

    # ---- manifest --------------------------------------------------------
    man = {
        "key": "grid_distance_column",
        "summary": ("A GRID column in the main table: straight-line distance to "
                    "the nearest mapped circuit, sortable nearest-first, marked "
                    "BETA. The number is the GRID panel's own, carried across "
                    "and verified at build time against the canonical geodesy in "
                    "Ventusltd/grid-distance-maths."),
        "modifies_existing_dashboard": True,
        "modification_note": ("This cartridge is NOT panel-only. It adds a column "
                              "to the project table, a sort mode, a note beside "
                              "the filters, and it widens the fail-closed row, so "
                              "it patches the table renderer, the sort modes and "
                              "the boot sequence."),
        "repairs": {"index.html": repairs_index, "app": repairs_app},
        "hash_fields": [{"at": ["payload", "sha256"],
                         "path": "data/{GEN}-grid-distance.json"}],
        "registry_entry": {
            "schema": "pipelinenews.grid-distance-supplemental-asset.v1",
            "generation": "{GEN}",
            "usage_context": "NON_COMMERCIAL_OPEN_SOURCE",
            "usage_context_establishes_upstream_rights": False,
            "activation": "fetched once during boot, before the first table paint; fails soft",
            "additive_only": False,
            "mutates_existing_dashboard": ("adds a GRID column and a grid-distance "
                                           "sort mode to the project table"),
            "network_at_runtime": False,
            "payload": {"schema": "pipelinenews.grid-distance.v1",
                        "path": "data/{GEN}-grid-distance.json",
                        "sha256": "", "bytes": 0},
            "maturity": {
                "status": "BETA",
                "means": ("The measurement is published and checked. BETA marks "
                          "what it does not yet cover, so it can be used for "
                          "screening with its limits known. It is not a warning "
                          "that the number is unreliable."),
                "not_covered": [
                    "11 kV beyond an estimated UKPN layer, the voltage most "
                    "sub-5 MW distribution connections are actually made at",
                    "the point of connection, which is not the register centroid "
                    "the distance is measured from",
                    "connection queue position, curtailment and contracted capacity",
                ],
                "cannot_be_inferred": (
                    "Fault level and thermal headroom. These are properties of "
                    "the network, not of the geometry: they depend on DNO data "
                    "such as source impedance, fault infeed and existing "
                    "committed connections, and are established by a connection "
                    "study. No distance, at any precision, implies them."),
            },
            "provenance": {
                "geometry": ("OpenStreetMap-derived overhead line and substation "
                             "layers, ODbL-1.0, (c) OpenStreetMap contributors."),
                "projects": ("DESNZ Renewable Energy Planning Database, Open "
                             "Government Licence v3.0."),
                "mathematics": ("Ventusltd/grid-distance-maths src/geodesy.py, "
                                "haversine at R = 6378.137 km, point projected "
                                "onto the segment on a local tangent plane. Every "
                                "published distance was re-measured against it at "
                                "build time and reproduced within the source "
                                "payload's own rounding."),
            },
        },
    }

    out = os.path.join(HERE, "cartridge.json")
    io.open(out, "w", encoding="utf-8", newline="").write(
        json.dumps(man, ensure_ascii=False, indent=2) + "\n")
    print("wrote cartridge.json")
    print("  index.html repairs  %d" % len(repairs_index))
    print("  app.mjs repairs     %d" % len(repairs_app))
    print("  every anchor verified unique in %s" % a.parent)
    return 0


if __name__ == "__main__":
    sys.exit(main())
