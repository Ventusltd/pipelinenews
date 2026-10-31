# W19 grid-engines-receipts

Written 2026-10-31 by worker W19 (Opus). Read only: no clone was changed. Commands that ran tests were
run from `/tmp`, and `git status --porcelain` came back empty afterwards for each clone tested.

HEADS:
ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f (288 commits)
gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 (83 commits)
grid-distance-maths@8e91b07d8312acca5bcaef43e839f06a3b1d642a (7 commits)
energy-transition-simulator@a6b5ae63cc0eeb4d619f154c7e116616c997af77 (113 commits)
data-gridatlas@8bf88da9e210ce9f61dc0398869d3369f3fa2445 (20 commits)
gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e (311 commits in the clone; read only for the engine cartridges that carry E1 and E4)
pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 (521 commits)
(All seven HEADs match `proof/inventory.tsv`.)
Note on pipelinenews: while this report was being written the harness committed worker reports, so the live HEAD is
now `0f698cc32e0e6f41f793ef0a97c314083d98f759` (2026-10-31T19:19:42+00:00). Keys stay on the inventory HEAD
`67aa2eb05993c630887b41c3b720ba42a86669a4`. `git diff 67aa2eb..HEAD -- ui/atlas-v9-deep-links.js tools/` is empty, so
every cited pipelinenews line is byte-identical at both commits. A controller should resolve these with
`git show 67aa2eb05993c630887b41c3b720ba42a86669a4:<path> | sed -n '<line>p'`.

READ:
gridmachine1/CABLE-ENGINES.md
gridmachine1/CABLE-ENGINE-DATASHEETS.md
gridmachine1/ENGINEERING-PLAN.md
gridmachine1/BUGS.md
gridmachine1/COORDINATION.md (lines 25-55)
gridmachine1/reports/20260907T230000Z-engine-capsule/README.md
gridmachine1/reports/20260907T230000Z-engine-capsule/CAPSULE.json
gridmachine1/202609071322-linux-handover/rig-kit/validity.mjs
gridmachine1/202609071322-linux-handover/rig-kit/verify-interconnector-arrival.mjs
gridmachine1/202609071322-linux-handover/rig-kit/verify-derived.mjs
ventus-grid-engine/README.md
ventus-grid-engine/verify.mjs
ventus-grid-engine/engine/v9-nearest-search.js
ventus-grid-engine/engine/compute-observer.js
ventus-grid-engine/deeplink/contract.js
ventus-grid-engine/deeplink/receivers.json
ventus-grid-engine/docs/deeplink-contract.md (lines 1-60)
ventus-grid-engine/proofs/firm-capacity.proof.mjs (lines 20-60)
grid-distance-maths/README.md
grid-distance-maths/src/geodesy.mjs
grid-distance-maths/src/placement.mjs (head)
energy-transition-simulator/README.md, docs/ARCHITECTURE.md, docs/STATUS.md, contracts/place.v1.md
energy-transition-simulator/prototype/mod/engine/connect-here.mjs
energy-transition-simulator/prototype/mod/connect-here.js (lines 45-130)
energy-transition-simulator/prototype/mod/engine-lock.js (head)
data-gridatlas/README.md, releases/current.json, requirements.lock
data-gridatlas/202608291237-data-gridatlas/data/manifest.json, sha256sums.txt, browser-layer-registry.json (330-350)
data-gridatlas/202608291237-data-gridatlas/contracts/202608291015-v8-transplant-plan.json (230-275)
gridatlas/atlas/cartridges/202609241334-sld-sandbox-v9-8.js (the live sld-sandbox, selected passages)
gridatlas/atlas/cartridges/202609071232-sld-sandbox-v9-8.js (the sealed sld-sandbox, for the diff)
gridatlas/atlas/current.json (grep only)
gridatlas/local-arrival-grid.mjs
gridatlas/tools/offtakers/src/06b-dc-engine.js (lines 1-24 and grep)
pipelinenews/ui/atlas-v9-deep-links.js
pipelinenews/tools/intelligence/cartridges/atlas-live-handoff/assets/{GEN}-atlas-pointer-deep-link.mjs (lines 1-120)
pipelinenews/.github/workflows/202608300232-sync-atlas-v9-deep-links.yml (head)

Commands that were run, with their results:
- `sha256sum` of the five capsule parts in the gridatlas clone: **5 of 5 match** CAPSULE.json (F3).
- `diff` of the `nearestSubstations` and `nearestTransmission` bodies between the sealed sld-sandbox (202609071232) and the live one (202609241334): **E1-IDENTICAL, E4-IDENTICAL** (F3).
- `node verify.mjs` (ventus-grid-engine): `verify PASS — 22 proofs, 561 checks` (F14).
- `node test/verify.mjs` → `34/34 checks passed`; `node test/verify_nearest.mjs` → `54/54 checks passed` (grid-distance-maths).
- `node test/verify_placement.mjs` → **UNVERIFIED**: it shells out to Python and stopped with a Traceback in this container. `verify_parity.py` was not run, because Python would have written `__pycache__` inside the clone.
- `sha256sum -c sha256sums.txt` (data-gridatlas 202608291237 release): **85 of 85 OK**. The four `current.*` pointer hashes in `releases/current.json` re-resolve exactly (F12).

## Findings (keyed)

### F1 E1, the substation finder within a radius: the core scan, and the radius that measures beyond itself
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/202609241334-sld-sandbox-v9-8.js:1663-1665
QUOTE:
```js
  const MIN_KV = 33;
  const LINK_COUNT = 5;              // how many substations to reach for
  const MAX_LINK_KM = 40;            // beyond this, silence is more honest
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/202609241334-sld-sandbox-v9-8.js:3527-3538
QUOTE:
```js
    for (const sub of subs) {
      const km = distanceKm(lon, lat, sub.at[0], sub.at[1]);
      if (km > MAX_LINK_KM) {
        if (!beyond || km < beyond.km) beyond = { ...sub, km };
        continue;
      }
      scored.push({ ...sub, km });
    }
    scored.sort((a, b) => a.km - b.km);
    const result = scored.slice(0, LINK_COUNT);
    // Carried on the array so no caller has to change shape to read it.
    result.beyondRadiusNearest = result.length ? null : beyond;
