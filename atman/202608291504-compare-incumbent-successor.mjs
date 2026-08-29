#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const GENERATION = "202608291504";
const RELEASE_ID = `${GENERATION}-pipelinenews`;
const PARENT_GENERATION = "202608282200";
let ATLAS_BASE = null;
const ALLOWED = new Set(["MATCH", "EXPECTED_CHANGE", "REGRESSION", "UNKNOWN"]);

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    assert.match(argv[index] || "", /^--[a-z-]+$/u);
    assert.ok(argv[index + 1], `missing value for ${argv[index]}`);
    result[argv[index].slice(2)] = argv[index + 1];
  }
  for (const key of ["release-a", "release-b", "browser-proof", "output"]) {
    assert.ok(result[key], `missing --${key}`);
  }
  return result;
}

const sha256 = (raw) => createHash("sha256").update(raw).digest("hex");

async function readJson(filename) {
  return JSON.parse(await readFile(filename, "utf8"));
}

async function fileTree(root) {
  const result = {};
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filename);
      else if (entry.isFile()) {
        const raw = await readFile(filename);
        result[path.relative(root, filename).split(path.sep).join("/")] = { bytes: raw.length, sha256: sha256(raw) };
      } else throw new Error(`non-file release entry: ${filename}`);
    }
  }
  await walk(root);
  return result;
}

function item(status, evidence) {
  assert.ok(ALLOWED.has(status));
  return { status, evidence };
}

function classified(condition, evidence, { expectedChange = false } = {}) {
  return item(condition ? (expectedChange ? "EXPECTED_CHANGE" : "MATCH") : "REGRESSION", evidence);
}

