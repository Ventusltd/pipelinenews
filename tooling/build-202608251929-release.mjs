import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const releaseId = "202608251929-pipelinenews";
const inception = "2026-08-25T19:29:58+01:00";
const created = "2026-08-25T19:45:57+01:00";
const candidatePointerPath = "releases/candidate.json";
const previewAttestationPath = `attestations/${releaseId}-preview.json`;
const pipelineAttestationPath = `attestations/${releaseId}-pipeline.json`;
const closurePath = `attestations/${releaseId}-closure.json`;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const gitBlobSha1 = (bytes) => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
const canonicalJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const abs = (path) => join(root, path);
const ensureWrite = async (path, bytes) => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes); };
const fileEntry = async (path) => { const bytes = await readFile(abs(path)); return { path, bytes: bytes.length, sha256: sha256(bytes) }; };
const exists = async (path) => { try { await access(abs(path)); return true; } catch { return false; } };

if (await exists(closurePath)) {
  const closure = JSON.parse(await readFile(abs(closurePath), "utf8"));
  if (closure.schema !== "pipelinenews.release-closure-attestation.v2" || closure.release_id !== releaseId) throw new Error("BUILD_CLOSURE_ATTESTATION_INVALID");
  process.stdout.write(`BUILD ${releaseId}: CLOSED · immutable release generation skipped\n`);
  process.exit(0);
}

const partPaths = Array.from({ length: 16 }, (_, index) => `newsv7/data/v9.1/projects/part-${String(index + 1).padStart(3, "0")}.json`);
const reusedPaths = [
  "newsv7/data/v9.1/build_manifest.json",
  ...partPaths,
  "newsv7/data/v9.7/regional_manifest.json",
  "newsv7/data/v9.7/regional_news.json",
  "newsv7/dist/major_project_news_v9_5_1.json",
  "newsv7/data/newsv7/cumulative_intelligence.json",
];
const proofPaths = [
  "tooling/build-202608251929-release.mjs",
  "tooling/templates/202608251929-app.js",
  "tooling/templates/202608251929-app.css",
  "tests/check-202608251929-pipelinenews.mjs",
  "tests/browser-live-202608251929.mjs",
  "tests/check-current-timestamp-release.mjs",
  "tests/check-frozen-release-trees.sh",
  "tests/run-current-timestamp-release.sh",
  ".github/workflows/pages.yml",
  ".github/workflows/timestamp-release.yml",
];
const publicationSupportPaths = ["README.md", "CHANGELOG.md", candidatePointerPath];

const projects = (await Promise.all(partPaths.map(async (path) => JSON.parse(await readFile(abs(path), "utf8"))))).flatMap((part) => part.projects);
const news = JSON.parse(await readFile(abs("newsv7/dist/major_project_news_v9_5_1.json"), "utf8"));
const regional = JSON.parse(await readFile(abs("newsv7/data/v9.7/regional_news.json"), "utf8"));
const cursorSourceBytes = await readFile(abs("state/official-source-cursor.json"));
const officialSourceBytes = await readFile(abs("data/official-source/latest.json"));
const cursor = JSON.parse(cursorSourceBytes.toString("utf8"));
const official = JSON.parse(officialSourceBytes.toString("utf8"));
const cumulative = JSON.parse(await readFile(abs("newsv7/data/newsv7/cumulative_intelligence.json"), "utf8"));
const changelog = await readFile(abs("CHANGELOG.md"));

