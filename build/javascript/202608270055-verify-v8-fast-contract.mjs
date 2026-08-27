import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const CONTRACT_SCHEMA = "pipelinenews.v8.fast-contract-proof.v1";
const MANIFEST_SCHEMA = "pipelinenews.v8.fast-site-candidate.v1";
const REGISTRY_SCHEMA = "pipelinenews.v8.fast-registry.v1";
const PROJECT_SCHEMA = "pipelinenews.v8.fast-project-index.v1";
const SEARCH_SCHEMA = "pipelinenews.v8.fast-search-index.v1";
const NEWS_SCHEMA = "pipelinenews.v8.fast-news-index.v1";
const CACHE_SCHEMA = "pipelinenews.v8.fast-cache-contract.v1";
const COMPILER_METHOD = "pipelinenews-v8-fast-dictionary-index-lazy-detail-v1";
const MAX_PROJECT_BYTES = 1_310_720;
const MAX_INITIAL_BYTES = 2_000_000;

const PROJECT_FIELDS = Object.freeze([
  "repd_ref",
  "gg_project_id",
  "name",
  "technology",
  "status",
  "capacity_mw",
  "county",
  "region",
  "operator",
  "repd_record_updated",
  "geometry_status",
  "latitude",
  "longitude",
]);
const DICTIONARY_FIELDS = Object.freeze(["technology", "status", "county", "region", "operator", "geometry_status"]);
const NEWS_FIELDS = Object.freeze([
  "gg_article_id",
  "repd_ref",
  "gg_project_id",
  "project",
  "technology",
  "capacity_mw",
  "operator",
  "county",
  "country",
  "event",
  "headline",
  "published",
  "source",
  "url",
  "confidence",
  "canonical_relevant",
  "role",
  "eligible_for_news_signal",
  "regional_classification",
  "regional_technology",
  "regional_evidence",
]);
const EXPECTED_TOTALS = Object.freeze({
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
const EXPECTED_NEWS_COUNTS = Object.freeze({ all: 133, uk: 45, international: 19, us: 4, europe: 9, other: 6 });

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseArguments(argv) {
  const allowed = new Set(["--root", "--generation", "--source-manifest"]);
  const parsed = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    assert.ok(allowed.has(name), `unknown argument: ${name || "<empty>"}`);
    assert.ok(value && !value.startsWith("--"), `${name} requires a value`);
    assert.ok(!parsed.has(name), `duplicate argument: ${name}`);
    parsed.set(name, value);
  }
  for (const name of allowed) assert.ok(parsed.has(name), `${name} is required`);
  assert.match(parsed.get("--generation"), /^\d{12}$/u, "generation must be a 12-digit UTC stamp");
  return {
    root: path.resolve(parsed.get("--root")),
    generation: parsed.get("--generation"),
    manifestArgument: parsed.get("--source-manifest"),
  };
}

function resolveInside(root, relativePath, label = "path") {
  assert.equal(typeof relativePath, "string", `${label} must be a string`);
  assert.ok(relativePath && !relativePath.includes("\\"), `${label} must use a non-empty POSIX path`);
  assert.ok(!path.posix.isAbsolute(relativePath), `${label} must be relative`);
  assert.equal(path.posix.normalize(relativePath), relativePath, `${label} must be normalised`);
  assert.ok(!relativePath.startsWith("../") && relativePath !== "..", `${label} escapes root`);
  const resolved = path.resolve(root, relativePath);
  assert.ok(resolved.startsWith(`${root}${path.sep}`), `${label} escapes root`);
  return resolved;
}

async function readRegularFile(filename, label) {
  const metadata = await lstat(filename);
  assert.ok(metadata.isFile() && !metadata.isSymbolicLink(), `${label} must be a regular non-symlink file`);
  return readFile(filename);
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(bytes);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

async function walkFiles(directory, root) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(filename, root));
    else if (entry.isFile()) files.push(path.relative(root, filename).split(path.sep).join("/"));
    else if (entry.isSymbolicLink()) {
      const relative = path.relative(root, filename).split(path.sep).join("/");
      files.push(relative);
    }
  }
  return files;
}

