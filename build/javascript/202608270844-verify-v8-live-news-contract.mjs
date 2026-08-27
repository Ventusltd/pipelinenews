import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const GENERATION = "202608270844";
const BASE_GENERATION = "202608270055";
const PROTECTED_PARENT = "77bda8c3809d02550d06a1c4154315f56d1120fb";
const MANIFEST_SCHEMA = "pipelinenews.v8.fast-site-candidate.v1";
const REGISTRY_SCHEMA = "pipelinenews.v8.live-news-registry.v1";
const NEWS_SCHEMA = "pipelinenews.v8.live-news-index.v1";
const COMPILER_METHOD = "pipelinenews-v8-live-news-discovery-reuse-fast-spine-v1";
const BASE_CACHE_IDENTITY = "8ab1807551bc77066e46e01cb0690dfaa41d473d8433644046f56b6984579b06";
const MAX_INITIAL_BYTES = 2_000_000;

const REUSED = Object.freeze({
  projects: {
    path: "releases/data/202608270055-8ab1807551bc-v8-fast-projects.json",
    sha256: "c06aedef176d2d38fd135806306a8ef81b4af9994c7be31e8bd760304149f862",
    bytes: 979338,
  },
  search: {
    path: "releases/data/202608270055-8ab1807551bc-v8-fast-search.json",
    sha256: "a1cbfc5202b717889a471409e850ea5cae13626f91c60f08cda0b06da5102b65",
    bytes: 1912681,
  },
  style: {
    path: "releases/styles/202608270055-v8-fast.css",
    sha256: "d6c8100dbf79dd02f65d78e4fc9cacae92f2e4b5a749ea0fd3ff481fe5bb4792",
    bytes: 14397,
  },
  parentNews: {
    path: "releases/data/202608270055-8ab1807551bc-v8-fast-news.json",
    sha256: "cfca3ab92012022f752de887a47d5eb2b3632ebad0f89d28ba5df2fcb454d194",
    bytes: 77639,
  },
});

const BASE_NEWS_FIELDS = Object.freeze([
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
const NEWS_FIELDS = Object.freeze([
  ...BASE_NEWS_FIELDS,
  "event_detail",
  "relationship",
  "related_context_repd_ref",
  "related_context_project",
  "binding_label",
  "related_components",
  "evidence_snippet",
]);
const N = Object.freeze(Object.fromEntries(NEWS_FIELDS.map((field, index) => [field, index])));

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseArguments(argv) {
  const allowed = new Set(["--root", "--generation", "--source-manifest"]);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    assert.ok(allowed.has(name), `unknown argument: ${name || "<empty>"}`);
    assert.ok(value && !value.startsWith("--"), `${name} requires a value`);
    assert.ok(!values.has(name), `duplicate argument: ${name}`);
    values.set(name, value);
  }
  for (const name of allowed) assert.ok(values.has(name), `${name} is required`);
  assert.equal(values.get("--generation"), GENERATION);
  return {
    root: path.resolve(values.get("--root")),
    manifest: values.get("--source-manifest"),
  };
}

function resolveInside(root, relativePath, label) {
  assert.equal(typeof relativePath, "string", `${label} must be a string`);
  assert.ok(relativePath && !relativePath.includes("\\"), `${label} must be a POSIX path`);
  assert.equal(path.posix.normalize(relativePath), relativePath, `${label} must be normalised`);
  assert.ok(!path.posix.isAbsolute(relativePath) && !relativePath.startsWith("../"), `${label} escapes root`);
  const resolved = path.resolve(root, relativePath);
  assert.ok(resolved.startsWith(`${root}${path.sep}`), `${label} escapes root`);
  return resolved;
}

async function regularBytes(root, relativePath, label = relativePath) {
  const filename = resolveInside(root, relativePath, label);
  const metadata = await lstat(filename);
  assert.ok(metadata.isFile() && !metadata.isSymbolicLink(), `${label} must be a regular file`);
  return readFile(filename);
}

async function json(root, relativePath, label = relativePath) {
  return JSON.parse(await regularBytes(root, relativePath, label));
}

async function walk(directory, root) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(filename, root));
    else files.push(path.relative(root, filename).split(path.sep).join("/"));
  }
  return files;
}

