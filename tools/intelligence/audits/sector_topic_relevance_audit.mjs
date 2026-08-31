#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const release = process.argv[2] || "releases/202608312114-pipelinenews";
const file = path.join(release, "data", "202608272130-sector-intelligence.json");
const payload = JSON.parse(await readFile(file, "utf8"));
assert.equal(payload.schema, "pipelinenews.sector-intelligence-browser.v3");

const rows = payload.rows.map((row) => Object.fromEntries(
  payload.fields.map((field, index) => [field, row[index]]),
));

const normal = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[^a-z0-9+/. -]+/giu, " ")
  .replace(/\s+/gu, " ")
  .trim()
  .toLocaleLowerCase("en-GB");

const contains = (text, pattern) => pattern.test(text);
const topicRule = (row) => {
  const text = normal(`${row.title || ""} ${row.summary || ""}`);

  // Pinned owner context is an explicit federation contract, not a search hit.
  if (row.source_id === "DATA_CENTRES_OWNER_EXPORT") {
    return { topic: "DATA_CENTRES", rule: "PINNED_OWNER_EXPORT" };
  }
  if (contains(text, /\bdata cent(?:re|er)s?\b/u)) {
    return { topic: "DATA_CENTRES", rule: "DATA_CENTRE_EXPLICIT" };
  }

  if (contains(text, /\b(inverter|pv|pcs|power conversion)\b/u)
      && contains(text, /\b(cyber|security|vulnerab\w*|covered list|ban\w*|regulat\w*)\b/u)) {
    return { topic: "INVERTER_SECURITY_POLICY", rule: "INVERTER_AND_SECURITY" };
  }

  if (contains(text, /\bgreat grid upgrade\b/u)
      || (contains(text, /\b(grid|electricity|transmission|substation|interconnector)\b/u)
          && contains(text, /\b(upgrade|network|investment|connection)\b/u))) {
    return { topic: "GREAT_GRID_UPGRADE", rule: "GRID_ASSET_AND_PROGRAMME" };
  }

  if (contains(text, /\b(solar|photovoltaic|pv|module|inverter)\b/u)
      && contains(text, /\b(deployment|capacity|installation\w*|market|manufactur\w*|supply chain|policy|surge|growth|record high\w*)\b/u)) {
    return { topic: "WORLDWIDE_PV", rule: "PV_AND_DEPLOYMENT" };
  }

  if (contains(text, /\b(transformer|switchgear|circuit breaker|cable|conductor|substation|busbar|insulator|gis|hvdc)\b/u)
      && contains(text, /\b(grid|voltage|procurement|manufactur\w*|outage|supply chain)\b/u)) {
    return { topic: "MV_HV_COMPONENTS", rule: "COMPONENT_AND_ENGINEERING" };
  }

  // The current UI's named geopolitical topics are withdrawn. A future neutral
  // energy-supply/logistics topic needs its own positive engineering rule.
  return null;
};

const decisions = rows.map((row) => ({ row, match: topicRule(row) }));
const accepted = decisions.filter(({ match }) => match);
const rejected = decisions.filter(({ match }) => !match);
const misfiled = accepted.filter(({ row, match }) => row.topic_code !== match.topic);
const exact = accepted.filter(({ row, match }) => row.topic_code === match.topic);

const duplicateUrls = Object.entries(Object.groupBy(
  rows.filter(({ item_kind }) => item_kind === "SOURCE_METADATA"),
  ({ canonical_url }) => canonical_url,
)).filter(([, values]) => values.length > 1);

const report = {
  schema: "pipelinenews.sector-topic-relevance-audit.v1",
  release,
  payload_generation: payload.generation,
  rows: rows.length,
  exact_topic_rows: exact.length,
  reassignable_rows: misfiled.length,
  rejected_rows: rejected.length,
  displayable_after_reassignment: accepted.length,
  source_metadata_duplicate_url_groups: duplicateUrls.length,
  rejected: rejected.map(({ row }) => ({
    topic: row.topic_code,
    source: row.source_id,
    title: row.title,
  })),
  reassign: misfiled.map(({ row, match }) => ({
    from: row.topic_code,
    to: match.topic,
    rule: match.rule,
    title: row.title,
  })),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

const requireClean = process.argv.includes("--require-clean");
if (requireClean) {
  assert.equal(rejected.length, 0, "sector payload still contains rows without affirmative topic evidence");
  assert.equal(misfiled.length, 0, "sector payload still contains rows assigned to the wrong topic");
} else {
  // Current measured acceptance envelope: 11 correctly filed rows plus one EC
  // solar story that belongs under WORLDWIDE_PV. Baseline mode attests exactly
  // what was inspected in the 51-row release; clean mode above is reusable for
  // a future collector whose row count must not be frozen to today's payload.
  assert.equal(rows.length, 51);
  assert.equal(exact.length, 11);
  assert.equal(misfiled.length, 1);
  assert.equal(accepted.length, 12);
  assert.equal(rejected.length, 39);
  assert.equal(rejected.filter(({ row }) => row.source_id.startsWith("GOVUK_")).length, 35);
  assert.ok(rejected.some(({ row }) => /Kidlington dump/iu.test(row.title)));
  assert.ok(rejected.some(({ row }) => /Biometrics and Surveillance/iu.test(row.title)));
  assert.ok(misfiled.some(({ row, match }) => /surge in solar energy/iu.test(row.title)
    && match.topic === "WORLDWIDE_PV"));
}
