import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const base = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, base), "utf8");
const bytes = (path) => readFile(new URL(path, base));
const json = async (path) => JSON.parse(await text(path));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const EXPECTED = Object.freeze({
  sourceCommit: "824a23cd0cf9f90a9df942f1b37a09c2dc6472b7",
  sourceSubtree: "4fca94ede95789ade9490258a2323c00c13ec2ea",
  feedSha256: "cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd",
  projectManifestSha256: "67976a1bbcaf383ed7121b13060db3b864db9ce33dfc721a88b59c8ca8b8e06c",
  projectContractSha256: "bc21070f44aae1d32da333e4954816acd907aa8c9fa9cb639c64d651f7fd4259",
  regionalNewsSha256: "905237ddcbc71761f21d8c78961931676ac0c585030d29af95c75c7772254a99",
  regionalLedgerSha256: "66f9e8803c6d0d0e847950dc5002a2df3b1f1ac0451de0f76a931256ddcc7409",
  frozenMobileCssSha256: "851b0827ca2aa0950438c98ae3cf6cc7dce33667d37458122ea38bb2c6da2f81",
  projectCount: 7680,
  capacityMw: 356474.09,
  largestMw: 4100,
  geometryCount: 7652,
  missingGeometryCount: 28,
  technologyCounts: {
    solar: 3563,
    bess: 1609,
    wind_onshore: 2399,
    wind_offshore: 109,
  },
  headlineCount: 133,
  ukHeadlineCount: 45,
  internationalHeadlineCount: 19,
  regionalCounts: { US: 4, EUROPE: 9, INTERNATIONAL_OTHER: 6 },
  rowsPerPage: 100,
  columns: 11,
  domElementBudget: 10000,
});

const [
  migration,
  release,
  projectContract,
  projectManifest,
  feed,
  regionalNews,
  regionalLedger,
  regionalManifest,
  html,
  projectsSource,
  projectLoaderSource,
  releaseLoaderSource,
  appSource,
  gaugesSource,
  newsBaseSource,
  regionalRuntimeSource,
  mobileCss,
] = await Promise.all([
  json("MIGRATION_MANIFEST.json"),
  json("contracts/release.newsv1.json"),
  json("contracts/release.v9.1.json"),
  json("data/v9.1/build_manifest.json"),
  json("dist/major_project_news_v9_5_1.json"),
  json("data/v9.7/regional_news.json"),
  json("data/v9.7/regional_decisions.json"),
  json("data/v9.7/regional_manifest.json"),
  text("index.html"),
  text("scripts/plugins/projects-newsv1.js"),
  text("scripts/data/canonical-projects-newsv1.js"),
  text("scripts/data/canonical-projects-newsv1-release.js"),
  text("scripts/app-newsv1.js"),
  text("scripts/plugins/gauges-v9-2.js"),
  text("scripts/plugins/newspaper-newsv1-base.js"),
  text("scripts/plugins/newspaper-newsv1.js"),
  text("styles/v9-6-1.css"),
]);

// Frozen source identity and independently addressable NewsV1 lineage.
assert.equal(migration.schema, "pipelinenews.migration-manifest.v1");
assert.equal(migration.release, "newsv1");
assert.deepEqual(migration.source, {
  repository: "Ventusltd/globalgrid2050",
  commit: EXPECTED.sourceCommit,
  path: "uk_renewables_pipeline/v9.7",
  subtree: EXPECTED.sourceSubtree,
});
assert.equal(migration.canonical_data_changed, false);
assert.equal(migration.news_content_or_order_changed, false);
assert.equal(release.release, "newsv1");
assert.equal(release.semantic_version, "1.0.0-rc.1");
assert.equal(release.status, "CANDIDATE");
assert.equal(release.frozen_source.commit, EXPECTED.sourceCommit);
assert.equal(release.frozen_source.subtree, EXPECTED.sourceSubtree);
assert.equal(release.frozen_source.must_remain_unchanged, true);
assert.equal(release.data_parent.release, "9.1");
assert.equal(release.data_parent.data_changed, false);
assert.equal(release.news_parent.ordering_changed, false);

