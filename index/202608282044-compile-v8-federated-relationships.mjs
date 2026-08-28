import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GENERATION = "202608282044";
const SOURCE_PARENT_COMMIT = "a1516f23a2f8f1e2a3b286ed73cd580ce501c179";
const PARENT_OUTPUT_COMMIT = "58ca361c921264c1218d4a3f6d1f87da33f8473e";
const PARENT_GENERATION = "202608272130";
const PROTECTED_RECOVERY_COMMIT = "77bda8c3809d02550d06a1c4154315f56d1120fb";
const COMPILER_METHOD = "pipelinenews-v8-federated-relationship-abstention-lazy-v1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const INPUT = Object.freeze({
  frozenContract: "data/federation/202608282041-relationship-intelligence-contract.json",
  sourceManifest: `manifests/${GENERATION}-federated-relationship-candidate.json`,
  parentManifest: `build/${PARENT_GENERATION}-v8-fast-site-manifest.json`,
  parentHtml: `releases/${PARENT_GENERATION}-v8-fast-candidate.html`,
  parentRuntime: `releases/javascript/${PARENT_GENERATION}-v8-fast-runtime.js`,
  parentRegistry: `releases/data/${PARENT_GENERATION}-v8-fast-registry.json`,
  cartridge: `ui/cartridges/${GENERATION}-federated-relationships.mjs`,
});

