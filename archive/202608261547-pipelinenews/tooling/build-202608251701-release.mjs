import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, open, readFile, rename } from "node:fs/promises";
import { buildDiscoveryLedger } from "../discoveryv1/modules/discovery-ledger.mjs";
import { weeklyCoverageReport, publicationReadiness } from "../discoveryv1/modules/capture-recapture.mjs";
import { buildChargeFixtureProof } from "../attributionv1/modules/attribution-ledger.mjs";
import { buildRegisterFixtureProof } from "../attributionv1/modules/register-ingest.mjs";
import { buildDiscrepancyFixtureProof } from "../attributionv1/modules/discrepancy-view.mjs";

const repositoryRoot = new URL("../", import.meta.url);
const releaseId = "202608251701-pipelinenews";
const inceptedAt = "2026-08-25T17:01:00+01:00";
const evaluatedAt = "2026-08-25T16:01:00Z";
const cssPath = "objects/css/sha256/5c196d2b307e0426447dc96f1762bc6e39de98f2a39ae8667265198f09d5166e.css";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function writeAtomic(path, content, { json = false } = {}) {
  const target = new URL(path, repositoryRoot);
  await mkdir(dirname(fileURLToPath(target)), { recursive: true });
  const temporary = new URL(`.${target.pathname.split("/").pop()}.tmp`, target);
  const handle = await open(temporary, "w");
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
  const readBack = await readFile(temporary);
  if (json) JSON.parse(readBack.toString("utf8"));
  if (!readBack.equals(Buffer.from(content))) throw new Error(`atomic read-back mismatch: ${path}`);
  await rename(temporary, target);
}

async function record(role, path) {
  const bytes = await readFile(new URL(path, repositoryRoot));
  return { role, path, sha256: sha256(bytes), bytes: bytes.byteLength };
}

async function writeContentAddressed(directory, extension, content) {
  const digest = sha256(content);
  const path = `${directory}/${digest}.${extension}`;
  await writeAtomic(path, content, { json: extension === "json" });
  return { path, sha256: digest, bytes: Buffer.byteLength(content) };
}

const discoveryFixture = JSON.parse(await readFile(new URL("discoveryv1/fixtures/east-pye-discovery.v1.json", repositoryRoot)));
const chargeFixture = JSON.parse(await readFile(new URL("attributionv1/fixtures/charges.v1.json", repositoryRoot)));
const registerFixture = JSON.parse(await readFile(new URL("attributionv1/fixtures/register-sources.v1.json", repositoryRoot)));
const discrepancyFixture = JSON.parse(await readFile(new URL("attributionv1/fixtures/discrepancy.v1.json", repositoryRoot)));
const discoveryProof = buildDiscoveryLedger(discoveryFixture);
const chargeProof = buildChargeFixtureProof(chargeFixture);
const registerProof = buildRegisterFixtureProof(registerFixture);
const discrepancyProof = buildDiscrepancyFixtureProof(discrepancyFixture);

await writeAtomic("discoveryv1/data/discovery_mentions.json", serialize(discoveryProof), { json: true });
await writeAtomic("attributionv1/data/charge-fixture-proof.json", serialize(chargeProof), { json: true });
await writeAtomic("attributionv1/data/register-fixture-proof.json", serialize(registerProof), { json: true });
await writeAtomic("attributionv1/data/discrepancy-fixture-proof.json", serialize(discrepancyProof), { json: true });

const providerStatuses = ["brave", "google_cse", "serper"].map((provider) => ({ provider, status: "NOT_RUN_CANDIDATE", empty_result: false }));
const liveDiscovery = {
  schema: "pipelinenews.discovery-mentions.v1",
  release_id: releaseId,
  fixture_only: false,
  publication_status: "NOT_RUN_CANDIDATE",
  counts: { observations: 0, primary_match: 0, abstain: 0, rejected: 0 },
  mentions: [],
  provider_statuses: providerStatuses,
  publication_law: { empty_result_means_no_mentions: false, article_bodies_stored: false, outbound_result_pages_fetched: false }
};
const liveAttribution = {
  schema: "pipelinenews.attribution-roles.v1",
  release_id: releaseId,
  fixture_only: false,
  publication_status: "NOT_RUN_CANDIDATE",
  counts: { roles: 0, confirmed: 0, reported: 0, abstain: 0 },
  roles: [],
  publication_law: { person_key_allowed: false, contradicting_claims_coexist: true, repd_mutated: false }
};
const liveDiscrepancy = {
  schema: "pipelinenews.attribution-discrepancy.v1",
  release_id: releaseId,
  fixture_only: false,
  publication_status: "NOT_RUN_CANDIDATE",
  counts: { rows: 0 },
  rows: [],
  publication_law: { descriptive_status_only: true, allegation_or_person_assessment: false }
};
await writeAtomic("discoveryv1/data/live-discovery-mentions.json", serialize(liveDiscovery), { json: true });
await writeAtomic("attributionv1/data/attribution-roles.json", serialize(liveAttribution), { json: true });
await writeAtomic("attributionv1/data/discrepancy-view.json", serialize(liveDiscrepancy), { json: true });

