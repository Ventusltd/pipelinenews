import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const GENERATION = "202609010140";
const PARENT_GENERATION = "202608272048";
const SOURCE_PARENT_COMMIT = "8648067694b8ffa30270a1db8664317d62dea176";
const PARENT_OUTPUT_COMMIT = "8648067694b8ffa30270a1db8664317d62dea176";
const PARENT_SOURCE_COMMIT = "b2545f7b6872833fc93341b63038b1cad209519d";
const PARENT_GITHUB_RUN_ID = "33111219605";
const PROTECTED_RECOVERY_COMMIT = "77bda8c3809d02550d06a1c4154315f56d1120fb";
const ROLLBACK_GENERATION = "202608270055";
const COMPILER_METHOD = "pipelinenews-v8-sector-intelligence-three-grain-lazy-v3";
const COMPILER_FILE = `${GENERATION}-compile-v8-sector-intelligence.mjs`;
const NAME = "PipelineNews Live News + five-topic sector intelligence candidate";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATASETS = Object.freeze(["sector_items", "sector_item_topics", "sector_project_bindings"]);
const DATASET_DIRECTORIES = Object.freeze({
  sector_items: "sector-items",
  sector_item_topics: "sector-item-topics",
  sector_project_bindings: "sector-project-bindings",
});

const INPUTS = Object.freeze({
  parentManifest: "build/202608272048-v8-fast-site-manifest.json",
  parentHtml: "releases/202608272048-v8-fast-candidate.html",
  parentRuntime: "releases/javascript/202608272048-v8-fast-runtime.js",
  parentRegistry: "releases/data/202608272048-v8-fast-registry.json",
  parentOrientation: "releases/styles/202608272048-orientation.css",
  atlasCartridge: "releases/javascript/202608271329-atlas-v8-deep-link-cartridge.js",
  contract: `data/news-discovery/${GENERATION}-sector-intelligence-contract.json`,
  cartridge: `ui/cartridges/${GENERATION}-sector-intelligence.mjs`,
});
const PINNED_SHA256 = Object.freeze({
  [INPUTS.parentManifest]: "d45c373b3b63533f09dfbd73bc40429f9226b8b004df10c4fd619711f9c1116b",
  [INPUTS.parentHtml]: "082a562cf1960ecd97a9b387841724b27298dcababea34340cd71b3f1ff59322",
  [INPUTS.parentRuntime]: "634fd4a9d0db915975619845b3f21db631f648f86ac5e06b64efa09b09dd179d",
  [INPUTS.parentRegistry]: "95a700a24f5dde5ee9a3bb8f82eb0483b9dcf00ac277c4385fbd01cc3a36cf02",
  [INPUTS.parentOrientation]: "e9e1cbefd49f10d2d3b06f31274357a947672242159e9f1b50434ca175a870bc",
  [INPUTS.atlasCartridge]: "d8e997acea1ed6c628e4d69f27653a5fe9a21bb459ff95d4ee0a7d040b431ff7",
  [INPUTS.contract]: "fda9e3247dd33a0abac5e822295c1b02965cbf3754681f487913f1dcfa77f226",
  [INPUTS.cartridge]: "7a091c6bbe58a30976e8f5e9eb8b04ad9543a32a18cd90bea76f85fc0e10f41c",
});

