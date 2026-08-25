import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const NEWS_PATH = new URL(
  "../../newsv1/dist/major_project_news_v9_5_1.json",
  import.meta.url,
);
const EVENT_PATH = new URL(
  "../../newsv2/data/material_event_assertions.json",
  import.meta.url,
);
const OUTPUT_PATH = new URL("../data/organisation_role_evidence.json", import.meta.url);
const MANIFEST_PATH = new URL("../data/build_manifest.json", import.meta.url);
const BUILDER_PATH = new URL(
  "../scripts/build-organisation-role-evidence.mjs",
  import.meta.url,
);
const CONTRACT_PATH = new URL("../contracts/release.newsv3.json", import.meta.url);

const EXPECTED_NEWS_SHA256 =
  "cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd";
const EXPECTED_EVENT_SHA256 =
  "329ae3cdbecfaa486bfca435100604aae08e2be14f2732ad2da78ad075304e31";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [newsBytes, eventBytes, outputBytes, manifestBytes, builderBytes, contractBytes] =
  await Promise.all([
    readFile(NEWS_PATH),
    readFile(EVENT_PATH),
    readFile(OUTPUT_PATH),
    readFile(MANIFEST_PATH),
    readFile(BUILDER_PATH),
    readFile(CONTRACT_PATH),
  ]);

assert.equal(sha256(newsBytes), EXPECTED_NEWS_SHA256);
assert.equal(sha256(eventBytes), EXPECTED_EVENT_SHA256);

const news = JSON.parse(newsBytes.toString("utf8"));
const events = JSON.parse(eventBytes.toString("utf8"));
const product = JSON.parse(outputBytes.toString("utf8"));
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const contract = JSON.parse(contractBytes.toString("utf8"));

assert.equal(contract.status, "CANDIDATE");
assert.equal(product.schema, "pipelinenews.organisation-role-evidence.v1");
assert.equal(product.release, "newsv3");
assert.equal(product.status, "CANDIDATE");
assert.deepEqual(product.counts, {
  organisation_labels: 28,
  project_operator_role_assertions: 29,
  transaction_role_decisions: 45,
});

const assertKeyLaw = (records, field, pattern) => {
  const keys = records.map((record) => record[field]);
  assert.equal(keys.filter((key) => !key).length, 0);
  assert.equal(new Set(keys).size, records.length);
  for (const key of keys) assert.match(key, pattern);
};

assertKeyLaw(
  product.organisation_labels,
  "organisation_label_id",
  /^PN-ORG-LABEL-[A-F0-9]{20}$/,
);
assertKeyLaw(
  product.project_operator_role_assertions,
  "project_operator_role_assertion_id",
  /^PN-ORG-ROLE-[A-F0-9]{20}$/,
);
assertKeyLaw(
  product.transaction_role_decisions,
  "transaction_role_decision_id",
  /^PN-TXN-ROLE-[A-F0-9]{20}$/,
);

for (const label of product.organisation_labels) {
  assert.equal(label.resolution_status, "UNRESOLVED_SOURCE_LABEL");
  assert.equal(label.entity_resolution_allowed, false);
  assert.ok(label.source_labels.length >= 1);
}

const composite = product.organisation_labels.filter(
  ({ normalised_label }) => normalised_label === "Firma Energy / IB Vogt",
);
assert.equal(composite.length, 1);
assert.equal(composite[0].composite_label_hint, true);
assert.deepEqual(composite[0].source_labels, ["Firma Energy / IB Vogt"]);
assert.equal(
  product.organisation_labels.some(
    ({ normalised_label }) =>
      normalised_label === "Firma Energy" || normalised_label === "IB Vogt",
  ),
  false,
  "composite operator labels must not be split",
);

const sourceProjects = new Set(news.canonical_items.map(({ gg_project_id }) => gg_project_id));
assert.equal(sourceProjects.size, 29);
for (const role of product.project_operator_role_assertions) {
  assert.equal(role.role_type, "REPD_PROJECT_OPERATOR_LABEL");
  assert.equal(role.claim_class, "SOURCE_CLAIM");
  assert.equal(role.verification_status, "DIRECT_SOURCE_FIELD");
  assert.ok(sourceProjects.has(role.project_id));
  assert.ok(role.supporting_article_ids.length >= 1);
}

const beaconRoles = product.project_operator_role_assertions.filter(
  ({ repd_ref }) => repd_ref === "13599",
);
assert.equal(beaconRoles.length, 1);
assert.equal(beaconRoles[0].project_id, "GG2050-REPD-13599");
assert.equal(beaconRoles[0].source_label, "Low Carbon Limited");
assert.equal(
  product.project_operator_role_assertions.some(({ repd_ref }) => repd_ref === "13600"),
  false,
);

assert.deepEqual(
  product.transaction_role_decisions.map(({ event_assertion_id }) => event_assertion_id),
  events.assertions.map(({ assertion_id }) => assertion_id),
  "transaction-role decisions must reconcile to NewsV2 source order",
);
for (const decision of product.transaction_role_decisions) {
  assert.equal(decision.decision, "ABSTAIN_NO_DIRECT_ROLE_EVIDENCE");
  assert.equal(decision.claim_class, "ABSTAIN");
  assert.ok(Object.values(decision.roles).every((value) => value === null));
}
assert.equal(
  product.transaction_role_decisions.some(({ repd_ref }) => repd_ref === "13600"),
  false,
);

assert.equal(manifest.schema, "pipelinenews.build-manifest.v1");
assert.equal(manifest.status, "CANDIDATE");
assert.equal(manifest.artifacts[0].sha256, sha256(outputBytes));
assert.equal(manifest.artifacts[0].bytes, outputBytes.byteLength);
assert.equal(manifest.modules[0].sha256, sha256(builderBytes));
assert.equal(manifest.inputs[0].sha256, sha256(newsBytes));
assert.equal(manifest.inputs[1].sha256, sha256(eventBytes));
assert.equal(manifest.inputs[2].sha256, sha256(contractBytes));

for (const [dataset, expected] of Object.entries({
  organisation_labels: 28,
  project_operator_role_assertions: 29,
  transaction_role_decisions: 45,
})) {
  assert.deepEqual(manifest.checks[dataset], {
    total_rows: expected,
    distinct_declared_keys: expected,
    duplicate_key_groups: 0,
    required_null_key_rows: 0,
  });
}
assert.equal(manifest.checks.independent_verifier, "newsv3/tests/check_newsv3.mjs");

console.log(
  "PASS NewsV3: 28 unresolved labels; 29 project/operator source claims; 45 transaction-role abstentions",
);