async function verifyPinned(root, record) {
  const bytes = await regularBytes(root, record.path);
  assert.equal(bytes.length, record.bytes, `reused byte count changed: ${record.path}`);
  assert.equal(sha256(bytes), record.sha256, `reused SHA-256 changed: ${record.path}`);
  return bytes;
}

function outputMap(manifest) {
  assert.ok(Array.isArray(manifest.outputs));
  assert.equal(manifest.outputs.length, 4, "Live News Discovery must declare four new release outputs");
  const paths = manifest.outputs.map((record) => record.path);
  assert.deepEqual(paths, [...paths].sort(), "manifest output order changed");
  assert.equal(new Set(paths).size, 4, "manifest output paths must be unique");
  assert.ok(paths.includes(`releases/${GENERATION}-v8-fast-candidate.html`), "candidate HTML missing");
  for (const record of manifest.outputs) {
    assert.deepEqual(Object.keys(record).sort(), ["bytes", "path", "sha256"]);
    assert.ok(record.path.startsWith("releases/"), `candidate output escapes releases: ${record.path}`);
    assert.ok(path.posix.basename(record.path).startsWith(GENERATION), `candidate output has wrong generation: ${record.path}`);
    assert.ok(!record.path.startsWith("releases/manifests/"), "candidate must not enter promotion manifest namespace");
    assert.match(record.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(Number.isSafeInteger(record.bytes) && record.bytes > 0);
  }
  return new Map(manifest.outputs.map((record) => [record.path, record]));
}

function rowById(news, id) {
  const row = news.rows.find((candidate) => candidate[N.gg_article_id] === id);
  assert.ok(row, `missing article ${id}`);
  return row;
}

function assertComponent(component, expected) {
  assert.ok(component && typeof component === "object");
  for (const [field, value] of Object.entries(expected)) assert.deepEqual(component[field], value, `related component ${field} changed`);
}

async function main() {
  const { root, manifest: manifestArgument } = parseArguments(process.argv.slice(2));
  const manifestPath = path.posix.normalize(manifestArgument);
  assert.equal(manifestPath, `build/${GENERATION}-v8-fast-site-manifest.json`);
  const manifestBytes = await regularBytes(root, manifestPath, "candidate manifest");
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schema, MANIFEST_SCHEMA);
  assert.equal(manifest.generation, GENERATION);
  assert.equal(manifest.name, "Live News Discovery");
  assert.equal(manifest.protected_parent, PROTECTED_PARENT);
  assert.equal(manifest.rollback_generation, BASE_GENERATION);
  assert.equal(manifest.deployment, "not-authorised");
  assert.match(manifest.source_commit, /^[a-f0-9]{40}$/u);
  assert.match(String(manifest.github_run_id), /^\d+$/u);
  assert.equal(manifest.compiler.method, COMPILER_METHOD);
  assert.equal(manifest.discipline.stable_route_changed, false);
  assert.equal(manifest.discipline.current_pointer_changed, false);
  assert.equal(manifest.discipline.globalgrid_catalogue_changed, false);
  assert.equal(manifest.discipline.full_data_copied, false);

  const outputs = outputMap(manifest);
  const outputBytes = new Map();
  for (const [relativePath, record] of outputs) {
    const bytes = await regularBytes(root, relativePath, "candidate output");
    assert.equal(bytes.length, record.bytes, `candidate byte count changed: ${relativePath}`);
    assert.equal(sha256(bytes), record.sha256, `candidate hash changed: ${relativePath}`);
    outputBytes.set(relativePath, bytes);
  }

  const generationPattern = new RegExp(`^(?:releases/${GENERATION}[^/]*|releases/(?:javascript|styles|data|manifests)/${GENERATION}[^/]*|build/${GENERATION}-v8-fast-site-manifest\\.json)$`, "u");
  const actualGenerationFiles = [
    ...await walk(path.join(root, "releases"), root),
    ...await walk(path.join(root, "build"), root),
  ].filter((relativePath) => generationPattern.test(relativePath)).sort();
  assert.deepEqual(actualGenerationFiles, [...outputs.keys(), manifestPath].sort(), "0844 immutable closure contains undeclared files");

  const compilerBytes = await regularBytes(root, manifest.compiler.path, "compiler");
  assert.equal(sha256(compilerBytes), manifest.compiler.sha256, "compiler hash changed");
  assert.equal(manifest.cache_contract.compiler.sha256, manifest.compiler.sha256);
  assert.equal(manifest.cache_contract.schema, "pipelinenews.v8.live-news-cache-contract.v1");
  assert.equal(manifest.cache_contract.compiler_method, COMPILER_METHOD);
  assert.equal(manifest.cache_contract.protected_parent, PROTECTED_PARENT);
  assert.equal(sha256(Buffer.from(JSON.stringify(manifest.cache_contract))), manifest.cache_identity, "cache contract digest changed");

  const reusedProjectsBytes = await verifyPinned(root, REUSED.projects);
  const reusedSearchBytes = await verifyPinned(root, REUSED.search);
  await verifyPinned(root, REUSED.style);
  const parentNewsBytes = await verifyPinned(root, REUSED.parentNews);
  const parentNews = JSON.parse(parentNewsBytes);

  const registryPath = `releases/data/${GENERATION}-v8-fast-registry.json`;
  const registry = JSON.parse(outputBytes.get(registryPath));
  assert.equal(registry.schema, REGISTRY_SCHEMA);
  assert.equal(registry.generation, GENERATION);
  assert.equal(registry.name, "Live News Discovery");
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
  assert.equal(registry.performance.maximum_physical_project_rows, 50);
  assert.equal(registry.performance.maximum_physical_news_rows, 30);
  assert.equal(registry.performance.maximum_dom_elements, 5000);
  assert.equal(registry.performance.maximum_initial_decoded_bytes, MAX_INITIAL_BYTES);
  assert.equal(registry.performance.maximum_detail_fetch_concurrency, 4);
  assert.deepEqual(registry.signals["17494"], ["PROJECT UPDATE", 100, "2026-08-25"]);
  assert.deepEqual(registry.signals["13599"], ["PROJECT UPDATE", 100, "2026-08-24"]);
  assert.deepEqual(registry.discovery, {
    added_records: 3,
    primary_matches: 2,
    related_editorial_mentions: 1,
    enrichment: "strict-bbc-one-link-layer",
    evidence: "data/news-discovery/202608270844-bbc-live-news-evidence.json",
    raw_html_retained: false,
    article_bodies_retained: false,
  });

  assert.equal(registry.assets.projects.path, path.posix.relative("releases", REUSED.projects.path));
  assert.equal(registry.assets.projects.sha256, REUSED.projects.sha256);
  assert.equal(registry.assets.projects.bytes, REUSED.projects.bytes);
  assert.equal(registry.assets.projects.generation, BASE_GENERATION);
  assert.equal(registry.assets.projects.cache_identity, BASE_CACHE_IDENTITY);
  assert.equal(registry.assets.search.path, path.posix.relative("releases", REUSED.search.path));
  assert.equal(registry.assets.search.sha256, REUSED.search.sha256);
  assert.equal(registry.assets.search.bytes, REUSED.search.bytes);
  assert.equal(registry.assets.search.generation, BASE_GENERATION);
  assert.equal(registry.assets.search.cache_identity, BASE_CACHE_IDENTITY);
  assert.equal(registry.assets.style.path, "styles/202608270055-v8-fast.css");
  assert.equal(registry.assets.style.sha256, REUSED.style.sha256);
  assert.equal(registry.assets.news.generation, GENERATION);
  assert.equal(registry.assets.news.cache_identity, manifest.cache_identity);
  const newsPath = `releases/${registry.assets.news.path}`;
  assert.ok(outputs.has(newsPath), "registry news cartridge is not declared");
  assert.equal(registry.assets.news.sha256, outputs.get(newsPath).sha256);

  const projects = JSON.parse(reusedProjectsBytes);
  assert.equal(projects.schema, "pipelinenews.v8.fast-project-index.v1");
  assert.equal(projects.generation, BASE_GENERATION);
  assert.equal(projects.cache_identity, BASE_CACHE_IDENTITY);
  assert.equal(projects.rows.length, 7680);
  assert.equal(new Set(projects.rows.map((row) => row[0])).size, 7680);
  assert.equal(Math.round(projects.rows.reduce((sum, row) => sum + Number(row[5]), 0) * 100) / 100, 356474.09);
  const projectByRef = new Map(projects.rows.map((row) => [row[0], row]));
  assert.equal(projectByRef.get("17494")?.[2], "East Pye Solar Farm");
  assert.equal(projectByRef.get("17494")?.[5], 500);
  assert.equal(projectByRef.get("13599")?.[5], 400);
  assert.equal(projectByRef.get("13600")?.[5], 600);
  assert.equal(projectByRef.has("20670"), false, "unknown-capacity East Pye BESS must not enter the 7,680-project catalogue");

  const search = JSON.parse(reusedSearchBytes);
  assert.equal(search.rows.length, 7680);
  const eastIndex = projects.rows.findIndex((row) => row[0] === "17494");
  assert.match(search.rows[eastIndex], /20670/u, "East Pye related BESS reference disappeared from the search index");

  const news = JSON.parse(outputBytes.get(newsPath));
  assert.equal(news.schema, NEWS_SCHEMA);
  assert.equal(news.generation, GENERATION);
  assert.equal(news.cache_identity, manifest.cache_identity);
  assert.deepEqual(news.fields, NEWS_FIELDS);
  assert.equal(news.rows.length, 136);
  assert.equal(new Set(news.rows.map((row) => row[N.gg_article_id])).size, 136);
  assert.equal(news.rows.filter((row) => row[N.canonical_relevant] === true).length, 47);
  assert.equal(news.rows.filter((row) => Boolean(row[N.regional_classification])).length, 19);
  for (let index = 0; index < 133; index += 1) {
    assert.deepEqual(news.rows[index].slice(0, BASE_NEWS_FIELDS.length), parentNews.rows[index], `parent news row ${index} changed`);
    assert.deepEqual(news.rows[index].slice(BASE_NEWS_FIELDS.length), ["", "", "", "", "", [], ""], `parent news extension ${index} changed`);
  }

  const east = rowById(news, "GG2050-NEWS-B4B91FD3DA8F596C");
  assert.equal(east[N.repd_ref], "17494");
  assert.equal(east[N.gg_project_id], "GG2050-REPD-17494");
  assert.equal(east[N.capacity_mw], 500);
  assert.equal(east[N.event], "PROJECT UPDATE");
  assert.notEqual(east[N.event], "FINANCIAL CLOSE");
  assert.equal(east[N.role], "PRIMARY_MATCH");
  assert.equal(east[N.eligible_for_news_signal], true);
  assertComponent(east[N.related_components][0], {
    role: "RELATED_DEVELOPMENT",
    repd_ref: "20670",
    official_capacity_mw: null,
    eligible_for_news_signal: false,
  });

  const beacon = rowById(news, "GG2050-NEWS-C3D0A5910F32E821");
  assert.equal(beacon[N.repd_ref], "13599");
  assert.equal(beacon[N.gg_project_id], "GG2050-REPD-13599");
  assert.equal(beacon[N.capacity_mw], 400);
  assert.equal(beacon[N.event], "PROJECT UPDATE");
  assert.equal(beacon[N.event_detail], "POTENTIAL_LEGAL_CHALLENGE_TO_CONSENT");
  assertComponent(beacon[N.related_components][0], {
    role: "RELATED_DEVELOPMENT",
    repd_ref: "13600",
    official_capacity_mw: 600,
    eligible_for_news_signal: false,
  });

  const windsock = rowById(news, "GG2050-NEWS-0E813A86D54E39FC");
  assert.equal(windsock[N.project], "Windsock Solar Farm");
  assert.equal(windsock[N.repd_ref], "");
  assert.equal(windsock[N.gg_project_id], "");
  assert.equal(windsock[N.canonical_relevant], false);
  assert.equal(windsock[N.role], "RELATED_MENTION");
  assert.equal(windsock[N.relationship], "EDITORIAL_CONTEXT");
  assert.equal(windsock[N.related_context_repd_ref], "13599");
  assert.equal(windsock[N.related_context_project], "Beacon Fen Energy Park");
  assert.equal(windsock[N.binding_label], "RELATED CONTEXT ONLY — NOT A PROJECT BINDING");
  assert.equal(windsock[N.eligible_for_news_signal], false);

  const runtimePath = `releases/javascript/${GENERATION}-v8-fast-runtime.js`;
  const runtime = outputBytes.get(runtimePath).toString("utf8");
  assert.ok(!runtime.includes("__FAST_"), "compiled runtime contains placeholders");
  assert.ok(runtime.includes(`const GENERATION = "${GENERATION}"`));
  assert.ok(runtime.includes("pipelinenews.v8.live-news-registry.v1"));
  assert.ok(runtime.includes("RELATED CONTEXT ONLY — NOT A PROJECT BINDING"));
  assert.ok(runtime.includes("registry.assets.projects.generation"));
  assert.ok(runtime.includes("registry.assets.search.generation"));
  assert.ok(runtime.includes("registry.assets.news.generation"));
  assert.ok(runtime.includes('cache: "force-cache"'));
  assert.ok(!/cache:\s*["']no-(?:store|cache)["']/u.test(runtime));
  assert.ok(runtime.includes("const WINDOW_SIZE = 50"));
  assert.ok(runtime.includes("const NEWS_WINDOW_SIZE = 30"));
  assert.ok(runtime.includes("const DETAIL_CONCURRENCY = 4"));

  const html = outputBytes.get(`releases/${GENERATION}-v8-fast-candidate.html`).toString("utf8");
  assert.ok(html.includes("LIVE NEWS DISCOVERY CANDIDATE"));
  assert.ok(html.includes("136 HEADLINES · 47 UK · 19 INTERNATIONAL"));
  assert.ok(html.includes("NOT DEPLOYED"));
  assert.ok(html.includes(`data-fast-generation="${GENERATION}"`));
  assert.ok(html.includes(`javascript/${GENERATION}-v8-fast-runtime.js`));
  assert.ok(html.includes("styles/202608270055-v8-fast.css"));
  assert.ok(!html.includes("releases/current.json"));

  assert.equal(manifest.parity.project_count, 7680);
  assert.equal(manifest.parity.capacity_mw, 356474.09);
  assert.equal(manifest.parity.headlines, 136);
  assert.equal(manifest.parity.canonical_headlines, 47);
  assert.equal(manifest.parity.international_headlines, 19);
  assert.equal(manifest.parity.added_bbc_records, 3);
  assert.equal(manifest.parity.primary_matches, 2);
  assert.equal(manifest.parity.related_editorial_mentions, 1);
  assert.ok(manifest.performance_contract.initial_decoded_bytes < MAX_INITIAL_BYTES);
  assert.equal(manifest.performance_contract.project_index_bytes, REUSED.projects.bytes);
  assert.equal(manifest.outputs.some((record) => /projects|search|styles/u.test(path.posix.basename(record.path))), false, "reused spine assets were copied into the successor");

  let obsoleteMissing = false;
  try {
    await lstat(resolveInside(root, "data/news-discovery/202608270844-east-pye-evidence.json", "obsolete evidence"));
  } catch (error) {
    if (error.code === "ENOENT") obsoleteMissing = true;
    else throw error;
  }
  assert.equal(obsoleteMissing, true, "obsolete East Pye-only evidence file still exists");

  process.stdout.write(`${JSON.stringify({
    schema: "pipelinenews.v8.live-news-contract-proof.v1",
    generation: GENERATION,
    source_commit: manifest.source_commit,
    manifest_sha256: sha256(manifestBytes),
    cache_identity: manifest.cache_identity,
    project_count: 7680,
    capacity_mw: 356474.09,
    headline_count: 136,
    canonical_uk_headline_count: 47,
    international_headline_count: 19,
    output_count: 4,
    reused_project_bytes: REUSED.projects.bytes,
    initial_decoded_bytes: manifest.performance_contract.initial_decoded_bytes,
    detail_concurrency: 4,
    deployment: "not-authorised",
    status: "PASS",
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