if (projects.length !== 7680) throw new Error("BUILD_DATA_PROJECT_COUNT");
const totalCapacity = Math.round(projects.reduce((sum, row) => sum + row.capacity_mw, 0) * 100) / 100;
if (totalCapacity !== 356474.09) throw new Error("BUILD_DATA_CAPACITY");
if (news.all_items.length !== 133 || news.canonical_items.length !== 45) throw new Error("BUILD_NEWS_COUNTS");
if (!projects.some((row) => row.repd_ref === "13599") || !projects.some((row) => row.repd_ref === "17494")) throw new Error("BUILD_SENTINEL_IDENTITY");
const technology = (key) => {
  const rows = projects.filter((row) => row.technology === key);
  return { projects: rows.length, capacity_mw: Math.round(rows.reduce((sum, row) => sum + row.capacity_mw, 0) * 100) / 100 };
};
const planitRecords = Object.values(official.planit_by_reference).flatMap((group) => group.records || []);
const primary = planitRecords.filter((row) => row.binding?.role === "PRIMARY_MATCH").length;
const sentinelEvidence = cumulative.event_intelligence.find((row) => row.repd_ref === "13599")?.operator_labels?.[0]?.source_label;
if (!sentinelEvidence) throw new Error("BUILD_SENTINEL_ORGANISATION_EVIDENCE");
const sourceOrigin = (value) => {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? `${url.origin}/` : null;
  } catch {
    return null;
  }
};
const projectByRef = new Map(projects.map((row) => [String(row.repd_ref), row]));
const withheldSiteRefs = new Set(["10199", "5212"]);
const evidenceRecord = (item, index, domain) => {
  const rawUrl = String(item.url || item.source_url || "");
  const rank = index + 1;
  const regional = domain === "REGIONAL";
  const eligible = item.canonical_relevant === true && item.role === "PRIMARY_MATCH" && item.eligible_for_news_signal === true;
  const repdRef = item.repd_ref || item.primary_repd_ref || null;
  const project = eligible && repdRef ? projectByRef.get(String(repdRef)) : null;
  return {
    rank,
    evidence_id: item.gg_article_id || item.article_id || `GG2050-EVIDENCE-${domain}-${String(rank).padStart(3, "0")}`,
    source_origin: sourceOrigin(rawUrl),
    source_url_sha256: sha256(Buffer.from(rawUrl)),
    published: item.published || null,
    technology: item.canonical_technology || item.technology || "ENERGY",
    event: item.event || (regional ? "REGIONAL DISCOVERY" : "PROJECT UPDATE"),
    project_id: item.gg_project_id || item.gg_development_id || null,
    repd_ref: repdRef,
    site_label: project ? (withheldSiteRefs.has(String(project.repd_ref)) ? `SITE LABEL WITHHELD · ${project.gg_project_id}` : project.name) : null,
    official_status: project?.status || null,
    official_capacity_mw: project?.capacity_mw ?? null,
    geography: project ? ([project.county, project.region].filter(Boolean).join(" · ") || null) : (item.country || item.county || item.region || null),
    region: regional ? (item.region || "INTERNATIONAL_OTHER") : (item.canonical_relevant === true ? "UK" : "DISCOVERY"),
    eligible,
    confidence: Number(item.confidence || 0),
    restricted: regional ? item.article_id === "GG2050-REGION-52E7905F2C40D828" : [40, 71, 106].includes(rank),
  };
};
const safeEvidence = {
  schema: "pipelinenews.safe-evidence-ledger.v2",
  release_id: releaseId,
  base: news.all_items.map((item, index) => evidenceRecord(item, index, "BASE")),
  regional: regional.articles.map((item, index) => evidenceRecord(item, index, "REGIONAL")),
  raw_fields_republished: false,
  provenance: "Each record exposes a stable evidence identifier, source origin and SHA-256 of the exact frozen source URL. Raw URL paths remain only in the unchanged hash-pinned source ledger.",
};
const summary = {
  schema: "pipelinenews.safe-intelligence-summary.v2",
  release_id: releaseId,
  source_state: "PINNED_PREPUBLICATION",
  spine: { projects: projects.length, capacity_mw: totalCapacity, solar: technology("solar"), bess: technology("bess") },
  news: { base_ledger: news.all_items.length, governed_uk: news.canonical_items.length, regional_ledger: regional.articles.length },
  frontier: { cursor: cursor.next_index, total_groups: cursor.total_groups, records: planitRecords.length, primary_match: primary, abstain: planitRecords.length - primary, status: official.source_health.planit.status },
  connection: {
    when: "UNKNOWN",
    how: "UNKNOWN",
    next_gate: "Accepted connection offer, network register, energisation notice or exact official network document.",
  },
  sentinels: [
    { repd_ref: "13599", project_id: "GG2050-REPD-13599", result: "PASS", organisation_evidence: sentinelEvidence, evidence_class: "GOVERNED_NEWS_ASSOCIATION_NOT_OFFICIAL_REPD_OPERATOR" },
    { repd_ref: "17494", project_id: "GG2050-REPD-17494", result: "PASS", discovery_state: "FIXTURE_ONLY_NOT_CURRENT", connection_decision: "ABSTAIN", organisation_evidence: null },
  ],
  privacy: {
    raw_operator_labels_published: false,
    raw_headlines_or_summaries_published: false,
    operator_output_policy: "UNIVERSALLY_WITHHELD",
    restricted_operator_project_ids: ["17376", "17983", "1984", "1763", "1121", "1597", "4078", "1987", "2240", "1352", "2051"],
    restricted_site_project_ids: ["10199", "5212"],
    restricted_feed_ranks: [40, 71, 106],
    restricted_regional_ranks: [12],
    restricted_regional_items: ["GG2050-REGION-52E7905F2C40D828"],
  },
  publication_law: { official_news_separate: true, identity_rule_based: true, ambiguous_binding_abstains: true, optional_intelligence_blocks_core: false },
};