function outputRecordMap(manifest) {
  assert.ok(Array.isArray(manifest.outputs), "manifest outputs must be an array");
  assert.equal(manifest.outputs.length, 7, "candidate must declare exactly seven immutable outputs");
  const paths = manifest.outputs.map((record) => record?.path);
  assert.deepEqual(paths, [...paths].sort(), "manifest outputs must be deterministically path-sorted");
  assert.equal(new Set(paths).size, paths.length, "manifest output paths must be unique");
  const records = new Map();
  for (const record of manifest.outputs) {
    assert.ok(record && typeof record === "object" && !Array.isArray(record), "manifest output record must be an object");
    assert.match(record.sha256, /^[a-f0-9]{64}$/u, `invalid output SHA-256: ${record.path}`);
    assert.ok(Number.isSafeInteger(record.bytes) && record.bytes > 0, `invalid output byte count: ${record.path}`);
    records.set(record.path, record);
  }
  return records;
}

async function validateOutputClosure(root, generation, manifestPath, manifest, records) {
  const buffers = new Map();
  for (const [relativePath, record] of records) {
    const filename = resolveInside(root, relativePath, "manifest output path");
    const bytes = await readRegularFile(filename, `manifest output ${relativePath}`);
    assert.equal(bytes.length, record.bytes, `output byte count changed: ${relativePath}`);
    assert.equal(sha256(bytes), record.sha256, `output hash changed: ${relativePath}`);
    buffers.set(relativePath, bytes);
  }

  const allReleaseFiles = await walkFiles(path.join(root, "releases"), root);
  const allBuildFiles = await walkFiles(path.join(root, "build"), root);
  const escapedGeneration = generation.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const generatedRelease = new RegExp(`^releases/(?:${escapedGeneration}[^/]*|(?:javascript|styles|data|manifests)/${escapedGeneration}[^/]*)$`, "u");
  const generatedBuild = new RegExp(`^build/${escapedGeneration}-v8-fast-site-manifest\\.json$`, "u");
  const actualGenerationFiles = [...allReleaseFiles, ...allBuildFiles]
    .filter((relativePath) => generatedRelease.test(relativePath) || generatedBuild.test(relativePath))
    .sort();
  const expectedGenerationFiles = [...records.keys(), path.relative(root, manifestPath).split(path.sep).join("/")].sort();
  assert.deepEqual(actualGenerationFiles, expectedGenerationFiles, "generation closure differs from candidate manifest");
  assert.ok(!actualGenerationFiles.some((relativePath) => relativePath.startsWith("releases/manifests/")), "fast candidate must not enter the deployable release-manifest namespace");
  assert.ok(!manifest.outputs.some((record) => /(?:^|\/)project-partition-/u.test(record.path)), "full detail partitions must remain shared source cartridges");
  return buffers;
}

function declaredRecord(records, relativePath) {
  const record = records.get(relativePath);
  assert.ok(record, `undeclared output referenced: ${relativePath}`);
  return record;
}

function validateCacheContract(manifest, compilerBytes) {
  const contract = manifest.cache_contract;
  assert.equal(contract?.schema, CACHE_SCHEMA);
  assert.equal(contract.compiler_method, COMPILER_METHOD);
  assert.deepEqual(contract.compiler, { path: manifest.compiler.path, sha256: manifest.compiler.sha256 }, "manifest compiler bytes and cache compiler bytes must be identical");
  assert.equal(contract.compiler.sha256, sha256(compilerBytes), "compiler hash does not match committed compiler bytes");
  assert.deepEqual(contract.project_index, {
    schema: PROJECT_SCHEMA,
    fields: PROJECT_FIELDS,
    dictionary_fields: DICTIONARY_FIELDS,
    stable_key: "repd_ref",
    detail_locator: "floor(global_row_index/500)",
  });
  assert.deepEqual(contract.search_index, { schema: SEARCH_SCHEMA, row_alignment: "global_project_row_index", activation: "first-nonempty-search" });
  assert.deepEqual(contract.news_index, { schema: NEWS_SCHEMA, fields: NEWS_FIELDS, stable_key: "gg_article_id", activation: "idle-after-core-ready" });
  assert.deepEqual(contract.runtime, { physical_project_rows: 50, physical_news_rows: 30, detail_fetch_concurrency: 4, immutable_cache_mode: "force-cache" });
  const identity = sha256(Buffer.from(JSON.stringify(contract)));
  assert.equal(manifest.cache_identity, identity, "cache identity does not close over the complete cache contract");
  return identity;
}

