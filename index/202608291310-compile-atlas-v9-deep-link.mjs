#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GENERATION = "202608291310";
const RELEASE_ID = `${GENERATION}-pipelinenews`;
const SOURCE_PARENT = "693ccda8e6288d449763ce2b3a4ba16ed7b93fee";
const PARENT_GENERATION = "202608282200";
const PARENT_SOURCE = "1cbe1a9b205af3a2cf62bc7f8130f033423dfe1f";
const PARENT_RUN = "33211041996";
const PARENT_ARTIFACT = "9701586944";
const PARENT_ARTIFACT_DIGEST = "8ec24ba18c70b661ddfc6ff9ca4bb728db5929d5700c147c91449f5e93e9b497";
const PARENT_MANIFEST_SHA256 = "025daf70f1c4b9c9a7c84a70d41ceb50e96232771f736faa309ca92c2c9c134d";
const COMPILER_METHOD = "pipelinenews-atlas-v9-folder-deep-link-successor-v1";
const ATLAS_BASE = "https://ventusltd.github.io/gridatlas/202608292311-atlas-v9/";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PARENT = Object.freeze({
  manifest: `build/${PARENT_GENERATION}-v8-fast-site-manifest.json`,
  html: `releases/${PARENT_GENERATION}-v8-fast-candidate.html`,
  runtime: `releases/javascript/${PARENT_GENERATION}-v8-fast-runtime.js`,
  registry: `releases/data/${PARENT_GENERATION}-v8-fast-registry.json`,
  relationshipCartridge: `releases/javascript/${PARENT_GENERATION}-federated-relationships.js`,
  relationshipPayload: `releases/data/${PARENT_GENERATION}-relationship-governance-status.json`,
  relationshipParquet: `releases/data/intelligence/${PARENT_GENERATION}/relationship-governance-status/${PARENT_GENERATION}-part-000.parquet`,
  relationshipAudit: `releases/data/intelligence/${PARENT_GENERATION}/${PARENT_GENERATION}-relationship-governance-audit.json`,
});

const SOURCE = Object.freeze({
  manifest: `manifests/${GENERATION}-atlas-v9-deep-link-successor.json`,
  cartridge: `ui/cartridges/${GENERATION}-atlas-v9-deep-link.mjs`,
  sectorCartridge: "releases/javascript/202608272130-sector-intelligence.js",
  sectorPayload: "releases/data/202608272130-sector-intelligence.json",
  sectorAudit: "releases/data/intelligence/202608272130/202608272130-parquet-audit.json",
  sectorReceipt: "releases/data/intelligence/202608272130/202608272130-source-ledger-receipt.json",
  sectorItems: "releases/data/intelligence/202608272130/sector-items/202608272130-part-000.parquet",
  sectorTopics: "releases/data/intelligence/202608272130/sector-item-topics/202608272130-part-000.parquet",
  sectorBindings: "releases/data/intelligence/202608272130/sector-project-bindings/202608272130-part-000.parquet",
  style: "releases/styles/202608270055-v8-fast.css",
  orientation: "releases/styles/202608272048-orientation.css",
  chart: "releases/vendor/202608261927-chart-umd.min.js",
  projects: "releases/data/202608270055-8ab1807551bc-v8-fast-projects.json",
  search: "releases/data/202608270055-8ab1807551bc-v8-fast-search.json",
  news: "releases/data/202608271524-fd2212a8c76d-v8-fast-news.json",
});

