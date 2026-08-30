import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const GENERATION = "202608271329";
const PARENT_GENERATION = "202608270844";
const ROLLBACK_GENERATION = "202608270055";
const SOURCE_PARENT_COMMIT = "270f069182d272f85575fda1a3906764a8603080";
const PROTECTED_RECOVERY_COMMIT = "77bda8c3809d02550d06a1c4154315f56d1120fb";
const NAME = "Live News Discovery + Atlas V8 Deep-Link Cartridge";
const COMPILER_FILE = `${GENERATION}-compile-v8-atlas-deep-link.mjs`;
const COMPILER_METHOD = "pipelinenews-v8-atlas-deep-link-cartridge-v1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_SCHEMA = "pipelinenews.v8.live-news-registry.v1";

const INPUTS = Object.freeze({
  parentManifest: "build/202608270844-v8-fast-site-manifest.json",
  parentHtml: "releases/202608270844-v8-fast-candidate.html",
  parentRuntime: "releases/javascript/202608270844-v8-fast-runtime.js",
  parentRegistry: "releases/data/202608270844-v8-fast-registry.json",
  parentNews: "releases/data/202608270844-9ab451f4bf19-v8-fast-news.json",
  projects: "releases/data/202608270055-8ab1807551bc-v8-fast-projects.json",
  search: "releases/data/202608270055-8ab1807551bc-v8-fast-search.json",
  style: "releases/styles/202608270055-v8-fast.css",
  cartridge: "ui/cartridges/202608271329-atlas-v8-deep-link.mjs",
});

const PINNED_SHA256 = Object.freeze({
  [INPUTS.parentManifest]: "250f030b79eb3bbf13f9c68dfae8a83192417ac99e77932ceead207b6655d211",
  [INPUTS.parentHtml]: "3d6da5cb18db6b1c27c3443035edd6ca8353ad4d89c4f2545820436fe1b9f40f",
  [INPUTS.parentRuntime]: "d2d63ac0dcf4fa6b0944d07a1b45918ad87d2f6b7b54ab2daac435c95d54c1e4",
  [INPUTS.parentRegistry]: "e36b116a7fff68492637064cd6490f5ab2120a33593136373c824b47579c6ee5",
  [INPUTS.parentNews]: "f90caae31bd4339367558e05a4f9c1564f4cbd502aaac186fea56fc20787c693",
  [INPUTS.projects]: "c06aedef176d2d38fd135806306a8ef81b4af9994c7be31e8bd760304149f862",
  [INPUTS.search]: "a1cbfc5202b717889a471409e850ea5cae13626f91c60f08cda0b06da5102b65",
  [INPUTS.style]: "d6c8100dbf79dd02f65d78e4fc9cacae92f2e4b5a749ea0fd3ff481fe5bb4792",
  [INPUTS.cartridge]: "d8e997acea1ed6c628e4d69f27653a5fe9a21bb459ff95d4ee0a7d040b431ff7",
});

const ATLAS_OUTPUT = `releases/javascript/${GENERATION}-atlas-v8-deep-link-cartridge.js`;
const RUNTIME_OUTPUT = `releases/javascript/${GENERATION}-v8-fast-runtime.js`;
const REGISTRY_OUTPUT = `releases/data/${GENERATION}-v8-fast-registry.json`;
const HTML_OUTPUT = `releases/${GENERATION}-v8-fast-candidate.html`;
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

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function replaceExactly(source, from, to, expectedCount = 1) {
  const count = source.split(from).length - 1;
  assert.equal(count, expectedCount, `replacement count changed for ${JSON.stringify(from)}`);
  return source.split(from).join(to);
}

async function readPinned(relativePath) {
  const bytes = await readFile(absolute(relativePath));
  assert.equal(sha256(bytes), PINNED_SHA256[relativePath], `pinned input changed: ${relativePath}`);
  return bytes;
}

function decodeProject(payload, row) {
  const field = Object.fromEntries(payload.fields.map((name, index) => [name, index]));
  const dictionary = (name) => payload.dictionaries[name][row[field[name]]];
  return {
    repd_ref: row[field.repd_ref],
    gg_project_id: row[field.gg_project_id],
    name: row[field.name],
    technology: dictionary("technology"),
    status: dictionary("status"),
    capacity_mw: row[field.capacity_mw],
    county: dictionary("county"),
    region: dictionary("region"),
    operator: dictionary("operator"),
    repd_record_updated: row[field.repd_record_updated],
    geometry_status: dictionary("geometry_status"),
    latitude: row[field.latitude],
    longitude: row[field.longitude],
  };
}

