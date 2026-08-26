import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const releaseRoot = new URL("../", import.meta.url);
const repositoryRoot = new URL("../../", import.meta.url);
const text = (path) => readFile(new URL(path, releaseRoot), "utf8");
const bytes = (path) => readFile(new URL(path, releaseRoot));
const json = async (path) => JSON.parse(await text(path));
const repoBytes = (path) => readFile(new URL(path, repositoryRoot));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [release, migration, cumulative, manifest, html, projectsSource, newsSource, intelligenceSource, mobileCss] = await Promise.all([
  json("contracts/release.newsv7.json"),
  json("MIGRATION_MANIFEST.json"),
  json("data/newsv7/cumulative_intelligence.json"),
  json("data/newsv7/build_manifest.json"),
  text("index.html"),
  text("scripts/plugins/projects-newsv7.js"),
  text("scripts/plugins/newspaper-newsv7-base.js"),
  text("scripts/plugins/intelligence-newsv7.js"),
  text("styles/v9-6-1.css"),
]);

assert.equal(release.schema, "pipelinenews.ui-release.v1");
assert.equal(release.release, "newsv7");
assert.equal(release.semantic_version, "7.0.0-rc.1");
assert.equal(release.status, "CANDIDATE");
assert.equal(release.frozen_source.release, "9.7");
assert.equal(release.frozen_source.commit, "824a23cd0cf9f90a9df942f1b37a09c2dc6472b7");
assert.equal(release.frozen_source.subtree, "4fca94ede95789ade9490258a2323c00c13ec2ea");
assert.equal(release.ui_baseline.release, "newsv1");
assert.equal(release.ui_baseline.tree, "2d6247c067aa5fad49995dcb9029d6cdb9898994");
assert.equal(migration.release, "newsv7");
assert.equal(migration.canonical_data_changed, false);
assert.equal(migration.news_content_or_order_changed, false);

const baselinePaths = [
  "contracts/release.v9.1.json",
  "data/v9.1/build_manifest.json",
  ...Array.from({ length: 16 }, (_, index) => `data/v9.1/projects/part-${String(index + 1).padStart(3, "0")}.json`),
  "data/v9.7/regional_news.json",
  "data/v9.7/regional_decisions.json",
  "data/v9.7/regional_manifest.json",
  "dist/major_project_news_v9_5_1.json",
  "styles/mobile.css",
  "styles/v9-6-1.css",
];
for (const path of baselinePaths) {
  const [newsv1Bytes, newsv7Bytes] = await Promise.all([repoBytes(`newsv1/${path}`), bytes(path)]);
  assert.equal(sha256(newsv7Bytes), sha256(newsv1Bytes), `${path} differs from frozen NewsV1/V9.7 baseline`);
}

assert.equal(cumulative.schema, "pipelinenews.cumulative-intelligence.newsv7.v1");
assert.equal(cumulative.release, "newsv7");
assert.equal(cumulative.baseline.project_count, 7680);
assert.equal(cumulative.baseline.capacity_mw, 356474.09);
assert.equal(cumulative.baseline.all_headlines, 133);
assert.equal(cumulative.baseline.uk_headlines, 45);
assert.equal(cumulative.baseline.international_headlines, 19);
assert.equal(cumulative.baseline.beacon_fen_repd_ref, "13599");
assert.deepEqual(cumulative.counts, {
  material_event_assertions: 45,
  organisation_labels: 28,
  project_operator_role_assertions: 29,
  transaction_role_abstentions: 45,
  source_health_decisions: 6,
  current_context_sources: 0,
  publishable_reasons: 0,
  held_reasons: 45,
  data_centre_sources: 6,
  data_centre_observations: 2,
  data_centre_link_decisions: 2,
  renewable_data_centre_identity_links: 0,
  parquet_tables: 9,
  parquet_rows: 208,
});

assert.equal(cumulative.event_intelligence.length, 45);
assert.equal(new Set(cumulative.event_intelligence.map((row) => row.article_id)).size, 45);
assert.equal(new Set(cumulative.event_intelligence.map((row) => row.event_assertion_id)).size, 45);
cumulative.event_intelligence.forEach((row, index) => {
  assert.equal(row.display_order, index + 1);
  assert.ok(row.article_id && row.event_assertion_id && row.repd_ref && row.project_id);
  assert.equal(row.project_id, `GG2050-REPD-${row.repd_ref}`);
  assert.equal(row.event_claim_status, "HEADLINE_DERIVED_UNVERIFIED");
  assert.equal(row.transaction_role_decision, "ABSTAIN_NO_DIRECT_ROLE_EVIDENCE");
  assert.equal(row.research_decision, "HOLD_FOR_VERIFICATION");
  assert.equal(row.publishable_reason, false);
  assert.ok(row.operator_labels.length >= 1);
});
assert.ok(cumulative.event_intelligence.some((row) => row.repd_ref === "13599"));
assert.ok(!cumulative.event_intelligence.some((row) => row.repd_ref === "13600"));

