import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { appendAttributions, buildChargeFixtureProof, normaliseAttribution } from "../modules/attribution-ledger.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/charges.v1.json", import.meta.url)));
const contract = JSON.parse(await readFile(new URL("../contracts/release.attributionv1.json", import.meta.url)));
const proof = buildChargeFixtureProof(fixture);

assert.equal(contract.feature, "organisational delivery attribution for UK renewable infrastructure");
assert.equal(contract.acceptance.person_key_allowed, false);
assert.equal(contract.acceptance.contradicting_claims_coexist, true);
assert.equal(contract.acceptance.financial_close_inferred_from_charge_alone, false);
assert.equal(proof.fixture_only, true);
assert.equal(proof.counts.roles, 1);
assert.equal(proof.roles[0].role, "LENDER");
assert.equal(proof.roles[0].claim_status, "CONFIRMED");
assert.equal(proof.roles[0].gg_project_id, "GG2050-REPD-17494");
assert.equal(proof.interpretation.financial_close_inferred_from_charge_alone, false);

const reported = normaliseAttribution({ ...proof.roles[0], attribution_id: undefined, organisation: "Fixture Alternative Finance Limited", credibility: 0.3, claim_status: "REPORTED", evidence_url: "https://publisher.example/report", evidence_kind: "INDEXED_SNIPPET" });
const together = appendAttributions(proof.roles, [reported]);
assert.equal(together.length, 2, "contradicting organisations must coexist");
assert.equal(new Set(together.map((row) => row.organisation)).size, 2);
assert.throws(() => normaliseAttribution({ ...reported, person_name: "forbidden" }), /person-keyed field forbidden/);
assert.throws(() => normaliseAttribution({ ...reported, credibility: 0.3, claim_status: "CONFIRMED" }), /tier-one or tier-two/);
assert.equal(Object.keys(proof.roles[0]).some((key) => /person|individual/iu.test(key)), false);

console.log("PASS AttributionV1 batch 5: organisation-only roles; official charge evidence; contradictions coexist; no financial-close overreach");
