import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildDiscrepancyFixtureProof } from "../modules/discrepancy-view.mjs";
import { lincolnPetersen, publicationReadiness, weeklyCoverageReport } from "../../discoveryv1/modules/capture-recapture.mjs";

const fixture = JSON.parse(await readFile(new URL("../fixtures/discrepancy.v1.json", import.meta.url)));
const proof = buildDiscrepancyFixtureProof(fixture);
assert.deepEqual(proof.counts, { rows: 3, consistent: 1, conflicts_with_confirmed: 1, no_confirmed_record: 1 });
assert.equal(proof.rows.every((row) => row.gg_project_id === "GG2050-REPD-17494"), true);
assert.equal(proof.rows.every((row) => row.reported_source.startsWith("https://")), true);
assert.equal(proof.publication_law.allegation_or_person_assessment, false);

assert.deepEqual(lincolnPetersen(10, 12, 8), { estimated_total: 15, recall_a: 0.667, recall_b: 0.8, note: "optimistic two-channel estimate; source dependence requires three-channel log-linear review" });
assert.equal(lincolnPetersen(1, 1, 0).estimated_total, null);
const coverage = weeklyCoverageReport({ week_ending: "2026-08-30", search_index_events: 10, register_events: 12, overlap: 8 });
assert.equal(coverage.alert_threshold, 0.8);
assert.equal(coverage.estimate.estimated_total, 15);

const notCurrent = publicationReadiness({ evaluated_at: "2026-08-25T17:01:00Z", latest_discovered_at: "2026-08-25T16:01:00Z", provider_statuses: [{ provider: "brave", status: "NOT_RUN" }] });
assert.equal(notCurrent.status, "CANDIDATE_NOT_CURRENT");
assert.deepEqual(notCurrent.unavailable_providers, ["brave"]);
assert.equal(notCurrent.empty_result_means_no_mentions, false);
const current = publicationReadiness({ evaluated_at: "2026-08-25T17:01:00Z", latest_discovered_at: "2026-08-25T16:01:00Z", provider_statuses: [{ provider: "brave", status: "LIVE" }] });
assert.equal(current.status, "CURRENT");

console.log("PASS batch 7 product logic: neutral discrepancy states; capture-recapture report; freshness fails closed");
