import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { priority, queryForms, selectDailyCandidates, siteRestrictedQueries } from "../modules/query-planner.mjs";
import { assertAllowedFetchTarget, buildSearchRequest, endpoints, executeSearch, isRestrictedHost } from "../modules/search-adapters.mjs";

const contract = JSON.parse(await readFile(new URL("../contracts/search-adapters.v1.json", import.meta.url)));
assert.deepEqual(contract.providers, ["brave", "google_cse", "serper"]);
assert.equal(contract.fetch_policy.outbound_result_page_fetch, false);
assert.equal(contract.maximum_days_without_query, 30);

const eastPye = { repd_ref: "17494", name: "East Pye Solar Farm", operator: "Island Green Power", lifecycle: "LIVE_PRE_CONSTRUCTION", capacity_mw: 500, days_since_last_query: 31, days_since_last_hit: 1, hits_all_time: 2 };
assert.deepEqual(queryForms(eastPye.name, eastPye.operator), ['"East Pye solar"', '"East Pye" "Island Green Power"']);
assert.equal(siteRestrictedQueries(eastPye, "professional-network.example")[0], '"East Pye solar" site:professional-network.example');
assert.equal(priority(eastPye) > 0.5, true);

const corpus = Array.from({ length: 7680 }, (_, index) => ({
  repd_ref: String(index + 1),
  name: `Project ${index + 1} Solar Farm`,
  operator: null,
  lifecycle: index % 5 === 0 ? "UNDER_CONSTRUCTION" : index % 5 === 1 ? "LIVE_PRE_CONSTRUCTION" : index % 5 === 2 ? "OPERATIONAL" : index % 5 === 3 ? "INACTIVE" : "UNKNOWN",
  capacity_mw: (index % 1000) + 1,
  days_since_last_query: null,
  days_since_last_hit: null,
  hits_all_time: 0,
}));
const seen = new Set();
for (let day = 0; day < 30; day += 1) {
  const selected = selectDailyCandidates(corpus, 400, { maximumDaysWithoutQuery: 30 });
  for (const row of corpus) {
    if (selected.some((item) => item.repd_ref === row.repd_ref)) {
      row.days_since_last_query = 0;
      seen.add(row.repd_ref);
    } else if (row.days_since_last_query !== null) row.days_since_last_query += 1;
  }
}
assert.equal(seen.size, 7680, "full corpus must not starve");

for (const endpoint of Object.values(endpoints)) assert.doesNotThrow(() => assertAllowedFetchTarget(endpoint));
const restrictedFixture = ["link", "edin.com"].join("");
assert.equal(isRestrictedHost(restrictedFixture), true);
assert.equal(isRestrictedHost(`news.${restrictedFixture}`), true);
assert.throws(() => assertAllowedFetchTarget(`https://${restrictedFixture}/posts/example`), /forbidden/);
assert.throws(() => assertAllowedFetchTarget("https://example.com/article"), /not a configured/);
assert.throws(() => buildSearchRequest({ provider: "brave", query: "test" }), /credentials unavailable/);

let requested;
const fakeFetch = async (url, options) => {
  requested = { url, options };
  return { ok: true, status: 200, json: async () => ({ web: { results: [{ title: "Result", url: "https://publisher.example/item", description: "x".repeat(500) }] } }) };
};
const results = await executeSearch({ fetchImpl: fakeFetch, provider: "brave", query: '"East Pye"', credentials: { apiKey: "fixture" } });
assert.equal(requested.options.redirect, "error");
assert.match(requested.url, /^https:\/\/api\.search\.brave\.com\//u);
assert.equal(results[0].snippet.length, 300);
assert.equal(results[0].url, "https://publisher.example/item");

console.log("PASS DiscoveryV1 batch 2: deterministic priority queue; 30-day starvation guard; search-API-only adapters");