```
WHY: This is the protected engine E1. It matches its datasheet row for row: 33 kV and above, a stated radius budget (40 km), and "legitimate silence" defined as nothing inside the budget *with a true distance reported beyond it*. The search is an exhaustive scan with no ring or box pre-filter, so it cannot miss the true nearest node. ventus-grid-engine README:99 records that as a finding about the three gridatlas scans ("**none of them has it**"). Anything beyond the draw radius is still measured and kept as `beyondRadiusNearest`, so "no grid data" and "further than 40 km" never collapse into the same null.
PATTERN: bounded draw, unbounded measurement; the silence carries its distance.

### F2 E4, the 400 kV transmission engine: the nearest, and separately the nearest with a name, with its sample counted
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/202609241334-sld-sandbox-v9-8.js:626-636
QUOTE:
```js
    /* The size of the sample this superlative is drawn from. Counted here
       rather than recounted by a caller, because the predicate below is
       what decides eligibility and a second implementation of it would
       drift from this one. */
    let considered = 0;
    for (const s of (Array.isArray(subs) ? subs : [])) {
      if (!(Array.isArray(s.kv) && s.kv[0] >= 400)) continue;
      considered += 1;
      const km = distanceKm(origin[0], origin[1], s.at[0], s.at[1]);
      if (!best || km < best.km) {
        best = { name: s.name || 'Unnamed substation', km, at: s.at };
```
WHY: The capsule calls this "the most complete engine in the estate". The quality it praises, "nearest of the 278 mapped substations at 400 kV or above that this search could see", is produced right here. `considered` is counted by the same predicate that decides eligibility, so the denominator under the word "nearest" cannot drift away from the search. A second pass (lines 637-639) keeps `bestNamed`, because an unnamed OSM node can win on distance while the reader still needs a name. This is capsule rule 5, "Name the alternative when the best answer is anonymous", in code.
PATTERN: every superlative carries its sample.

### F3 The 2026-09-07 capsule seal still holds: 5 of 5 hashes re-verify, and E1 and E4 are byte-identical in the live cartridge
KEY: gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 reports/20260907T230000Z-engine-capsule/CAPSULE.json:34-42
QUOTE:
```json
  {
   "id": "substation-intelligence",
   "version": "v9.140",
   "path": "atlas/cartridges/202609062358-substation-intelligence-v9-63.js",
   "sha256": "d94b0de50deddac77643325b10fbe490ce44b8c406dbc6c67e6e7cadbdaa8ec6",
   "bytes": 451935
  }
 ],
 "current_json_sha256": "42a8fa3933a6b36154513d1cea4240027510db0bb8ecd31dd195197c5855852b",
```
KEY: gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 CABLE-ENGINES.md:50
QUOTE:
```md
**Protection is a test rule, not a wish.** E1 and E4 have passing receipts today, including a solar control that measures to a named substation and a transmission card that reports published circuits and ratings.
```
(Line 50 continues past this point; the quote is its first two sentences, verbatim.)
WHY: The command was `sha256sum` over the four cartridge paths plus `atlas/v/202609071232/current.json` in the gridatlas clone. All five match CAPSULE.json in full, and the byte counts match too: 13,316 / 41,120 / 382,999 / 451,935 / 47,496. The sealed `substation-intelligence` (202609062358) is still the one live `atlas/current.json` loads (gridatlas current.json:572). The protection also holds where it matters: `diff` of the `nearestSubstations` and `nearestTransmission` bodies between the sealed `202609071232-sld-sandbox` and the live `202609241334-sld-sandbox` printed nothing (E1-IDENTICAL, E4-IDENTICAL). Fifty-four days and 30+ sld-sandbox generations later, the protected numbers have not moved.
PATTERN: seal by content hash; protection measured by diff, not asserted.

### F4 "The class selects the question, never whether": the rule as a document, then the same rule as code
KEY: gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 CABLE-ENGINES.md:32-36
QUOTE:
```md
> **A cable engine selects the question. It never decides whether a question is answered.**

An earlier version gated measurement on technology and offshore projects were withheld from measurement altogether; that branch was removed deliberately so offshore would measure to the nearest mapped substation rather than going quiet. Reintroducing engines carelessly walks straight back into it.

So: every project reaches an engine. An engine that cannot answer hands to the onshore-connection engine as the general case and **says that it did**. A project with no usable geometry gets a named reason, never silence.
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/202609241334-sld-sandbox-v9-8.js:6170-6178
QUOTE:
```js
    /* The class selects the question. It never selects whether a question is
       answered: every arrival leaves one of these behind, and an engine that
       cannot answer names its reason instead of going quiet. */
    function classifyEngine(tech, q) {
      try {
        if (q && (q.get('interconnector') || String(q.get('technology') || '') === 'interconnector')) return 'interconnector';
      } catch (_) { /* no query is not an interconnector */ }
      try { return coverage.policy(tech)?.offshore ? 'offshore' : 'onshore'; }
      catch (_) { return 'onshore'; }
```
WHY: This is the rule that keeps routing from turning into gating. Every branch of `classifyEngine` returns an engine, and both catch blocks return `'onshore'`, so no class and no exception can produce "no question". The wording appears in ventus-grid-engine README:196 ("a project's class selects **which question** is asked, never **whether**"), in CABLE-ENGINE-DATASHEETS.md:5 and in CABLE-ENGINES.md:73. In code it is in **32** gridatlas cartridge files (`grep -l "The class selects the question. It never selects whether" atlas/cartridges/*.js | wc -l`), from v9.148 onward.
PATTERN: a router whose every branch, including its error branches, terminates in an answerer.

### F5 The "allowed silence" contract: six common rules, and one legitimate silence per engine
KEY: gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 CABLE-ENGINE-DATASHEETS.md:11-16
QUOTE:
```md
| Distances are computed on the WGS84 ellipsoid | Measured 2026-09-07: on a 235 km span a sphere understates by 450 to 713 m depending on the radius chosen. No single sphere is right across an area. |
| A bounded search returns a nearest only if the best candidate is closer than the distance to the search boundary | Otherwise the answer is an ellipse in metres, and the nearest returned may not be the nearest. Ticket GG-011. |
| Every distance says it is to the nearest **mapped** asset, and states how many were invisible | 141 of 355 published connection points at 400 kV carry no coordinates. Ticket GG-012. |
| An engine states its own route model and never borrows another's calibration | A subsea cable does not follow a road. Ticket GG-014. |
| An engine publishes a sentinel when it fires, and a named reason when it cannot | Silence is indistinguishable from failure. Tickets GG-002, GG-034. |
| Every engine that falls back to another says so in its output | A fallback nobody notices is how a wrong question survives. |
```
KEY: gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 CABLE-ENGINE-DATASHEETS.md:66
QUOTE:
```md
| **Legitimate silence** | No declaration held: hands to E1, **says it did**, and reports the nearest mapped substation as a fallback rather than as the connection |
```
WHY: The datasheet is the contract ("an engine without one is not ready to be built", CABLE-ENGINES.md:13). Each of the five engines has a **Legitimate silence** row (lines 33, 50, 66, 82, 98; `grep -n "Legitimate silence"` gives 5). Each one defines the *only* way that engine may stay quiet, and every one of them still carries a measurement or a declared "not held". Silence becomes a typed, enumerated state rather than the absence of output.
PATTERN: enumerated legitimate silence; failure modes as part of the interface.

### F6 What fires on an arrival: one writer of the sentinel, mirrored to the DOM, with the E3 fallback recorded
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/202609241334-sld-sandbox-v9-8.js:4474-4481
QUOTE:
```js
    link.arrival_engine = {
      engine: engine || 'onshore',
      answered: Boolean(answered),
      reason: reason || (answered ? null : 'UNSTATED'),
      fallback_from: fallbackFrom || null,
      terminal: !pending,
      epoch,
      at: new Date().toISOString(),
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e atlas/cartridges/202609241334-sld-sandbox-v9-8.js:4697-4702
QUOTE:
```js
      recordArrivalEngine(
        offshore ? 'offshore' : 'onshore',
        links.length > 0 || Boolean(links.beyondRadiusNearest),
        links.length ? null
          : (nesoDrawn ? 'DECLARED_CONNECTION_DRAWN'
            : (links.beyondRadiusNearest ? 'NEAREST_BEYOND_' + MAX_LINK_KM + '_KM' : 'NO_SUBSTATION_DATA')),
```
WHY: This is datasheet rule 5 ("publishes a sentinel when it fires") made real. `reason` defaults to `'UNSTATED'` when an arrival is not answered, and the comment at 4465-4466 calls that "a defect, not a state to be tolerated quietly". `terminal` tells a handover apart from a refusal ("A non-terminal record is a receipt, not a verdict", 4473). The record is mirrored to `data-gridatlas-arrival` / `data-gridatlas-arrival-engine` attributes (4484-4487) so a person, not only a test, can tell a silent map from a broken one. Line 4707 passes `'declared_connection_point'` as `fallback_from` for offshore with no declaration, which is the E3 "says it did" row in code. Named reasons found at call sites (`grep -o "answerArrival(... '[A-Z_]*'"` plus `recordArrivalEngine(...)`): HANDED_TO_INTERCONNECTORS, ENGINE_INSTALL_THREW, ENGINE_NEVER_INSTALLED_NO_STYLE, SECOND_MAP_NOT_CAPTURED, ARRIVAL_ATTEMPTS_EXHAUSTED, DEFERRED_FOR_VISIBILITY, MAP_CLICK_THREW, NO_INTERACTIVE_LAYERS, QUERY_RENDERED_FEATURES_THREW, ARRIVAL_THREW, plus SUBSTATION_PAYLOAD_ABSENT and the three drawLinks reasons above.
PATTERN: single-writer sentinel; receipt versus verdict (`terminal`).

### F7 Receipt format: a computation receipt that re-measures every distance it is handed
KEY: ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f engine/compute-observer.js:67-82
QUOTE:
```js
        if (result.measurements.length === 0) {
          if (result.search_completed !== true || !Number.isInteger(result.scanned_count) || result.scanned_count < 0) {
            throw new Error('Empty result lacks completed-search and scanned-count evidence');
          }
          return publish(attempt, 'completed_empty', { measurements: [],
            summary: { measured_count: 0, scanned_count: result.scanned_count, nearest_km: null } });
        }
        const measurements = result.measurements.map(row => {
          if (!row || row.node_id == null || !String(row.node_id).trim()
              || !located(row) || !finite(row.km) || row.km < 0) {
            throw new Error('Computation returned an invalid grid measurement');
          }
```
WHY: The receipt schema is `ventus.grid-compute-receipt.v1` (line 4). States: requested, started, completed, completed_empty, unsupported, failed. An *empty* answer is only accepted with proof that the search ran (`search_completed` plus `scanned_count`). Every returned km is recomputed with the shared geodesy and rejected if it differs by more than max(1e-6, 1e-9 × d) (lines 79-82). `assess()` refuses a stale attempt (`'stale-attempt'`, line 96). This is the receipt-side answer to BUGS GG-019 ("beyond-radius accepted without a distance to prove the search ran") and GG-017 (a measurement from an abandoned selection landing on the current one).
PATTERN: receipts verify, not record; an empty result needs evidence that the search ran.

### F8 Receipt validity: a run that cannot pass its own control has no standing to fail a candidate
KEY: gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 202609071322-linux-handover/rig-kit/validity.mjs:39-50
QUOTE:
```js
export function classifyRun(controlResult, results) {
  if (!controlResult) {
    return { validity: 'NO_CONTROL', reason: 'run carried no control case; its failures cannot be attributed', results };
  }
  if (!controlResult.pass) {
    return {
      validity: 'HARNESS_INVALID',
      reason: `control "${controlResult.name}" failed: ${controlResult.error || controlResult.signature || 'no detail'}. `
        + 'A harness that cannot pass a known-good case has no standing to fail a candidate. '
        + 'Nothing below is counted against any candidate.',
      results: results.map((r) => ({ ...r, counted: false, why_not_counted: 'harness invalid' })),
    };
```
KEY: gridmachine1@c6cbf9686eea1aa148b2e4616b7d603e6a93b450 COORDINATION.md:38
QUOTE:
```md
1. **Applicability.** A receipt applies to a new pair only when **every** input the run consumed is present at the same `(path, content_sha256)`. The rule shipped first accepted **any** single matching input, which in practice almost never marked anything stale. Compare content hashes, not identifier strings.
```
WHY: This is the hash-sealed receipt law. A receipt applies only while every consumed input sits at the same content hash (closed GG-021, "A verdict that outlived its inputs"). Outcomes are partitioned PASS / INCOMPLETE / NO_RECEIPT / HARNESS_INVALID (COORDINATION.md:43). The E1 protection receipt is concrete too: the control case `REPD 11386` in `verify-interconnector-arrival.mjs:35-36` must show `Nearest <n> kV substation:` on the page (line 85, line 103), and lines 100-102 guard against a vacuous pass ("a composition the composer refused loads nothing").
PATTERN: control-gated validity; applicability by content hash.

### F9 The arrival deep-link contract, owned once: the bucket correction, and refusing a receiver that carries no engine
KEY: ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f deeplink/contract.js:67-78
QUOTE:
```js
 * rows, a third of the register, reporting green while the layer sat off.
 *
 * `other` maps to null deliberately. No layer exists for it. A caller must
 * say so rather than search for one and then quietly claim success — that
 * short-circuit is the honest branch, and the proof asserts it stays honest.
 */
export const LAYER_ID_FOR_BUCKET = Object.freeze({
    wind_onshore:  'wind',
    wind_offshore: 'wind',
    other:         null
});
```
KEY: ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f deeplink/contract.js:206-212
QUOTE:
```js
    if (isRetiredReceiver(base)) {
        throw new Error(
            'buildDeepLink: ' + base + ' is a retired receiver and carries no engine; '
            + 'a link built against it cannot compute anything. Use the canonical receiver '
            + CANONICAL_RECEIVER + ' (call buildDeepLink(project) and the contract supplies it).'
        );
    }
```
WHY: Before this, Pipeline News built the URL and GridAtlas parsed it, and neither imported the other. Three buckets failed "every single arrival, on 2,508 of 7,680 register rows" (README:20-21) while the self-check said green. The contract fixes the identity (`repd_ref`, never `repd_id`, line 26) and the canonical receiver (`https://ventusltd.github.io/gridatlas/atlas/`, line 113), and **refuses** the V8 overlay, which "still serves, so nothing 404'd" (deeplink/receivers.json `why_this_file_exists`). `parseDeepLink` keeps `layer_id` and `layer_exists` apart (lines 245-246), "A receiver that conflates those two is the v9.108 bug."
PATTERN: shared contract as data plus two pure functions; refusing an inert target.

### F10 Contract drift across four places: the stated contract has 5 parameters, the live emitter and the arrival grid send 7, and a fossil builder targets a path that 404s
KEY: ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f deeplink/contract.js:29-35
QUOTE:
```js
export const PARAMS = Object.freeze({
    repd_ref:   { type: 'string', required: true,  note: 'REPD reference; the project identity' },
    technology: { type: 'string', required: true,  note: 'a bucket from BUCKETS, not a layer id' },
    latitude:   { type: 'number', required: false, units: 'degrees north' },
    longitude:  { type: 'number', required: false, units: 'degrees east' },
    zoom:       { type: 'number', required: false, note: 'MapLibre zoom level' }
});
```
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 tools/intelligence/cartridges/atlas-live-handoff/assets/{GEN}-atlas-pointer-deep-link.mjs:107-109
QUOTE:
```js
const QUERY_PARAMETER_ORDER = Object.freeze([
  "repd_ref", "project", "technology", "capacity_mw", "latitude", "longitude", "zoom",
]);
```
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e local-arrival-grid.mjs:118-128
QUOTE:
```js
function url(r) {
  const p = new URLSearchParams({
    repd_ref: r.repd,
    project: r.name || ('REPD-' + r.repd),
    technology: r.technology || 'solar',
    capacity_mw: r.capacity_mw || '1',
    latitude: r.latitude,
    longitude: r.longitude,
    zoom: r.zoom || '12',
  });
  return ATLAS + '?' + p.toString();
```
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 ui/atlas-v9-deep-links.js:3-6
QUOTE:
```js
  const RELEASE_ID = "202608300453-atlas-v9";
  const BASE_URL = "https://ventusltd.github.io/gridatlas/202608300453-atlas-v9/";
  const TECHNOLOGIES = new Set(['solar', 'bess', 'wind_onshore', 'wind_offshore']);
  const REPD_REF = /^[A-Za-z0-9-]{1,40}$/;
```
WHY: Comparing the four:
1. The live Pipeline News emitter and gridatlas' own `local-arrival-grid.mjs` agree exactly: seven parameters in the same order (`repd_ref, project, technology, capacity_mw, latitude, longitude, zoom`), against `https://ventusltd.github.io/gridatlas/atlas/` (local-arrival-grid.mjs:29, emitter :76).
2. The engine's `contract.js` PARAMS lists only five. `buildDeepLink` loops over `Object.keys(PARAMS)` (line 214), so a consumer that "imports the contract" as the README tells it to would drop `project` and `capacity_mw`. That payload is exactly what the emitter's own FAULT 2 says is needed to fly straight there without "booting a 35.7 MB query engine" (emitter :23-27). Interconnector links also carry `interconnector=` and `anchor=` (gridmachine1 rig-kit :31-35), and neither is in PARAMS.
3. `ui/atlas-v9-deep-links.js` is a fossil. It uses the `/gridatlas/<release_id>/` shape that the emitter's FAULT 1 says "404s" (emitter :10-16; there is no `202608300453-atlas-v9/` directory at the gridatlas root, only `atlas/releases/202608300453-atlas-v9/`). It sends `name` rather than `project`, allows any alphanumeric `repd_ref` where the live emitter requires digits only, and allows only 4 of 13 buckets. Its last commits are `0fff06fb3c130b9fd6d37a64d229c54fa97c139c` (2026-08-30T04:11:18+00:00, a link bot). Its only referents are a sync script and a workflow whose `schedule` is `'20 4-8 30 8 *'` and whose `MISSION_EXPIRES_AT` is `'2026-08-30T08:35:00Z'`.
PATTERN: contract drift is measurable; a contract narrower than its emitters is itself a hazard.

### F11 Not straight-line proximity: distance to the conductor, and a nearest search that stops only when it can prove it
KEY: grid-distance-maths@8e91b07d8312acca5bcaef43e839f06a3b1d642a src/geodesy.mjs:372-387
QUOTE:
```js
  sweptClearanceKm(lon, lat, ring) {
    if (ring <= 0) return 0;
    const [ci, cj] = this.cellOf(lon, lat);
    const latLo = (ci - ring) * this.cell;
    const latHi = (ci + ring + 1) * this.cell;
    const lonLo = (cj - ring) * this.cell;
    const lonHi = (cj + ring + 1) * this.cell;
    const ky = localScaleKm(lat).ky;
    const worstLat = Math.min(Math.max(Math.abs(latLo), Math.abs(latHi)), 89.9);
    const kx = localScaleKm(worstLat).kx;
    return Math.min(
      (lat - latLo) * ky, (latHi - lat) * ky,
```
KEY: grid-distance-maths@8e91b07d8312acca5bcaef43e839f06a3b1d642a README.md:31-35
QUOTE:
```md
- `circuit_km` measured to the nearest *sampled vertex* rather than to the line,
  so it could only ever equal or overstate the distance to the conductor, and it
  omitted 220 kV and 66 kV. 71 projects were pushed outside the 2 km band by the
  omission. One of them, Crimscote Solar Farm, read 18.21 km and is 0.89 km from
  a 66 kV line.
```
WHY: This is the termination proof for GG-011. The radius a Chebyshev ring sweep *provably* covers is the distance to the nearest of the four box edges. The east-west edges use `kx` taken at the highest latitude the box reaches, where a degree of longitude is narrowest. Before commit `df4da10…` the stop test used `ring * this.cell * ky * 0.999`, which was wrong in 657 of 6,000 layouts (10.95%), worst case 65.42 km for a 35.79 km circuit (README:125-128). The other half of "not straight-line proximity" is `distanceToSegmentKm` (geodesy.mjs:168-181), which projects onto the segment on a local tangent plane built from the WGS84 radii of curvature, rather than measuring to a vertex. Re-run here: `verify.mjs` 34/34 and `verify_nearest.mjs` 54/54.
PATTERN: provable early termination; distance to the line, not to a sample.

### F12 The data plane is content-addressed end to end: 85 of 85 file hashes and all four pointer hashes re-verify
KEY: data-gridatlas@8bf88da9e210ce9f61dc0398869d3369f3fa2445 releases/current.json:26-37
QUOTE:
```json
  "current": {
    "browser_registry_sha256": "9b2169bcfd47bf51f0aaf8350487de19578e32358e191b961385a149a4637e1b",
    "candidate_source_commit": "61096ee84570fd78f7c87b7b4abe25cb521eeba6",
    "data_manifest_sha256": "3246dbdaa042ae8352ec9b7128cb6c2fe65e4f1aba0534302510661828df2526",
    "index_sha256": "c9343edec682c790e6889ef0a2977e3ab7848aec42573e259c906e9e8aceefa4",
    "ledger_sha256": "93c2639b9442244dc3b94b0079d16fdbfd0ba2153dc4601404fcb3fb1fb504d5",
    "live_url": "https://ventusltd.github.io/data-gridatlas/202608291237-data-gridatlas/",
    "packaging_source_commit": "9f1e9a574d5183da6406f552b65ed4e36eef8f10",
    "publication_commit": "32459230b958ff6ddbdb24365f56da83ab1cdc93",
    "release_id": "202608291237-data-gridatlas",
    "release_sha256": "19684ac3e86fac4346fab121a948bab0aa857108564fec5be242484d2baefd06",
    "route": "/data-gridatlas/202608291237-data-gridatlas/"
```
WHY: The pointer names the hash of every piece it points to. `sha256sum` of `data/manifest.json`, `browser-layer-registry.json`, `release.json` and `index.html` reproduces `data_manifest_sha256`, `browser_registry_sha256`, `release_sha256` and `index_sha256` exactly. `sha256sum -c sha256sums.txt` passes 85 of 85. Dependencies are pinned the same way: `requirements.lock:1-2` is `duckdb==1.3.2 \ --hash=sha256:36abdfe0…`. The README states the promotion order: "immutable `releases/<generation>/manifest.json` first, an exact consumer verification in `gridatlas` second, and only then a movable current pointer" (README:25-27). The manifest lists `derived/grid_400kv_snapped.parquet` at 4,106 rows and `derived/grid_132kv_snapped.parquet` at 6,227 rows. The latter is the same 6,227 the E5 datasheet (DATASHEETS:95) cites as "Verified in the layer files".
PATTERN: compare-and-swap pointer over content-addressed artefacts.

### F13 Data centres as an engine class: the 30/30/30 engine is built on the protected E1, not beside it
KEY: gridatlas@cacb69a7c4abc3b1a90fd75807ce8ef8cbc46d9e tools/offtakers/src/06b-dc-engine.js:1-6
QUOTE:
```js
/// ---- DC-B1 (#73 steps 7-8): a data-centre tap fires the Grid Engine 30/30/30 (card and map: DC-B2 CARD-SPEC.md) ----
/// Substations: the original link.measure.nearestSubstations returns LINK_COUNT = 5, a closure constant with no limit
/// argument (sld-sandbox 202609241334 :1664, :3513), so the 30 come from the engine's own Grid Finding Scope
/// (__GRIDATLAS_MODULES__.gridScope.scope, same cartridge :45-186: same list link.substations, same geodesy) with its count
/// and its 40 km radius as parameters (DC-B3 ENGINE.md). The original is still called on every tap: its 5 must be the
/// head of the scope's list (else noted in S.errors), and it names the nearest beyond 40 km when none is within.
```
KEY: data-gridatlas@8bf88da9e210ce9f61dc0398869d3369f3fa2445 202608291237-data-gridatlas/contracts/202608291015-v8-transplant-plan.json:268-272
QUOTE:
```json
      "authority_state": "UNVERIFIED",
      "licence_state": "UNVERIFIED",
      "provenance_note": "OSM-derived foundation candidate; reacquire with OSM identifiers and attribution before promotion.",
      "disposition": "PARITY_CANDIDATE_NEEDS_REACQUISITION_AND_LICENCE_PROOF",
      "publishable": false
```
WHY: The data-centre engine (live in gridatlas v9.187) cites **the exact E1 lines this report keys in F1** (`:1664`, `:3513`). It does not fork the finder. It calls the same Grid Finding Scope over the same `link.substations` list with the same geodesy, and it **asserts** that E1's original 5 are the head of its 30, with any disagreement written into `S.errors`. That is the capsule rule "Scale what works" (CABLE-ENGINES.md:52) applied to a new class. The old V8-parity `datacentres` partition (240 points, sha256 `a686a2e0…`, transplant-plan :246-247) was held back as UNVERIFIED and not publishable. The live class instead reads a pinned pipeline snapshot (gridatlas current.json:886: "203 sites from the open UK data-centre pipeline, DC-A7's pinned snapshot"), and the same note ends "proximity is not connection, capacity or feasibility". In engine terms a data centre is a *load* asking E1's question with a wider count, not a sixth cable engine. No datasheet for it exists in gridmachine1 (`git grep -i datacent` in gridmachine1 returns only one directory-tree line).
PATTERN: a new class reuses a protected engine through parameters, with a head-of-list equality assertion.

### F14 The engine estate's verifier fails closed, and its README undercounts its own proofs by a factor of eight
KEY: ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f verify.mjs:31-36
QUOTE:
```js
if (proofs.length === 0) {
    console.error('verify FAILED: proofs/ contains no proof, so nothing was checked.');
    console.error('An empty proof set must never read as a pass — that is the one');
    console.error('failure mode a verifier cannot be allowed to have.');
    process.exit(1);
}
```
KEY: ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f README.md:162
QUOTE:
```md
Current state: **3 proofs, 69 checks.**
```
WHY: The gate is sound: each proof runs in its own child process so the first failure cannot hide the rest, an empty proof set is a failure, and CI runs it before any commit step. Measured here, `node verify.mjs` prints `verify PASS — 22 proofs, 561 checks` (`ls proofs/*.proof.mjs | wc -l` gives 22). The README's figure dates from v0.1.0 (`3589fac`, 2026-09-04) and was never updated: a stale self-description sitting beside a verifier that is correct.
PATTERN: fail closed on an empty proof set; one process per proof.

### F15 The simulator's connection planner refuses what it does not model, but measures on the radius the estate retired for new work
KEY: energy-transition-simulator@a6b5ae63cc0eeb4d619f154c7e116616c997af77 prototype/mod/engine/connect-here.mjs:96-101
QUOTE:
```js
  const mva = mw / pf;
  out.amps = mva * 1e6 / (Math.sqrt(3) * kv * 1000);
  if (kv >= 275) {
    out.lines.push(`${Math.round(out.amps)} A at ${kv} kV: transmission cable sizing is not modelled here (a bay by ducted, unjointed cable)`);
    return out;
  }
```
KEY: energy-transition-simulator@a6b5ae63cc0eeb4d619f154c7e116616c997af77 prototype/mod/connect-here.js:49-50
QUOTE:
```js
    const R_MEAN = 6371008.8, rad = d => d * Math.PI / 180;
    function hav(a, b) { // [lon, lat] great-circle metres, used only to rank candidates
```
WHY: The simulator ("Walk real grid connections, see them, and model real trenches", README:3) runs the step after E1: a cable from the site to the nearest GridAtlas substation at a chosen voltage, rated by IEC 60287 and checked against ESQCR, with clauses "cited, never copied" (connect-here.mjs:24-30). At 275 kV and above it refuses with a reason instead of sizing, which is the capsule's "refuse rather than guess". But it ranks candidates on `R_MEAN = 6371.0088 km`. grid-distance-maths says R_MEAN is "exported only to reproduce existing Turf-based results and should not be used in new code" (ventus-grid-engine README:88-90), and gridatlas E1 uses R_ATLAS = 6378.137. The comment limits the impact ("used only to rank candidates"), and ranking is invariant to the sphere radius, so the choice of nearest is unaffected. Any distance *displayed* from `hav` would still disagree with the Atlas by about 0.11%. The simulator also fetches substations from the 2026-08-30 release path (`atlas/releases/202608300453-atlas-v9/data/grid_substations.geojson`, connect-here.js:19), not from the live composition.
PATTERN: refusal with a reason; radius drift across repos.

### F16 The production nearest-search was audited as an exhaustive scan, so it cannot exclude the true nearest
KEY: ventus-grid-engine@96a800eb01825748936b5a193ce396a960f9302f engine/v9-nearest-search.js:66-71
QUOTE:
```js
       NOTE: this is an exhaustive scan over every located point -- no
       bbox/ring pre-filter -- so it cannot exhibit the ring-search bug
       (a pre-filter that excludes the true nearest node). It is O(n) per
       call; grid-distance-maths' SpatialIndex.nearest() is the estate's
       answer for when that stops being fast enough, with a proven
       early-termination bound (see ./nearest-search-spatial-index.mjs). */
```
WHY: This ties E1's correctness (F1) to the estate's one proven indexed alternative (F11). The header (lines 6-16) records that the committed gridatlas module was dead code that no manifest loaded, while the live cartridge had a byte-different inline duplicate. The README fixture is a trap that "was made to fail before it was trusted to pass": the true nearest substation sits 6.0 km east, behind a 6.6 km decoy to the north, so a degree-square filter would overstate by exactly 10% (README:171-176). Note: the file it points to, `./nearest-search-spatial-index.mjs`, is **not** in ventus-grid-engine (`git ls-files | grep spatial` returns nothing). That reference is dangling.
PATTERN: test made to fail first; dead-module versus live-duplicate audit.

## Patterns (keyed; each cites at least one F above)

- **Bounded draw, unbounded measurement** (F1, F6). Draw at most 5 within 40 km, but always measure the nearest and say it is beyond. Silence carries a distance.
- **Every superlative carries its sample** (F2, F5 rule 3). The denominator is counted by the eligibility predicate itself.
- **Seal by content hash, protect by diff** (F3, F12). A capsule, a CAPSULE.json and a published immutable URL. Protection verified by byte-identical function bodies across generations.
- **The router never gates** (F4). Each class has one question, every branch ends in an answerer, and an exception falls to the general engine.
- **Enumerated legitimate silence** (F5, F6). Quiet only in named, typed ways. `UNSTATED` is itself a defect code.
- **Receipt, not verdict** (F6 `terminal`, F7 `completed_empty` needs `scanned_count`, F8 control-gated validity and applicability by `(path, content_sha256)`).
- **The contract owns the link, and refuses inert targets** (F9). Drift is measurable against it (F10).
- **Provable early termination** (F11). Stop only when the best hit lies inside the provably swept radius.
- **New classes reuse protected engines through parameters, asserting head-of-list equality** (F13).
- **Fail closed on an empty proof set** (F14).
- **Refuse with a reason** (F15, F2 corridor refusal under ~1 km in the capsule README:31).

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

Cadence and authorship (commands: `git log --format=%an | sort | uniq -c`, `git log --format=%ad --date=format:%Y-%m-%d | sort | uniq -c`):
- ventus-grid-engine: 288 commits. 252 `github-actions[bot]` (240 "spider: manifest updated", 12 "Regenerate genome graph"), 34 `Ventusltd`, 2 `Vikram Kumar`. Human work is concentrated on 2026-09-04..09-08 (39 commits). After that the bot ticks 4-7 times a day up to 2026-10-31T18:27:22+00:00.
- gridmachine1: 83 commits, all `Ventusltd`, all between 2026-09-07T14:20:46+01:00 and 2026-09-08T00:21:40+01:00, a ten-hour repository. 40 of them are "analysis: cd-plan cycle N (windows-rig)". Cycle numbering restarts five times (1-2, 1-3, 1-4, 1-28), which looks like runner restarts.
- grid-distance-maths: 7 commits, 2026-08-31 to 2026-09-21.
- energy-transition-simulator: 113 commits in two days (30 on 2026-09-27, 83 on 2026-09-28). 21 subjects contain "witness SIGNED".
- data-gridatlas: 20 commits, 2026-08-29 to 2026-09-03.

Turning points (chronological):

**T1. 2026-08-29T13:06:15+01:00, data-gridatlas@32459230b958ff6ddbdb24365f56da83ab1cdc93: the immutable Atlas V9 data plane is published (bot).** 85 hashed files. Hunk from `sha256sums.txt` (`@@ -0,0 +1,85 @@`):
```
+53663da46fb270f92454399419318840c9a47f5ab3a68e858702eaa2c05dc048  data/derived/grid_400kv_snapped.parquet
```
(F12 re-verifies the whole file 85 of 85 at HEAD.)

**T2. 2026-08-31T19:45:19+01:00, grid-distance-maths@df4da1091a29a8ae70ccd95493e521a98931ab71: "Fix two nearest-search defects that silently overstated distance".** Hunk (src/geodesy.mjs):
```
-    const { ky } = localScaleKm(lat);
     let best = null;
+    const seen = new Set();
...
-      // Only safe to stop when the best hit lies inside the area already swept.
-      if (best && best.km <= ring * this.cell * ky * 0.999) return best;
+      if (best && best.km <= this.sweptClearanceKm(lon, lat, ring)) return best;
```
The canonical library had been behind its own consumer (pipelinenews `swept_radius_km`). The fix ported the consumer's formulation back into the library.

**T3. 2026-09-04T15:00:03+01:00, ventus-grid-engine@3589facf9901950b880e8d436cf8c69664756205: v0.1.0, "isolate the grid engine maths and the deep-link contract, with proofs that can fail"** (44 files, +6,388). Message excerpt:
```
The engine's mathematics and the MAP-button deep link lived inside the two
applications that consumed them, and both had grown duplicates that nothing
compared. This repository holds each of them once.
```

**T4. 2026-09-05T04:13:45+01:00, ventus-grid-engine@3d3a56182f0cab28e9584c078fe2389300bfbf2a, then 2026-09-05T04:53:29+01:00, pipelinenews@74328052ff635443731f2d7da08a203afaedbf9e: the receiver is retired in the engine, and 40 minutes later in the emitter.** pipelinenews hunk (`@@ -66,23 +81,11 @@`):
```
-  legacy: Object.freeze({
-    id: "legacy",
...
-    base_url: "https://globalgrid2050.com/repd_grid_atlasv8/",
...
-/** L-04. One line. Both branches are invariant-checked below. */
-const ACTIVE_TARGET = "legacy";
+/** One receiver, because the other one carries no engine. An unknown value
+ *  here fails the invariant below rather than selecting anything. */
+const ACTIVE_TARGET = "ported";
```

**T5. 2026-09-05T14:37:03+01:00, ventus-grid-engine@f9531a7a36ff1b2557362bf2a61949066f393821: "record actual grid computation outcomes by entity and selection".** This introduces `engine/compute-observer.js`, the receipt format of F7 (5 files, +311).

**T6. 2026-09-06T03:32:32+01:00, ventus-grid-engine@7d403652af5f13d6dedb52aa301c0b1ebe2c9a5d: a storm, confessed: "the graph generator has not parsed since c1ac4e0, and I hid the evidence".** Message excerpt:
```
CI caught it. I did not, and the reason is worse than the bug: my own push
helper ran the generator as

    node genome/build-graph.mjs >/dev/null 2>&1
```
The fix was a single apostrophe in `genome/build-graph.mjs` (`-` "The paper's 10 million vehicles" / `+` "The 10 million vehicles in the paper"). Its importance is the precedent: a suppressed failing step is recorded as the same class of fault as a silent non-deploy.

**T7. 2026-09-07T00:58:49+01:00, gridatlas@c4a39f87b1e8b4883f8a32302e4029712f97078f: v9.140 adds `202609062358-substation-intelligence-v9-63.js`,** the cartridge whose sha256 `d94b0de5…` the capsule seals 21 hours later and which is still live (F3).

**T8. 2026-09-07T22:32:43+01:00 → 22:43:04+01:00, gridmachine1, the cable-engine evening (the capsule date).** In order: `7f9291c1b680a7c55527baa66caebd360dcd13b0` ENGINE-MODULES.md, renamed one minute later by `f4caffa6555599e5cca243ead9238c277f19edd5` to CABLE-ENGINES.md ("name them for the cable they model, not the project label"); then `cd77362802c514cbb4ed4ab23d8a64a6e2e6cc13` DATASHEETS; `d0e11ed0aeea64d941e0bcefd9849ad981b487a5` priority and protection; `cb3848547823ad37cbe031b610246d1bb03e3cd4` the capsule. Hunk from 7f9291c:
```
+So the rule that must survive this change:
+
+> **Class selects the question. Class never decides whether a question is answered.**
+
+Every class produces either a measurement or a named reason. A module that cannot answer hands to a fallback and says it did. A class with no module falls to the general nearest-mapped module rather than falling silent. Reintroducing a technology branch that can end in nothing would walk straight back into the fault that was fixed.
```
Hunk from cb38485 (CAPSULE.json):
```
+ "schema": "gg2050.engine-capsule.v1",
+ "sealed_utc": "2026-09-07T21:43:04.374Z",
+ "generation": "202609071232",
+ "shell": "202608300453-atlas-v9",
```
`sealed_utc` (21:43:04Z) equals the commit time (22:43:04+01:00). The folder stamp `20260907T230000Z` is 1 h 17 m *later* than the seal, so the folder is named for a time in its own future. ventus-grid-engine README picked the documents up at `fb1d37adfb2431ed6614cde44fdbaf95e9cbcd1e` (2026-09-07T22:48:39+01:00, +19 lines).

**T9. 2026-09-08T00:38:01+01:00, gridatlas@b821c7ecf2d82c0e09ad606cd9b9d68360096528: v9.148, "every arrival names the engine that answered it".** The rule moved from document to code 1 h 55 m after the capsule. Message excerpt:
```
The cable-engine rule made observable. A class selects the question; it never
selects whether a question is answered. Until now eleven separate paths could
end an arrival with nothing published at all, which is why a silent map was
indistinguishable from a broken one.
```
Hunk (new file `atlas/cartridges/202609072337-sld-sandbox-v9-8.js`, diff line 5719):
```
+    /* The class selects the question. It never selects whether a question is
+       answered: every arrival leaves one of these behind, and an engine that
+       cannot answer names its reason instead of going quiet. */
+    function classifyEngine(tech, q) {
```

**T10. 2026-09-28T12:51:46+01:00, energy-transition-simulator@20cc36dd6f1303d5a0568e76011e62a52aa4093f: "Engine lock on (from 160ba04, witness SIGNED)".** The site-world block is imported by URL from immutable releases and never copied (engine-lock.js:1, `RELEASES = ['202609270524', '202609271853']` at :21). Message excerpt: `engine-lock 21/21, overlay-smoke 14/14, tables 23/23, GPU blank check VISIBLE 0.0 %, 0 page errors, 4K 101.3 fps.`

**T11. 2026-10-29T20:40:02+00:00, gridatlas@4fa72ae0927f335fd1265e93b28992315cdb55a3: "data-centre category + Grid Engine 30/30/30".** Data centres become a class built on E1 (F13).

No git reverts were found. `git log --format=%s | grep -ci revert` gives 0 for ventus-grid-engine, gridmachine1, grid-distance-maths and data-gridatlas. It gives 1 for energy-transition-simulator, and that one is a narrated in-commit rollback, not a revert commit: `ecc487d05c0fd753226a83f01afd11e8c18fec11` (2026-09-28T03:01:24+01:00), "Stream r7: metric depth pull tried and reverted; near check label prints DEM_OFF".

## Gridatlas and datacentre relevance (how this slice bears on the focus)

- **The engines *are* gridatlas cartridges.** E1 and E4 live in `sld-sandbox` and `substation-intelligence`. ventus-grid-engine certifies extracted copies, and its own README says "an application that does not import a module gains nothing from that module's proofs" (README:208). The live map's protection therefore rests on the capsule hashes and the byte-identity diff (F3), not on the 561 engine checks.
- **The arrival contract is gridatlas's front door.** The live emitter and gridatlas' own arrival grid agree on seven parameters. The engine's `contract.js` lags at five (F10), and one fossil builder in pipelinenews still names a 404 path.
- **Data centres.** The live data-centre engine (v9.187, generation 202610292044) is a *load-side class* that reuses E1 with count 30 and radius 40 km, asserting that E1's top 5 head its list (F13). It inherits E1's honesty: the beyond-radius nearest is named, and "proximity is not connection, capacity or feasibility". ventus-grid-engine's `firm-capacity` proof uses "the paper's data-centre case": 100 MW at 0.95 pf is 105.3 MVA, and a single transformer has zero firm capacity (proofs/firm-capacity.proof.mjs:26-29, 53-56). That is the obvious next question for a data-centre card, and the card does not ask it yet.
- **The data plane** gave data centres no promotion path in V9: the V8 `datacentres` partition is UNVERIFIED and not publishable (F13), which is why the live class reads the dc-a7 pipeline snapshot instead.

## Candidates (unkeyed; clearly marked)

- CANDIDATE: GG-011 ("bounded nearest-search has no stated termination rule") may not apply to E1 at all, because E1 is an exhaustive scan (F1, F16). The bounded search it refers to may be in another cartridge (place-global-search or interconnectors). Not traced.
- CANDIDATE: The datasheet requires WGS84-ellipsoid distances (DATASHEETS:11), but E1 and E4 call `GEODESY.distanceKm`, a sphere on R_ATLAS. The capsule admits this (README:56, "distances computed on a sphere where the ellipsoid is the honest model"). Whether a later gridatlas generation moved to `distanceEllipsoidalKm` was not checked.
- CANDIDATE: Two counts of unlocated connection points coexist: "141 of 355" at 400 kV (DATASHEETS:13) and "384 of 886" across all classes (BUGS GG-012). They look like different scopes, not a contradiction. Not reconciled against data-grid-gb.
- CANDIDATE: The E5 132 kV engine "is not built although its assets are already in the map" (ENGINEERING-PLAN:9). Since the DC engine has voltage-band tabs (`VB`, 06b-dc-engine.js:10) including 132 and 33–66 kV, E5 may now exist de facto inside the data-centre card for data-centre taps only.

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)

1. **CABLE-ENGINES.md:32** — "A cable engine selects the question. It never decides whether a question is answered." The estate's routing law, one sentence long.
2. **sld-sandbox-202609241334:1665** — `const MAX_LINK_KM = 40;            // beyond this, silence is more honest`, paired with **:3538** `result.beyondRadiusNearest = result.length ? null : beyond;`. The comment and the line that makes the silence honest.
3. **sld-sandbox-202609241334:626-633** — the counted sample under a superlative (E4).
4. **CAPSULE.json:38** plus the re-verification: a seal that still holds 54 days later, byte for byte (F3).
5. **CABLE-ENGINE-DATASHEETS.md:15** — "An engine publishes a sentinel when it fires, and a named reason when it cannot | Silence is indistinguishable from failure."
6. **sld-sandbox-202609241334:4477** — `reason: reason || (answered ? null : 'UNSTATED'),`. The absence of a reason is itself a reason code.
7. **validity.mjs:47** — "A harness that cannot pass a known-good case has no standing to fail a candidate."
8. **compute-observer.js:68-69** — an empty result must carry evidence that the search completed.
9. **grid-distance-maths geodesy.mjs:372-387** — `sweptClearanceKm`, the termination proof.
10. **06b-dc-engine.js:5-6** — the data-centre engine asserting that the protected engine's 5 head its 30: the focus class built on the protected engine.

## One next command (exactly one, runnable from a clone)

```
cd /home/user/estate/gridatlas && for f in $(ls atlas/cartridges/*sld-sandbox-v9-8.js | sort); do printf '%s ' "$f"; sed -n '/function nearestSubstations(lon, lat, subs) {/,/^  }$/p' "$f" | sha256sum | cut -c1-16; done | awk '{print $2, $1}' | uniq -c -w16
```
(It hashes the E1 body in every sld-sandbox generation, all 92 files, and groups them by hash. That gives the full protection lineage of the substation finder: when it last changed, and whether any generation broke it.)
