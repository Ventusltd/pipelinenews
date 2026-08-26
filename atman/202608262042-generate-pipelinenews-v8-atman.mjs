import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const auditPath = process.env.AUDIT_JSON || "audit-input/performance-audit.json";
const stamp = process.env.REPORT_STAMP;
const auditRun = process.env.AUDIT_RUN_ID;
const repository = process.env.GITHUB_REPOSITORY || "Ventusltd/pipelinenews";
const dispatchSha = process.env.GITHUB_SHA || "unknown";
assert.match(stamp || "", /^\d{12}$/, "REPORT_STAMP must be YYYYMMDDHHMM");
assert.match(auditRun || "", /^\d+$/, "AUDIT_RUN_ID required");

const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const atlasEngine = fs.readFileSync("atman-input/atlas-v8-engine.js", "utf8");
const atlasIndex = fs.readFileSync("atman-input/atlas-v8-index.html", "utf8");
const pipelineProjects = fs.readFileSync("ui/javascript/202608261804-projects-v9-5-1.js", "utf8");
const pipelineLoader = fs.readFileSync("ui/javascript/202608261752-canonical-projects-v9-1.js", "utf8");

for (const [label, source, needle] of [
  ["Pipeline full-table rendering", pipelineProjects, 'body.innerHTML = filtered.map'],
  ["Pipeline concurrent partition loading", pipelineLoader, 'Promise.all(payload.project_partitions.map'],
  ["Atlas bounded fetch queue", atlasEngine, 'new FetchQueue(4)'],
  ["Atlas URL promise cache", atlasEngine, 'urlCache[url]'],
  ["Atlas activation hydration", atlasEngine, 'hydrateLayer(layerId)'],
  ["Atlas empty source registration", atlasEngine, "FeatureCollection', features: []"],
  ["Atlas UKPN 11kV declaration", atlasIndex, 'id: "11kv"'],
  ["Atlas UKPN zoom gate", atlasIndex, 'minzoom: 13.5'],
]) assert.ok(source.includes(needle), `missing expected evidence: ${label}`);

const by = new Map(audit.summary.map(r => [`${r.target}|${r.profile}`, r]));
const mobile = id => {
  const row = by.get(`${id}|mobile`);
  assert.ok(row, `missing mobile audit row: ${id}`);
  return row;
};
const mod = mobile("pipelinenews-modular");
const v961 = mobile("globalgrid-v9.6.1");
const v5 = mobile("globalgrid-v5");
const original = mobile("globalgrid-original");
assert.equal(mod.tableRows, 7680);
assert.ok(mod.domElements > 300000);
assert.ok(mod.nodes > 600000);
assert.ok(mod.sortTaskMs > 5000);

const n = value => Number(value).toLocaleString("en-GB", { maximumFractionDigits: 2 });
const ratio = (a,b) => (a / b).toFixed(1) + "×";
const reportPath = `atman/${stamp}-PIPELINENEWS-V8-ARCHITECTURE-ATMAN.md`;