const coverageFixture = { ...weeklyCoverageReport({ week_ending: "2026-08-30", search_index_events: 10, register_events: 12, overlap: 8 }), fixture_only: true };
const readiness = {
  schema: "pipelinenews.publication-readiness.v1",
  release_id: releaseId,
  ...publicationReadiness({ evaluated_at: evaluatedAt, latest_discovered_at: evaluatedAt, provider_statuses: providerStatuses }),
  official_frontier: { status: "LIVE_WITH_DEGRADED_PLANIT", source_snapshot_commit: "051a57175794ecb5c173c945cb0014ed79c29f3e" },
  decision: "KEEP_DATA_LAYERS_CANDIDATE_UNTIL_A_REAL_SEARCH_INDEX_RUN_IS_CURRENT"
};
await writeAtomic("reports/202608251701-coverage-fixture.json", serialize(coverageFixture), { json: true });
await writeAtomic("reports/202608251701-publication-readiness.json", serialize(readiness), { json: true });

const discoveryInputs = [
  ["east_pye_regression_fixture", "discoveryv1/fixtures/east-pye-discovery.v1.json"]
];
const discoveryContracts = [
  ["release_contract", "discoveryv1/contracts/release.discoveryv1.json"],
  ["mention_schema", "discoveryv1/contracts/discovery-mention.v1.schema.json"],
  ["search_adapter_contract", "discoveryv1/contracts/search-adapters.v1.json"],
  ["credibility_contract", "discoveryv1/contracts/credibility.v1.json"],
  ["binding_contract", "discoveryv1/contracts/binding.v1.json"]
];
const discoveryModules = [
  ["query_planner", "discoveryv1/modules/query-planner.mjs"],
  ["search_adapters", "discoveryv1/modules/search-adapters.mjs"],
  ["credibility", "discoveryv1/modules/credibility.mjs"],
  ["mention_normalizer", "discoveryv1/modules/mention-normalizer.mjs"],
  ["matcher_bridge", "discoveryv1/modules/matcher-bridge.mjs"],
  ["discovery_ledger", "discoveryv1/modules/discovery-ledger.mjs"],
  ["capture_recapture", "discoveryv1/modules/capture-recapture.mjs"]
];
const discoveryArtifacts = [
  ["regression_fixture_proof", "discoveryv1/data/discovery_mentions.json"],
  ["live_candidate_ledger", "discoveryv1/data/live-discovery-mentions.json"]
];
const attributionInputs = [
  ["charge_fixture", "attributionv1/fixtures/charges.v1.json"],
  ["register_fixture", "attributionv1/fixtures/register-sources.v1.json"],
  ["discrepancy_fixture", "attributionv1/fixtures/discrepancy.v1.json"]
];
const attributionContracts = [
  ["release_contract", "attributionv1/contracts/release.attributionv1.json"],
  ["role_schema", "attributionv1/contracts/attribution-role.v1.schema.json"],
  ["register_ingest_contract", "attributionv1/contracts/register-ingest.v1.json"]
];
const attributionModules = [
  ["attribution_ledger", "attributionv1/modules/attribution-ledger.mjs"],
  ["register_ingest", "attributionv1/modules/register-ingest.mjs"],
  ["discrepancy_view", "attributionv1/modules/discrepancy-view.mjs"]
];
const attributionArtifacts = [
  ["charge_fixture_proof", "attributionv1/data/charge-fixture-proof.json"],
  ["register_fixture_proof", "attributionv1/data/register-fixture-proof.json"],
  ["discrepancy_fixture_proof", "attributionv1/data/discrepancy-fixture-proof.json"],
  ["live_candidate_roles", "attributionv1/data/attribution-roles.json"],
  ["live_candidate_discrepancy", "attributionv1/data/discrepancy-view.json"]
];
const records = async (pairs) => Promise.all(pairs.map(([role, path]) => record(role, path)));