const OUTPUT = Object.freeze({
  html: `releases/${GENERATION}-v8-fast-candidate.html`,
  runtime: `releases/javascript/${GENERATION}-v8-fast-runtime.js`,
  registry: `releases/data/${GENERATION}-v8-fast-registry.json`,
  cartridge: `releases/javascript/${GENERATION}-federated-relationships.js`,
  payload: `releases/data/${GENERATION}-relationship-governance-status.json`,
  parquet: `releases/data/intelligence/${GENERATION}/relationship-governance-status/${GENERATION}-part-000.parquet`,
  audit: `releases/data/intelligence/${GENERATION}/${GENERATION}-relationship-governance-audit.json`,
  manifest: `build/${GENERATION}-v8-fast-site-manifest.json`,
});

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const jsonBytes = (value, pretty = true) => Buffer.from(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`);

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    assert.match(argv[index] || "", /^--[a-z-]+$/u);
    assert.ok(argv[index + 1], `missing value for ${argv[index]}`);
    values.set(argv[index].slice(2), argv[index + 1]);
  }
  for (const key of ["out-root", "audit"]) assert.ok(values.has(key), `missing --${key}`);
  return Object.fromEntries(values);
}

function repositoryPath(relative) {
  assert.equal(path.posix.normalize(relative), relative, `unnormalised repository path: ${relative}`);
  const resolved = path.resolve(ROOT, relative);
  assert.ok(resolved.startsWith(`${ROOT}${path.sep}`), `repository path escaped: ${relative}`);
  return resolved;
}

function outputPath(outRoot, relative) {
  const resolved = path.resolve(outRoot, relative);
  assert.ok(resolved.startsWith(`${outRoot}${path.sep}`), `output path escaped: ${relative}`);
  return resolved;
}

function replaceExactly(source, needle, replacement) {
  assert.equal(source.split(needle).length - 1, 1, `expected one replacement anchor: ${needle.slice(0, 80)}`);
  return source.replace(needle, replacement);
}

async function readPinned(relative, pin) {
  const bytes = await readFile(repositoryPath(relative));
  assert.equal(bytes.length, pin.bytes, `byte drift: ${relative}`);
  assert.equal(sha256(bytes), pin.sha256, `digest drift: ${relative}`);
  return bytes;
}

function record(relative, bytes) {
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}

function compileHtml(parentBytes) {
  let source = parentBytes.toString("utf8");
  assert.ok(!source.includes("federatedRelationshipOpen"));
  const section = `    <section class="meta sector-intelligence-launch" aria-labelledby="federatedRelationshipHeading">
      <strong id="federatedRelationshipHeading">RELATIONSHIP EVIDENCE — CANDIDATES AND ABSTENTIONS</strong>
      <span>Compact Companies and data-centre governance projection. No bulk source corpus is copied.</span>
      <span>All three rows remain ABSTAIN. No ownership, operator, developer, facility or project identity is asserted.</span>
      <button class="btn" id="federatedRelationshipOpen" type="button" aria-controls="federatedRelationshipHost" aria-expanded="false">OPEN RELATIONSHIP EVIDENCE</button>
      <span id="federatedRelationshipMeta">WAIT · zero relationship requests before explicit open</span>
      <div id="federatedRelationshipHost" hidden></div>
    </section>

`;
  source = replaceExactly(source, '    <h2 class="section-title">REPD PIPELINE ANALYTICS</h2>', `${section}    <h2 class="section-title">REPD PIPELINE ANALYTICS</h2>`);
  source = replaceExactly(source, `javascript/${PARENT_GENERATION}-v8-fast-runtime.js`, `javascript/${GENERATION}-v8-fast-runtime.js`);
  return Buffer.from(source);
}

function compileRuntime(parentBytes, cacheIdentity) {
  let source = parentBytes.toString("utf8");
  source = replaceExactly(source, `const GENERATION = "${PARENT_GENERATION}";`, `const GENERATION = "${GENERATION}";`);
  source = replaceExactly(source, 'const EXPECTED_COMPILER_METHOD = "pipelinenews-v8-sector-intelligence-three-grain-lazy-v3";', `const EXPECTED_COMPILER_METHOD = "${COMPILER_METHOD}";`);
  source = replaceExactly(source, 'const EXPECTED_CACHE_IDENTITY = "38bf9950be3ef8e2d67a9401ae2b058a3349a704aee57cd6b858b97053bdd9d1";', `const EXPECTED_CACHE_IDENTITY = "${cacheIdentity}";`);
  source = replaceExactly(source, "  sectorPayloadRequestsAtMount: 0,\n};", "  sectorPayloadRequestsAtMount: 0,\n  federatedRelationshipImports: 0,\n  federatedRelationshipPayloadRequests: 0,\n};");
  const loader = `async function openFederatedRelationships() {
  const button = document.getElementById("federatedRelationshipOpen");
  const host = document.getElementById("federatedRelationshipHost");
  const meta = document.getElementById("federatedRelationshipMeta");
  invariant(button && host && meta, "federated relationship controls are missing");
  if (host.dataset.federatedRelationshipState === "ready") {
    host.hidden = !host.hidden;
    button.setAttribute("aria-expanded", String(!host.hidden));
    return;
  }
  if (host.dataset.federatedRelationshipState === "loading") return;
  const entry = registry.supplemental_assets?.relationship_governance_status;
  invariant(entry?.activation === "dynamic-import-on-user-open; projection-fetch-after-explicit-open", "relationship activation changed");
  invariant(entry.rows === 3 && entry.project_bindings === 0 && entry.eligible_for_join_rows === 0, "relationship boundary changed");
  host.hidden = false;
  host.dataset.federatedRelationshipState = "loading";
  button.setAttribute("aria-expanded", "true");
  meta.textContent = "LOAD · importing controls and verifying one compact payload";
  runtimeEvidence.federatedRelationshipImports += 1;
  invariant(runtimeEvidence.federatedRelationshipImports === 1, "relationship cartridge imported more than once");
  const cartridge = await import(\`./\${entry.cartridge.filename}\`);
  invariant(cartridge.FEDERATED_RELATIONSHIP_CARTRIDGE_CONTRACT.generation === GENERATION, "relationship cartridge identity changed");
  const result = await cartridge.mountFederatedRelationships({
    host,
    payloadAsset: {
      ...entry.payload,
      url: new URL(\`../\${entry.payload.path}\`, import.meta.url).pathname.split("/releases/")[1],
    },
  });
  runtimeEvidence.federatedRelationshipPayloadRequests += result.payloadRequests;
  invariant(runtimeEvidence.federatedRelationshipPayloadRequests === 1 && result.projectBindings === 0, "relationship request or binding boundary changed");
  meta.textContent = "OK · 3 governance rows · all ABSTAIN · zero project bindings";
}

function bindFederatedRelationships() {
  const button = document.getElementById("federatedRelationshipOpen");
  invariant(button, "relationship opener is missing");
  button.addEventListener("click", () => openFederatedRelationships().catch((error) => {
    console.error("federated relationships", error);
    document.getElementById("federatedRelationshipMeta").textContent = "FAIL · relationship evidence unavailable; core product unchanged";
    document.getElementById("federatedRelationshipHost").dataset.federatedRelationshipState = "failed";
  }));
}

`;
  source = replaceExactly(source, "function scheduleOptionalLoads() {", `${loader}function scheduleOptionalLoads() {`);
  source = replaceExactly(source, "  bindSectorIntelligence();\n  populateCounties();", "  bindSectorIntelligence();\n  bindFederatedRelationships();\n  populateCounties();");
  source = replaceExactly(source, "Live News + seven-topic sector intelligence candidate", "Live News + sector and relationship intelligence candidate");
  source = replaceExactly(source, "sector payload lazy · NOT DEPLOYED", "sector and relationship payloads lazy · NOT DEPLOYED");
  return Buffer.from(source);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outRoot = path.resolve(args["out-root"]);
  const sourceCommit = process.env.SOURCE_COMMIT;
  const githubRunId = process.env.GITHUB_RUN_ID;
  assert.match(sourceCommit || "", /^[a-f0-9]{40}$/u);
  assert.match(githubRunId || "", /^\d+$/u);

  const sourceManifest = JSON.parse(await readFile(repositoryPath(INPUT.sourceManifest)));
  assert.equal(sourceManifest.schema, "pipelinenews.federated-relationship-source-manifest.v1");
  assert.equal(sourceManifest.generation, GENERATION);
  assert.equal(sourceManifest.source_parent_commit, SOURCE_PARENT_COMMIT);
  assert.equal(sourceManifest.parent_output_commit, PARENT_OUTPUT_COMMIT);
  assert.equal(sourceManifest.deployment, "not-authorised");
  for (const pin of sourceManifest.source_files) await readPinned(pin.path, pin);
  const frozenPin = sourceManifest.pinned_inputs.find(({ path: relative }) => relative === INPUT.frozenContract);
  assert.ok(frozenPin);
  const frozenBytes = await readPinned(INPUT.frozenContract, frozenPin);
  const frozen = JSON.parse(frozenBytes);
  assert.equal(frozen.generation, "202608282041");
  assert.equal(frozen.publication.next_gate.includes("uploads a candidate without deployment"), true);

  const parentManifestBytes = await readFile(repositoryPath(INPUT.parentManifest));
  const parentManifest = JSON.parse(parentManifestBytes);
  assert.equal(parentManifest.schema, "pipelinenews.v8.fast-site-candidate.v1");
  assert.equal(parentManifest.generation, PARENT_GENERATION);
  assert.equal(parentManifest.parity.project_count, 7680);
  assert.equal(parentManifest.parity.capacity_mw, 356474.09);
  assert.equal(parentManifest.parity.headlines, 136);
  const parentOutputs = new Map(parentManifest.outputs.map((item) => [item.path, item]));
  const parentHtml = await readPinned(INPUT.parentHtml, parentOutputs.get(INPUT.parentHtml));
  const parentRuntime = await readPinned(INPUT.parentRuntime, parentOutputs.get(INPUT.parentRuntime));
  const parentRegistryBytes = await readPinned(INPUT.parentRegistry, parentOutputs.get(INPUT.parentRegistry));
  const parentRegistry = JSON.parse(parentRegistryBytes);
  assert.equal(parentRegistry.generation, PARENT_GENERATION);
  assert.equal(parentRegistry.totals.project_count, 7680);
  assert.equal(parentRegistry.totals.capacity_mw, 356474.09);
  assert.equal(parentRegistry.news_counts.all, 136);

  const payloadBytes = await readFile(outputPath(outRoot, OUTPUT.payload));
  const parquetBytes = await readFile(outputPath(outRoot, OUTPUT.parquet));
  const auditBytes = await readFile(path.resolve(args.audit));
  const projection = JSON.parse(payloadBytes);
  const audit = JSON.parse(auditBytes);
  assert.equal(projection.schema, "pipelinenews.federated-relationship-status-browser.v1");
  assert.equal(projection.generation, GENERATION);
  assert.equal(projection.rows.length, 3);
  assert.ok(projection.rows.every((row) => row.decision === "ABSTAIN" && row.eligible_for_join === false));
  assert.equal(audit.status, "PASS");
  assert.equal(audit.rows, 3);
  assert.deepEqual(audit.compression, ["ZSTD"]);
  assert.equal(audit.outputs.find(({ path: relative }) => relative === OUTPUT.payload).sha256, sha256(payloadBytes));
  assert.equal(audit.outputs.find(({ path: relative }) => relative === OUTPUT.parquet).sha256, sha256(parquetBytes));
  const cartridgeBytes = await readFile(repositoryPath(INPUT.cartridge));
  const compilerBytes = await readFile(fileURLToPath(import.meta.url));

  const relationshipContract = {
    schema: "pipelinenews.federated-relationship-cache-contract.v1",
    generation: GENERATION,
    frozen_contract: record(INPUT.frozenContract, frozenBytes),
    upstream_contracts: frozen.upstream_contracts.map((item) => ({
      id: item.id, repository: item.repository, commit: item.commit, path: item.path,
      bytes: item.bytes, sha256: item.sha256, candidate_commit: item.candidate_commit,
      eligible_for_join: item.eligible_for_join,
    })),
    declared_key: ["relationship_family", "segment"],
    rows: 3,
    decisions: ["ABSTAIN"],
    eligible_for_join_rows: 0,
    project_bindings: 0,
    confirmed_ownership_rows: 0,
    confirmed_operator_rows: 0,
    raw_archives_copied: 0,
    private_individual_names_copied: 0,
    activation: "dynamic-import-on-user-open; projection-fetch-after-explicit-open",
  };
  const cacheContract = {
    ...parentRegistry.cache_contract,
    schema: "pipelinenews.v8.federated-relationship-cache-contract.v1",
    compiler_method: COMPILER_METHOD,
    compiler: { path: `index/${GENERATION}-compile-v8-federated-relationships.mjs`, sha256: sha256(compilerBytes) },
    source_parent_commit: SOURCE_PARENT_COMMIT,
    parent_output_commit: PARENT_OUTPUT_COMMIT,
    protected_recovery_commit: PROTECTED_RECOVERY_COMMIT,
    parent_generation: PARENT_GENERATION,
    parent_cache_identity: parentRegistry.cache_identity,
    relationship_governance_status: relationshipContract,
  };
  const cacheIdentity = sha256(Buffer.from(JSON.stringify(cacheContract)));
  const cartridgeRecord = record(OUTPUT.cartridge, cartridgeBytes);
  const payloadRecord = record(OUTPUT.payload, payloadBytes);
  const parquetRecord = record(OUTPUT.parquet, parquetBytes);
  const auditRecord = record(OUTPUT.audit, auditBytes);
  const supplemental = {
    schema: "pipelinenews.federated-relationship-supplemental-asset.v1",
    generation: GENERATION,
    activation: "dynamic-import-on-user-open; projection-fetch-after-explicit-open",
    startup_module_requests: 0,
    startup_payload_requests: 0,
    maximum_payload_requests: 1,
    rows: 3,
    project_bindings: 0,
    eligible_for_join_rows: 0,
    decisions: ["ABSTAIN"],
    cartridge: { ...cartridgeRecord, filename: path.posix.basename(OUTPUT.cartridge), activation: "dynamic-import-on-user-open" },
    payload: payloadRecord,
    parquet: parquetRecord,
    audit: auditRecord,
    deployment: "not-authorised",
  };
  const registry = {
    ...parentRegistry,
    generation: GENERATION,
    name: "PipelineNews Live News + sector and federated relationship intelligence candidate",
    compiler_method: COMPILER_METHOD,
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    supplemental_assets: { ...parentRegistry.supplemental_assets, relationship_governance_status: supplemental },
    deployment: "not-authorised",
  };
  const registryBytes = jsonBytes(registry);
  const runtimeBytes = compileRuntime(parentRuntime, cacheIdentity);
  const htmlBytes = compileHtml(parentHtml);

  const generated = new Map([
    [OUTPUT.html, htmlBytes],
    [OUTPUT.runtime, runtimeBytes],
    [OUTPUT.registry, registryBytes],
    [OUTPUT.cartridge, cartridgeBytes],
    [OUTPUT.payload, payloadBytes],
    [OUTPUT.parquet, parquetBytes],
    [OUTPUT.audit, auditBytes],
  ]);
  for (const [relative, bytes] of generated) {
    const target = outputPath(outRoot, relative);
    await mkdir(path.dirname(target), { recursive: true });
    if ([OUTPUT.payload, OUTPUT.parquet, OUTPUT.audit].includes(relative)) continue;
    await writeFile(target, bytes, { flag: "wx" });
  }
  const outputs = [...generated].map(([relative, bytes]) => record(relative, bytes)).sort((a, b) => a.path.localeCompare(b.path));
  const manifest = {
    schema: "pipelinenews.v8.fast-site-candidate.v1",
    generation: GENERATION,
    name: registry.name,
    source_commit: sourceCommit,
    source_parent_commit: SOURCE_PARENT_COMMIT,
    parent_output_commit: PARENT_OUTPUT_COMMIT,
    parent_generation: PARENT_GENERATION,
    protected_recovery_commit: PROTECTED_RECOVERY_COMMIT,
    github_run_id: githubRunId,
    compiler: cacheContract.compiler,
    last_known_green_predecessor: frozen.lineage.last_known_green_predecessor,
    canonical_product: frozen.parent_release.canonical_product,
    parity: { ...parentManifest.parity },
    performance_contract: {
      ...parentManifest.performance_contract,
      relationship_module_requests_at_startup: 0,
      relationship_payload_requests_at_startup: 0,
      maximum_relationship_payload_requests: 1,
      relationship_projection_rows: 3,
    },
    relationship_governance_status: relationshipContract,
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    inputs: [
      record(INPUT.parentManifest, parentManifestBytes),
      record(INPUT.parentHtml, parentHtml),
      record(INPUT.parentRuntime, parentRuntime),
      record(INPUT.parentRegistry, parentRegistryBytes),
      record(INPUT.frozenContract, frozenBytes),
      record(INPUT.sourceManifest, await readFile(repositoryPath(INPUT.sourceManifest))),
      record(INPUT.cartridge, cartridgeBytes),
      record(`index/${GENERATION}-compile-v8-federated-relationships.mjs`, compilerBytes),
    ].sort((a, b) => a.path.localeCompare(b.path)),
    outputs,
    closure: { files: outputs.length + 1, manifest_path: OUTPUT.manifest },
    state: {
      candidate: "ARTIFACT_ONLY",
      current_pointer_changed: false,
      pages_changed: false,
      globalgrid_catalogue_changed: false,
      promotion_eligible: false,
    },
    deployment: "not-authorised",
  };
  const manifestTarget = outputPath(outRoot, OUTPUT.manifest);
  await mkdir(path.dirname(manifestTarget), { recursive: true });
  await writeFile(manifestTarget, jsonBytes(manifest), { flag: "wx" });
  console.log(JSON.stringify({ status: "PASS", generation: GENERATION, files: manifest.closure.files, cache_identity: cacheIdentity }));
}

await main();
