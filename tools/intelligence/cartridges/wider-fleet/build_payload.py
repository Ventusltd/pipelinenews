#!/usr/bin/env python3
"""
Build the WIDER FLEET page: every REPD technology type the Pipeline News
spine does not carry, one tab each, in Pipeline News' own layout.

The spine admits four of the REPD's technology types (Solar Photovoltaics,
Battery, Wind Onshore, Wind Offshore). This emits the rest with the same
treatment. It reads the register the existing repd_updaterv8.py already
produces from the DESNZ REPD extract -- there is no second fetcher here and
no second classification.

Tabs are derived from the register at build time and never hand-listed. A
hand-kept technology list is exactly what left `wind_onshore` in Pipeline
News and absent from the engine; the register is the only authority.

Usage:
    python build_wider_fleet.py --register dist/repd_master.json --out site/

Outputs:
    <out>/wider-fleet.json        the register cut, one row per project
    <out>/wider-fleet.html        the page, Pipeline News stylesheet and markup
    <out>/wider-fleet-report.txt  what was carried, for the build log
"""

import argparse
import json
import os
import sys
from collections import Counter, defaultdict

# The four REPD technology types the pipeline spine already carries. Anything
# outside this set is this page's scope. Named in the REPD's own vocabulary so
# the boundary is checkable against the source rather than against a nickname.
SPINE_TYPES = {
    "Solar Photovoltaics",
    "Battery",
    "Wind Onshore",
    "Wind Offshore",
}

# Engine layer colours, so a technology reads the same here as on the Atlas.
# Keyed by the family repd_updaterv8.py already assigns -- no second table.
FAMILY_COLOUR = {
    "biomass": "#39ff14",
    "hydro": "#00aaff",
    "hydrogen": "#ffffff",
    "tidal": "#00bfff",
    "act": "#ff6600",
    "caes": "#88aaff",
    "geothermal": "#ff3300",
    "flywheel": "#ff69b4",
    "other": "#888888",
}

PN_RELEASE = "https://globalgrid2050.com/pipelinenews_intelligence/202609020611/"
ATLAS = "https://ventusltd.github.io/gridatlas/atlas/"


def load_rows(register_path):
    """Read the served register and return the rows outside the spine."""
    with open(register_path, encoding="utf-8") as handle:
        doc = json.load(handle)
    features = doc.get("features", doc)

    rows, skipped = [], 0
    for feature in features:
        props = feature.get("properties") or {}
        raw = (props.get("raw_tech") or "Unknown").strip()
        if raw in SPINE_TYPES:
            continue
        geom = (feature.get("geometry") or {}).get("coordinates") or []
        if len(geom) < 2:
            skipped += 1
            continue
        try:
            capacity = float(props.get("capacity") or 0)
        except (TypeError, ValueError):
            capacity = 0.0
        rows.append({
            "n": props.get("name") or "",
            "o": props.get("operator") or "",
            "t": props.get("tech") or "other",
            "rt": raw,
            "s": props.get("status") or "",
            "c": capacity,
            "ll": [round(float(geom[0]), 5), round(float(geom[1]), 5)],
        })

    rows.sort(key=lambda r: -r["c"])
    return rows, skipped


def report(rows, skipped):
    counts, megawatts, family = Counter(), defaultdict(float), {}
    for row in rows:
        counts[row["rt"]] += 1
        megawatts[row["rt"]] += row["c"]
        family[row["rt"]] = row["t"]

    lines = [
        "WIDER FLEET BUILD",
        "",
        "%-42s %6s %13s  %s" % ("REPD TECHNOLOGY TYPE", "N", "MW", "FAMILY"),
    ]
    for name, count in counts.most_common():
        lines.append("%-42s %6d %13s  %s"
                     % (name, count, format(megawatts[name], ",.1f"), family[name]))
    lines += [
        "",
        "tabs (REPD technology types) : %d" % len(counts),
        "projects                     : %d" % len(rows),
        "capacity                     : %.2f GW" % (sum(r["c"] for r in rows) / 1000),
        "dropped, no coordinates      : %d" % skipped,
        "spine types excluded         : %s" % ", ".join(sorted(SPINE_TYPES)),
    ]
    return "\n".join(lines)


def page_html(rows):
    """Pipeline News' own markup and stylesheet; only the scope differs."""
    counts = Counter(row["rt"] for row in rows)
    total_gw = sum(row["c"] for row in rows) / 1000
    colours = json.dumps(FAMILY_COLOUR, separators=(",", ":"))

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PipelineNews | Wider Fleet</title>
<link rel="stylesheet" href="{PN_RELEASE}assets/202608270055-v8-fast.css">
<link rel="stylesheet" href="{PN_RELEASE}assets/202608272048-orientation.css">
</head><body>

