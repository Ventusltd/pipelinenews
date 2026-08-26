import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root));
const json = async (path) => JSON.parse(await read(path));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const pointer = await json("releases/current.json");
assert.equal(pointer.release_id, "202608251622-PipelineNews");
const manifest = await json(pointer.manifest);
assert.equal(manifest.release_id, pointer.release_id);
assert.equal(manifest.app_title, "PipelineNews");
assert.equal(manifest.lineage.parent_release, "202608251528-PipelineNews");
assert.equal(manifest.lineage.frozen_versions_mutated, false);

const pinned = [...manifest.objects.inputs, ...manifest.objects.modules, ...manifest.objects.artifacts, ...manifest.objects.css, ...manifest.app.shell_files, manifest.build.builder];
for (const item of pinned) {
  const bytes = await read(item.path);
  assert.equal(sha256(bytes), item.sha256, item.path);
  assert.equal(bytes.byteLength, item.bytes, item.path);
}

const folder = await readdir(new URL(manifest.app.release_folder, root));
assert.deepEqual(folder.sort(), ["README.md", "index.html", "release.json"]);
const ledger = await json(manifest.objects.artifacts[0].path);
assert.equal(ledger.policy_id, "PN-EVIDENCE-CREDIBILITY-V1");
assert.equal(ledger.publication_law.official_sources_rank_above_news, true);
assert.equal(ledger.publication_law.google_discovery_retained, true);
assert.equal(ledger.publication_law.original_outlet_credited_and_linked, true);
assert.equal(ledger.publication_law.article_body_stored, false);
assert.equal(ledger.event.binding.role, "PRIMARY_MATCH");
assert.equal(ledger.event.binding.repd_ref, "17494");
assert.equal(ledger.event.binding.gg_project_id, "GG2050-REPD-17494");
assert.deepEqual(ledger.event.binding.related_repd_refs, ["20670"]);
assert.notEqual(ledger.event.binding.repd_ref, "20670");
const government = ledger.evidence.filter((row) => row.credibility_score >= 90);
const google = ledger.evidence.find((row) => row.source_class === "NEWS_AGGREGATOR");
assert.equal(government.length, 2);
assert.equal(google.credibility_score, 30);
assert.ok(government.every((row) => row.credibility_score > google.credibility_score));
assert.ok(ledger.evidence.some((row) => row.canonical_url === "https://www.bbc.co.uk/news/articles/clyelee255do"));
assert.ok(ledger.mission_invariants.length >= 5);

const parent = await json("releases/202608251528-PipelineNews.json");
const frozenParent = [...parent.objects.inputs, ...parent.objects.modules, ...parent.objects.artifacts, ...parent.objects.css, ...parent.app.shell_files, parent.build.architecture, parent.build.builder];
for (const item of frozenParent) {
  const bytes = await read(item.path);
  assert.equal(sha256(bytes), item.sha256, `frozen parent changed: ${item.path}`);
  assert.equal(bytes.byteLength, item.bytes, `frozen parent size changed: ${item.path}`);
}

const input = await json(manifest.objects.inputs[0].path);
const engineUrl = new URL(manifest.objects.modules.find((row) => row.role === "evidence_credibility_engine").path, root);
const { buildEvidenceLedger } = await import(engineUrl.href);
const rebuilt = Buffer.from(`${JSON.stringify(buildEvidenceLedger(input), null, 2)}\n`);
assert.equal(sha256(rebuilt), manifest.objects.artifacts[0].sha256);
console.log("PASS 202608251622-PipelineNews: official > publisher > Google; East Pye binds only REPD 17494; V1-V5 mission retained");
