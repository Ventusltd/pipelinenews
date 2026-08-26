import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root));
const json = async (path) => JSON.parse(await read(path));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const pointer = await json("releases/current.json");
assert.equal(pointer.release_id, "202608251701-pipelinenews");
assert.equal(pointer.release_id, pointer.release_id.toLowerCase());
const manifest = await json(pointer.manifest);
assert.equal(manifest.release_id, pointer.release_id);
assert.equal(manifest.app_title, "PipelineNews");
assert.equal(manifest.display_title, "Pipeline News");
assert.equal(manifest.status, "CANDIDATE_NOT_CURRENT");
assert.equal(manifest.naming.format, "yyyymmddhhmm-pipelinenews");
assert.equal(manifest.naming.lowercase_paths_required, true);
assert.equal(manifest.naming.lowercase_filenames_required, true);
assert.equal(manifest.lineage.parent_release, "202608251700-pipelinenews");
assert.equal(manifest.lineage.frozen_versions_mutated, false);
assert.equal(manifest.acceptance.independently_green_batches, 7);
assert.equal(manifest.acceptance.live_search_index_run_completed, false);
assert.equal(manifest.acceptance.credibility_gates_identity, false);
assert.equal(manifest.acceptance.person_key_allowed, false);
assert.equal(manifest.objects.modules.some((item) => item.role === "official_frontier_engine"), true);
assert.equal(manifest.objects.artifacts.some((item) => item.role === "official_frontier_contract"), true);

const pinned = [...manifest.objects.inputs, ...manifest.objects.modules, ...manifest.objects.artifacts, ...manifest.objects.css, ...manifest.objects.reports, ...manifest.app.shell_files, manifest.build.builder];
for (const item of pinned) {
  const bytes = await read(item.path);
  assert.equal(sha256(bytes), item.sha256, item.path);
  assert.equal(bytes.byteLength, item.bytes, item.path);
  if (item.path.includes("/sha256/")) assert.match(item.path, new RegExp(`${item.sha256}\\.`));
}

const newPaths = pinned.map((item) => item.path).filter((path) => path.startsWith("202608251701-") || path.startsWith("discoveryv1/") || path.startsWith("attributionv1/") || path.startsWith("reports/202608251701-") || path === "tooling/build-202608251701-release.mjs");
assert.equal(newPaths.every((path) => path === path.toLowerCase()), true, `new paths must be lowercase: ${newPaths.filter((path) => path !== path.toLowerCase()).join(", ")}`);
assert.deepEqual((await readdir(new URL(manifest.app.release_folder, root))).sort(), ["index.html", "readme.md", "release.json"]);

const artifact = await json(manifest.objects.artifacts.find((item) => item.role === "discovery_attribution_candidate").path);
assert.equal(artifact.spine.canonical_projects, 7680);
assert.equal(artifact.discovery.regression_proof.east_pye_primary_match, "GG2050-REPD-17494");
assert.equal(artifact.discovery.regression_proof.counts.abstain, 1);
assert.equal(artifact.discovery.live.fixture_only, false);
assert.equal(artifact.discovery.live.publication_status, "NOT_RUN_CANDIDATE");
assert.equal(artifact.discovery.live.mentions.length, 0);
assert.equal(artifact.attribution.live.roles.length, 0);
assert.equal(artifact.attribution.organisations_only, true);
assert.equal(artifact.attribution.contradictions_coexist, true);
assert.equal(artifact.publication_readiness.status, "CANDIDATE_NOT_CURRENT");
assert.equal(artifact.publication_law.no_live_claims_from_fixtures, true);

const discoveryManifest = await json("discoveryv1/data/build_manifest.json");
const attributionManifest = await json("attributionv1/data/build_manifest.json");
for (const layer of [discoveryManifest, attributionManifest]) {
  for (const item of [...layer.inputs, ...layer.contracts, ...layer.modules, ...layer.artifacts, ...layer.tests]) {
    const bytes = await read(item.path);
    assert.equal(sha256(bytes), item.sha256, item.path);
    assert.equal(bytes.byteLength, item.bytes, item.path);
  }
}
assert.equal(discoveryManifest.acceptance.real_search_index_run_completed, false);
assert.equal(attributionManifest.acceptance.person_key_allowed, false);

const publicTexts = await Promise.all(["202608251701-pipelinenews/index.html", "202608251701-pipelinenews/readme.md", "discoveryv1/readme.md", "attributionv1/readme.md", "releases/202608251701-pipelinenews.json"].map(async (path) => (await read(path)).toString("utf8")));
assert.match(publicTexts[3], /It records organisations, not individuals\./u);

console.log("PASS 202608251701-pipelinenews: seven green data batches; lowercase files; currentness fails closed; frozen interfaces untouched");