const report = `# PipelineNews V8 Architecture — Atman Decision Report

**Status:** DESIGN EVIDENCE ONLY — NO APPLICATION OR RELEASE CHANGE  
**Generated:** ${stamp} UTC by GitHub Actions  
**Repository:** ${repository}  
**Workflow dispatch commit:** \`${dispatchSha}\`  
**Performance evidence:** workflow run \`#${auditRun}\`  
**Audit source commit:** \`f4a5a1a9293a5c4b926062b1bc919c2046ac5c11\`  
**Atlas V8 source commit:** \`c36e41a689a62bdfa13b4258f3cbc48301854108\`

## 1. Decision statement

PipelineNews is not slow because 7,680 project records are intrinsically large. It is slow because every record is expanded into a complex physical DOM row, and every sort/filter destroys and reconstructs the whole table.

The recommended V8 architecture combines:

1. the original dashboard's immediate, compact interface;
2. Atlas V8's declarative registry, dormant cartridges, bounded hydration and failure isolation;
3. PipelineNews's canonical identity, news binding, gauges, filters, export and map links;
4. row virtualisation so browser workload remains bounded as projects, countries and news grow.

**Core invariant:** storage and registry coverage may grow without bound; active network, memory, main-thread and DOM work must remain bounded.

## 2. Actions evidence

The audit completed successfully. “Success” means the harness executed correctly; it does not mean the current application passed a performance budget.

| Mobile metric | Modular PipelineNews | V9.6.1 | V5 | Original |
|---|---:|---:|---:|---:|
| Project rows | ${n(mod.tableRows)} | ${n(v961.tableRows)} | ${n(v5.tableRows)} | ${n(original.tableRows)} |
| DOM elements | ${n(mod.domElements)} | ${n(v961.domElements)} | ${n(v5.domElements)} | ${n(original.domElements)} |
| Browser nodes | ${n(mod.nodes)} | ${n(v961.nodes)} | ${n(v5.nodes)} | ${n(original.nodes)} |
| Decoded resources | ${n(mod.decodedResourceMB)} MB | ${n(v961.decodedResourceMB)} MB | ${n(v5.decodedResourceMB)} MB | ${n(original.decodedResourceMB)} MB |
| Long-task total | ${n(mod.longTaskTotalMs)} ms | ${n(v961.longTaskTotalMs)} ms | ${n(v5.longTaskTotalMs)} ms | ${n(original.longTaskTotalMs)} ms |
| REPD-date sort task | ${n(mod.sortTaskMs)} ms | ${n(v961.sortTaskMs)} ms | not comparable | not comparable |
| Scroll stress task | ${n(mod.scrollTaskMs)} ms | ${n(v961.scrollTaskMs)} ms | ${n(v5.scrollTaskMs)} ms | ${n(original.scrollTaskMs)} ms |

PipelineNews creates ${ratio(mod.domElements, original.domElements)} the original dashboard's DOM elements and ${ratio(mod.nodes, original.nodes)} its browser nodes. Its mobile date sort blocks the main thread for approximately ${(mod.sortTaskMs / 1000).toFixed(1)} seconds.

The audit observed no failed requests, console errors or uncaught exceptions. The apparent break is main-thread starvation and DOM/memory pressure, not a missing asset.

The audit's \`settledMs\` includes a deliberate five-second observation delay and must not be used as a load-time comparison.

## 3. Code-level cause

Current PipelineNews:

\`\`\`js
body.innerHTML = filtered.map(project => {
  // creates the complete rich record row
}).join("");
\`\`\`

Every filter or REPD-date sort performs:

1. scan the complete project array;
2. sort matching project objects;
3. update gauges;
4. destroy the previous table;
5. construct thousands of rich HTML rows;
6. parse and lay out hundreds of thousands of elements.

The loader also downloads all 16 partitions through one unrestricted \`Promise.all()\`. Loading all records into background memory is acceptable at the present scale; coupling that load to full DOM materialisation is not.

## 4. Trusted Atlas V8 pattern

Atlas V8 performs five separate operations that PipelineNews currently conflates:

| Responsibility | Atlas implementation | Effect |
|---|---|---|
| Declaration | immutable layer configuration | capability exists without activation |
| Registration | empty hidden MapLibre source/layer | interface is ready before data |
| Activation | \`hydrateLayer(layerId)\` | data loads only when selected/preloaded |
| Bounded loading | \`FetchQueue(4)\` | prevents request storms |
| Deduplication | URL promise cache | shared cartridges download once |
| Health state | WAIT/LOAD/OK/EMPTY/FAIL | failure remains local to one layer |
| Rendering gate | visibility and \`minzoom\` | only useful detail is drawn |

### Large Atlas examples at the pinned commit

| Cartridge | Stored size | Startup |
|---|---:|---|
| 400 kV lines | 1.80 MB | selectively preloaded |
| major substations | 1.82 MB | selectively preloaded |
| UKPN 11 kV substations | 3.13 MB; approximately 15,126 points | \`preload:false\`, \`minzoom:13.5\` |
| global ports | 10.19 MB | \`preload:false\`; major/minor views share one URL |
| UK motorways | 11.49 MB | \`preload:false\` |
| UK mainline railways | 55.05 MB | \`preload:false\` |

Actions/Python fetches and converts upstream data before publication. The live browser does not call Overpass. A failed dormant cartridge cannot prevent the shell or unrelated layers from working.

## 5. V8 conceptual architecture

\`\`\`text
Actions producers
  → validate cartridges
  → compile registry + indexes + summaries
  → immutable shared data
  → lightweight application shell
  → bounded runtime activator
      → virtual project table
      → virtual news stream
      → lazy map/details/export plugins
\`\`\`

### 5.1 Registry

The registry remains pure data. It may declare:

- identity and schema version;
- country, region, technology and period;
- cartridge URL, byte size, record count and digest;
- activation condition;
- preload policy;
- dependencies;
- indexes and supported operations;
- renderer capability;
- expected non-empty/empty state.

It must not contain executable joins, arbitrary expressions or business logic.

### 5.2 Runtime lifecycle

Every cartridge/plugin uses:

\`WAIT → QUEUED → LOAD → INDEX → OK\`  
\`                         ↘ EMPTY\`  
\`                         ↘ FAIL\`

A bounded queue, request-promise cache and AbortController protect the runtime. Failure affects only the requested capability.

### 5.3 Canonical project store

All 7,680 current projects may remain in background memory. Growth is partitioned by country, technology and/or stable hash range. The canonical identity record remains singular; filters hold references or integer offsets rather than duplicated objects.

Sorting must reorder an index/reference array. It must never rebuild the complete DOM.

### 5.4 Virtual project renderer

The table preserves all 11 columns and horizontal mobile scrolling, but creates only the visible window plus overscan.

- target physical rows: 30–60;
- spacer height represents off-screen records;
- row elements are recycled;
- delegated events remain attached once;
- details are created only when opened;
- scrolling changes indexes bound to existing rows.

### 5.5 Infinite news model

News follows the Atlas UKPN principle: complete availability, dormant history and bounded visibility.

Partition news by country, period and optionally technology. Compile small indexes for latest headlines, project IDs, countries, technologies and dates. At startup load only registry metadata and the newest visible slice.

Scrolling, filters, search or opening a project activates the required partition. Only 20–40 article cards exist physically. Project-news binding operates on IDs/indexes, not pre-rendered cards.

### 5.6 Plugin activation

| Plugin | Startup policy |
|---|---|
| shell/navigation | immediate |
| precompiled totals | immediate |
| first project window | immediate after minimal index |
| remaining project cartridges | background/need-driven |
| gauges | precompiled initially; recompute in worker after filters |
| news latest slice | after shell or when visible |
| historic news | dormant |
| map | dormant until requested |
| project details | dormant until opened |
| CSV export | activate on request; stream/generate from records |

## 6. Actions compiler responsibilities

Actions—not the browser—must perform brute-force work:

1. validate schemas, digests, counts and referential integrity;
2. reject malformed cartridges and unexpected empty outputs;
3. compile registry and activation dependencies;
4. compile sort/filter/search indexes;
5. compile initial totals and latest-news slice;
6. ensure one canonical project identity;
7. browser-test mobile and desktop under cold/warm conditions;
8. enforce performance budgets;
9. emit a new immutable compiler and release only after every gate passes;
10. retain shared root data cartridges without copying them into each release.

## 7. Proposed performance gates

| Gate | V8 budget |
|---|---:|
| Physical project rows | ≤80 |
| Total DOM elements after boot | ≤5,000 |
| Browser nodes after repeated sorting | no sustained growth above 10% |
| Filter/sort interaction | ≤100 ms desktop; ≤200 ms mobile |
| Long task | none above 200 ms during ordinary interaction |
| Initial decoded application payload | ≤2 MB before optional cartridges |
| Main-thread scroll work | frame budget targeted; no multi-second task |
| Console/page/request errors | 0 |
| Record parity | exactly 7,680 for current UK release |
| Headline parity | exactly 133 for current release |
| Existing totals | exact parity |
| Existing columns/features | exact parity |

Budgets should be measured by Actions on the same four trusted comparison URLs until V8 becomes the new baseline.

## 8. Options

| Option | Description | Verdict |
|---|---|---|
| A | Retain full table and optimise templates | rejected; still scales with record count |
| B | Virtual table plus Atlas-style registry/cartridges | recommended |
| C | Server-side API/query service immediately | unnecessary for 7,680; retain as later scale step |
| D | Render pages of fixed rows only | viable fallback, but weaker continuous mobile experience |

## 9. Staged implementation proposal

1. Freeze the current modular release and evidence.
2. Build a virtual-table prototype against existing cartridges without changing data.
3. Prove 7,680-record parity and bounded DOM.
4. Introduce the schema-validated registry and lifecycle state.
5. Move filter/sort/search indexes behind the registry; use a worker where measured.
6. Convert news into latest/index/cartridge structure.
7. Lazy-activate news, map, details and export.
8. Run comparative Actions performance and functional parity gates.
9. Compile a new immutable PipelineNews V8 candidate.
10. Deploy only after explicit owner decision.

## 10. Risks and deliberate limits

- Atlas V8's registry is embedded in HTML; V8 should extract and validate it.
- Atlas \`minzoom\` prevents rendering but does not by itself prevent a selected source from downloading. News requires both activation and partition gates.
- Existing Atlas producer scripts do not uniformly enforce schema/minimum-count checks. PipelineNews must fail closed in Actions.
- Some historical workflows copied below application folders are inert because GitHub recognises workflows only at repository-root \`.github/workflows/\`.
- Parquet, DuckDB-Wasm, PMTiles or a query API should be adopted only when measured scale requires them.
- “Infinite” means unbounded storage/catalogue growth, not loading infinite data into one browser session.

## 11. Owner decisions required before implementation

1. Confirm virtual scrolling rather than numbered pagination.
2. Confirm the original dashboard as the mobile visual baseline.
3. Confirm V8 numbering/name for the first candidate.
4. Confirm initial news partition axis: month, country+month, or country+technology+month.
5. Confirm whether initial totals are permitted to come from compiler-generated summaries before background records finish loading.

## 12. Recommendation

Proceed with Option B only after owner approval: original-dashboard presentation, Atlas-style registry and activation, virtual projects/news, shared cartridges, and Actions-enforced parity/performance gates.

No source application, compiler, release or deployment was changed by this report.
`;

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report);
fs.writeFileSync("atman-report-path.txt", reportPath + "\n");
console.log(reportPath);
