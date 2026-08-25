import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const releaseId = "202608251750-pipelinenews";
const parentCommit = "1133183db122cdea211f5a9c67bfa35b81ef4e37";
const read = (path) => readFile(new URL(path, root));
const json = async (path) => JSON.parse(await read(path));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const pointer = await json("releases/current.json");
assert.equal(pointer.release_id, releaseId);
assert.equal(pointer.channel, "candidate");
assert.equal(pointer.public_app_switched, false);
assert.equal(pointer.release_id, pointer.release_id.toLowerCase());

const manifest = await json(pointer.manifest);
assert.equal(manifest.release_id, releaseId);
assert.equal(manifest.status, "CANDIDATE_NOT_CURRENT");
assert.equal(manifest.incepted_at, "2026-08-25T17:50:00+01:00");
assert.equal(manifest.naming.format, "yyyymmddhhmm-pipelinenews");
assert.equal(manifest.naming.time_basis, "Europe/London operator inception clock");
assert.equal(manifest.naming.lowercase_paths_required, true);
assert.equal(manifest.naming.lowercase_release_filenames_required, true);
assert.equal(manifest.lineage.parent_release, "202608251701-pipelinenews");
assert.equal(manifest.lineage.parent_commit, parentCommit);
assert.equal(manifest.lineage.parent_manifest_mutated, false);
assert.equal(manifest.lineage.frozen_versions_mutated, false);
assert.equal(manifest.lineage.newsv1_mutated, false);
assert.equal(manifest.lineage.newsv7_mutated, false);
assert.equal(manifest.publication.live, false);
assert.equal(manifest.publication.stable_app_switched, false);

assert.deepEqual(
  {
    projects: manifest.acceptance.repd_projects,
    capacity: manifest.acceptance.repd_capacity_mw,
    records: manifest.acceptance.pinned_planit_records,
    priorPrimary: manifest.acceptance.previous_primary_match,
    safePrimary: manifest.acceptance.authority_safe_primary_match,
    quarantined: manifest.acceptance.changed_primary_to_abstain,
  },
  { projects: 7680, capacity: 356474.09, records: 128, priorPrimary: 128, safePrimary: 23, quarantined: 105 },
);
assert.equal(manifest.acceptance.authority_or_name_required, true);
assert.equal(manifest.acceptance.capacity_used_for_identity, false);
assert.equal(manifest.acceptance.credibility_gates_identity, false);
assert.equal(manifest.acceptance.live_search_index_run_completed, false);
assert.equal(manifest.acceptance.person_key_allowed, false);
assert.equal(manifest.acceptance.east_pye_primary_match, "GG2050-REPD-17494");
assert.equal(manifest.acceptance.beacon_fen_primary_repd_ref, "13599");

const pinned = [
  ...manifest.objects.inputs,
  ...manifest.objects.modules,
  ...manifest.objects.artifacts,
  ...(manifest.objects.docs || []),
  ...manifest.objects.css,
  ...manifest.objects.reports,
  ...manifest.app.shell_files,
  manifest.build.builder,
  manifest.build.poller,
  ...manifest.build.verifiers,
  manifest.build.fixture,
  manifest.build.runner,
];
for (const item of pinned) {
  const bytes = await read(item.path);
  assert.equal(sha256(bytes), item.sha256, item.path);
  assert.equal(bytes.byteLength, item.bytes, item.path);
  if (item.path.includes("/sha256/")) assert.match(item.path, new RegExp(`${item.sha256}\\.`));
}

const newPaths = pinned
  .map((item) => item.path)
  .filter((path) => path.startsWith(`${releaseId}/`) || path.startsWith("reports/202608251750-") || path === "tooling/build-202608251750-release.mjs");
assert.equal(newPaths.every((path) => path === path.toLowerCase()), true);
assert.deepEqual((await readdir(new URL(manifest.app.release_folder, root))).sort(), ["index.html", "readme.md", "release.json"]);