// Exact source-artifact hashes prevent silent content or ordering changes.
assert.equal(sha256(await bytes("contracts/release.v9.1.json")), EXPECTED.projectContractSha256);
assert.equal(sha256(await bytes("data/v9.1/build_manifest.json")), EXPECTED.projectManifestSha256);
assert.equal(sha256(await bytes("dist/major_project_news_v9_5_1.json")), EXPECTED.feedSha256);
assert.equal(sha256(await bytes("data/v9.7/regional_news.json")), EXPECTED.regionalNewsSha256);
assert.equal(sha256(await bytes("data/v9.7/regional_decisions.json")), EXPECTED.regionalLedgerSha256);
assert.equal(sha256(await bytes("styles/v9-6-1.css")), EXPECTED.frozenMobileCssSha256);
assert.equal(release.news_parent.sha256, EXPECTED.feedSha256);
assert.equal(regionalManifest.hashes.input_sha256, EXPECTED.feedSha256);
assert.equal(regionalManifest.hashes.regional_news_sha256, EXPECTED.regionalNewsSha256);
assert.equal(regionalManifest.hashes.decision_ledger_sha256, EXPECTED.regionalLedgerSha256);

// Re-read and validate every canonical partition at its declared grain and key.
assert.equal(projectManifest.project_partitions.length, 16);
const partitions = await Promise.all(projectManifest.project_partitions.map(async (partition) => {
  const raw = await bytes(partition.path);
  assert.equal(sha256(raw), partition.sha256, `${partition.path} hash drift`);
  const payload = JSON.parse(raw.toString("utf8"));
  assert.equal(payload.schema, "globalgrid2050.v9.project-partition.v9.1");
  assert.equal(payload.record_count, partition.record_count);
  assert.equal(payload.projects.length, partition.record_count);
  return payload.projects;
}));
const projects = partitions.flat();
const refs = new Set();
const projectIds = new Set();
const technologyCounts = { solar: 0, bess: 0, wind_onshore: 0, wind_offshore: 0 };
let capacityMw = 0;
let largestMw = 0;
let geometryCount = 0;
for (const project of projects) {
  assert.equal(typeof project.repd_ref, "string");
  assert.ok(project.repd_ref);
  assert.equal(project.gg_project_id, `GG2050-REPD-${project.repd_ref}`);
  assert.equal(project.identity_status, "REPD_BOUND");
  assert.equal(project.identity_confidence, "authoritative");
  assert.ok(!refs.has(project.repd_ref), `duplicate REPD Ref ${project.repd_ref}`);
  assert.ok(!projectIds.has(project.gg_project_id), `duplicate project ID ${project.gg_project_id}`);
  assert.ok(Object.hasOwn(technologyCounts, project.technology), `unexpected technology ${project.technology}`);
  assert.ok(Number.isFinite(project.capacity_mw) && project.capacity_mw >= 1);
  refs.add(project.repd_ref);
  projectIds.add(project.gg_project_id);
  technologyCounts[project.technology] += 1;
  capacityMw += project.capacity_mw;
  largestMw = Math.max(largestMw, project.capacity_mw);
  if (project.geometry_status === "valid") geometryCount += 1;
}
assert.equal(projects.length, EXPECTED.projectCount);
assert.equal(refs.size, EXPECTED.projectCount);
assert.equal(projectIds.size, EXPECTED.projectCount);
assert.deepEqual(technologyCounts, EXPECTED.technologyCounts);
assert.equal(round2(capacityMw), EXPECTED.capacityMw);
assert.equal(largestMw, EXPECTED.largestMw);
assert.equal(geometryCount, EXPECTED.geometryCount);
assert.equal(projects.length - geometryCount, EXPECTED.missingGeometryCount);
assert.equal(projectManifest.projects_sha256, "24484ca837ac56520ba971fb2c2c1d29620e16a3c71bbaa5764e94c9b515ad52");
assert.equal(projectManifest.project_count, EXPECTED.projectCount);
assert.equal(projectManifest.capacity_mw, EXPECTED.capacityMw);
assert.equal(projectManifest.largest_mw, EXPECTED.largestMw);
assert.deepEqual(projectContract.expected, {
  project_count: 7680,
  capacity_mw: 356474.09,
  largest_mw: 4100,
  solar_count: 3563,
  bess_count: 1609,
  wind_onshore_count: 2399,
  wind_offshore_count: 109,
});
assert.equal(projectManifest.source_identity_sha256, projectContract.source.identity_fixture_sha256);
assert.equal(projectManifest.source_coordinate_fixture_sha256, projectContract.source.coordinate_fixture_sha256);
assert.equal(projectManifest.source_workbook_sha256, projectContract.source.workbook_sha256);