const discoveryManifest = {
  schema: "pipelinenews.data-build-manifest.v1",
  release: "discoveryv1",
  status: "CANDIDATE_NOT_CURRENT",
  built_at: inceptedAt,
  inputs: await records(discoveryInputs),
  contracts: await records(discoveryContracts),
  modules: await records(discoveryModules),
  artifacts: await records(discoveryArtifacts),
  tests: await records([
    ["batch_1", "discoveryv1/tests/check_batch1_schema.mjs"],
    ["batch_2", "discoveryv1/tests/check_batch2_planner_adapters.mjs"],
    ["batch_3", "discoveryv1/tests/check_batch3_normalize_credibility.mjs"],
    ["batch_4", "discoveryv1/tests/check_batch4_binding.mjs"]
  ]),
  acceptance: { regression_observations: 2, regression_primary_match: 1, regression_abstain: 1, live_observations: 0, real_search_index_run_completed: false }
};
const attributionManifest = {
  schema: "pipelinenews.data-build-manifest.v1",
  release: "attributionv1",
  status: "CANDIDATE_NOT_CURRENT",
  built_at: inceptedAt,
  inputs: await records(attributionInputs),
  contracts: await records(attributionContracts),
  modules: await records(attributionModules),
  artifacts: await records(attributionArtifacts),
  tests: await records([
    ["batch_5", "attributionv1/tests/check_batch5_attribution.mjs"],
    ["batch_6", "attributionv1/tests/check_batch6_registers.mjs"],
    ["batch_7", "attributionv1/tests/check_batch7_product.mjs"]
  ]),
  acceptance: { live_roles: 0, fixture_charge_roles: 1, fixture_register_roles: 4, fixture_discrepancy_rows: 3, person_key_allowed: false }
};
await writeAtomic("discoveryv1/data/build_manifest.json", serialize(discoveryManifest), { json: true });
await writeAtomic("attributionv1/data/build_manifest.json", serialize(attributionManifest), { json: true });

const releaseArtifact = {
  schema: "pipelinenews.discovery-attribution-candidate.v1",
  release_id: releaseId,
  display_title: "Pipeline News",
  incepted_at: inceptedAt,
  status: readiness.status,
  spine: { canonical_projects: 7680, canonical_id_format: "GG2050-REPD-<repd_ref>", repd_mutated: false },
  discovery: {
    live: liveDiscovery,
    regression_proof: { fixture_only: true, counts: discoveryProof.counts, east_pye_primary_match: "GG2050-REPD-17494" },
    providers: providerStatuses,
    daily_budget: 400,
    maximum_days_without_query: 30,
    event_credibility_not_identity: true,
    official_confirmation_confidence: 1
  },
  attribution: {
    live: liveAttribution,
    charge_fixture_proof: { fixture_only: true, counts: chargeProof.counts },
    register_fixture_proof: { fixture_only: true, counts: registerProof.counts },
    discrepancy_fixture_proof: { fixture_only: true, counts: discrepancyProof.counts },
    organisations_only: true,
    contradictions_coexist: true
  },
  coverage_fixture: coverageFixture,
  publication_readiness: readiness,
  machine_interfaces: {
    discovery_ledger: "discoveryv1/data/live-discovery-mentions.json",
    attribution_ledger: "attributionv1/data/attribution-roles.json",
    discrepancy_view: "attributionv1/data/discrepancy-view.json"
  },
  publication_law: {
    data_layers_only: true,
    newsv1_mutated: false,
    newsv7_mutated: false,
    article_bodies_stored: false,
    outbound_result_pages_fetched: false,
    person_key_allowed: false,
    no_live_claims_from_fixtures: true
  }
};
const artifactObject = await writeContentAddressed("objects/data/sha256", "json", serialize(releaseArtifact));

const uiSource = `const byId=(id)=>document.getElementById(id);\nconst getJson=async(url)=>{const response=await fetch(url);if(!response.ok)throw new Error(\`${"${response.status}"}: ${"${url}"}\`);return response.json();};\nasync function start(){const folderUrl=new URL("release.json",document.baseURI);const folder=await getJson(folderUrl);const manifestUrl=new URL(folder.manifest,folderUrl);const manifest=await getJson(manifestUrl);const root=new URL(folder.repository_root,folderUrl);const object=manifest.objects.artifacts.find((item)=>item.role==="discovery_attribution_candidate");const artifactUrl=new URL(object.path,root);const artifact=await getJson(artifactUrl);document.title=\`${"${manifest.display_title}"} — ${"${manifest.release_id}"}\`;byId("releaseId").textContent=manifest.release_id;byId("projects").textContent=artifact.spine.canonical_projects.toLocaleString("en-GB");byId("discoveryProof").textContent=artifact.discovery.regression_proof.counts.observations;byId("boundProof").textContent=artifact.discovery.regression_proof.counts.primary_match;byId("abstainProof").textContent=artifact.discovery.regression_proof.counts.abstain;byId("roleProof").textContent=artifact.attribution.charge_fixture_proof.counts.roles+artifact.attribution.register_fixture_proof.counts.roles;byId("discrepancyProof").textContent=artifact.attribution.discrepancy_fixture_proof.counts.rows;byId("readiness").textContent=artifact.publication_readiness.status;byId("manifest").href=manifestUrl;byId("artifact").href=artifactUrl;byId("state").textContent="Seven deterministic batches pass. Live search-index and attribution ledgers remain empty until a current governed run completes.";}\nstart().catch((error)=>{byId("state").textContent=\`Release failed closed: ${"${error.message}"}\`;byId("state").classList.add("error");});\n`;
const uiObject = await writeContentAddressed("objects/js/sha256", "mjs", uiSource);