const raw = await json(manifest.objects.inputs.find((item) => item.role === "pinned_raw_official_snapshot").path);
const audited = await json(manifest.objects.artifacts.find((item) => item.role === "authority_safe_audited_snapshot").path);
const report = await json(manifest.objects.reports.find((item) => item.role === "planning_binding_audit").path);
assert.equal(raw.schema, "pipelinenews.official-source-snapshot.v2");
assert.equal(audited.source_snapshot.raw_evidence_rewritten, false);
assert.equal(audited.counts.records, 128);
assert.equal(audited.counts.previous_primary_match, 128);
assert.equal(audited.counts.authority_safe_primary_match, 23);
assert.equal(audited.counts.abstain, 105);
assert.deepEqual(audited.counts.abstain_by_reason, {
  PLANNING_AUTHORITY_OR_PROJECT_NAME_NOT_CONFIRMED: 103,
  PLANNING_REFERENCE_NOT_EXACT: 2,
});
assert.equal(audited.counts.changed_primary_to_abstain, 105);
assert.deepEqual(report.counts, audited.counts);
assert.equal(report.checks.null_observation_keys, 0);
assert.equal(report.checks.duplicate_observation_keys, 0);
assert.equal(report.checks.frozen_newsv1_newsv7_regression, "REQUIRED_IN_PAGES_AND_TIMESTAMP_WORKFLOWS");
assert.equal(report.checks.pages_deployment, "NOT_TESTED_AT_BUILD_TIME");
assert.equal(report.canaries.east_pye_primary_match, "GG2050-REPD-17494");
assert.equal(report.canaries.beacon_fen_primary_repd_ref, "13599");

const records = Object.values(audited.planit_by_reference).flatMap((entry) => entry.records);
assert.equal(records.length, 128);
assert.equal(records.filter((record) => record.binding.role === "PRIMARY_MATCH").length, 23);
assert.equal(records.filter((record) => record.binding.role === "ABSTAIN").length, 105);
assert.equal(records.every((record) => record.previous_binding.role === "PRIMARY_MATCH"), true);
assert.equal(records.filter((record) => record.binding.role === "PRIMARY_MATCH").every((record) => [
  "EXACT_REFERENCE_PLUS_EXACT_PROJECT_NAME",
  "EXACT_REFERENCE_PLUS_PLANNING_AUTHORITY",
].includes(record.binding.method)), true);

const contract = await json(manifest.objects.artifacts.find((item) => item.role === "authority_safe_frontier_contract").path);
assert.equal(contract.binding_gate.exact_reference_required, true);
assert.equal(contract.binding_gate.planning_authority_matching, "EXACT_AFTER_EXPLICIT_ALIAS_MAP");
assert.equal(contract.binding_gate.capacity_used_for_identity, false);
assert.equal(contract.fixture_proof.east_pye_binding.repd_ref, "17494");
assert.equal(contract.fixture_proof.duplicate_reference_decision.role, "ABSTAIN");

assert.equal(manifest.mission.repd_solar_bess_progress.solar.projects, 3563);
assert.equal(manifest.mission.repd_solar_bess_progress.solar.capacity_mw, 67013.29);
assert.equal(manifest.mission.repd_solar_bess_progress.bess.projects, 1609);
assert.equal(manifest.mission.repd_solar_bess_progress.bess.capacity_mw, 147681.94);
assert.equal(manifest.mission.when_connecting.status, "UNKNOWN_NOT_IN_PINNED_EVIDENCE");
assert.equal(manifest.mission.how_connecting.status, "UNKNOWN_NOT_IN_PINNED_EVIDENCE");

const sumBytes = (items) => items.reduce((total, item) => total + item.bytes, 0);
const rawInput = manifest.objects.inputs.find((item) => item.role === "pinned_raw_official_snapshot");
const newContent = [
  rawInput,
  manifest.objects.modules.find((item) => item.role === "official_frontier_engine"),
  manifest.objects.modules.find((item) => item.role === "timestamped_release_shell"),
  ...manifest.objects.artifacts,
  ...manifest.objects.docs,
];
const reusedPinned = [
  ...manifest.objects.inputs.filter((item) => item.role !== "pinned_raw_official_snapshot"),
  manifest.objects.modules.find((item) => item.role === "official_frontier_engine_dependency"),
  manifest.objects.modules.find((item) => item.role === "official_frontier_engine_transitive_dependency"),
  ...manifest.objects.css,
];
const proofFiles = [manifest.build.builder, manifest.build.poller, ...manifest.build.verifiers, manifest.build.fixture, manifest.build.runner];
assert.equal(manifest.byte_counter.release_shell_bytes, sumBytes(manifest.app.shell_files));
assert.equal(manifest.byte_counter.new_content_addressed_bytes, sumBytes(newContent));
assert.equal(manifest.byte_counter.reused_pinned_bytes, sumBytes(reusedPinned));
assert.equal(manifest.byte_counter.executable_proof_bytes, sumBytes(proofFiles));
assert.equal(manifest.byte_counter.audit_report_bytes, manifest.objects.reports[0].bytes);
assert.equal(manifest.byte_counter.release_manifest_bytes, (await read(pointer.manifest)).byteLength);
assert.equal(manifest.byte_counter.minimum_pages_added_bytes,
  manifest.byte_counter.release_shell_bytes
  + manifest.byte_counter.new_content_addressed_bytes
  + manifest.byte_counter.audit_report_bytes
  + manifest.byte_counter.release_manifest_bytes);