function dictionaryValue(dictionaries, field, index, rowNumber) {
  assert.ok(Number.isSafeInteger(index) && index >= 0 && index < dictionaries[field].length, `row ${rowNumber} has invalid ${field} dictionary index`);
  return dictionaries[field][index];
}

function validateProjectPayload(payload, cacheIdentity, sourceManifest) {
  assert.equal(payload.schema, PROJECT_SCHEMA);
  assert.equal(payload.generation, sourceManifest.generation);
  assert.equal(payload.cache_identity, cacheIdentity);
  assert.deepEqual(payload.fields, PROJECT_FIELDS);
  assert.deepEqual(Object.keys(payload.dictionaries), DICTIONARY_FIELDS);
  for (const field of DICTIONARY_FIELDS) {
    const values = payload.dictionaries[field];
    assert.ok(Array.isArray(values) && values.every((value) => typeof value === "string"), `${field} dictionary must contain strings`);
    assert.equal(new Set(values).size, values.length, `${field} dictionary values must be unique`);
    assert.deepEqual(values, [...values].sort(), `${field} dictionary must be deterministically sorted`);
  }
  assert.ok(Array.isArray(payload.rows));
  assert.equal(payload.rows.length, 7680);

  const refs = new Set();
  const ids = new Set();
  const counts = { solar: 0, bess: 0, wind_onshore: 0, wind_offshore: 0 };
  const decodedRefs = [];
  let capacity = 0;
  let largest = 0;
  let geometry = 0;
  let beacon = null;
  let previousCapacity = Infinity;
  for (let rowNumber = 0; rowNumber < payload.rows.length; rowNumber += 1) {
    const row = payload.rows[rowNumber];
    assert.ok(Array.isArray(row) && row.length === PROJECT_FIELDS.length, `project row ${rowNumber} must have ${PROJECT_FIELDS.length} fields`);
    const ref = row[0];
    const projectId = row[1];
    const name = row[2];
    const technology = dictionaryValue(payload.dictionaries, "technology", row[3], rowNumber);
    dictionaryValue(payload.dictionaries, "status", row[4], rowNumber);
    const rowCapacity = row[5];
    dictionaryValue(payload.dictionaries, "county", row[6], rowNumber);
    dictionaryValue(payload.dictionaries, "region", row[7], rowNumber);
    dictionaryValue(payload.dictionaries, "operator", row[8], rowNumber);
    const geometryStatus = dictionaryValue(payload.dictionaries, "geometry_status", row[10], rowNumber);
    assert.ok(typeof ref === "string" && ref, `project row ${rowNumber} has no REPD Ref`);
    assert.equal(projectId, `GG2050-REPD-${ref}`, `project row ${rowNumber} has a non-authoritative project ID`);
    assert.equal(typeof name, "string", `project row ${rowNumber} name must remain a string, including canonical blanks`);
    assert.ok(Object.hasOwn(counts, technology), `project row ${rowNumber} has unknown technology`);
    assert.ok(Number.isFinite(rowCapacity) && rowCapacity >= 1, `project row ${rowNumber} has invalid capacity`);
    assert.ok(!refs.has(ref), `duplicate REPD Ref ${ref}`);
    assert.ok(!ids.has(projectId), `duplicate project ID ${projectId}`);
    assert.ok(rowCapacity <= previousCapacity, "compact project rows must retain canonical capacity-descending order");
    if (geometryStatus === "valid") {
      geometry += 1;
      assert.ok(Number.isFinite(row[11]) && Number.isFinite(row[12]), `valid geometry missing coordinates for REPD ${ref}`);
    }
    refs.add(ref);
    ids.add(projectId);
    decodedRefs.push(ref);
    counts[technology] += 1;
    capacity += rowCapacity;
    largest = Math.max(largest, rowCapacity);
    previousCapacity = rowCapacity;
    if (ref === "13599") beacon = { index: rowNumber, ref, projectId, name, capacity: rowCapacity, technology };
  }
  const totals = {
    project_count: payload.rows.length,
    capacity_mw: Math.round((capacity + Number.EPSILON) * 100) / 100,
    largest_mw: largest,
    solar_count: counts.solar,
    bess_count: counts.bess,
    wind_onshore_count: counts.wind_onshore,
    wind_offshore_count: counts.wind_offshore,
    geometry_count: geometry,
    missing_geometry_count: payload.rows.length - geometry,
  };
  assert.deepEqual(totals, EXPECTED_TOTALS);
  assert.ok(beacon, "Beacon Fen REPD 13599 is missing");
  assert.equal(beacon.projectId, "GG2050-REPD-13599");
  assert.equal(beacon.capacity, 400);
  assert.match(beacon.name, /Beacon Fen/iu);
  return { totals, beacon, decodedRefs };
}

