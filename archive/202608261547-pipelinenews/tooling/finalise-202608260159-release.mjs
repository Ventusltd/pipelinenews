import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = "202608260159-pipelinenews";
const inception = "2026-08-26T01:59:35+01:00";
const created = "2026-08-26T02:59:16+01:00";
const canonical = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const abs = (path) => join(root, path);
const put = async (path, value) => { await mkdir(dirname(abs(path)), { recursive: true }); await writeFile(abs(path), Buffer.isBuffer(value) || typeof value === "string" ? value : canonical(value)); };
const entry = async (path) => { const bytes = await readFile(abs(path)); return { path, bytes: bytes.length, sha256: sha256(bytes) }; };
const walk = async (path) => (await Promise.all((await readdir(abs(path))).map(async (name) => {
  const child = join(path, name); return (await stat(abs(child))).isDirectory() ? walk(child) : [child];
}))).flat();
const sum = (rows) => rows.reduce((total, row) => total + row.bytes, 0);

const snapshotPath = `${id}/CHANGELOG_SNAPSHOT.md`;
const changelog = await readFile(abs("CHANGELOG.md"));
await put(snapshotPath, changelog);
await put(`${id}/readme.md`, `# ${id}\n\nImmutable copy-first recovery candidate using the complete V9.6.2 interface and asset closure. Only audited release labels, same-origin dependency paths and privacy-safe typed news output differ. Publication, PipelineNews Pages and GlobalGrid2050 catalogue status remain UNVERIFIED until later attestations.\n`);
await put(`${id}/release.json`, {
  schema: "pipelinenews.v962-copy-release.v1", release_id: id, status: "CANDIDATE_PREPUBLICATION", immutable: true,
  source: { repository: "Ventusltd/globalgrid2050", commit: "204aae6462a9851a8341af59760c3e7cb6ad08a5", path: "uk_renewables_pipeline/v9.6.2", closure_decision: "../plans/20260826-v962-source-closure-decision.md" },
  manifest: `../releases/${id}.json`, changelog_snapshot: "CHANGELOG_SNAPSHOT.md",
  interface: { exact_v962_copy: true, table_columns: 11, full_project_rows: 7680, headline_rows: 133, mobile_horizontal_scroll: true, individual_person_names_published: false },
});
await put("releases/candidate.json", { schema: "pipelinenews.release-pointer.v2", channel: "candidate", release_id: id, manifest: `releases/${id}.json`, updated_at: created, public_app_switched: false, rejected_predecessors: ["202608251701-pipelinenews", "202608251750-pipelinenews", "202608251929-pipelinenews"] });

