import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GENERATION = "202608272048";
const PARENT_GENERATION = "202608271524";
const AUDIT_GENERATION = "202608271656";
const NEWS_SOURCE_GENERATION = "202608270844";
const ROLLBACK_GENERATION = "202608270055";
const ATLAS_GENERATION = "202608271329";
const SOURCE_PARENT_COMMIT = "8c3d9443f175aacaf533b9148fe80106b207fd22";
const AUDIT_SOURCE_COMMIT = "6be8d21567e97a772d36d472a74e88a00d99a7c1";
const AUDIT_EVIDENCE_COMMIT = "bce84eb32b7464e9b560c9e9aa9f110feed62df7";
const PROTECTED_RECOVERY_COMMIT = "77bda8c3809d02550d06a1c4154315f56d1120fb";
const NAME = "Mobile Orientation Repair + Live News Discovery + Chronology + Atlas V8 Deep-Link";
const COMPILER_FILE = `${GENERATION}-compile-v8-mobile-orientation.mjs`;
const COMPILER_METHOD = "pipelinenews-v8-mobile-orientation-css-v3";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_POSTURE = Object.freeze({
  owner: "Ventus Ltd",
  application: "non-commercial-open-source",
  publisher_redistribution_rights: "source-specific-not-inferred",
});

const INPUTS = Object.freeze({
  parentManifest: "build/202608271524-v8-fast-site-manifest.json",
  parentHtml: "releases/202608271524-v8-fast-candidate.html",
  parentRuntime: "releases/javascript/202608271524-v8-fast-runtime.js",
  parentRegistry: "releases/data/202608271524-v8-fast-registry.json",
  parentNews: "releases/data/202608271524-fd2212a8c76d-v8-fast-news.json",
  baseStyle: "releases/styles/202608270055-v8-fast.css",
  atlasCartridge: "releases/javascript/202608271329-atlas-v8-deep-link-cartridge.js",
  orientationStyle: `ui/styles/${GENERATION}-orientation.css`,
  auditContract: `atman/${AUDIT_GENERATION}-mobile-ui-invariants.mjs`,
  auditVerifier: `atman/${AUDIT_GENERATION}-verify-mobile-ui-browser.mjs`,
  auditComparator: `atman/${AUDIT_GENERATION}-compare-mobile-ui.mjs`,
  auditSourceManifest: `manifests/${AUDIT_GENERATION}-mobile-ui-comparator.json`,
  auditMetrics: `atman/reports/${AUDIT_GENERATION}/metrics.json`,
  auditReport: `atman/reports/${AUDIT_GENERATION}/report.md`,
  auditArtifactManifest: `atman/reports/${AUDIT_GENERATION}/artifact-manifest.json`,
});

const PINNED_SHA256 = Object.freeze({
  [INPUTS.parentManifest]: "fef485accb1509297dbc64c5e30806c60d977bedb06591e8b324e7bbab06e818",
  [INPUTS.parentHtml]: "fc457af07b26eafa19505f7daa160ce1e870146a056a0728fbb17e8dafd3e049",
  [INPUTS.parentRuntime]: "95637eb69cedacb124f980dabd4881a652cf641eefd73bdf37e05900f84f0c92",
  [INPUTS.parentRegistry]: "db1a4899a47668f80b40b2ac3e4091ea5e244c7757b47a3ae2336a5c5aa264fb",
  [INPUTS.parentNews]: "00cfbc6243e83cca274707a19b7848f776ce223d5e02808164e213dde887a8be",
  [INPUTS.baseStyle]: "d6c8100dbf79dd02f65d78e4fc9cacae92f2e4b5a749ea0fd3ff481fe5bb4792",
  [INPUTS.atlasCartridge]: "d8e997acea1ed6c628e4d69f27653a5fe9a21bb459ff95d4ee0a7d040b431ff7",
  [INPUTS.orientationStyle]: "e9e1cbefd49f10d2d3b06f31274357a947672242159e9f1b50434ca175a870bc",
  [INPUTS.auditContract]: "3dbee93a7de2cc01f9fece3e3318b1f151871231ae254bff9cc67fe4fd69aae2",
  [INPUTS.auditVerifier]: "f0f383cfd1a6ad0cc12f46a8a1173831ac7fed506cf4eabb59ae2d3e0ca68ca7",
  [INPUTS.auditComparator]: "5fb162b9396db069dcd754c3deddc0bb0287522250265108426e7059ea342147",
  [INPUTS.auditSourceManifest]: "45e33fc5a14cbb73790bfa6d5cab6dcbc86d0f588b7244703adc623662c4dfe7",
  [INPUTS.auditMetrics]: "c4bbf6697c0ad92a57f3b4696499bdaa81e979ff6118d1aee8ae46a12ea06894",
  [INPUTS.auditReport]: "88a2915e0c62f10a4261a6e886379abab6c590376ef521ceaa3609860043c82c",
  [INPUTS.auditArtifactManifest]: "7c631ecae2ea793e5790886a1afa4f51ac19bb7586f03cb1d0bfa04a8cf1ebbe",
});