const indexHtml = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Pipeline News governed discovery and organisational attribution candidate">
    <title>Pipeline News — ${releaseId}</title>
    <link rel="stylesheet" href="../${cssPath}">
  </head>
  <body>
    <main>
      <header>
        <p class="eyebrow">UK renewable-energy intelligence</p>
        <h1>Pipeline News</h1>
        <p id="releaseId" class="release-id">${releaseId}</p>
        <p class="status">DiscoveryV1 + AttributionV1 · governed data candidates</p>
      </header>
      <section aria-labelledby="scopeHeading">
        <p class="eyebrow">Canonical scope</p>
        <h2 id="scopeHeading">The complete admitted REPD spine stays unchanged</h2>
        <div class="grid"><div class="metric"><strong id="projects">—</strong><span>canonical projects</span></div><div class="metric"><strong id="discoveryProof">—</strong><span>discovery regression rows</span></div><div class="metric"><strong id="roleProof">—</strong><span>attribution fixture rows</span></div></div>
      </section>
      <section aria-labelledby="discoveryHeading">
        <p class="eyebrow">DiscoveryV1 proof</p>
        <h2 id="discoveryHeading">Noisy discovery remains; identity gates do not move</h2>
        <p><strong id="boundProof">—</strong> identifying snippet match · <strong id="abstainProof">—</strong> headline-only abstention.</p>
        <p>Search adapters may call configured third-party indexes only. They store a title, a snippet of at most 300 characters and an outbound URL; they never retrieve the result page.</p>
      </section>
      <section aria-labelledby="attributionHeading">
        <p class="eyebrow">AttributionV1 proof</p>
        <h2 id="attributionHeading">Organisations, roles, dates and sources</h2>
        <p><strong id="discrepancyProof">—</strong> neutral discrepancy fixture rows prove the three states: consistent, conflicts with confirmed, and no confirmed record. Contradictory claims coexist; nobody is profiled.</p>
      </section>
      <section aria-labelledby="readinessHeading">
        <p class="eyebrow">Currentness gate</p>
        <h2 id="readinessHeading">Publication status: <span id="readiness">—</span></h2>
        <p id="state" class="muted">Resolving content-addressed release objects…</p>
      </section>
      <section aria-labelledby="linksHeading">
        <p class="eyebrow">Evidence and recovery</p>
        <h2 id="linksHeading">Machine-readable first; browser-readable second</h2>
        <p class="links"><a id="manifest" href="../releases/${releaseId}.json">Release manifest</a><a id="artifact" href="#">Candidate artifact</a><a href="../discoveryv1/">DiscoveryV1 files</a><a href="../attributionv1/">AttributionV1 files</a><a href="../newsv7/">Frozen NewsV7 interface</a><a href="../202608251700-pipelinenews/">Previous timestamp</a><a href="https://github.com/Ventusltd/pipelinenews/tree/main/${releaseId}">View folder on GitHub</a></p>
      </section>
    </main>
    <script type="module" src="../${uiObject.path}"></script>
  </body>
</html>
`;
const folderPointer = {
  schema: "pipelinenews.release-folder-pointer.v1",
  release_id: releaseId,
  manifest: `../releases/${releaseId}.json`,
  repository_root: "../",
  shared_assets: true,
  duplicated_asset_directories: 0
};
const folderReadme = `# Pipeline News — ${releaseId}\n\nThis timestamped folder is a three-file release shell. All engines, contracts and data live in shared or content-addressed paths outside it.\n\nDiscoveryV1 and AttributionV1 are governed data candidates. Their seven regression batches pass, but their live ledgers remain empty until current external-source runs complete. NewsV1 and NewsV7 are unchanged.\n`;
await writeAtomic(`${releaseId}/index.html`, indexHtml);
await writeAtomic(`${releaseId}/release.json`, serialize(folderPointer), { json: true });
await writeAtomic(`${releaseId}/readme.md`, folderReadme);