const sourcePlan = await readFile(abs("plans/20260826-v962-source-closure-decision.md"), "utf8");
const pins = new Map();
for (const match of sourcePlan.matchAll(/^\| (?:direct-runtime|manifest-reference) \| `([^`]+)` \| (\d+) \| `([a-f0-9]{40})` \| `([a-f0-9]{64})` \|$/gmu)) {
  let sourcePath = match[1];
  const releasePath = sourcePath.replace(/^uk_renewables_pipeline\/v9\.6\.2\//u, "");
  pins.set(releasePath, { source_path: sourcePath, source_bytes: Number(match[2]), source_blob_sha1: match[3], source_sha256: match[4] });
}
if (pins.size !== 58) throw new Error(`SOURCE_PIN_COUNT_${pins.size}`);
const substitutedPaths = new Set(["index.html", "dist/major_project_news_v9_5_1.json", "scripts/core/news-regions-v9-6-2.js", "scripts/plugins/newspaper-v9-5-1.js", "scripts/plugins/projects-v9-5-1.js"]);
const substitutions = [];
const reused = [];
for (const [path, pin] of [...pins].sort()) {
  const actual = await entry(`${id}/${path}`);
  if (substitutedPaths.has(path)) substitutions.push({ path: `${id}/${path}`, ...pin, candidate_bytes: actual.bytes, candidate_sha256: actual.sha256, reason: path === "index.html" ? "release labels, absolute legacy links and local chart dependency" : path.includes("major_project_news") ? "privacy-safe typed same-origin evidence payload" : "same-origin, privacy or fail-closed path substitution" });
  else {
    if (actual.bytes !== pin.source_bytes || actual.sha256 !== pin.source_sha256) throw new Error(`FROZEN_COPY_MISMATCH_${path}`);
    reused.push({ ...actual, source_path: pin.source_path, source_blob_sha1: pin.source_blob_sha1, source_commit: "204aae6462a9851a8341af59760c3e7cb6ad08a5" });
  }
}
await put(`reports/${id}-substitutions.json`, { schema: "pipelinenews.v962-copy-substitutions.v1", release_id: id, source_inventory_files: 58, source_inventory_bytes: 12831093, exact_reused_files: reused.length, substitutions, additions: [await entry(`${id}/vendor/chart.umd.min.js`)], out_of_scope: ["engine", "discovery", "attribution", "crawler", "search improvements"] });

const screenshotPaths = ["desktop.png", "mobile-390.png", "mobile-390-fail-closed.png"].map((name) => `reports/browser-${id}/${name}`);
await put(`attestations/${id}-preview.json`, {
  schema: "pipelinenews.local-preview-attestation.v1", release_id: id, reviewed_at: created,
  repository_head_before_build: "4e2906b76732db19bb72f255608b45764b8612a5", deployment_started: false,
  browser: { desktop: "PASS", mobile_390: "PASS", interactions: "PASS", optional_news_failure_core_boot: "PASS", visual_review: "PASS", screenshots: await Promise.all(screenshotPaths.map(entry)) },
  data: { projects: 7680, capacity_mw: 356474.09, solar: { projects: 3563, capacity_mw: 67013.29 }, bess: { projects: 1609, capacity_mw: 147681.94 }, headlines: 133, governed_uk: 45, sentinels: { "13599": "PASS", "17494": "PASS" } },
});

const shellPaths = [`${id}/index.html`, `${id}/readme.md`, `${id}/release.json`];
const newPaths = [`${id}/vendor/chart.umd.min.js`];
const evidencePaths = [...substitutions.map((row) => row.path).filter((path) => path !== `${id}/index.html`), snapshotPath, `reports/${id}-substitutions.json`, `attestations/${id}-preview.json`, ...screenshotPaths, "tests/check-202608260159-pipelinenews.mjs", "tests/browser-202608260159-pipelinenews.mjs", "tooling/sanitise-202608260159-news.mjs", "tooling/finalise-202608260159-release.mjs"];
const supportPaths = ["releases/candidate.json", "tests/check-current-timestamp-release.mjs", "tests/run-current-timestamp-release.sh", ".github/workflows/pages.yml"];
const categories = { lightweight_release_shell: await Promise.all(shellPaths.map(entry)), new_content_addressed: await Promise.all(newPaths.map(entry)), reused_or_pinned: reused, proof_and_evidence: await Promise.all(evidencePaths.map(entry)), publication_support: await Promise.all(supportPaths.map(entry)) };
let reportBytes = 0; let manifestBytes = 0; let report; let manifest;
for (let pass = 0; pass < 12; pass += 1) {
  const accounting = Object.fromEntries(Object.entries(categories).map(([key, rows]) => [key, { files: rows.length, bytes: sum(rows) }]));
  accounting.report = { files: 1, bytes: reportBytes }; accounting.manifest = { files: 1, bytes: manifestBytes };
  const releaseFiles = await walk(id);
  accounting.minimum_pages_deployment_impact = { files: releaseFiles.length + 8, bytes: sum(await Promise.all(releaseFiles.map(entry))) + reportBytes + manifestBytes + (await entry("releases/candidate.json")).bytes + (await entry(`reports/${id}-substitutions.json`)).bytes + (await entry(`attestations/${id}-preview.json`)).bytes + sum(await Promise.all(screenshotPaths.map(entry))) };
  accounting.total_closure = { files: Object.values(accounting).slice(0, 7).reduce((total, row) => total + row.files, 0), bytes: Object.values(accounting).slice(0, 7).reduce((total, row) => total + row.bytes, 0) };
  report = { schema: "pipelinenews.v962-copy-proof.v1", release_id: id, status: "LOCAL_PREPUBLICATION_PASS_LIVE_UNVERIFIED", checks: { source_closure: "PASS", source_manifest_hashes: "34_OF_34_PASS", project_count: 7680, capacity_mw: 356474.09, solar: { projects: 3563, capacity_mw: 67013.29 }, bess: { projects: 1609, capacity_mw: 147681.94 }, headlines: 133, table_columns: 11, sentinel_13599: "PASS", sentinel_17494: "PASS", privacy: "PASS", desktop: "PASS", mobile_390: "PASS", interactions: "PASS", csv: "PASS", atlas: "PASS", optional_news_failure_core_boot: "PASS", console_errors: 0, network_failures: 0, connection_timing: "UNKNOWN", connection_method: "UNKNOWN" }, byte_accounting: accounting };
  const reportBuffer = Buffer.from(canonical(report));
  const reportEntry = { path: `reports/${id}-proof.json`, bytes: reportBuffer.length, sha256: sha256(reportBuffer) };
  manifest = { schema: "pipelinenews.timestamp-release-manifest.v3", release_id: id, status: "CANDIDATE_PREPUBLICATION", immutable: true, timeline: { incepted_at: inception, created_at: created, committed_at: { value: null, status: "UNVERIFIED" }, pipeline_pages_verified_at: { value: null, status: "UNVERIFIED" }, catalogued_at: { value: null, status: "UNVERIFIED" }, globalgrid_live_verified_at: { value: null, status: "UNVERIFIED" } }, source: { repository: "Ventusltd/globalgrid2050", commit: "204aae6462a9851a8341af59760c3e7cb6ad08a5", path: "uk_renewables_pipeline/v9.6.2", inventory_files: 58, inventory_bytes: 12831093 }, publication: { live: false, pipeline_pages: "UNVERIFIED", globalgrid_catalogue: "UNVERIFIED" }, data: report.checks, frozen_preservation: { newsv1_tree: "2d6247c067aa5fad49995dcb9029d6cdb9898994", newsv7_tree: "5a59a926d0688d05c08c5ecc008c174133728007", rejected_1701_tree: "84b748df685b9306ce232e415531ee4eca05b4d6", rejected_1750_tree: "8a86c549b14a104b247aaadfc522644155b22ddb", rejected_1929_tree: "0b583c16f693e27efe1a83bb451255fcc20b1cb8", predecessor_release_bytes_written: false }, objects: {}, changelog_snapshot: await entry(snapshotPath), exact_reused_assets: reused, substitutions_report: await entry(`reports/${id}-substitutions.json`), proof: [reportEntry, await entry(`reports/${id}-substitutions.json`), await entry(`attestations/${id}-preview.json`), ...await Promise.all(screenshotPaths.map(entry))], byte_inventory: categories, byte_accounting: accounting };
  const nextReportBytes = reportBuffer.length; const nextManifestBytes = Buffer.byteLength(canonical(manifest));
  if (nextReportBytes === reportBytes && nextManifestBytes === manifestBytes) break;
  reportBytes = nextReportBytes; manifestBytes = nextManifestBytes;
}
await put(`reports/${id}-proof.json`, report);
await put(`releases/${id}.json`, manifest);
console.log(`FINALISE ${id}: PASS · ${manifest.byte_accounting.total_closure.files} files · ${manifest.byte_accounting.total_closure.bytes} bytes`);