const HTML_OUTPUT = `releases/${GENERATION}-v8-fast-candidate.html`;
const RUNTIME_OUTPUT = `releases/javascript/${GENERATION}-v8-fast-runtime.js`;
const REGISTRY_OUTPUT = `releases/data/${GENERATION}-v8-fast-registry.json`;
const STYLE_OUTPUT = `releases/styles/${GENERATION}-orientation.css`;
const MANIFEST_OUTPUT = `build/${GENERATION}-v8-fast-site-manifest.json`;

function absolute(relativePath) {
  assert.equal(path.posix.normalize(relativePath), relativePath, `path is not normalised: ${relativePath}`);
  const resolved = path.resolve(ROOT, relativePath);
  assert.ok(resolved.startsWith(`${ROOT}${path.sep}`), `path escapes repository: ${relativePath}`);
  return resolved;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function jsonBytes(value, pretty = false) {
  return Buffer.from(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`);
}

function replaceExactly(source, from, to, expectedCount = 1) {
  const count = source.split(from).length - 1;
  assert.equal(count, expectedCount, `replacement count changed for ${JSON.stringify(from)}`);
  return source.split(from).join(to);
}

function rewriteReleaseNavigation(source) {
  const opening = '    <nav class="nav">';
  const closing = "\n    </nav>";
  const start = source.indexOf(opening);
  assert.ok(start >= 0, "release navigation opening tag is absent");
  const closingStart = source.indexOf(closing, start);
  assert.ok(closingStart > start, "release navigation closing tag is absent");
  const end = closingStart + closing.length;
  const original = source.slice(start, end);
  let mobile = replaceExactly(
    original,
    opening,
    '    <nav class="nav nav-mobile" id="releaseMenu" popover="auto" aria-label="Release links">',
  );
  mobile = replaceExactly(mobile, '      <a href="#" id="export">EXPORT CSV</a>\n', "");
  const desktop = replaceExactly(
    original,
    opening,
    '    <nav class="nav nav-desktop" aria-label="Release and export links">',
  );
  const replacement = [
    '    <button class="release-menu-opener" type="button" popovertarget="releaseMenu" popovertargetaction="toggle" aria-controls="releaseMenu">RELEASES</button>',
    mobile,
    desktop,
  ].join("\n");
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

async function readPinned(relativePath) {
  const metadata = await lstat(absolute(relativePath));
  assert.ok(metadata.isFile() && !metadata.isSymbolicLink(),
    `pinned input is not a regular file: ${relativePath}`);
  const bytes = await readFile(absolute(relativePath));
  assert.equal(sha256(bytes), PINNED_SHA256[relativePath], `pinned input changed: ${relativePath}`);
  return bytes;
}

async function readDeclaredAsset(relativePath, declared, label) {
  const metadata = await lstat(absolute(relativePath));
  assert.ok(metadata.isFile() && !metadata.isSymbolicLink(),
    `${label} is not a regular file: ${relativePath}`);
  const bytes = await readFile(absolute(relativePath));
  assert.equal(bytes.length, declared.bytes, `${label} byte count changed: ${relativePath}`);
  assert.equal(sha256(bytes), declared.sha256, `${label} hash changed: ${relativePath}`);
  return bytes;
}

function normalisedFailures(failures) {
  return failures
    .map(({ invariant, cell }) => ({ invariant, cell }))
    .sort((left, right) => `${left.invariant}/${left.cell}`.localeCompare(`${right.invariant}/${right.cell}`));
}

function validateAuditEvidence(metrics, report, artifactManifest) {
  assert.equal(metrics.schema, "pipelinenews.mobile-ui-comparison.v1");
  assert.equal(metrics.generation, AUDIT_GENERATION);
  assert.equal(metrics.source_commit, AUDIT_SOURCE_COMMIT);
  assert.equal(metrics.candidate_generation, PARENT_GENERATION);
  assert.equal(metrics.mode, "audit");
  assert.equal(metrics.contract.path, `atman/${AUDIT_GENERATION}-mobile-ui-invariants.mjs`);
  assert.equal(metrics.contract.sha256, PINNED_SHA256[INPUTS.auditContract]);
  assert.equal(metrics.verdict.producer_status, "PASS");
  assert.equal(metrics.verdict.candidate_gate.status, "FAIL");
  assert.ok(metrics.verdict.candidate_gate.failures.length > 0);
  assert.equal(metrics.verdict.baseline_characterisation.status, "RECORDED");
  assert.equal(metrics.records.length, 23);
  assert.ok(report.includes(AUDIT_GENERATION));
  assert.ok(report.includes(AUDIT_SOURCE_COMMIT));
  assert.equal(artifactManifest.schema, "pipelinenews.mobile-ui-comparator-artifacts.v1");
  assert.equal(artifactManifest.generation, AUDIT_GENERATION);
  assert.equal(artifactManifest.source_commit, AUDIT_SOURCE_COMMIT);
  return normalisedFailures(metrics.verdict.candidate_gate.failures);
}

function rewriteRuntime(parentSource, cacheIdentity) {
  let source = parentSource;
  source = replaceExactly(source, `const GENERATION = "${PARENT_GENERATION}";`, `const GENERATION = "${GENERATION}";`);
  source = replaceExactly(
    source,
    'const EXPECTED_COMPILER_METHOD = "pipelinenews-v8-news-chronology-stable-sort-v1";',
    `const EXPECTED_COMPILER_METHOD = "${COMPILER_METHOD}";`,
  );
  source = replaceExactly(
    source,
    'const EXPECTED_CACHE_IDENTITY = "fd2212a8c76d9fb97ec50cc97b1fefa104ae8cd7ac33cd4b4adcd57c8149e844";',
    `const EXPECTED_CACHE_IDENTITY = "${cacheIdentity}";`,
  );
  source = replaceExactly(
    source,
    "Live News Discovery + chronology candidate ·",
    "Mobile orientation repair + live news chronology candidate ·",
  );
  assert.ok(source.startsWith('import { buildAtlasV8DeepLink } from "./202608271329-atlas-v8-deep-link-cartridge.js";'));
  assert.equal(source.match(/addEventListener\(["'](?:resize|orientationchange)["']/gu)?.length || 0, 0);
  assert.equal(source.match(/matchMedia\(/gu)?.length || 0, 0);
  return `${source.trimEnd()}\n`;
}

function rewriteHtml(parentSource) {
  let source = parentSource;
  source = replaceExactly(
    source,
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  );
  source = replaceExactly(
    source,
    '<link rel="stylesheet" href="styles/202608270055-v8-fast.css">',
    `<link rel="stylesheet" href="styles/202608270055-v8-fast.css">\n  <link rel="stylesheet" href="styles/${GENERATION}-orientation.css">`,
  );
  source = replaceExactly(source, `data-fast-generation="${PARENT_GENERATION}"`, `data-fast-generation="${GENERATION}"`);
  source = replaceExactly(
    source,
    `javascript/${PARENT_GENERATION}-v8-fast-runtime.js`,
    `javascript/${GENERATION}-v8-fast-runtime.js`,
  );
  source = rewriteReleaseNavigation(source);
  source = source.replaceAll(
    "LIVE NEWS DISCOVERY + CHRONOLOGY + ATLAS V8 DEEP-LINK CANDIDATE",
    "MOBILE ORIENTATION REPAIR + LIVE NEWS DISCOVERY + CHRONOLOGY + ATLAS V8 DEEP-LINK CANDIDATE",
  );
  assert.equal(source.match(/viewport-fit=cover/gu)?.length, 1);
  assert.equal(source.match(/id="releaseMenu"/gu)?.length, 1);
  assert.equal(source.match(/popovertarget="releaseMenu"/gu)?.length, 1);
  assert.equal(source.match(/popover="auto"/gu)?.length, 1);
  assert.equal(source.match(/class="nav nav-desktop"/gu)?.length, 1);
  assert.equal(source.match(/id="export"/gu)?.length, 1);
  assert.ok(source.includes("NOT DEPLOYED"));
  assert.ok(!source.includes("releases/current.json"));
  return `${source.trimEnd()}\n`;
}

async function build() {
  assert.equal(path.basename(fileURLToPath(import.meta.url)), COMPILER_FILE);
  const sourceCommit = process.env.SOURCE_COMMIT;
  const runId = process.env.GITHUB_RUN_ID;
  assert.match(sourceCommit || "", /^[a-f0-9]{40}$/u, "SOURCE_COMMIT must be an exact Git SHA");
  assert.match(runId || "", /^\d+$/u, "GITHUB_RUN_ID must be numeric");
  assert.ok(BigInt(GENERATION) > 202608272015n, "generation must supersede failed 202608272015");

  const compilerBytes = await readFile(fileURLToPath(import.meta.url));
  const compilerSha256 = sha256(compilerBytes);
  const inputs = {};
  const inputRecords = [];
  for (const [name, relativePath] of Object.entries(INPUTS)) {
    const bytes = await readPinned(relativePath);
    inputs[name] = bytes;
    inputRecords.push({ path: relativePath, bytes: bytes.length, sha256: sha256(bytes) });
  }

  const parentManifest = JSON.parse(inputs.parentManifest);
  const parentRegistry = JSON.parse(inputs.parentRegistry);
  const parentNews = JSON.parse(inputs.parentNews);
  const auditMetrics = JSON.parse(inputs.auditMetrics);
  const auditArtifactManifest = JSON.parse(inputs.auditArtifactManifest);
  const auditSourceManifest = JSON.parse(inputs.auditSourceManifest);
  const auditFailures = validateAuditEvidence(
    auditMetrics,
    inputs.auditReport.toString("utf8"),
    auditArtifactManifest,
  );
  assert.equal(auditSourceManifest.schema, "pipelinenews.mobile-ui-comparator-manifest.v1");
  assert.equal(auditSourceManifest.generation, AUDIT_GENERATION);
  assert.equal(auditSourceManifest.candidate_generation, PARENT_GENERATION);
  assert.equal(auditSourceManifest.execution.aggregate_record_count, 23);
  assert.equal(auditSourceManifest.execution.rotation_viewport_driver,
    "playwright-page-set-viewport-size");
  assert.equal(parentManifest.schema, "pipelinenews.v8.fast-site-candidate.v1");
  assert.equal(parentManifest.generation, PARENT_GENERATION);
  assert.equal(parentManifest.source_commit, "7b07b139f8e9764d948e512d9b18b854faea14c9");
  assert.equal(parentManifest.deployment, "not-authorised");
  assert.equal(parentRegistry.generation, PARENT_GENERATION);
  assert.equal(parentRegistry.cache_identity, parentManifest.cache_identity);
  assert.equal(parentNews.generation, PARENT_GENERATION);
  assert.equal(parentNews.cache_identity, parentManifest.cache_identity);
  assert.equal(parentNews.rows.length, 136);
  assert.equal(parentRegistry.totals.project_count, 7_680);
  assert.equal(parentRegistry.totals.capacity_mw, 356_474.09);
  assert.equal(parentRegistry.news_counts.all, 136);
  assert.equal(parentRegistry.news_counts.uk, 47);
  assert.equal(parentRegistry.news_counts.international, 19);
  assert.equal(parentRegistry.cache_contract.runtime.physical_project_rows, 50);
  assert.equal(parentRegistry.cache_contract.runtime.physical_news_rows, 30);
  assert.equal(parentRegistry.cache_contract.runtime.detail_fetch_concurrency, 4);
  assert.equal(
    parentRegistry.cartridges.atlas_v8_deep_link.sha256,
    PINNED_SHA256[INPUTS.atlasCartridge],
  );

  const inheritedAssetDeclarations = [
    [path.posix.join("releases", parentRegistry.assets.projects.path), parentRegistry.assets.projects, "projects asset"],
    [path.posix.join("releases", parentRegistry.assets.search.path), parentRegistry.assets.search, "search asset"],
    [path.posix.join("releases", parentRegistry.assets.chart.path), parentRegistry.assets.chart, "vendor asset"],
    ...parentRegistry.detail_partitions.map((record, index) => [
      path.posix.normalize(path.posix.join("releases", record.path)),
      record,
      `detail partition ${index + 1}`,
    ]),
  ];
  assert.equal(parentRegistry.detail_partitions.length, 16);
  assert.equal(inheritedAssetDeclarations.length, 19);
  assert.equal(new Set(inheritedAssetDeclarations.map(([relativePath]) => relativePath)).size,
    inheritedAssetDeclarations.length, "inherited closure repeats an asset path");
  for (const [relativePath, declaration, label] of inheritedAssetDeclarations) {
    const bytes = await readDeclaredAsset(relativePath, declaration, label);
    inputRecords.push({ path: relativePath, bytes: bytes.length, sha256: sha256(bytes) });
  }

  const orientationStyleBytes = inputs.orientationStyle;
  const cacheContract = {
    schema: "pipelinenews.v8.mobile-orientation-cache-contract.v1",
    compiler_method: COMPILER_METHOD,
    compiler: { path: `index/${COMPILER_FILE}`, sha256: compilerSha256 },
    project_posture: PROJECT_POSTURE,
    source_parent_commit: SOURCE_PARENT_COMMIT,
    protected_recovery_commit: PROTECTED_RECOVERY_COMMIT,
    parent_generation: PARENT_GENERATION,
    news_source_generation: NEWS_SOURCE_GENERATION,
    rollback_generation: ROLLBACK_GENERATION,
    parent_cache_identity: parentManifest.cache_identity,
    sources: Object.fromEntries(Object.entries(INPUTS).map(([name, relativePath]) => [
      `${name}_sha256`, PINNED_SHA256[relativePath],
    ])),
    project_index: parentRegistry.cache_contract.project_index,
    search_index: parentRegistry.cache_contract.search_index,
    news_index: parentRegistry.cache_contract.news_index,
    runtime: parentRegistry.cache_contract.runtime,
    news_ordering: parentRegistry.cache_contract.news_ordering,
    atlas_deep_link: parentRegistry.cache_contract.atlas_deep_link,
    mobile_orientation: {
      schema: "pipelinenews.v8.mobile-orientation-repair.v1",
      audit_generation: AUDIT_GENERATION,
      audit_source_commit: AUDIT_SOURCE_COMMIT,
      audit_evidence_commit: AUDIT_EVIDENCE_COMMIT,
      audit_candidate_generation: auditMetrics.candidate_generation,
      audit_failures: auditFailures,
      unchanged_contract: {
        path: INPUTS.auditContract,
        sha256: PINNED_SHA256[INPUTS.auditContract],
      },
      unchanged_verifier: {
        path: INPUTS.auditVerifier,
        sha256: PINNED_SHA256[INPUTS.auditVerifier],
      },
      unchanged_comparator: {
        path: INPUTS.auditComparator,
        sha256: PINNED_SHA256[INPUTS.auditComparator],
      },
      base_style: {
        path: "styles/202608270055-v8-fast.css",
        sha256: PINNED_SHA256[INPUTS.baseStyle],
      },
      additive_style: {
        path: `styles/${GENERATION}-orientation.css`,
        sha256: sha256(orientationStyleBytes),
        bytes: orientationStyleBytes.length,
      },
      viewport_meta: "width=device-width,initial-scale=1,viewport-fit=cover",
      short_viewport_gates: {
        narrow_table_density: "(orientation: landscape) and (max-height: 500px) and (max-width: 768px)",
        cockpit: "(orientation: landscape) and (max-height: 500px) and (min-width: 769px)",
      },
      inherited_narrow_mobile_path: "max-width:768px-with-landscape-table-density-only",
      rotation_implementation: "css-only-no-resize-or-orientation-handler",
      release_menu: "native-auto-popover-light-dismiss",
      safe_area: "env-safe-area-insets",
      safe_area_hit_shield: "fixed-bottom-env-safe-area-inset-bottom",
      portrait_parity: "stable-component-pixel-identity-with-declared-accessibility-masks",
      reconciliation: {
        proven_css_source: "local-202608271710-draft",
        excluded_timestamp: "202608272000",
        failed_attempts: [
          { generation: "202608271906", run_id: "33102634868", failure: "release-relative-assets-not-staged" },
          { generation: "202608271934", run_id: "33104418233", failure: "runtime-identity-1524-expected-1934" },
          { generation: "202608271957", run_id: "33106228801", failure: "runtime-identity-1524-expected-1957" },
          {
            generation: "202608272001",
            run_id: "33106832748",
            failure: "candidate-invariant-gate",
            failed_cells: ["L1/I1", "L2/I1", "L3/I10", "L4/I1", "P1/I1", "P1/I7", "P2/I1"],
          },
          {
            generation: "202608272015",
            run_id: "33110044657",
            failure: "compatibility-esm-module-resolution",
            failed_job: "compatibility-browser",
            details: [
              "rewritten-chronology-verifier-under-runner-temp-could-not-resolve-repo-local-playwright",
              "commit-candidate-explicit-needs-omitted-compatibility-browser-but-aggregate-gate-transitively-blocked-publication",
            ],
            successful_jobs: ["build", "candidate-static", "original-static", "rotations"],
            baseline_status_at_handover: "in-progress",
            publication: "skipped-fail-closed",
          },
        ],
      },
    },
    reuse: {
      project_generation: ROLLBACK_GENERATION,
      search_generation: ROLLBACK_GENERATION,
      news_generation: PARENT_GENERATION,
      detail_generation: "202608261927",
      atlas_deep_link_generation: ATLAS_GENERATION,
      base_style_generation: ROLLBACK_GENERATION,
    },
  };
  const cacheIdentity = sha256(Buffer.from(JSON.stringify(cacheContract)));
  const registry = {
    ...parentRegistry,
    generation: GENERATION,
    name: NAME,
    compiler_method: COMPILER_METHOD,
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    project_posture: PROJECT_POSTURE,
    assets: { ...parentRegistry.assets },
    cartridges: {
      ...parentRegistry.cartridges,
      mobile_orientation: {
        schema: "pipelinenews.v8.mobile-orientation-repair.v1",
        generation: GENERATION,
        path: `styles/${GENERATION}-orientation.css`,
        sha256: sha256(orientationStyleBytes),
        bytes: orientationStyleBytes.length,
        runtime_dom_mutation: false,
        deployment: "not-authorised",
      },
    },
    deployment: "not-authorised",
  };
  assert.deepEqual(Object.keys(registry.assets).sort(), Object.keys(parentRegistry.assets).sort(),
    "registry asset shape changed");
  const registryBytes = jsonBytes(registry, true);
  const runtimeBytes = Buffer.from(rewriteRuntime(inputs.parentRuntime.toString("utf8"), cacheIdentity));
  const htmlBytes = Buffer.from(rewriteHtml(inputs.parentHtml.toString("utf8")));
  const outputs = new Map([
    [HTML_OUTPUT, htmlBytes],
    [RUNTIME_OUTPUT, runtimeBytes],
    [REGISTRY_OUTPUT, registryBytes],
    [STYLE_OUTPUT, orientationStyleBytes],
  ]);
  const outputRecords = [...outputs.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([outputPath, bytes]) => ({ path: outputPath, bytes: bytes.length, sha256: sha256(bytes) }));
  const initialDecodedBytes = parentRegistry.assets.projects.bytes
    + inputs.baseStyle.length
    + orientationStyleBytes.length
    + htmlBytes.length
    + runtimeBytes.length
    + registryBytes.length
    + inputs.atlasCartridge.length;
  assert.ok(initialDecodedBytes < 2_000_000, `initial decoded closure is ${initialDecodedBytes} bytes`);

  const manifest = {
    schema: "pipelinenews.v8.fast-site-candidate.v1",
    generation: GENERATION,
    name: NAME,
    source_commit: sourceCommit,
    source_parent_commit: SOURCE_PARENT_COMMIT,
    github_run_id: runId,
    deterministic_input_tuple: {
      source_commit: sourceCommit,
      github_run_id: runId,
    },
    cross_run_source_only_determinism_claimed: false,
    compiler: { path: `index/${COMPILER_FILE}`, method: COMPILER_METHOD, sha256: compilerSha256 },
    project_posture: PROJECT_POSTURE,
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    protected_parent: PROTECTED_RECOVERY_COMMIT,
    parent_generation: PARENT_GENERATION,
    news_source_generation: NEWS_SOURCE_GENERATION,
    rollback_generation: ROLLBACK_GENERATION,
    parity: { ...parentManifest.parity },
    performance_contract: {
      ...parentManifest.performance_contract,
      initial_decoded_bytes: initialDecodedBytes,
      orientation_style_bytes: orientationStyleBytes.length,
    },
    discipline: {
      ...parentManifest.discipline,
      source_mutation: false,
      immutable_outputs: true,
      mobile_orientation_css_only: true,
      resize_or_orientation_handler_added: false,
      runtime_dom_identity_preserved_across_rotation: true,
      native_release_menu: true,
      viewport_fit_cover: true,
      generation_a_contract_reused_unchanged: true,
      parent_news_reused_byte_exact: true,
      atlas_deep_link_cartridge_reused: true,
      deployment_separate: true,
      stable_route_changed: false,
      current_pointer_changed: false,
      globalgrid_catalogue_changed: false,
    },
    inputs: inputRecords.sort((left, right) => left.path.localeCompare(right.path)),
    outputs: outputRecords,
    evidence: "workflow-artifact-only",
    future_authorisation_binding: {
      required_fields: ["generation", "source_commit", "github_run_id", "cache_identity"],
      status: "absent-not-authorised",
    },
    deployment: "not-authorised",
  };
  const allOutputs = new Map(outputs);
  allOutputs.set(MANIFEST_OUTPUT, jsonBytes(manifest, true));
  return { outputs: allOutputs, manifest };
}

function argument(argv, name) {
  const index = argv.indexOf(name);
  assert.ok(index >= 0 && index + 1 < argv.length, `${name} is required`);
  assert.equal(argv.lastIndexOf(name), index, `${name} is duplicated`);
  return argv[index + 1];
}

async function main() {
  const argv = process.argv.slice(2);
  assert.equal(argv.length, 2, "usage: --out-root <directory>");
  const outRoot = path.resolve(argument(argv, "--out-root"));
  const { outputs, manifest } = await build();
  for (const [relativePath, bytes] of outputs) {
    const target = path.resolve(outRoot, relativePath);
    assert.ok(target.startsWith(`${outRoot}${path.sep}`), `output escapes root: ${relativePath}`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
  process.stdout.write(`${JSON.stringify({
    schema: "pipelinenews.v8.mobile-orientation-compiler-result.v1",
    generation: GENERATION,
    parent_generation: PARENT_GENERATION,
    source_commit: manifest.source_commit,
    cache_identity: manifest.cache_identity,
    files: outputs.size,
    projects: manifest.parity.project_count,
    headlines: manifest.parity.headlines,
    audit_generation: AUDIT_GENERATION,
    deployment: manifest.deployment,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