<aside class="sidebar">
  <div class="brand">
    <b>GLOBALGRID2050</b>
    <small>UK RENEWABLES PIPELINE &middot; WIDER FLEET &middot; REPD TECHNOLOGY TYPES OUTSIDE THE SPINE</small>
  </div>
  <button class="release-menu-opener" type="button" popovertarget="releaseMenu"
          popovertargetaction="toggle" aria-controls="releaseMenu">RELEASES</button>
  <nav class="nav nav-mobile" id="releaseMenu" popover="auto" aria-label="Release links">
    <a href="{PN_RELEASE}">&#9666; PIPELINE NEWS &middot; SOLAR &middot; WIND &middot; BESS (UNCHANGED)</a>
    <a class="active" href="#">WIDER FLEET</a>
  </nav>
</aside>

<main class="main">
  <div class="header">
    <h1>WIDER FLEET &middot; THE REST OF THE RENEWABLE ENERGY PLANNING DATABASE</h1>
    <div class="status" id="hdrStatus">&#9679; {len(rows):,} PROJECTS &middot; {len(counts)} REPD TECHNOLOGY TYPES &middot; {total_gw:.2f} GW &middot; SPINE UNTOUCHED</div>
  </div>

  <div class="meta">
    <strong>ADDITIVE PAGE &middot; SEPARATE FROM THE PIPELINE SPINE &middot; NOTHING IN THE EXISTING RELEASE IS READ, REWRITTEN OR REFILTERED</strong>
    <span>Same source, same layout. The DESNZ REPD carries 24 technology types; the pipeline spine admits four of them as its four tabs. This page gives the remaining {len(counts)} the same treatment &mdash; one tab each, under the REPD's own name, nothing merged.</span>
    <span class="release-meta">Cut from the same REPD extract the spine is cut from. No new fetcher and no second register: repd_updaterv8.py + config/registry.yaml already read this CSV and already classify every one of these types.</span>
    <a href="https://www.gov.uk/government/publications/renewable-energy-planning-database-quarterly-extract"
       target="_blank" rel="noopener">DESNZ Renewable Energy Planning Database &mdash; quarterly extract</a>
  </div>

  <h2 class="section-title">WIDER FLEET ANALYTICS</h2>
  <div class="gauges" id="gauges"></div>
  <div class="filters" id="tech"></div>

  <div class="filters" id="status">
    <button class="btn active" data-official-status="All" aria-pressed="true">ALL STATUS</button>
    <button class="btn" data-official-status="operational" aria-pressed="false">OPERATIONAL</button>
    <button class="btn" data-official-status="under construction" aria-pressed="false">CONSTRUCTING</button>
    <button class="btn" data-official-status="awaiting construction" aria-pressed="false">AWAITING</button>
    <button class="btn" data-official-status="application submitted" aria-pressed="false">SUBMITTED</button>
  </div>

  <div class="meta">
    <span>Capacity and status are the REPD's own fields, carried unchanged. County, town, postcode and the GlobalGrid reference are spine joins and are shown as &mdash;: this register cut does not carry them, and inventing them would be the one thing this page must not do.</span>
  </div>

  <div class="tablewrap">
    <table>
      <thead><tr>
        <th>SITE NAME</th>
        <th class="hide-mobile">COUNTY</th>
        <th class="hide-mobile">TOWN</th>
        <th class="hide-mobile">POSTCODE</th>
        <th class="hide-mobile">OPERATOR</th>
        <th>TECHNOLOGY</th>
        <th>OFFICIAL REPD STATUS</th>
        <th class="sortable-heading">OFFICIAL CAPACITY &#9660;</th>
        <th class="hide-mobile">REPD REF</th>
        <th class="hide-mobile">GLOBALGRID REF</th>
        <th>ACTIONS</th>
      </tr></thead>
      <tbody id="rows"></tbody>
    </table>
  </div>

  <div id="projectWindowControls" class="project-window-controls">
    <button type="button" data-window="previous" disabled>PREVIOUS 50</button>
    <span data-window-range>&mdash;</span>
    <button type="button" data-window="next">NEXT 50</button>
  </div>
</main>

<script>
var COLOUR={colours};
var ALL=[],tech='all',stat='All',page=0,PAGE=50;
function esc(s){{return String(s==null?'':s).replace(/[&<>"]/g,function(c){{
  return {{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}}[c];}});}}
function num(n){{return n.toLocaleString('en-GB',{{maximumFractionDigits:2}});}}
function filtered(){{return ALL.filter(function(r){{
  return (tech==='all'||r.rt===tech)&&(stat==='All'||r.s===stat);}});}}

/* One tab per REPD technology type, biggest first -- the same shape as the
   spine's ALL TECH / SOLAR / BATTERY / ONSHORE / OFFSHORE row. Built from the
   register, so a new REPD type appears on its own without an edit here. */
function buildTabs(){{
  var count={{}};
  ALL.forEach(function(r){{count[r.rt]=(count[r.rt]||0)+1;}});
  var html='<button class="btn active" data-technology="all" aria-pressed="true">ALL WIDER</button>';
  Object.keys(count).sort(function(a,b){{return count[b]-count[a];}}).forEach(function(t){{
    html+='<button class="btn" data-technology="'+esc(t)+'" aria-pressed="false">'
      +esc(t.toUpperCase())+'</button>';}});
  document.getElementById('tech').innerHTML=html;
}}