function validateSearchPayload(payload, cacheIdentity, projectResult, generation) {
  assert.equal(payload.schema, SEARCH_SCHEMA);
  assert.equal(payload.generation, generation);
  assert.equal(payload.cache_identity, cacheIdentity);
  assert.equal(payload.row_alignment, "global_project_row_index");
  assert.ok(Array.isArray(payload.rows) && payload.rows.length === 7680);
  assert.ok(payload.rows.every((value) => typeof value === "string"), "search supplement rows must be strings");
  const beaconSearch = payload.rows[projectResult.beacon.index];
  assert.match(beaconSearch, /(?:^| )13599(?: |$)/u);
  assert.match(beaconSearch, /beacon fen/u);
}

function validateNewsPayload(payload, cacheIdentity, generation, canonicalNews) {
  assert.equal(payload.schema, NEWS_SCHEMA);
  assert.equal(payload.generation, generation);
  assert.equal(payload.cache_identity, cacheIdentity);
  assert.deepEqual(payload.fields, NEWS_FIELDS);
  assert.ok(Array.isArray(payload.rows) && payload.rows.length === 133);
  const articleIds = new Set();
  let canonical = 0;
  let international = 0;
  let us = 0;
  let europe = 0;
  let other = 0;
  let beacon = null;
  for (let index = 0; index < payload.rows.length; index += 1) {
    const row = payload.rows[index];
    const source = canonicalNews.all_items[index];
    assert.ok(Array.isArray(row) && row.length === NEWS_FIELDS.length, `news row ${index} must have ${NEWS_FIELDS.length} fields`);
    const expectedId = source.gg_article_id || `GG2050-NEWS-${sha256(Buffer.from(String(source.url || ""), "utf8")).slice(0, 16).toUpperCase()}`;
    assert.equal(row[0], expectedId, `news row ${index} stable article ID changed`);
    assert.match(row[0], /^GG2050-NEWS-[A-Z0-9-]+$/u, `news row ${index} has an invalid stable article ID`);
    assert.ok(!articleIds.has(row[0]), `duplicate article ID ${row[0]}`);
    articleIds.add(row[0]);
    if (row[15] === true && row[16] === "PRIMARY_MATCH" && row[17] === true && row[1] && row[2] === `GG2050-REPD-${row[1]}`) canonical += 1;
    if (row[18]) {
      international += 1;
      if (row[18] === "US") us += 1;
      else if (row[18] === "EUROPE") europe += 1;
      else other += 1;
    }
    if (row[1] === "13599" && /Beacon Fen/iu.test(`${row[3]} ${row[10]}`)) beacon = row;
  }
  assert.equal(canonical, 45);
  assert.equal(articleIds.size, 133);
  assert.deepEqual({ international, us, europe, other }, { international: 19, us: 4, europe: 9, other: 6 });
  assert.ok(beacon, "Beacon Fen canonical news row is missing");
  assert.equal(beacon[2], "GG2050-REPD-13599");
  assert.equal(beacon[5], 400);
  return { canonical, international };
}

