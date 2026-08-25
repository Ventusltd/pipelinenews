import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";

const repositoryRoot = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, repositoryRoot));
const json = async (path) => JSON.parse(await read(path));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const pointer = await json("releases/current.json");
const manifest = await json(pointer.manifest);
assert.equal(pointer.schema, "pipelinenews.release-pointer.v1");
assert.equal(pointer.channel, "candidate");
assert.equal(pointer.release_id, "202608251528-PipelineNews");
assert.equal(manifest.release_id, pointer.release_id);
assert.equal(manifest.app_title, "PipelineNews");
assert.equal(manifest.display_title, "Pipeline News");
assert.equal(manifest.semantic_version, undefined);
assert.match(manifest.release_id, /^\d{12}-PipelineNews$/);
assert.equal(manifest.naming.time_basis, "UTC");
assert.equal(manifest.naming.format, "YYYYMMDDHHmm-PipelineNews");

const match = manifest.release_id.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})-PipelineNews$/);
const [, year, month, day, hour, minute] = match;
const releaseMinute = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute)).toISOString();
assert.equal(releaseMinute, "2026-08-25T15:28:00.000Z");
assert.equal(new Date(manifest.incepted_at).toISOString(), releaseMinute);
assert.equal(manifest.app.stable_route, "PipelineNews/");
assert.equal(manifest.app.release_folder, "202608251528-PipelineNews/");
assert.equal(manifest.app.release_folder_created, true);
assert.equal(manifest.app.duplicated_asset_directories, 0);
assert.equal(existsSync(new URL(`${manifest.release_id}/`, repositoryRoot)), true);

const pinnedObjects = [
  ...manifest.objects.inputs,
  ...manifest.objects.modules,
  ...manifest.objects.artifacts,
  ...manifest.objects.css,
  ...manifest.objects.parquet,
  ...manifest.objects.geojson,
  ...manifest.app.shell_files,
  manifest.build.architecture,
  manifest.build.builder,
];
for (const object of pinnedObjects) {
  const bytes = await read(object.path);
  assert.equal(sha256(bytes), object.sha256, object.path);
  assert.equal(bytes.byteLength, object.bytes, object.path);
  if (object.path.includes("/sha256/")) assert.match(object.path, new RegExp(`${object.sha256.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.`));
}
assert.equal(manifest.objects.css.length, 1);
assert.equal(manifest.objects.modules.filter((row) => row.role === "timestamped_release_shell").length, 1);
assert.deepEqual(manifest.objects.geojson, []);

const folderEntries = await readdir(new URL(manifest.app.release_folder, repositoryRoot), { withFileTypes: true });
assert.deepEqual(folderEntries.map((entry) => entry.name).sort(), ["README.md", "index.html", "release.json"]);
assert.ok(folderEntries.every((entry) => entry.isFile()));
const folderPointer = await json("202608251528-PipelineNews/release.json");
assert.equal(folderPointer.release_id, manifest.release_id);
assert.equal(folderPointer.manifest, "../releases/202608251528-PipelineNews.json");
assert.equal(folderPointer.shared_assets, true);
assert.equal(folderPointer.duplicated_asset_directories, 0);
const shellHtml = (await read("202608251528-PipelineNews/index.html")).toString("utf8");
assert.match(shellHtml, /objects\/css\/sha256\/5c196d2b307e0426447dc96f1762bc6e39de98f2a39ae8667265198f09d5166e\.css/);
assert.match(shellHtml, /objects\/js\/sha256\/e57f8ead800893c351e9dfac7294b0995b14e9c20fdc5042773f451acfa98136\.mjs/);
assert.doesNotMatch(shellHtml, /<style(?:\s|>)/i);
assert.doesNotMatch(shellHtml, /<script(?![^>]*\bsrc=)[^>]*>/i);

