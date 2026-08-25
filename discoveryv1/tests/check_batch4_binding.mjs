import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildDiscoveryLedger } from "../modules/discovery-ledger.mjs";
import { matchDiscoveryMention } from "../modules/matcher-bridge.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/east-pye-discovery.v1.json", import.meta.url)));
const contract = JSON.parse(await readFile(new URL("../contracts/binding.v1.json", import.meta.url)));
const ledger = buildDiscoveryLedger(fixture);

assert.equal(ledger.counts.observations, 2);
assert.equal(ledger.counts.primary_match, 1);
assert.equal(ledger.counts.abstain, 1);
assert.equal(ledger.mentions.length, 2, "abstention must be retained");
const headline = ledger.mentions.find((row) => row.binding_status === "ABSTAIN");
const snippet = ledger.mentions.find((row) => row.binding_status === "PRIMARY_MATCH");
assert.equal(headline.title, contract.regression.headline);
assert.equal(headline.gg_project_id, null);
assert.equal(snippet.repd_ref, "17494");
assert.equal(snippet.gg_project_id, "GG2050-REPD-17494");
assert.notEqual(snippet.repd_ref, "20670");
assert.equal(snippet.binding_evidence.technology, true);
assert.equal(snippet.binding_evidence.credibility_used, false);
assert.equal(snippet.snippet.length <= 300, true);
assert.equal(Object.hasOwn(snippet, "body"), false);

const low = matchDiscoveryMention({ ...fixture.observations[1], credibility: 0.3 }, fixture.projects);
const high = matchDiscoveryMention({ ...fixture.observations[1], credibility: 1 }, fixture.projects);
assert.deepEqual(low, high, "credibility must never gate identity");
const foreign = matchDiscoveryMention({ title: "East Pye solar project in California, USA", snippet: "" }, fixture.projects);
assert.equal(foreign.binding_status, "REJECTED");

console.log("PASS DiscoveryV1 batch 4: headline abstains; identifying snippet binds only GG2050-REPD-17494; credibility cannot change identity");
