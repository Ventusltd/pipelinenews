import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const GENERATION = "202608271329";
const PARENT_GENERATION = "202608270844";
const ROLLBACK_GENERATION = "202608270055";
const SOURCE_PARENT_COMMIT = "270f069182d272f85575fda1a3906764a8603080";
const PROTECTED_RECOVERY_COMMIT = "77bda8c3809d02550d06a1c4154315f56d1120fb";
const COMPILER_METHOD = "pipelinenews-v8-atlas-deep-link-cartridge-v1";
const NAME = "Live News Discovery + Atlas V8 Deep-Link Cartridge";
const MANIFEST_PATH = `build/${GENERATION}-v8-fast-site-manifest.json`;
const HTML_PATH = `releases/${GENERATION}-v8-fast-candidate.html`;
const RUNTIME_PATH = `releases/javascript/${GENERATION}-v8-fast-runtime.js`;
const CARTRIDGE_PATH = `releases/javascript/${GENERATION}-atlas-v8-deep-link-cartridge.js`;
const REGISTRY_PATH = `releases/data/${GENERATION}-v8-fast-registry.json`;
const SOURCE_CARTRIDGE = `ui/cartridges/${GENERATION}-atlas-v8-deep-link.mjs`;
const EXPECTED_PARAMETERS = [
  "repd_ref",
  "project",
  "technology",
  "capacity_mw",
  "latitude",
  "longitude",
  "zoom",
];
const PINNED = Object.freeze({
  "build/202608270844-v8-fast-site-manifest.json": "250f030b79eb3bbf13f9c68dfae8a83192417ac99e77932ceead207b6655d211",
  "releases/202608270844-v8-fast-candidate.html": "3d6da5cb18db6b1c27c3443035edd6ca8353ad4d89c4f2545820436fe1b9f40f",
  "releases/javascript/202608270844-v8-fast-runtime.js": "d2d63ac0dcf4fa6b0944d07a1b45918ad87d2f6b7b54ab2daac435c95d54c1e4",
  "releases/data/202608270844-v8-fast-registry.json": "e36b116a7fff68492637064cd6490f5ab2120a33593136373c824b47579c6ee5",
  "releases/data/202608270844-9ab451f4bf19-v8-fast-news.json": "f90caae31bd4339367558e05a4f9c1564f4cbd502aaac186fea56fc20787c693",
  "releases/data/202608270055-8ab1807551bc-v8-fast-projects.json": "c06aedef176d2d38fd135806306a8ef81b4af9994c7be31e8bd760304149f862",
  "releases/data/202608270055-8ab1807551bc-v8-fast-search.json": "a1cbfc5202b717889a471409e850ea5cae13626f91c60f08cda0b06da5102b65",
  "releases/styles/202608270055-v8-fast.css": "d6c8100dbf79dd02f65d78e4fc9cacae92f2e4b5a749ea0fd3ff481fe5bb4792",
  [SOURCE_CARTRIDGE]: "d8e997acea1ed6c628e4d69f27653a5fe9a21bb459ff95d4ee0a7d040b431ff7",
});

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