const healthCounts = cumulative.source_health.reduce((counts, row) => {
  counts[row.status] = (counts[row.status] || 0) + 1;
  return counts;
}, {});
assert.equal(cumulative.source_health.length, 6);
assert.equal(healthCounts.CURRENT, undefined);
assert.equal(healthCounts.STALE, 1);
assert.equal(healthCounts.DEGRADED, 4);
assert.equal(healthCounts.UNAVAILABLE, 1);
assert.ok(cumulative.source_health.every((row) => row.protections.project_binding_allowed === false
  && row.protections.event_verification_allowed === false
  && row.protections.grid_constraint_assertion_allowed === false));

assert.equal(cumulative.data_centres.sources.length, 6);
assert.equal(cumulative.data_centres.observations.length, 2);
assert.equal(cumulative.data_centres.link_decisions.length, 2);
assert.ok(cumulative.data_centres.observations.every((row) => [
  row.it_load_mw,
  row.requested_grid_capacity_mw,
  row.contracted_grid_capacity_mw,
  row.operational_capacity_mw,
].every((value) => value === null)));
assert.ok(cumulative.data_centres.link_decisions.every((row) => row.decision === "ABSTAIN_INSUFFICIENT_IDENTITY_EVIDENCE"));

const cumulativeBytes = await bytes("data/newsv7/cumulative_intelligence.json");
assert.equal(manifest.schema, "pipelinenews.newsv7-build-manifest.v1");
assert.equal(manifest.status, "PASS");
assert.equal(manifest.output.sha256, sha256(cumulativeBytes));
assert.equal(manifest.output.event_rows, 45);
assert.ok(Object.values(manifest.checks).every((status) => status === "PASS"));
for (const [name, expected] of Object.entries(release.cumulative_inputs)) {
  const manifestName = {
    newsv2_material_events: "events",
    newsv3_organisation_evidence: "organisations",
    newsv4_source_health: "sourceHealth",
    newsv5_reason_decisions: "reasons",
    newsv6_data_centre_evidence: "dataCentres",
    analytics_v1_manifest: "parquetManifest",
    analytics_v1_audit: "parquetAudit",
    consumer_v1_overlay: "consumerOverlay",
    consumer_v1_interface_guard: "interfaceGuard",
  }[name];
  assert.equal(manifest.source_hashes[manifestName].sha256, expected, `${name} hash mismatch`);
}

assert.equal((html.match(/<th(?:\s|>)/g) || []).length, 11);
assert.match(html, /UK RENEWABLES PIPELINE NEWS V7/);
assert.match(html, /id="cumulativeIntelligence"/);
assert.match(html, /scripts\/app-newsv7\.js\?v=newsv7/);
assert.match(html, /styles\/intelligence-newsv7\.css\?v=newsv7/);
assert.doesNotMatch(html, /NEWS V1 CANDIDATE/);
assert.equal(release.interface.project_table_columns, 11);
assert.equal(release.interface.rows_per_page, 100);
assert.equal(release.interface.mobile_horizontal_scroll_preserved, true);
assert.equal(release.interface.mobile_card_conversion, false);
assert.match(mobileCss, /\.tablewrap\s*\{[^}]*overflow-x:\s*auto/s);
assert.match(mobileCss, /\.tablewrap \.hide-mobile\s*\{[^}]*display:\s*table-cell/s);
assert.match(projectsSource, /const ROWS_PER_PAGE = 100;/);
assert.match(projectsSource, /const pageRows = filtered\.slice\(start, start \+ ROWS_PER_PAGE\);/);
assert.match(projectsSource, /loadCanonicalProjectsNewsV7Release/);
assert.match(newsSource, /intelligenceForArticleNewsV7/);
assert.match(newsSource, /ROLES ABSTAINED/);
assert.match(intelligenceSource, /const FETCH_TIMEOUT_MS = 15000;/);
assert.match(intelligenceSource, /cache: "default"/);
assert.doesNotMatch(`${projectsSource}\n${newsSource}\n${intelligenceSource}`, /cache:\s*["']no-store["']|Date\.now\(\)/);
assert.deepEqual(cumulative.publication_law, {
  official_repd_facts_changed: false,
  headline_order_changed: false,
  event_claims_remain_unverified: true,
  commercial_roles_published: false,
  opportunity_claims_published: false,
  stale_context_used_as_event_proof: false,
  data_centres_linked_to_renewable_projects: false,
});

console.log("NewsV7 cumulative verification: PASS");