const shellFiles = await records([
  ["app_entrypoint", `${releaseId}/index.html`],
  ["folder_release_pointer", `${releaseId}/release.json`],
  ["folder_readme", `${releaseId}/readme.md`]
]);
const manifest = {
  schema: "pipelinenews.release-manifest.v1",
  release_id: releaseId,
  app_title: "PipelineNews",
  display_title: "Pipeline News",
  incepted_at: inceptedAt,
  status: "CANDIDATE_NOT_CURRENT",
  feature: "governed indexed-web discovery and organisational delivery attribution",
  naming: { format: "yyyymmddhhmm-pipelinenews", time_basis: "Europe/London operator inception clock", path_slug: "pipelinenews", visible_title: "Pipeline News", lowercase_paths_required: true, lowercase_filenames_required: true, sequential_versions_retired: true },
  lineage: { parent_release: "202608251700-pipelinenews", parent_commit: "48d60afa3517bebc04783d69fd3cb0e578f4095a", frozen_versions_mutated: false, v1_v9_lineage_scan: "reports/202608251701-lineage-scan.json", newsv1_mutated: false, newsv7_mutated: false },
  app: { stable_route: "pipelinenews/", release_folder: `${releaseId}/`, entrypoint: `${releaseId}/index.html`, loader_contract: "manifest-resolved shared objects", ui_parent: "timestamp-shell", duplicated_asset_directories: 0, shell_files: shellFiles },
  object_store: { identity: "sha256", immutable: true, reuse_unchanged_objects: true },
  objects: {
    inputs: [await record("discovery_build_manifest", "discoveryv1/data/build_manifest.json"), await record("attribution_build_manifest", "attributionv1/data/build_manifest.json"), await record("official_frontier_input", "objects/data/sha256/b7f1740f7735f58997c8f128ef7236d57bb144fd5db23c8140739236af8bdabb.json")],
    modules: [{ role: "timestamped_release_shell", ...uiObject }, await record("official_frontier_engine", "objects/js/sha256/bf8b87533cda64fa145de9ca28998b29bf7f863f483a26a78e34fc3272fe9f7d.mjs")],
    artifacts: [{ role: "discovery_attribution_candidate", ...artifactObject }, await record("official_frontier_contract", "objects/data/sha256/b518e2c02a4059a8c07f226f9c0f284215acc4fc0f9f5790ce8ec19e49a5755d.json"), await record("live_discovery_ledger", "discoveryv1/data/live-discovery-mentions.json"), await record("live_attribution_ledger", "attributionv1/data/attribution-roles.json"), await record("live_discrepancy_view", "attributionv1/data/discrepancy-view.json")],
    css: [await record("shared_timestamp_shell", cssPath)],
    reports: [await record("lineage_scan", "reports/202608251701-lineage-scan.json"), await record("coverage_fixture", "reports/202608251701-coverage-fixture.json"), await record("publication_readiness", "reports/202608251701-publication-readiness.json")],
    parquet: [],
    geojson: []
  },
  build: { builder: await record("release_builder", "tooling/build-202608251701-release.mjs"), verifier: "tests/check-202608251701-pipelinenews.mjs", runner: "tests/run-current-timestamp-release.sh", deterministic_rebuild_required: true },
  acceptance: { independently_green_batches: 7, repd_projects: 7680, east_pye_primary_match: "GG2050-REPD-17494", headline_only_action: "ABSTAIN", credibility_gates_identity: false, article_body_stored: false, outbound_result_page_fetched: false, person_key_allowed: false, contradictory_claims_coexist: true, live_search_index_run_completed: false, lowercase_release_path: true, lowercase_new_filenames: true, duplicated_asset_directories: 0 },
  publication: { live: false, candidate_pointer_updated: true, stable_app_switched: false, reason: "Seven deterministic candidate batches pass; live discovery and attribution remain unpublished until a current governed source run completes." }
};
await writeAtomic(`releases/${releaseId}.json`, serialize(manifest), { json: true });
await writeAtomic("releases/current.json", serialize({ schema: "pipelinenews.release-pointer.v1", channel: "candidate", release_id: releaseId, manifest: `releases/${releaseId}.json`, updated_at: inceptedAt }), { json: true });

console.log(`BUILT ${releaseId} ${artifactObject.sha256} ${uiObject.sha256}`);