const objectSpecs = [
  ["modules", "modules", "js", await readFile(abs("tooling/templates/202608251929-app.js"))],
  ["css", "css", "css", await readFile(abs("tooling/templates/202608251929-app.css"))],
  ["data", "data", "json", Buffer.from(canonicalJson(summary))],
  ["evidence", "evidence", "json", Buffer.from(canonicalJson(safeEvidence))],
  ["docs", "docs", "md", Buffer.from(`# Pipeline News changelog state pin\n\nRelease: \`${releaseId}\`\n\nAuthoritative source: \`CHANGELOG.md\`\n\nSource SHA-256: \`${sha256(changelog)}\`\n\nState: the 17:01 and 17:50 timestamp candidates are rejected product baselines; their immutable bytes remain lineage evidence. This successor preserves the frozen NewsV7 data spine and restores its full interaction surface with privacy-safe typed labels.\n`)],
];
const objects = {};
for (const [key, kind, extension, bytes] of objectSpecs) {
  const hash = sha256(bytes);
  const path = `objects/${kind}/sha256/${hash}.${extension}`;
  await ensureWrite(abs(path), bytes);
  objects[key] = { path, bytes: bytes.length, sha256: hash };
}
const sourcePins = [];
for (const [sourcePath, kind, bytes] of [
  ["data/official-source/latest.json", "official-frontier", officialSourceBytes],
  ["state/official-source-cursor.json", "official-cursor", cursorSourceBytes],
]) {
  const hash = sha256(bytes);
  const path = `objects/source/sha256/${hash}.json`;
  await ensureWrite(abs(path), bytes);
  sourcePins.push({ path, bytes: bytes.length, sha256: hash, source_path: sourcePath, source_commit: "92985c76eaa449a8960d7e1d6059d8ae26800a18", classification: kind });
}