async function validateDetailPartitions(root, registry, canonicalManifest, projectResult) {
  assert.equal(registry.detail_schema, "globalgrid2050.v9.project-partition.v9.1");
  assert.equal(registry.detail_partition_size, 500);
  assert.equal(registry.detail_partitions.length, 16);
  assert.equal(canonicalManifest.project_partitions.length, 16);
  const paths = new Set();
  let records = 0;
  let bytesTotal = 0;
  for (let index = 0; index < registry.detail_partitions.length; index += 1) {
    const entry = registry.detail_partitions[index];
    const canonical = canonicalManifest.project_partitions[index];
    const number = String(index + 1).padStart(2, "0");
    assert.equal(entry.path, `../data/projects/202608261927-project-partition-v9-1-${number}.json`);
    assert.equal(entry.sha256, canonical.sha256, `detail partition ${index + 1} hash differs from canonical source manifest`);
    assert.equal(entry.record_count, canonical.record_count, `detail partition ${index + 1} count differs from canonical source manifest`);
    assert.equal(entry.activation, "project-detail-or-export");
    assert.ok(Number.isSafeInteger(entry.bytes) && entry.bytes > 0);
    assert.ok(!paths.has(entry.path), `duplicate detail partition ${entry.path}`);
    paths.add(entry.path);
    const detailRelativePath = path.posix.normalize(`releases/${entry.path}`);
    const detailBytes = await readRegularFile(resolveInside(root, detailRelativePath, "detail cartridge path"), `detail cartridge ${index + 1}`);
    assert.equal(detailBytes.length, entry.bytes, `detail partition ${index + 1} byte count changed`);
    assert.equal(sha256(detailBytes), entry.sha256, `detail partition ${index + 1} hash changed`);
    const payload = parseJson(detailBytes, `detail partition ${index + 1}`);
    assert.equal(payload.schema, registry.detail_schema);
    assert.equal(payload.record_count, entry.record_count);
    assert.equal(payload.projects.length, entry.record_count);
    const start = index * registry.detail_partition_size;
    const expectedRefs = projectResult.decodedRefs.slice(start, start + entry.record_count);
    assert.deepEqual(payload.projects.map((project) => String(project.repd_ref)), expectedRefs, `detail partition ${index + 1} is not aligned with compact rows`);
    records += entry.record_count;
    bytesTotal += entry.bytes;
  }
  assert.equal(records, 7680);
  return { partitions: registry.detail_partitions.length, records, bytes: bytesTotal };
}

async function validateCanonicalSource(root, manifest) {
  const expectedHash = manifest.cache_contract.sources.project_manifest_sha256;
  const candidates = manifest.inputs.filter((record) => record.path.startsWith("data/manifests/") && record.sha256 === expectedHash);
  assert.equal(candidates.length, 1, "cache contract must identify exactly one canonical project source manifest");
  const record = candidates[0];
  const bytes = await readRegularFile(resolveInside(root, record.path, "canonical source manifest path"), "canonical project source manifest");
  assert.equal(bytes.length, record.bytes);
  assert.equal(sha256(bytes), expectedHash);
  const canonical = parseJson(bytes, "canonical project source manifest");
  assert.equal(canonical.schema, "globalgrid2050.v9.project-spine-build.v9.1");
  assert.equal(canonical.project_count, 7680);
  assert.equal(canonical.capacity_mw, 356474.09);
  assert.equal(canonical.geometry_count, 7652);
  assert.equal(canonical.project_partitions.length, 16);
  return canonical;
}

async function validateCanonicalNews(root, manifest) {
  const expectedHash = manifest.cache_contract.sources.news_sha256;
  const candidates = manifest.inputs.filter((record) => record.path.startsWith("data/news/") && record.sha256 === expectedHash);
  assert.equal(candidates.length, 1, "cache contract must identify exactly one canonical news source");
  const record = candidates[0];
  const bytes = await readRegularFile(resolveInside(root, record.path, "canonical news source path"), "canonical news source");
  assert.equal(bytes.length, record.bytes);
  assert.equal(sha256(bytes), expectedHash);
  const news = parseJson(bytes, "canonical news source");
  assert.equal(news.schema, "globalgrid2050.major-project-news.v9.5.1");
  assert.equal(news.all_items.length, 133);
  assert.equal(news.canonical_items.length, 45);
  assert.equal(news.beacon_fen_contract?.repd_ref, "13599");
  assert.equal(news.beacon_fen_contract?.official_capacity_mw, 400);
  return news;
}