const declaredModules = new Map(manifest.objects.modules.map((item) => [item.path, item]));
const engine = manifest.objects.modules.find((item) => item.role === "official_frontier_engine");
const dependencyClosure = new Set();
const dependencyQueue = [engine.path];
while (dependencyQueue.length > 0) {
  const modulePath = dependencyQueue.shift();
  if (dependencyClosure.has(modulePath)) continue;
  dependencyClosure.add(modulePath);
  const moduleSource = (await read(modulePath)).toString("utf8");
  const directory = modulePath.slice(0, modulePath.lastIndexOf("/") + 1);
  const localImports = [...moduleSource.matchAll(/\bfrom\s+["']\.\/([a-f0-9]{64}\.mjs)["']/gu)]
    .map((match) => `${directory}${match[1]}`);
  for (const dependencyPath of localImports) {
    assert.equal(declaredModules.has(dependencyPath), true, `${dependencyPath} is not pinned in the module dependency closure`);
    dependencyQueue.push(dependencyPath);
  }
}
assert.equal(dependencyClosure.has("objects/js/sha256/bf8b87533cda64fa145de9ca28998b29bf7f863f483a26a78e34fc3272fe9f7d.mjs"), true);
assert.equal(dependencyClosure.has("objects/js/sha256/0f0adf842d22158b882f168d6c131480afd81bce6609b8453a073f15d201d18c.mjs"), true);

const html = (await read(`${releaseId}/index.html`)).toString("utf8");
assert.match(html, new RegExp(`github\\.com/Ventusltd/pipelinenews/tree/${parentCommit}/discoveryv1`, "u"));
assert.match(html, new RegExp(`github\\.com/Ventusltd/pipelinenews/tree/${parentCommit}/attributionv1`, "u"));
assert.match(html, new RegExp(manifest.objects.docs[0].path.replaceAll(".", "\\."), "u"));
assert.doesNotMatch(html, /href="\.\.\/discoveryv1\//u);
assert.doesNotMatch(html, /href="\.\.\/attributionv1\//u);
assert.match(html, /\.\.\/reports\/202608251750-planning-binding-audit\.json/u);

const frozenParentFiles = new Map([
  ["202608251701-pipelinenews/index.html", "c178b59df1d9b16f36f78e7f808ef0decdbaf6a048a74070d70229c66caf66a6"],
  ["202608251701-pipelinenews/readme.md", "134cb7e9c55059d0e49a9287a6859aa973a7e37f13183f772a61c4eac55ea535"],
  ["202608251701-pipelinenews/release.json", "6b83f51233de8d7f771c9072555bfb43a958febdfd527f0adee1f88c34e2b1b8"],
  ["releases/202608251701-pipelinenews.json", "0e2b3a4a29f217d224b0d216e0a33af775be936eabecfb00414d8036e2a4c557"],
]);
for (const [path, expected] of frozenParentFiles) assert.equal(sha256(await read(path)), expected, path);
execFileSync("git", ["diff", "--quiet", parentCommit, "--", "newsv1", "newsv7", "202608251701-pipelinenews", "releases/202608251701-pipelinenews.json"], { cwd: new URL("..", import.meta.url) });

console.log("PASS 202608251750-pipelinenews: 23 authority-safe matches; 105 unsafe bindings abstained; frozen parents unchanged");