const index = `<!doctype html>
<html lang="en" data-summary-object="../${objects.data.path}" data-evidence-object="../${objects.evidence.path}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pipeline News ${releaseId}</title><link rel="stylesheet" href="../${objects.css.path}"></head><body><div class="layout">
<aside class="sidebar"><div class="brand"><strong>GLOBALGRID2050</strong><span>PIPELINE NEWS · ${releaseId}</span></div><nav><a href="../newsv7/">NEWS V7 FROZEN</a><a href="https://globalgrid2050.com/repd_grid_atlasv8/">MAP ATLAS</a><a href="../${objects.docs.path}">CHANGELOG STATE</a><a href="release.json">RELEASE CONTRACT</a><button id="exportCsv" type="button">EXPORT FILTERED CSV</button></nav></aside>
<main class="main"><header class="topline"><h1>UK RENEWABLES PIPELINE NEWS</h1><span class="status" id="projectStatus">LOADING OFFICIAL PROJECT SPINE…</span></header><div class="release-law"><strong>${releaseId}</strong><span>133-item evidence ledger · full ≥1 MW project spine</span><span>Official REPD facts remain separate from typed evidence signals.</span></div>
<section class="newspaper"><div class="masthead"><h2>GLOBALGRID2050 <span>ENERGY DAILY</span></h2><div class="strap"><span>SAFE TYPED EVIDENCE · SOURCE ORIGINS · HASH-PINNED RECORDS</span><span id="newsMeta">LOADING LEDGER…</span></div></div><div class="news-tools"><button class="active" data-news-mode="ALL">ALL</button><button data-news-mode="UK">UK</button><button data-news-mode="INTERNATIONAL">INTERNATIONAL</button><button data-news-mode="US">US</button><button data-news-mode="EUROPE">EUROPE</button><button data-news-mode="SOLAR">SOLAR</button><button data-news-mode="BESS">BESS</button><button data-news-mode="CONSENT">CONSENT</button><button data-news-mode="CONSTRUCTION">CONSTRUCTION</button><input id="newsSearch" aria-label="Search typed evidence" placeholder="SEARCH EVENT / TECHNOLOGY / STABLE ID / DATE"></div><div class="stories" id="stories"><div class="empty">Loading newspaper ledger…</div></div><span id="regionalStatus" hidden></span></section>
<section class="intelligence"><div class="section-head"><h2>CUMULATIVE GOVERNED INTELLIGENCE</h2><span id="intelligenceStatus">OPTIONAL SUMMARY PENDING · CORE BOOT CONTINUES</span></div><div class="intelligence-cards" id="intelligenceCards"><div class="empty">Loading safe typed summary…</div></div></section>
<section><div class="gauges"><article class="gauge"><span>FILTERED PROJECTS</span><strong id="filteredProjects">0</strong></article><article class="gauge"><span>FILTERED CAPACITY MW</span><strong id="filteredCapacity">0</strong></article><article class="gauge"><span>LARGEST SITE MW</span><strong id="largestProject">0</strong></article><article class="gauge"><span>SOLAR · PROJECTS / MWP</span><strong id="solarGauge">0</strong></article><article class="gauge"><span>BATTERY · PROJECTS / MW</span><strong id="bessGauge">0</strong></article><article class="gauge"><span>ONSHORE WIND · PROJECTS / MW</span><strong id="onshoreGauge">0</strong></article><article class="gauge"><span>OFFSHORE WIND · PROJECTS / MW</span><strong id="offshoreGauge">0</strong></article></div>
<div class="project-tools"><button class="active" data-technology="all">ALL TECH</button><button data-technology="solar">SOLAR</button><button data-technology="bess">BATTERY</button><button data-technology="wind_onshore">ONSHORE</button><button data-technology="wind_offshore">OFFSHORE</button><label>OFFICIAL STATUS<select id="statusFilter"><option value="All">ALL STATUS</option></select></label><label>REGION<select id="regionFilter"><option value="All">ALL REGIONS</option></select></label><div class="capacity-range"><label>MIN MW · INCLUSIVE<input id="minCapacity" type="number" min="0" step="0.01" inputmode="decimal"></label><label>MAX MW · INCLUSIVE<input id="maxCapacity" type="number" min="0" step="0.01" inputmode="decimal"></label></div><input class="search" id="projectSearch" placeholder="SEARCH SITE / REPD / GLOBALGRID / PLANNING"><label>SORT<select id="projectSort"><option value="capacity_desc">CAPACITY · HIGH–LOW</option><option value="capacity_asc">CAPACITY · LOW–HIGH</option><option value="updated_desc">REPD UPDATED · NEWEST</option><option value="updated_asc">REPD UPDATED · OLDEST</option><option value="site_asc">SITE · A–Z</option></select></label><button id="clearFilters">CLEAR</button></div><span class="results-meta" id="resultsMeta">LOADING…</span>
<div class="tablewrap" tabindex="0" aria-label="Scrollable 11-column project table"><table><thead><tr><th>SITE LABEL</th><th>REGION</th><th>OPERATOR</th><th>TECHNOLOGY</th><th>OFFICIAL REPD STATUS</th><th>OFFICIAL CAPACITY</th><th>REPD REF</th><th>GLOBALGRID REF</th><th>REPD UPDATED</th><th>CONNECTION / NEWS</th><th>ACTIONS</th></tr></thead><tbody id="projectRows"><tr><td colspan="11" class="empty">Loading official project records…</td></tr></tbody></table></div><nav class="pager"><button id="previousPage">← PREVIOUS</button><span id="pageStatus">LOADING…</span><button id="nextPage">NEXT →</button></nav></section>
<footer class="footer">Connection timing and method remain UNKNOWN unless exact official evidence proves them. Planning, proximity, capacity and headlines never establish a connection.</footer></main></div><script type="module" src="../${objects.modules.path}"></script></body></html>
`;
const releaseReadme = `# ${releaseId}\n\nManual recovery successor built from the frozen NewsV7 project and evidence ledgers. It restores the complete newspaper, 7,680-project table, filters, search, bidirectional sorting, 100-row pagination, CSV export, Atlas links and deliberate mobile horizontal scrolling. Raw operator labels, headlines and summaries are not republished. Connection timing and method remain UNKNOWN with an explicit next evidence gate.\n`;
const releaseShell = {
  schema: "pipelinenews.release-shell.v2", release_id: releaseId, status: "CANDIDATE_PREPUBLICATION",
  manifest: `../releases/${releaseId}.json`, preview_attestation: `../${previewAttestationPath}`, pipeline_attestation: `../${pipelineAttestationPath}`, closure_attestation: `../${closurePath}`,
  interface: { project_table_columns: 11, rows_per_page: 100, technology_gauges: 4, mobile_horizontal_scroll: true, raw_person_names_published: false },
};
const shellFiles = [
  [`${releaseId}/index.html`, Buffer.from(index)],
  [`${releaseId}/readme.md`, Buffer.from(releaseReadme)],
  [`${releaseId}/release.json`, Buffer.from(canonicalJson(releaseShell))],
];
for (const [path, bytes] of shellFiles) await ensureWrite(abs(path), bytes);

