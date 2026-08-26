import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root));
const json = async (path) => JSON.parse(await read(path));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const pointer = await json("releases/current.json");
assert.equal(pointer.release_id, "202608251651-PipelineNews");
const manifest = await json(pointer.manifest);
assert.equal(manifest.app_title, "PipelineNews");
assert.equal(manifest.lineage.parent_release, "202608251636-PipelineNews");
assert.equal(manifest.lineage.frozen_versions_mutated, false);
const pinned = [...manifest.objects.inputs, ...manifest.objects.modules, ...manifest.objects.artifacts, ...manifest.objects.css, ...manifest.app.shell_files, manifest.build.builder, manifest.build.official_poller, manifest.build.repd_source_checker];
for (const item of pinned) { const bytes = await read(item.path); assert.equal(sha256(bytes), item.sha256, item.path); assert.equal(bytes.byteLength, item.bytes, item.path); }
assert.deepEqual((await readdir(new URL(manifest.app.release_folder, root))).sort(), ["README.md", "index.html", "release.json"]);
const contract = await json(manifest.objects.artifacts[0].path);
assert.equal(contract.spine.source_rows, 14657);
assert.equal(contract.spine.total_projects, 7680);
assert.equal(contract.spine.unique_planning_reference_groups, 6870);
assert.equal(contract.scheduler.max_concurrency, 1);
assert.equal(contract.scheduler.inter_request_delay_ms, 2000);
assert.equal(contract.publication_law.google_discovery_retained, true);
assert.equal(contract.fixture_proof.east_pye_binding.repd_ref, "17494");
assert.equal(contract.fixture_proof.duplicate_reference_decision.role, "ABSTAIN");
const input = await json(manifest.objects.inputs[0].path);
const engineUrl = new URL(manifest.objects.modules.find((item) => item.role === "official_frontier_engine").path, root);
const { buildFrontierContract } = await import(engineUrl.href);
assert.equal(sha256(Buffer.from(`${JSON.stringify(buildFrontierContract(input), null, 2)}\n`)), manifest.objects.artifacts[0].sha256);
const poller = (await read(manifest.build.official_poller.path)).toString("utf8");
assert.match(poller, /await sleep\(2_000\)/);
assert.match(poller, /response\.status === 429/);
assert.doesNotMatch(poller, /Promise\.all\(pair/);
const checker = (await read(manifest.build.repd_source_checker.path)).toString("utf8");
assert.match(checker, /Solar Photovoltaics/);
assert.match(checker, /Number\(row\["Installed Capacity \(MWelec\)"\]\) >= 1/);
assert.match(checker, /newRows\.map\(publicProject\)/);
for (const workflowPath of [".github/workflows/official-source-frontier.yml", ".github/workflows/repd-monthly-check.yml"]) {
  const workflow = (await read(workflowPath)).toString("utf8");
  assert.match(workflow, /group: pipelinenews-data-writers/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /git pull --rebase origin main/);
}
for (const priorPath of ["releases/202608251528-PipelineNews.json", "releases/202608251622-PipelineNews.json", "releases/202608251636-PipelineNews.json"]) {
  const prior = await json(priorPath);
  const priorPinned = [...prior.objects.inputs, ...prior.objects.modules, ...prior.objects.artifacts, ...prior.objects.css, ...prior.app.shell_files, prior.build.builder];
  for (const item of priorPinned) { const bytes = await read(item.path); assert.equal(sha256(bytes), item.sha256, `frozen prior changed: ${item.path}`); assert.equal(bytes.byteLength, item.bytes, `frozen prior size changed: ${item.path}`); }
}
console.log("PASS 202608251651-PipelineNews: scoped quarterly REPD diff; sequential rate-aware PlanIt; writer jobs never cancel; Google retained");
