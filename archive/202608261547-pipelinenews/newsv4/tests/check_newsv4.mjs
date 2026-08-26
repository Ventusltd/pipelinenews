import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const paths = {
  input: new URL("../inputs/source_health_observations.v1.json", import.meta.url),
  contract: new URL("../contracts/release.newsv4.json", import.meta.url),
  output: new URL("../data/source_health_context.json", import.meta.url),
  manifest: new URL("../data/build_manifest.json", import.meta.url),
  builder: new URL("../scripts/build-source-health-context.mjs", import.meta.url)
};
const bytes = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readFile(path)])));
const json = (key) => JSON.parse(bytes[key]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const input = json("input"), contract = json("contract"), product = json("output"), manifest = json("manifest");

assert.equal(sha256(bytes.input), contract.inputs[0].sha256);
assert.equal(input.evaluated_at, contract.data_law.evaluated_at);
assert.equal(product.schema, "pipelinenews.source-health-context.v1");
assert.equal(product.release, "newsv4");
assert.equal(product.status, "CANDIDATE");
assert.equal(product.counts.rows, 6);
assert.deepEqual(product.counts.status, { CURRENT: 0, STALE: 1, DEGRADED: 4, UNAVAILABLE: 1 });
assert.deepEqual(product.counts.freshness, { CURRENT: 0, STALE: 5, UNKNOWN: 1 });

const keys = product.decisions.map((row) => row.source_health_decision_id);
assert.equal(keys.filter((key) => !key).length, 0);
assert.equal(new Set(keys).size, 6);
for (const key of keys) assert.match(key, /^PN-SOURCE-HEALTH-[A-F0-9]{20}$/);
const byId = Object.fromEntries(product.decisions.map((row) => [row.source_product_id, row]));
assert.equal(byId.ELEXON_FUELINST_V6_SNAPSHOT.status, "STALE");
assert.deepEqual(byId.ELEXON_FUELINST_V6_SNAPSHOT.source_record_key, ["periodStartUTC", "fuelType"]);
for (const id of ["ELEXON_MARKET_INDEX_PRICE_V6_SNAPSHOT", "NESO_CARBON_INTENSITY_V6_SNAPSHOT", "PVLIVE_SOLAR_V6_SNAPSHOT", "GRID_FREQUENCY_V6_HEURISTIC"]) {
  assert.equal(byId[id].status, "DEGRADED");
  assert.equal(byId[id].freshness_state, "STALE");
  assert.ok(byId[id].blocking_issues.length > 0);
}
assert.equal(byId.OFFICIAL_GRID_CONSTRAINT_FEED_GAP.status, "UNAVAILABLE");
assert.equal(byId.OFFICIAL_GRID_CONSTRAINT_FEED_GAP.freshness_state, "UNKNOWN");
assert.equal(byId.OFFICIAL_GRID_CONSTRAINT_FEED_GAP.grid_constraint_assertion_allowed, undefined);
for (const row of product.decisions) {
  assert.deepEqual(row.protections, {
    context_only: true,
    project_identity_allowed: false,
    project_binding_allowed: false,
    event_verification_allowed: false,
    grid_constraint_assertion_allowed: false,
    deal_scoring_allowed: false
  });
  if (row.source_owner) assert.ok(row.source_page_url);
  assert.equal(row.provisional, true);
}
assert.equal(manifest.artifacts[0].sha256, sha256(bytes.output));
assert.equal(manifest.artifacts[0].bytes, bytes.output.byteLength);
assert.equal(manifest.modules[0].sha256, sha256(bytes.builder));
assert.equal(manifest.inputs[0].sha256, sha256(bytes.input));
assert.equal(manifest.inputs[1].sha256, sha256(bytes.contract));
assert.deepEqual(manifest.checks.source_health_context, { total_rows: 6, distinct_declared_keys: 6, duplicate_key_groups: 0, required_null_key_rows: 0 });
console.log("PASS NewsV4: 6 decisions; CURRENT 0 / STALE 1 / DEGRADED 4 / UNAVAILABLE 1; context-only protections enforced");