function decodeProjects(payload) {
  const fields = Object.fromEntries(payload.fields.map((name, index) => [name, index]));
  return payload.rows.map((row) => ({
    repd_ref: row[fields.repd_ref],
    name: row[fields.name],
    technology: payload.dictionaries.technology[row[fields.technology]],
    capacity_mw: row[fields.capacity_mw],
    geometry_status: payload.dictionaries.geometry_status[row[fields.geometry_status]],
    latitude: row[fields.latitude],
    longitude: row[fields.longitude],
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const releaseA = path.resolve(args["release-a"]);
  const releaseB = path.resolve(args["release-b"]);
  const proofPath = path.resolve(args["browser-proof"]);
  const outputPath = path.resolve(args.output);
  const releaseManifest = await readJson(path.join(releaseA, "release-manifest.json"));
  ATLAS_BASE = releaseManifest.atlas_v9_deep_link?.base_url;
  const atlasBase = new URL(ATLAS_BASE);
  const contractualGoldenRef = String(releaseManifest.atlas_v9_deep_link?.golden_repd_ref || "");
  assert.equal(atlasBase.protocol, "https:");
  assert.equal(atlasBase.hostname, "ventusltd.github.io");
  assert.match(contractualGoldenRef, /^\d+$/u);
  assert.equal(releaseManifest.atlas_v9_deep_link?.pointer?.path, "releases/current-v3.json");
  assert.match(String(releaseManifest.atlas_v9_deep_link?.pointer?.sha256 || ""), /^[0-9a-f]{64}$/u);
  const buildManifest = await readJson(path.join(releaseA, "build-manifest.json"));
  const permanentEvidence = buildManifest.parent_evidence;
  assert.equal(permanentEvidence?.schema, "pipelinenews.parent-artifact-evidence.v1", "permanent parent evidence missing");
  const permanentRelative = path.relative(`releases/${RELEASE_ID}`, permanentEvidence.exact_manifest.path);
  const permanentRaw = await readFile(path.join(releaseA, permanentRelative));
  assert.equal(permanentRaw.length, permanentEvidence.exact_manifest.bytes, "copied parent manifest byte count changed");
  assert.equal(sha256(permanentRaw), permanentEvidence.exact_manifest.sha256, "copied parent manifest digest changed");
  const permanentManifest = JSON.parse(permanentRaw);
  let parentManifest;
  if (args["parent-root"]) {
    const parentRoot = path.resolve(args["parent-root"]);
    const externalRaw = await readFile(path.join(parentRoot, "build/202608282200-v8-fast-site-manifest.json"));
    assert.equal(Buffer.compare(externalRaw, permanentRaw), 0, "external parent differs from copied exact provenance");
    parentManifest = JSON.parse(externalRaw);
  } else {
    const evidence = buildManifest.parent_evidence;
    assert.equal(evidence?.schema, "pipelinenews.parent-artifact-evidence.v1", "self-contained parent evidence missing");
    assert.equal(evidence.exact_manifest?.bytes, 25073, "parent manifest byte evidence changed");
    assert.equal(evidence.exact_manifest?.sha256, "025daf70f1c4b9c9a7c84a70d41ceb50e96232771f736faa309ca92c2c9c134d", "parent manifest digest evidence changed");
    parentManifest = permanentManifest;
  }
  const registry = await readJson(path.join(releaseA, `data/${GENERATION}-registry.json`));
  const projectsPayload = await readJson(path.join(releaseA, "data/202608270055-8ab1807551bc-v8-fast-projects.json"));
  const html = await readFile(path.join(releaseA, "index.html"), "utf8");
  const runtime = await readFile(path.join(releaseA, `assets/${GENERATION}-app.mjs`), "utf8");
  const textFiles = [];
  for (const record of buildManifest.functional_files) {
    if (!/\.(?:html|mjs|js|json|css)$/u.test(record.path)) continue;
    const relative = path.relative(`releases/${RELEASE_ID}`, record.path);
    textFiles.push(await readFile(path.join(releaseA, relative), "utf8"));
  }
  const combinedText = textFiles.join("\n");
  const browserProof = await readJson(proofPath).catch(() => null);
  const treeA = await fileTree(releaseA);
  const treeB = await fileTree(releaseB);

  const cartridgePath = path.join(releaseA, `assets/${GENERATION}-atlas-pointer-deep-link.mjs`);
  const cartridge = await import(`${pathToFileURL(cartridgePath).href}?sha=${sha256(await readFile(cartridgePath))}`);
  const projects = decodeProjects(projectsPayload);
  let mapLinks = 0;
  let noMap = 0;
  let invalidUrls = 0;
  for (const project of projects) {
    const href = cartridge.buildAtlasV9DeepLink(project);
    if (!href) {
      noMap += 1;
      if (project.geometry_status === "valid") invalidUrls += 1;
      continue;
    }
    mapLinks += 1;
    const url = new URL(href);
    const valid = project.geometry_status === "valid"
      && url.origin === atlasBase.origin
      && url.pathname === atlasBase.pathname
      && [...url.searchParams.keys()].join(",") === "repd_ref"
      && url.searchParams.get("repd_ref") === String(project.repd_ref);
    if (!valid) invalidUrls += 1;
  }
  const contractualGoldenInput = { repd_ref: contractualGoldenRef, geometry_status: "valid" };
  const eastPye = projects.find((project) => String(project.repd_ref) === "17494");
  const beaconFen = projects.find((project) => String(project.repd_ref) === "13599");
  const invalidGeometry = projects.find((project) => String(project.repd_ref) === "12780");

  const sections = {
    parent_semantics: {
      permanent_parent_evidence: classified(
        permanentEvidence.exact_manifest.bytes === 25073
          && permanentEvidence.exact_manifest.sha256 === "025daf70f1c4b9c9a7c84a70d41ceb50e96232771f736faa309ca92c2c9c134d"
          && permanentRaw.length === 25073
          && sha256(permanentRaw) === permanentEvidence.exact_manifest.sha256,
        buildManifest.parent_evidence,
      ),
      exact_parent_artifact: classified(
        parentManifest.source_commit === "1cbe1a9b205af3a2cf62bc7f8130f033423dfe1f"
          && String(parentManifest.github_run_id) === "33211041996"
          && parentManifest.outputs.length === 7,
        { source: parentManifest.source_commit, run: parentManifest.github_run_id, outputs: parentManifest.outputs.length },
      ),
      canonical_product: classified(
        parentManifest.canonical_product.projects === 7680
          && parentManifest.canonical_product.capacity_mw === 356474.09
          && parentManifest.canonical_product.headlines === 136
          && parentManifest.canonical_product.rows_per_page === 100
          && parentManifest.canonical_product.table_columns === 11,
        parentManifest.canonical_product,
      ),
      relationship_abstention: classified(
        parentManifest.relationship_governance_status.rows === 3
          && parentManifest.relationship_governance_status.project_bindings === 0,
        parentManifest.relationship_governance_status,
      ),
    },
    atlas_links: {
      exact_map_no_map: classified(mapLinks === 7652 && noMap === 28 && invalidUrls === 0, { map_links: mapLinks, no_map: noMap, invalid_urls: invalidUrls }),
      immutable_v9_base: classified(
        cartridge.ATLAS_V9_DEEP_LINK_CONTRACT.target.base_url === ATLAS_BASE,
        cartridge.ATLAS_V9_DEEP_LINK_CONTRACT.target,
        { expectedChange: true },
      ),
      authenticated_pointer_binding: classified(
        cartridge.ATLAS_V9_DEEP_LINK_CONTRACT.receiver_pointer.sha256 === releaseManifest.atlas_v9_deep_link.pointer.sha256
          && cartridge.ATLAS_V9_DEEP_LINK_CONTRACT.receiver_pointer.resolved_commit === releaseManifest.atlas_v9_deep_link.pointer_commit
          && cartridge.ATLAS_V9_DEEP_LINK_CONTRACT.receiver_contract.contractual_golden_repd_ref === contractualGoldenRef,
        cartridge.ATLAS_V9_DEEP_LINK_CONTRACT.receiver_pointer,
        { expectedChange: true },
      ),
      identity_only_query_contractual_golden: classified(
        cartridge.buildAtlasV9DeepLink(contractualGoldenInput) === `${ATLAS_BASE}?repd_ref=${contractualGoldenRef}`,
        {
          href: cartridge.buildAtlasV9DeepLink(contractualGoldenInput),
          dataset_presence_required: false,
          authority: "authenticated GridAtlas current-v3 query contract",
        },
        { expectedChange: true },
      ),
      identity_only_query_east_pye_when_present: classified(
        !eastPye || cartridge.buildAtlasV9DeepLink(eastPye) === `${ATLAS_BASE}?repd_ref=17494`,
        eastPye ? cartridge.buildAtlasV9DeepLink(eastPye) : "not present; optional sentinel skipped",
        { expectedChange: true },
      ),
      identity_only_query_beacon_fen_when_present: classified(
        !beaconFen || cartridge.buildAtlasV9DeepLink(beaconFen) === `${ATLAS_BASE}?repd_ref=13599`,
        beaconFen ? cartridge.buildAtlasV9DeepLink(beaconFen) : "not present; optional sentinel skipped",
        { expectedChange: true },
      ),
      no_map_12780: classified(cartridge.buildAtlasV9DeepLink(invalidGeometry) === "", { repd_ref: "12780", href: cartridge.buildAtlasV9DeepLink(invalidGeometry) }),
      old_domain_absent: classified(!combinedText.includes("globalgrid2050.com/repd_grid_atlasv8"), "no old Atlas receiver URL in release closure", { expectedChange: true }),
    },
    bidirectional_routing: {
      inbound_alias: classified(
        runtime.includes('const requestedRepdRef = parameters.get("repd_ref") || "";')
          && runtime.includes('/^\\d+$/u.test(requestedRepdRef)')
          && runtime.includes('"sort", "repd_ref"'),
        "repd_ref hydrates exact project search and is bounded during URL synchronisation",
        { expectedChange: true },
      ),
      header_target: classified((html.match(new RegExp(ATLAS_BASE.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "gu")) || []).length === 2, "two header/menu Atlas V9 targets", { expectedChange: true }),
      csv_label: classified(runtime.includes('"Atlas V9 URL"') && !runtime.includes('"Atlas V8 URL"'), "Atlas V9 URL"),
      durable_product_state: classified(
        html.includes("ATLAS V9 DEEP-LINK SUCCESSOR")
          && !combinedText.includes("DEEP-LINK CANDIDATE")
          && !combinedText.includes("fast candidate"),
        "timestamped successor wording in browser-served functional closure",
        { expectedChange: true },
      ),
    },
    folder_closure: {
      deterministic_ab: classified(JSON.stringify(treeA) === JSON.stringify(treeB), { files_a: Object.keys(treeA).length, files_b: Object.keys(treeB).length }),
      index_in_folder: classified(path.basename(releaseA) === RELEASE_ID && (await stat(path.join(releaseA, "index.html"))).isFile(), path.join(releaseA, "index.html"), { expectedChange: true }),
      public_manifests: classified(buildManifest.release_id === RELEASE_ID && releaseManifest.release_id === RELEASE_ID, { build: buildManifest.schema, release: releaseManifest.schema }),
      full_dependency_closure: classified(
        Object.keys(treeA).length === 40
          && buildManifest.functional_file_count === 37
          && buildManifest.inherited_functional_files === 33
          && buildManifest.shared_dependency_files === 29
          && buildManifest.inherited_parent_output_files === 4
          && buildManifest.provenance_files === 1,
        {
          files: Object.keys(treeA).length,
          functional: buildManifest.functional_file_count,
          inherited_functional_files: buildManifest.inherited_functional_files,
          shared_dependency_files: buildManifest.shared_dependency_files,
          inherited_parent_output_files: buildManifest.inherited_parent_output_files,
          provenance_files: buildManifest.provenance_files,
        },
      ),
      pointer_state_external: classified(
        releaseManifest.classification === "IMMUTABLE_TIMESTAMPED_RELEASE"
          && releaseManifest.folder_contract.pointer_state_encoded_in_release === false
          && releaseManifest.publication_control.pointer_and_attestation_live_outside_release_folder === true,
        releaseManifest.publication_control,
      ),
    },
    runtime_contract: {
      registry_identity: classified(registry.schema === "pipelinenews.v9.timestamp-folder-registry.v1" && registry.generation === GENERATION && registry.cache_contract.compiler_method === "pipelinenews-atlas-pointer-folder-deep-link-successor-v1", { schema: registry.schema, generation: registry.generation, compiler: registry.cache_contract.compiler_method }, { expectedChange: true }),
      local_assets: classified(
        registry.assets.projects.path.startsWith("data/")
          && registry.assets.search.path.startsWith("data/")
          && registry.assets.news.path.startsWith("data/")
          && registry.detail_partitions.every((entry) => entry.path.startsWith("data/projects/")),
        { assets: registry.assets, first_detail: registry.detail_partitions[0]?.path },
        { expectedChange: true },
      ),
      reused_cartridge_generations: classified(
        runtime.includes("SECTOR_INTELLIGENCE_CARTRIDGE_CONTRACT.generation === entry.generation")
          && runtime.includes("FEDERATED_RELATIONSHIP_CARTRIDGE_CONTRACT.generation === entry.generation"),
        "immutable 202608272130 and 202608282200 cartridges validated against their own registry entries",
      ),
    },
    real_public_receiver: {
      proof_available: browserProof === null ? item("UNKNOWN", "browser proof missing") : classified(browserProof.classification === "VERIFIED_REAL_ATLAS_V9_RECEIVER", browserProof.classification),
      no_synthetic_receiver: browserProof === null ? item("UNKNOWN", "browser proof missing") : classified(browserProof.synthetic_receiver === false && browserProof.route_interceptions === 0, { synthetic_receiver: browserProof.synthetic_receiver, route_interceptions: browserProof.route_interceptions }),
      contractual_receiver_golden: browserProof === null ? item("UNKNOWN", "browser proof missing") : classified(
        browserProof.contractual_golden?.repd_ref === contractualGoldenRef
          && browserProof.contractual_golden?.receiver_present === true
          && browserProof.contractual_golden?.pipeline_present === false
          && browserProof.contractual_golden?.tested === true
          && browserProof.contractual_golden?.receiver_url === `${ATLAS_BASE}?repd_ref=${contractualGoldenRef}`
          && browserProof.contractual_golden?.receiver_evidence?.cards?.some((text) => text.includes(`REPD ${contractualGoldenRef}`)),
        browserProof.contractual_golden,
      ),
      selected_receiver: browserProof === null ? item("UNKNOWN", "browser proof missing") : classified(
        browserProof.external_atlas_network_used === true
          && browserProof.atlas_repd_ref === contractualGoldenRef
          && browserProof.contractual_golden?.receiver_url === `${ATLAS_BASE}?repd_ref=${contractualGoldenRef}`
          && browserProof.contractual_golden?.receiver_evidence?.cards?.length,
        browserProof.contractual_golden,
      ),
      optional_sentinels_when_present: browserProof === null ? item("UNKNOWN", "browser proof missing") : classified(
        [
          ["17494", eastPye],
          ["13599", beaconFen],
        ].every(([repdRef, project]) => {
          const entry = (browserProof.optional_sentinels || []).find((candidate) => candidate.repd_ref === repdRef);
          return entry
            && entry.present === Boolean(project)
            && (!project || (
              entry.tested === true
              && entry.outbound_href === `${ATLAS_BASE}?repd_ref=${repdRef}`
              && entry.receiver_url === `${ATLAS_BASE}?repd_ref=${repdRef}`
              && entry.receiver_evidence?.cards?.some((text) => text.includes(`REPD ${repdRef}`))
            ));
        }),
        browserProof.optional_sentinels,
      ),
    },
  };

  const statuses = Object.values(sections).flatMap((section) => Object.values(section).map(({ status }) => status));
  const counts = Object.fromEntries([...ALLOWED].sort().map((status) => [status, statuses.filter((value) => value === status).length]));
  const failed = counts.REGRESSION + counts.UNKNOWN;
  const report = {
    schema: "pipelinenews.incumbent-successor-comparator.v1",
    generation: GENERATION,
    release_id: RELEASE_ID,
    classification: failed === 0 ? "VERIFIED_PIPELINENEWS_ATLAS_POINTER_SUCCESSOR" : "REJECTED_PIPELINENEWS_ATLAS_POINTER_SUCCESSOR",
    promotion_eligible: failed === 0,
    failed,
    allowed_statuses: [...ALLOWED].sort(),
    status_counts: counts,
    baseline: { generation: PARENT_GENERATION, role: "accepted complete V9.6.2-equivalent artifact" },
    successor: { generation: GENERATION, route: `/pipelinenews/releases/${RELEASE_ID}/`, atlas_receiver: ATLAS_BASE },
    expected_changes: [
      "flat candidate becomes immutable timestamp-folder index",
      "Atlas V8 receiver becomes exact immutable Atlas V9 receiver",
      "seven context parameters become canonical repd_ref-only identity",
      "PipelineNews accepts inbound repd_ref compatibility deep links",
      "runtime dependencies are copied inside the immutable folder",
    ],
    sections,
  };
  await import("node:fs/promises").then(({ mkdir, writeFile }) => mkdir(path.dirname(outputPath), { recursive: true }).then(() => writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)));
  process.stdout.write(`${JSON.stringify({ classification: report.classification, status_counts: counts, failed })}\n`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
