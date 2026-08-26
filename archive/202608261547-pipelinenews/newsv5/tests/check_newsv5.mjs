import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { reconcileReasonEvidence } from "../modules/evidence-reconciliation.mjs";

const paths = {
  events: new URL("../../newsv2/data/material_event_assertions.json", import.meta.url), roles: new URL("../../newsv3/data/organisation_role_evidence.json", import.meta.url), context: new URL("../../newsv4/data/source_health_context.json", import.meta.url), themes: new URL("../../reports/public-source-sales-theme-audit.v1.json", import.meta.url), hostile: new URL("../fixtures/hostile_reason_cases.v1.json", import.meta.url), contract: new URL("../contracts/release.newsv5.json", import.meta.url), output: new URL("../data/reason_decision_ledger.json", import.meta.url), browser: new URL("../data/reasons_browser.json", import.meta.url), manifest: new URL("../data/build_manifest.json", import.meta.url)
};
const bytes = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readFile(path)])));
const json = (key) => JSON.parse(bytes[key]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const contract = json("contract"), product = json("output"), browser = json("browser"), manifest = json("manifest");
for (const source of contract.inputs) {
  const key = Object.entries(paths).find(([, path]) => path.pathname.endsWith(source.path))?.[0];
  assert.ok(key, `contract input path must resolve: ${source.path}`);
  assert.equal(sha256(bytes[key]), source.sha256);
}
assert.equal(product.schema, "pipelinenews.reason-decision-ledger.v1");
assert.equal(product.status, "CANDIDATE");
assert.equal(product.counts.rows, 45);
assert.deepEqual(product.counts.decisions, {PUBLISH_REASON_TO_RESEARCH: 0, HOLD_FOR_VERIFICATION: 45, REJECT: 0, ABSTAIN: 0});
assert.deepEqual(product.counts.hostile_decisions, {PUBLISH_REASON_TO_RESEARCH: 0, HOLD_FOR_VERIFICATION: 2, REJECT: 1, ABSTAIN: 3});
assert.equal(product.counts.current_context_rows, 0);
assert.equal(product.event_to_capability_rules.length, 6);
assert.equal(product.market_pain_vocabulary.length, 6);
assert.ok(product.market_pain_vocabulary.every((row) => row.claim_status === "THEME_ONLY_NOT_OPPORTUNITY" && row.permitted_use === "SEARCH_VOCABULARY_ONLY"));

const keys = product.reason_decisions.map((row) => row.reason_decision_id);
assert.equal(keys.filter((key) => !key).length, 0);
assert.equal(new Set(keys).size, 45);
for (const row of product.reason_decisions) {
  assert.match(row.reason_decision_id, /^PN-REASON-DECISION-[A-F0-9]{20}$/);
  assert.match(row.reason_id, /^PN-REASON-[A-F0-9]{20}$/);
  assert.equal(row.decision, "HOLD_FOR_VERIFICATION");
  assert.equal(row.claim_status, "RESEARCH_HYPOTHESIS_EVENT_UNVERIFIED");
  assert.equal(row.source_urls.length, 2);
  assert.ok(row.source_urls.every((url) => /^https:\/\//.test(url)));
  assert.equal(row.triggering_evidence_ids.length, 3);
  assert.equal(row.limitations.length, 4);
  assert.deepEqual(row.protections, {opportunity_claimed: false, relationship_claimed: false, transaction_role_claimed: false, market_context_used_as_event_proof: false, private_sales_workflow_included: false});
}
assert.equal(product.reason_decisions.find((row) => row.repd_ref === "13599")?.project_id, "GG2050-REPD-13599");
assert.equal(product.reason_decisions.some((row) => row.repd_ref === "13600"), false);
for (const row of product.hostile_negative_decisions) assert.equal(row.decision, row.expected_decision);
assert.deepEqual(reconcileReasonEvidence({eventVerificationStatus: "DIRECT_PUBLIC_RECORD_VERIFIED"}), {decision: "PUBLISH_REASON_TO_RESEARCH", code: "DIRECT_EVENT_EVIDENCE_PRESENT"});
assert.equal(reconcileReasonEvidence({eventVerificationStatus: "HEADLINE_DERIVED_UNVERIFIED"}).decision, "HOLD_FOR_VERIFICATION");
assert.equal(reconcileReasonEvidence({podcastOnly: true, directProjectRecord: false}).decision, "ABSTAIN");
assert.equal(reconcileReasonEvidence({identityConflict: true}).decision, "REJECT");
assert.equal(browser.count, 0);
assert.deepEqual(browser.reasons, []);

const forbidden = new Set(["contact", "contact_details", "budget", "spend", "purchase_intent", "probability", "deal_stage", "relationship_state", "opportunity_score"]);
const visit = (value) => {
  if (Array.isArray(value)) return value.forEach(visit);
  if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) { assert.equal(forbidden.has(key), false, `forbidden public field: ${key}`); visit(child); }
};
visit(product); visit(browser);
assert.equal(manifest.artifacts[0].sha256, sha256(bytes.output));
assert.equal(manifest.artifacts[1].sha256, sha256(bytes.browser));
assert.deepEqual(manifest.checks.reason_decisions, {total_rows: 45, distinct_declared_keys: 45, duplicate_key_groups: 0, required_null_key_rows: 0});
console.log("PASS NewsV5: 45 transparent HOLD decisions; 0 public reasons; 6 hostile negatives enforced");
