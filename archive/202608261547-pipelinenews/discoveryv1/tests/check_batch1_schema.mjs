import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const json = async (path) => JSON.parse(await readFile(new URL(path, root)));

const contract = await json("discoveryv1/contracts/release.discoveryv1.json");
const schema = await json("discoveryv1/contracts/discovery-mention.v1.schema.json");
const lineage = await json("reports/202608251701-lineage-scan.json");

assert.equal(contract.release, "discoveryv1");
assert.equal(contract.status, "CANDIDATE");
assert.equal(contract.acceptance.repd_mutation_allowed, false);
assert.equal(contract.acceptance.credibility_may_gate_identity, false);
assert.equal(contract.acceptance.outbound_result_fetch_allowed, false);
assert.equal(contract.acceptance.abstentions_retained, true);
assert.deepEqual(contract.data_law.primary_key, ["mention_id"]);
assert.equal(schema.properties.snippet.maxLength, 300);
assert.equal(schema.properties.credibility.minimum > 0, true);
assert.match(schema.properties.gg_project_id.pattern, /GG2050-REPD/);
assert.equal(schema.allOf.length, 2);
assert.equal(lineage.scan_method, "Git tree and blob identity plus byte length");
assert.equal(lineage.legacy_integrity.versions.V1.git_blob, "e2d99e37d6388d3f498a79696773238ad689574b");
assert.equal(lineage.legacy_integrity.versions.V9.git_tree, "2c30c2df03c68b19e6dd0ca0d51508619eb7c804");
assert.equal(lineage.news_layers.newsv1.files, 48);
assert.equal(lineage.news_layers.newsv7.files, 53);
assert.equal(lineage.timestamp_releases["202608251700-pipelinenews"].files, 3);

console.log("PASS DiscoveryV1 batch 1: schema frozen; abstention representable; V1-V9 and NewsV1-NewsV7 lineage pinned");