const OUTPUT = Object.freeze({
  index: `releases/${RELEASE_ID}/index.html`,
  runtime: `releases/${RELEASE_ID}/assets/${GENERATION}-app.mjs`,
  atlasCartridge: `releases/${RELEASE_ID}/assets/${GENERATION}-atlas-v9-deep-link.mjs`,
  relationshipCartridge: `releases/${RELEASE_ID}/assets/${PARENT_GENERATION}-federated-relationships.mjs`,
  sectorCartridge: `releases/${RELEASE_ID}/assets/202608272130-sector-intelligence.mjs`,
  style: `releases/${RELEASE_ID}/assets/202608270055-v8-fast.css`,
  orientation: `releases/${RELEASE_ID}/assets/202608272048-orientation.css`,
  chart: `releases/${RELEASE_ID}/assets/202608261927-chart-umd.min.js`,
  registry: `releases/${RELEASE_ID}/data/${GENERATION}-registry.json`,
  relationshipPayload: `releases/${RELEASE_ID}/data/${PARENT_GENERATION}-relationship-governance-status.json`,
  sectorPayload: `releases/${RELEASE_ID}/data/202608272130-sector-intelligence.json`,
  relationshipParquet: `releases/${RELEASE_ID}/data/intelligence/${PARENT_GENERATION}-relationship-governance-status.parquet`,
  relationshipAudit: `releases/${RELEASE_ID}/data/intelligence/${PARENT_GENERATION}-relationship-governance-audit.json`,
  parentManifest: `releases/${RELEASE_ID}/provenance/${PARENT_GENERATION}-v8-fast-site-manifest.json`,
  buildManifest: `releases/${RELEASE_ID}/build-manifest.json`,
  manifest: `releases/${RELEASE_ID}/release-manifest.json`,
});

const DETAIL_SOURCES = Object.freeze(
  Array.from({ length: 16 }, (_, index) => `data/projects/202608261927-project-partition-v9-1-${String(index + 1).padStart(2, "0")}.json`),
);

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    assert.match(key || "", /^--[a-z-]+$/u);
    assert.ok(argv[index + 1], `missing ${key} value`);
    result[key.slice(2)] = argv[index + 1];
  }
  for (const key of ["parent-root", "out-root", "source-commit", "source-committed-at"]) {
    assert.ok(result[key], `missing --${key}`);
  }
  assert.match(result["source-commit"], /^[a-f0-9]{40}$/u);
  assert.ok(!Number.isNaN(Date.parse(result["source-committed-at"])), "invalid source commit timestamp");
  return result;
}

const sha256 = (raw) => createHash("sha256").update(raw).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const record = (relative, raw) => ({ path: relative, bytes: raw.length, sha256: sha256(raw) });

function safePath(root, relative) {
  assert.equal(path.posix.normalize(relative), relative, `unnormalised path: ${relative}`);
  const target = path.resolve(root, relative);
  assert.ok(target.startsWith(`${root}${path.sep}`), `path escaped root: ${relative}`);
  return target;
}

async function readPinned(root, pin, label) {
  assert.deepEqual(Object.keys(pin).sort(), ["bytes", "path", "sha256"]);
  const raw = await readFile(safePath(root, pin.path));
  assert.equal(raw.length, pin.bytes, `${label} byte drift: ${pin.path}`);
  assert.equal(sha256(raw), pin.sha256, `${label} digest drift: ${pin.path}`);
  return raw;
}

function replaceExactly(source, needle, replacement, count = 1) {
  const actual = source.split(needle).length - 1;
  assert.equal(actual, count, `replacement anchor count ${actual} != ${count}: ${needle.slice(0, 100)}`);
  return source.split(needle).join(replacement);
}

function compileHtml(parentBytes) {
  let html = parentBytes.toString("utf8");
  html = replaceExactly(html, "<title>GlobalGrid2050 | PipelineNews seven-topic sector intelligence candidate</title>", "<title>PipelineNews | Atlas V9 deep-link successor 202608291310</title>");
  html = replaceExactly(html, '<link rel="stylesheet" href="styles/202608270055-v8-fast.css">', '<link rel="stylesheet" href="assets/202608270055-v8-fast.css">');
  html = replaceExactly(html, '<link rel="stylesheet" href="styles/202608272048-orientation.css">', '<link rel="stylesheet" href="assets/202608272048-orientation.css">');
  html = replaceExactly(html, '<body data-fast-generation="202608272130">', `<body data-fast-generation="${GENERATION}" data-release-id="${RELEASE_ID}">`);
  html = replaceExactly(html, "ATLAS V8 DEEP-LINK", "ATLAS V9 DEEP-LINK", 5);
  html = replaceExactly(html, "ATLAS V9 DEEP-LINK CANDIDATE", "ATLAS V9 DEEP-LINK SUCCESSOR", 5);
  html = replaceExactly(html, "https://ventusltd.github.io/gridatlas/202608292311-atlas-v9/", ATLAS_BASE, 2);
  html = replaceExactly(html, " · NOT DEPLOYED", " · TIMESTAMPED RELEASE · POINTER-CONTROLLED", 3);
  html = replaceExactly(html, '<script type="module" src="javascript/202608282200-v8-fast-runtime.js"></script>', `<script type="module" src="assets/${GENERATION}-app.mjs"></script>`);
  return Buffer.from(html);
}