const pointer = { schema: "pipelinenews.release-pointer.v2", channel: "candidate", release_id: releaseId, manifest: `releases/${releaseId}.json`, updated_at: created, public_app_switched: false, rejected_predecessors: ["202608251701-pipelinenews", "202608251750-pipelinenews"] };
const pointerBytes = Buffer.from(canonicalJson(pointer));
await ensureWrite(abs(candidatePointerPath), pointerBytes);

const reused = [...await Promise.all(reusedPaths.map(fileEntry)), ...sourcePins];
const proof = await Promise.all(proofPaths.map(fileEntry));
const publicationSupport = await Promise.all(publicationSupportPaths.map(fileEntry));
const shell = await Promise.all(shellFiles.map(([path]) => fileEntry(path)));
const newObjects = Object.values(objects);
const sum = (rows) => rows.reduce((total, row) => total + row.bytes, 0);
const regressionMatrix = {
  newsv7: { classification: "FROZEN_BASELINE", visible_headlines: 133, project_count: 7680, capacity_mw: 356474.09, table_columns: 11, filters: { technology: true, status: true, county: true, region: false, capacity_range: false }, search: { news: true, projects: true }, sorting: { capacity_both_directions: true, repd_updated_both_directions: true }, pagination: { enabled: true, rows_per_page: 100, pages: 77 }, export: true, maps: { atlas: true, per_project: true }, intelligence_panels: 5, mobile_scrolling: "STATIC_AND_LIVE_BASELINE_PASS", data_load: "PASS_LIVE_BASELINE", console_errors: "0_PAGE_ORIGIN_OBSERVED", network_failures: "0_OBSERVED", sentinel_projects: { "13599": "PASS", "17494": "PASS_PROJECT_SPINE_ONLY" }, official_news_separation: true },
  dashboard_v5: { classification: "REFERENCE_ONLY", visible_headlines: 125, project_count: 5210, capacity_mw: 262397, table_columns: 8, filters: { technology: true, status: true, county: true, region: false, capacity_range: false }, search: { news: "BASIC", projects: "BASIC" }, sorting: false, pagination: false, export: true, maps: "NO_PER_PROJECT_ATLAS", intelligence_panels: "BASIC_NEWS_SIGNAL", mobile_scrolling: "FAIL_COLUMNS_HIDDEN", data_load: "NOT_RETESTED_THIS_CLOSURE", console_errors: "NOT_RETESTED_THIS_CLOSURE", network_failures: "NOT_RETESTED_THIS_CLOSURE", sentinel_projects: { "13599": "NOT_GOVERNED", "17494": "NOT_GOVERNED" }, official_news_separation: "STATED_WEAKER_MATCHING" },
  "202608251701-pipelinenews": { classification: "REJECTED_PRODUCT_BASELINE", visible_headlines: 0, project_count: 0, capacity_mw: 0, table_columns: 0, filters: false, search: false, sorting: false, pagination: false, export: false, maps: false, intelligence_panels: "PROOF_METRICS_ONLY", mobile_scrolling: "NOT_APPLICABLE_NO_PRODUCT_TABLE", data_load: "THIN_SHELL_ONLY", console_errors: "NOT_RETESTED_THIS_CLOSURE", network_failures: "NOT_RETESTED_THIS_CLOSURE", sentinel_projects: { "13599": "INDIRECT_ONLY", "17494": "FIXTURE_ONLY" }, official_news_separation: true },
  "202608251750-pipelinenews": { classification: "REJECTED_PRODUCT_BASELINE", visible_headlines: 0, project_count: 0, capacity_mw: 0, table_columns: 0, filters: false, search: false, sorting: false, pagination: false, export: false, maps: false, intelligence_panels: "AUDIT_METRICS_ONLY", mobile_scrolling: "NOT_APPLICABLE_NO_PRODUCT_TABLE", data_load: "THIN_SHELL_ONLY", console_errors: "NOT_RETESTED_THIS_CLOSURE", network_failures: "NOT_RETESTED_THIS_CLOSURE", sentinel_projects: { "13599": "CANARY_ONLY", "17494": "FIXTURE_ONLY" }, official_news_separation: true },
  [releaseId]: { classification: "LOCAL_CANDIDATE", visible_headlines: 133, project_count: 7680, capacity_mw: 356474.09, table_columns: 11, filters: { technology: true, status: true, region: true, capacity_range: "INCLUSIVE" }, search: { news: true, projects: true }, sorting: { capacity_both_directions: true, repd_updated_both_directions: true }, pagination: { enabled: true, rows_per_page: 100, pages: 77 }, export: true, maps: { atlas: true, per_project: true }, intelligence_panels: 5, mobile_scrolling: "STATIC_PASS_RUNTIME_PENDING", data_load: "LOCAL_DETERMINISTIC_PASS_RUNTIME_PENDING", console_errors: "PENDING_LIVE_QA", network_failures: "PENDING_LIVE_QA", sentinel_projects: { "13599": "PASS", "17494": "PASS_PROJECT_SPINE_DISCOVERY_ABSTAIN" }, official_news_separation: true },
};
let manifestBytes = 0;
let reportBytes = 0;
let report;
let manifest;
for (let pass = 0; pass < 12; pass += 1) {
  const accounting = {
    lightweight_release_shell: { files: shell.length, bytes: sum(shell) },
    new_content_addressed: { files: newObjects.length, bytes: sum(newObjects) },
    reused_or_pinned: { files: reused.length, bytes: sum(reused) },
    proof_and_evidence: { files: proof.length, bytes: sum(proof) },
    publication_support: { files: publicationSupport.length, bytes: sum(publicationSupport) },
    report: { files: 1, bytes: reportBytes }, manifest: { files: 1, bytes: manifestBytes },
    minimum_pages_deployment_impact: { files: shell.length + newObjects.length + 3, bytes: sum(shell) + sum(newObjects) + reportBytes + manifestBytes + pointerBytes.length },
    total_closure: { files: shell.length + newObjects.length + reused.length + proof.length + publicationSupport.length + 2, bytes: sum(shell) + sum(newObjects) + sum(reused) + sum(proof) + sum(publicationSupport) + reportBytes + manifestBytes },
  };
  report = {
    schema: "pipelinenews.release-proof.v2", release_id: releaseId, status: "LOCAL_DETERMINISTIC_PASS_LIVE_UNVERIFIED",
    checks: { project_count: 7680, capacity_mw: totalCapacity, solar: summary.spine.solar, bess: summary.spine.bess, base_headlines: 133, governed_uk: 45, regional_headlines: 19, safe_evidence_records: 152, table_columns: 11, rows_per_page: 100, technology_gauges: 4, sentinel_13599: "PASS", sentinel_17494: "PASS", raw_operator_output: "WITHHELD", raw_unstructured_news_output: "WITHHELD", connection_timing: "UNKNOWN", connection_method: "UNKNOWN", optional_intelligence_core_dependency: false, source_status: summary.frontier.status },
    regression_matrix: regressionMatrix, browser: { desktop: "PENDING_LIVE_QA", mobile_390: "PENDING_LIVE_QA", script: "tests/browser-live-202608251929.mjs" }, byte_accounting: accounting,
  };
  const reportBuffer = Buffer.from(canonicalJson(report));
  const reportEntry = { path: `reports/${releaseId}-proof.json`, bytes: reportBuffer.length, sha256: sha256(reportBuffer) };
  manifest = {
    schema: "pipelinenews.timestamp-release-manifest.v2", release_id: releaseId, status: "CANDIDATE_PREPUBLICATION", immutable: true,
    timeline: {
      incepted_at: inception, created_at: created,
      committed_at: { value: null, status: "UNVERIFIED", attestation: `${pipelineAttestationPath}#/committed_at` },
      pipeline_pages_verified_at: { value: null, status: "UNVERIFIED", attestation: `${pipelineAttestationPath}#/pipeline_pages_verified_at` },
      catalogued_at: { value: null, status: "UNVERIFIED", attestation: `${closurePath}#/catalogued_at` },
      globalgrid_live_verified_at: { value: null, status: "UNVERIFIED", attestation: `${closurePath}#/globalgrid_live_verified_at` },
    },
    publication: { live: false, pipeline_pages: "UNVERIFIED", globalgrid_catalogue: "UNVERIFIED", rejected_predecessors: ["202608251701-pipelinenews", "202608251750-pipelinenews"] },
    attestations: { preview: previewAttestationPath, pipeline_pages: pipelineAttestationPath, closure: closurePath },
    interface: { table_columns: 11, rows_per_page: 100, technology_gauges: 4, project_count: 7680, capacity_mw: totalCapacity, full_newspaper_ledger: 133, safe_evidence_records: 152, capacity_filter_inclusive: true, mobile_horizontal_scroll: true, optional_intelligence_blocks_core: false },
    frozen_preservation: { newsv1_tree: "2d6247c067aa5fad49995dcb9029d6cdb9898994", newsv7_tree: "5a59a926d0688d05c08c5ecc008c174133728007", rejected_1701_tree: "84b748df685b9306ce232e415531ee4eca05b4d6", rejected_1750_tree: "8a86c549b14a104b247aaadfc522644155b22ddb", selected_newsv7_assets_rehashed: true, predecessor_release_bytes_written: false },
    objects, frozen_reused_assets: reused, proof: [...proof, reportEntry], publication_support: { lifecycle: "MUTABLE_ONLY_AFTER_CLOSURE_ATTESTATION", build_state: publicationSupport }, changelog_source: {
      path: "CHANGELOG.md",
      build_base: { commit: "92985c76eaa449a8960d7e1d6059d8ae26800a18", git_blob_sha1: "f79943be9e89a6aebf4deac668315abe5d753af9" },
      prospective_publication_state: { git_blob_sha1: gitBlobSha1(changelog), sha256: sha256(changelog), snapshot_object: objects.docs.path },
    }, byte_accounting: accounting,
  };
  const nextReportBytes = reportBuffer.length;
  const nextManifestBytes = Buffer.byteLength(canonicalJson(manifest));
  if (nextReportBytes === reportBytes && nextManifestBytes === manifestBytes) break;
  reportBytes = nextReportBytes;
  manifestBytes = nextManifestBytes;
}
await ensureWrite(abs(`reports/${releaseId}-proof.json`), canonicalJson(report));
await ensureWrite(abs(`releases/${releaseId}.json`), canonicalJson(manifest));
process.stdout.write(`BUILD ${releaseId}: PASS · ${projects.length} projects · ${news.all_items.length} evidence items\n`);
