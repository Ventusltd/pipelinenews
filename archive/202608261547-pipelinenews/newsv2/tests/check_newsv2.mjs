import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ARTIFACT_PATH = new URL("../data/material_event_assertions.json", import.meta.url);
const MANIFEST_PATH = new URL("../data/build_manifest.json", import.meta.url);
const BUILDER_PATH = new URL("../scripts/build-material-event-ledger.mjs", import.meta.url);
const SOURCE_PATH = new URL(
  "../../newsv1/dist/major_project_news_v9_5_1.json",
  import.meta.url,
);
const EXPECTED_SOURCE_SHA256 =
  "cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd";
const EXPECTED_EVENT_COUNTS = {
  ACQUISITION: 8,
  CONSENT: 13,
  CONTRACT: 2,
  FINANCIAL_CLOSE: 4,
  PROJECT_UPDATE: 17,
  REFUSAL: 1,
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [artifactBytes, manifestBytes, builderBytes, sourceBytes] = await Promise.all([
  readFile(ARTIFACT_PATH),
  readFile(MANIFEST_PATH),
  readFile(BUILDER_PATH),
  readFile(SOURCE_PATH),
]);
const product = JSON.parse(artifactBytes.toString("utf8"));
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const source = JSON.parse(sourceBytes.toString("utf8"));

assert.equal(product.schema, "pipelinenews.material-event-assertions.v1");
assert.equal(product.release, "newsv2");
assert.equal(product.status, "CANDIDATE");
assert.equal(product.row_count, 45);
assert.equal(product.assertions.length, 45);
assert.equal(source.canonical_items.length, 45);
assert.equal(sha256(sourceBytes), EXPECTED_SOURCE_SHA256);
assert.equal(product.source.sha256, EXPECTED_SOURCE_SHA256);
assert.deepEqual(product.event_counts, EXPECTED_EVENT_COUNTS);
assert.equal(
  product.assertion_payload_sha256,
  sha256(JSON.stringify(product.assertions)),
);
assert.equal(manifest.schema, "pipelinenews.build-manifest.v1");
assert.equal(manifest.artifacts[0].sha256, sha256(artifactBytes));
assert.equal(manifest.artifacts[0].bytes, artifactBytes.byteLength);
assert.equal(manifest.modules[0].sha256, sha256(builderBytes));
assert.deepEqual(manifest.checks, {
  total_rows: 45,
  distinct_declared_keys: 45,
  duplicate_key_groups: 0,
  required_null_key_rows: 0,
  source_order_preserved: true,
  independent_verifier: "newsv2/tests/check_newsv2.mjs",
});

const ids = product.assertions.map(({ assertion_id }) => assertion_id);
assert.equal(new Set(ids).size, ids.length, "assertion IDs must be unique");
assert.deepEqual(
  product.assertions.map(({ article_id }) => article_id),
  source.canonical_items.map(({ gg_article_id }) => gg_article_id),
  "source display order must remain unchanged",
);

const beacon = product.assertions.filter(({ repd_ref }) => repd_ref === "13599");
assert.equal(beacon.length, 1);
assert.equal(beacon[0].project_id, "GG2050-REPD-13599");
assert.equal(beacon[0].event_type, "CONSENT");
assert.equal(beacon[0].identity.role, "PRIMARY_MATCH");
assert.equal(beacon[0].identity.confidence, 91);
assert.equal(
  product.assertions.some(({ repd_ref }) => repd_ref === "13600"),
  false,
  "Beacon Fen BESS sibling must not acquire the solar article",
);

for (const assertion of product.assertions) {
  assert.match(assertion.assertion_id, /^PN-EVT-[A-F0-9]{20}$/);
  assert.equal(assertion.identity.role, "PRIMARY_MATCH");
  assert.equal(assertion.identity.eligible_for_news_signal, true);
  assert.equal(assertion.event_effective_at, null);
  assert.equal(assertion.event_confidence, null);
  assert.equal(
    assertion.claim.verification_status,
    "HEADLINE_DERIVED_UNVERIFIED",
  );
  assert.match(assertion.claim.article_url, /^https:\/\//);
  assert.equal(assertion.decision, "INCLUDE_AS_UNVERIFIED_ASSERTION");
  assert.ok(
    Object.values(assertion.commercial).every((value) => value === null),
    "commercial roles and values must not be inferred",
  );
}

console.log(
  `PASS NewsV2: ${product.row_count} deterministic assertions; Beacon Fen 13599 canary; no inferred commercial roles`,
);
