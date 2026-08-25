import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const repository = new URL("../../", import.meta.url);
const outputPath = "newsv7/data/newsv7/cumulative_intelligence.json";
const manifestPath = "newsv7/data/newsv7/build_manifest.json";
const generatedAt = "2026-08-25T00:00:00Z";

const INPUTS = Object.freeze({
  feed: ["newsv1/dist/major_project_news_v9_5_1.json", "cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd"],
  events: ["newsv2/data/material_event_assertions.json", "329ae3cdbecfaa486bfca435100604aae08e2be14f2732ad2da78ad075304e31"],
  organisations: ["newsv3/data/organisation_role_evidence.json", "03a258e0b90c1d95e8a8582ff203676651bfc7d5cd33f8652aef17ddfc04da75"],
  sourceHealth: ["newsv4/data/source_health_context.json", "5aa7f2bef3d99d2cc50c81695da406ccdd3f315c88237ecf0de2c0568deefd0d"],
  reasons: ["newsv5/data/reason_decision_ledger.json", "fbce604f865341391316917cb14d6319f8b1fdbb503a971a19a7c7d0ecfec06a"],
  dataCentres: ["newsv6/data/data_centre_evidence.json", "e5e984f763877f41fef5c39bce248ee74bb9f22706c87cd51d6fd2a2ce9cd5d5"],
  parquetManifest: ["analytics_v1/data/parquet_manifest.json", "9ac1f894c9b1d7d51ea4d68cc35f8de0ad6fd4ac02b5b2b13b83d1c1dd69a91e"],
  parquetAudit: ["analytics_v1/reports/parquet_audit.json", "2c2af8a38bcb9b6ce4127835b4e005a1dc22d097f2dd21b64c036b7ca38115be"],
  consumerOverlay: ["consumer_v1/data/intelligence_overlay.json", "f9da6cc8b98a173abef7cf264b1f3a007ff3d2659beab281fbe535a207501bc9"],
  interfaceGuard: ["consumer_v1/data/interface_guard.json", "6e570295f19a4fa1ea1c6731d372f25f9545940900acbfc1a6fa7a6ac91a8f11"],
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function invariant(condition, message) {
  if (!condition) throw new Error(`NewsV7 cumulative build: ${message}`);
}

async function readPinned([path, expectedSha256]) {
  const bytes = await readFile(new URL(path, repository));
  const actualSha256 = sha256(bytes);
  invariant(actualSha256 === expectedSha256, `${path} provenance mismatch`);
  return { path, sha256: actualSha256, data: JSON.parse(bytes.toString("utf8")) };
}

function uniqueMap(rows, key, label) {
  const map = new Map();
  for (const row of rows) {
    const value = row[key];
    invariant(value, `${label} has a null key`);
    invariant(!map.has(value), `${label} duplicate key ${value}`);
    map.set(value, row);
  }
  return map;
}

const loaded = Object.fromEntries(await Promise.all(Object.entries(INPUTS).map(async ([name, input]) => [name, await readPinned(input)])));
const feed = loaded.feed.data;
const events = loaded.events.data;
const organisations = loaded.organisations.data;
const sourceHealth = loaded.sourceHealth.data;
const reasons = loaded.reasons.data;
const dataCentres = loaded.dataCentres.data;
const parquetManifest = loaded.parquetManifest.data;
const parquetAudit = loaded.parquetAudit.data;
const consumerOverlay = loaded.consumerOverlay.data;
const interfaceGuard = loaded.interfaceGuard.data;

invariant(feed.schema === "globalgrid2050.major-project-news.v9.5.1" && feed.all_headline_count === 133, "V9.7 headline baseline mismatch");
invariant(feed.relevant_headline_count === 45 && feed.beacon_fen_contract?.repd_ref === "13599", "UK headline or Beacon Fen baseline mismatch");
invariant(events.schema === "pipelinenews.material-event-assertions.v1" && events.assertions.length === 45, "NewsV2 event law mismatch");
invariant(organisations.counts?.organisation_labels === 28 && organisations.counts?.project_operator_role_assertions === 29, "NewsV3 organisation law mismatch");
invariant(organisations.counts?.transaction_role_decisions === 45, "NewsV3 abstention law mismatch");
invariant(sourceHealth.counts?.rows === 6 && sourceHealth.counts?.status?.CURRENT === 0, "NewsV4 source-health law mismatch");
invariant(reasons.counts?.rows === 45 && reasons.counts?.decisions?.HOLD_FOR_VERIFICATION === 45, "NewsV5 reason law mismatch");
invariant(reasons.counts?.decisions?.PUBLISH_REASON_TO_RESEARCH === 0, "unsupported NewsV5 reason became publishable");
invariant(dataCentres.counts?.sources === 6 && dataCentres.counts?.observations === 2, "NewsV6 data-centre law mismatch");
invariant(dataCentres.counts?.link_decisions === 2 && dataCentres.counts?.linked === 0, "NewsV6 identity boundary mismatch");
invariant(parquetManifest.schema === "pipelinenews.parquet-release-manifest.v1" && parquetManifest.status === "CANDIDATE", "AnalyticsV1 manifest mismatch");
invariant(parquetAudit.status === "PASS" && parquetAudit.counts?.tables === 9 && parquetAudit.counts?.source_rows === 208, "AnalyticsV1 physical audit mismatch");
invariant(parquetAudit.counts?.parquet_rows === 208 && parquetAudit.counts?.duplicate_key_groups === 0 && parquetAudit.counts?.required_null_key_rows === 0, "AnalyticsV1 keyed readback mismatch");
invariant(parquetAudit.counts?.schema_mismatches === 0 && parquetAudit.counts?.duckdb_view_mismatches === 0, "AnalyticsV1 schema or view mismatch");
invariant(parquetAudit.counts?.cross_domain_identity_links === 0, "AnalyticsV1 cross-domain leakage");
invariant(consumerOverlay.counts?.reasons_to_research === 0 && consumerOverlay.counts?.data_centre_observations === 2, "ConsumerV1 projection mismatch");
invariant(interfaceGuard.status === "PASS" && interfaceGuard.beacon_fen?.repd_ref === "13599", "ConsumerV1 interface guard mismatch");
invariant(interfaceGuard.interface?.project_table_columns === 11 && interfaceGuard.interface?.mobile_horizontal_scroll === true, "ConsumerV1 interface law mismatch");

const transactionByEvent = uniqueMap(organisations.transaction_role_decisions, "event_assertion_id", "transaction role decision");
const reasonByEvent = uniqueMap(reasons.reason_decisions, "event_assertion_id", "reason decision");
const roleRowsByRepd = new Map();
for (const role of organisations.project_operator_role_assertions) {
  const rows = roleRowsByRepd.get(role.repd_ref) || [];
  rows.push(role);
  roleRowsByRepd.set(role.repd_ref, rows);
}

const articleIds = new Set();
const eventIntelligence = [...events.assertions]
  .sort((left, right) => left.display_order - right.display_order)
  .map((event, index) => {
    invariant(event.display_order === index + 1, `event display order gap at ${index + 1}`);
    invariant(!articleIds.has(event.article_id), `duplicate article ${event.article_id}`);
    articleIds.add(event.article_id);
    invariant(event.identity?.role === "PRIMARY_MATCH" && event.identity?.eligible_for_news_signal === true, `non-canonical event ${event.assertion_id}`);
    invariant(event.claim?.verification_status === "HEADLINE_DERIVED_UNVERIFIED", `event verification drift ${event.assertion_id}`);
    const transaction = transactionByEvent.get(event.assertion_id);
    const reason = reasonByEvent.get(event.assertion_id);
    invariant(transaction?.decision === "ABSTAIN_NO_DIRECT_ROLE_EVIDENCE", `transaction role drift ${event.assertion_id}`);
    invariant(Object.values(transaction.roles).every((value) => value === null), `commercial role leakage ${event.assertion_id}`);
    invariant(reason?.decision === "HOLD_FOR_VERIFICATION" && reason?.protections?.opportunity_claimed === false, `reason gate drift ${event.assertion_id}`);
    const operatorRows = roleRowsByRepd.get(event.repd_ref) || [];
    invariant(operatorRows.length >= 1, `missing REPD operator evidence ${event.repd_ref}`);
    return {
      display_order: event.display_order,
      article_id: event.article_id,
      event_assertion_id: event.assertion_id,
      repd_ref: event.repd_ref,
      project_id: event.project_id,
      event_type: event.event_type,
      event_claim_status: event.claim.verification_status,
      event_evidence_class: event.claim.evidence_class,
      identity_confidence: event.identity.confidence,
      operator_labels: operatorRows.map((row) => ({
        source_label: row.source_label,
        claim_class: row.claim_class,
        verification_status: row.verification_status,
      })),
      transaction_role_decision: transaction.decision,
      research_decision: reason.decision,
      research_capability: reason.capability,
      publishable_reason: false,
    };
  });

invariant(eventIntelligence.length === 45 && eventIntelligence.some((row) => row.repd_ref === "13599"), "event projection count or Beacon Fen mismatch");
invariant(!eventIntelligence.some((row) => row.repd_ref === "13600"), "Beacon Fen leaked to forbidden BESS sibling");

const sourceHashes = Object.fromEntries(Object.entries(loaded).map(([name, value]) => [name, { path: value.path, sha256: value.sha256 }]));
const output = {
  schema: "pipelinenews.cumulative-intelligence.newsv7.v1",
  release: "newsv7",
  status: "CANDIDATE",
  generated_at: generatedAt,
  baseline: {
    release: "GlobalGrid V9.7 via frozen NewsV1 runtime",
    source_commit: "824a23cd0cf9f90a9df942f1b37a09c2dc6472b7",
    source_subtree: "4fca94ede95789ade9490258a2323c00c13ec2ea",
    project_count: 7680,
    capacity_mw: 356474.09,
    all_headlines: 133,
    uk_headlines: 45,
    international_headlines: 19,
    beacon_fen_repd_ref: "13599",
  },
  counts: {
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
  },
  source_hashes: sourceHashes,
  event_intelligence: eventIntelligence,
  source_health: sourceHealth.decisions,
  data_centres: {
    sources: dataCentres.sources,
    observations: dataCentres.observations,
    link_decisions: dataCentres.link_decisions,
  },
  publication_law: {
    official_repd_facts_changed: false,
    headline_order_changed: false,
    event_claims_remain_unverified: true,
    commercial_roles_published: false,
    opportunity_claims_published: false,
    stale_context_used_as_event_proof: false,
    data_centres_linked_to_renewable_projects: false,
  },
};

const outputBytes = Buffer.from(`${JSON.stringify(output, null, 2)}\n`);
await writeFile(new URL(outputPath, repository), outputBytes);

const manifest = {
  schema: "pipelinenews.newsv7-build-manifest.v1",
  release: "newsv7",
  status: "PASS",
  generated_at: generatedAt,
  source_hashes: sourceHashes,
  output: {
    path: outputPath,
    sha256: sha256(outputBytes),
    event_rows: eventIntelligence.length,
  },
  checks: {
    baseline_counts_and_order: "PASS",
    beacon_fen_13599_and_not_13600: "PASS",
    keys_unique_and_non_null: "PASS",
    commercial_roles_null: "PASS",
    publishable_reasons_zero: "PASS",
    current_context_sources_zero: "PASS",
    cross_domain_identity_links_zero: "PASS",
    analytics_physical_readback: "PASS",
  },
};
await writeFile(new URL(manifestPath, repository), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`NewsV7 cumulative intelligence: PASS (${eventIntelligence.length} ordered event rows)`);
