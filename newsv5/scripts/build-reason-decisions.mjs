import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { EVENT_TO_CAPABILITY_RULES, RULE_VERSION, ruleForEvent } from "../modules/event-to-capability-rules.mjs";
import { VOCABULARY_VERSION, buildMarketPainVocabulary } from "../modules/market-pain-vocabulary.mjs";
import { RECONCILER_VERSION, reconcileHostileCase, reconcileReasonEvidence } from "../modules/evidence-reconciliation.mjs";
import { BROWSER_PROJECTION_VERSION, buildBrowserProjection } from "../modules/browser-projection.mjs";

const paths = {
  events: new URL("../../newsv2/data/material_event_assertions.json", import.meta.url),
  roles: new URL("../../newsv3/data/organisation_role_evidence.json", import.meta.url),
  context: new URL("../../newsv4/data/source_health_context.json", import.meta.url),
  themes: new URL("../../reports/public-source-sales-theme-audit.v1.json", import.meta.url),
  hostile: new URL("../fixtures/hostile_reason_cases.v1.json", import.meta.url),
  contract: new URL("../contracts/release.newsv5.json", import.meta.url),
  output: new URL("../data/reason_decision_ledger.json", import.meta.url),
  browser: new URL("../data/reasons_browser.json", import.meta.url),
  manifest: new URL("../data/build_manifest.json", import.meta.url)
};
const expected = {
  events: "329ae3cdbecfaa486bfca435100604aae08e2be14f2732ad2da78ad075304e31",
  roles: "03a258e0b90c1d95e8a8582ff203676651bfc7d5cd33f8652aef17ddfc04da75",
  context: "5aa7f2bef3d99d2cc50c81695da406ccdd3f315c88237ecf0de2c0568deefd0d",
  themes: "4649d6b4b8388e0f3ff816851094568869c267c0ae53d7405d8a477756700552",
  hostile: "964ee981c70c800a7695ef4a4ce75a7167c949fa86d2555b0370030811e42579"
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stableId = (prefix, value) => `${prefix}-${sha256(value).slice(0, 20).toUpperCase()}`;
const inputKeys = ["events", "roles", "context", "themes", "hostile", "contract"];
const entries = await Promise.all(inputKeys.map(async (key) => [key, await readFile(paths[key])]));
const bytes = Object.fromEntries(entries);
for (const [key, hash] of Object.entries(expected)) if (sha256(bytes[key]) !== hash) throw new Error(`${key} input hash mismatch`);
const events = JSON.parse(bytes.events), roles = JSON.parse(bytes.roles), context = JSON.parse(bytes.context), themes = JSON.parse(bytes.themes), hostile = JSON.parse(bytes.hostile);
const vocabulary = buildMarketPainVocabulary(themes);
const themeById = new Map(vocabulary.map((theme) => [theme.theme_evidence_id, theme]));
const roleByEvent = new Map(roles.transaction_role_decisions.map((row) => [row.event_assertion_id, row]));
const currentContextCount = context.decisions.filter((row) => row.status === "CURRENT").length;

const reasonDecisions = events.assertions.map((event) => {
  const rule = ruleForEvent(event.event_type);
  if (!rule) throw new Error(`Missing event-to-capability rule: ${event.event_type}`);
  const theme = themeById.get(rule.theme_evidence_id);
  const roleDecision = roleByEvent.get(event.assertion_id);
  if (!theme || !roleDecision) throw new Error(`Missing reconciliation input: ${event.assertion_id}`);
  const reconciled = reconcileReasonEvidence({eventVerificationStatus: event.claim.verification_status});
  const reasonId = stableId("PN-REASON", `${event.assertion_id}|${RULE_VERSION}`);
  return {
    reason_decision_id: stableId("PN-REASON-DECISION", `${reasonId}|${RECONCILER_VERSION}`),
    reason_id: reasonId,
    rule_id: `${RULE_VERSION}:${event.event_type}`,
    rule_version: RULE_VERSION,
    source_display_order: event.display_order,
    project_id: event.project_id,
    repd_ref: event.repd_ref,
    event_assertion_id: event.assertion_id,
    transaction_role_decision_id: roleDecision.transaction_role_decision_id,
    capability: rule.capability,
    triggering_evidence_ids: [event.assertion_id, roleDecision.transaction_role_decision_id, theme.theme_evidence_id],
    evidence_classes: [event.claim.evidence_class, roleDecision.claim_class, theme.evidence_class],
    source_urls: [event.claim.article_url, theme.source_url],
    claim_status: "RESEARCH_HYPOTHESIS_EVENT_UNVERIFIED",
    explanation: `The ${event.event_type} headline claim matches the ${rule.capability} research vocabulary, but no direct public record verifies the event.`,
    limitations: [
      "The event is derived from a publisher headline and is not independently verified.",
      "Podcast-derived vocabulary is theme evidence only and does not establish an opportunity or relationship.",
      "No current market-context record exists in NewsV4 and context cannot verify a project event.",
      "No buyer, seller, lender, contractor, supplier, adviser, budget, intent, probability or deal stage is asserted."
    ],
    decision: reconciled.decision,
    decision_code: reconciled.code,
    protections: {
      opportunity_claimed: false,
      relationship_claimed: false,
      transaction_role_claimed: false,
      market_context_used_as_event_proof: false,
      private_sales_workflow_included: false
    }
  };
}).sort((a, b) => a.source_display_order - b.source_display_order || a.reason_decision_id.localeCompare(b.reason_decision_id));

const hostileDecisions = hostile.cases.map((testCase) => ({
  case_id: testCase.case_id,
  expected_decision: testCase.expected_decision,
  ...reconcileHostileCase(testCase.case_id),
  reason: testCase.reason
}));
const decisionValues = ["PUBLISH_REASON_TO_RESEARCH", "HOLD_FOR_VERIFICATION", "REJECT", "ABSTAIN"];
const decisionCounts = Object.fromEntries(decisionValues.map((decision) => [decision, reasonDecisions.filter((row) => row.decision === decision).length]));
const hostileCounts = Object.fromEntries(decisionValues.map((decision) => [decision, hostileDecisions.filter((row) => row.decision === decision).length]));
const product = {
  schema: "pipelinenews.reason-decision-ledger.v1",
  release: "newsv5",
  status: "CANDIDATE",
  generated_at: "2026-08-25T00:00:00Z",
  grain: "one row per NewsV2 event assertion and reason-rule version",
  primary_key: ["reason_decision_id"],
  source_usage: "PUBLIC_EVIDENCE_AND_SEARCH_VOCABULARY_NO_PRIVATE_WORKFLOW",
  module_versions: {rules: RULE_VERSION, vocabulary: VOCABULARY_VERSION, reconciliation: RECONCILER_VERSION, browser_projection: BROWSER_PROJECTION_VERSION},
  counts: {rows: reasonDecisions.length, decisions: decisionCounts, hostile_decisions: hostileCounts, current_context_rows: currentContextCount},
  event_to_capability_rules: EVENT_TO_CAPABILITY_RULES,
  market_pain_vocabulary: vocabulary,
  hostile_negative_decisions: hostileDecisions,
  reason_decisions: reasonDecisions
};
const productBytes = Buffer.from(`${JSON.stringify(product, null, 2)}\n`);
const browser = buildBrowserProjection(product);
const browserBytes = Buffer.from(`${JSON.stringify(browser, null, 2)}\n`);
const modulePaths = [
  "newsv5/modules/event-to-capability-rules.mjs",
  "newsv5/modules/market-pain-vocabulary.mjs",
  "newsv5/modules/evidence-reconciliation.mjs",
  "newsv5/modules/browser-projection.mjs",
  "newsv5/scripts/build-reason-decisions.mjs"
];
const moduleBytes = await Promise.all(modulePaths.map((path) => readFile(new URL(`../../${path}`, import.meta.url))));
const keys = reasonDecisions.map((row) => row.reason_decision_id);
const manifest = {
  schema: "pipelinenews.build-manifest.v1", release: "newsv5", status: "CANDIDATE", built_at: product.generated_at,
  modules: modulePaths.map((path, index) => ({path, sha256: sha256(moduleBytes[index])})),
  inputs: inputKeys.map((key) => ({path: key === "events" ? "newsv2/data/material_event_assertions.json" : key === "roles" ? "newsv3/data/organisation_role_evidence.json" : key === "context" ? "newsv4/data/source_health_context.json" : key === "themes" ? "reports/public-source-sales-theme-audit.v1.json" : key === "hostile" ? "newsv5/fixtures/hostile_reason_cases.v1.json" : "newsv5/contracts/release.newsv5.json", sha256: sha256(bytes[key])})),
  artifacts: [
    {path: "newsv5/data/reason_decision_ledger.json", sha256: sha256(productBytes), bytes: productBytes.byteLength, rows: reasonDecisions.length},
    {path: "newsv5/data/reasons_browser.json", sha256: sha256(browserBytes), bytes: browserBytes.byteLength, rows: browser.count}
  ],
  checks: {reason_decisions: {total_rows: reasonDecisions.length, distinct_declared_keys: new Set(keys).size, duplicate_key_groups: reasonDecisions.length - new Set(keys).size, required_null_key_rows: keys.filter((key) => !key).length}, independent_verifier: "newsv5/tests/check_newsv5.mjs"}
};
await mkdir(new URL("../data/", import.meta.url), {recursive: true});
await Promise.all([writeFile(paths.output, productBytes), writeFile(paths.browser, browserBytes), writeFile(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`)]);
console.log(`Built NewsV5: ${reasonDecisions.length} decisions; ${browser.count} published reasons`);
