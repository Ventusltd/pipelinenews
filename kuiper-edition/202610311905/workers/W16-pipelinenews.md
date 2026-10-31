# W16 pipelinenews
HEADS: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 (keys use the project tip 67aa2eb05993c630887b41c3b720ba42a86669a4. The clone HEAD kept moving during this run because the harness commits worker reports: it was 67aa2eb at start, ca9bc00e3c67a70899eafe3b1b30cba9c16f4eab at write time. Every commit after 67aa2eb touches only kuiper-edition/: `git diff --name-only 67aa2eb05993c630887b41c3b720ba42a86669a4 HEAD | grep -v "^kuiper-edition/" | wc -l` = 0, so each keyed line is byte-identical at HEAD; resolve with `git show <sha>:<path> | sed -n <line>p` or `sed -n <line>p <path>`.)
Written 2026-10-31T19:40:00Z by W16 (Opus). Read only; no clone was changed.

READ:
README.md
.github/DEPLOYMENT_POLICY.md
.github/workflows/ (55 files listed; pages.yml, bbc-rss-discovery.yml read)
.github/workflow-archive/20260830-email-storm/README.md (+ 8 archived yml listed)
index/ (21 compilers listed; 202608261927-compile-index.mjs, 202608291310-compile-atlas-v9-deep-link.mjs read; all grepped)
releases/current-v3.json
releases/current-v4.json
releases/202609060232-pipelinenews/release-manifest.json
releases/202609060232-pipelinenews/sha256sums.txt
releases/202609060232-pipelinenews/assets/202609040044-atlas-pointer-deep-link.mjs
releases/202609060232-pipelinenews/assets/202608311610-grid-proximity.mjs
releases/202609060232-pipelinenews/assets/202608311343-project-intelligence.mjs
releases/202609060232-pipelinenews/assets/202609040044-wider-fleet.mjs
releases/202609060232-pipelinenews/data/202608311343-project-intelligence.json (parsed with python -I, not printed)
releases/202609010836-index.html
releases/javascript/202609010836-projects-v9-5-1.js
ui/atlas-v9-deep-links.js
ui/javascript/202608261804-projects-v9-5-1.js
ui/templates/202608261927-shell-v9-6-2.html (via diff)
discovery/bbc_rss.py
discovery/test_bbc_rss.py (via diff)
discovery/products/bbc-rss.json (via diff)
manifests/202608291310-atlas-v9-deep-link-successor.json
git history: full, 521 project commits + 1 swarm commit

Directory sizes (tracked files, `git ls-files <dir> | wc -l` at 67aa2eb05993c630887b41c3b720ba42a86669a4): data 52, ui 41, index 21, releases 2618, atman 57, build 47, archive 731, cartridges 11, discovery 26, orchestration 3, automation 2, manifests 32, repairs 1, reports 2, state 2, tools 142, scripts 2, docs 36; total 3901 tracked files.

## Findings (keyed)

### F1 The engine category belongs on the row, not the map
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 README.md:47
QUOTE:
```markdown
**This repository decides which engine answers.** The engine category belongs on the row, not in the map: the table shows it, the MAP link carries it, and the receipt asserts it. That makes routing testable before a browser opens, visible to a reader, and unable to disagree with itself. Inferring the engine at arrival is what made offshore projects look silent.
```
WHY: The single rule this repository contributes to the cable-engine estate: routing is decided where the data is (the pipeline row), carried in the transport (the MAP link), and asserted in a receipt, so the receiver never guesses. The last sentence names the failure it fixes: offshore projects looked silent because the Atlas inferred the engine on arrival. Added in commit 41e3f3e05684cbbf442324050f3a266e443f4cf7 (2026-09-07T22:48:39+01:00), about four hours before the code that implements it (F2).
PATTERN: Decide at the source, carry in the link, assert in the receipt.

