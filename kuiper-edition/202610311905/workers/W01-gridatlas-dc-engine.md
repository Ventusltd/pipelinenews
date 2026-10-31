# W01 gridatlas-dc-engine
HEADS: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e (shallow clone: `git rev-parse --is-shallow-repository` = true; `git rev-list --count HEAD` = 311)
READ:
tools/offtakers/src/00-header.js .. 07-panel-install.js (all nine; 06b-dc-engine.js, 01-data.js, 06-tap-card.js in full)
tools/offtakers/build.mjs
tools/offtakers/generations.json
tools/offtakers/filter/OFFTAKERS-FILTER.md, run_log.txt, ot_filter.py (grep of defs, hashes, radii)
data/uk_datacentre_pipeline_202610292136.geojson (jq only: counts, metadata, status classes; never printed whole)
tools/scope/lib.mjs (lines 95-140), tools/scope/loop.mjs (lines 186-200)
tools/proofs/offtakers-cartridge.mjs (lines 1-80), tools/proofs/202610292044-uk-offtakers-overlay.proof.mjs
tools/ci/offtakers/overlay-offtakers.test.mjs (lines 1-120, 345-520, by grep), tools/ci/offtakers/browser-dc-smoke.mjs (grep)
tools/lightning/src/08-map.js (lines 118-126)
atlas/current.json (lines 1-21, 700-780, 860-890)
atlas/cartridges/202609241334-sld-sandbox-v9-8.js (lines 1-186, 1555-1680, 3295-3306, 3484-3590)
atlas/cartridges/202609062358-substation-intelligence-v9-63.js (lines 50-62, 1655-1682, 1774-1780)
atlas/modules/202609011950-geodesy.js (lines 1-60)
docs/OFFTAKERS-SOURCE.md (lines 25-75)
tools/ci/lightning/overlay-engine.test.mjs (grep: placeholder coordinate)
git log / git show on the commits named under History

Written 2026-10-31T19:14:25Z by W01. Read only: no checkout, fetch or edit in the clone (`git status --porcelain` empty
before and after). Three read-only executions were made inside the clone, each verified to write nothing:
- `node tools/offtakers/build.mjs --check` -> `ok   202610292044: 71191 B sha256 e4d3fb288ef0ac3782f50f53dae9ebeb8564ca65e220d7b24f755179be7fb30a rebuilt byte for byte` (three older generations reported `hist`).
- `node tools/proofs/202610292044-uk-offtakers-overlay.proof.mjs` -> `... (71191 B <= 80000), rebuilt from source; after uk-lightning-overlay; loader v2; 6 scripts composed, every other cartridge unchanged. PASS`
- `OFFTAKERS_MODULE=atlas/modules/202610292044-uk-offtakers-overlay.js LIGHTNING_MODULE=atlas/modules/202610291043-uk-lightning-overlay.js node --test tools/ci/offtakers/overlay-offtakers.test.mjs` -> `# tests 30 / # pass 30 / # fail 0` (DC1..DC11 included).

### The Grid Engine 30/30/30, exactly as the code states it (summary; every clause is keyed in the findings below)
A tap on a data-centre dot (class `c`) opens `dcc` instead of the ordinary offtaker card `oc` (F10). It lists three sets,
each of 30, measured as straight-line haversine distance from the site point (F4):
1. **30 substations** (>= 33 kV, the list the sld-sandbox loads): the engine's own Grid Finding Scope, `gridScope.scope`
   with `bandsKm:[40]` and `nearestCount: subs.length`, so every mapped substation within 40 km, sorted; then the first
   30 for the chosen voltage band (All / 400 / 275 / 132 / 33-66 kV). A voltage chip re-ranks from the whole 40 km scope,
   not from the 30. The original `nearestSubstations` (fixed at 5) is still called and must equal the first 5 (F2, F3).
2. **30 REPD sites** within 40 km: the same register and the same grouping (points within about 10 m grouped) as the
   ordinary card's 15, now `n = 30`, **ties at the 30th kept** (so a list can be longer than 30) (F2).
3. **30 conventional power sites** (DC-A6 pinned file, else the power-station class): **always the nearest 30 at any
   distance**, listed with km; lines are drawn only to sites within **100 km** (`R100`) (F5).
Ten of each set are drawn first (`D10`), "Show all" / "Draw all" reveal the rest; the Area tab counts within 5/10/20 km
from the full scans, never capped at 30 (F17). "Offtaker categories": the overlay's classes are A Industry, B Power
stations, C Data centres, D Water (large), s Water (listed, small), E Campus/CHP; only C fires the 30/30/30, every other
class keeps 15 REPD + 5 substations (F1). Connection MW vs IT MW: the site record carries IT load, grid connection and an
unlabelled MW as three separate nullable numbers, never summed or derived; the dot is sized by IT load, else grid
connection, never by the unlabelled figure (F6, F7).

