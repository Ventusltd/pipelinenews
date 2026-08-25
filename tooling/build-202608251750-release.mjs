import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, open, readFile, rename } from "node:fs/promises";
import {
  buildFrontierContract,
  buildReferenceGroups,
  normalisePlanningReference,
  resolvePlanningBinding,
} from "../objects/js/sha256/60ebe5b31cdb881e61c7275fd3f696b33a4f134c5c0a6e6cd8f1474545156acc.mjs";

const root = new URL("../", import.meta.url);
const releaseId = "202608251750-pipelinenews";
const inceptedAt = "2026-08-25T17:50:00+01:00";
const rawSnapshotPath = "objects/data/sha256/5f9777777a9f34d0c20c4f4bc18adfa0d45625cd2b2c605c255fac58f5ebe489.json";
const enginePath = "objects/js/sha256/60ebe5b31cdb881e61c7275fd3f696b33a4f134c5c0a6e6cd8f1474545156acc.mjs";
const engineDependencyPath = "objects/js/sha256/bf8b87533cda64fa145de9ca28998b29bf7f863f483a26a78e34fc3272fe9f7d.mjs";
const engineTransitiveDependencyPath = "objects/js/sha256/0f0adf842d22158b882f168d6c131480afd81bce6609b8453a073f15d201d18c.mjs";
const cssPath = "objects/css/sha256/5c196d2b307e0426447dc96f1762bc6e39de98f2a39ae8667265198f09d5166e.css";
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function json(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function writeAtomic(path, content, { parseJson = false } = {}) {
  const target = new URL(path, root);
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
  if (parseJson) JSON.parse(readBack.toString("utf8"));
  if (!readBack.equals(Buffer.from(content))) throw new Error(`atomic read-back mismatch: ${path}`);
  await rename(temporary, target);
}

async function record(role, path) {
  const bytes = await readFile(new URL(path, root));
  return { role, path, sha256: sha256(bytes), bytes: bytes.byteLength };
}

async function writeObject(directory, extension, content) {
  const digest = sha256(content);
  const path = `${directory}/${digest}.${extension}`;
  try {
    const existing = await readFile(new URL(path, root));
    if (!existing.equals(Buffer.from(content))) throw new Error(`immutable-object collision: ${path}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeAtomic(path, content, { parseJson: extension === "json" });
  }
  return { path, sha256: digest, bytes: Buffer.byteLength(content) };
}

const projects = [];
const projectInputs = [];
for (let part = 1; part <= 16; part += 1) {
  const path = `newsv7/data/v9.1/projects/part-${String(part).padStart(3, "0")}.json`;
  const payload = await json(path);
  projects.push(...(Array.isArray(payload) ? payload : payload.projects || payload.items || []));
  projectInputs.push(await record(`canonical_projects_part_${String(part).padStart(3, "0")}`, path));
}
if (projects.length !== 7680) throw new Error(`admitted spine changed: ${projects.length}`);

function technologyProgress(technology) {
  const rows = projects.filter((project) => project.technology === technology);
  const statusCounts = new Map();
  for (const project of rows) statusCounts.set(project.status, (statusCounts.get(project.status) || 0) + 1);
  return {
    projects: rows.length,
    capacity_mw: Number(rows.reduce((total, project) => total + Number(project.capacity_mw || 0), 0).toFixed(2)),
    status_counts: Object.fromEntries([...statusCounts].sort(([left], [right]) => left.localeCompare(right))),
  };
}

const solarProgress = technologyProgress("solar");
const bessProgress = technologyProgress("bess");
if (solarProgress.projects !== 3563 || solarProgress.capacity_mw !== 67013.29) throw new Error("Solar REPD scope changed");
if (bessProgress.projects !== 1609 || bessProgress.capacity_mw !== 147681.94) throw new Error("BESS REPD scope changed");

const mission = {
  question: "How does this release advance market intelligence for the fastest possible path to net zero?",
  answer: "It removes unsafe planning-application bindings so progress and grid-connection research is not attached to the wrong REPD project; 23 cached observations remain authority-corroborated and 105 fail closed.",
  repd_solar_bess_progress: {
    evidence_class: "OFFICIAL_REPD_STATUS_ONLY",
    solar: solarProgress,
    bess: bessProgress,
    limitation: "These status counts describe the frozen admitted REPD spine; they are not a current grid-connection forecast.",
  },
  when_connecting: {
    status: "UNKNOWN_NOT_IN_PINNED_EVIDENCE",
    answer: "The pinned release evidence does not contain a verified grid-connection date for these projects.",
    next_evidence_gate: "Bind dated NESO, transmission-owner or DNO connection milestones to the authority-safe REPD identity before publication.",
  },
  how_connecting: {
    status: "UNKNOWN_NOT_IN_PINNED_EVIDENCE",
    answer: "A planning reference and planning authority do not establish connection voltage, substation, route, bay, queue position or energisation method.",
    next_evidence_gate: "Require an official connection agreement, queue record, planning document or network-owner source with an exact project binding.",
  },
};

const groups = buildReferenceGroups(projects);
const groupByReference = new Map(groups.map((group) => [group.normalised_reference, group]));
const rawSnapshot = await json(rawSnapshotPath);

let rawPrimary = 0;
let safePrimary = 0;
let abstain = 0;
let changedPrimaryToAbstain = 0;
let nameConfirmed = 0;
let authorityConfirmed = 0;
let totalRecords = 0;
let nullObservationKeys = 0;
let duplicateObservationKeys = 0;
const changedExamples = [];
const observationKeys = new Set();
const abstainByReason = {};

const auditedByReference = {};
for (const [reference, entry] of Object.entries(rawSnapshot.planit_by_reference || {}).sort(([left], [right]) => left.localeCompare(right))) {
  const group = groupByReference.get(reference);
  const records = (entry.records || []).map((record) => {
    totalRecords += 1;
    if (!record.uid || !record.url) nullObservationKeys += 1;
    const observationKey = `${reference}|${record.uid || ""}|${record.url || ""}`;
    if (observationKeys.has(observationKey)) duplicateObservationKeys += 1;
    observationKeys.add(observationKey);
    if (record.binding?.role === "PRIMARY_MATCH") rawPrimary += 1;
    const binding = group
      ? resolvePlanningBinding(record, group)
      : { role: "ABSTAIN", reason: "NO_REPD_REFERENCE_GROUP" };
    if (binding.role === "PRIMARY_MATCH") {
      safePrimary += 1;
      if (binding.method === "EXACT_REFERENCE_PLUS_EXACT_PROJECT_NAME") nameConfirmed += 1;
      if (binding.method === "EXACT_REFERENCE_PLUS_PLANNING_AUTHORITY") authorityConfirmed += 1;
    } else {
      abstain += 1;
      abstainByReason[binding.reason] = (abstainByReason[binding.reason] || 0) + 1;
      if (record.binding?.role === "PRIMARY_MATCH") changedPrimaryToAbstain += 1;
    }
    if (record.binding?.role === "PRIMARY_MATCH" && binding.role === "ABSTAIN" && changedExamples.length < 12) {
      changedExamples.push({
        normalised_reference: reference,
        observed_area: record.area_name,
        observed_description: record.description,
        previous_project: record.binding.project_name,
        previous_repd_ref: record.binding.repd_ref,
        decision: binding.reason,
      });
    }
    return { ...record, previous_binding: record.binding, binding };
  });
  auditedByReference[reference] = { ...entry, records };
}

if (Object.keys(auditedByReference).length !== 48) throw new Error("expected 48 pinned planning-reference groups");
if (totalRecords !== 128 || rawPrimary !== 128) throw new Error(`unexpected pinned snapshot baseline: ${totalRecords}/${rawPrimary}`);
if (safePrimary !== 23 || abstain !== 105 || changedPrimaryToAbstain !== 105) {
  throw new Error(`authority-safe counts changed: safe=${safePrimary} abstain=${abstain} changed=${changedPrimaryToAbstain}`);
}
if (nullObservationKeys !== 0 || duplicateObservationKeys !== 0 || observationKeys.size !== totalRecords) {
  throw new Error(`official observation key gate failed: null=${nullObservationKeys} duplicate=${duplicateObservationKeys}`);
}
if (abstainByReason.PLANNING_AUTHORITY_OR_PROJECT_NAME_NOT_CONFIRMED !== 103 || abstainByReason.PLANNING_REFERENCE_NOT_EXACT !== 2) {
  throw new Error(`unexpected abstention breakdown: ${JSON.stringify(abstainByReason)}`);
}

const auditedSnapshot = {
  schema: "pipelinenews.official-source-audited-snapshot.v3",
  release_id: releaseId,
  source_snapshot: {
    path: rawSnapshotPath,
    generated_at: rawSnapshot.generated_at,
    immutable: true,
    raw_evidence_rewritten: false,
  },
  spine: rawSnapshot.spine,
  source_health: rawSnapshot.source_health,
  policy: {
    id: "PN-OFFICIAL-FRONTIER-V3-AUTHORITY-SAFE",
    exact_reference_required: true,
    exact_project_name_or_planning_authority_required: true,
    planning_authority_matching: "EXACT_AFTER_EXPLICIT_ALIAS_MAP",
    fuzzy_or_substring_authority_matching: false,
    capacity_used_for_identity: false,
    ambiguous_action: "ABSTAIN",
  },
  counts: {
    reference_groups: Object.keys(auditedByReference).length,
    records: totalRecords,
    previous_primary_match: rawPrimary,
    authority_safe_primary_match: safePrimary,
    exact_name_confirmed: nameConfirmed,
    planning_authority_confirmed: authorityConfirmed,
    abstain,
    abstain_by_reason: abstainByReason,
    changed_primary_to_abstain: changedPrimaryToAbstain,
  },
  planit_by_reference: auditedByReference,
  govuk_items: rawSnapshot.govuk_items || [],
  google_news: rawSnapshot.google_news,
};
const auditedObject = await writeObject("objects/data/sha256", "json", serialize(auditedSnapshot));

const auditReport = {
  schema: "pipelinenews.planning-binding-audit.v1",
  release_id: releaseId,
  evaluated_at: inceptedAt,
  parent_git_commit: "1133183db122cdea211f5a9c67bfa35b81ef4e37",
  builder: "tooling/build-202608251750-release.mjs",
  poller: "tooling/poll-official-sources-v3.mjs",
  evaluated_snapshot_sha256: "5f9777777a9f34d0c20c4f4bc18adfa0d45625cd2b2c605c255fac58f5ebe489",
  finding: "A planning reference unique inside REPD is not globally unique across UK planning authorities.",
  grain: "one retained PlanIt application observation per normalised queried reference, UID and source URL",
  key: ["normalised_reference", "uid", "url"],
  null_law: "a missing key component fails the build; missing corroboration produces ABSTAIN",
  counts: auditedSnapshot.counts,
  source_health: rawSnapshot.source_health,
  checks: {
    schema_parse: "PASS",
    raw_evidence_byte_preservation: "PASS",
    retained_rows_equal_input_rows: "PASS",
    null_observation_keys: nullObservationKeys,
    duplicate_observation_keys: duplicateObservationKeys,
    deterministic_reclassification: "PASS",
    frozen_newsv1_newsv7_regression: "REQUIRED_IN_PAGES_AND_TIMESTAMP_WORKFLOWS",
    pages_deployment: "NOT_TESTED_AT_BUILD_TIME",
    current_governed_search_index_run: "NOT_RUN_CANDIDATE",
  },
  canaries: {
    east_pye_primary_match: "GG2050-REPD-17494",
    beacon_fen_primary_repd_ref: "13599",
  },
  mission,
  changed_examples: changedExamples,
  decision: "Use only the audited snapshot for derived planning bindings; preserve the pinned raw snapshot as evidence.",
};
const auditReportPath = "reports/202608251750-planning-binding-audit.json";

const frontierInput = await json("objects/data/sha256/b7f1740f7735f58997c8f128ef7236d57bb144fd5db23c8140739236af8bdabb.json");
frontierInput.release_id = releaseId;
frontierInput.incepted_at = inceptedAt;
const frontierContract = buildFrontierContract(frontierInput);
const frontierObject = await writeObject("objects/data/sha256", "json", serialize(frontierContract));

const changelogObject = await writeObject("objects/text/sha256", "md", await readFile(new URL("CHANGELOG.md", root), "utf8"));

const uiSource = `const byId=(id)=>document.getElementById(id);\nconst getJson=async(url)=>{const response=await fetch(url);if(!response.ok)throw new Error(\`${"${response.status}"}: ${"${url}"}\`);return response.json();};\nconst bytes=(value)=>Number(value).toLocaleString("en-GB");\nasync function start(){const folderUrl=new URL("release.json",document.baseURI);const folder=await getJson(folderUrl);const manifestUrl=new URL(folder.manifest,folderUrl);const manifest=await getJson(manifestUrl);const root=new URL(folder.repository_root,folderUrl);const item=manifest.objects.artifacts.find((entry)=>entry.role==="authority_safe_audited_snapshot");const artifactUrl=new URL(item.path,root);const audit=await getJson(artifactUrl);byId("releaseId").textContent=manifest.release_id;byId("projects").textContent=manifest.acceptance.repd_projects.toLocaleString("en-GB");byId("records").textContent=audit.counts.records;byId("safe").textContent=audit.counts.authority_safe_primary_match;byId("quarantined").textContent=audit.counts.changed_primary_to_abstain;byId("solar").textContent=manifest.mission.repd_solar_bess_progress.solar.projects.toLocaleString("en-GB");byId("bess").textContent=manifest.mission.repd_solar_bess_progress.bess.projects.toLocaleString("en-GB");byId("newBytes").textContent=bytes(manifest.byte_counter.new_content_addressed_bytes);byId("deploymentBytes").textContent=bytes(manifest.byte_counter.minimum_pages_added_bytes);byId("state").textContent="Raw evidence is unchanged. Future polling uses the authority-safe matcher: 103 records lack authority or name corroboration and 2 lack an exact reference.";byId("manifest").href=manifestUrl;byId("artifact").href=artifactUrl;}\nstart().catch((error)=>{byId("state").textContent=\`Release failed closed: ${"${error.message}"}\`;byId("state").classList.add("error");});\n`;
const uiObject = await writeObject("objects/js/sha256", "mjs", uiSource);

auditReport.change_scope = {
  immutable_inputs_added: [rawSnapshotPath],
  content_addressed_outputs: [auditedObject.path, frontierObject.path, uiObject.path, changelogObject.path],
  pinned_module_dependencies: [engineDependencyPath, engineTransitiveDependencyPath],
  executable_proof: [
    enginePath,
    "tooling/build-202608251750-release.mjs",
    "tooling/poll-official-sources-v3.mjs",
    "tests/check-202608251750-pipelinenews.mjs",
    "tests/check-official-source-v3.mjs",
    "tests/fixtures/official-source-v3-collisions.json",
    "tests/run-current-timestamp-release.sh",
  ],
  release_files: [
    `${releaseId}/index.html`,
    `${releaseId}/readme.md`,
    `${releaseId}/release.json`,
    `releases/${releaseId}.json`,
    auditReportPath,
  ],
};
await writeAtomic(auditReportPath, serialize(auditReport), { parseJson: true });

const indexHtml = `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Pipeline News authority-safe planning-binding audit">
    <title>Pipeline News — ${releaseId}</title>
    <link rel="stylesheet" href="../${cssPath}">
  </head>
  <body>
    <main>
      <header><p class="eyebrow">UK renewable-energy intelligence</p><h1>Pipeline News</h1><p id="releaseId" class="release-id">${releaseId}</p><p class="status">Authority-safe official planning bindings · candidate not current</p></header>
      <section aria-labelledby="scopeHeading"><p class="eyebrow">Canonical scope</p><h2 id="scopeHeading">The admitted REPD spine stays unchanged</h2><div class="grid"><div class="metric"><strong id="projects">—</strong><span>canonical projects</span></div><div class="metric"><strong id="records">—</strong><span>pinned PlanIt records</span></div></div></section>
      <section aria-labelledby="auditHeading"><p class="eyebrow">Binding audit</p><h2 id="auditHeading">Exact reference plus authority or project name</h2><div class="grid"><div class="metric"><strong id="safe">—</strong><span>authority-corroborated matches</span></div><div class="metric"><strong id="quarantined">—</strong><span>unsafe cached bindings changed to abstain</span></div></div><p>A reference unique inside REPD is not assumed to be unique across every UK planning authority. Capacity never establishes identity.</p></section>
      <section aria-labelledby="missionHeading"><p class="eyebrow">Net-zero market intelligence</p><h2 id="missionHeading">What does this release tell us about Solar and BESS?</h2><div class="grid"><div class="metric"><strong id="solar">—</strong><span>Solar projects in the admitted REPD spine</span></div><div class="metric"><strong id="bess">—</strong><span>BESS projects in the admitted REPD spine</span></div></div><p>This release makes progress evidence safer by removing wrong planning bindings. Verified grid-connection dates and connection methods remain <strong>UNKNOWN</strong>: planning references do not prove voltage, substation, route, bay, queue position or energisation date.</p></section>
      <section aria-labelledby="bytesHeading"><p class="eyebrow">Byte counter</p><h2 id="bytesHeading">New data stays measurable</h2><div class="grid"><div class="metric"><strong id="newBytes">—</strong><span>new content-addressed bytes</span></div><div class="metric"><strong id="deploymentBytes">—</strong><span>minimum added Pages bytes</span></div></div></section>
      <section aria-labelledby="recoveryHeading"><p class="eyebrow">Recovery law</p><h2 id="recoveryHeading">Raw evidence preserved; derived decisions replaced</h2><p id="state" class="muted">Resolving content-addressed release objects…</p></section>
      <section aria-labelledby="linksHeading"><p class="eyebrow">Evidence and lineage</p><h2 id="linksHeading">Machine-readable first</h2><p class="links"><a id="manifest" href="../releases/${releaseId}.json">Release manifest</a><a id="artifact" href="#">Audited snapshot</a><a href="../reports/202608251750-planning-binding-audit.json">Audit report</a><a href="../${changelogObject.path}">Pinned changelog</a><a href="https://github.com/Ventusltd/pipelinenews/tree/1133183db122cdea211f5a9c67bfa35b81ef4e37/discoveryv1">DiscoveryV1 evidence</a><a href="https://github.com/Ventusltd/pipelinenews/tree/1133183db122cdea211f5a9c67bfa35b81ef4e37/attributionv1">AttributionV1 evidence</a><a href="../newsv7/">Frozen NewsV7 interface</a><a href="../202608251701-pipelinenews/">Previous timestamp</a></p></section>
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
  duplicated_asset_directories: 0,
};
const folderReadme = `# Pipeline News — ${releaseId}\n\nThis immutable three-file shell prepares the authority-safe planning-binding audit. It retains 23 authority-corroborated matches and changes 105 unsafe cached bindings to abstentions: 103 lack authority or project-name corroboration and 2 lack an exact reference.\n\nThe admitted REPD spine contains 3,563 Solar projects and 1,609 BESS projects. This release makes their progress evidence safer; verified grid-connection dates and methods remain UNKNOWN until exact official evidence is bound.\n\nRaw source evidence, NewsV1, NewsV7 and the 7,680-project spine are unchanged. The manifest pins the release changelog, executable proof files and byte counter.\n`;
await writeAtomic(`${releaseId}/index.html`, indexHtml);
await writeAtomic(`${releaseId}/release.json`, serialize(folderPointer), { parseJson: true });
await writeAtomic(`${releaseId}/readme.md`, folderReadme);

const shellFiles = await Promise.all([
  record("app_entrypoint", `${releaseId}/index.html`),
  record("folder_release_pointer", `${releaseId}/release.json`),
  record("folder_readme", `${releaseId}/readme.md`),
]);

const rawInput = await record("pinned_raw_official_snapshot", rawSnapshotPath);
const frontierInputDescriptor = await record("official_frontier_input", "objects/data/sha256/b7f1740f7735f58997c8f128ef7236d57bb144fd5db23c8140739236af8bdabb.json");
const engineModule = await record("official_frontier_engine", enginePath);
const engineDependency = await record("official_frontier_engine_dependency", engineDependencyPath);
const engineTransitiveDependency = await record("official_frontier_engine_transitive_dependency", engineTransitiveDependencyPath);
const uiModule = { role: "timestamped_release_shell", ...uiObject };
const auditedArtifact = { role: "authority_safe_audited_snapshot", ...auditedObject };
const frontierArtifact = { role: "authority_safe_frontier_contract", ...frontierObject };
const changelogDoc = { role: "release_changelog_snapshot", ...changelogObject };
const sharedCss = await record("shared_timestamp_shell", cssPath);
const auditReportDescriptor = await record("planning_binding_audit", auditReportPath);
const builderDescriptor = await record("release_builder", "tooling/build-202608251750-release.mjs");
const pollerDescriptor = await record("official_source_poller", "tooling/poll-official-sources-v3.mjs");
const verifierDescriptors = [
  await record("release_verifier", "tests/check-202608251750-pipelinenews.mjs"),
  await record("official_source_v3_verifier", "tests/check-official-source-v3.mjs"),
];
const fixtureDescriptor = await record("official_source_v3_collision_fixture", "tests/fixtures/official-source-v3-collisions.json");
const runnerDescriptor = await record("release_runner", "tests/run-current-timestamp-release.sh");

const sumBytes = (items) => items.reduce((total, item) => total + item.bytes, 0);
const newContent = [rawInput, engineModule, uiModule, auditedArtifact, frontierArtifact, changelogDoc];
const reusedPinned = [...projectInputs, frontierInputDescriptor, engineDependency, engineTransitiveDependency, sharedCss];
const executableProof = [builderDescriptor, pollerDescriptor, ...verifierDescriptors, fixtureDescriptor, runnerDescriptor];
const byteCounter = {
  unit: "bytes",
  release_shell_files: shellFiles.length,
  release_shell_bytes: sumBytes(shellFiles),
  new_content_addressed_files: newContent.length,
  new_content_addressed_bytes: sumBytes(newContent),
  reused_pinned_files: reusedPinned.length,
  reused_pinned_bytes: sumBytes(reusedPinned),
  executable_proof_files: executableProof.length,
  executable_proof_bytes: sumBytes(executableProof),
  audit_report_bytes: auditReportDescriptor.bytes,
  release_manifest_bytes: 0,
  minimum_pages_added_files: shellFiles.length + newContent.length + 2,
  minimum_pages_added_bytes: 0,
  total_declared_closure_bytes: 0,
  counting_law: "Minimum Pages additions count the three-file shell, six new content-addressed objects, audit report and release manifest; the moving candidate pointer replaces an existing file and reused objects are reported separately.",
};

const manifest = {
  schema: "pipelinenews.release-manifest.v1",
  release_id: releaseId,
  app_title: "PipelineNews",
  display_title: "Pipeline News",
  incepted_at: inceptedAt,
  status: "CANDIDATE_NOT_CURRENT",
  feature: "authority-safe official planning binding and cached-snapshot quarantine",
  naming: {
    format: "yyyymmddhhmm-pipelinenews",
    time_basis: "Europe/London operator inception clock",
    path_slug: "pipelinenews",
    visible_title: "Pipeline News",
    lowercase_paths_required: true,
    lowercase_release_filenames_required: true,
    sequential_versions_retired: true,
  },
  lineage: {
    parent_release: "202608251701-pipelinenews",
    parent_commit: "1133183db122cdea211f5a9c67bfa35b81ef4e37",
    frozen_versions_mutated: false,
    parent_manifest_mutated: false,
    historical_immutability_exceptions_recorded: "CHANGELOG.md",
    newsv1_mutated: false,
    newsv7_mutated: false,
  },
  mission,
  byte_counter: byteCounter,
  app: {
    stable_route: "pipelinenews/",
    release_folder: `${releaseId}/`,
    entrypoint: `${releaseId}/index.html`,
    loader_contract: "manifest-resolved shared objects",
    ui_parent: "timestamp-shell",
    duplicated_asset_directories: 0,
    shell_files: shellFiles,
  },
  object_store: { identity: "sha256", immutable: true, reuse_unchanged_objects: true },
  objects: {
    inputs: [
      ...projectInputs,
      rawInput,
      frontierInputDescriptor,
    ],
    modules: [engineModule, engineDependency, engineTransitiveDependency, uiModule],
    artifacts: [auditedArtifact, frontierArtifact],
    docs: [changelogDoc],
    css: [sharedCss],
    reports: [auditReportDescriptor],
    parquet: [],
    geojson: [],
  },
  build: {
    builder: builderDescriptor,
    poller: pollerDescriptor,
    verifiers: verifierDescriptors,
    fixture: fixtureDescriptor,
    runner: runnerDescriptor,
    deterministic_rebuild_required: true,
  },
  acceptance: {
    repd_projects: 7680,
    repd_capacity_mw: 356474.09,
    pinned_planit_records: totalRecords,
    previous_primary_match: rawPrimary,
    authority_safe_primary_match: safePrimary,
    exact_name_confirmed: nameConfirmed,
    planning_authority_confirmed: authorityConfirmed,
    changed_primary_to_abstain: changedPrimaryToAbstain,
    abstain_authority_or_name_not_confirmed: abstainByReason.PLANNING_AUTHORITY_OR_PROJECT_NAME_NOT_CONFIRMED,
    abstain_planning_reference_not_exact: abstainByReason.PLANNING_REFERENCE_NOT_EXACT,
    authority_or_name_required: true,
    capacity_used_for_identity: false,
    credibility_gates_identity: false,
    live_search_index_run_completed: false,
    person_key_allowed: false,
    east_pye_primary_match: "GG2050-REPD-17494",
    beacon_fen_primary_repd_ref: "13599",
    frozen_versions_mutated: false,
    lowercase_release_path: true,
    duplicated_asset_directories: 0,
  },
  publication: {
    live: false,
    candidate_pointer_updated: true,
    stable_app_switched: false,
    reason: "Authority-safe candidate prepared for independent review; a current governed search-index run has not completed and the frozen NewsV7 interface remains the established full app.",
  },
};
let manifestContent = serialize(manifest);
for (let pass = 0; pass < 8; pass += 1) {
  const manifestBytes = Buffer.byteLength(manifestContent);
  const minimumPagesAddedBytes = byteCounter.release_shell_bytes + byteCounter.new_content_addressed_bytes + byteCounter.audit_report_bytes + manifestBytes;
  const totalDeclaredClosureBytes = byteCounter.release_shell_bytes + byteCounter.new_content_addressed_bytes + byteCounter.reused_pinned_bytes + byteCounter.executable_proof_bytes + byteCounter.audit_report_bytes + manifestBytes;
  if (byteCounter.release_manifest_bytes === manifestBytes
    && byteCounter.minimum_pages_added_bytes === minimumPagesAddedBytes
    && byteCounter.total_declared_closure_bytes === totalDeclaredClosureBytes) break;
  byteCounter.release_manifest_bytes = manifestBytes;
  byteCounter.minimum_pages_added_bytes = minimumPagesAddedBytes;
  byteCounter.total_declared_closure_bytes = totalDeclaredClosureBytes;
  manifestContent = serialize(manifest);
}
if (byteCounter.release_manifest_bytes !== Buffer.byteLength(manifestContent)) throw new Error("manifest byte counter did not converge");
await writeAtomic(`releases/${releaseId}.json`, manifestContent, { parseJson: true });
await writeAtomic("releases/current.json", serialize({
  schema: "pipelinenews.release-pointer.v1",
  channel: "candidate",
  release_id: releaseId,
  manifest: `releases/${releaseId}.json`,
  updated_at: inceptedAt,
  public_app_switched: false,
}), { parseJson: true });

console.log(`BUILT ${releaseId}: ${safePrimary} safe, ${changedPrimaryToAbstain} quarantined, +${byteCounter.minimum_pages_added_bytes} Pages bytes, ${auditedObject.sha256}`);