### F2 The code that puts the engine on the row and in the MAP link
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 ui/javascript/202608261804-projects-v9-5-1.js:30-40
QUOTE:
```js
// The row declares which Ventus cable question the MAP action will answer.
// Keep this deterministic and derived from the canonical technology; the Atlas
// must not infer a different engine after arrival.
export function gridAnalyticsEngineV1(project) {
  const explicit = String(project?.grid_engine || "").trim();
  if (explicit) return explicit;
  const technology = String(project?.technology || "").trim().toLowerCase();
  if (technology === "wind_offshore") return "VENTUS OFFSHORE DETERMINISTIC";
  if (technology === "interconnector") return "VENTUS INTERCONNECTOR";
  return "VENTUS ONSHORE";
}
```
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 ui/javascript/202608261804-projects-v9-5-1.js:60
QUOTE:
```js
  url.searchParams.set("grid_engine", gridAnalyticsEngineV1(project));
```
WHY: Commit 8d6566821d3f79f4a6ca4be5eaa93c805bb5f682 ("Declare Grid Analytics Engine per pipeline row", 2026-09-08T02:44:04+01:00). It is deterministic: an explicit `grid_engine` wins, otherwise the canonical technology picks one of three labels. The same function feeds the table cell, the CSV column "Grid Analytics Engine" and the `grid_engine` query parameter, so the three surfaces cannot disagree. Limits, measured: `grep -rIl --exclude-dir=kuiper-edition --exclude-dir=.git 'grid_engine' .` returns only this file and its release copy; no receipt or test in pipelinenews asserts the engine (the README's "the receipt asserts it" is UNVERIFIED in this repo), and the latest release's deep-link cartridge (F3) does not carry `grid_engine` at all.
PATTERN: One pure function, three surfaces (table, CSV, link).

### F3 Fail-closed Pipeline News to GridAtlas transport contract
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 releases/202609060232-pipelinenews/assets/202609040044-atlas-pointer-deep-link.mjs:75-82
QUOTE:
```js
/** Return a canonical absolute URL, or an empty string for a non-clickable row. */
export function buildAtlasV9DeepLink(project) {
  const fields = projectFields(project);
  if (fields.geometryStatus !== undefined && fields.geometryStatus !== "valid") return "";
  if (!/^[1-9]\d*$/u.test(fields.repdRef)) return "";
  if (!TECHNOLOGIES.has(fields.technology)) return "";
  if (CONTROL_CHARACTER.test(fields.name)) return "";
  if (fields.capacity === null || fields.latitude === null || fields.longitude === null) return "";
```
WHY: The MAP button exists only when REPD identity is a positive integer, the technology is one of 14 canonical GridAtlas tokens, the name has no control characters and both coordinates and capacity are finite and in range. Otherwise the row gets an empty string and no link: "dropping identity is never a fallback for a receiver defect" (line 6-7 of the same file). This is the receiver handshake for https://ventusltd.github.io/gridatlas/atlas/ (line 11).
PATTERN: Refuse to emit rather than emit a degraded link.

### F4 Self-test that names the refusals
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 releases/202609060232-pipelinenews/assets/202609040044-atlas-pointer-deep-link.mjs:116-126
QUOTE:
```js
  check("zero capacity remains explicit",
    new URL(buildAtlasV9DeepLink({ ...fixture, capacity_mw: 0 }))
      .searchParams.get("capacity_mw") === "0");
  check("missing identity is not worked around",
    buildAtlasV9DeepLink({ ...fixture, repd_ref: "" }) === "");
  check("unknown technology fails closed",
    buildAtlasV9DeepLink({ ...fixture, technology: "Biomass (dedicated)" }) === "");
  check("half coordinate fails closed",
    buildAtlasV9DeepLink({ ...fixture, longitude: null }) === "");
  check("invalid geometry fails closed",
    buildAtlasV9DeepLink({ ...fixture, geometry_status: "missing" }) === "");
```
WHY: Every refusal in F3 has a named check: zero capacity stays explicit (0 is data, not missing), missing identity "is not worked around", unknown technology, half coordinate and invalid geometry all fail closed. The test names read as the law.
PATTERN: Executable law: test names state the refusal.

### F5 One Earth radius for the whole estate, with the reason
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 releases/202609060232-pipelinenews/assets/202608311610-grid-proximity.mjs:61-72
QUOTE:
```js
/* ---- geodesy -------------------------------------------------------------
   Byte-for-byte the same formula and constant as ventus-corev8engine.js
   haversine() and gis-sld-v5-drawing.js atlasHaversineKm(). Do not "improve"
   this to 6371.0088 - that is what made the old circuit_km read 0.112% short
   and disagree with every other Ventus tool.                               */
const R_ATLAS = 6378.137;
const DEG = Math.PI / 180;

function atlasHaversineKm(lon1, lat1, lon2, lat2) {
  const dLat = (lat2 - lat1) * DEG;
  const dLon = (lon2 - lon1) * DEG;
  const x = Math.sin(dLat / 2) ** 2
```
WHY: Pins R = 6378.137 km (WGS84 equatorial) so a distance read in PipelineNews equals the GridAtlas radius tool and the SLD sandbox. The comment records the measured cost of "improving" it: 6371.0088/6378.137 = 0.99888, i.e. 0.112% short, exactly as stated. A mathematical constant held for cross-tool agreement, not for textbook accuracy.
PATTERN: Shared constant over correct constant; document the drift it prevents.

### F6 Immutable dated compiler: write-once outputs
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 index/202608261927-compile-index.mjs:295-306
QUOTE:
```js
async function writeOutputs(outputs) {
  for (const outputPath of outputs.keys()) {
    try {
      await access(absolute(outputPath), constants.F_OK);
      assert.fail(`immutable output already exists: ${outputPath}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  for (const [outputPath, content] of outputs) {
    await mkdir(path.dirname(absolute(outputPath)), { recursive: true });
    await writeFile(absolute(outputPath), content, { flag: "wx" });
```
WHY: README.md:9 calls index/ "immutable dated compilers"; this is how they enforce it on outputs: a pre-pass refuses if any output exists, then `flag: "wx"` makes the OS refuse an overwrite. Count: `grep -c 'flag: "wx"' index/*.mjs | awk -F: '$2>0' | wc -l` = 20 of 21 compilers (the exception is index/202608261812-compile-index.mjs, which asserts readiness instead).
PATTERN: Write-once output (O_EXCL).

### F7 The immutable compilers were themselves rewritten in place by a bot, and now disagree with their own manifest
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 index/202608291310-compile-atlas-v9-deep-link.mjs:108-112
QUOTE:
```js
function replaceExactly(source, needle, replacement, count = 1) {
  const actual = source.split(needle).length - 1;
  assert.equal(actual, count, `replacement anchor count ${actual} != ${count}: ${needle.slice(0, 100)}`);
  return source.split(needle).join(replacement);
}
```
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 index/202608291310-compile-atlas-v9-deep-link.mjs:122
QUOTE:
```js
  html = replaceExactly(html, "https://ventusltd.github.io/gridatlas/202608300453-atlas-v9/", ATLAS_BASE, 2);
```
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 manifests/202608291310-atlas-v9-deep-link-successor.json:62-64
QUOTE:
```json
      "path": "index/202608291310-compile-atlas-v9-deep-link.mjs",
      "bytes": 25127,
      "sha256": "ff39f3076abf25e00133d08a6082238f22f86c555d8998b55bc49a41f461b841"
```
WHY: Outputs are write-once (F6) but the compilers are not. pipelinenews-atlas-link-bot edited 7 dated compilers in place twice on 2026-08-30 (da99c41278b7ebdc9b2cd31313efcaf9ee734392 at 03:43:57Z, 0fff06fb3c130b9fd6d37a64d229c54fa97c139c at 04:11:18Z) with a blanket Atlas-URL substitution. In da99c41 the substitution also rewrote the replacement anchor at line 122 (originally `"https://globalgrid2050.com/repd_grid_atlasv8/"`), so line 122 now replaces ATLAS_BASE with itself; against the pinned parent the anchor count can no longer equal 2, and replaceExactly will refuse. The compiler hashes itself into the release (line 264 `readFile(fileURLToPath(import.meta.url))`, line 184 `sha256(compilerRaw)`): the manifest records ff39f3076abf..., the working file hashes to 9b75b63beadc... (`sha256sum index/202608291310-compile-atlas-v9-deep-link.mjs`; `git show db9f7583b203d374781e2b38e7c7a8b86e32d8b3:index/202608291310-compile-atlas-v9-deep-link.mjs | sha256sum` = ff39f307...). The anchor-count assert means the drift fails loudly instead of silently producing a different release: the law held even when the immutability convention did not.
PATTERN: Anchor-count replacement (exact N occurrences or refuse); self-hashing compiler.

### F8 The engine column was added to an "immutable" release, and the release rows do not render it
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 releases/202609010836-index.html:152-154
QUOTE:
```html
            <th>GRID ANALYTICS ENGINE</th>
            <th>NEWS SIGNAL</th>
            <th>ACTIONS</th>
```
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 releases/javascript/202609010836-projects-v9-5-1.js:122
QUOTE:
```js
    const gridEngine = gridAnalyticsEngineV1(project);
```
WHY: Commit 8d6566821d3f79f4a6ca4be5eaa93c805bb5f682 edited files under releases/ (README.md:10: "immutable dated release output"). In the ui/ source the row template gained `<td class="grid-engine">`; in the release copy only the header and the unused `const gridEngine` were added. Measured: the release header has 12 `<th>` (lines 139-154) while the row template emits 11 `<td>` (`L=$(grep -n '<tr id="repd' releases/javascript/202609010836-projects-v9-5-1.js | cut -d: -f1); sed -n ${L}p releases/javascript/202609010836-projects-v9-5-1.js | grep -o '<td[^>]*>' | wc -l` = 11; same for ui/javascript/202608261804-projects-v9-5-1.js line 140 = 12). So on that release page NEWS SIGNAL cells sit under GRID ANALYTICS ENGINE and ACTIONS under NEWS SIGNAL. The rule "visible to a reader, and unable to disagree with itself" was broken by the very commit that introduced it, on the release copy.
PATTERN: Counter-example: hand-patching a release instead of compiling a new generation.

### F9 Build instructions do not authorise deployment
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 README.md:19
QUOTE:
```markdown
Build instructions do not authorise deployment. Every deployment requires explicit owner approval.
```
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 .github/DEPLOYMENT_POLICY.md:7
QUOTE:
```markdown
The Pages staging gate must fail closed on candidate manifests and exclude every release output declared by `build/*-v8-fast-site-manifest.json` unless a separate, valid owner-authorisation record exists at `build/authorisations/<generation>-v8-fast-pages-authorisation.json`. The immutable candidate manifest must remain byte-for-byte unchanged with `deployment: not-authorised`; changing that field is not an authorisation and must fail the gate.
```
WHY: Separates "may build" from "may deploy". The policy makes the field `deployment: not-authorised` part of the hashed candidate; flipping it is defined as a gate failure, not an authorisation. Authorisation is a separate record bound to manifest hash, commit, run and output closure. README.md:28 repeats it for workflows: "No workflow above authorises deployment."
PATTERN: Authorisation is a separate signed record, never an edited field.

### F10 The 2026-08-30 email storm: retire, archive byte-for-byte, narrow triggers
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 .github/workflow-archive/20260830-email-storm/README.md:3-5
QUOTE:
```markdown
These timestamped, one-use repair, authorisation and Atlas-successor workflows were archived after they generated duplicate push/schedule runs and misleading failure-email bursts.

They are retained byte-for-byte for audit but are no longer executable by GitHub Actions because they are outside `.github/workflows/`.
```
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 .github/workflows/pages.yml:3-5
QUOTE:
```yaml
# Automatic deployment is intentionally limited to immutable release and
# pointer outputs. Workflow-source edits require an explicit manual dispatch,
# preventing one source commit from launching obsolete promotion workflows.
```
WHY: Commit 83d9c430b283f8beaa8c0a05e42b14d4a4784623 (2026-08-30T12:45:12+01:00, "retire duplicate workflows and stop notification storm"). 8 one-use workflows were moved outside .github/workflows (kept for audit, no longer executable) and pages.yml stopped triggering on its own source. 2026-08-30 had 54 commits, 7 of them by 6 distinct single-purpose bots (ledger-count-repair, pages-gate-repair, pointer-release-boundary, runtime-receiver-gate, atlas-link, atlas-link-release). The rule learned, "workflow-source edits require an explicit manual dispatch", is the one the priority-solar change broke on 2026-09-26 (History, H10).
PATTERN: Quarantine by relocation; triggers listen to outputs, not sources.

### F11 Release manifest: generation read from the clock, rollback by rebuild
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 releases/202609060232-pipelinenews/release-manifest.json:32-37
QUOTE:
```json
  "deployment": "not-authorised",
  "existing_dashboard_modification": "Adds a BBC RSS panel. Headlines and reported capacity do not change official REPD rows, geometry or totals.",
  "existing_dashboard_modified": true,
  "generation": "202609060232",
  "generation_source": "read from UTC clock at build time, never chosen",
  "immutable_after_publication": true,
```
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 releases/202609060232-pipelinenews/release-manifest.json:57-58
QUOTE:
```json
  "rollback": "build again with --from an earlier release; nothing is edited in place",
  "runtime_verified": false,
```
WHY: The latest release (21 assets, 44 data files, 21 named cartridges) declares itself not-authorised and not runtime-verified, takes its generation from the UTC clock "never chosen", and defines rollback as rebuild-from-earlier, never edit. `sha256sum -c sha256sums.txt` in that folder: 70 of 70 OK at 2026-10-31T19:30:00Z. The public pointer releases/current-v4.json still names generation 202609040144 (current-v4.json:49), so 202609060232 is a candidate, not live.
PATTERN: Self-describing immutable release; time-derived identity.

### F12 Bounded RSS ingest that refuses DTDs and never binds identity
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 discovery/bbc_rss.py:33-38
QUOTE:
```python
    # RSS campaign parameters are attribution, not a second news identity.
    return 'https://www.bbc.co.uk' + u.path


def parse_feed(body, feed_url, observed_at):
    if len(body) > MAX_BYTES or b'<!DOCTYPE' in body.upper() or b'<!ENTITY' in body.upper():
```
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 discovery/bbc_rss.py:121
QUOTE:
```python
            'scope':'RSS headlines and links; no article-page requests; no inferred REPD match.'}
```
WHY: 1 MiB cap per feed, DTD/ENTITY refused before parsing (XXE and billion-laughs), redirects disabled (`class NoRedirect`, line 91), campaign parameters stripped so one article has one identity, and every item lands `UNMATCHED_REQUIRES_REVIEW` with `eligible_for_project_signal: False` (line 66). News never overwrites REPD facts, the first rule in the initial README (H1).
PATTERN: Bounded, identity-neutral ingest.

### F13 Cartridge loader asserts the privacy and corroboration boundary before display
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 releases/202609060232-pipelinenews/assets/202608311343-project-intelligence.mjs:302-310
QUOTE:
```js
      invariant(payloadRequests === 1, "derived index requested more than once");
      const response = await fetch(payloadAsset.url, { cache: "force-cache" });
      invariant(response.ok, `derived index HTTP ${response.status}`);
      data = await response.json();
      invariant(data.schema === "pipelinenews.v9.project-intelligence.v1",
        "derived index schema changed");
      invariant(data.law?.no_personal_data === true, "privacy boundary changed");
      invariant(data.law?.corroboration_adapters_built === false,
        "corroboration claim changed; review before display");
```
WHY: The payload may be fetched exactly once, must carry the expected schema, must still declare `no_personal_data === true`, and must still declare that no corroboration adapters exist; if a later payload claims corroboration, display stops "review before display". The contract block (lines 25-39) adds `additive_only`, `mutates_existing_dom: false`, `project_bindings: 0`, `one_signal_policy: "WITHHOLD"`.
PATTERN: Assert the payload's own law flags at load time.

### F14 Distance to the nearest mapped data centre (the datacentre surface in PipelineNews)
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 releases/202609060232-pipelinenews/assets/202608311343-project-intelligence.mjs:169-180
QUOTE:
```js
function tabDataCentres(data, ix) {
  const withDc = data.rows.filter((r) => r[ix.datacentre_km] !== null);
  const buckets = [
    { label: "within 5 km", f: (v) => v <= 5, c: "#00ff88" },
    { label: "5 – 10 km", f: (v) => v > 5 && v <= 10, c: "#00ffff" },
    { label: "10 – 25 km", f: (v) => v > 10 && v <= 25, c: "#66ccff" },
    { label: "over 25 km", f: (v) => v > 25, c: "#8888ff" },
  ].map((b) => ({ label: b.label, c: b.c, n: withDc.filter((r) => b.f(r[ix.datacentre_km])).length }));

  const close = withDc
    .filter((r) => r[ix.datacentre_km] <= 5 && r[ix.band] === "EARLY")
    .sort((a, b) => a[ix.datacentre_km] - b[ix.datacentre_km])
```
WHY: The only data-centre lens in this repo: straight-line km from each live solar/BESS project to the nearest OSM-mapped data centre, bucketed, with the "EARLY in lead time and within 5 km" pairings surfaced. Measured on the shipped payload (python -I over data/202608311343-project-intelligence.json): 3,054 projects, 98 distinct data-centre names, 1,964 projects with a distance, 263 within 5 km; provenance string "OpenStreetMap via Overpass, ODbL-1.0"; caveat "Straight-line distance to a mapped feature - a screen, not a connection route."
PATTERN: Screen, not route: label proximity as proximity.

### F15 Never hand-keep a technology list
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 releases/202609060232-pipelinenews/assets/202609040044-wider-fleet.mjs:37-40
QUOTE:
```js
 * The names and the counts are both read from the payload at mount time and
 * are never listed in this file: a hand-kept technology list is exactly what
 * left wind_onshore in this product and absent from the engine's layer ids. A
 * new REPD type gets an option, with its own count, with no edit here.
```
WHY: Names a real defect (wind_onshore missing from the engine's layer ids) and the rule that prevents its recurrence: option names and counts come from the payload. The header's 20 per-type counts (lines 20-24) sum to 1,104, equal to `source_rows: 1104` in WIDER_FLEET_CONTRACT (line 87); checked by hand.
PATTERN: Derive enumerations from data, never from source.

### F16 The older, permissive deep link it replaced
KEY: pipelinenews@67aa2eb05993c630887b41c3b720ba42a86669a4 ui/atlas-v9-deep-links.js:3-11
QUOTE:
```js
  const RELEASE_ID = "202608300453-atlas-v9";
  const BASE_URL = "https://ventusltd.github.io/gridatlas/202608300453-atlas-v9/";
  const TECHNOLOGIES = new Set(['solar', 'bess', 'wind_onshore', 'wind_offshore']);
  const REPD_REF = /^[A-Za-z0-9-]{1,40}$/;

  function buildAtlasV9Url(project) {
    const repdRef = String(project?.repd_ref ?? project?.repdRef ?? '').trim();
    const technology = String(project?.technology ?? '').trim();
    if (!REPD_REF.test(repdRef) || !TECHNOLOGIES.has(technology)) return null;
```
WHY: The 2026-08-30 bot-bound version (last edited by 0fff06fb3c130b9fd6d37a64d229c54fa97c139c): a dated Atlas folder URL, only 4 technologies, a permissive alphanumeric REPD pattern, and coordinates optional (lines 13-16 set name/longitude/latitude only if present). Five days later F3 pinned a stable receiver path, 14 technologies, `/^[1-9]\d*$/u` identity and mandatory coordinates. The diff between F16 and F3 is the arc from "link if you can" to "link only if exact".
PATTERN: Contract tightening over generations.

## Patterns (keyed; each cites at least one F above)
- P1 Decide at the source, carry in the link, assert in the receipt: F1, F2; counter-example F8; receipt half UNVERIFIED here.
- P2 Fail-closed emission (empty string instead of a degraded artefact): F3, F4, contrast F16.
- P3 Write-once outputs and time-derived generations: F6, F11.
- P4 Anchor-count replacement and self-hashing compilers, which convert silent drift into a loud refusal: F7.
- P5 Shared constant for cross-tool agreement: F5.
- P6 Additive cartridge contract (own host, no DOM mutation, zero bindings, WITHHOLD): F13, F14, F15.
- P7 Build separated from deploy; authorisation as a separate record; triggers on outputs not sources: F9, F10.
- P8 Bounded, identity-neutral ingest: F12.

## History (keyed by commit SHAs; cadence, authorship, turning points, storms, reverts)

Counts at project tip 67aa2eb05993c630887b41c3b720ba42a86669a4 (521 commits, `git rev-list --count 67aa2eb05993c630887b41c3b720ba42a86669a4`); commits after the tip are the swarm's own workspace commits by Claude (first de3e68e42e01d3f37e26fb08b9bc76d36e299b61 at 2026-10-31T19:11:10Z), excluded from every count below.

Span: e3ec7bf061a5733a61c047c31e96877d3fa81698 (2026-08-24T11:39:30+01:00) to 67aa2eb05993c630887b41c3b720ba42a86669a4 (2026-09-26T14:27:23+01:00); 22 active UTC days. 3 merge commits (`git log --merges --oneline | wc -l`).

Commits per UTC day (`TZ=UTC git log 67aa2eb05993c630887b41c3b720ba42a86669a4 --format=%ad --date=format-local:%Y-%m-%d | sort | uniq -c`):
```
      5 2026-08-24
     78 2026-08-25
     54 2026-08-26
     38 2026-08-27
      6 2026-08-28
      7 2026-08-29
     54 2026-08-30
     37 2026-08-31
     82 2026-09-01
     22 2026-09-02
     57 2026-09-03
      8 2026-09-04
     10 2026-09-05
     19 2026-09-06
      5 2026-09-07
      5 2026-09-08
      5 2026-09-09
      5 2026-09-10
      5 2026-09-11
      6 2026-09-12
      3 2026-09-13
     10 2026-09-26
```
Peaks: 2026-09-01 (82) and 2026-08-25 (78). From 2026-09-07 the repo is almost entirely the BBC bot.

Authors, names only (`git log 67aa2eb05993c630887b41c3b720ba42a86669a4 --format=%an | sort | uniq -c | sort -rn`):
```
    417 Ventusltd
     59 github-actions[bot]
     17 PipelineNews Bot
     13 Claude
      8 Vikram Kumar
      2 pipelinenews-atlas-link-bot
      1 pipelinenews-runtime-receiver-gate-bot
      1 pipelinenews-pointer-release-boundary-bot
      1 pipelinenews-pages-gate-repair-bot
      1 pipelinenews-ledger-count-repair-bot
      1 pipelinenews-atlas-link-release-bot
```
Bot share: 83 of 521 = 15.9% (github-actions[bot] 59 + PipelineNews Bot 17 + 7 commits from 6 single-purpose pipelinenews-*-bot identities). The 13 "Claude" commits (2026-09-02 to 2026-09-04, "board" and "overnight" entries) are agent-authored and not counted as bots.

Longest gaps (`git log 67aa2eb05993c630887b41c3b720ba42a86669a4 --format='%at %H' | sort -n | awk 'NR>1{print $1-p, ph, $2} {p=$1; ph=$2}' | sort -rn | head -5`):
1. 306h39m: 4980096b57cb35f63ad2d80bded5687beb2a9532 (2026-09-13T16:17:16+00:00, last BBC bot refresh) to 0f42f419ed3d74c6767e7c8c0e139a79513d2894 (2026-09-26T11:57:04+01:00, first priority-solar commit).
2. 25h40m: 83d9c430b283f8beaa8c0a05e42b14d4a4784623 (2026-08-30T12:45:12+01:00, storm retirement) to 9937d1efee29639e90a36b51417b0afe5e032d06 (2026-08-31T14:25:42+01:00).
3. 21h51m: 58ca361c921264c1218d4a3f6d1f87da33f8473e (2026-08-27T21:51:35+00:00) to a1516f23a2f8f1e2a3b286ed73cd580ce501c179 (2026-08-28T20:43:11+01:00).
4. 17h03m: 3335fe6f47ae4f7f3052a7dea28e20c9570d9230 (2026-09-04T09:01:33+00:00) to 4fc83af4a617ea08de569a7363f5ca4e510d24fa (2026-09-05T03:05:19+01:00).
5. 12h41m: 693ccda8e6288d449763ce2b3a4ba16ed7b93fee (2026-08-29T02:09:03+01:00) to db9f7583b203d374781e2b38e7c7a8b86e32d8b3 (2026-08-29T14:50:41+01:00).

### The "Refresh BBC RSS metadata [skip ci]" storm
Command: `git log 67aa2eb05993c630887b41c3b720ba42a86669a4 --format=%H --grep='Refresh BBC RSS metadata' | wc -l` = 39. Range: first a1ca8f9155f037b121fe8be883bda51d06f9ca5c at 2026-09-06T02:02:50+00:00, last 4980096b57cb35f63ad2d80bded5687beb2a9532 at 2026-09-13T16:17:16+00:00 (`git log --format=%ad --date=iso-strict --grep='Refresh BBC RSS metadata' | sort | sed -n '1p;$p'`). All 39 by github-actions[bot]; per day 7, 4, 4, 5, 5, 5, 6, 3 (2026-09-06..13). Footprint: 39 touches of discovery/products/bbc-rss.json, 1 of data/provisional/project-register.json (`git log --format='' --name-only --grep='Refresh BBC RSS metadata' | sort | uniq -c`). In the same eight days humans made 14 commits. Source: the cron `'17 */2 * * *'` and a commit-on-diff step (.github/workflows/bbc-rss-discovery.yml:4, :42-43), introduced by 7df51f3412b7a4306dee2bd5ce92e15c9174a985 (2026-09-06T03:01:34+01:00). A 2-hourly cron allows about 91 runs in that window; 39 produced a diff.

### The priority solar collector and its revert
Ten commits on 2026-09-26, all Ventusltd, 11:57:04+01:00 to 14:27:23+01:00:
```
0f42f419ed3d74c6767e7c8c0e139a79513d2894 2026-09-26T11:57:04+01:00 Prioritise BBC national and local solar discovery above 1 MW
3befce0cca7b3452f2353065591d4053e2bde2a4 2026-09-26T11:57:09+01:00 Test BBC solar capacity priority lane
a1a3bf4c1c5ed9b107c288ff6bf1774861f0f779 2026-09-26T11:57:13+01:00 Run priority BBC solar discovery hourly
9654ddf486f16046236986cca235fadb077843a2 2026-09-26T11:59:53+01:00 Add Solar Power Portal and pv magazine priority sources
26b69dfc1573aa96e50296b7a875f7bff8da5844 2026-09-26T11:59:59+01:00 Test UK source priority across three solar publishers
2fd65304fdfd51780c13823f7d14b87019e245b1 2026-09-26T13:00:33+01:00 Run priority solar discovery after collector changes
faf33a5d2f3377d566360b227cda05ee4c4af701 2026-09-26T13:08:05+01:00 Harden three-source priority collector ordering and health
403877d5b3e82e8d6ca10a0ec336d272eea83434 2026-09-26T13:08:20+01:00 Test three-source collector health and source identities
79f84802d401407a42630e3228b2780d125d2233 2026-09-26T13:09:31+01:00 Seed verified current priority solar news without claiming RSS execution
67aa2eb05993c630887b41c3b720ba42a86669a4 2026-09-26T14:27:23+01:00 Restore PipelineNews to pre-priority-source changes
```
What changed: discovery/bbc_rss.py grew from BBC-only to three ranked sources (BBC 1, Solar Power Portal 2, pv magazine 3), a solar-only topic, a capacity regex with a >1 MW gate that kept unknown-MW items, a UK-signal requirement for the two trade sources, and 39 BBC Local feeds. The workflow went hourly (a1a3bf4c1c5ed9b107c288ff6bf1774861f0f779) and then gained a push trigger on its own source (2fd65304fdfd51780c13823f7d14b87019e245b1). The seed commit 79f84802d401407a42630e3228b2780d125d2233 replaced the collector product with hand-entered items, status `"seeded_from_public_web_evidence_pending_collector_rerun"`, each with `"evidence_note": "Public BBC-indexed page observed 2026-09-26; RSS collector has not yet rerun."`

The revert 67aa2eb05993c630887b41c3b720ba42a86669a4 is exact: `git rev-parse 4980096b57cb35f63ad2d80bded5687beb2a9532^{tree} 67aa2eb05993c630887b41c3b720ba42a86669a4^{tree}` both print b7e44c2a142efe75e99daffa341267e4ae2a276c. Stat: 4 files, 287 insertions, 227 deletions. Its message gives no reason. Workflow hunk (first 12 lines of `git show 67aa2eb05993c630887b41c3b720ba42a86669a4 -- .github/workflows/bbc-rss-discovery.yml` after the header):
```diff
@@ -1,13 +1,7 @@
 name: Refresh BBC RSS discovery
 on:
-  push:
-    branches: [main]
-    paths:
-      - 'discovery/bbc_rss.py'
-      - 'discovery/test_bbc_rss.py'
-      - '.github/workflows/bbc-rss-discovery.yml'
   schedule:
-    - cron: '17 * * * *'
+    - cron: '17 */2 * * *'
```
Collector hunk (sources removed):
```diff
 import xml.etree.ElementTree as ET
 
-SOURCES = {
-    1: ('BBC News', None),
-    2: ('Solar Power Portal', 'https://www.solarpowerportal.co.uk/feed/'),
-    3: ('pv magazine', 'https://www.pv-magazine.com/feed/'),
-}
-SOURCE_ID_PREFIX = {1: 'bbc', 2: 'spp', 3: 'pvmag'}
-UK_SIGNAL = re.compile(r'\b(UK|United Kingdom|Britain|British|England|Scotland|Wales|Northern Ireland|London|GB)\b', re.I)
-
 SECTIONS = ('science_and_environment', 'business', 'england', 'scotland', 'wales',
-            'northern_ireland', 'uk',
```
Gate hunk (capacity and UK gates removed):
```diff
+            url = canonical_article(item.findtext('link', '').strip())
         except ValueError:
             continue
         headline = ' '.join(item.findtext('title', '').split())[:300]
         # Description is used only to find relevant links; no article body is retained.
         description = item.findtext('description', '')[:2000]
-        text = headline + ' ' + description
-        if not headline or not SOLAR_TOPIC.search(text):
-            continue
-        # BBC local/national feeds are UK by construction. Trade publications
-        # are global, so require a UK signal before they enter this lane.
-        if source_priority in (2, 3) and not UK_SIGNAL.search(text):
```
Why, from what the repository shows (the message does not say): (a) the push trigger on `.github/workflows/bbc-rss-discovery.yml` is the exact trigger shape retired after the 2026-08-30 storm (F10: "Workflow-source changes require an explicit manual dispatch"), and the hourly cron doubled the scheduled run rate of a bot that had already produced 39 commits in eight days; (b) the product file was seeded by hand rather than produced by the collector, and no "Refresh priority solar news metadata" commit exists in the history (`git log --all --grep='priority solar news metadata'` is empty), so the new collector never demonstrably ran; (c) the revert restored the last collector-produced product (`"checked_at": "2026-09-13T16:17:09.712269+00:00"`, status ok). It is the newest project commit; nothing has run since.

### Turning points (full SHAs, hunks of at most 12 lines)
H1 e3ec7bf061a5733a61c047c31e96877d3fa81698 2026-08-24T11:39:30+01:00 "Initialize Pipeline News architecture": the rules that every later finding enforces.
```diff
+production architecture and should not be edited to implement new features.
+
+## Non-negotiable rules
+
+- Government/project-source facts remain authoritative.
+- News intelligence is a separate layer and never overwrites official identity,
+  capacity, status, dates, or references.
+- A model must never invent an identifier or establish identity from free text.
```
H2 458b8bf040e905145a353851b0f7210acc45f8b9 2026-08-26T15:51:29+01:00 "archive all PipelineNews folders and workflows": 730 files renamed into archive/, 0 insertions, 0 deletions (`git show --stat`). A clean-slate move with nothing deleted.
H3 31bf232b5eecab5fd7980d676399d0296353c05d 2026-08-26T19:39:53+01:00 "add immutable V9.6.2 release compiler": the first write-once compiler (F6).
```js
async function writeOutputs(outputs) {
  for (const outputPath of outputs.keys()) {
    try {
      await access(absolute(outputPath), constants.F_OK);
      assert.fail(`immutable output already exists: ${outputPath}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  for (const [outputPath, content] of outputs) {
    await mkdir(path.dirname(absolute(outputPath)), { recursive: true });
    await writeFile(absolute(outputPath), content, { flag: "wx" });
```
H4 6c403c2f4719c104798fa2268c6bf50f3594d140 2026-08-27T02:21:49+01:00 "v8: add bounded fast-site compiler workflow": 8 files, 3,030 insertions; compiler + contract verifier + browser verifier together.
```
 .github/DEPLOYMENT_POLICY.md                       |   8 +-
 .github/workflows/build-v8-fast-site.yml           | 306 ++++++++
 atman/202608262014-build-pages.py                  | 102 ++-
 .../202608270055-verify-v8-fast-browser.mjs        | 509 ++++++++++++
 .../202608270055-verify-v8-fast-contract.mjs       | 620 +++++++++++++++
 index/202608270055-compile-v8-fast.mjs             | 619 +++++++++++++++
 ui/javascript/202608270055-v8-fast-runtime.js      | 862 +++++++++++++++++++++
 ui/styles/202608270055-v8-fast-overrides.css       |   7 +
 8 files changed, 3030 insertions(+), 3 deletions(-)
```
H5 db9f7583b203d374781e2b38e7c7a8b86e32d8b3 2026-08-29T14:50:41+01:00 "build: automate PipelineNews Atlas V9 live successor": the first push-triggered deployment exception; its 741-line successor workflow is one of the 8 later archived in the storm.
```diff
@@ -18,7 +18,7 @@ Direct publication, manual copying into a Pages branch, local deployment and byp
 
 ChatGPT may design and commit source modules, compilers, tests and non-deploying candidate workflows. It must not perform deployment work outside `.github/workflows/pages.yml`.
 
-Deployment remains owner-triggered through `workflow_dispatch` until the owner explicitly authorises a different trigger.
+Deployment remains owner-triggered through `workflow_dispatch` except for the explicitly authorised PipelineNews Atlas V9 successor. For that successor only, `.github/workflows/pages.yml` may also run on a `main` push whose changed public paths are confined to `releases/202608291310-pipelinenews/**
 
 Every deployment must:
```
(the + line is truncated here at 300 characters; full text at .github/DEPLOYMENT_POLICY.md:21)
H6 da99c41278b7ebdc9b2cd31313efcaf9ee734392 2026-08-30T03:43:57+00:00 pipelinenews-atlas-link-bot: dated compilers rewritten in place, and a replacement anchor destroyed (F7).
```diff
@@ -17,3 +17,3 @@ const PARENT_MANIFEST_SHA256 = "025daf70f1c4b9c9a7c84a70d41ceb50e96232771f736faa
 const COMPILER_METHOD = "pipelinenews-atlas-v9-folder-deep-link-successor-v1";
-const ATLAS_BASE = "https://ventusltd.github.io/gridatlas/202608291239-atlas-v9/";
+const ATLAS_BASE = "https://ventusltd.github.io/gridatlas/202608292311-atlas-v9/";
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
@@ -121,3 +121,3 @@ function compileHtml(parentBytes) {
   html = replaceExactly(html, "ATLAS V9 DEEP-LINK CANDIDATE", "ATLAS V9 DEEP-LINK SUCCESSOR", 5);
-  html = replaceExactly(html, "https://globalgrid2050.com/repd_grid_atlasv8/", ATLAS_BASE, 2);
+  html = replaceExactly(html, "https://ventusltd.github.io/gridatlas/202608292311-atlas-v9/", ATLAS_BASE, 2);
   html = replaceExactly(html, " · NOT DEPLOYED", " · TIMESTAMPED RELEASE · POINTER-CONTROLLED", 3);
```
H7 83d9c430b283f8beaa8c0a05e42b14d4a4784623 2026-08-30T12:45:12+01:00 "retire duplicate workflows and stop notification storm" (F10).
```diff
@@ -1,5 +1,8 @@
 name: Deploy PipelineNews Pages
 
+# Automatic deployment is intentionally limited to immutable release and
+# pointer outputs. Workflow-source edits require an explicit manual dispatch,
+# preventing one source commit from launching obsolete promotion workflows.
       - 'machine-learning/proofs/202608300309-*-atlas-v9-deep-link-proof.json'
-      - '.github/workflows/pages.yml'
-      - '.github/workflows/202608301214-pages-v2.yml'
-      - 'atman/202608262014-build-pages.py'
```
H8 9937d1efee29639e90a36b51417b0afe5e032d06 2026-08-31T14:25:42+01:00 Vikram Kumar "project intelligence panel, repaired map deep link, byte-stable releases": 93 files, 15,704 insertions. Commit message lines:
```
Repairs two faults in the deep link the previous release emitted. The path
omitted the atlas/ segment, so every project link returned 404 (verified: that
URL answers 404, both targets above answer 200). And the link carried repd_ref
alone, so the map had to resolve it by booting a 35.7 MB query engine; it now
carries project, technology, capacity_mw, latitude, longitude and zoom, every
one of which was already in the compact project index and already passed to the
```
H9 7df51f3412b7a4306dee2bd5ce92e15c9174a985 2026-09-06T03:01:34+01:00 "Automate bounded BBC RSS discovery without requiring a REPD match": birth of the collector and of the storm.
```diff
@@ -0,0 +1,151 @@
+"""Bounded BBC RSS discovery. Never fetch article pages or infer REPD bindings."""
```
H10 2fd65304fdfd51780c13823f7d14b87019e245b1 2026-09-26T13:00:33+01:00 "Run priority solar discovery after collector changes": reintroduces a push trigger on workflow source.
```diff
@@ -1,5 +1,11 @@
 name: Refresh BBC RSS discovery
 on:
+  push:
+    branches: [main]
+    paths:
+      - 'discovery/bbc_rss.py'
+      - 'discovery/test_bbc_rss.py'
+      - '.github/workflows/bbc-rss-discovery.yml'
   schedule:
     - cron: '17 * * * *'
```
H11 8d6566821d3f79f4a6ca4be5eaa93c805bb5f682 2026-09-08T02:44:04+01:00 "Declare Grid Analytics Engine per pipeline row" (F1, F2, F8).
```diff
 
+// The row declares which Ventus cable question the MAP action will answer.
+// Keep this deterministic and derived from the canonical technology; the Atlas
+// must not infer a different engine after arrival.
+export function gridAnalyticsEngineV1(project) {
+  const explicit = String(project?.grid_engine || "").trim();
+  if (explicit) return explicit;
+  const technology = String(project?.technology || "").trim().toLowerCase();
+  if (technology === "wind_offshore") return "VENTUS OFFSHORE DETERMINISTIC";
+  if (technology === "interconnector") return "VENTUS INTERCONNECTOR";
+  return "VENTUS ONSHORE";
+}
```
H12 67aa2eb05993c630887b41c3b720ba42a86669a4 2026-09-26T14:27:23+01:00 "Restore PipelineNews to pre-priority-source changes": exact tree restore to 4980096 (above).

## Gridatlas and datacentre relevance (how this slice bears on the focus)
- PipelineNews is the upstream that sends rows into GridAtlas. The latest contract (F3) targets https://ventusltd.github.io/gridatlas/atlas/ with 7 ordered parameters (`repd_ref, project, technology, capacity_mw, latitude, longitude, zoom`, lines 23-26) and records a receiver candidate in gridatlas (commit b73247803377233069acfeff415ecad4e8391cb2, `atlas/codex/20260904-finding-loop-30x/finding-loop.mjs`, lines 43-49). Controllers for gridatlas can check that module's parseProjectDeepLink against this list.
- The public pointer releases/current-v4.json pins the GridAtlas receiver at commit ab80d45be05eb08b334af8bc93cfeb30d3b9d3d9, version v9.104, required_result `MEASURE_LINK_FIRST` (current-v4.json:7-39). The brief puts live GridAtlas at v9.187 (generation 202610292044); PipelineNews has not re-bound since 2026-09-04.
- The engine-on-the-row rule (F1) exists only in the v9-5-1 page lineage; `grid_engine` is absent from the latest release's query order (F3). If GridAtlas expects `grid_engine` for offshore routing, the current PipelineNews candidate does not send it.
- Data centres: the only datacentre surface is the OSM-derived nearest-distance tab (F14): 98 mapped data centres, 263 live solar/BESS projects within 5 km. That predates and is independent of the 227-site data-grid-gb datacentres pipeline and the 06b-dc-engine in gridatlas; it is a natural place to swap in the 225 mappable sites.
- Geodesy: F5's R = 6378.137 km is declared identical to the GridAtlas radius tool; the gridatlas worker can confirm the constant there.

## Candidates (unkeyed; clearly marked)
- The revert's motive is inferred (History), not stated anywhere in the repo.
- Why the BBC bot stopped after 2026-09-13T16:17:16Z with the cron still at '17 */2 * * *' is not visible in git (no workflow edit until 2026-09-26). Possibly runs failed or produced no diff, or scheduled runs were disabled in GitHub; not verifiable without the Actions API.
- Whether a receipt that asserts `grid_engine` exists in gridatlas or gridmachine1 (README "the receipt asserts it"): not in pipelinenews.
- Whether the bot-edited compiler (F7) actually throws on rerun was not executed (running it would write files); the conclusion follows from the anchor text and the recorded hash.

## Proposed lines for the Kuiper edition (which keyed lines deserve a place, and why)
1. README.md:47 (F1): the estate's clearest one-paragraph routing law, with its failure story.
2. 202609040044-atlas-pointer-deep-link.mjs:75-82 (F3): fail-closed emission in eight lines.
3. 202608311610-grid-proximity.mjs:61-72 (F5): a constant held for agreement, with the measured 0.112% cost of drifting.
4. index/202608291310-compile-atlas-v9-deep-link.mjs:108-112 with :122 and the manifest hash (F7): an "immutable" compiler that drifted, and the anchor-count law that makes the drift refuse instead of lie. The best teaching pair in the repo.
5. .github/DEPLOYMENT_POLICY.md:7 (F9): authorisation is a separate record; editing the field is a failure.
6. .github/workflow-archive/20260830-email-storm/README.md:3-5 (F10) next to the 67aa2eb revert hunk: the lesson learned, then relearned on 2026-09-26.
7. releases/202609060232-pipelinenews/release-manifest.json:36 (F11): "read from UTC clock at build time, never chosen".

## One next command (exactly one, runnable from a clone)
`grep -rn "grid_engine" /home/user/estate/gridatlas --include=*.js --include=*.mjs --include=*.json | head -20`