function rewriteRuntime(parentSource, cacheIdentity) {
  const atlasImport = `import { buildAtlasV8DeepLink } from "./${GENERATION}-atlas-v8-deep-link-cartridge.js";\n\n`;
  let source = atlasImport + parentSource;
  source = replaceExactly(source, `const GENERATION = "${PARENT_GENERATION}";`, `const GENERATION = "${GENERATION}";`);
  source = replaceExactly(
    source,
    'const EXPECTED_COMPILER_METHOD = "pipelinenews-v8-live-news-discovery-reuse-fast-spine-v1";',
    `const EXPECTED_COMPILER_METHOD = "${COMPILER_METHOD}";`,
  );
  source = replaceExactly(
    source,
    'const EXPECTED_CACHE_IDENTITY = "9ab451f4bf19ff70fa78b3bd4b4d7cf0097827b880a9344e6c4dd3922e6febfc";',
    `const EXPECTED_CACHE_IDENTITY = "${cacheIdentity}";`,
  );
  source = replaceExactly(
    source,
    `function atlasUrl(item) {
  if (item.geometry_status !== "valid") return "";
  const url = new URL("https://ventusltd.github.io/gridatlas/202608300453-atlas-v9/");
  url.searchParams.set("repd_ref", item.repd_ref);
  url.searchParams.set("technology", item.technology);
  url.searchParams.set("longitude", item.longitude);
  url.searchParams.set("latitude", item.latitude);
  return url.href;
}`,
    `function atlasUrl(item) {
  return buildAtlasV8DeepLink(item);
}`,
  );
  assert.equal(source.match(/function atlasUrl\(/gu)?.length, 1);
  assert.equal(source.match(/buildAtlasV8DeepLink\(item\)/gu)?.length, 1);
  assert.ok(!source.includes('new URL("https://ventusltd.github.io/gridatlas/202608300453-atlas-v9/")'));
  return `${source.trimEnd()}\n`;
}

function rewriteHtml(parentSource) {
  let source = parentSource;
  source = replaceExactly(source, `data-fast-generation="${PARENT_GENERATION}"`, `data-fast-generation="${GENERATION}"`);
  source = replaceExactly(
    source,
    `javascript/${PARENT_GENERATION}-v8-fast-runtime.js`,
    `javascript/${GENERATION}-v8-fast-runtime.js`,
  );
  const previousName = "LIVE NEWS DISCOVERY CANDIDATE";
  assert.ok(source.includes(previousName));
  source = source.replaceAll(previousName, "LIVE NEWS DISCOVERY + ATLAS V8 DEEP-LINK CANDIDATE");
  assert.ok(source.includes("136 HEADLINES · 47 UK · 19 INTERNATIONAL"));
  assert.ok(source.includes("NOT DEPLOYED"));
  return `${source.trimEnd()}\n`;
}

async function build() {
  assert.equal(path.basename(fileURLToPath(import.meta.url)), COMPILER_FILE);
  const sourceCommit = process.env.SOURCE_COMMIT;
  const runId = process.env.GITHUB_RUN_ID;
  assert.match(sourceCommit || "", /^[a-f0-9]{40}$/u, "SOURCE_COMMIT must be an exact Git SHA");
  assert.match(runId || "", /^\d+$/u, "GITHUB_RUN_ID must be numeric");

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
  const projects = JSON.parse(inputs.projects);
  assert.equal(parentManifest.schema, "pipelinenews.v8.fast-site-candidate.v1");
  assert.equal(parentManifest.generation, PARENT_GENERATION);
  assert.equal(parentManifest.deployment, "not-authorised");
  assert.equal(parentManifest.source_commit, "e6205f02ff34ea877fc529361f69c0c6b80b1c1d");
  assert.equal(parentRegistry.schema, REGISTRY_SCHEMA);
  assert.equal(parentRegistry.generation, PARENT_GENERATION);
  assert.equal(parentRegistry.cache_identity, parentManifest.cache_identity);
  assert.equal(parentRegistry.deployment, "not-authorised");
  assert.equal(parentRegistry.totals.project_count, 7_680);
  assert.equal(parentRegistry.totals.capacity_mw, 356_474.09);
  assert.deepEqual(parentRegistry.news_counts, { all: 136, uk: 47, international: 19, us: 4, europe: 9, other: 6 });
  assert.equal(parentNews.rows.length, 136);
  assert.equal(projects.rows.length, 7_680);
  assert.equal(projects.rows.filter((row) => projects.dictionaries.geometry_status[row[10]] === "valid").length, 7_652);

  for (const record of parentManifest.outputs) {
    if (!PINNED_SHA256[record.path]) continue;
    assert.equal(record.sha256, PINNED_SHA256[record.path], `parent manifest hash changed: ${record.path}`);
  }
  assert.equal(parentRegistry.assets.projects.sha256, PINNED_SHA256[INPUTS.projects]);
  assert.equal(parentRegistry.assets.search.sha256, PINNED_SHA256[INPUTS.search]);
  assert.equal(parentRegistry.assets.news.sha256, PINNED_SHA256[INPUTS.parentNews]);
  assert.equal(parentRegistry.assets.style.sha256, PINNED_SHA256[INPUTS.style]);

  const cartridgeUrl = `${pathToFileURL(absolute(INPUTS.cartridge)).href}?${PINNED_SHA256[INPUTS.cartridge]}`;
  const cartridgeModule = await import(cartridgeUrl);
  const contract = cartridgeModule.ATLAS_V8_DEEP_LINK_CONTRACT;
  const buildAtlasV8DeepLink = cartridgeModule.buildAtlasV8DeepLink;
  assert.equal(contract.schema, "pipelinenews.atlas-v8-deep-link-cartridge.v1");
  assert.equal(contract.generation, GENERATION);
  assert.equal(contract.parent_generation, PARENT_GENERATION);
  assert.equal(contract.deployment, "not-authorised");
  assert.deepEqual(contract.query_parameter_order, [
    "repd_ref", "project", "technology", "capacity_mw", "latitude", "longitude", "zoom",
  ]);

  const byRef = new Map(projects.rows.map((row) => [String(row[0]), decodeProject(projects, row)]));
  for (const sentinel of Object.values(contract.sentinels)) {
    const project = byRef.get(sentinel.repd_ref);
    assert.ok(project, `missing cartridge sentinel ${sentinel.repd_ref}`);
    assert.equal(buildAtlasV8DeepLink(project), sentinel.expected_url, `cartridge sentinel changed: ${sentinel.repd_ref}`);
  }

  const cartridgeOutputBytes = inputs.cartridge;
  const cartridgeOutputSha256 = sha256(cartridgeOutputBytes);
  const cacheContract = {
    schema: "pipelinenews.v8.atlas-deep-link-cache-contract.v1",
    compiler_method: COMPILER_METHOD,
    compiler: {
      path: `index/${COMPILER_FILE}`,
      sha256: compilerSha256,
    },
    source_parent_commit: SOURCE_PARENT_COMMIT,
    protected_recovery_commit: PROTECTED_RECOVERY_COMMIT,
    parent_generation: PARENT_GENERATION,
    rollback_generation: ROLLBACK_GENERATION,
    sources: {
      parent_manifest_sha256: sha256(inputs.parentManifest),
      parent_html_sha256: sha256(inputs.parentHtml),
      parent_runtime_sha256: sha256(inputs.parentRuntime),
      parent_registry_sha256: sha256(inputs.parentRegistry),
      parent_news_sha256: sha256(inputs.parentNews),
      atlas_deep_link_cartridge_sha256: sha256(inputs.cartridge),
    },
    project_index: parentRegistry.cache_contract.project_index,
    search_index: parentRegistry.cache_contract.search_index,
    news_index: parentRegistry.cache_contract.news_index,
    runtime: parentRegistry.cache_contract.runtime,
    reuse: {
      project_generation: ROLLBACK_GENERATION,
      search_generation: ROLLBACK_GENERATION,
      style_generation: ROLLBACK_GENERATION,
      detail_generation: "202608261927",
      news_generation: PARENT_GENERATION,
    },
    atlas_deep_link: {
      schema: contract.schema,
      generation: contract.generation,
      source: {
        path: INPUTS.cartridge,
        sha256: PINNED_SHA256[INPUTS.cartridge],
      },
      runtime: {
        path: path.posix.relative("releases", ATLAS_OUTPUT),
        sha256: cartridgeOutputSha256,
        bytes: cartridgeOutputBytes.length,
        activation: "module-import-before-project-render",
      },
      target: contract.target,
      eligibility: contract.eligibility,
      identity_anchor: contract.identity_anchor,
      query_parameter_order: contract.query_parameter_order,
      project_field_by_parameter: contract.project_field_by_parameter,
      fixed_parameters: contract.fixed_parameters,
      receiver_contract: contract.receiver_contract,
    },
  };
  const cacheIdentity = sha256(Buffer.from(JSON.stringify(cacheContract)));
  const runtimeBytes = Buffer.from(rewriteRuntime(inputs.parentRuntime.toString("utf8"), cacheIdentity));

  const registry = {
    ...parentRegistry,
    generation: GENERATION,
    name: NAME,
    compiler_method: COMPILER_METHOD,
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    cartridges: {
      atlas_v8_deep_link: {
        schema: contract.schema,
        generation: contract.generation,
        source_sha256: PINNED_SHA256[INPUTS.cartridge],
        path: path.posix.relative("releases", ATLAS_OUTPUT),
        sha256: cartridgeOutputSha256,
        bytes: cartridgeOutputBytes.length,
        identity_anchor: contract.identity_anchor,
        query_parameter_order: contract.query_parameter_order,
        deployment: "not-authorised",
      },
    },
    deployment: "not-authorised",
  };
  const registryBytes = jsonBytes(registry);
  const htmlBytes = Buffer.from(rewriteHtml(inputs.parentHtml.toString("utf8")));
  const outputs = new Map([
    [HTML_OUTPUT, htmlBytes],
    [ATLAS_OUTPUT, cartridgeOutputBytes],
    [RUNTIME_OUTPUT, runtimeBytes],
    [REGISTRY_OUTPUT, registryBytes],
  ]);
  const outputRecords = [...outputs.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([outputPath, bytes]) => ({ path: outputPath, bytes: bytes.length, sha256: sha256(bytes) }));
  const initialDecodedBytes = inputs.projects.length
    + inputs.style.length
    + htmlBytes.length
    + runtimeBytes.length
    + registryBytes.length
    + cartridgeOutputBytes.length;
  assert.ok(initialDecodedBytes < 2_000_000, `initial decoded closure is ${initialDecodedBytes} bytes`);

  const manifest = {
    schema: "pipelinenews.v8.fast-site-candidate.v1",
    generation: GENERATION,
    name: NAME,
    source_commit: sourceCommit,
    source_parent_commit: SOURCE_PARENT_COMMIT,
    github_run_id: runId,
    compiler: {
      path: `index/${COMPILER_FILE}`,
      method: COMPILER_METHOD,
      sha256: compilerSha256,
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
      deep_link_cartridge_bytes: cartridgeOutputBytes.length,
    },
    discipline: {
      ...parentManifest.discipline,
      deep_link_intelligence_separate: true,
      deep_link_cartridge_write_once: true,
      atman_runtime_dependency: false,
      data_tree_source_added: false,
      deployment_separate: true,
      stable_route_changed: false,
      current_pointer_changed: false,
      globalgrid_catalogue_changed: false,
    },
    inputs: inputRecords.sort((left, right) => left.path.localeCompare(right.path)),
    outputs: outputRecords,
    evidence: "workflow-artifact-only",
    deployment: "not-authorised",
  };
  const allOutputs = new Map(outputs);
  allOutputs.set(MANIFEST_OUTPUT, jsonBytes(manifest));
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
    schema: "pipelinenews.v8.atlas-deep-link-compiler-result.v1",
    generation: GENERATION,
    parent_generation: PARENT_GENERATION,
    source_commit: manifest.source_commit,
    cache_identity: manifest.cache_identity,
    files: outputs.size,
    project_count: manifest.parity.project_count,
    headline_count: manifest.parity.headlines,
    deployment: manifest.deployment,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
