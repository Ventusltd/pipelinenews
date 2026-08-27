import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const GENERATION = "202608272015";
const PARENT_GENERATION = "202608271524";
const AUDIT_GENERATION = "202608271656";
const SOURCE_PARENT_COMMIT = "cb3ac848c4d40722df2a9c1e6349d965d4794f2e";
const AUDIT_SOURCE_COMMIT = "6be8d21567e97a772d36d472a74e88a00d99a7c1";
const AUDIT_EVIDENCE_COMMIT = "bce84eb32b7464e9b560c9e9aa9f110feed62df7";
const PROTECTED_RECOVERY_COMMIT = "77bda8c3809d02550d06a1c4154315f56d1120fb";
const COMPILER_METHOD = "pipelinenews-v8-mobile-orientation-css-v2";
const NAME = "Mobile Orientation Repair + Live News Discovery + Chronology + Atlas V8 Deep-Link";
const PROJECT_POSTURE = Object.freeze({
  owner: "Ventus Ltd",
  application: "non-commercial-open-source",
  publisher_redistribution_rights: "source-specific-not-inferred",
});
const MANIFEST_PATH = `build/${GENERATION}-v8-fast-site-manifest.json`;
const SOURCE_MANIFEST_PATH = `manifests/${GENERATION}-mobile-orientation-candidate.json`;
const HTML_PATH = `releases/${GENERATION}-v8-fast-candidate.html`;
const RUNTIME_PATH = `releases/javascript/${GENERATION}-v8-fast-runtime.js`;
const REGISTRY_PATH = `releases/data/${GENERATION}-v8-fast-registry.json`;
const STYLE_PATH = `releases/styles/${GENERATION}-orientation.css`;
const STYLE_SOURCE_PATH = `ui/styles/${GENERATION}-orientation.css`;
const PARENT_MANIFEST_PATH = "build/202608271524-v8-fast-site-manifest.json";
const PARENT_HTML_PATH = "releases/202608271524-v8-fast-candidate.html";
const PARENT_RUNTIME_PATH = "releases/javascript/202608271524-v8-fast-runtime.js";
const PARENT_REGISTRY_PATH = "releases/data/202608271524-v8-fast-registry.json";
const PARENT_NEWS_PATH = "releases/data/202608271524-fd2212a8c76d-v8-fast-news.json";
const ATLAS_PATH = "releases/javascript/202608271329-atlas-v8-deep-link-cartridge.js";
const AUDIT_METRICS_PATH = `atman/reports/${AUDIT_GENERATION}/metrics.json`;
const AUDIT_CONTRACT_PATH = `atman/${AUDIT_GENERATION}-mobile-ui-invariants.mjs`;
const AUDIT_VERIFIER_PATH = `atman/${AUDIT_GENERATION}-verify-mobile-ui-browser.mjs`;
const AUDIT_COMPARATOR_PATH = `atman/${AUDIT_GENERATION}-compare-mobile-ui.mjs`;
const AUDIT_SOURCE_MANIFEST_PATH = `manifests/${AUDIT_GENERATION}-mobile-ui-comparator.json`;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseArguments(argv) {
  const allowed = new Set(["--root", "--generation", "--source-manifest"]);
  assert.equal(argv.length, 6, "expected --root, --generation and --source-manifest");
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    assert.ok(allowed.has(name), `unexpected argument: ${name}`);
    assert.ok(value, `${name} requires a value`);
    assert.ok(!values.has(name), `duplicate argument: ${name}`);
    values.set(name, value);
  }
  assert.equal(values.get("--generation"), GENERATION);
  assert.equal(path.posix.normalize(values.get("--source-manifest")), MANIFEST_PATH);
  return path.resolve(values.get("--root"));
}

function resolveInside(root, relativePath) {
  assert.equal(path.posix.normalize(relativePath), relativePath, `path is not normalised: ${relativePath}`);
  assert.ok(!path.posix.isAbsolute(relativePath) && !relativePath.startsWith("../"), `path escapes root: ${relativePath}`);
  const resolved = path.resolve(root, relativePath);
  assert.ok(resolved.startsWith(`${root}${path.sep}`), `path escapes root: ${relativePath}`);
  return resolved;
}

async function regularBytes(root, relativePath) {
  const filename = resolveInside(root, relativePath);
  const metadata = await lstat(filename);
  assert.ok(metadata.isFile() && !metadata.isSymbolicLink(), `not a regular file: ${relativePath}`);
  return readFile(filename);
}

async function walk(directory, root) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const result = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(filename, root));
    else result.push(path.relative(root, filename).split(path.sep).join("/"));
  }
  return result;
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

