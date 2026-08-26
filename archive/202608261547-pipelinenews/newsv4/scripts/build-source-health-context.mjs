import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const INPUT = new URL("../inputs/source_health_observations.v1.json", import.meta.url);
const CONTRACT = new URL("../contracts/release.newsv4.json", import.meta.url);
const OUTPUT = new URL("../data/source_health_context.json", import.meta.url);
const MANIFEST = new URL("../data/build_manifest.json", import.meta.url);
const EXPECTED_INPUT_SHA256 = "4c085bbc75c48de53e845c5152cfb105dac7349878177ee9a284a243ee457b1a";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [inputBytes, contractBytes, builderBytes] = await Promise.all([
  readFile(INPUT), readFile(CONTRACT), readFile(new URL(import.meta.url)),
]);
if (sha256(inputBytes) !== EXPECTED_INPUT_SHA256) throw new Error("NewsV4 input hash mismatch");
const input = JSON.parse(inputBytes);
const evaluatedAtMs = Date.parse(input.evaluated_at);

const rows = input.observations.map((source) => {
  const sourceMs = source.source_updated_at ? Date.parse(source.source_updated_at) : null;
  const ageSeconds = sourceMs === null ? null : Math.floor((evaluatedAtMs - sourceMs) / 1000);
  const freshUntil = sourceMs === null || source.freshness_sla_seconds === null
    ? null
    : new Date(sourceMs + source.freshness_sla_seconds * 1000).toISOString();
  const freshnessState = sourceMs === null || source.freshness_sla_seconds === null
    ? "UNKNOWN"
    : ageSeconds > source.freshness_sla_seconds ? "STALE" : "CURRENT";
  const unavailable = source.fetch_status === "NO_SOURCE_CONFIGURED" || sourceMs === null;
  const degraded = source.blocking_issues.length > 0 || source.licence.status !== "RECORDED" || !source.source_record_key;
  const status = unavailable ? "UNAVAILABLE" : degraded ? "DEGRADED" : freshnessState;
  const sourceHealthDecisionId = `PN-SOURCE-HEALTH-${sha256(`${source.source_product_id}|source-health.v1`).slice(0, 20).toUpperCase()}`;
  return {
    source_health_decision_id: sourceHealthDecisionId,
    source_product_id: source.source_product_id,
    domain: source.domain,
    status,
    freshness_state: freshnessState,
    evaluated_at: input.evaluated_at,
    source_updated_at: source.source_updated_at,
    freshness_sla_seconds: source.freshness_sla_seconds,
    fresh_until: freshUntil,
    age_seconds: ageSeconds,
    source_owner: source.source_owner,
    authoritative_tier: source.authoritative_tier,
    source_page_url: source.source_page_url,
    source_record_url: source.source_record_url,
    observation_artifact_url: source.observation_artifact_url,
    licence: source.licence,
    adapter_id: source.adapter_id,
    adapter_version: source.adapter_version,
    schema_version: source.schema_version,
    scheduler: source.scheduler,
    fetch_status: source.fetch_status,
    attempt_count: source.attempt_count,
    raw_sha256: source.raw_sha256,
    prior_raw_sha256: source.prior_raw_sha256,
    record_count: source.record_count,
    distinct_key_count: source.distinct_key_count,
    null_key_count: source.null_key_count,
    duplicate_groups: source.duplicate_groups,
    source_record_key: source.source_record_key,
    provisional: source.provisional,
    evidence_class: source.evidence_class,
    blocking_issues: source.blocking_issues,
    metadata_gaps: source.metadata_gaps,
    last_known_good_commit: source.last_known_good_commit,
    decision_reason: unavailable
      ? "No configured and provenance-proven source snapshot exists."
      : degraded
        ? "Blocking provenance, semantic, key, adapter or licence defects override freshness."
        : freshnessState === "STALE"
          ? "The last-known snapshot is older than its declared freshness SLA."
          : "The source metadata passes the declared checks within its freshness SLA.",
    protections: {
      context_only: true,
      project_identity_allowed: false,
      project_binding_allowed: false,
      event_verification_allowed: false,
      grid_constraint_assertion_allowed: false,
      deal_scoring_allowed: false
    }
  };
}).sort((a, b) => a.source_product_id.localeCompare(b.source_product_id));

const counts = (field, values) => Object.fromEntries(values.map((value) => [value, rows.filter((row) => row[field] === value).length]));
const product = {
  schema: "pipelinenews.source-health-context.v1",
  release: "newsv4",
  status: "CANDIDATE",
  generated_at: input.evaluated_at,
  source_usage: "AUDITED_METADATA_ONLY_NO_MARKET_VALUES",
  grain: "one row per audited source product or explicit source gap",
  primary_key: ["source_health_decision_id"],
  counts: {
    rows: rows.length,
    status: counts("status", ["CURRENT", "STALE", "DEGRADED", "UNAVAILABLE"]),
    freshness: counts("freshness_state", ["CURRENT", "STALE", "UNKNOWN"])
  },
  decisions: rows
};
const outputBytes = Buffer.from(`${JSON.stringify(product, null, 2)}\n`);
const keys = rows.map((row) => row.source_health_decision_id);
const manifest = {
  schema: "pipelinenews.build-manifest.v1",
  release: "newsv4",
  status: "CANDIDATE",
  built_at: input.evaluated_at,
  modules: [{ path: "newsv4/scripts/build-source-health-context.mjs", sha256: sha256(builderBytes) }],
  inputs: [
    { path: "newsv4/inputs/source_health_observations.v1.json", sha256: sha256(inputBytes) },
    { path: "newsv4/contracts/release.newsv4.json", sha256: sha256(contractBytes) }
  ],
  artifacts: [{ path: "newsv4/data/source_health_context.json", sha256: sha256(outputBytes), bytes: outputBytes.byteLength, rows: rows.length }],
  checks: {
    source_health_context: {
      total_rows: rows.length,
      distinct_declared_keys: new Set(keys).size,
      duplicate_key_groups: rows.length - new Set(keys).size,
      required_null_key_rows: keys.filter((key) => !key).length
    },
    independent_verifier: "newsv4/tests/check_newsv4.mjs"
  }
};
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await Promise.all([
  writeFile(OUTPUT, outputBytes),
  writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)
]);
console.log(`Built NewsV4: ${rows.length} source-health decisions`);
