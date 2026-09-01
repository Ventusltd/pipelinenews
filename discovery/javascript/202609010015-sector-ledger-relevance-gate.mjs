#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ACTIVE_SECTOR_TOPICS, classifySectorTopic } from "./202609010015-sector-topic-evidence.mjs";

const LEDGER_SCHEMA = "pipelinenews.sector-intelligence-ledger.v3";
const EXPLICIT_SOURCE_TOPICS = new Map([
  ["DATA_CENTRES_OWNER_EXPORT", { topic: "DATA_CENTRES", rule: "PINNED_OWNER_EXPORT" }],
  ["FROZEN_GENERIC_DATA_CENTRE_NEWS", { topic: "DATA_CENTRES", rule: "FROZEN_DATA_CENTRE_HEADLINE" }],
  ["FCC_CURRENT_COVERED_LIST", { topic: "INVERTER_SECURITY_POLICY", rule: "STATIC_REGULATOR_REFERENCE" }],
  ["NATIONAL_GRID_GREAT_GRID_UPGRADE", { topic: "GREAT_GRID_UPGRADE", rule: "STATIC_NETWORK_OWNER_REFERENCE" }],
]);
const WITHDRAWN_SOURCES = new Set(["GOVUK_HORMUZ_ENERGY", "GOVUK_UKRAINE_ENERGY"]);

export function sectorTopicDecision(item) {
  if (WITHDRAWN_SOURCES.has(item.source_id)) return null;
  return EXPLICIT_SOURCE_TOPICS.get(item.source_id) || classifySectorTopic(item);
}

export function gateSectorLedger(input) {
  assert.equal(input.schema, LEDGER_SCHEMA);
  const itemDataset = input.datasets?.sector_items;
  const topicDataset = input.datasets?.sector_item_topics;
  const bindingDataset = input.datasets?.sector_project_bindings;
  assert.ok(Array.isArray(itemDataset?.rows));
  assert.ok(Array.isArray(topicDataset?.rows));
  assert.ok(Array.isArray(bindingDataset?.rows));

  const rankByTopic = new Map();
  for (const row of topicDataset.rows) {
    if (!rankByTopic.has(row.topic_code)) rankByTopic.set(row.topic_code, row.display_rank);
  }
  for (const topic of ACTIVE_SECTOR_TOPICS) assert.ok(rankByTopic.has(topic), `ledger lacks rank for ${topic}`);

  const accepted = [];
  const rejected = [];
  const topics = [];
  for (const item of itemDataset.rows) {
    const match = sectorTopicDecision(item);
    if (!match) {
      rejected.push(item);
      continue;
    }
    assert.ok(ACTIVE_SECTOR_TOPICS.includes(match.topic));
    accepted.push(item);
    topics.push({
      intelligence_item_id: item.intelligence_item_id,
      topic_code: match.topic,
      generation: item.generation,
      assignment_basis: `AFFIRMATIVE_ITEM_EVIDENCE:${match.rule}`,
      display_rank: rankByTopic.get(match.topic),
      eligible_for_news_signal: false,
    });
  }

  accepted.sort((left, right) => left.intelligence_item_id.localeCompare(right.intelligence_item_id));
  topics.sort((left, right) => left.intelligence_item_id.localeCompare(right.intelligence_item_id)
    || left.topic_code.localeCompare(right.topic_code));
  const acceptedIds = new Set(accepted.map(({ intelligence_item_id }) => intelligence_item_id));
  assert.equal(accepted.length, acceptedIds.size);
  assert.ok(topics.every(({ intelligence_item_id }) => acceptedIds.has(intelligence_item_id)));
  assert.ok(topics.every(({ topic_code }) => ACTIVE_SECTOR_TOPICS.includes(topic_code)));

  const retainedBySource = Map.groupBy(accepted, ({ source_id }) => source_id);
  const sourceStatuses = input.source_statuses.map((status) => ({
    ...status,
    retained_items: retainedBySource.get(status.source_id)?.length || 0,
  }));

  return {
    ...input,
    datasets: {
      ...input.datasets,
      sector_items: { ...itemDataset, rows: accepted },
      sector_item_topics: { ...topicDataset, rows: topics },
      sector_project_bindings: {
        ...bindingDataset,
        rows: bindingDataset.rows.filter(({ intelligence_item_id }) => acceptedIds.has(intelligence_item_id)),
      },
    },
    source_statuses: sourceStatuses,
    policy_evidence: {
      ...input.policy_evidence,
      topic_relevance_gate: {
        generation: "202609010015",
        basis: "AFFIRMATIVE_ITEM_LOCAL_TITLE_OR_SUMMARY_EVIDENCE",
        active_topics: [...ACTIVE_SECTOR_TOPICS],
        candidates: itemDataset.rows.length,
        retained: accepted.length,
        rejected: rejected.length,
        withdrawn_sources: [...WITHDRAWN_SOURCES].sort(),
      },
    },
  };
}

function argumentsFrom(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    assert.ok(argv[index]?.startsWith("--") && argv[index + 1], `invalid argument near ${argv[index]}`);
    result[argv[index].slice(2)] = argv[index + 1];
  }
  for (const required of ["input", "output"]) assert.ok(result[required], `--${required} is required`);
  return result;
}

async function main() {
  const options = argumentsFrom(process.argv.slice(2));
  const gated = gateSectorLedger(JSON.parse(await readFile(options.input, "utf8")));
  const output = path.resolve(options.output);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(gated, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    status: "PASS",
    candidates: gated.policy_evidence.topic_relevance_gate.candidates,
    retained: gated.policy_evidence.topic_relevance_gate.retained,
    rejected: gated.policy_evidence.topic_relevance_gate.rejected,
    active_topics: gated.policy_evidence.topic_relevance_gate.active_topics,
  })}\n`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