### Site counts by status (data/uk_datacentre_pipeline_202610292136.geojson, sha256 176c1b2e...2d89 = the pin DCFSHA)
- `jq '.features|length' data/uk_datacentre_pipeline_202610292136.geojson` -> **227**
- `jq -r '.features[].properties.status | tostring' data/uk_datacentre_pipeline_202610292136.geojson | sort | uniq -c | sort -rn`
  -> **operational 202, announced 12, in_planning 8, consented 4, unknown 1** (sum 227; equals the file's own
  `metadata.summary.by_status`).
- Mappable: `jq -r '.features[] | select(.geometry!=null) | .properties.status' ... | sort | uniq -c` -> operational 202,
  announced 12, in_planning 6, consented 4, unknown 1 = **225**. The two unplaced records are both `in_planning` with
  `location.lat/lon = null` (ids dcuk-2777e64d19a4ac41, dcuk-bf4650ea1c4a8a0b).
- A jq replica of the module's schema gate `dn()`/`OKR` (id regex, 1-50 sources each under an open licence and not NC/ND,
  UK bounding box, string status) passes **225** of 227; licences seen: `ODbL-1.0` x228 source entries, `OGL-UK-3.0` x30.
- MW stated (jq over `it_load_mw.value`, `grid_connection_mw.value`, `unclassified_mw.value`): IT load 5, grid connection 2,
  both 1, **neither 221**, unclassified 8. `site_kind` is null on all 227 (the 12 cable landing stations were rejected
  upstream: `metadata.summary.rejects_by_reason`).

## Findings (keyed)