async function validateRuntimeAssets(root, generation, registry, records, buffers, cacheIdentity) {
  assert.equal(registry.schema, REGISTRY_SCHEMA);
  assert.equal(registry.generation, generation);
  assert.equal(registry.compiler_method, COMPILER_METHOD);
  assert.equal(registry.cache_identity, cacheIdentity);
  assert.deepEqual(registry.lifecycle, ["WAIT", "QUEUED", "LOAD", "INDEX", "OK", "EMPTY", "FAIL"]);
  assert.deepEqual(registry.performance, {
    maximum_physical_project_rows: 50,
    maximum_physical_news_rows: 30,
    maximum_dom_elements: 5000,
    maximum_initial_decoded_bytes: 2_000_000,
    maximum_mobile_interaction_ms: 200,
    maximum_desktop_interaction_ms: 100,
    maximum_ordinary_long_task_ms: 200,
    maximum_detail_fetch_concurrency: 4,
  });
  assert.equal(registry.companies_house, "deferred-phase-two");
  assert.equal(registry.deployment, "not-authorised");
  assert.deepEqual(registry.source.candidate_delta, { count: 23, status: "held-fail-closed" });
  assert.deepEqual(registry.news_counts, EXPECTED_NEWS_COUNTS);

  const prefix = cacheIdentity.slice(0, 12);
  const expectedAssetPaths = {
    projects: `data/${generation}-${prefix}-v8-fast-projects.json`,
    search: `data/${generation}-${prefix}-v8-fast-search.json`,
    news: `data/${generation}-${prefix}-v8-fast-news.json`,
  };
  const payloads = {};
  for (const [name, expectedPath] of Object.entries(expectedAssetPaths)) {
    const asset = registry.assets[name];
    assert.equal(asset.path, expectedPath, `${name} asset filename must include the cache identity prefix`);
    assert.equal(asset.schema, { projects: PROJECT_SCHEMA, search: SEARCH_SCHEMA, news: NEWS_SCHEMA }[name]);
    assert.equal(asset.activation, { projects: "boot", search: "first-nonempty-search", news: "idle-after-core-ready" }[name]);
    const relativePath = `releases/${asset.path}`;
    const record = declaredRecord(records, relativePath);
    assert.equal(asset.sha256, record.sha256);
    assert.equal(asset.bytes, record.bytes);
    payloads[name] = parseJson(buffers.get(relativePath), `${name} payload`);
  }
  assert.deepEqual(registry.assets.chart.activation, "idle-after-core-ready");
  assert.equal(registry.assets.chart.path, "vendor/202608261927-chart-umd.min.js");
  const chartBytes = await readRegularFile(resolveInside(root, `releases/${registry.assets.chart.path}`, "chart asset path"), "lazy chart asset");
  assert.equal(chartBytes.length, registry.assets.chart.bytes);
  assert.equal(sha256(chartBytes), registry.assets.chart.sha256);
  return payloads;
}