function compileRegistry(parent, sourceCommit, compilerRaw, cartridgeRaw, dependencies) {
  const registry = structuredClone(parent);
  registry.schema = "pipelinenews.v9.timestamp-folder-registry.v1";
  registry.generation = GENERATION;
  registry.name = "PipelineNews Atlas V9 deep-link timestamp-folder successor";
  registry.compiler_method = COMPILER_METHOD;
  delete registry.deployment;
  registry.classification = "IMMUTABLE_TIMESTAMPED_RELEASE";
  registry.pointer_state_external = true;

  registry.assets.projects.path = "data/202608270055-8ab1807551bc-v8-fast-projects.json";
  registry.assets.search.path = "data/202608270055-8ab1807551bc-v8-fast-search.json";
  registry.assets.news.path = "data/202608271524-fd2212a8c76d-v8-fast-news.json";
  registry.assets.chart.path = "assets/202608261927-chart-umd.min.js";
  registry.assets.style.path = "assets/202608270055-v8-fast.css";
  for (const detail of registry.detail_partitions) {
    assert.match(detail.path, /^\.\.\/data\/projects\//u);
    detail.path = detail.path.replace(/^\.\.\//u, "");
  }

  const sector = registry.supplemental_assets.sector_intelligence;
  sector.cartridge.filename = "202608272130-sector-intelligence.mjs";
  sector.cartridge.path = "assets/202608272130-sector-intelligence.mjs";
  sector.payload.path = "data/202608272130-sector-intelligence.json";
  const relationship = registry.supplemental_assets.relationship_governance_status;
  relationship.cartridge.filename = `${PARENT_GENERATION}-federated-relationships.mjs`;
  relationship.cartridge.path = `assets/${PARENT_GENERATION}-federated-relationships.mjs`;
  relationship.payload.path = `data/${PARENT_GENERATION}-relationship-governance-status.json`;
  relationship.parquet.path = `data/intelligence/${PARENT_GENERATION}-relationship-governance-status.parquet`;
  relationship.audit.path = `data/intelligence/${PARENT_GENERATION}-relationship-governance-audit.json`;

  delete registry.cartridges.atlas_v8_deep_link;
  registry.cartridges.atlas_v9_deep_link = {
    schema: "pipelinenews.atlas-v9-deep-link-cartridge.v1",
    generation: GENERATION,
    path: `assets/${GENERATION}-atlas-v9-deep-link.mjs`,
    bytes: cartridgeRaw.length,
    sha256: sha256(cartridgeRaw),
    identity_anchor: "repd_ref",
    query_parameter_order: ["repd_ref"],
    target: ATLAS_BASE,
    real_public_receiver_required: true,
    synthetic_receiver_allowed: false,
    classification: "IMMUTABLE_TIMESTAMPED_RELEASE",
  };
  registry.cartridges.mobile_orientation.path = "assets/202608272048-orientation.css";
  registry.cartridges.sector_intelligence.filename = "202608272130-sector-intelligence.mjs";
  registry.cartridges.sector_intelligence.path = "assets/202608272130-sector-intelligence.mjs";

  registry.cache_contract = {
    ...registry.cache_contract,
    schema: "pipelinenews.atlas-v9-folder-successor-cache-contract.v1",
    compiler_method: COMPILER_METHOD,
    compiler: {
      path: `index/${GENERATION}-compile-atlas-v9-deep-link.mjs`,
      bytes: compilerRaw.length,
      sha256: sha256(compilerRaw),
    },
    source_parent_commit: SOURCE_PARENT,
    source_commit: sourceCommit,
    parent_generation: PARENT_GENERATION,
    parent_artifact: {
      run_id: PARENT_RUN,
      artifact_id: PARENT_ARTIFACT,
      digest: `sha256:${PARENT_ARTIFACT_DIGEST}`,
      manifest_sha256: PARENT_MANIFEST_SHA256,
    },
    atlas_deep_link: {
      schema: "pipelinenews.atlas-v9-deep-link-cartridge.v1",
      generation: GENERATION,
      target: {
        base_url: ATLAS_BASE,
        pathname: "/gridatlas/202608291239-atlas-v9/",
      },
      identity_anchor: "repd_ref",
      query_parameter_order: ["repd_ref"],
      map_links: 7652,
      no_map: 28,
      inbound_alias: "repd_ref",
      public_receiver_readback_required: true,
    },
    folder_release: {
      release_id: RELEASE_ID,
      entrypoint: `releases/${RELEASE_ID}/index.html`,
      assets_inside_release_folder: true,
      shared_data_hash_pinned: true,
      inherited_dependencies_copied_inside_release_folder: true,
    },
    dependencies,
  };
  registry.cache_identity = sha256(Buffer.from(JSON.stringify(registry.cache_contract)));
  return registry;
}

function compileRuntime(parentBytes, cacheIdentity) {
  let runtime = parentBytes.toString("utf8");
  runtime = replaceExactly(runtime, 'import { buildAtlasV8DeepLink } from "./202608271329-atlas-v8-deep-link-cartridge.js";', `import { buildAtlasV9DeepLink } from "./${GENERATION}-atlas-v9-deep-link.mjs";`);
  runtime = replaceExactly(runtime, 'const GENERATION = "202608282200";', `const GENERATION = "${GENERATION}";`);
  runtime = replaceExactly(runtime, 'const EXPECTED_COMPILER_METHOD = "pipelinenews-v8-federated-relationship-abstention-lazy-v1";', `const EXPECTED_COMPILER_METHOD = "${COMPILER_METHOD}";`);
  runtime = replaceExactly(runtime, "PipelineNews V8 fast runtime", "PipelineNews V9 timestamped runtime");
  runtime = replaceExactly(runtime, 'const EXPECTED_CACHE_IDENTITY = "2bfe4033abc2cf2f5bff89a4ab70dce549c7332e9d7d49eaf56e6a52ef84bbec";', `const EXPECTED_CACHE_IDENTITY = "${cacheIdentity}";`);
  runtime = replaceExactly(runtime, 'const REGISTRY_URL = `data/${GENERATION}-v8-fast-registry.json`;', `const REGISTRY_URL = "data/${GENERATION}-registry.json";`);
  runtime = replaceExactly(runtime, "return buildAtlasV8DeepLink(item);", "return buildAtlasV9DeepLink(item);");
  runtime = replaceExactly(runtime, 'for (const parameter of ["technology", "status", "county", "q", "sort"])', 'for (const parameter of ["technology", "status", "county", "q", "sort", "repd_ref"])');
  runtime = replaceExactly(runtime, '  query = parameters.get("q") || "";', '  const requestedRepdRef = parameters.get("repd_ref") || "";\n  query = /^\\d+$/u.test(requestedRepdRef) ? requestedRepdRef : (parameters.get("q") || "");');
  runtime = replaceExactly(runtime, '"Atlas V8 URL"', '"Atlas V9 URL"');
  runtime = replaceExactly(runtime, "invariant(cartridge.SECTOR_INTELLIGENCE_CARTRIDGE_CONTRACT.generation === GENERATION, \"sector cartridge identity changed\");", "invariant(cartridge.SECTOR_INTELLIGENCE_CARTRIDGE_CONTRACT.generation === entry.generation, \"sector cartridge identity changed\");");
  runtime = replaceExactly(runtime, '      url: new URL(`../${entry.payload.path}`, import.meta.url).pathname.split("/releases/")[1],', "      url: entry.payload.path,");
  runtime = replaceExactly(runtime, "invariant(cartridge.FEDERATED_RELATIONSHIP_CARTRIDGE_CONTRACT.generation === GENERATION, \"relationship cartridge identity changed\");", "invariant(cartridge.FEDERATED_RELATIONSHIP_CARTRIDGE_CONTRACT.generation === entry.generation, \"relationship cartridge identity changed\");");
  runtime = replaceExactly(runtime, "Live News + sector and relationship intelligence candidate", "Live News + sector and relationship intelligence + Atlas V9 deep-link successor");
  runtime = replaceExactly(runtime, 'invariant(registry.schema === "pipelinenews.v8.live-news-registry.v1", "registry schema mismatch");', 'invariant(registry.schema === "pipelinenews.v9.timestamp-folder-registry.v1", "registry schema mismatch");');
  runtime = replaceExactly(runtime, "sector and relationship payloads lazy · NOT DEPLOYED", "sector and relationship payloads lazy · TIMESTAMPED RELEASE · POINTER-CONTROLLED");
  runtime = replaceExactly(runtime, "The fast candidate has failed closed.", "The timestamped release has failed closed.");
  return Buffer.from(runtime);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const parentRoot = path.resolve(args["parent-root"]);
  const outRoot = path.resolve(args["out-root"]);
  const sourceCommit = args["source-commit"];
  const sourceCommittedAt = new Date(args["source-committed-at"]).toISOString();
  const sourceManifest = JSON.parse(await readFile(safePath(ROOT, SOURCE.manifest)));
  assert.equal(sourceManifest.schema, "pipelinenews.atlas-v9-deep-link-successor-source.v1");
  assert.equal(sourceManifest.generation, GENERATION);
  assert.equal(sourceManifest.source_parent_commit, SOURCE_PARENT);
  assert.equal(sourceManifest.parent_candidate.run_id, Number(PARENT_RUN));
  assert.equal(sourceManifest.parent_candidate.artifact_id, Number(PARENT_ARTIFACT));
  assert.equal(sourceManifest.parent_candidate.artifact_sha256, PARENT_ARTIFACT_DIGEST);
  assert.equal(sourceManifest.deployment.candidate, "CI_BRANCH_ONLY");
  assert.equal(sourceManifest.deployment.pointer, "DEFERRED_UNTIL_PUBLIC_PROOF");

  const dependencyBytes = new Map();
  for (const pin of sourceManifest.shared_inputs) {
    dependencyBytes.set(pin.path, await readPinned(ROOT, pin, "shared input"));
  }
  const compilerRaw = await readFile(fileURLToPath(import.meta.url));
  const cartridgeRaw = await readFile(safePath(ROOT, SOURCE.cartridge));

  const parentManifestRaw = await readFile(safePath(parentRoot, PARENT.manifest));
  assert.equal(parentManifestRaw.length, 25073, "parent manifest byte count changed");
  assert.equal(sha256(parentManifestRaw), PARENT_MANIFEST_SHA256, "parent manifest digest changed");
  const parentManifest = JSON.parse(parentManifestRaw);
  assert.equal(parentManifest.generation, PARENT_GENERATION);
  assert.equal(parentManifest.source_commit, PARENT_SOURCE);
  assert.equal(String(parentManifest.github_run_id), PARENT_RUN);
  assert.equal(parentManifest.outputs.length, 7);
  assert.deepEqual(parentManifest.canonical_product, {
    projects: 7680,
    capacity_mw: 356474.09,
    headlines: 136,
    rows_per_page: 100,
    table_columns: 11,
  });
  assert.equal(parentManifest.relationship_governance_status.rows, 3);
  assert.equal(parentManifest.relationship_governance_status.project_bindings, 0);
  const parentRecords = new Map(parentManifest.outputs.map((item) => [item.path, item]));
  const parentBytes = new Map();
  for (const relative of Object.values(PARENT).filter((item) => item !== PARENT.manifest)) {
    const pin = parentRecords.get(relative);
    assert.ok(pin, `parent output pin missing: ${relative}`);
    parentBytes.set(relative, await readPinned(parentRoot, pin, "parent output"));
  }

  const dependencies = sourceManifest.shared_inputs.map(({ path: relative, bytes, sha256: digest }) => ({ path: relative, bytes, sha256: digest }));
  const parentRegistry = JSON.parse(parentBytes.get(PARENT.registry));
  const registry = compileRegistry(parentRegistry, sourceCommit, compilerRaw, cartridgeRaw, dependencies);
  const registryRaw = jsonBytes(registry);
  const runtimeRaw = compileRuntime(parentBytes.get(PARENT.runtime), registry.cache_identity);
  const htmlRaw = compileHtml(parentBytes.get(PARENT.html));

  const files = new Map([
    [OUTPUT.index, htmlRaw],
    [OUTPUT.runtime, runtimeRaw],
    [OUTPUT.atlasCartridge, cartridgeRaw],
    [OUTPUT.relationshipCartridge, parentBytes.get(PARENT.relationshipCartridge)],
    [OUTPUT.sectorCartridge, dependencyBytes.get(SOURCE.sectorCartridge)],
    [OUTPUT.style, dependencyBytes.get(SOURCE.style)],
    [OUTPUT.orientation, dependencyBytes.get(SOURCE.orientation)],
    [OUTPUT.chart, dependencyBytes.get(SOURCE.chart)],
    [OUTPUT.registry, registryRaw],
    [OUTPUT.relationshipPayload, parentBytes.get(PARENT.relationshipPayload)],
    [OUTPUT.sectorPayload, dependencyBytes.get(SOURCE.sectorPayload)],
    [OUTPUT.relationshipParquet, parentBytes.get(PARENT.relationshipParquet)],
    [OUTPUT.relationshipAudit, parentBytes.get(PARENT.relationshipAudit)],
  ]);
  const inheritedCopies = new Map([
    [SOURCE.projects, `releases/${RELEASE_ID}/data/202608270055-8ab1807551bc-v8-fast-projects.json`],
    [SOURCE.search, `releases/${RELEASE_ID}/data/202608270055-8ab1807551bc-v8-fast-search.json`],
    [SOURCE.news, `releases/${RELEASE_ID}/data/202608271524-fd2212a8c76d-v8-fast-news.json`],
    [SOURCE.sectorAudit, `releases/${RELEASE_ID}/data/intelligence/sector/202608272130-parquet-audit.json`],
    [SOURCE.sectorReceipt, `releases/${RELEASE_ID}/data/intelligence/sector/202608272130-source-ledger-receipt.json`],
    [SOURCE.sectorItems, `releases/${RELEASE_ID}/data/intelligence/sector/sector-items.parquet`],
    [SOURCE.sectorTopics, `releases/${RELEASE_ID}/data/intelligence/sector/sector-item-topics.parquet`],
    [SOURCE.sectorBindings, `releases/${RELEASE_ID}/data/intelligence/sector/sector-project-bindings.parquet`],
    ...DETAIL_SOURCES.map((relative) => [relative, `releases/${RELEASE_ID}/data/projects/${path.posix.basename(relative)}`]),
  ]);
  for (const [source, destination] of inheritedCopies) {
    assert.ok(dependencyBytes.has(source), `unbound inherited dependency: ${source}`);
    files.set(destination, dependencyBytes.get(source));
  }
  const functionalOutputs = [...files].map(([relative, raw]) => record(relative, raw)).sort((left, right) => left.path.localeCompare(right.path));
  files.set(OUTPUT.parentManifest, parentManifestRaw);
  const parentManifestRecord = record(OUTPUT.parentManifest, parentManifestRaw);
  const buildManifest = {
    schema: "pipelinenews.timestamp-folder-build-manifest.v1",
    generation: GENERATION,
    release_id: RELEASE_ID,
    compiler: {
      method: COMPILER_METHOD,
      path: `index/${GENERATION}-compile-atlas-v9-deep-link.mjs`,
      bytes: compilerRaw.length,
      sha256: sha256(compilerRaw),
    },
    source_commit: sourceCommit,
    source_parent_commit: SOURCE_PARENT,
    parent_artifact: {
      run_id: Number(PARENT_RUN),
      artifact_id: Number(PARENT_ARTIFACT),
      artifact_sha256: PARENT_ARTIFACT_DIGEST,
      manifest_sha256: PARENT_MANIFEST_SHA256,
    },
    parent_evidence: {
      schema: "pipelinenews.parent-artifact-evidence.v1",
      exact_manifest: parentManifestRecord,
      source_commit: parentManifest.source_commit,
      github_run_id: String(parentManifest.github_run_id),
      outputs: parentManifest.outputs.length,
      canonical_product: parentManifest.canonical_product,
      relationship_governance_status: parentManifest.relationship_governance_status,
    },
    deterministic_ab_required: true,
    functional_files: functionalOutputs,
    functional_file_count: functionalOutputs.length,
    inherited_functional_files: sourceManifest.shared_inputs.length + 4,
    shared_dependency_files: sourceManifest.shared_inputs.length,
    inherited_parent_output_files: 4,
    provenance_files: 1,
  };
  files.set(OUTPUT.buildManifest, jsonBytes(buildManifest));
  const outputs = [...files].map(([relative, raw]) => record(relative, raw)).sort((left, right) => left.path.localeCompare(right.path));
  const releaseManifest = {
    schema: "pipelinenews.timestamp-folder-successor.v1",
    generation: GENERATION,
    release_id: RELEASE_ID,
    incepted_at: "2026-08-29T13:10:00Z",
    source_commit: sourceCommit,
    source_parent_commit: SOURCE_PARENT,
    source_committed_at: sourceCommittedAt,
    immutable: true,
    classification: "IMMUTABLE_TIMESTAMPED_RELEASE",
    public_url: `https://ventusltd.github.io/pipelinenews/releases/${RELEASE_ID}/`,
    route: `/pipelinenews/releases/${RELEASE_ID}/`,
    entrypoint: OUTPUT.index,
    parent_candidate: {
      generation: PARENT_GENERATION,
      source_commit: PARENT_SOURCE,
      run_id: Number(PARENT_RUN),
      artifact_id: Number(PARENT_ARTIFACT),
      artifact_sha256: PARENT_ARTIFACT_DIGEST,
      manifest_sha256: PARENT_MANIFEST_SHA256,
    },
    product: {
      projects: 7680,
      capacity_mw: 356474.09,
      headlines: 136,
      rows_per_page: 100,
      table_columns: 11,
      relationship_governance_rows: 3,
      relationship_project_bindings: 0,
    },
    atlas_v9_deep_link: {
      base_url: ATLAS_BASE,
      query_parameter_order: ["repd_ref"],
      inbound_compatibility_alias: "repd_ref",
      golden_repd_ref: "17494",
      golden_url: `${ATLAS_BASE}?repd_ref=17494`,
      expected_selection: "REPD 17494 selected",
      map_links: 7652,
      no_map: 28,
      synthetic_receiver_allowed: false,
    },
    folder_contract: {
      index_inside_timestamp_folder: true,
      runtime_assets_inside_timestamp_folder: true,
      inherited_dependencies_inside_timestamp_folder: true,
      inherited_dependencies_byte_identical: true,
      original_dependency_paths_and_hashes_recorded: true,
      pointer_state_encoded_in_release: false,
    },
    outputs,
    build_manifest: record(OUTPUT.buildManifest, files.get(OUTPUT.buildManifest)),
    shared_dependencies: dependencies,
    publication_control: {
      release_bytes_encode_current_state: false,
      source_workflow_pages_capability: false,
      source_workflow_main_push: false,
      source_workflow_stage_branch: `ci/${GENERATION}-atlas-v9-release`,
      pointer_and_attestation_live_outside_release_folder: true,
    },
  };
  files.set(OUTPUT.manifest, jsonBytes(releaseManifest));

  for (const [relative, raw] of files) {
    const target = safePath(outRoot, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, raw, { flag: "wx" });
  }
  process.stdout.write(`${JSON.stringify({
    classification: "COMPILED_ATLAS_V9_FOLDER_SUCCESSOR",
    generation: GENERATION,
    release_id: RELEASE_ID,
    files: files.size,
    outputs: outputs.length,
    cache_identity: registry.cache_identity,
    parent_manifest_sha256: PARENT_MANIFEST_SHA256,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