// Frozen UK newspaper plus the V9.7 non-project regional ledger.
assert.equal(feed.schema, "globalgrid2050.major-project-news.v9.5.1");
assert.equal(feed.all_headline_count, EXPECTED.headlineCount);
assert.equal(feed.all_items.length, EXPECTED.headlineCount);
assert.equal(feed.relevant_headline_count, EXPECTED.ukHeadlineCount);
assert.equal(feed.canonical_items.length, EXPECTED.ukHeadlineCount);
assert.equal(feed.v9_4_baseline_headline_count, 125);
assert.equal(feed.beacon_fen_contract.repd_ref, "13599");
assert.equal(feed.beacon_fen_contract.official_capacity_mw, 400);
assert.ok(feed.canonical_items.every((item) => item.role === "PRIMARY_MATCH"
  && item.eligible_for_news_signal === true
  && item.gg_project_id === `GG2050-REPD-${item.repd_ref}`));
assert.equal(regionalNews.articles.length, EXPECTED.internationalHeadlineCount);
assert.equal(regionalLedger.decisions.length, EXPECTED.headlineCount);
assert.equal(new Set(regionalLedger.decisions.map((item) => item.article_id)).size, EXPECTED.headlineCount);
assert.deepEqual(regionalManifest.telemetry.by_region, EXPECTED.regionalCounts);
assert.equal(regionalManifest.telemetry.accepted_count, EXPECTED.internationalHeadlineCount);
assert.equal(regionalManifest.telemetry.by_decision.UK_CANONICAL, EXPECTED.ukHeadlineCount);
assert.equal(regionalManifest.telemetry.last_known_good, true);
assert.ok(regionalNews.articles.every((item) => item.project_signal_eligible === false
  && item.canonical_identity === false));

// Eleven-column table and frozen horizontal mobile viewport.
assert.equal((html.match(/<th(?:\s|>)/g) || []).length, EXPECTED.columns);
assert.match(html, /<tbody id="tbody"><\/tbody>/);
assert.match(html, /styles\/v9-6-1\.css\?v=newsv1/);
assert.match(mobileCss, /\.tablewrap\s*\{[^}]*overflow-x:\s*auto/s);
assert.match(mobileCss, /\.tablewrap \.hide-mobile\s*\{[^}]*display:\s*table-cell/s);
const rowStart = projectsSource.indexOf('return `<tr id="repd-');
const rowEnd = projectsSource.indexOf("</tr>`;", rowStart);
assert.ok(rowStart >= 0 && rowEnd > rowStart, "project row template not found");
const rowTemplate = projectsSource.slice(rowStart, rowEnd);
assert.equal((rowTemplate.match(/<td(?:\s|>)/g) || []).length, EXPECTED.columns);
assert.match(projectsSource, /colspan="11"/);

// Pagination limits the live DOM without truncating filter, gauge or CSV state.
assert.equal(release.interface.project_table_columns, EXPECTED.columns);
assert.equal(release.interface.rows_per_page, EXPECTED.rowsPerPage);
assert.equal(release.interface.all_records_remain_filterable_sortable_and_exportable, true);
assert.equal(release.interface.mobile_horizontal_scroll_preserved, true);
assert.equal(release.performance.initial_project_row_budget, EXPECTED.rowsPerPage);
assert.equal(release.performance.initial_dom_element_budget, EXPECTED.domElementBudget);
assert.equal(Math.ceil(EXPECTED.projectCount / EXPECTED.rowsPerPage), 77);
assert.equal(EXPECTED.projectCount % EXPECTED.rowsPerPage, 80);
assert.match(projectsSource, /const ROWS_PER_PAGE = 100;/);
assert.match(projectsSource, /const pageRows = filtered\.slice\(start, start \+ ROWS_PER_PAGE\);/);
const renderTableSource = projectsSource.slice(
  projectsSource.indexOf("function renderTable()"),
  projectsSource.indexOf("function renderPager()"),
);
assert.match(renderTableSource, /body\.innerHTML = pageRows\.map/);
assert.doesNotMatch(renderTableSource, /body\.innerHTML = filtered\.map/);
assert.match(projectsSource, /state\.filtered = filtered;/);
assert.match(projectsSource, /updateGaugesV9_2\(filtered\);/);
assert.match(projectsSource, /const rows = filtered\.map/);
assert.match(projectsSource, /previous\.disabled = pageIndex === 0/);
assert.match(projectsSource, /next\.disabled = pageIndex >= pageCount - 1/);