### F1 The three thirties are named constants, beside the 40 km and 15 they extend
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/01-data.js:4-7
QUOTE:
```js
GEN='@@GEN@@',TMO=15000,TOE='timeout after 15 s',R40=40,NR=15,
/// DC-B1 (#73 steps 7-8): a data-centre tap lists 30 substations, 30 REPD sites and 30 conventional power sites (R100 km);
/// labels on the map only for the nearest DL of each set
N3=30,R100=100,DL=5,
```
WHY: The whole release ("Grid Engine 30/30/30", v9.187) reduces to `N3=30` and `R100=100`, set next to `R40=40` and
`NR=15` (the ordinary card's 15 REPD sites). One number per rule, one place to change it. Lines starting `///` are
source-only and are dropped by the build (build.mjs header), so the rule's prose lives in the source and not in the
shipped bytes. Note `DL=5` is declared and never read (see F18).
PATTERN: named rule constants; source-only commentary stripped at build

### F2 The three lists: band re-ranking from the whole scope, REPD ties kept, conventional uncapped by distance
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:58-60
QUOTE:
```js
/// the lists for the chips: substations by voltage band (re-ranked from the whole scope), REPD by status
sets=c=>{c.k=(c.sc||[]).filter(e=>VK(e.kv,c.vb)).slice(0,N3);c.P=c.all?sites(c.all,{st:c.rst,te:'all'},N3).P:null;c.cv=c.cva?c.cva.slice(0,N3):null;
 let D=(v,q)=>q?c.sh[v]?q.length:MN(D10,q.length):0;c.nd={s:D('s',c.k),r:D('r',c.P),v:c.cv?c.cv.slice(0,D('v',c.cv)).filter(o=>o.km<=R100).length:0}},
```
WHY: This is the 30/30/30 in two lines. Substations: filter the full 40 km scope by voltage band, then take 30 (so the
275 kV chip reaches past the 30 of "All"; test DC2 asserts this). REPD: `sites(...,N3)` (04-repd-record-m5.js:26-28 keeps
every group tied at the 30th distance: `i<n||g.km==a[n-1].km`). Conventional: `slice(0,N3)` of a list sorted by
distance with no radius at all; `c.nd.v` counts only those `<=R100` for drawing. `D10` = first 10 drawn.
PATTERN: list = sort, filter, cap; ties kept at the cap

### F3 Substations come from the engine's own scope, and the original 5 must be its head
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:50-52
QUOTE:
```js
 let t0=PN(),mp=S.kas===subs?S.kam:(S.kas=subs,S.kam=new Map(subs.map(s=>[s.at,s])));
 try{c.sc=GS.scope([x,y],subs,{bandsKm:[40],nearestCount:subs.length}).nearest;for(let e of c.sc)e.kva=(mp.get(e.at)||{}).kv}catch(e){note('scope: '+msg(e));c.sc=[];c.ks='Substation data unavailable.'}
 try{let o=M.nearestSubstations(x,y,subs);c.by=o.beyondRadiusNearest;if(o.some((a,i)=>!c.sc[i]||a.km!==c.sc[i].km||a.at!==c.sc[i].at))note('scope head differs from nearestSubstations')}catch(e){note('nearest: '+msg(e))}
```
WHY: The original `link.measure.nearestSubstations` is fixed at `LINK_COUNT = 5` (sld-sandbox :1664, a closure constant;
the header's citation `:1664, :3513` resolves exactly in the live cartridge). Rather than fork the measure, the engine
calls the engine's Grid Finding Scope with its count and radius as parameters, then calls the original anyway and notes
any disagreement in `S.errors`. Two independent paths must agree on the first five on every tap: a parity check that runs
in production, not only in CI. `beyondRadiusNearest` keeps "nearest beyond 40 km" for the empty case.
PATTERN: reuse the incumbent, assert parity at run time

### F4 Haversine on one radius, atan2 form, pinned for parity to the last bit
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/202609062358-substation-intelligence-v9-63.js:1659-1666
QUOTE:
```js
  const EARTH_RADIUS_KM = 6378.137;
  const DEG = Math.PI / 180;

  function distanceKm(lon1, lat1, lon2, lat2) {
    const dLat = (lat2 - lat1) * DEG;
    const dLon = (lon2 - lon1) * DEG;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2;
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/202609062358-substation-intelligence-v9-63.js:1674-1679
QUOTE:
```js
       7.050150827184836 shipped, 7.050150827184837 from the module. It is
       1e-15 km and changes no figure any reader will ever see - and it is
       still wrong, because the claim being made is PARITY. A module that is
       nearly the incumbent is a module that has to be argued about every
       time a digit differs. */
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
```
WHY: This is the served `NS.geodesy` (registered at :1774 of the live substation-intelligence cartridge, which loads
before sld-sandbox; same text as atlas/modules/202609011950-geodesy.js:21-41). `gridScope.scope` calls
`geodesy.distanceKm` (sld-sandbox :107-108), `measure.distanceKm` delegates to it (sld-sandbox :3299-3301), so all three
30-lists measure on R = 6378.137 km. The comment refuses even a 1e-15 km difference because "the claim being made is
PARITY". The DC test uses an independent asin-form haversine on the same radius (overlay-offtakers.test.mjs:50) and DC2
passes, so the two forms agree to the 2 decimals shown.
PATTERN: one geodesy; parity over "close enough"

### F5 Conventional: always the nearest 30, any distance; lines only to 100 km
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:7-9
QUOTE:
```js
/// REPD: the same register and grouping as the 15 (RG, near, sites), 30 within 40 km, ties kept.
/// Conventional (owner via lead, 29 Oct 20:05 UTC): ALWAYS the nearest 30, any distance, listed with km; lines are
/// drawn only up to R100 km and the card says so.
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:120
QUOTE:
```js
 (c.cv||[]).slice(0,c.sh.v?N3:D10).forEach((v,i)=>v.km<=R100&&add('v',v.q.a,i,v.km,`${CT(v.q)}${v.q.mw?' '+N(v.q.mw)+' MW':''} · ${k2(v.km)} km`));c.G=G;
```
WHY: An owner decision (timed in the source, "29 Oct 20:05 UTC") is encoded as an asymmetry: substations and REPD stop at
40 km, conventional never does, so a remote site still gets 30 power stations listed with km (test DC4 asserts the 30th is
beyond 100 km) while the map draws only `v.km<=R100`. The card text says so (06b :83).
PATTERN: list everything, draw within reach, say which

### F6 IT load, grid connection and an unlabelled MW: three nullable numbers, never 0, never summed
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/01-data.js:70-73
QUOTE:
```js
/// a data centre's MW figures, kept apart (IT load, grid connection, unlabelled); null = not stated, never 0
DMW=p=>{let v=o=>o&&typeof o=='object'&&typeof o.value=='number'&&o.value>0&&o.value<=1e4?o.value:null;return{it:v(p.it_load_mw),gc:v(p.grid_connection_mw),un:v(p.unclassified_mw)??v(AI(p.mw_unclassified)&&p.mw_unclassified[0])}},
/// size: IT load, else grid connection; never an unlabelled MW (it may be a battery or an energy centre)
DZ=w=>{let v=w.it??w.gc;return v==null?1:v>=200?2:v>=50?1.6:v>=10?1.25:1},
```
WHY: `v()` returns a number only when it is a positive finite value <= 10,000 MW; anything else is `null`, "not stated".
`??` (not `||`) picks IT load, else grid connection, for the dot size only; the unclassified MW (it may be a battery) is
never used. Test DC11 proves Manor Farm (Slough) is sized 1.6 by its 72 MW IT load, not its 100 MW battery, and that 172,
212 or 243 MW (sums) never appear. In the pinned file 221 of 227 sites state neither figure, so this rule governs almost
every dot.
PATTERN: unknown is null, not zero; no derived quantities

### F7 The card's MW line: four honest cases, and the sentence "Not stated is unknown, not zero."
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:24-25
QUOTE:
```js
/// the site record (DC-B2 §7): IT load and grid connection apart, never summed or derived; unknown is not zero
MWL=w=>w.it!=null&&w.gc!=null?`IT load ${N(w.it)} MW · grid connection ${N(w.gc)} MW`:w.it!=null?`IT load ${N(w.it)} MW · grid connection not stated`:w.gc!=null?`Grid connection ${N(w.gc)} MW · IT load not stated`:'IT load and grid connection not stated',
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:35-36
QUOTE:
```js
 L(dv,'IT load is what the computing equipment draws. Grid connection is the import capacity agreed with the network operator, which also covers cooling and losses. Neither is derived from the other here.','color:#8b9aa1');
 if(w.it==null||w.gc==null)L(dv,'Not stated is unknown, not zero.','color:#8b9aa1');
```
WHY: IT load (what the computing equipment draws) and grid connection (import capacity, which also covers cooling and
losses) are defined on screen and kept apart in all four combinations. The same rule reaches the CSV (06b :158-165:
`M=v=>v==null?'not stated':v`, header "Never added together") and test DC5 asserts the site's IT-load cell is
`'not stated', 'IT load not stated, never 0'` (overlay-offtakers.test.mjs:463).
PATTERN: unknown is null, not zero; definitions on the surface

### F8 The 80,000-byte budget gate: one owner number, enforced in two independent places
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/lib.mjs:114-119
QUOTE:
```js
export const CARTRIDGE_BYTE_BUDGETS = Object.freeze({
  'uk-lightning-overlay': 64_781,
  // Owner approval, 29 Oct 2026, issue #73: raise the potential-offtakers
  // module budget to 80,000 B for the data-centre 30/30/30 engine.
  'uk-offtakers-overlay': 80_000
});
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/scope/loop.mjs:196-198
QUOTE:
```js
      if (Object.hasOwn(CARTRIDGE_BYTE_BUDGETS, id)) {
        invariant(fs.statSync(cartridgePath).size <= CARTRIDGE_BYTE_BUDGETS[id], `${id}: cartridge exceeds its own ${CARTRIDGE_BYTE_BUDGETS[id]}-byte budget (tools/scope/lib.mjs CARTRIDGE_BYTE_BUDGETS)`);
      }
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/proofs/offtakers-cartridge.mjs:45
QUOTE:
```js
  assert.ok(module.length <= BUDGET && module.length <= CARTRIDGE_BYTE_BUDGETS[OFFTAKERS_ID], `${module.length} B over the ${BUDGET}-byte budget`);
```
WHY: `loop.mjs lint` fails any cartridge over its own entry in a frozen table; the generation proof additionally requires
`module.length <= BUDGET` (its own constant, offtakers-cartridge.mjs:21) AND `<=` the table, so changing one place is
not enough. The module is 71,191 B (`atlas/current.json:725-726`: `"bytes": 71191`, `"byte_budget": 80000`); it grew from
39,633 B at 202610291044 (`ls -la atlas/modules/*offtakers*`). The ceiling was 40,000 B, then 72,000 B "PROPOSED ... an
owner decision before any release", then 80,000 B by the owner's commit 465d247 (see History).
PATTERN: budget as an owner-signed invariant, checked twice

### F9 Pinned, capped, hashed: nothing is parsed before SHA-256 matches
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/01-data.js:54-58
QUOTE:
```js
/// the pinned open data: XMLHttpRequest (the original bridge does not hook it), same timeout and redirect rules, then SHA-256 against the pin
gx=(u,h,cap=DCAP)=>new Promise((res,rej)=>{AL(u);S.requests++;let x=new XMLHttpRequest();x.open('GET',u);x.responseType='arraybuffer';x.timeout=TMO;
 x.onload=()=>x.status>=200&&x.status<300?x.responseURL&&!x.responseURL.startsWith(u)?rej(new Error('redirected')):res(x.response):rej(new Error('HTTP '+x.status));
 x.onerror=()=>rej(new Error('network error'));x.ontimeout=()=>rej(new Error(TOE));x.onprogress=e=>{if(e.loaded>cap){x.abort();rej(new Error('data check failed (size)'))}};x.send()})
 .then(async b=>{let s=W.crypto&&W.crypto.subtle;if(!(b.byteLength<=cap))E('data check failed (size)');if(!s)E('data check failed (no WebCrypto)');if(hex(await s.digest('SHA-256',b))!==h)E('data check failed (SHA-256 differs from the pin)');return JSON.parse(new TextDecoder().decode(b))}),
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/01-data.js:19
QUOTE:
```js
DCF='https://ventusltd.github.io/gridatlas/data/uk_datacentre_pipeline_202610292136.geojson',DCFSHA='176c1b2e894943618c1dd866b3a96c9f3e00bcded8c6e88a5263b0048ae22d89',
```
WHY: The data-centre file is fetched only from an allow-listed same-site URL (`AL`, :22), aborted on progress past the cap,
refused on redirect, refused if WebCrypto is missing, and refused unless its SHA-256 equals the pin compiled into the
module. `sha256sum` of the committed file gives 176c1b2e...2d89, equal to `DCFSHA`, and the proof re-hashes it
(offtakers-cartridge.mjs, site_data_sources loop). Fail closed, with a named reason.
PATTERN: fail closed on hash; byte cap before parse

### F10 How a tap claims an offtaker
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06-tap-card.js:75-78
QUOTE:
```js
/// map tap: decided after every click handler of this tap has run, so an offtaker hit wins over a lightning card opened by the same tap
/// the hit is decided at once and the tap claimed (e.gridatlasClaim), so the lightning overlay leaves it alone (R-taps MAJOR);
/// the card is drawn after every click handler of this tap has run
tap=e=>{if(!S.on)return;let f=th(e);if(f)try{e.gridatlasClaim='offtakers'}catch(_){}setTimeout(()=>{try{tq(e,f)}catch(x){note('tap: '+msg(x))}},0)},
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/lightning/src/08-map.js:121-124
QUOTE:
```js
    /// a tap another overlay owns (a potential-offtakers dot under it, or a tap it has claimed) is not this module's: no card
    /// change, no cell tap and no REPD layer hand-over, so a layer this module switched on is never given to the reader by a tap
    /// it did not handle (R-taps MAJOR: Drax with both overlays on left bess ticked after both were OFF).
    if(e.gridatlasClaim||m.getLayer(OTH)&&m.queryRenderedFeatures(e.point,{layers:[OTH]}).length)return;///
```
WHY: The hit test `th()` runs synchronously and, if a dot is under the finger, stamps `e.gridatlasClaim='offtakers'` on the
shared MapLibre event; the card is drawn later (`setTimeout 0`), after every other click handler has seen the stamp. The
lightning overlay returns on any claimed tap, whichever registered first (test T13b runs both orders). `tq()` then routes
`f.k=='c'` to `dcc` (the 30/30/30 card) and everything else to `oc` (06-tap-card.js:86). A cooperative, one-field lock
between independently shipped cartridges, born of a real defect ("Drax with both overlays on left bess ticked").
PATTERN: synchronous claim, deferred render

### F11 Schema gate: skipped and counted, never repaired; two unplaced records stay unplaced
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/01-data.js:79-89
QUOTE:
```js
/// schema checks (DC-A4 / DC-A7 data centres, DC-A6 conventional sites), at most PMAX each: an id, a name or none, a UK point (the
/// geometry, else location lon/lat) and 1-50 sources, each under a fully open licence (#73 rule) or a cited fact;
/// anything else is skipped and counted, never repaired. Cable landing stations are not data centres here (DC-B3).
OPL=/^(OGL|ODbL|CC[ -]?BY|CC0|PDDL|public[ -]domain|Open[ -]Parliament|cited fact)/i,
/// (non-commercial or no-derivatives terms are not fully open, whatever the prefix)
SRCS=p=>AI(p.sources)&&p.sources.length&&p.sources.length<=50&&p.sources.every(s=>s&&typeof s=='object'&&OPL.test(s.licence)&&!/\b(NC|ND)\b|non-?commercial|no.?deriv/i.test(s.licence)),
OKR=(p,c)=>p&&typeof p=='object'&&(p.name==null||typeof p.name=='string')&&/^[\w-]{1,40}$/.test(p.id)&&SRCS(p)&&okPt(c),
dn=fs=>{let o=[],bad=MX(0,fs.length-PMAX),cl=0;for(let f of fs.slice(0,PMAX)){let p=f&&f.properties,l=p&&p.location||{},g=f&&f.geometry,c=g&&g.type==='Point'?g.coordinates:[l.lon,l.lat];
  if(p&&p.site_kind==='cable_landing_station'){cl++;continue}if(!OKR(p,c)||typeof p.status!='string'){bad++;continue}
  o.push({k:'c',t:DSK(p.status),z:DZ(DMW(p)),n:p.name,op:typeof p.operator=='string'?p.operator:null,sub:'data centre',a:c.slice(0,2),p,dc:1})}
 return{o,bad,cl}},
```
WHY: A record without a UK point, an id, an open licence (NC/ND rejected whatever the prefix) or a string status is
counted in `bad`, and the status line prints "N skipped" (07-panel-install.js:17). The two `in_planning` records with
null coordinates are not geocoded to anything: the browser smoke test asserts `n,225,'227 source records, of which two
planning sites have unknown coordinates and must not be mapped'` (browser-dc-smoke.mjs:67). My jq replica of this gate
passes exactly 225, matching `current.json:771-772` (`"features": 227`, `"drawn": 225`).
PATTERN: refuse and count; no silent repair

### F12 Unknown status is its own class, not a default to "operational"
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/01-data.js:29-31
QUOTE:
```js
/// data centres: their own palette (violet), chip row and legend; the ring is the status (pipeline vocabulary, #73 step 3)
DST={op:['Operational','#39d98a'],uc:['Under construction','#ffc400'],co:['Consented','#40c4ff'],pl:['In planning','#ff8a3d'],cr:['Connection request','#ff4fd8'],an:['Announced','#e6e6e6'],rw:['Refused/withdrawn','#a05252'],un:['Status not stated','#6b7a8f']},DK=Object.keys(DST),
DSK=s=>{let o={operational:'op',under_construction:'uc',consented:'co',in_planning:'pl',connection_request:'cr',announced:'an',refused_or_withdrawn:'rw'};return Object.hasOwn(o,s)?o[s]:'un'},
```
WHY: Seven pipeline statuses are recognised by own-key lookup (`Object.hasOwn`, so `"__proto__"` or `"constructor"`
cannot match); anything else, including the pinned file's one `unknown` (Woodlands Park, Iver), becomes `un`
"Status not stated" with its own grey ring. The card adds "A pipeline entry is not a commitment" for anything not `op`
(06b :34).
PATTERN: closed vocabulary with an explicit unknown

### F13 An unknown location is not a place: the OSGB (0,0) placeholder is dropped from the REPD register
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/03-repd-register.js:4
QUOTE:
```js
 let o=f.map(x=>{try{let a=M.representativePoint(x.geometry);if(a[0]===+a[0]&&a[1]===+a[1]&&!(a[0]==-7.55716&&a[1]==49.766807))return[a,x.properties||{}]}catch(_){}return[]}).filter(([a,p])=>a&&M.isProjectTech(p.tech));
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/ci/lightning/overlay-engine.test.mjs:1319
QUOTE:
```js
const BLOB = [-7.55716, 49.766807]; // REPD placeholder coordinate (OSGB 0,0) carried by 18 records with no real location
```
WHY: REPD rows with no real location carry the projected origin of the British National Grid, a point in the sea west of
Scilly. Left in, a data-centre tap anywhere in Cornwall would list phantom "nearest REPD sites". The register used by the
30 REPD list excludes exactly that coordinate, and the same line exists in tools/lightning/src/12-repd.js:17.
PATTERN: sentinel values are not data

### F14 Byte-for-byte rebuild of the shipped module from readable source, or the gate fails
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/build.mjs:37-45
QUOTE:
```js
  for (const g of listed) {
    const file = modulePath(g);
    if (!fs.existsSync(file)) { bad.push(`${g}: ${path.relative(ROOT, file)} missing`); continue; }
    if (reg.generations[g].historical) { lines.push(`hist ${g}: historical, built from ${reg.generations[g].historical}; not rebuilt from the current source`); continue; }
    const want = fs.readFileSync(file); let got;
    try { got = Buffer.from(build(g), 'utf8'); } catch (e) { bad.push(`${g}: source does not assemble: ${e.message}`); continue; }
    if (got.equals(want)) lines.push(`ok   ${g}: ${want.length} B sha256 ${sha256(want)} rebuilt byte for byte`);
    else { let i = 0; while (i < got.length && i < want.length && got[i] === want[i]) i++; bad.push(`${g}: rebuild differs from the committed module at byte ${i}`); }
  }
```
WHY: The 167-line `06b-dc-engine.js` is not a sketch of what ships: `--check` reassembles every listed generation and
reports the first differing byte. Run in this session: `ok 202610292044: 71191 B sha256 e4d3fb28...b30a rebuilt byte for
byte`, equal to `atlas/current.json:724`. Generations the source has moved past are kept as `"historical": "<commit>"`
(generations.json:4-15), and the newest may never be historical (build.mjs:35).
PATTERN: reproducible build; source is the artefact

### F15 The vicinity CSV: "not stated", formula-safe cells, hard row and byte caps
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:164-167
QUOTE:
```js
 let s=[`# GridAtlas data-centre vicinity sheet · generation ${GEN} · site ${id} ${NM(r).replace(/[\r\n]/g,' ')} · point ${x},${y} · ${new Date().toISOString()}`,'# Straight-line distances from the site point. Not cable routes, capacity, headroom, connection offers or feasibility.',
  `# Site: IT load ${w.it!=null?w.it+' MW':'not stated'} · grid connection ${w.gc!=null?w.gc+' MW':'not stated'}. Never added together. A pipeline entry is not a commitment.`,'# MW columns are installed capacity as each source states it, not export or connection capacity. "not stated" is unknown, not zero.',
  'set,rank,name,ref,type_or_voltage,status,kv_max,kv_all,mw_stated,mw_basis,km_straight_line,lon,lat,drawn_on_map,source,licence,data_date'].join('\n')+'\n',k=0;
 for(let o of rows){let l=o.map(cq).join(',')+'\n';if(++k>400||s.length+l.length>256e3){s+=`# truncated at ${k>400?'400 rows':'256 kB'}\n`;break}s+=l}return s},
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06-tap-card.js:58-59
QUOTE:
```js
/// a cell: Cf stripped; a text starting = + - @ TAB or CR gets a leading apostrophe (no formula), numbers stay numbers; quoted on " , CR LF # (R-otsec ORS5)
cq=v=>{let s=v==null?'':String(v).replace(/\p{Cf}/gu,'');if(typeof v!='number'&&/^[=+\-@\t\r]/.test(s))s="'"+s;return/[",\r\n#]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s},
```
WHY: The exported sheet carries the caveats in its first four lines, writes "not stated" for unknown MW, stops at 400 rows
or 256 kB and says it truncated, and passes every cell through `cq`, which defuses spreadsheet-formula injection
(`= + - @ TAB CR`) while leaving numbers as numbers.
PATTERN: export with caveats inline; budgeted output; CSV injection guard

### F16 Two Earth radii in one shipped module
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/01-data.js:62
QUOTE:
```js
hv=(a,b)=>{let r=Math.PI/180,p1=a[1]*r,p2=b[1]*r,h=Math.sin((p2-p1)/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin((b[0]-a[0])*r/2)**2;return 2*6371.0088*Math.asin(Math.sqrt(h))},
```
WHY: The 30/30/30 lists use the geodesy radius 6378.137 km (F4), but the module's own `hv` uses 6371.0088 km for the
ordinary card's "Also listed within 300 m" and "within 5 km" counts (06-tap-card.js:11, :32); ot_filter.py:46 also uses
6371.0088. The geodesy module's header names exactly this risk: "which is exactly how two of them end up on different
radii without anyone noticing" (atlas/modules/202609011950-geodesy.js:7-8). The difference is about 0.11 % (about 5.5 m
at the 5 km edge), so no 30-list is affected, but it is a live inconsistency against the estate's own one-radius law.
PATTERN: (anti-pattern) duplicated geodesy

### F17 The Area tab counts from full scans, never capped at 30
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:94-96
QUOTE:
```js
/// the Area tab (DC-B2 §5): counts and stated MW in 5, 10 and 20 km circles from the full scans (never capped at 30)
pa=(m,c,P)=>{let g=ap(P,el('div','display:grid;grid-template-columns:auto 1fr 1fr 1fr;gap:1px 8px;margin-top:6px;font-size:11px;color:#c9d6da;text-align:right')),C=(s,l)=>ap(g,el('span',l?'text-align:left':'',s)),sc=c.sc||[],al=c.all,cv=c.cva,
  W3=f=>KM3.map(f),R=(l,f,on)=>{C(l,1);for(let d of KM3)C(on?f(d):'…')},rw=d=>al.filter(q=>q.km<=d).map(q=>q.p),cw_=d=>cv.filter(o=>o.km<=d),Mw=v=>v>0?N(v)+' MW':'–';
```
WHY: The 30-lists are a display cap; the 5/10/20 km counts and stated-MW sums come from the uncapped 40 km scope, the full
REPD 40 km set and the full conventional list, with a separate "not stated" row; `Mw` prints "–" rather than "0 MW" for
no stated figure. A cap that never leaks into a count.
PATTERN: display cap separate from census

### F18 Stale records next to the rule: `DL=5` unused, and the release note says 203 sites
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/01-data.js:5-7
QUOTE:
```js
/// DC-B1 (#73 steps 7-8): a data-centre tap lists 30 substations, 30 REPD sites and 30 conventional power sites (R100 km);
/// labels on the map only for the nearest DL of each set
N3=30,R100=100,DL=5,
```
WHY: `grep -o -w "DL" atlas/modules/202610292044-uk-offtakers-overlay.js | wc -l` = 1 (the declaration only): the
labels are actually "ranks 1-3 plus ... at most 6" (06b :132-138), so the comment and constant describe a rule that is not
the code. Separately, `atlas/current.json:886` (`composition_note`) still says "203 sites from the open UK data-centre
pipeline", while the same file's `site_data_sources` says `"features": 227, "drawn": 225` (:771-772); the 203-site file
was removed as "incorrect cross-operator merges" (57ed074) after the note was written. A keyed record contradicting
another keyed record in the live pointer.
PATTERN: (anti-pattern) prose drift after a data swap

## Patterns (keyed; each cites at least one F above)
- **Unknown is null, not zero** (F6, F7, F11, F12, F13): MW `null` unless a positive bounded number; status `un`; location
  absent means not drawn; the OSGB origin sentinel dropped; CSV "not stated"; Area "–" and a "not stated" count.
- **Reuse the incumbent and assert parity at run time** (F3, F4): the original 5-substation measure still runs on every
  data-centre tap and must equal the head of the 30; one geodesy, atan2 form kept for last-bit parity.
- **Owner-signed budgets enforced twice** (F8): frozen table in tools/scope/lib.mjs plus a proof constant, both must hold.
- **Fail closed on bytes** (F9, F14): SHA-256 pin before parse; byte-for-byte rebuild before ship.
- **List everything, draw within reach, say which** (F2, F5, F17): caps are presentation; counts are census.
- **Cooperative event claim** (F10): one field on the shared event decides ownership across cartridges.
- **Drift after a swap** (F16, F18): the weak spots are prose and second copies, not the rule.

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)
All on 2026-10-29 (`git log --since=2026-10-29T00:00:00Z --until=2026-10-30T00:00:00Z --format='%an' | sort | uniq -c`:
32 Claude, 29 Ventusltd; `git log --since=2026-10-29T20:40:00Z --until=2026-10-29T23:59:00Z --oneline | wc -l` = 25).
- gridatlas@4fa72ae0927f335fd1265e93b28992315cdb55a3 2026-10-29T20:40:02+00:00 Claude: "offtakers src: data-centre category + Grid Engine 30/30/30 (#73 steps 7-8)". The only commit to 06b-dc-engine.js (`git log -- tools/offtakers/src/06b-dc-engine.js`).
- gridatlas@2f807295c6ff0a0ebf148a74312f9befc499d805 2026-10-29T20:44:37+00:00 Claude: "202610292044 preview (v9.187)". Module then hashed 5a7018f1...fa006, 71,191 B (`git show 2f80729:atlas/modules/202610292044-uk-offtakers-overlay.js | sha256sum`), pinning the 203-site file `uk_datacentre_pipeline_202610292014.geojson`.
- gridatlas@465d247447d0f2c6a9830b0564a47b610f0997da 2026-10-29T21:20:09+00:00 Ventusltd (owner): "Approve 80 kB offtakers module ceiling" (72_000 -> 80_000 in lib.mjs); its twin gridatlas@0d97015 (3 s later, parent 465d247) changes the proof's `BUDGET`. Same-message pairs, one file each (also b2ed386/486ea3c, 5709508/6deccf5): web-editor commits, one file per commit.
- Turning point, 21:37-21:43: gridatlas@d3f4eb106abc6f360b34ed54b606d75007031c85 vendors the corrected 227-site pipeline; gridatlas@5cf426a re-pins `DCF`/`DCFSHA` (one line, 01-data.js:19); gridatlas@9ac70db rebuilds `atlas/modules/202610292044-uk-offtakers-overlay.js` in place; gridatlas@57ed074 removes the 203-site file "with incorrect cross-operator merges". So the generation name 202610292044 carried two different module hashes in history (5a7018f1... at the preview, e4d3fb28... now); the release commit calls the result the "accepted immutable preview".
- 21:42-21:55: a run of CI commits (95ae6d4 real Chromium smoke; 79eb77f "Browser expect 225 mappable sites; preserve two unlocated planning records as unknown", changing `>=227` to `>=225`; 3b63b11, 2285a91 "Diagnose ... instead of silent timeout").
- gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e 2026-10-29T23:41:04+00:00 Ventusltd: "202610292044-gridatlas-v9.187: release accepted data-centre Grid Engine preview"; touches only atlas/current.json and STATE.md; trailer `Authorised-by: owner (Ventusltd), ... 2026-10-29T23:34:44Z`, `Predecessor: 202610291044`, `Rollback: node tools/release/rollback-generation.mjs --release-commit <this SHA>`. Preview to release: 2 h 56 min.
- No reverts in the window (`git log --oneline -40 | grep -i revert` empty).

## Gridatlas and datacentre relevance (how this slice bears on the focus)
This slice is where the two focus repositories meet on the live map. The data-grid-gb `datacentres/` lanes (dc-a3 gov,
dc-a4 OSM, dc-a7 merge; 227 sites, 225 mappable) arrive as one SHA-pinned file; the gridatlas engine turns each site into
a straight-line vicinity census of 30 substations, 30 REPD sites and 30 conventional power sites. Its discipline matches
the producer's: IT load and grid connection never conflated (the producer's own caveat "Unknown MW is null, not zero"
reaches the browser unchanged), unplaced records are refused and counted, proximity is never presented as capacity
(banned-word list in offtakers-cartridge.mjs and the scope's `what_this_is_not`). Status counts: operational 202,
announced 12, in planning 8 (6 mappable), consented 4, unknown 1.

## Candidates (unkeyed; clearly marked)
- CANDIDATE: the 30/30/30 card is probably the first place a GridAtlas reader can see conventional generation and
  renewables side by side from a demand site; I found no earlier generation with a conventional set (not exhaustively checked).
- CANDIDATE: `metadata.summary.sum_it_load_mw_known` = 1632.0 in the pinned file is a sum of IT loads, which the
  browser never shows; harmless metadata, but the only summed MW figure in the slice.
- CANDIDATE: a stated value of exactly 0 MW, or over 10,000 MW, would render as "not stated" through `DMW` (F6), merging
  "stated as zero" with "unknown". No such value exists in the pinned file (by the jq counts above), so nothing is affected today.
- CANDIDATE: the dot-size thresholds in `DZ` (200/50/10 MW) and the 10 m REPD grouping box (2e-4 by 1e-4 degrees) are
  not justified in the source comments I read.

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)
1. F6 `tools/offtakers/src/01-data.js:71` (DMW): the cleanest single-line statement of "unknown is not zero" in the estate.
2. F3 `tools/offtakers/src/06b-dc-engine.js:52`: production-time parity between a new engine and the incumbent it extends.
3. F2 `tools/offtakers/src/06b-dc-engine.js:59`: the whole 30/30/30 rule in one line.
4. F8 `tools/scope/lib.mjs:114-119`: a byte budget as an owner decision with a date and an issue number.
5. F4 `substation-intelligence-v9-63.js:1674-1679`: refusing a 1e-15 km difference because the claim is parity.
6. F10 `tools/offtakers/src/06-tap-card.js:78`: a one-field cross-cartridge lock.
7. F13 `tools/offtakers/src/03-repd-register.js:4`: the OSGB-origin sentinel, an unknown location refused as a place.
8. F18 as a warning page: the stale "203 sites" note beside "227 / 225" in the same live pointer.

## One next command (exactly one, runnable from a clone)
`cd /home/user/estate/gridatlas && OFFTAKERS_MODULE=atlas/modules/202610292044-uk-offtakers-overlay.js LIGHTNING_MODULE=atlas/modules/202610291043-uk-lightning-overlay.js node --test --test-name-pattern='^DC' tools/ci/offtakers/overlay-offtakers.test.mjs`