function render(){{
  var f=filtered(),mw=0,big=0,i;
  for(i=0;i<f.length;i++){{mw+=f[i].c;if(f[i].c>big)big=f[i].c;}}
  var types={{}};for(i=0;i<f.length;i++)types[f[i].rt]=1;
  var g=[['FILTERED CAPACITY (MW)',num(+mw.toFixed(2))],
    ['FILTERED PROJECTS',num(f.length)+' \\u00b7 '+Object.keys(types).length+' REPD TYPES'],
    ['LARGEST SINGLE SITE (MW)',num(big)]];
  document.getElementById('gauges').innerHTML=g.map(function(kv){{
    return '<div class="card"><h3>'+kv[0]+'</h3><div class="chart">'+kv[1]+'</div></div>';}}).join('');
  var max=Math.max(0,Math.ceil(f.length/PAGE)-1);if(page>max)page=max;
  document.getElementById('rows').innerHTML=f.slice(page*PAGE,page*PAGE+PAGE).map(function(r){{
    return '<tr>'
    +'<td class="site">'+esc(r.n)+'<div class="project-meta">'+esc(r.rt)+'</div></td>'
    +'<td class="hide-mobile">&mdash;</td><td class="hide-mobile town-cell">&mdash;</td>'
    +'<td class="hide-mobile reference-cell">&mdash;</td>'
    +'<td class="hide-mobile">'+esc(r.o||'\\u2014')+'</td>'
    +'<td><span class="badge" style="background:'+(COLOUR[r.t]||'#888')+';color:#04080a">'+esc(r.rt)+'</span></td>'
    +'<td>'+esc(r.s)+'</td><td class="mw">'+num(r.c)+' MW</td>'
    +'<td class="hide-mobile reference-cell repd-ref">&mdash;</td>'
    +'<td class="hide-mobile reference-cell globalgrid-ref">&mdash;</td>'
    +'<td><a class="btn" target="_blank" rel="noopener" href="{ATLAS}?project='
      +encodeURIComponent(r.n)+'&technology='+encodeURIComponent(r.t)+'&capacity_mw='+r.c
      +'&latitude='+r.ll[1]+'&longitude='+r.ll[0]+'&zoom=12">MAP \\u2197</a></td></tr>';}}).join('');
  document.querySelector('[data-window-range]').textContent=
    f.length?((page*PAGE+1)+'\\u2013'+Math.min(f.length,page*PAGE+PAGE)+' of '+num(f.length)):'0 of 0';
  document.querySelector('[data-window="previous"]').disabled=page<=0;
  document.querySelector('[data-window="next"]').disabled=page>=max;
}}

function wire(id,attr,set){{
  document.getElementById(id).addEventListener('click',function(e){{
    var b=e.target.closest('button');if(!b)return;
    var all=e.currentTarget.querySelectorAll('button');
    for(var i=0;i<all.length;i++){{all[i].classList.remove('active');all[i].setAttribute('aria-pressed','false');}}
    b.classList.add('active');b.setAttribute('aria-pressed','true');
    set(b.dataset[attr]);page=0;render();}});}}
wire('tech','technology',function(v){{tech=v;}});
wire('status','officialStatus',function(v){{stat=v;}});
document.getElementById('projectWindowControls').addEventListener('click',function(e){{
  var b=e.target.closest('button');if(!b)return;
  page+=b.dataset.window==='next'?1:-1;render();window.scrollTo({{top:0,behavior:'smooth'}});}});

fetch('wider-fleet.json').then(function(r){{return r.json();}}).then(function(rows){{
  ALL=rows;buildTabs();render();
}}).catch(function(e){{
  document.getElementById('hdrStatus').textContent='\\u25cf REGISTER UNAVAILABLE \\u2014 '+e.message;}});
</script>
</body></html>
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--register", required=True,
                        help="repd_master.json produced by repd_updaterv8.py")
    parser.add_argument("--out", required=True, help="output directory")
    parser.add_argument("--min-types", type=int, default=15,
                        help="fail the build below this many technology types")
    args = parser.parse_args()

    rows, skipped = load_rows(args.register)
    if not rows:
        sys.exit("no wider-fleet rows: register empty, or every type is in the spine")

    types = len({row["rt"] for row in rows})
    if types < args.min_types:
        sys.exit("only %d technology types, expected at least %d -- "
                 "the register or the spine boundary has moved"
                 % (types, args.min_types))

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "wider-fleet.json"), "w", encoding="utf-8") as handle:
        json.dump(rows, handle, separators=(",", ":"))
    with open(os.path.join(args.out, "wider-fleet.html"), "w", encoding="utf-8") as handle:
        handle.write(page_html(rows))
    text = report(rows, skipped)
    with open(os.path.join(args.out, "wider-fleet-report.txt"), "w", encoding="utf-8") as handle:
        handle.write(text + "\n")
    print(text)


if __name__ == "__main__":
    main()