const input = await json(manifest.objects.inputs[0].path);
const artifactBytes = await read(manifest.objects.artifacts[0].path);
const artifact = JSON.parse(artifactBytes);
const moduleUrl = new URL(manifest.objects.modules[0].path, repositoryRoot);
const { buildDiscoveryLedger, canonicaliseSourceUrl, discoverSource } = await import(moduleUrl.href);
const rebuiltBytes = Buffer.from(`${JSON.stringify(buildDiscoveryLedger(input), null, 2)}\n`);
assert.equal(sha256(rebuiltBytes), sha256(artifactBytes));

assert.equal(artifact.schema, "pipelinenews.source-discovery-ledger.v1");
assert.equal(artifact.release_id, "202608251528-PipelineNews");
assert.deepEqual(artifact.counts, {
  source_candidates: 1,
  url_only_candidates: 1,
  promoted_articles: 0,
  project_bindings: 0,
  data_centre_bindings: 0,
  claim_eligible: 0,
});

const candidate = artifact.candidates[0];
assert.equal(candidate.discovery_id, "PN-DISCOVERY-B4B91FD3DA8F596C9876");
assert.equal(candidate.canonical_url, "https://www.bbc.co.uk/news/articles/clyelee255do");
assert.equal(candidate.publisher_label, "BBC News");
assert.equal(candidate.permitted_use, "CREDITED_OUTBOUND_LINK_ONLY");
assert.equal(candidate.discovery_status, "DISCOVERED_URL_ONLY");
assert.equal(candidate.direct_source_metadata_status, "UNVERIFIED");
assert.equal(candidate.content_retrieved, false);
for (const field of ["headline", "summary", "body", "author", "image_url", "article_id", "project_id", "repd_ref", "development_id", "data_centre_evidence_id", "event_type", "capacity_mw"]) {
  assert.equal(candidate[field], null, field);
}
assert.equal(candidate.claim_eligible, false);
assert.equal(candidate.metadata_observations.length, 2);
assert.ok(candidate.metadata_observations.every((row) => row.claim_eligible === false && row.permitted_use === "DISCOVERY_METADATA_ONLY"));
assert.deepEqual(candidate.decisions, {
  candidate_collection: "ACCEPT_RECALL_FIRST_URL",
  article_promotion: "HOLD_NO_DIRECT_SOURCE_METADATA",
  claim_extraction: "ABSTAIN_NO_DIRECT_ARTICLE_EVIDENCE",
  project_binding: "ABSTAIN_NO_IDENTITY_EVIDENCE",
  data_centre_binding: "ABSTAIN_NO_IDENTITY_EVIDENCE",
});
assert.equal(JSON.stringify(artifact).includes("GG2050-REPD-"), false);

assert.equal(
  canonicaliseSourceUrl("http://bbc.co.uk/news/articles/clyelee255do?utm_source=test#fragment", ["bbc.co.uk", "www.bbc.co.uk"], "www.bbc.co.uk"),
  candidate.canonical_url,
);
assert.throws(() => canonicaliseSourceUrl("https://www.bbc.co.uk.evil.example/news/articles/clyelee255do", ["bbc.co.uk", "www.bbc.co.uk"], "www.bbc.co.uk"), /allow-listed/);
assert.throws(() => canonicaliseSourceUrl("javascript:alert(1)", ["bbc.co.uk"], "bbc.co.uk"), /HTTP/);
assert.throws(() => discoverSource({ ...input.candidates[0], headline: "unverified title" }), /headline must remain null/);

assert.equal(manifest.lineage.parent_release, "newsv7");
assert.equal(manifest.lineage.parent_commit, "5a733a36a12c53c18a70a02ce8dd2c89c6687bde");
assert.equal(manifest.publication.live, false);
assert.equal(manifest.publication.visible_ui_changed, false);
assert.equal(manifest.acceptance.article_ids_minted, 0);
assert.equal(manifest.acceptance.project_bindings, 0);
assert.equal(manifest.acceptance.data_centre_bindings, 0);

console.log("PASS 202608251528-PipelineNews: manifest-resolved shared objects; BBC URL discovered; 0 promoted claims or identities");
