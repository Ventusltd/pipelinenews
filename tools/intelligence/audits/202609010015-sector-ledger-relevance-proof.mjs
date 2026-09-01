#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { collectSectorIntelligence } from "../../../discovery/javascript/202608272130-sector-intelligence-runner.mjs";
import {
  ACTIVE_SECTOR_TOPICS,
  classifySectorTopic,
} from "../../../discovery/javascript/202609010015-sector-topic-evidence.mjs";
import {
  gateSectorLedger,
  sectorTopicDecision,
} from "../../../discovery/javascript/202609010015-sector-ledger-relevance-gate.mjs";

const contract = JSON.parse(await readFile("data/news-discovery/202608272130-sector-intelligence-contract.json", "utf8"));
const fixture = JSON.parse(await readFile("discovery/fixtures/202608272130-sector-intelligence-rss.json", "utf8"));
fixture.responses.GOVUK_INVERTER_SECURITY.body.results[0].title = "Connected solar inverter security policy update";

const ledger = await collectSectorIntelligence({
  contract,
  genericNewsPath: "releases/data/202608271524-fd2212a8c76d-v8-fast-news.json",
  fixture,
  collectionAnchorAt: fixture.collection_anchor_at,
  collectionAnchorBasis: fixture.collection_anchor_basis,
});
assert.equal(ledger.datasets.sector_items.rows.length, 19);
const rawLedger = JSON.stringify(ledger);
const gated = gateSectorLedger(ledger);
assert.equal(JSON.stringify(ledger), rawLedger, "gate mutated the collector receipt in place");
assert.deepEqual(gateSectorLedger(ledger), gated, "gate is not deterministic");
const retainedIds = new Set(gated.datasets.sector_items.rows.map(({ intelligence_item_id }) => intelligence_item_id));
const rejectedFixture = ledger.datasets.sector_items.rows
  .filter(({ intelligence_item_id }) => !retainedIds.has(intelligence_item_id))
  .map(({ source_id, title }) => ({ source_id, title }));
assert.equal(gated.datasets.sector_items.rows.length, 17, JSON.stringify(rejectedFixture));
assert.equal(gated.datasets.sector_item_topics.rows.length, 17);
assert.deepEqual(gated.datasets.sector_project_bindings.rows, []);
assert.ok(gated.datasets.sector_item_topics.rows.every(({ topic_code }) => ACTIVE_SECTOR_TOPICS.includes(topic_code)));
assert.ok(gated.datasets.sector_item_topics.rows.every(({ assignment_basis }) => assignment_basis.startsWith("AFFIRMATIVE_ITEM_EVIDENCE:")));
assert.ok(gated.source_statuses.every((row) => Object.keys(row).sort().join("|")
  === "content_type|error_code|requested|response_bytes|response_sha256|result|retained_items|source_id"));
for (const sourceId of ["GOVUK_HORMUZ_ENERGY", "GOVUK_UKRAINE_ENERGY"]) {
  assert.equal(gated.datasets.sector_items.rows.some(({ source_id }) => source_id === sourceId), false);
  assert.equal(gated.source_statuses.find(({ source_id }) => source_id === sourceId).retained_items, 0);
}

const cases = [
  ["More data centres approved for west London", "DATA_CENTRES"],
  ["Solar inverter cybersecurity regulation enters consultation", "INVERTER_SECURITY_POLICY"],
  ["Electricity transmission network upgrade programme", "GREAT_GRID_UPGRADE"],
  ["Worldwide solar capacity growth reaches record high", "WORLDWIDE_PV"],
  ["Power transformer high-voltage cable supply chain", "MV_HV_COMPONENTS"],
  ["Notorious Kidlington dump fully cleared", null],
  ["Biometrics and Surveillance Camera Commissioner FOI responses", null],
  ["Retail sales forecast for 2027", null],
  ["The economic benefits of touring and impact of EU exit", null],
  ["Schools funding announcement", null],
  ["Electricity update", null],
  ["Security policy update", null],
];
for (const [title, expected] of cases) {
  assert.equal(classifySectorTopic({ title })?.topic || null, expected, title);
}

const browser = JSON.parse(await readFile(
  "releases/202608312114-pipelinenews/data/202608272130-sector-intelligence.json",
  "utf8",
));
const rows = browser.rows.map((row) => Object.fromEntries(browser.fields.map((field, index) => [field, row[index]])));
const decisions = rows.map((row) => ({ row, match: sectorTopicDecision(row) }));
const accepted = decisions.filter(({ match }) => match);
const rejected = decisions.filter(({ match }) => !match);
const reassigned = accepted.filter(({ row, match }) => row.topic_code !== match.topic);
assert.equal(rows.length, 51);
assert.equal(accepted.length, 12);
assert.equal(rejected.length, 39);
assert.equal(reassigned.length, 1);
assert.ok(rejected.some(({ row }) => /Kidlington dump/iu.test(row.title)));
assert.ok(rejected.some(({ row }) => /Biometrics and Surveillance/iu.test(row.title)));
assert.ok(reassigned.some(({ row, match }) => /surge in solar energy/iu.test(row.title)
  && match.topic === "WORLDWIDE_PV"));

process.stdout.write(`${JSON.stringify({
  status: "PASS",
  synthetic_collector_candidates: ledger.datasets.sector_items.rows.length,
  synthetic_pre_parquet_retained: gated.datasets.sector_items.rows.length,
  active_topics: ACTIVE_SECTOR_TOPICS,
  inspected_real_rows: rows.length,
  real_rows_retained: accepted.length,
  real_rows_rejected: rejected.length,
  real_rows_reassigned: reassigned.length,
  diseased_examples_rejected: cases.filter(([, expected]) => expected === null).length,
}, null, 2)}\n`);
