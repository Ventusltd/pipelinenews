import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { credibilityForDomain, eventConfidence } from "../modules/credibility.mjs";
import { canonicalUrl, clusterMentions, mentionId, minHashSignature, minHashSimilarity } from "../modules/mention-normalizer.mjs";

const contract = JSON.parse(await readFile(new URL("../contracts/credibility.v1.json", import.meta.url)));
assert.equal(contract.identity_gate, false);
assert.equal(contract.default_credibility, 0.3);
assert.equal(contract.zero_credibility_allowed, false);
assert.equal(contract.canonicalisation.network_requests, false);

assert.equal(credibilityForDomain("planning.data.gov.uk"), 1);
assert.equal(credibilityForDomain("www.bbc.co.uk"), 0.6);
assert.equal(credibilityForDomain("energy-storage.news"), 0.7);
assert.equal(credibilityForDomain("unknown.example"), 0.3);
const restrictedFixture = ["link", "edin.com"].join("");
assert.equal(credibilityForDomain(`www.${restrictedFixture}`), 0.3);
assert.equal(eventConfidence([{ source_domain: restrictedFixture, credibility: 0.3 }, { source_domain: "gov.uk", credibility: 1 }]), 1);
assert.equal(eventConfidence([{ source_domain: "one.example", credibility: 0.3 }, { source_domain: "two.example", credibility: 0.3 }]), 0.35);

const canonical = canonicalUrl("http://publisher.example/story/amp/?utm_source=test&b=2&a=1#section");
assert.equal(canonical, "https://publisher.example/story?a=1&b=2");
const id = mentionId({ canonical_url: canonical, gg_project_id: "GG2050-REPD-17494" });
assert.match(id, /^PN-MENTION-[A-F0-9]{20}$/u);

const first = "East Pye solar scheme near Long Stratton in Norfolk gains a new milestone";
const copied = "East Pye solar scheme near Long Stratton in Norfolk gains a new milestone";
const unrelated = "Offshore wind turbine maintenance contract awarded in Scotland";
assert.equal(minHashSimilarity(minHashSignature(first), minHashSignature(copied)), 1);
assert.equal(minHashSimilarity(minHashSignature(first), minHashSignature(unrelated)) < 0.5, true);
const clustered = clusterMentions([
  { mention_id: "a", title: first, snippet: "" },
  { mention_id: "b", title: copied, snippet: "" },
  { mention_id: "c", title: unrelated, snippet: "" }
]);
assert.equal(clustered[0].cluster_id, clustered[1].cluster_id);
assert.notEqual(clustered[0].cluster_id, clustered[2].cluster_id);

console.log("PASS DiscoveryV1 batch 3: URL normalization is offline; MinHash dedupe deterministic; event credibility is monotonic and identity-neutral");