async function verifyPinned(root, relativePath) {
  const bytes = await regularBytes(root, relativePath);
  assert.equal(sha256(bytes), PINNED[relativePath], `pinned predecessor changed: ${relativePath}`);
  return bytes;
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
  assert.equal(manifest.rollback_generation, ROLLBACK_GENERATION);
  assert.equal(manifest.compiler.method, COMPILER_METHOD);
  assert.match(manifest.source_commit, /^[a-f0-9]{40}$/u);
  assert.match(String(manifest.github_run_id), /^\d+$/u);
  assert.equal(manifest.deployment, "not-authorised");

  const expectedOutputs = [HTML_PATH, RUNTIME_PATH, CARTRIDGE_PATH, REGISTRY_PATH].sort();
  assert.equal(manifest.outputs.length, expectedOutputs.length);
  assert.deepEqual(manifest.outputs.map((record) => record.path), expectedOutputs);
  const outputBytes = new Map();
  for (const record of manifest.outputs) {
    assert.deepEqual(Object.keys(record).sort(), ["bytes", "path", "sha256"]);
    assert.ok(record.path.startsWith("releases/"));
    assert.ok(path.posix.basename(record.path).startsWith(GENERATION));
    assert.match(record.sha256, /^[a-f0-9]{64}$/u);
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
  assert.deepEqual(actualGenerationFiles, [MANIFEST_PATH, ...expectedOutputs].sort(), "immutable closure contains undeclared files");

  const pinnedBytes = {};
  for (const relativePath of Object.keys(PINNED)) pinnedBytes[relativePath] = await verifyPinned(root, relativePath);
  const inputByPath = new Map(manifest.inputs.map((record) => [record.path, record]));
  for (const [relativePath, expectedSha256] of Object.entries(PINNED)) {
    const record = inputByPath.get(relativePath);
    assert.ok(record, `manifest omitted pinned input: ${relativePath}`);
    assert.equal(record.sha256, expectedSha256);
    assert.equal(record.bytes, pinnedBytes[relativePath].length);
  }

  const compilerBytes = await regularBytes(root, manifest.compiler.path);
  assert.equal(sha256(compilerBytes), manifest.compiler.sha256);
  assert.equal(manifest.cache_contract.compiler.sha256, manifest.compiler.sha256);
  assert.equal(manifest.cache_contract.schema, "pipelinenews.v8.atlas-deep-link-cache-contract.v1");
  assert.equal(manifest.cache_contract.compiler_method, COMPILER_METHOD);
  assert.equal(manifest.cache_contract.source_parent_commit, SOURCE_PARENT_COMMIT);
  assert.equal(manifest.cache_contract.parent_generation, PARENT_GENERATION);
  assert.equal(manifest.cache_contract.rollback_generation, ROLLBACK_GENERATION);
  assert.equal(
    sha256(Buffer.from(JSON.stringify(manifest.cache_contract))),
    manifest.cache_identity,
    "cache identity changed",
  );

  const registry = JSON.parse(outputBytes.get(REGISTRY_PATH));
  assert.equal(registry.schema, "pipelinenews.v8.live-news-registry.v1");
  assert.equal(registry.generation, GENERATION);
  assert.equal(registry.name, NAME);
  assert.equal(registry.compiler_method, COMPILER_METHOD);
  assert.equal(registry.cache_identity, manifest.cache_identity);
  assert.deepEqual(registry.cache_contract, manifest.cache_contract);
  assert.equal(registry.deployment, "not-authorised");
  assert.deepEqual(registry.totals, {
    project_count: 7680,
    capacity_mw: 356474.09,
    largest_mw: 4100,
    solar_count: 3563,
    bess_count: 1609,
    wind_onshore_count: 2399,
    wind_offshore_count: 109,
    geometry_count: 7652,
    missing_geometry_count: 28,
  });
  assert.deepEqual(registry.news_counts, { all: 136, uk: 47, international: 19, us: 4, europe: 9, other: 6 });
  assert.equal(registry.assets.projects.generation, ROLLBACK_GENERATION);
  assert.equal(registry.assets.search.generation, ROLLBACK_GENERATION);
  assert.equal(registry.assets.news.generation, PARENT_GENERATION);
  assert.equal(registry.assets.news.sha256, PINNED["releases/data/202608270844-9ab451f4bf19-v8-fast-news.json"]);

  const declaredCartridge = registry.cartridges.atlas_v8_deep_link;
  assert.equal(declaredCartridge.schema, "pipelinenews.atlas-v8-deep-link-cartridge.v1");
  assert.equal(declaredCartridge.generation, GENERATION);
  assert.equal(declaredCartridge.path, path.posix.relative("releases", CARTRIDGE_PATH));
  assert.equal(declaredCartridge.sha256, sha256(outputBytes.get(CARTRIDGE_PATH)));
  assert.equal(declaredCartridge.bytes, outputBytes.get(CARTRIDGE_PATH).length);
  assert.equal(declaredCartridge.identity_anchor, "repd_ref");
  assert.deepEqual(declaredCartridge.query_parameter_order, EXPECTED_PARAMETERS);
  assert.equal(declaredCartridge.deployment, "not-authorised");

  const sourceModule = await import(`${pathToFileURL(resolveInside(root, SOURCE_CARTRIDGE)).href}?${PINNED[SOURCE_CARTRIDGE]}`);
  const compiledSha256 = sha256(outputBytes.get(CARTRIDGE_PATH));
  const compiledModule = await import(`${pathToFileURL(resolveInside(root, CARTRIDGE_PATH)).href}?${compiledSha256}`);
  assert.deepEqual(compiledModule.ATLAS_V8_DEEP_LINK_CONTRACT, sourceModule.ATLAS_V8_DEEP_LINK_CONTRACT);
  assert.ok(outputBytes.get(CARTRIDGE_PATH).equals(pinnedBytes[SOURCE_CARTRIDGE]), "compiled cartridge is not byte-exact source");
  const contract = compiledModule.ATLAS_V8_DEEP_LINK_CONTRACT;
  assert.equal(contract.generation, GENERATION);
  assert.equal(contract.parent_generation, PARENT_GENERATION);
  assert.equal(contract.target.protocol, "https:");
  assert.equal(contract.target.hostname, "globalgrid2050.com");
  assert.equal(contract.target.pathname, "/repd_grid_atlasv8/");
  assert.equal(contract.eligibility.field, "geometry_status");
  assert.equal(contract.eligibility.equals, "valid");
  assert.equal(contract.identity_anchor, "repd_ref");
  assert.deepEqual(contract.query_parameter_order, EXPECTED_PARAMETERS);
  assert.equal(new Set(contract.query_parameter_order).size, 7);
  assert.equal(contract.fixed_parameters.zoom, "12");
  assert.equal(contract.receiver_contract.query_context_never_establishes_identity, true);
  assert.equal(contract.deployment, "not-authorised");

  const projects = JSON.parse(pinnedBytes["releases/data/202608270055-8ab1807551bc-v8-fast-projects.json"]);
  assert.equal(projects.rows.length, 7_680);
  const decoded = projects.rows.map((row) => decodeProject(projects, row));
  const byRef = new Map(decoded.map((project) => [String(project.repd_ref), project]));
  assert.equal(decoded.filter((project) => project.geometry_status === "valid").length, 7_652);
  assert.equal(decoded.filter((project) => compiledModule.buildAtlasV8DeepLink(project) === "").length, 28);
  for (const sentinel of Object.values(contract.sentinels)) {
    assert.equal(
      compiledModule.buildAtlasV8DeepLink(byRef.get(sentinel.repd_ref)),
      sentinel.expected_url,
      `sentinel changed: REPD ${sentinel.repd_ref}`,
    );
  }

  const runtime = outputBytes.get(RUNTIME_PATH).toString("utf8");
  assert.ok(runtime.startsWith(`import { buildAtlasV8DeepLink } from "./${GENERATION}-atlas-v8-deep-link-cartridge.js";`));
  assert.ok(runtime.includes(`const GENERATION = "${GENERATION}";`));
  assert.ok(runtime.includes(`const EXPECTED_COMPILER_METHOD = "${COMPILER_METHOD}";`));
  assert.ok(runtime.includes(`const EXPECTED_CACHE_IDENTITY = "${manifest.cache_identity}";`));
  assert.match(runtime, /function atlasUrl\(item\) \{\s+return buildAtlasV8DeepLink\(item\);\s+\}/u);
  assert.ok(!runtime.includes('new URL("https://globalgrid2050.com/repd_grid_atlasv8/")'));
  assert.ok(!/function atlasUrl\([\s\S]{0,500}searchParams\.set/u.test(runtime));

  const html = outputBytes.get(HTML_PATH).toString("utf8");
  assert.ok(html.includes("LIVE NEWS DISCOVERY + ATLAS V8 DEEP-LINK CANDIDATE"));
  assert.ok(html.includes("136 HEADLINES · 47 UK · 19 INTERNATIONAL"));
  assert.ok(html.includes("NOT DEPLOYED"));
  assert.ok(html.includes(`data-fast-generation="${GENERATION}"`));
  assert.ok(html.includes(`javascript/${GENERATION}-v8-fast-runtime.js`));
  assert.ok(!html.includes("releases/current.json"));

  assert.deepEqual(manifest.parity, {
    project_count: 7680,
    capacity_mw: 356474.09,
    largest_mw: 4100,
    solar_count: 3563,
    bess_count: 1609,
    wind_onshore_count: 2399,
    wind_offshore_count: 109,
    geometry_count: 7652,
    missing_geometry_count: 28,
    headlines: 136,
    canonical_headlines: 47,
    international_headlines: 19,
    added_bbc_records: 3,
    primary_matches: 2,
    related_editorial_mentions: 1,
  });
  assert.ok(manifest.performance_contract.initial_decoded_bytes < 2_000_000);
  assert.equal(manifest.discipline.deep_link_intelligence_separate, true);
  assert.equal(manifest.discipline.atman_runtime_dependency, false);
  assert.equal(manifest.discipline.data_tree_source_added, false);
  assert.equal(manifest.discipline.stable_route_changed, false);
  assert.equal(manifest.discipline.current_pointer_changed, false);
  assert.equal(manifest.discipline.globalgrid_catalogue_changed, false);

  process.stdout.write(`${JSON.stringify({
    schema: "pipelinenews.v8.atlas-deep-link-contract-proof.v1",
    generation: GENERATION,
    source_commit: manifest.source_commit,
    manifest_sha256: sha256(manifestBytes),
    cache_identity: manifest.cache_identity,
    project_count: manifest.parity.project_count,
    map_links: 7_652,
    no_map: 28,
    query_parameters: EXPECTED_PARAMETERS,
    cartridge_bytes: outputBytes.get(CARTRIDGE_PATH).length,
    initial_decoded_bytes: manifest.performance_contract.initial_decoded_bytes,
    deployment: manifest.deployment,
    status: "PASS",
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