const HTML_OUTPUT = `releases/${GENERATION}-v8-fast-candidate.html`;
const RUNTIME_OUTPUT = `releases/javascript/${GENERATION}-v8-fast-runtime.js`;
const CARTRIDGE_OUTPUT = `releases/javascript/${GENERATION}-sector-intelligence.js`;
const REGISTRY_OUTPUT = `releases/data/${GENERATION}-v8-fast-registry.json`;
const PAYLOAD_OUTPUT = `releases/data/${GENERATION}-sector-intelligence.json`;
const AUDIT_OUTPUT = `releases/data/intelligence/${GENERATION}/${GENERATION}-parquet-audit.json`;
const SOURCE_LEDGER_OUTPUT = `releases/data/intelligence/${GENERATION}/${GENERATION}-source-ledger-receipt.json`;
const MANIFEST_OUTPUT = `build/${GENERATION}-v8-fast-site-manifest.json`;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function jsonBytes(value, pretty = true) {
  return Buffer.from(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`);
}

function repositoryPath(relativePath) {
  assert.equal(path.posix.normalize(relativePath), relativePath, `input path is not normalised: ${relativePath}`);
  const resolved = path.resolve(ROOT, relativePath);
  assert.ok(resolved.startsWith(`${ROOT}${path.sep}`), `input escapes repository: ${relativePath}`);
  return resolved;
}

function childPath(root, relativePath) {
  assert.equal(path.posix.normalize(relativePath), relativePath, `output path is not normalised: ${relativePath}`);
  const resolved = path.resolve(root, relativePath);
  assert.ok(resolved.startsWith(`${root}${path.sep}`), `output escapes candidate root: ${relativePath}`);
  return resolved;
}

function assertResolved(value, label) {
  assert.ok(typeof value === "string" && !value.includes("__"), `${label} remains an explicit draft placeholder`);
}

function replaceExactly(source, from, to, count = 1) {
  const actual = source.split(from).length - 1;
  assert.equal(actual, count, `replacement count changed for ${JSON.stringify(from)}`);
  return source.split(from).join(to);
}

function replaceRegexExactly(source, expression, replacement, count = 1) {
  const flags = expression.flags.includes("g") ? expression.flags : `${expression.flags}g`;
  const matches = source.match(new RegExp(expression.source, flags)) || [];
  assert.equal(matches.length, count, `replacement count changed for ${expression}`);
  return source.replace(expression, replacement);
}

async function readPinned(relativePath) {
  const expected = PINNED_SHA256[relativePath];
  assertResolved(relativePath, `input path ${relativePath}`);
  assertResolved(expected, `input digest ${relativePath}`);
  assert.match(expected, /^[a-f0-9]{64}$/u, `invalid pinned SHA-256: ${relativePath}`);
  const bytes = await readFile(repositoryPath(relativePath));
  assert.equal(sha256(bytes), expected, `pinned input changed: ${relativePath}`);
  return bytes;
}

async function readCandidateAsset(candidateRoot, relativePath) {
  const bytes = await readFile(childPath(candidateRoot, relativePath));
  return { path: relativePath, bytes: bytes.length, sha256: sha256(bytes), content: bytes };
}

function rewriteRuntime(parentSource, cacheIdentity) {
  let source = parentSource;
  source = replaceRegexExactly(source, /const GENERATION = "\d{12}";/u, `const GENERATION = "${GENERATION}";`);
  source = replaceRegexExactly(source, /const EXPECTED_COMPILER_METHOD = "[^"]+";/u,
    `const EXPECTED_COMPILER_METHOD = "${COMPILER_METHOD}";`);
  source = replaceRegexExactly(source, /const EXPECTED_CACHE_IDENTITY = "[a-f0-9]{64}";/u,
    `const EXPECTED_CACHE_IDENTITY = "${cacheIdentity}";`);
  source = replaceExactly(source, "  searchReady: false,\n};",
    "  searchReady: false,\n  sectorIntelligenceImports: 0,\n  sectorPayloadRequestsAtMount: 0,\n};");
  const loader = `async function openSectorIntelligence() {
  const button = document.getElementById("sectorIntelOpen");
  const host = document.getElementById("sectorIntelHost");
  const meta = document.getElementById("sectorIntelMeta");
  invariant(button && host && meta, "sector-intelligence controls are missing");
  if (host.dataset.sectorIntelligenceState === "ready") {
    host.hidden = !host.hidden;
    button.setAttribute("aria-expanded", String(!host.hidden));
    return;
  }
  if (host.dataset.sectorIntelligenceState === "loading") return;
  const entry = registry.supplemental_assets?.sector_intelligence;
  invariant(entry?.activation === "dynamic-import-on-user-open; payload-fetch-on-first-topic-selection", "sector activation changed");
  invariant(entry.project_bindings === 0 && entry.eligible_for_news_signal === false, "sector binding boundary changed");
  host.hidden = false;
  host.dataset.sectorIntelligenceState = "loading";
  button.setAttribute("aria-expanded", "true");
  meta.textContent = "LOAD · importing sector controls; no payload requested";
  runtimeEvidence.sectorIntelligenceImports += 1;
  invariant(runtimeEvidence.sectorIntelligenceImports === 1, "sector cartridge imported more than once");
  const cartridge = await import(\`./\${entry.cartridge.filename}\`);
  invariant(cartridge.SECTOR_INTELLIGENCE_CARTRIDGE_CONTRACT.generation === GENERATION, "sector cartridge identity changed");
  const result = cartridge.mountSectorIntelligence({
    host,
    payloadAsset: {
      ...entry.payload,
      url: new URL(\`../\${entry.payload.path}\`, import.meta.url).pathname.split("/releases/")[1],
    },
  });
  runtimeEvidence.sectorPayloadRequestsAtMount = result.payloadRequests;
  invariant(runtimeEvidence.sectorPayloadRequestsAtMount === 0, "sector payload requested at mount");
  meta.textContent = "WAIT · five topics · choose one to request the compact Parquet-derived payload";
}

function bindSectorIntelligence() {
  const button = document.getElementById("sectorIntelOpen");
  invariant(button, "sector-intelligence opener is missing");
  button.addEventListener("click", () => openSectorIntelligence().catch((error) => {
    console.error("sector intelligence", error);
    document.getElementById("sectorIntelMeta").textContent = "FAIL · sector intelligence unavailable";
  }));
}

`;
  source = replaceExactly(source, "function scheduleOptionalLoads() {", `${loader}function scheduleOptionalLoads() {`);
  source = replaceExactly(source, "  bindNewsControls();\n  populateCounties();",
    "  bindNewsControls();\n  bindSectorIntelligence();\n  populateCounties();");
  source = replaceRegexExactly(source, /document\.getElementById\("releaseMeta"\)\.textContent = `[^`]+`;/u,
    "document.getElementById(\"releaseMeta\").textContent = `Live News + five-topic sector intelligence candidate · ${rows.length.toLocaleString(\"en-GB\")} canonical projects · ${registry.performance.maximum_physical_project_rows} physical rows · sector payload lazy · NOT DEPLOYED`;"
  );
  assert.equal(source.match(/sectorIntelligenceImports \+= 1/gu)?.length, 1);
  assert.equal(source.match(/bindSectorIntelligence\(\)/gu)?.length, 2);
  return `${source.trimEnd()}\n`;
}

function rewriteHtml(parentSource) {
  let source = parentSource;
  source = replaceRegexExactly(source, /<title>[^<]+<\/title>/u,
    "<title>GlobalGrid2050 | PipelineNews five-topic sector intelligence candidate</title>");
  source = replaceRegexExactly(source, /data-fast-generation="\d{12}"/u, `data-fast-generation="${GENERATION}"`);
  source = replaceRegexExactly(source, /javascript\/\d{12}-v8-fast-runtime\.js/u,
    `javascript/${GENERATION}-v8-fast-runtime.js`);
  const insertion = `    <section class="meta sector-intelligence-launch" aria-labelledby="sectorIntelHeading">
      <strong id="sectorIntelHeading">SECTOR INTELLIGENCE</strong>
      <span>Data centres · inverter security/policy · Strait of Hormuz · Ukraine · Great Grid Upgrade · worldwide PV · MV/HV components.</span>
      <span>NON-COMMERCIAL OPEN-SOURCE APPLICATION. UPSTREAM RIGHTS REMAIN SOURCE-SPECIFIC AND ARE NEVER INFERRED FROM APP USAGE.</span>
      <span>Three PipelineNews ZSTD Parquet grains. The browser projection exists only after DuckDB landed-file readback.</span>
      <span>SECTOR CONTEXT ONLY — NOT A PROJECT BINDING. The generic 136-headline newspaper remains separate and unchanged.</span>
      <button class="btn" id="sectorIntelOpen" type="button" aria-controls="sectorIntelHost" aria-expanded="false">OPEN SECTOR INTELLIGENCE</button>
      <span id="sectorIntelMeta">WAIT · dynamic cartridge not requested at startup</span>
      <div id="sectorIntelHost" hidden></div>
    </section>

`;
  source = replaceExactly(source, '    <h2 class="section-title">REPD PIPELINE ANALYTICS</h2>',
    `${insertion}    <h2 class="section-title">REPD PIPELINE ANALYTICS</h2>`);
  assert.ok(source.includes("136 HEADLINES · 47 UK · 19 INTERNATIONAL"));
  assert.ok(source.includes("NOT DEPLOYED"));
  assert.equal(source.match(/id="sectorIntelOpen"/gu)?.length, 1);
  assert.equal(source.match(/id="sectorIntelHost"/gu)?.length, 1);
  return `${source.trimEnd()}\n`;
}

async function validateSectorData(candidateRoot, auditPath, contract) {
  const auditBytes = await readFile(auditPath);
  const audit = JSON.parse(auditBytes);
  assert.equal(audit.schema, "pipelinenews.sector-intelligence-parquet-audit.v3");
  assert.equal(audit.generation, GENERATION);
  assert.equal(audit.status, "PASS");
  assert.equal(audit.duckdb_version, "1.3.2");
  assert.equal(audit.usage_context, "NON_COMMERCIAL_OPEN_SOURCE");
  assert.equal(audit.application_usage_establishes_upstream_rights, false);
  assert.equal(audit.datasets.length, 3);
  assert.deepEqual(audit.datasets.map(({ landed }) => landed.dataset), DATASETS);
  assert.equal(audit.summary.rows_equal_distinct_declared_keys, true);
  assert.equal(audit.summary.null_declared_keys, 0);
  assert.equal(audit.summary.blank_declared_keys, 0);
  assert.equal(audit.summary.duplicate_key_groups, 0);
  assert.equal(audit.summary.full_typed_value_equality, true);
  assert.equal(audit.summary.all_schemas_exact, true);
  assert.equal(audit.summary.all_nonempty_column_chunks_zstd, true);
  assert.equal(audit.summary.sector_project_bindings, 0);
  assert.equal(audit.summary.generic_news_rows_mutated, false);
  assert.equal(audit.summary.owner_parquet_copied, false);
  assert.equal(audit.source_ledger.schema, "pipelinenews.sector-intelligence-ledger.v3");
  assert.match(audit.source_ledger.sha256, /^[a-f0-9]{64}$/u);
  assert.ok(Number.isSafeInteger(audit.source_ledger.bytes) && audit.source_ledger.bytes > 0);
  assert.match(audit.source_ledger.collection_anchor_at,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u);
  assert.equal(new Date(audit.source_ledger.collection_anchor_at).toISOString().replace(".000Z", "Z"),
    audit.source_ledger.collection_anchor_at);
  assert.equal(audit.source_ledger.collection_anchor_basis,
    contract.time_provenance.live_collection_anchor_basis);
  assert.ok(Array.isArray(audit.source_ledger.source_statuses));
  assert.equal(audit.source_ledger.source_statuses.length, contract.sources.length);
  assert.equal(audit.source_ledger.policy_evidence.network_requests, contract.limits.maximum_network_requests);
  const records = [];
  for (const name of DATASETS) {
    const relative = `releases/data/intelligence/${GENERATION}/${DATASET_DIRECTORIES[name]}/${GENERATION}-part-000.parquet`;
    const record = await readCandidateAsset(candidateRoot, relative);
    const landedAudit = audit.datasets.find(({ landed }) => landed.dataset === name).landed;
    assert.equal(record.bytes, landedAudit.bytes);
    assert.equal(record.sha256, landedAudit.sha256);
    records.push({ path: relative, bytes: record.bytes, sha256: record.sha256 });
  }
  const payload = await readCandidateAsset(candidateRoot, PAYLOAD_OUTPUT);
  const decoded = JSON.parse(payload.content);
  assert.equal(decoded.schema, contract.browser_projection.schema);
  assert.equal(decoded.generation, GENERATION);
  assert.equal(decoded.derived_only_from_landed_parquet_duckdb_readback, true);
  assert.equal(decoded.project_bindings, 0);
  assert.equal(decoded.eligible_for_news_signal, false);
  assert.equal(decoded.generic_news_rows_mutated, false);
  assert.equal(decoded.rows.length, audit.summary.browser_rows);
  const genericIndex = decoded.fields.indexOf("generic_article_id");
  const bindingIndex = decoded.fields.indexOf("binding_label");
  assert.equal(decoded.rows.filter((row) => row[genericIndex]).length, 6);
  assert.ok(decoded.rows.filter((row) => row[genericIndex]).every((row) =>
    row[bindingIndex] === "SECTOR CONTEXT ONLY — QUERY PROJECT IDENTITY REMOVED"));
  records.push({ path: PAYLOAD_OUTPUT, bytes: payload.bytes, sha256: payload.sha256 });
  const sourceReceipt = await readCandidateAsset(candidateRoot, SOURCE_LEDGER_OUTPUT);
  const decodedReceipt = JSON.parse(sourceReceipt.content);
  assert.equal(decodedReceipt.schema, "pipelinenews.sector-intelligence-source-ledger-receipt.v3");
  assert.equal(decodedReceipt.generation, GENERATION);
  assert.equal(decodedReceipt.usage_context, "NON_COMMERCIAL_OPEN_SOURCE");
  assert.equal(decodedReceipt.application_usage_establishes_upstream_rights, false);
  assert.deepEqual(decodedReceipt.source_ledger, {
    schema: audit.source_ledger.schema,
    bytes: audit.source_ledger.bytes,
    sha256: audit.source_ledger.sha256,
    collection_anchor_at: audit.source_ledger.collection_anchor_at,
    collection_anchor_basis: audit.source_ledger.collection_anchor_basis,
    source_statuses: audit.source_ledger.source_statuses,
    policy_evidence: audit.source_ledger.policy_evidence,
  });
  assert.deepEqual(audit.source_ledger.sanitized_receipt, {
    path: SOURCE_LEDGER_OUTPUT,
    bytes: sourceReceipt.bytes,
    sha256: sourceReceipt.sha256,
  });
  assert.equal(decodedReceipt.retained_raw_html_bytes, 0);
  assert.equal(decodedReceipt.retained_article_body_bytes, 0);
  assert.equal(decodedReceipt.retained_search_snippet_characters, 0);
  assert.equal(decodedReceipt.deployment, "not-authorised");
  records.push({ path: SOURCE_LEDGER_OUTPUT, bytes: sourceReceipt.bytes, sha256: sourceReceipt.sha256 });
  return {
    audit,
    auditBytes,
    auditRecord: { path: AUDIT_OUTPUT, bytes: auditBytes.length, sha256: sha256(auditBytes) },
    payload: { path: path.posix.relative("releases", PAYLOAD_OUTPUT), bytes: payload.bytes, sha256: payload.sha256 },
    records,
  };
}

async function compile(candidateRoot, auditPath) {
  for (const [label, value] of Object.entries({
    PARENT_GENERATION, SOURCE_PARENT_COMMIT, PARENT_OUTPUT_COMMIT, PARENT_SOURCE_COMMIT, PARENT_GITHUB_RUN_ID,
  })) assertResolved(value, label);
  assert.match(PARENT_GENERATION, /^\d{12}$/u);
  assert.ok(BigInt(GENERATION) > BigInt(PARENT_GENERATION));
  for (const value of [SOURCE_PARENT_COMMIT, PARENT_OUTPUT_COMMIT, PARENT_SOURCE_COMMIT]) assert.match(value, /^[a-f0-9]{40}$/u);
  assert.match(PARENT_GITHUB_RUN_ID, /^\d+$/u);
  const sourceCommit = process.env.SOURCE_COMMIT;
  const githubRunId = process.env.GITHUB_RUN_ID;
  assert.match(sourceCommit || "", /^[a-f0-9]{40}$/u, "SOURCE_COMMIT must be an exact Git SHA");
  assert.match(githubRunId || "", /^\d+$/u, "GITHUB_RUN_ID must be numeric");
  const compilerBytes = await readFile(fileURLToPath(import.meta.url));
  const inputRecords = [];
  const inputs = {};
  for (const [name, relative] of Object.entries(INPUTS)) {
    const bytes = await readPinned(relative);
    inputs[name] = bytes;
    inputRecords.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const parentManifest = JSON.parse(inputs.parentManifest);
  const parentRegistry = JSON.parse(inputs.parentRegistry);
  const contract = JSON.parse(inputs.contract);
  assert.equal(parentManifest.generation, PARENT_GENERATION);
  assert.equal(parentManifest.source_commit, PARENT_SOURCE_COMMIT);
  assert.equal(parentManifest.github_run_id, PARENT_GITHUB_RUN_ID);
  assert.equal(parentManifest.deployment, "not-authorised");
  assert.equal(parentRegistry.generation, PARENT_GENERATION);
  assert.equal(parentRegistry.cache_identity, parentManifest.cache_identity);
  assert.equal(parentRegistry.totals.project_count, 7680);
  assert.equal(parentRegistry.totals.capacity_mw, 356474.09);
  assert.deepEqual(parentRegistry.news_counts,
    { all: 136, uk: 47, international: 19, us: 4, europe: 9, other: 6 });
  assert.deepEqual(parentRegistry.cartridges.atlas_v8_deep_link, {
    schema: "pipelinenews.atlas-v8-deep-link-cartridge.v1",
    generation: "202608271329",
    source_sha256: PINNED_SHA256[INPUTS.atlasCartridge],
    path: "javascript/202608271329-atlas-v8-deep-link-cartridge.js",
    sha256: PINNED_SHA256[INPUTS.atlasCartridge],
    bytes: inputs.atlasCartridge.length,
    identity_anchor: "repd_ref",
    query_parameter_order: ["repd_ref", "project", "technology", "capacity_mw", "latitude", "longitude", "zoom"],
    deployment: "not-authorised",
  });
  assert.deepEqual(parentRegistry.cartridges.mobile_orientation, {
    schema: "pipelinenews.v8.mobile-orientation-repair.v1",
    generation: PARENT_GENERATION,
    path: "styles/202608272048-orientation.css",
    sha256: PINNED_SHA256[INPUTS.parentOrientation],
    bytes: inputs.parentOrientation.length,
    runtime_dom_mutation: false,
    deployment: "not-authorised",
  });
  assert.equal(contract.schema, "pipelinenews.sector-intelligence-contract.v3");
  assert.equal(contract.generation, GENERATION);
  assert.equal(contract.project_posture.application, "NON_COMMERCIAL_OPEN_SOURCE");
  assert.equal(contract.project_posture.application_usage_establishes_upstream_rights, false);
  assert.deepEqual(contract.time_provenance, {
    generation_label_timezone: "Europe/London",
    generation_label_utc_anchor: "2026-08-27T20:30:00Z",
    live_collection_anchor_field: "collection_anchor_at",
    live_collection_anchor_basis: "ACTIONS_LIVE_COLLECTION_STARTED_AT",
    github_run_id_is_execution_provenance: true,
    collection_anchor_claims_wall_clock_fetch_time: true,
  });
  assert.deepEqual(contract.datasets.map(({ name }) => name), DATASETS);
  assert.equal(contract.physical_layout.path_template,
    `releases/data/intelligence/${GENERATION}/{dataset_directory}/${GENERATION}-part-000.parquet`);
  assert.deepEqual(contract.physical_layout.dataset_directories, DATASET_DIRECTORIES);
  assert.equal(contract.federation.data_centres.owner_parquet_copied, false);
  assert.equal(contract.federation.companies_house.acquisition_in_pipelinenews, false);
  const sourceCartridge = await import(`${pathToFileURL(repositoryPath(INPUTS.cartridge)).href}?sha=${PINNED_SHA256[INPUTS.cartridge]}`);
  assert.equal(sourceCartridge.SECTOR_INTELLIGENCE_CARTRIDGE_CONTRACT.generation, GENERATION);
  assert.equal(sourceCartridge.SECTOR_INTELLIGENCE_CARTRIDGE_CONTRACT.atman_runtime_dependency, false);
  const sector = await validateSectorData(candidateRoot, auditPath, contract);
  const cacheContract = {
    schema: "pipelinenews.v8.sector-intelligence-cache-contract.v3",
    compiler_method: COMPILER_METHOD,
    compiler: { path: `index/${COMPILER_FILE}`, sha256: sha256(compilerBytes) },
    source_parent_commit: SOURCE_PARENT_COMMIT,
    parent_output_commit: PARENT_OUTPUT_COMMIT,
    protected_recovery_commit: PROTECTED_RECOVERY_COMMIT,
    parent_generation: PARENT_GENERATION,
    rollback_generation: ROLLBACK_GENERATION,
    parent_cache_identity: parentRegistry.cache_identity,
    project_index: parentRegistry.cache_contract.project_index,
    search_index: parentRegistry.cache_contract.search_index,
    news_index: parentRegistry.cache_contract.news_index,
    news_ordering: parentRegistry.cache_contract.news_ordering,
    atlas_deep_link: parentRegistry.cache_contract.atlas_deep_link,
    runtime: parentRegistry.cache_contract.runtime,
    sector_intelligence: {
      generation: GENERATION,
      topics: contract.topics,
      datasets: contract.datasets.map(({ name, grain, key, columns }) => ({ name, grain, key, columns })),
      physical_layout: contract.physical_layout,
      data_centres_owner: contract.federation.data_centres,
      generic_news: contract.frozen_generic_news,
      payload: sector.payload,
      audit: sector.auditRecord,
      project_bindings: 0,
      eligible_for_news_signal: false,
      activation: "dynamic-import-on-user-open; payload-fetch-on-first-topic-selection",
      startup_requests: 0,
    },
  };
  const cacheIdentity = sha256(Buffer.from(JSON.stringify(cacheContract)));
  const cartridgeBytes = inputs.cartridge;
  const cartridgeRecord = {
    schema: sourceCartridge.SECTOR_INTELLIGENCE_CARTRIDGE_CONTRACT.schema,
    generation: GENERATION,
    filename: path.basename(CARTRIDGE_OUTPUT),
    path: path.posix.relative("releases", CARTRIDGE_OUTPUT),
    bytes: cartridgeBytes.length,
    sha256: sha256(cartridgeBytes),
    activation: "dynamic-import-on-user-open",
  };
  const registry = {
    ...parentRegistry,
    generation: GENERATION,
    name: NAME,
    compiler_method: COMPILER_METHOD,
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    cartridges: { ...parentRegistry.cartridges, sector_intelligence: cartridgeRecord },
    supplemental_assets: {
      ...(parentRegistry.supplemental_assets || {}),
      sector_intelligence: {
        schema: "pipelinenews.sector-intelligence-supplemental-asset.v3",
        generation: GENERATION,
        usage_context: "NON_COMMERCIAL_OPEN_SOURCE",
        usage_context_establishes_upstream_rights: false,
        activation: "dynamic-import-on-user-open; payload-fetch-on-first-topic-selection",
        cartridge: cartridgeRecord,
        payload: sector.payload,
        topics: contract.topics,
        parquet_datasets: DATASETS,
        data_centres_owner_repository: "Ventusltd/data-centres-gb",
        owner_parquet_copied: false,
        companies_house_owner_repository: "Ventusltd/companies",
        project_bindings: 0,
        eligible_for_news_signal: false,
        deployment: "not-authorised",
      },
    },
    deployment: "not-authorised",
  };
  assert.deepEqual(registry.assets, parentRegistry.assets);
  assert.deepEqual(registry.totals, parentRegistry.totals);
  assert.deepEqual(registry.news_counts, parentRegistry.news_counts);
  assert.deepEqual(registry.signals, parentRegistry.signals);
  const registryBytes = jsonBytes(registry);
  const runtimeBytes = Buffer.from(rewriteRuntime(inputs.parentRuntime.toString("utf8"), cacheIdentity));
  const htmlBytes = Buffer.from(rewriteHtml(inputs.parentHtml.toString("utf8")));
  assert.ok(htmlBytes.includes(Buffer.from('href="styles/202608272048-orientation.css"')));
  assert.ok(runtimeBytes.includes(Buffer.from('from "./202608271329-atlas-v8-deep-link-cartridge.js"')));
  let initialDecodedBytes = htmlBytes.length + runtimeBytes.length + registryBytes.length;
  for (const name of ["projects", "style"]) {
    const asset = parentRegistry.assets[name];
    const relative = path.posix.join("releases", asset.path);
    const bytes = await readFile(repositoryPath(relative));
    assert.equal(bytes.length, asset.bytes);
    assert.equal(sha256(bytes), asset.sha256);
    inputRecords.push({ path: relative, bytes: bytes.length, sha256: sha256(bytes) });
    initialDecodedBytes += bytes.length;
  }
  initialDecodedBytes += inputs.parentOrientation.length + inputs.atlasCartridge.length;
  for (const excluded of [cartridgeBytes.length, sector.payload.bytes]) assert.ok(excluded > 0);
  assert.ok(initialDecodedBytes < 2_000_000, `initial decoded closure is ${initialDecodedBytes} bytes`);
  const generated = new Map([
    [HTML_OUTPUT, htmlBytes],
    [RUNTIME_OUTPUT, runtimeBytes],
    [CARTRIDGE_OUTPUT, cartridgeBytes],
    [REGISTRY_OUTPUT, registryBytes],
    [AUDIT_OUTPUT, sector.auditBytes],
  ]);
  const generatedRecords = [...generated].map(([relativePath, bytes]) => ({
    path: relativePath, bytes: bytes.length, sha256: sha256(bytes),
  }));
  const dataRecords = sector.records.map(({ path: relativePath, bytes, sha256: digest }) => ({
    path: relativePath, bytes, sha256: digest,
  }));
  const nonManifestOutputs = [...dataRecords, ...generatedRecords].sort((left, right) => left.path.localeCompare(right.path));
  assert.equal(new Set(nonManifestOutputs.map(({ path: relativePath }) => relativePath)).size, nonManifestOutputs.length);
  assert.equal(nonManifestOutputs.filter(({ path: relativePath }) => relativePath.endsWith(`${GENERATION}-part-000.parquet`)).length, 3);
  assert.ok(nonManifestOutputs.every(({ path: relativePath }) => relativePath.startsWith("releases/")));
  const manifest = {
    schema: "pipelinenews.v8.fast-site-candidate.v1",
    generation: GENERATION,
    name: NAME,
    source_commit: sourceCommit,
    source_parent_commit: SOURCE_PARENT_COMMIT,
    parent_output_commit: PARENT_OUTPUT_COMMIT,
    parent_source_commit: PARENT_SOURCE_COMMIT,
    github_run_id: githubRunId,
    compiler: { path: `index/${COMPILER_FILE}`, method: COMPILER_METHOD, sha256: sha256(compilerBytes) },
    project_posture: contract.project_posture,
    time_provenance: {
      ...contract.time_provenance,
      collection_anchor_at: sector.audit.source_ledger.collection_anchor_at,
      collection_anchor_basis: sector.audit.source_ledger.collection_anchor_basis,
      github_run_id: githubRunId,
    },
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    protected_parent: PROTECTED_RECOVERY_COMMIT,
    parent_generation: PARENT_GENERATION,
    rollback_generation: ROLLBACK_GENERATION,
    parity: { ...parentManifest.parity },
    performance_contract: {
      ...parentManifest.performance_contract,
      initial_decoded_bytes: initialDecodedBytes,
      sector_module_requests_at_startup: 0,
      sector_payload_requests_at_startup: 0,
      sector_payload_requests_at_mount: 0,
      maximum_sector_payload_requests: 1,
      maximum_sector_rows_per_topic: contract.browser_projection.maximum_rows_per_topic,
    },
    discipline: {
      ...parentManifest.discipline,
      application_usage_context: "NON_COMMERCIAL_OPEN_SOURCE",
      application_usage_establishes_upstream_rights: false,
      source_specific_rights_per_item: true,
      committed_sanitized_source_ledger_receipt: true,
      source_ledger_sha256: sector.audit.source_ledger.sha256,
      collection_anchor_at: sector.audit.source_ledger.collection_anchor_at,
      collection_anchor_basis: sector.audit.source_ledger.collection_anchor_basis,
      generic_news_rows_changed: false,
      generic_news_counts_changed: false,
      query_context_used_for_project_identity: false,
      data_centre_generic_rows_sanitised_in_sector_view: 6,
      data_centres_owner_repository: "Ventusltd/data-centres-gb",
      data_centres_owner_export_rows: sector.audit.summary.sector_items > 0 ? 3 : 0,
      sector_items: sector.audit.summary.sector_items,
      data_centres_owner_parquet_copied: false,
      companies_house_owner_repository: "Ventusltd/companies",
      companies_house_acquisition_in_pipelinenews: false,
      parquet_datasets: 3,
      write_audit_publish: true,
      duckdb_landed_readback: true,
      parquet_nonempty_chunks_zstd: true,
      project_bindings: 0,
      project_signals_changed: false,
      atman_runtime_dependency: false,
      stable_route_changed: false,
      current_pointer_changed: false,
      globalgrid_catalogue_changed: false,
      pages_deployment_authorised: false,
    },
    inputs: inputRecords.sort((left, right) => left.path.localeCompare(right.path)),
    outputs: nonManifestOutputs,
    evidence: "workflow-artifacts-plus-committed-sanitized-source-ledger-receipt",
    deployment: "not-authorised",
  };
  generated.set(MANIFEST_OUTPUT, jsonBytes(manifest));
  return { generated, manifest };
}

function argument(argv, name) {
  const index = argv.indexOf(name);
  assert.ok(index >= 0 && index + 1 < argv.length, `${name} is required`);
  assert.equal(argv.lastIndexOf(name), index, `${name} is duplicated`);
  return argv[index + 1];
}

async function main() {
  const argv = process.argv.slice(2);
  assert.equal(argv.length, 6, "usage: --sector-root <directory> --audit <path> --out-root <directory>");
  const candidateRoot = path.resolve(argument(argv, "--sector-root"));
  const auditPath = path.resolve(argument(argv, "--audit"));
  const outRoot = path.resolve(argument(argv, "--out-root"));
  assert.equal(candidateRoot, outRoot, "sector data and app must share one immutable candidate root");
  assert.ok(outRoot.includes(GENERATION), "candidate root must contain the generation timestamp");
  const { generated, manifest } = await compile(candidateRoot, auditPath);
  for (const [relativePath, bytes] of generated) {
    const target = childPath(outRoot, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
  process.stdout.write(`${JSON.stringify({
    schema: "pipelinenews.v8.sector-intelligence-compiler-result.v3",
    generation: GENERATION,
    parent_generation: PARENT_GENERATION,
    source_commit: manifest.source_commit,
    cache_identity: manifest.cache_identity,
    files: generated.size,
    closure_files: manifest.outputs.length + 1,
    parquet_datasets: 3,
    sector_items: manifest.discipline.sector_items,
    projects: manifest.parity.project_count,
    headlines: manifest.parity.headlines,
    deployment: manifest.deployment,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
