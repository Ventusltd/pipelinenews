"""Generate cartridge.json for the project-size range filter.

WHY THE SLIDER IS NOT LINEAR
----------------------------
The register is not evenly spread. Measured over all 7,680 projects:

    median            12.3 MW
    75th percentile   40.0 MW
    98% of projects   under 500 MW
    largest            4,100 MW

A linear 1-5000 MW track puts the 30-40 MW window -- the example the filter was
asked for -- inside 0.2% of its length, about two pixels on a laptop. The
control would exist and be unusable for the question it was built to answer.

So the slider moves over a fixed ladder of round MW values that thickens where
the projects actually are: single steps from 1 to 10, fives to 50, tens to 100,
then widening to 5000. Every drag lands on a number a person would say out
loud, 30 and 40 are three stops apart, and the top of the ladder still reaches
5000 as asked.

The two number boxes beside it accept any exact value, so 33 to 37 is typeable
even though it is not on the ladder. The ladder is for dragging; the boxes are
for precision.

    python make_cartridge.py --parent 202608311800-pipelinenews
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

# The ladder. Dense where the register is dense, and it ends where asked.
STOPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50,
         60, 70, 80, 90, 100, 125, 150, 175, 200, 250, 300, 350, 400, 450, 500,
         600, 700, 800, 900, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 3500,
         4000, 4500, 5000]


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
    ap.add_argument("--parent", default="202608311800-pipelinenews")
    a = ap.parse_args()

    parent = os.path.join(RELEASES, a.parent)
    if not os.path.isdir(parent):
        raise SystemExit("no such parent release: %s" % parent)
    idx = read(os.path.join(parent, "index.html"))
    app = read(os.path.join(parent, APP))

    repairs_index = []
    repairs_app = []

    # ---- 1. styles -------------------------------------------------------
    css_from = anchor(idx, "    .grid-note { color: #8d98a5; font-size: 9px; }",
                      "grid-note css")
    css_to = css_from + """

    /* PROJECT SIZE range. Two range inputs share one track: the upper one is
       transparent to pointer events except on its thumb, so both thumbs stay
       grabbable even when they meet. */
    .size-filter { align-items: center; gap: 14px; flex-wrap: wrap; }
    .size-filter .size-label { color: #00ffff; font-size: 10px; letter-spacing: .08em; }
    .size-track {
      position: relative; height: 26px; flex: 1 1 260px;
      min-width: 200px; max-width: 460px;
    }
    .size-track input[type="range"] {
      position: absolute; left: 0; top: 0; width: 100%; margin: 0;
      background: none; pointer-events: none; -webkit-appearance: none; appearance: none;
    }
    .size-track input[type="range"]::-webkit-slider-runnable-track {
      height: 3px; background: #2b3138; border-radius: 2px;
    }
    .size-track input[type="range"]::-moz-range-track {
      height: 3px; background: #2b3138; border-radius: 2px;
    }
    .size-track input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none; pointer-events: auto;
      height: 15px; width: 15px; margin-top: -6px; border-radius: 50%;
      background: #00ffff; border: 1px solid #04343a; cursor: pointer;
    }
    .size-track input[type="range"]::-moz-range-thumb {
      pointer-events: auto; height: 13px; width: 13px; border-radius: 50%;
      background: #00ffff; border: 1px solid #04343a; cursor: pointer;
    }
    .size-track input[type="range"]:focus-visible::-webkit-slider-thumb { outline: 2px solid #66ffff; }
    .size-selected {
      position: absolute; top: 11px; height: 3px; background: #00ffff;
      border-radius: 2px; pointer-events: none;
    }
    .size-box {
      width: 72px; background: #10141a; color: #d8dee6; font: inherit;
      font-size: 11px; border: 1px solid #2b3138; border-radius: 3px; padding: 4px 6px;
    }
    .size-box:focus { outline: 1px solid #00ffff; }
    .size-readout { color: #d8dee6; font-size: 11px; font-variant-numeric: tabular-nums; }
    .size-note { color: #8d98a5; font-size: 9px; }
    .size-filter .size-reset {
      background: none; border: 1px solid #2b3138; color: #8d98a5;
      font: inherit; font-size: 9px; padding: 3px 7px; border-radius: 3px; cursor: pointer;
    }
    .size-filter .size-reset:hover { color: #00ffff; border-color: #00ffff; }
    @media (max-width: 600px) { .size-track { max-width: none; } }"""
    repairs_index.append({"label": "PROJECT SIZE range filter styles",
                          "from": css_from, "to": css_to})

    # ---- 2. the control, at the top of the filter stack -------------------
    tech_from = anchor(idx, '    <div class="filters" id="tech">', "tech filter row")
    tech_to = ('    <div class="filters size-filter" id="capacityRange">\n'
               '      <span class="size-label">PROJECT SIZE</span>\n'
               '      <div class="size-track">\n'
               '        <div class="size-selected" id="sizeSelected"></div>\n'
               '        <input type="range" id="sizeMinRange" aria-label="Smallest project size to show, MW">\n'
               '        <input type="range" id="sizeMaxRange" aria-label="Largest project size to show, MW">\n'
               '      </div>\n'
               '      <input type="number" class="size-box" id="sizeMinBox" min="1" max="5000" step="0.1" aria-label="Smallest project size in MW">\n'
               '      <span class="size-readout" id="sizeReadout">1 – 5,000 MW</span>\n'
               '      <input type="number" class="size-box" id="sizeMaxBox" min="1" max="5000" step="0.1" aria-label="Largest project size in MW">\n'
               '      <button type="button" class="size-reset" id="sizeReset">FULL RANGE</button>\n'
               '      <span class="size-note" id="sizeNote">drag for round sizes, or type an exact MW value · the register itself starts at 1 MW</span>\n'
               '    </div>\n') + tech_from
    repairs_index.append({"label": "PROJECT SIZE control above the technology row",
                          "from": tech_from, "to": tech_to})

    # ---- 3. app: state and helpers --------------------------------------
    state_from = anchor(app, "function apply({ syncUrl = true } = {}) {", "apply")
    state_to = '''// PROJECT SIZE range.
//
// The ladder is not linear, and the reason is in the data rather than in
// taste. The register's median project is 12.3 MW and 98%% of it sits under
// 500 MW, so a linear 1-5000 track would compress the band almost every user
// cares about into the first two pixels. These stops thicken where the
// projects are and still reach 5000.
const SIZE_STOPS = Object.freeze(%s);
const SIZE_FLOOR = SIZE_STOPS[0];
const SIZE_CEILING = SIZE_STOPS[SIZE_STOPS.length - 1];

let capacityMin = SIZE_FLOOR;
let capacityMax = SIZE_CEILING;

// The full range is "no filter", so it never reaches the URL and never claims
// to have excluded anything.
function sizeFilterActive() {
  return capacityMin > SIZE_FLOOR || capacityMax < SIZE_CEILING;
}

function nearestStopIndex(value) {
  let best = 0;
  for (let i = 1; i < SIZE_STOPS.length; i += 1) {
    if (Math.abs(SIZE_STOPS[i] - value) < Math.abs(SIZE_STOPS[best] - value)) best = i;
  }
  return best;
}

// A typed value is honoured exactly; only the slider snaps. Reversed bounds are
// swapped rather than rejected, because a user who types 40 then 30 means the
// band between them.
//
// The absent cases are tested BEFORE Number(), not after. Number(null) is 0 and
// Number("") is 0 -- both finite -- so a missing mw_max would otherwise clamp to
// the floor and pin the whole register to 1 MW. An emptied box does the same.
// This is the fallback path, so it has to survive the values that mean "nothing
// was given" rather than only the ones that mean "not a number".
function clampSize(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(SIZE_CEILING, Math.max(SIZE_FLOOR, number));
}

function formatMw(value) {
  return value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

function renderCapacityRange() {
  const minRange = document.getElementById("sizeMinRange");
  const maxRange = document.getElementById("sizeMaxRange");
  const minBox = document.getElementById("sizeMinBox");
  const maxBox = document.getElementById("sizeMaxBox");
  const readout = document.getElementById("sizeReadout");
  const selected = document.getElementById("sizeSelected");
  if (!minRange || !maxRange) return;
  const last = SIZE_STOPS.length - 1;
  for (const input of [minRange, maxRange]) {
    input.min = "0";
    input.max = String(last);
    input.step = "1";
  }
  const lowIndex = nearestStopIndex(capacityMin);
  const highIndex = nearestStopIndex(capacityMax);
  minRange.value = String(lowIndex);
  maxRange.value = String(highIndex);
  if (minBox) minBox.value = String(capacityMin);
  if (maxBox) maxBox.value = String(capacityMax);
  if (readout) {
    readout.textContent = sizeFilterActive()
      ? `${formatMw(capacityMin)} – ${formatMw(capacityMax)} MW`
      : `1 – ${formatMw(SIZE_CEILING)} MW · all sizes`;
  }
  if (selected) {
    const left = (lowIndex / last) * 100;
    const right = (highIndex / last) * 100;
    selected.style.left = `${left}%%`;
    selected.style.width = `${Math.max(right - left, 0)}%%`;
  }
}

''' % json.dumps(STOPS) + state_from
    repairs_app.append({"label": "size range state, ladder and renderer",
                        "from": state_from, "to": state_to})

    # ---- 4. app: the predicate ------------------------------------------
    pred_from = anchor(app, '    if (county !== "All" && item.county !== county) continue;',
                       "county predicate")
    pred_to = (pred_from + '\n'
               '    if (item.capacity_mw < capacityMin || item.capacity_mw > capacityMax) continue;')
    repairs_app.append({"label": "size range filter predicate",
                        "from": pred_from, "to": pred_to})

    # ---- 5. app: the URL ------------------------------------------------
    url_from = anchor(app,
                      '  for (const parameter of ["technology", "status", "county", "q", "sort", "repd_ref"]) url.searchParams.delete(parameter);',
                      "url delete list")
    url_to = ('  for (const parameter of ["technology", "status", "county", "q", "sort", "repd_ref",\n'
              '    "mw_min", "mw_max"]) url.searchParams.delete(parameter);')
    repairs_app.append({"label": "size range cleared from the URL", "from": url_from, "to": url_to})

    url2_from = anchor(app,
                       '  if (sortMode !== "capacity_desc") url.searchParams.set("sort", sortMode);',
                       "url sort write")
    url2_to = (url2_from + '\n'
               '  if (capacityMin > SIZE_FLOOR) url.searchParams.set("mw_min", String(capacityMin));\n'
               '  if (capacityMax < SIZE_CEILING) url.searchParams.set("mw_max", String(capacityMax));')
    repairs_app.append({"label": "size range written to the URL", "from": url2_from, "to": url2_to})

    hyd_from = anchor(app,
                      '  document.getElementById("search").value = query;\n'
                      '  document.getElementById("sortProjects").value = sortMode;',
                      "hydrate tail")
    hyd_to = (hyd_from + '\n'
              '  capacityMin = clampSize(parameters.get("mw_min"), SIZE_FLOOR);\n'
              '  capacityMax = clampSize(parameters.get("mw_max"), SIZE_CEILING);\n'
              '  if (capacityMin > capacityMax) [capacityMin, capacityMax] = [capacityMax, capacityMin];\n'
              '  renderCapacityRange();')
    repairs_app.append({"label": "size range read from the URL", "from": hyd_from, "to": hyd_to})

    # ---- 6. app: clear filters ------------------------------------------
    clear_from = anchor(app,
                        '  document.getElementById("search").value = "";\n'
                        '  document.getElementById("sortProjects").value = sortMode;\n'
                        '  apply();',
                        "clearFilters tail")
    clear_to = ('  document.getElementById("search").value = "";\n'
                '  document.getElementById("sortProjects").value = sortMode;\n'
                '  capacityMin = SIZE_FLOOR;\n'
                '  capacityMax = SIZE_CEILING;\n'
                '  renderCapacityRange();\n'
                '  apply();')
    repairs_app.append({"label": "CLEAR FILTERS resets the size range",
                        "from": clear_from, "to": clear_to})

    # ---- 7. app: bindings -----------------------------------------------
    bind_from = anchor(app,
                       '  document.getElementById("county").addEventListener("change", (event) => { county = event.target.value; apply(); });',
                       "county binding")
    bind_to = bind_from + '''
  const sizeMinRange = document.getElementById("sizeMinRange");
  const sizeMaxRange = document.getElementById("sizeMaxRange");
  const sizeMinBox = document.getElementById("sizeMinBox");
  const sizeMaxBox = document.getElementById("sizeMaxBox");
  if (sizeMinRange && sizeMaxRange) {
    // Dragging one handle past the other pushes rather than crosses, so the
    // band can be collapsed to a single stop but never inverted.
    const onRange = () => {
      let low = Number(sizeMinRange.value);
      let high = Number(sizeMaxRange.value);
      if (low > high) { const swap = low; low = high; high = swap; }
      capacityMin = SIZE_STOPS[low];
      capacityMax = SIZE_STOPS[high];
      renderCapacityRange();
      apply();
    };
    sizeMinRange.addEventListener("input", onRange);
    sizeMaxRange.addEventListener("input", onRange);
  }
  // The boxes take an exact value, so a band the ladder does not carry -- 33 to
  // 37 -- is still reachable. Committed on change, not on every keystroke.
  const onBox = () => {
    capacityMin = clampSize(sizeMinBox?.value, SIZE_FLOOR);
    capacityMax = clampSize(sizeMaxBox?.value, SIZE_CEILING);
    if (capacityMin > capacityMax) {
      const swap = capacityMin; capacityMin = capacityMax; capacityMax = swap;
    }
    renderCapacityRange();
    apply();
  };
  if (sizeMinBox) sizeMinBox.addEventListener("change", onBox);
  if (sizeMaxBox) sizeMaxBox.addEventListener("change", onBox);
  const sizeReset = document.getElementById("sizeReset");
  if (sizeReset) {
    sizeReset.addEventListener("click", () => {
      capacityMin = SIZE_FLOOR;
      capacityMax = SIZE_CEILING;
      renderCapacityRange();
      apply();
    });
  }'''
    repairs_app.append({"label": "size range controls bound", "from": bind_from, "to": bind_to})

    man = {
        "key": "capacity_range_filter",
        "summary": ("A PROJECT SIZE range filter at the top of the filter stack: "
                    "two handles over a ladder of round MW values from 1 to "
                    "5,000, plus number boxes for an exact band. Shareable in "
                    "the URL as mw_min and mw_max."),
        "modifies_existing_dashboard": True,
        "modification_note": ("This cartridge is NOT panel-only. It adds a filter "
                              "row above the technology buttons and a clause to "
                              "the filter predicate, so it patches the filter "
                              "loop, the URL sync, the hydrate and the clear."),
        "repairs": {"index.html": repairs_index, "app": repairs_app},
        "registry_entry": {
            "schema": "pipelinenews.capacity-range-filter.v1",
            "generation": "{GEN}",
            "usage_context": "NON_COMMERCIAL_OPEN_SOURCE",
            "usage_context_establishes_upstream_rights": False,
            "activation": "inline control; no payload, no fetch",
            "additive_only": False,
            "mutates_existing_dashboard": ("adds a PROJECT SIZE range filter and "
                                           "the mw_min / mw_max URL parameters"),
            "network_at_runtime": False,
            "scale": {
                "stops": STOPS,
                "why_not_linear": ("Measured over all 7,680 projects the median "
                                   "is 12.3 MW, the 75th percentile is 40 MW and "
                                   "98% sit under 500 MW. A linear 1-5000 track "
                                   "would put the 30-40 MW band inside 0.2% of "
                                   "its length. The ladder thickens where the "
                                   "register is dense and still reaches 5,000."),
                "exact_values": ("The number boxes accept any value in range, so "
                                 "a band the ladder does not carry is still "
                                 "reachable. Only the slider snaps."),
            },
            "filters_only": ("This is a view control. It never redefines the "
                             "pipeline: the register's own floor is 1 MW, the "
                             "largest record is 4,100 MW, and clearing the "
                             "filter restores every qualifying record."),
        },
    }

    out = os.path.join(HERE, "cartridge.json")
    io.open(out, "w", encoding="utf-8", newline="").write(
        json.dumps(man, ensure_ascii=False, indent=2) + "\n")
    print("wrote cartridge.json")
    print("  index.html repairs  %d" % len(repairs_index))
    print("  app.mjs repairs     %d" % len(repairs_app))
    print("  ladder stops        %d  (%d .. %d MW)" % (len(STOPS), STOPS[0], STOPS[-1]))
    print("  every anchor verified unique in %s" % a.parent)
    return 0


if __name__ == "__main__":
    sys.exit(main())
