import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root));
const json = async (path) => JSON.parse(await read(path));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const pointer = await json("releases/current.json");
assert.equal(pointer.release_id, "202608251636-PipelineNews");
const manifest = await json(pointer.manifest);
assert.equal(manifest.app_title, "PipelineNews");
assert.equal(manifest.lineage.parent_release, "202608251622-PipelineNews");
assert.equal(manifest.lineage.frozen_versions_mutated, false);
assert.equal(manifest.naming.format, "YYYYMMDDHHmm-PipelineNews");
assert.equal(manifest.semantic_version, undefined);

const pinned = [...manifest.objects.inputs, ...manifest.objects.modules, ...manifest.objects.artifacts, ...manifest.objects.css, ...manifest.app.shell_files, manifest.build.builder, manifest.build.official_poller, manifest.build.repd_source_checker];
for (const item of pinned) {
  const bytes = await read(item.path);
  assert.equal(sha256(bytes), item.sha256, item.path);
  assert.equal(bytes.byteLength, item.bytes, item.path);
}

const folder = await readdir(new URL(manifest.app.release_folder, root));
assert.deepEqual(folder.sort(), ["README.md", "index.html", "release.json"]);
const html = (await read(manifest.app.entrypoint)).toString("utf8");
assert.doesNotMatch(html, /<style(?:\s|>)/i);
assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
assert.match(html, /newsv1\//);
assert.match(html, /newsv5\//);
assert.match(html, /newsv7\//);

const contract = await json(manifest.objects.artifacts[0].path);
assert.equal(contract.spine.total_projects, 7680);
assert.equal(contract.spine.with_planning_reference, 7315);
assert.equal(contract.spine.without_planning_reference, 365);
assert.equal(contract.publication_law.full_repd_spine_retained, true);
assert.equal(contract.publication_law.google_discovery_retained, true);
assert.equal(contract.publication_law.empty_fetch_means_no_news, false);
assert.equal(contract.fixture_proof.east_pye_binding.repd_ref, "17494");
assert.equal(contract.fixture_proof.duplicate_reference_decision.role, "ABSTAIN");
assert.deepEqual(contract.fixture_proof.duplicate_reference_decision.candidate_repd_refs, ["15001", "15002"]);

const input = await json(manifest.objects.inputs[0].path);
const engineUrl = new URL(manifest.objects.modules.find((item) => item.role === "official_frontier_engine").path, root);
const { buildFrontierContract, buildReferenceGroups, resolvePlanningBinding, selectFrontier, sourceHealth } = await import(engineUrl.href);
const rebuilt = Buffer.from(`${JSON.stringify(buildFrontierContract(input), null, 2)}\n`);
assert.equal(sha256(rebuilt), manifest.objects.artifacts[0].sha256);
const groups = buildReferenceGroups(input.fixture.projects);
assert.equal(groups.length, 2);
const first = selectFrontier(groups, { next_index: 0 }, 1);
const second = selectFrontier(groups, { next_index: first.next_index }, 1);
assert.notEqual(first.selected[0].normalised_reference, second.selected[0].normalised_reference);
const duplicate = groups.find((group) => group.projects.length === 2);
assert.equal(resolvePlanningBinding(input.fixture.planit_duplicate, duplicate).role, "ABSTAIN");
assert.equal(sourceHealth({ attempted: 3, succeeded: 0 }).status, "UNAVAILABLE");
assert.equal(sourceHealth({ attempted: 3, succeeded: 1 }).status, "DEGRADED");

const poller = (await read(manifest.build.official_poller.path)).toString("utf8");
assert.match(poller, /id_match/);
assert.match(poller, /www\.gov\.uk\/api\/search\.json/);
assert.match(poller, /Google|google_news/);
assert.match(poller, /projects\.length !== 7680/);
const repd = (await read(manifest.build.repd_source_checker.path)).toString("utf8");
assert.match(repd, /quarterly-extract/);
assert.match(repd, /CANDIDATE_ONLY_REQUIRES_FAIL_CLOSED_QUARTERLY_RELEASE/);
const workflow = (await read(".github/workflows/official-source-frontier.yml")).toString("utf8");
assert.match(workflow, /cancel-in-progress: false/);
assert.match(workflow, /PLANIT_BUDGET: "48"/);

for (const priorPath of ["releases/202608251528-PipelineNews.json", "releases/202608251622-PipelineNews.json"]) {
  const prior = await json(priorPath);
  const priorPinned = [...prior.objects.inputs, ...prior.objects.modules, ...prior.objects.artifacts, ...prior.objects.css, ...prior.app.shell_files, prior.build.builder];
  for (const item of priorPinned) {
    const bytes = await read(item.path);
    assert.equal(sha256(bytes), item.sha256, `frozen prior changed: ${item.path}`);
    assert.equal(bytes.byteLength, item.bytes, `frozen prior size changed: ${item.path}`);
  }
}

console.log("PASS 202608251636-PipelineNews: full REPD spine; bounded official frontier; duplicate refs abstain; Google retained; prior releases frozen");
