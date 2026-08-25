import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root));
const json = async (path) => JSON.parse(await read(path));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const pointer = await json("releases/current.json");
assert.equal(pointer.release_id, "202608251700-pipelinenews");
assert.equal(pointer.release_id, pointer.release_id.toLowerCase());
assert.equal(pointer.manifest, pointer.manifest.toLowerCase());
const manifest = await json(pointer.manifest);
assert.equal(manifest.release_id, pointer.release_id);
assert.equal(manifest.app_title, "PipelineNews");
assert.equal(manifest.display_title, "Pipeline News");
assert.equal(manifest.naming.format, "YYYYMMDDHHmm-pipelinenews");
assert.equal(manifest.naming.path_slug, "pipelinenews");
assert.equal(manifest.naming.lowercase_paths_required, true);
assert.equal(manifest.lineage.parent_release, "202608251651-PipelineNews");
assert.equal(manifest.lineage.frozen_versions_mutated, false);
assert.equal(manifest.app.release_folder, manifest.app.release_folder.toLowerCase());
assert.equal(manifest.app.entrypoint, manifest.app.entrypoint.toLowerCase());

const pinned = [...manifest.objects.inputs, ...manifest.objects.modules, ...manifest.objects.artifacts, ...manifest.objects.css, ...manifest.app.shell_files, manifest.build.builder, manifest.build.official_poller, manifest.build.repd_source_checker, manifest.build.naming_contract];
for (const item of pinned) { const bytes = await read(item.path); assert.equal(sha256(bytes), item.sha256, item.path); assert.equal(bytes.byteLength, item.bytes, item.path); }
assert.deepEqual((await readdir(new URL(manifest.app.release_folder, root))).sort(), ["README.md", "index.html", "release.json"]);
const contract = await json(manifest.objects.artifacts[0].path);
assert.equal(contract.release_id, "202608251700-pipelinenews");
assert.equal(contract.naming.path_slug, "pipelinenews");
assert.equal(contract.naming.lowercase_paths_required, true);
assert.equal(contract.spine.total_projects, 7680);
assert.equal(contract.publication_law.google_discovery_retained, true);
const input = await json(manifest.objects.inputs[0].path);
const engineUrl = new URL(manifest.objects.modules.find((item) => item.role === "official_frontier_engine").path, root);
const { buildFrontierContract } = await import(engineUrl.href);
assert.equal(sha256(Buffer.from(`${JSON.stringify(buildFrontierContract(input), null, 2)}\n`)), manifest.objects.artifacts[0].sha256);
assert.throws(() => buildFrontierContract({ ...input, release_id: "202608251700-PipelineNews" }), /lowercase/);

for (const priorPath of ["releases/202608251528-PipelineNews.json", "releases/202608251622-PipelineNews.json", "releases/202608251636-PipelineNews.json", "releases/202608251651-PipelineNews.json"]) {
  const prior = await json(priorPath);
  const priorPinned = [...prior.objects.inputs, ...prior.objects.modules, ...prior.objects.artifacts, ...prior.objects.css, ...prior.app.shell_files, prior.build.builder];
  for (const item of priorPinned) { const bytes = await read(item.path); assert.equal(sha256(bytes), item.sha256, `frozen prior changed: ${item.path}`); assert.equal(bytes.byteLength, item.bytes, `frozen prior size changed: ${item.path}`); }
}
console.log("PASS 202608251700-pipelinenews: lowercase paths enforced; visible Pipeline News title retained; history frozen");