function expectedRuntime(parentSource, cacheIdentity) {
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
  return `${source.trimEnd()}\n`;
}

function expectedHtml(parentSource) {
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
  return `${source.trimEnd()}\n`;
}

function normalisedFailures(failures) {
  return failures
    .map(({ invariant, cell }) => ({ invariant, cell }))
    .sort((left, right) => `${left.invariant}/${left.cell}`.localeCompare(`${right.invariant}/${right.cell}`));
}

async function main() {
  const root = parseArguments(process.argv.slice(2));
  const manifestBytes = await regularBytes(root, MANIFEST_PATH);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schema, "pipelinenews.v8.fast-site-candidate.v1");
  assert.equal(manifest.generation, GENERATION);
  assert.equal(manifest.name, NAME);
  assert.equal(manifest.source_parent_commit, SOURCE_PARENT_COMMIT);
  assert.equal(manifest.protected_parent, PROTECTED_RECOVERY_COMMIT);
  assert.equal(manifest.parent_generation, PARENT_GENERATION);
  assert.equal(manifest.compiler.method, COMPILER_METHOD);
  assert.match(manifest.source_commit, /^[a-f0-9]{40}$/u);
  assert.match(String(manifest.github_run_id), /^\d+$/u);
  assert.deepEqual(manifest.deterministic_input_tuple, {
    source_commit: manifest.source_commit,
    github_run_id: manifest.github_run_id,
  });
  assert.equal(manifest.cross_run_source_only_determinism_claimed, false);
  assert.deepEqual(manifest.future_authorisation_binding, {
    required_fields: ["generation", "source_commit", "github_run_id", "cache_identity"],
    status: "absent-not-authorised",
  });
  assert.deepEqual(manifest.project_posture, PROJECT_POSTURE);
  assert.equal(manifest.deployment, "not-authorised");

  const expectedOutputs = [HTML_PATH, RUNTIME_PATH, REGISTRY_PATH, STYLE_PATH].sort();
  assert.deepEqual(manifest.outputs.map((record) => record.path), expectedOutputs);
  const outputBytes = new Map();
  for (const record of manifest.outputs) {
    assert.deepEqual(Object.keys(record).sort(), ["bytes", "path", "sha256"]);
    assert.ok(path.posix.basename(record.path).startsWith(GENERATION));
    const bytes = await regularBytes(root, record.path);
    assert.equal(bytes.length, record.bytes, `byte count changed: ${record.path}`);
    assert.equal(sha256(bytes), record.sha256, `hash changed: ${record.path}`);
    outputBytes.set(record.path, bytes);
  }

  const generationPattern = new RegExp(
    `^(?:releases/${GENERATION}[^/]*|releases/(?:javascript|styles|data|manifests)/${GENERATION}[^/]*|build/${GENERATION}-v8-fast-site-manifest\\.json)$`,
    "u",
  );
  const actualGenerationFiles = [
    ...await walk(path.join(root, "releases"), root),
    ...await walk(path.join(root, "build"), root),
  ].filter((relativePath) => generationPattern.test(relativePath)).sort();
  assert.deepEqual(actualGenerationFiles, [MANIFEST_PATH, ...expectedOutputs].sort());

  const inputByPath = new Map(manifest.inputs.map((record) => [record.path, record]));
  for (const record of manifest.inputs) {
    assert.deepEqual(Object.keys(record).sort(), ["bytes", "path", "sha256"]);
    const bytes = await regularBytes(root, record.path);
    assert.equal(bytes.length, record.bytes, `input byte count changed: ${record.path}`);
    assert.equal(sha256(bytes), record.sha256, `input hash changed: ${record.path}`);
  }
  for (const required of [
    PARENT_MANIFEST_PATH,
    PARENT_HTML_PATH,
    PARENT_RUNTIME_PATH,
    PARENT_REGISTRY_PATH,
    PARENT_NEWS_PATH,
    ATLAS_PATH,
    AUDIT_METRICS_PATH,
    AUDIT_CONTRACT_PATH,
    AUDIT_VERIFIER_PATH,
    AUDIT_COMPARATOR_PATH,
    AUDIT_SOURCE_MANIFEST_PATH,
    STYLE_SOURCE_PATH,
  ]) assert.ok(inputByPath.has(required), `manifest omitted required input: ${required}`);

  const parentManifest = JSON.parse(await regularBytes(root, PARENT_MANIFEST_PATH));
  const parentRegistry = JSON.parse(await regularBytes(root, PARENT_REGISTRY_PATH));
  const parentNewsBytes = await regularBytes(root, PARENT_NEWS_PATH);
  const parentRuntime = (await regularBytes(root, PARENT_RUNTIME_PATH)).toString("utf8");
  const parentHtml = (await regularBytes(root, PARENT_HTML_PATH)).toString("utf8");
  const atlasBytes = await regularBytes(root, ATLAS_PATH);
  const auditMetrics = JSON.parse(await regularBytes(root, AUDIT_METRICS_PATH));
  const auditSourceManifest = JSON.parse(await regularBytes(root, AUDIT_SOURCE_MANIFEST_PATH));
  assert.equal(parentManifest.generation, PARENT_GENERATION);
  assert.equal(parentManifest.deployment, "not-authorised");
  assert.equal(parentRegistry.generation, PARENT_GENERATION);
  assert.equal(parentRegistry.detail_partitions.length, 16);
  assert.equal(auditMetrics.generation, AUDIT_GENERATION);
  assert.equal(auditMetrics.source_commit, AUDIT_SOURCE_COMMIT);
  assert.equal(auditMetrics.candidate_generation, PARENT_GENERATION);
  assert.equal(auditMetrics.mode, "audit");
  assert.equal(auditMetrics.verdict.producer_status, "PASS");
  assert.equal(auditMetrics.verdict.candidate_gate.status, "FAIL");
  assert.equal(auditSourceManifest.generation, AUDIT_GENERATION);
  assert.equal(auditSourceManifest.candidate_generation, PARENT_GENERATION);
  assert.equal(auditSourceManifest.execution.aggregate_record_count, 23);
  assert.equal(auditSourceManifest.execution.rotation_viewport_driver,
    "playwright-page-set-viewport-size");
  assert.deepEqual(
    normalisedFailures(auditMetrics.verdict.candidate_gate.failures),
    manifest.cache_contract.mobile_orientation.audit_failures,
  );
  const inheritedClosurePaths = [
    path.posix.join("releases", parentRegistry.assets.projects.path),
    path.posix.join("releases", parentRegistry.assets.search.path),
    path.posix.join("releases", parentRegistry.assets.chart.path),
    ...parentRegistry.detail_partitions.map(({ path: declaredPath }) => (
      path.posix.normalize(path.posix.join("releases", declaredPath))
    )),
  ];
  assert.equal(inheritedClosurePaths.length, 19);
  assert.equal(new Set(inheritedClosurePaths).size, 19);
  for (const inheritedPath of inheritedClosurePaths) {
    assert.ok(inputByPath.has(inheritedPath),
      `manifest omitted inherited closure asset: ${inheritedPath}`);
  }

  assert.equal(manifest.cache_contract.schema, "pipelinenews.v8.mobile-orientation-cache-contract.v1");
  assert.equal(manifest.cache_contract.compiler_method, COMPILER_METHOD);
  assert.deepEqual(manifest.cache_contract.project_posture, PROJECT_POSTURE);
  assert.equal(manifest.cache_contract.source_parent_commit, SOURCE_PARENT_COMMIT);
  assert.equal(manifest.cache_contract.parent_generation, PARENT_GENERATION);
  assert.equal(manifest.cache_contract.parent_cache_identity, parentManifest.cache_identity);
  assert.equal(manifest.cache_contract.mobile_orientation.audit_generation, AUDIT_GENERATION);
  assert.equal(manifest.cache_contract.mobile_orientation.audit_source_commit, AUDIT_SOURCE_COMMIT);
  assert.equal(manifest.cache_contract.mobile_orientation.audit_evidence_commit,
    AUDIT_EVIDENCE_COMMIT);
  assert.equal(manifest.cache_contract.mobile_orientation.rotation_implementation,
    "css-only-no-resize-or-orientation-handler");
  assert.equal(manifest.cache_contract.mobile_orientation.release_menu,
    "native-auto-popover-light-dismiss");
  assert.equal(manifest.cache_contract.mobile_orientation.safe_area_hit_shield,
    "fixed-bottom-env-safe-area-inset-bottom");
  assert.deepEqual(manifest.cache_contract.mobile_orientation.reconciliation, {
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
    ],
  });
  assert.deepEqual(manifest.cache_contract.mobile_orientation.short_viewport_gates, {
    narrow_table_density: "(orientation: landscape) and (max-height: 500px) and (max-width: 768px)",
    cockpit: "(orientation: landscape) and (max-height: 500px) and (min-width: 769px)",
  });
  assert.equal(
    sha256(Buffer.from(JSON.stringify(manifest.cache_contract))),
    manifest.cache_identity,
  );

  const styleSource = await regularBytes(root, STYLE_SOURCE_PATH);
  const styleOutput = outputBytes.get(STYLE_PATH);
  assert.ok(styleOutput.equals(styleSource));
  const css = styleOutput.toString("utf8");
  for (const required of [
    "-webkit-text-size-adjust: 100%",
    "env(safe-area-inset-top)",
    "env(safe-area-inset-right)",
    "env(safe-area-inset-bottom)",
    "env(safe-area-inset-left)",
    "body::after",
    "#releaseMenu[popover]",
    "#releaseMenu[popover]:popover-open",
    "@media (orientation: landscape) and (max-height: 500px) and (max-width: 768px)",
    "@media (orientation: landscape) and (max-height: 500px) and (min-width: 769px)",
    "grid-template-columns: repeat(3, minmax(0, 1fr))",
    "max-height: 84dvh",
    ".signal,",
    "font-size: 10px",
  ]) assert.ok(css.includes(required), `orientation CSS omitted ${required}`);
  assert.ok(!/@import\b/iu.test(css));
  assert.ok(!/url\s*\(/iu.test(css));
  const shortLandscapeHeaders = css.split("\n")
    .filter((line) => line.trimStart().startsWith("@media"))
    .filter((line) => line.includes("orientation: landscape") && line.includes("max-height: 500px"));
  assert.deepEqual(shortLandscapeHeaders, [
    "@media (max-width: 768px), (orientation: landscape) and (max-height: 500px) and (min-width: 769px) {",
    "@media (orientation: landscape) and (max-height: 500px) and (max-width: 768px) {",
    "@media (orientation: landscape) and (max-height: 500px) and (min-width: 769px) {",
  ], "short-landscape rules must remain exactly bounded to the disjoint narrow-density and cockpit paths");

  const runtime = outputBytes.get(RUNTIME_PATH).toString("utf8");
  assert.equal(runtime, expectedRuntime(parentRuntime, manifest.cache_identity));
  assert.equal(runtime.match(/addEventListener\(["'](?:resize|orientationchange)["']/gu)?.length || 0, 0);
  assert.equal(runtime.match(/matchMedia\(/gu)?.length || 0, 0);
  assert.ok(runtime.startsWith('import { buildAtlasV8DeepLink } from "./202608271329-atlas-v8-deep-link-cartridge.js";'));

  const html = outputBytes.get(HTML_PATH).toString("utf8");
  assert.equal(html, expectedHtml(parentHtml));
  assert.equal(html.match(/viewport-fit=cover/gu)?.length, 1);
  assert.ok(html.indexOf("styles/202608270055-v8-fast.css") < html.indexOf(`styles/${GENERATION}-orientation.css`));
  assert.equal(html.match(/id="releaseMenu"/gu)?.length, 1);
  assert.equal(html.match(/popover="auto"/gu)?.length, 1);
  assert.equal(html.match(/popovertarget="releaseMenu"/gu)?.length, 1);
  assert.equal(html.match(/class="nav nav-desktop"/gu)?.length, 1);
  assert.equal(html.match(/id="export"/gu)?.length, 1);
  assert.ok(!html.includes("releases/current.json"));

  const registry = JSON.parse(outputBytes.get(REGISTRY_PATH));
  assert.equal(registry.generation, GENERATION);
  assert.equal(registry.compiler_method, COMPILER_METHOD);
  assert.equal(registry.cache_identity, manifest.cache_identity);
  assert.deepEqual(registry.cache_contract, manifest.cache_contract);
  assert.deepEqual(registry.project_posture, PROJECT_POSTURE);
  assert.equal(registry.deployment, "not-authorised");
  for (const key of ["totals", "news_counts", "signals", "chronology"]) {
    assert.deepEqual(registry[key], parentRegistry[key], `${key} changed`);
  }
  for (const key of ["projects", "search", "news", "chart", "style"]) {
    assert.deepEqual(registry.assets[key], parentRegistry.assets[key], `asset ${key} changed`);
  }
  assert.deepEqual(Object.keys(registry.assets).sort(), Object.keys(parentRegistry.assets).sort(),
    "registry asset shape changed");
  assert.equal(registry.assets.news.sha256, sha256(parentNewsBytes));
  assert.deepEqual(registry.cartridges.atlas_v8_deep_link, parentRegistry.cartridges.atlas_v8_deep_link);
  assert.equal(registry.cartridges.atlas_v8_deep_link.sha256, sha256(atlasBytes));
  assert.equal(registry.cartridges.mobile_orientation.path, STYLE_PATH.replace("releases/", ""));
  assert.equal(registry.cartridges.mobile_orientation.runtime_dom_mutation, false);

  assert.deepEqual(manifest.parity, parentManifest.parity);
  assert.deepEqual({
    projects: manifest.parity.project_count,
    capacity_mw: manifest.parity.capacity_mw,
    headlines: manifest.parity.headlines,
    canonical_uk_headlines: manifest.parity.canonical_headlines,
    international_headlines: manifest.parity.international_headlines,
  }, {
    projects: 7_680,
    capacity_mw: 356_474.09,
    headlines: 136,
    canonical_uk_headlines: 47,
    international_headlines: 19,
  });
  assert.ok(manifest.performance_contract.initial_decoded_bytes < 2_000_000);
  assert.equal(manifest.performance_contract.maximum_physical_project_rows, 50);
  assert.equal(manifest.performance_contract.maximum_physical_news_rows, 30);
  assert.equal(manifest.performance_contract.maximum_detail_fetch_concurrency, 4);
  assert.equal(manifest.discipline.mobile_orientation_css_only, true);
  assert.equal(manifest.discipline.resize_or_orientation_handler_added, false);
  assert.equal(manifest.discipline.runtime_dom_identity_preserved_across_rotation, true);
  assert.equal(manifest.discipline.generation_a_contract_reused_unchanged, true);
  assert.equal(manifest.discipline.parent_news_reused_byte_exact, true);
  assert.equal(manifest.discipline.stable_route_changed, false);
  assert.equal(manifest.discipline.current_pointer_changed, false);
  assert.equal(manifest.discipline.globalgrid_catalogue_changed, false);

  const sourceManifest = JSON.parse(await regularBytes(root, SOURCE_MANIFEST_PATH));
  assert.equal(sourceManifest.schema, "pipelinenews.mobile-orientation-source-manifest.v1");
  assert.equal(sourceManifest.generation, GENERATION);
  assert.equal(sourceManifest.source_parent_commit, SOURCE_PARENT_COMMIT);
  assert.equal(sourceManifest.parent_generation, PARENT_GENERATION);
  assert.equal(sourceManifest.audit_generation, AUDIT_GENERATION);
  assert.equal(sourceManifest.audit_source_commit, AUDIT_SOURCE_COMMIT);
  assert.equal(sourceManifest.audit_evidence_commit, AUDIT_EVIDENCE_COMMIT);
  assert.equal(sourceManifest.deployment, "not-authorised");
  assert.deepEqual(sourceManifest.project_posture, PROJECT_POSTURE);
  assert.equal(sourceManifest.workflow.run_volatile_metadata_in_closure, true);
  assert.deepEqual(sourceManifest.workflow.deterministic_input_tuple,
    ["source_commit", "github_run_id"]);
  assert.equal(sourceManifest.workflow.cross_run_source_only_determinism_claimed, false);
  assert.equal(sourceManifest.workflow.artifact_retry_strategy,
    "run-id-stable-names-with-producer-overwrite");
  assert.equal(sourceManifest.workflow.mixed_attempt_binding,
    "source-commit-run-id-and-cell-envelope");
  assert.equal(sourceManifest.workflow.idempotent_output_replay,
    "accept-byte-identical-direct-child-only");
  assert.equal(sourceManifest.workflow.advanced_main_behavior, "fail-closed");
  assert.deepEqual(sourceManifest.reconciliation,
    manifest.cache_contract.mobile_orientation.reconciliation);
  assert.deepEqual(
    sourceManifest.measured_audit.failures,
    normalisedFailures(auditMetrics.verdict.candidate_gate.failures),
  );
  assert.deepEqual(sourceManifest.portrait_parity.declared_masks, [
    ".sidebar",
    ".header",
    ".meta",
    ".news-tools",
    ".news-pager",
    ".filters",
    ".tablewrap",
    ".project-window-controls",
    ".gauges canvas",
    "safe-area-padding-when-non-zero",
  ]);
  assert.equal(sourceManifest.portrait_parity.animated_canvas_mask_preserves_card_chrome_and_value, true);

  process.stdout.write(`${JSON.stringify({
    schema: "pipelinenews.v8.mobile-orientation-contract-proof.v1",
    generation: GENERATION,
    source_commit: manifest.source_commit,
    manifest_sha256: sha256(manifestBytes),
    cache_identity: manifest.cache_identity,
    projects: manifest.parity.project_count,
    headlines: manifest.parity.headlines,
    audit_generation: AUDIT_GENERATION,
    audit_failures: manifest.cache_contract.mobile_orientation.audit_failures,
    css_only_rotation: true,
    runtime_dom_identity_preserved: true,
    deployment: manifest.deployment,
    status: "PASS",
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
