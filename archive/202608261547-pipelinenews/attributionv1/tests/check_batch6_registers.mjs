import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildRegisterFixtureProof, ingestRegisterRecords } from "../modules/register-ingest.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/register-sources.v1.json", import.meta.url)));
const contract = JSON.parse(await readFile(new URL("../contracts/register-ingest.v1.json", import.meta.url)));
const proof = buildRegisterFixtureProof(fixture);

assert.equal(contract.source_law.official_register_credibility, 1);
assert.equal(contract.source_law.role_must_be_explicit_in_source_record, true);
assert.equal(proof.fixture_only, true);
assert.equal(proof.counts.roles, 4);
assert.equal(proof.counts.confirmed, 4);
assert.equal(proof.counts.organisation_events, 1);
assert.equal(proof.counts.abstentions, 1);
assert.equal(proof.roles.every((row) => row.gg_project_id === "GG2050-REPD-17494"), true);
assert.equal(proof.roles.every((row) => row.claim_status === "CONFIRMED" && row.credibility === 1), true);
const owners = proof.roles.filter((row) => row.role === "OWNER");
assert.equal(owners.length, 2);
assert.equal(new Set(owners.map((row) => row.organisation)).size, 2, "officially conflicting owner records must coexist");
assert.equal(proof.organisation_events[0].event_type, "STATUTORY_NOTICE");
assert.equal(proof.roles.some((row) => row.evidence_kind === "OFFICIAL_STATUTORY_NOTICE"), false, "statutory notice must not invent a delivery role");
assert.equal(proof.publication_law.contradictions_overwritten, false);
assert.throws(() => ingestRegisterRecords([{ ...fixture.records[0], evidence_url: "https://publisher.example/item" }]), /source URL does not match/);

console.log("PASS AttributionV1 batch 6: explicit official-register roles confirmed; gaps abstain; contradictions and statutory events retained without inference");