function validateStaticRuntime(generation, cacheIdentity, runtimeBytes, htmlBytes, styleBytes, registry) {
  const runtime = runtimeBytes.toString("utf8");
  const html = htmlBytes.toString("utf8");
  const styles = styleBytes.toString("utf8");
  assert.ok(runtime.includes(`const GENERATION = "${generation}";`));
  assert.ok(runtime.includes(`const EXPECTED_COMPILER_METHOD = "${COMPILER_METHOD}";`));
  assert.ok(runtime.includes(`const EXPECTED_CACHE_IDENTITY = "${cacheIdentity}";`));
  assert.ok(!runtime.includes("__FAST_GENERATION__"));
  assert.ok(!runtime.includes("__FAST_COMPILER_METHOD__"));
  assert.ok(!runtime.includes("__FAST_CACHE_IDENTITY__"));
  assert.match(runtime, /cache\s*:\s*["']force-cache["']/u);
  assert.doesNotMatch(runtime, /\bno-(?:store|cache)\b/u);
  assert.doesNotMatch(runtime, /Date\.now\s*\(/u);
  assert.match(runtime, /const WINDOW_SIZE\s*=\s*50\s*;/u);
  assert.match(runtime, /const DETAIL_CONCURRENCY\s*=\s*4\s*;/u);
  assert.match(runtime, /new FetchQueue\(DETAIL_CONCURRENCY\)/u);
  assert.match(runtime, /AbortController\(\)/u);
  assert.match(runtime, /timeoutMs\s*=\s*15000/u);
  assert.match(runtime, /fetchImmutable\(registry\.assets\.search\.path\)/u);
  assert.match(runtime, /fetchImmutable\(registry\.assets\.news\.path\)/u);
  assert.match(runtime, /loadDetailPartition/u);
  assert.match(runtime, /requestIdleCallback/u);
  assert.match(runtime, /document\.body\.dataset\.fastReady\s*=\s*["']true["']/u);

  const scriptTags = html.match(/<script\b[^>]*>/giu) || [];
  assert.equal(scriptTags.length, 1, "candidate HTML must contain one non-blocking module entry point");
  assert.match(scriptTags[0], /type=["']module["']/iu);
  assert.match(scriptTags[0], new RegExp(`src=["']javascript/${generation}-v8-fast-runtime\\.js["']`, "u"));
  assert.doesNotMatch(html, /cdn\.jsdelivr|chart\.js|app-v9-6-2|Date\.now\s*\(/iu);
  const stylesheets = html.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/giu) || [];
  assert.equal(stylesheets.length, 1, "candidate HTML must contain one compiled stylesheet");
  assert.match(stylesheets[0], new RegExp(`href=["']styles/${generation}-v8-fast\\.css["']`, "u"));
  assert.equal((html.match(/<th\b/giu) || []).length, 11, "all 11 project columns must remain in the candidate DOM contract");
  assert.match(html, new RegExp(`<body data-fast-generation=["']${generation}["']`, "u"));

  assert.match(styles, /\.tablewrap\s+table\s*\{[^}]*min-width\s*:\s*1500px/isu);
  assert.match(styles, /\.tablewrap\s*\{[^}]*overflow-x\s*:\s*auto/isu);
  assert.match(styles, /\.tablewrap\s+\.hide-mobile\s*\{[^}]*display\s*:\s*table-cell\s*!important/isu);
  assert.match(styles, /body\s*\{[^}]*min-height\s*:\s*100dvh[^}]*overflow-x\s*:\s*hidden/isu);
  assert.match(styles, /\.project-window-controls\s*\{[^}]*position\s*:\s*sticky[^}]*bottom\s*:\s*0/isu);
  assert.equal(registry.performance.maximum_physical_project_rows, 50);
  assert.equal(registry.performance.maximum_physical_news_rows, 30);
}

function validateManifestContracts(manifest, registry, initialBytes, projectBytes) {
  assert.deepEqual(manifest.parity, {
    ...EXPECTED_TOTALS,
    headlines: 133,
    canonical_headlines: 45,
    international_headlines: 19,
    beacon_fen_repd_ref: "13599",
  });
  assert.deepEqual(registry.totals, EXPECTED_TOTALS);
  assert.equal(manifest.performance_contract.initial_decoded_bytes, initialBytes);
  assert.equal(manifest.performance_contract.project_index_bytes, projectBytes);
  assert.ok(projectBytes <= MAX_PROJECT_BYTES, `compact project index exceeds ${MAX_PROJECT_BYTES} bytes`);
  assert.ok(initialBytes <= MAX_INITIAL_BYTES, `initial decoded closure exceeds ${MAX_INITIAL_BYTES} bytes`);
  assert.equal(manifest.performance_contract.maximum_initial_decoded_bytes, MAX_INITIAL_BYTES);
  assert.equal(manifest.performance_contract.maximum_physical_project_rows, 50);
  assert.equal(manifest.performance_contract.maximum_physical_news_rows, 30);
  assert.equal(manifest.performance_contract.maximum_dom_elements, 5000);
  assert.equal(manifest.performance_contract.maximum_detail_fetch_concurrency, 4);
  assert.deepEqual(manifest.discipline, {
    source_mutation: false,
    immutable_outputs: true,
    bounded_dom: true,
    bounded_detail_fetches: true,
    full_data_copied: false,
    deployment_separate: true,
  });
  assert.equal(manifest.evidence, "workflow-artifact-only");
  assert.equal(manifest.companies_house, "deferred-phase-two");
  assert.equal(manifest.deployment, "not-authorised");
  assert.equal(registry.companies_house, "deferred-phase-two");
  assert.equal(registry.deployment, "not-authorised");
}

async function main() {
  const { root, generation, manifestArgument } = parseArguments(process.argv.slice(2));
  const expectedManifestRelative = `build/${generation}-v8-fast-site-manifest.json`;
  const manifestPath = resolveInside(root, manifestArgument, "source manifest path");
  assert.equal(manifestPath, resolveInside(root, expectedManifestRelative, "expected source manifest path"), "--source-manifest must name this generation's candidate build manifest");
  const manifestBytes = await readRegularFile(manifestPath, "candidate build manifest");
  const manifest = parseJson(manifestBytes, "candidate build manifest");
  assert.equal(manifest.schema, MANIFEST_SCHEMA);
  assert.equal(manifest.generation, generation);
  assert.equal(manifest.compiler?.method, COMPILER_METHOD);
  assert.equal(manifest.compiler?.path, `index/${generation}-compile-v8-fast.mjs`);
  assert.match(manifest.compiler?.sha256, /^[a-f0-9]{64}$/u);
  assert.ok(Array.isArray(manifest.inputs) && manifest.inputs.length > 16, "candidate input closure is incomplete");

  const compilerBytes = await readRegularFile(resolveInside(root, manifest.compiler.path, "compiler path"), "pinned fast compiler");
  const cacheIdentity = validateCacheContract(manifest, compilerBytes);
  const records = outputRecordMap(manifest);
  const buffers = await validateOutputClosure(root, generation, manifestPath, manifest, records);
  const registryPath = `releases/data/${generation}-v8-fast-registry.json`;
  const registry = parseJson(buffers.get(registryPath), "fast registry");
  assert.deepEqual(registry.cache_contract, manifest.cache_contract, "registry and candidate manifest cache contracts differ");
  const canonicalManifest = await validateCanonicalSource(root, manifest);
  const canonicalNews = await validateCanonicalNews(root, manifest);
  const payloads = await validateRuntimeAssets(root, generation, registry, records, buffers, cacheIdentity);
  const projectResult = validateProjectPayload(payloads.projects, cacheIdentity, manifest);
  validateSearchPayload(payloads.search, cacheIdentity, projectResult, generation);
  const newsResult = validateNewsPayload(payloads.news, cacheIdentity, generation, canonicalNews);
  const detailResult = await validateDetailPartitions(root, registry, canonicalManifest, projectResult);

  const htmlPath = `releases/${generation}-v8-fast-candidate.html`;
  const runtimePath = `releases/javascript/${generation}-v8-fast-runtime.js`;
  const stylePath = `releases/styles/${generation}-v8-fast.css`;
  for (const relativePath of [htmlPath, runtimePath, stylePath, registryPath]) declaredRecord(records, relativePath);
  validateStaticRuntime(generation, cacheIdentity, buffers.get(runtimePath), buffers.get(htmlPath), buffers.get(stylePath), registry);
  const projectRelativePath = `releases/${registry.assets.projects.path}`;
  const criticalPaths = [htmlPath, runtimePath, stylePath, projectRelativePath, registryPath];
  const initialBytes = criticalPaths.reduce((sum, relativePath) => sum + declaredRecord(records, relativePath).bytes, 0);
  validateManifestContracts(manifest, registry, initialBytes, declaredRecord(records, projectRelativePath).bytes);

  const proof = {
    schema: CONTRACT_SCHEMA,
    generation,
    manifest_sha256: sha256(manifestBytes),
    compiler_method: COMPILER_METHOD,
    cache_identity: cacheIdentity,
    output_closure: {
      files: records.size,
      bytes: [...records.values()].reduce((sum, record) => sum + record.bytes, 0),
    },
    project_index: {
      bytes: declaredRecord(records, projectRelativePath).bytes,
      records: projectResult.totals.project_count,
      capacity_mw: projectResult.totals.capacity_mw,
      beacon_fen_repd_ref: projectResult.beacon.ref,
    },
    lazy_cartridges: {
      search_records: payloads.search.rows.length,
      news_records: payloads.news.rows.length,
      canonical_news_records: newsResult.canonical,
      international_news_records: newsResult.international,
      detail_partitions: detailResult.partitions,
      detail_records: detailResult.records,
      detail_bytes: detailResult.bytes,
    },
    performance: {
      initial_decoded_bytes: initialBytes,
      maximum_initial_decoded_bytes: MAX_INITIAL_BYTES,
      maximum_physical_project_rows: registry.performance.maximum_physical_project_rows,
      maximum_physical_news_rows: registry.performance.maximum_physical_news_rows,
      maximum_detail_fetch_concurrency: registry.performance.maximum_detail_fetch_concurrency,
    },
    release_boundary: {
      deployment: manifest.deployment,
      companies_house: manifest.companies_house,
      release_manifest_created: false,
      candidate_delta: registry.source.candidate_delta,
    },
  };
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
