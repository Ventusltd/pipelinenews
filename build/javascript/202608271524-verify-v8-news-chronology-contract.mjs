import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const GENERATION = "202608271524";
const PARENT_GENERATION = "202608271329";
const NEWS_SOURCE_GENERATION = "202608270844";
const ROLLBACK_GENERATION = "202608270055";
const SOURCE_PARENT_COMMIT = "b6a2b441799307ca55751d770a6083d05cdf15b5";
const PROTECTED_RECOVERY_COMMIT = "77bda8c3809d02550d06a1c4154315f56d1120fb";
const NAME = "Live News Discovery + Chronology + Atlas V8 Deep-Link";
const COMPILER_METHOD = "pipelinenews-v8-news-chronology-stable-sort-v1";
const MANIFEST_PATH = `build/${GENERATION}-v8-fast-site-manifest.json`;
const SOURCE_MANIFEST_PATH = `manifests/${GENERATION}-news-chronology-candidate.json`;
const HTML_PATH = `releases/${GENERATION}-v8-fast-candidate.html`;
const RUNTIME_PATH = `releases/javascript/${GENERATION}-v8-fast-runtime.js`;
const REGISTRY_PATH = `releases/data/${GENERATION}-v8-fast-registry.json`;
const PARENT_NEWS_PATH = "releases/data/202608270844-9ab451f4bf19-v8-fast-news.json";
const ATLAS_PATH = "releases/javascript/202608271329-atlas-v8-deep-link-cartridge.js";
const EXPECTED_COUNTS = Object.freeze({ all: 136, uk: 47, international: 19, us: 4, europe: 9, other: 6 });
const EXPECTED_BBC_IDS = Object.freeze([
  "GG2050-NEWS-0E813A86D54E39FC",
  "GG2050-NEWS-B4B91FD3DA8F596C",
  "GG2050-NEWS-C3D0A5910F32E821",
]);
const PINNED = Object.freeze({
  "build/202608271329-v8-fast-site-manifest.json": "8026752e42872863f034d34dbfbbf8242edadfae6581574a5b8fc112b4b45268",
  "releases/202608271329-v8-fast-candidate.html": "97e847e485749c6198c4df920a314e3fef9f3caa3db5eefe2279578abbdb1493",
  "releases/javascript/202608271329-v8-fast-runtime.js": "61e961322a9dea45dd180d27a1d60657b00f87728ee5b2b138840f34564e1a19",
  [ATLAS_PATH]: "d8e997acea1ed6c628e4d69f27653a5fe9a21bb459ff95d4ee0a7d040b431ff7",
  "releases/data/202608271329-v8-fast-registry.json": "895755d85cf7916ea41f46f15bfce7f1d96ef7ddb6a5157ddc2b931c97452424",
  [PARENT_NEWS_PATH]: "f90caae31bd4339367558e05a4f9c1564f4cbd502aaac186fea56fc20787c693",
  "releases/data/202608270055-8ab1807551bc-v8-fast-projects.json": "c06aedef176d2d38fd135806306a8ef81b4af9994c7be31e8bd760304149f862",
  "releases/data/202608270055-8ab1807551bc-v8-fast-search.json": "a1cbfc5202b717889a471409e850ea5cae13626f91c60f08cda0b06da5102b65",
  "releases/styles/202608270055-v8-fast.css": "d6c8100dbf79dd02f65d78e4fc9cacae92f2e4b5a749ea0fd3ff481fe5bb4792",
});
const NEWS = Object.freeze({
  articleId: 0,
  repdRef: 1,
  projectId: 2,
  project: 3,
  technology: 4,
  capacity: 5,
  operator: 6,
  county: 7,
  country: 8,
  event: 9,
  headline: 10,
  published: 11,
  source: 12,
  url: 13,
  confidence: 14,
  canonical: 15,
  role: 16,
  eligible: 17,
  region: 18,
  eventDetail: 21,
  relationship: 22,
  relatedContextRepdRef: 23,
  relatedContextProject: 24,
  bindingLabel: 25,
  relatedComponents: 26,
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

function parsePublished(row) {
  const articleId = String(row[NEWS.articleId] || "");
  const published = String(row[NEWS.published] || "");
  assert.match(published, /^\d{4}-\d{2}-\d{2}$/u, `published date is not YYYY-MM-DD: ${articleId}`);
  const timestamp = Date.parse(`${published}T00:00:00.000Z`);
  assert.ok(Number.isFinite(timestamp), `published date is invalid: ${articleId}`);
  assert.equal(new Date(timestamp).toISOString().slice(0, 10), published, `published date does not round-trip: ${articleId}`);
  return timestamp;
}

function violationIndexes(rows) {
  const timestamps = rows.map(parsePublished);
  return timestamps.flatMap((timestamp, index) => (
    index > 0 && timestamps[index - 1] < timestamp ? [index] : []
  ));
}

function verifyRows(parent, successor) {
  assert.deepEqual(successor.fields, parent.fields, "news field contract changed");
  assert.equal(parent.rows.length, 136);
  assert.equal(successor.rows.length, 136);
  assert.deepEqual(violationIndexes(parent.rows), [133, 135], "confirmed parent defect changed");
  assert.deepEqual(violationIndexes(successor.rows), [], "successor dates are not non-increasing");

  const parentIndex = new Map(parent.rows.map((row, index) => [row[NEWS.articleId], index]));
  const parentById = new Map(parent.rows.map((row) => [row[NEWS.articleId], row]));
  assert.equal(parentById.size, 136, "parent article IDs are not unique");
  assert.equal(new Set(successor.rows.map((row) => row[NEWS.articleId])).size, 136, "successor article IDs are not unique");
  for (const row of successor.rows) {
    assert.deepEqual(row, parentById.get(row[NEWS.articleId]), `article bytes changed: ${row[NEWS.articleId]}`);
  }
  for (let index = 1; index < successor.rows.length; index += 1) {
    const previous = successor.rows[index - 1];
    const current = successor.rows[index];
    if (parsePublished(previous) === parsePublished(current)) {
      assert.ok(
        parentIndex.get(previous[NEWS.articleId]) < parentIndex.get(current[NEWS.articleId]),
        `equal-date source order changed at row ${index}`,
      );
    }
  }

  const ids = successor.rows.map((row) => row[NEWS.articleId]);
  assert.deepEqual(ids.slice(0, 3), EXPECTED_BBC_IDS, "BBC chronology at the front of the edition changed");
  assert.ok(EXPECTED_BBC_IDS.every((id) => ids.slice(0, 30).includes(id)), "BBC article escaped the first 30-card window");
  assert.equal(successor.rows.filter((row) => row[NEWS.canonical] === true).length, 47);
  assert.equal(successor.rows.filter((row) => String(row[NEWS.region] || "")).length, 19);

  const byId = new Map(successor.rows.map((row) => [row[NEWS.articleId], row]));
  const windsock = byId.get(EXPECTED_BBC_IDS[0]);
  assert.equal(windsock[NEWS.project], "Windsock Solar Farm");
  assert.equal(windsock[NEWS.repdRef], "");
  assert.equal(windsock[NEWS.projectId], "");
  assert.equal(windsock[NEWS.role], "RELATED_MENTION");
  assert.equal(windsock[NEWS.relationship], "EDITORIAL_CONTEXT");
  assert.equal(windsock[NEWS.relatedContextRepdRef], "13599");
  assert.equal(windsock[NEWS.bindingLabel], "RELATED CONTEXT ONLY — NOT A PROJECT BINDING");
  assert.equal(windsock[NEWS.eligible], false);

  const eastPye = byId.get(EXPECTED_BBC_IDS[1]);
  assert.equal(eastPye[NEWS.repdRef], "17494");
  assert.equal(eastPye[NEWS.projectId], "GG2050-REPD-17494");
  assert.equal(eastPye[NEWS.capacity], 500);
  assert.equal(eastPye[NEWS.event], "PROJECT UPDATE");
  assert.notEqual(eastPye[NEWS.event], "FINANCIAL CLOSE");
  assert.equal(eastPye[NEWS.role], "PRIMARY_MATCH");
  assert.equal(eastPye[NEWS.eligible], true);
  assert.equal(eastPye[NEWS.relatedComponents][0]?.repd_ref, "20670");
  assert.equal(eastPye[NEWS.relatedComponents][0]?.official_capacity_mw, null);
  assert.equal(eastPye[NEWS.relatedComponents][0]?.eligible_for_news_signal, false);

  const beacon = byId.get(EXPECTED_BBC_IDS[2]);
  assert.equal(beacon[NEWS.repdRef], "13599");
  assert.equal(beacon[NEWS.projectId], "GG2050-REPD-13599");
  assert.equal(beacon[NEWS.capacity], 400);
  assert.equal(beacon[NEWS.event], "PROJECT UPDATE");
  assert.equal(beacon[NEWS.eventDetail], "POTENTIAL_LEGAL_CHALLENGE_TO_CONSENT");
  assert.equal(beacon[NEWS.role], "PRIMARY_MATCH");
  assert.equal(beacon[NEWS.eligible], true);
  assert.equal(beacon[NEWS.relatedComponents][0]?.repd_ref, "13600");
  assert.equal(beacon[NEWS.relatedComponents][0]?.official_capacity_mw, 600);
  assert.equal(beacon[NEWS.relatedComponents][0]?.eligible_for_news_signal, false);
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
  assert.equal(manifest.news_source_generation, NEWS_SOURCE_GENERATION);
  assert.equal(manifest.rollback_generation, ROLLBACK_GENERATION);
  assert.equal(manifest.compiler.method, COMPILER_METHOD);
  assert.match(manifest.source_commit, /^[a-f0-9]{40}$/u);
  assert.match(String(manifest.github_run_id), /^\d+$/u);
  assert.equal(manifest.deployment, "not-authorised");

  const newsPath = `releases/data/${GENERATION}-${manifest.cache_identity.slice(0, 12)}-v8-fast-news.json`;
  const expectedOutputs = [HTML_PATH, RUNTIME_PATH, REGISTRY_PATH, newsPath].sort();
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
  assert.equal(manifest.cache_contract.schema, "pipelinenews.v8.news-chronology-cache-contract.v1");
  assert.equal(manifest.cache_contract.compiler_method, COMPILER_METHOD);
  assert.equal(manifest.cache_contract.compiler.sha256, manifest.compiler.sha256);
  assert.equal(manifest.cache_contract.source_parent_commit, SOURCE_PARENT_COMMIT);
  assert.equal(manifest.cache_contract.parent_generation, PARENT_GENERATION);
  assert.equal(manifest.cache_contract.news_source_generation, NEWS_SOURCE_GENERATION);
  assert.deepEqual(manifest.cache_contract.news_ordering, {
    key: "published",
    parsing: "strict-YYYY-MM-DD-at-UTC-midnight",
    direction: "descending",
    tie_breaks: ["parent_row_index_ascending", "gg_article_id_ascending_if_parent_index_equal"],
    invariant: "published timestamps are non-increasing",
    physical_first_window: 30,
  });
  assert.equal(
    sha256(Buffer.from(JSON.stringify(manifest.cache_contract))),
    manifest.cache_identity,
    "cache identity changed",
  );

  const parentManifest = JSON.parse(pinnedBytes["build/202608271329-v8-fast-site-manifest.json"]);
  const parentRegistry = JSON.parse(pinnedBytes["releases/data/202608271329-v8-fast-registry.json"]);
  const parentNews = JSON.parse(pinnedBytes[PARENT_NEWS_PATH]);
  const news = JSON.parse(outputBytes.get(newsPath));
  const registry = JSON.parse(outputBytes.get(REGISTRY_PATH));
  assert.equal(news.schema, "pipelinenews.v8.live-news-index.v1");
  assert.equal(news.generation, GENERATION);
  assert.equal(news.cache_identity, manifest.cache_identity);
  verifyRows(parentNews, news);

  assert.equal(registry.schema, "pipelinenews.v8.live-news-registry.v1");
  assert.equal(registry.generation, GENERATION);
  assert.equal(registry.name, NAME);
  assert.equal(registry.compiler_method, COMPILER_METHOD);
  assert.equal(registry.cache_identity, manifest.cache_identity);
  assert.deepEqual(registry.cache_contract, manifest.cache_contract);
  assert.equal(registry.deployment, "not-authorised");
  assert.deepEqual(registry.totals, parentRegistry.totals);
  assert.deepEqual(registry.news_counts, EXPECTED_COUNTS);
  assert.deepEqual(registry.signals, parentRegistry.signals);
  assert.deepEqual(registry.cartridges, parentRegistry.cartridges);
  assert.equal(registry.cartridges.atlas_v8_deep_link.generation, PARENT_GENERATION);
  assert.equal(registry.cartridges.atlas_v8_deep_link.path, "javascript/202608271329-atlas-v8-deep-link-cartridge.js");
  assert.equal(registry.cartridges.atlas_v8_deep_link.sha256, PINNED[ATLAS_PATH]);
  assert.deepEqual(registry.cache_contract.atlas_deep_link, parentRegistry.cache_contract.atlas_deep_link);
  assert.deepEqual(registry.assets.projects, parentRegistry.assets.projects);
  assert.deepEqual(registry.assets.search, parentRegistry.assets.search);
  assert.deepEqual(registry.assets.chart, parentRegistry.assets.chart);
  assert.deepEqual(registry.assets.style, parentRegistry.assets.style);
  assert.equal(registry.assets.news.path, path.posix.relative("releases", newsPath));
  assert.equal(registry.assets.news.generation, GENERATION);
  assert.equal(registry.assets.news.cache_identity, manifest.cache_identity);
  assert.equal(registry.assets.news.sha256, sha256(outputBytes.get(newsPath)));
  assert.equal(registry.assets.news.bytes, outputBytes.get(newsPath).length);
  assert.deepEqual(registry.chronology.first_window_bbc_article_ids, EXPECTED_BBC_IDS);
  assert.equal(registry.chronology.source_rows_changed, false);

  assert.deepEqual(manifest.parity, parentManifest.parity);
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
  assert.equal(manifest.performance_contract.maximum_physical_news_rows, 30);
  assert.equal(manifest.performance_contract.maximum_detail_fetch_concurrency, 4);
  assert.equal(manifest.discipline.chronology_compile_time_only, true);
  assert.equal(manifest.discipline.chronology_stable_sort, true);
  assert.equal(manifest.discipline.runtime_date_sort, false);
  assert.equal(manifest.discipline.news_records_changed, false);
  assert.equal(manifest.discipline.atlas_deep_link_cartridge_reused, true);
  assert.equal(manifest.discipline.stable_route_changed, false);
  assert.equal(manifest.discipline.current_pointer_changed, false);
  assert.equal(manifest.discipline.globalgrid_catalogue_changed, false);

  const runtime = outputBytes.get(RUNTIME_PATH).toString("utf8");
  assert.ok(runtime.startsWith('import { buildAtlasV8DeepLink } from "./202608271329-atlas-v8-deep-link-cartridge.js";'));
  assert.ok(runtime.includes(`const GENERATION = "${GENERATION}";`));
  assert.ok(runtime.includes(`const EXPECTED_COMPILER_METHOD = "${COMPILER_METHOD}";`));
  assert.ok(runtime.includes(`const EXPECTED_CACHE_IDENTITY = "${manifest.cache_identity}";`));
  assert.match(runtime, /function atlasUrl\(item\) \{\s+return buildAtlasV8DeepLink\(item\);\s+\}/u);
  assert.ok(!runtime.includes('new URL("https://globalgrid2050.com/repd_grid_atlasv8/")'));
  assert.ok(!runtime.includes("newsRows.sort("), "runtime chronology sort entered the browser");

  const html = outputBytes.get(HTML_PATH).toString("utf8");
  assert.ok(html.includes("LIVE NEWS DISCOVERY + CHRONOLOGY + ATLAS V8 DEEP-LINK CANDIDATE"));
  assert.ok(html.includes("136 HEADLINES · 47 UK · 19 INTERNATIONAL"));
  assert.ok(html.includes("NOT DEPLOYED"));
  assert.ok(html.includes(`data-fast-generation="${GENERATION}"`));
  assert.ok(html.includes(`javascript/${GENERATION}-v8-fast-runtime.js`));
  assert.ok(!html.includes("releases/current.json"));

  const sourceManifest = JSON.parse(await regularBytes(root, SOURCE_MANIFEST_PATH));
  assert.equal(sourceManifest.schema, "pipelinenews.news-chronology-source-manifest.v1");
  assert.equal(sourceManifest.generation, GENERATION);
  assert.equal(sourceManifest.source_parent_commit, SOURCE_PARENT_COMMIT);
  assert.equal(sourceManifest.parent_generation, PARENT_GENERATION);
  assert.equal(sourceManifest.deployment, "not-authorised");

  process.stdout.write(`${JSON.stringify({
    schema: "pipelinenews.v8.news-chronology-contract-proof.v1",
    generation: GENERATION,
    source_commit: manifest.source_commit,
    manifest_sha256: sha256(manifestBytes),
    cache_identity: manifest.cache_identity,
    parent_chronology_violation_indexes: [133, 135],
    successor_chronology_violation_indexes: [],
    first_window_bbc_article_ids: EXPECTED_BBC_IDS,
    headline_count: manifest.parity.headlines,
    canonical_headline_count: manifest.parity.canonical_headlines,
    international_headline_count: manifest.parity.international_headlines,
    atlas_cartridge_generation: PARENT_GENERATION,
    deployment: manifest.deployment,
    status: "PASS",
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