// Cache-safe singleton loaders, bounded hydration and local-first pinned fallback.
assert.equal(release.performance.project_loader_singleton, true);
assert.equal(release.performance.verified_first_partition_preview, true);
assert.equal(release.performance.first_partition_preview_records, 500);
assert.equal(release.performance.parser_blocking_third_party_scripts, 0);
assert.equal(release.performance.project_fetch_concurrency, 4);
assert.equal(release.performance.fetch_timeout_ms, 15000);
assert.match(projectLoaderSource, /const FETCH_CONCURRENCY = 4;/);
assert.match(projectLoaderSource, /const FETCH_TIMEOUT_MS = 15000;/);
assert.match(projectLoaderSource, /let canonicalLoadPromise = null;/);
assert.match(projectLoaderSource, /const firstProjects = await fetchPartition\(firstDescriptor\);/);
assert.match(projectLoaderSource, /onFirstPartition\(Object\.freeze/);
assert.match(projectsSource, /renderFirstPartitionPreview/);
assert.match(projectsSource, /dataset\.hydration = "complete"/);
assert.match(projectLoaderSource, /cache: "default"/);
assert.match(releaseLoaderSource, /cache: "default"/);
assert.doesNotMatch(`${projectLoaderSource}\n${releaseLoaderSource}`, /cache:\s*["']no-store["']/);
assert.equal(release.performance.same_origin_news_first, true);
assert.equal(release.performance.fallback_only_after_primary_failure, true);
const primaryPosition = newsBaseSource.indexOf('["PipelineNews release", "dist/major_project_news_v9_5_1.json"]');
const fallbackPosition = newsBaseSource.indexOf(EXPECTED.sourceCommit);
assert.ok(primaryPosition >= 0 && fallbackPosition > primaryPosition, "news sources are not local-first");
assert.match(newsBaseSource, new RegExp(`raw\\.githubusercontent\\.com/Ventusltd/globalgrid2050/${EXPECTED.sourceCommit}/dist/major_project_news_v9_5_1\\.json`));
assert.match(newsBaseSource, /for \(const \[label, url\] of NEWS_SOURCES\)/);
assert.doesNotMatch(newsBaseSource, /Promise\.allSettled|\/main\/dist\/major_project_news|Date\.now\(\)|cache:\s*["']no-store["']/);
assert.match(newsBaseSource, /cache: "default"/);
assert.match(regionalRuntimeSource, /cache: "default"/);
assert.doesNotMatch(regionalRuntimeSource, /Date\.now\(\)|cache:\s*["']no-store["']/);

// Chart.js is pinned but loaded asynchronously by the app, never parser-blocking.
assert.doesNotMatch(html, /cdn\.jsdelivr\.net\/npm\/chart\.js/);
assert.match(gaugesSource, /chart\.js@4\.5\.1\/dist\/chart\.umd\.min\.js/);
assert.match(gaugesSource, /script\.async = true/);
assert.match(appSource, /loadGaugeChartsNewsV1\(\);/);

console.log("NewsV1 verification: PASS");
console.log("projects=7,680 capacity=356,474.09MW rows/page=100 columns=11 DOM-budget=10,000");
console.log("news=133 UK=45 international=19 (US=4 Europe=9 other=6)");
console.log(`source=${EXPECTED.sourceCommit.slice(0, 12)} subtree=${EXPECTED.sourceSubtree.slice(0, 12)} feed=${EXPECTED.feedSha256.slice(0, 12)}`);
