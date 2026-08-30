import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GENERATION = "202608271524";
const PARENT_GENERATION = "202608271329";
const NEWS_SOURCE_GENERATION = "202608270844";
const ROLLBACK_GENERATION = "202608270055";
const SOURCE_PARENT_COMMIT = "b6a2b441799307ca55751d770a6083d05cdf15b5";
const PROTECTED_RECOVERY_COMMIT = "77bda8c3809d02550d06a1c4154315f56d1120fb";
const NAME = "Live News Discovery + Chronology + Atlas V8 Deep-Link";
const COMPILER_FILE = `${GENERATION}-compile-v8-news-chronology.mjs`;
const COMPILER_METHOD = "pipelinenews-v8-news-chronology-stable-sort-v1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_SCHEMA = "pipelinenews.v8.live-news-registry.v1";
const NEWS_SCHEMA = "pipelinenews.v8.live-news-index.v1";

const INPUTS = Object.freeze({
  parentManifest: "build/202608271329-v8-fast-site-manifest.json",
  parentHtml: "releases/202608271329-v8-fast-candidate.html",
  parentRuntime: "releases/javascript/202608271329-v8-fast-runtime.js",
  atlasCartridge: "releases/javascript/202608271329-atlas-v8-deep-link-cartridge.js",
  parentRegistry: "releases/data/202608271329-v8-fast-registry.json",
  parentNews: "releases/data/202608270844-9ab451f4bf19-v8-fast-news.json",
  projects: "releases/data/202608270055-8ab1807551bc-v8-fast-projects.json",
  search: "releases/data/202608270055-8ab1807551bc-v8-fast-search.json",
  style: "releases/styles/202608270055-v8-fast.css",
});

const PINNED_SHA256 = Object.freeze({
  [INPUTS.parentManifest]: "8026752e42872863f034d34dbfbbf8242edadfae6581574a5b8fc112b4b45268",
  [INPUTS.parentHtml]: "97e847e485749c6198c4df920a314e3fef9f3caa3db5eefe2279578abbdb1493",
  [INPUTS.parentRuntime]: "61e961322a9dea45dd180d27a1d60657b00f87728ee5b2b138840f34564e1a19",
  [INPUTS.atlasCartridge]: "d8e997acea1ed6c628e4d69f27653a5fe9a21bb459ff95d4ee0a7d040b431ff7",
  [INPUTS.parentRegistry]: "895755d85cf7916ea41f46f15bfce7f1d96ef7ddb6a5157ddc2b931c97452424",
  [INPUTS.parentNews]: "f90caae31bd4339367558e05a4f9c1564f4cbd502aaac186fea56fc20787c693",
  [INPUTS.projects]: "c06aedef176d2d38fd135806306a8ef81b4af9994c7be31e8bd760304149f862",
  [INPUTS.search]: "a1cbfc5202b717889a471409e850ea5cae13626f91c60f08cda0b06da5102b65",
  [INPUTS.style]: "d6c8100dbf79dd02f65d78e4fc9cacae92f2e4b5a749ea0fd3ff481fe5bb4792",
});

const EXPECTED_NEWS_COUNTS = Object.freeze({ all: 136, uk: 47, international: 19, us: 4, europe: 9, other: 6 });
const BBC_IDS = Object.freeze([
  "GG2050-NEWS-0E813A86D54E39FC",
  "GG2050-NEWS-B4B91FD3DA8F596C",
  "GG2050-NEWS-C3D0A5910F32E821",
]);
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
  evidenceSnippet: 27,
});

const HTML_OUTPUT = `releases/${GENERATION}-v8-fast-candidate.html`;
const RUNTIME_OUTPUT = `releases/javascript/${GENERATION}-v8-fast-runtime.js`;
const REGISTRY_OUTPUT = `releases/data/${GENERATION}-v8-fast-registry.json`;
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

function jsonBytes(value, pretty = false) {
  return Buffer.from(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`);
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

function parsePublished(value, articleId) {
  const published = String(value || "");
  assert.match(published, /^\d{4}-\d{2}-\d{2}$/u, `published date is not YYYY-MM-DD: ${articleId}`);
  const timestamp = Date.parse(`${published}T00:00:00.000Z`);
  assert.ok(Number.isFinite(timestamp), `published date is invalid: ${articleId}`);
  assert.equal(new Date(timestamp).toISOString().slice(0, 10), published, `published date does not round-trip: ${articleId}`);
  return timestamp;
}

function stableChronology(rows) {
  const decorated = rows.map((row, parentIndex) => ({
    row,
    parentIndex,
    timestamp: parsePublished(row[NEWS.published], row[NEWS.articleId]),
  }));
  decorated.sort((left, right) => (
    right.timestamp - left.timestamp
    || left.parentIndex - right.parentIndex
    || String(left.row[NEWS.articleId]).localeCompare(String(right.row[NEWS.articleId]), "en")
  ));
  for (let index = 1; index < decorated.length; index += 1) {
    assert.ok(
      decorated[index - 1].timestamp >= decorated[index].timestamp,
      `published chronology increases at successor row ${index}`,
    );
    if (decorated[index - 1].timestamp === decorated[index].timestamp) {
      assert.ok(
        decorated[index - 1].parentIndex < decorated[index].parentIndex,
        `equal-date parent order changed at successor row ${index}`,
      );
    }
  }
  return decorated.map(({ row }) => row);
}

function chronologyViolationIndexes(rows) {
  const timestamps = rows.map((row) => parsePublished(row[NEWS.published], row[NEWS.articleId]));
  return timestamps.flatMap((timestamp, index) => (
    index > 0 && timestamps[index - 1] < timestamp ? [index] : []
  ));
}

function validateRecords(parentRows, rows, fields) {
  assert.equal(rows.length, 136);
  assert.equal(fields.length, 28);
  assert.ok(rows.every((row) => row.length === fields.length), "news row width changed");
  const ids = rows.map((row) => row[NEWS.articleId]);
  assert.equal(new Set(ids).size, rows.length, "stable article IDs are not unique");

  const parentById = new Map(parentRows.map((row) => [row[NEWS.articleId], row]));
  assert.equal(parentById.size, parentRows.length, "parent stable article IDs are not unique");
  for (const row of rows) {
    assert.deepEqual(row, parentById.get(row[NEWS.articleId]), `article record changed: ${row[NEWS.articleId]}`);
  }
  assert.deepEqual(ids.slice(0, BBC_IDS.length), BBC_IDS, "the three newest BBC records are not the first three rows");
  assert.ok(BBC_IDS.every((id) => ids.slice(0, 30).includes(id)), "a BBC record is outside the first newspaper window");
  assert.equal(rows.filter((row) => row[NEWS.canonical] === true).length, 47);
  assert.equal(rows.filter((row) => String(row[NEWS.region] || "")).length, 19);
  assert.equal(rows.filter((row) => row[NEWS.role] === "PRIMARY_MATCH").length >= 47, true);

  const byId = new Map(rows.map((row) => [row[NEWS.articleId], row]));
  const windsock = byId.get(BBC_IDS[0]);
  assert.equal(windsock[NEWS.published], "2026-08-27");
  assert.equal(windsock[NEWS.repdRef], "");
  assert.equal(windsock[NEWS.projectId], "");
  assert.equal(windsock[NEWS.role], "RELATED_MENTION");
  assert.equal(windsock[NEWS.relationship], "EDITORIAL_CONTEXT");
  assert.equal(windsock[NEWS.relatedContextRepdRef], "13599");
  assert.equal(windsock[NEWS.eligible], false);
  assert.equal(windsock[NEWS.bindingLabel], "RELATED CONTEXT ONLY — NOT A PROJECT BINDING");

  const eastPye = byId.get(BBC_IDS[1]);
  assert.equal(eastPye[NEWS.published], "2026-08-25");
  assert.equal(eastPye[NEWS.repdRef], "17494");
  assert.equal(eastPye[NEWS.projectId], "GG2050-REPD-17494");
  assert.equal(eastPye[NEWS.event], "PROJECT UPDATE");
  assert.notEqual(eastPye[NEWS.event], "FINANCIAL CLOSE");
  assert.equal(eastPye[NEWS.role], "PRIMARY_MATCH");
  assert.equal(eastPye[NEWS.eligible], true);
  assert.equal(eastPye[NEWS.relatedComponents][0]?.repd_ref, "20670");
  assert.equal(eastPye[NEWS.relatedComponents][0]?.eligible_for_news_signal, false);

  const beacon = byId.get(BBC_IDS[2]);
  assert.equal(beacon[NEWS.published], "2026-08-24");
  assert.equal(beacon[NEWS.repdRef], "13599");
  assert.equal(beacon[NEWS.projectId], "GG2050-REPD-13599");
  assert.equal(beacon[NEWS.event], "PROJECT UPDATE");
  assert.equal(beacon[NEWS.eventDetail], "POTENTIAL_LEGAL_CHALLENGE_TO_CONSENT");
  assert.equal(beacon[NEWS.role], "PRIMARY_MATCH");
  assert.equal(beacon[NEWS.eligible], true);
  assert.equal(beacon[NEWS.relatedComponents][0]?.repd_ref, "13600");
  assert.equal(beacon[NEWS.relatedComponents][0]?.official_capacity_mw, 600);
  assert.equal(beacon[NEWS.relatedComponents][0]?.eligible_for_news_signal, false);
}

function rewriteRuntime(parentSource, cacheIdentity) {
  let source = parentSource;
  source = replaceExactly(source, `const GENERATION = "${PARENT_GENERATION}";`, `const GENERATION = "${GENERATION}";`);
  source = replaceExactly(
    source,
    'const EXPECTED_COMPILER_METHOD = "pipelinenews-v8-atlas-deep-link-cartridge-v1";',
    `const EXPECTED_COMPILER_METHOD = "${COMPILER_METHOD}";`,
  );
  source = replaceExactly(
    source,
    'const EXPECTED_CACHE_IDENTITY = "b6d619bca4667020c9c8590753238b85601df74771e11041d6e9e0258f81c70c";',
    `const EXPECTED_CACHE_IDENTITY = "${cacheIdentity}";`,
  );
  source = replaceExactly(source, "Live News Discovery candidate ·", "Live News Discovery + chronology candidate ·");
  assert.ok(source.startsWith('import { buildAtlasV8DeepLink } from "./202608271329-atlas-v8-deep-link-cartridge.js";'));
  assert.equal(source.match(/function atlasUrl\(/gu)?.length, 1);
  assert.match(source, /function atlasUrl\(item\) \{\s+return buildAtlasV8DeepLink\(item\);\s+\}/u);
  assert.ok(!source.includes('new URL("https://ventusltd.github.io/gridatlas/202608292311-atlas-v9/")'));
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
  source = source.replaceAll(
    "LIVE NEWS DISCOVERY + ATLAS V8 DEEP-LINK CANDIDATE",
    "LIVE NEWS DISCOVERY + CHRONOLOGY + ATLAS V8 DEEP-LINK CANDIDATE",
  );
  assert.ok(source.includes("136 HEADLINES · 47 UK · 19 INTERNATIONAL"));
  assert.ok(source.includes("NOT DEPLOYED"));
  assert.ok(source.includes("styles/202608270055-v8-fast.css"));
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
  const search = JSON.parse(inputs.search);
  assert.equal(parentManifest.schema, "pipelinenews.v8.fast-site-candidate.v1");
  assert.equal(parentManifest.generation, PARENT_GENERATION);
  assert.equal(parentManifest.deployment, "not-authorised");
  assert.equal(parentManifest.source_commit, "799bb304d38765aa1f9b176dc46525c30acaf9cc");
  assert.equal(parentRegistry.schema, REGISTRY_SCHEMA);
  assert.equal(parentRegistry.generation, PARENT_GENERATION);
  assert.equal(parentRegistry.deployment, "not-authorised");
  assert.equal(parentRegistry.cache_identity, parentManifest.cache_identity);
  assert.deepEqual(parentRegistry.news_counts, EXPECTED_NEWS_COUNTS);
  assert.equal(parentRegistry.totals.project_count, 7_680);
  assert.equal(parentRegistry.totals.capacity_mw, 356_474.09);
  assert.equal(parentNews.schema, NEWS_SCHEMA);
  assert.equal(parentNews.generation, NEWS_SOURCE_GENERATION);
  assert.equal(parentNews.rows.length, 136);
  assert.deepEqual(parentNews.fields, parentRegistry.cache_contract.news_index.fields);
  assert.equal(projects.rows.length, 7_680);
  assert.equal(search.rows.length, 7_680);
  assert.equal(parentRegistry.cartridges.atlas_v8_deep_link.path, "javascript/202608271329-atlas-v8-deep-link-cartridge.js");
  assert.equal(parentRegistry.cartridges.atlas_v8_deep_link.sha256, PINNED_SHA256[INPUTS.atlasCartridge]);
  for (const record of parentManifest.outputs) {
    if (PINNED_SHA256[record.path]) assert.equal(record.sha256, PINNED_SHA256[record.path]);
  }

  assert.deepEqual(chronologyViolationIndexes(parentNews.rows), [133, 135], "the confirmed predecessor defect changed");
  const rows = stableChronology(parentNews.rows);
  assert.deepEqual(chronologyViolationIndexes(rows), [], "successor chronology is not non-increasing");
  validateRecords(parentNews.rows, rows, parentNews.fields);

  const cacheContract = {
    schema: "pipelinenews.v8.news-chronology-cache-contract.v1",
    compiler_method: COMPILER_METHOD,
    compiler: { path: `index/${COMPILER_FILE}`, sha256: compilerSha256 },
    source_parent_commit: SOURCE_PARENT_COMMIT,
    protected_recovery_commit: PROTECTED_RECOVERY_COMMIT,
    parent_generation: PARENT_GENERATION,
    news_source_generation: NEWS_SOURCE_GENERATION,
    rollback_generation: ROLLBACK_GENERATION,
    sources: Object.fromEntries(Object.entries(INPUTS).map(([name, relativePath]) => [
      `${name}_sha256`, PINNED_SHA256[relativePath],
    ])),
    project_index: parentRegistry.cache_contract.project_index,
    search_index: parentRegistry.cache_contract.search_index,
    news_index: parentRegistry.cache_contract.news_index,
    runtime: parentRegistry.cache_contract.runtime,
    reuse: {
      project_generation: ROLLBACK_GENERATION,
      search_generation: ROLLBACK_GENERATION,
      style_generation: ROLLBACK_GENERATION,
      detail_generation: "202608261927",
      atlas_deep_link_generation: PARENT_GENERATION,
      news_source_generation: NEWS_SOURCE_GENERATION,
    },
    news_ordering: {
      key: "published",
      parsing: "strict-YYYY-MM-DD-at-UTC-midnight",
      direction: "descending",
      tie_breaks: ["parent_row_index_ascending", "gg_article_id_ascending_if_parent_index_equal"],
      invariant: "published timestamps are non-increasing",
      physical_first_window: 30,
    },
    atlas_deep_link: parentRegistry.cache_contract.atlas_deep_link,
  };
  const cacheIdentity = sha256(Buffer.from(JSON.stringify(cacheContract)));
  const newsPayload = {
    schema: NEWS_SCHEMA,
    generation: GENERATION,
    cache_identity: cacheIdentity,
    fields: parentNews.fields,
    rows,
  };
  const newsBytes = jsonBytes(newsPayload);
  const newsFile = `${GENERATION}-${cacheIdentity.slice(0, 12)}-v8-fast-news.json`;

  const registry = {
    ...parentRegistry,
    generation: GENERATION,
    name: NAME,
    compiler_method: COMPILER_METHOD,
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    assets: {
      ...parentRegistry.assets,
      news: {
        path: `data/${newsFile}`,
        schema: NEWS_SCHEMA,
        sha256: sha256(newsBytes),
        bytes: newsBytes.length,
        activation: "idle-after-core-ready",
        generation: GENERATION,
        cache_identity: cacheIdentity,
      },
    },
    chronology: {
      schema: "pipelinenews.v8.news-chronology.v1",
      source_generation: NEWS_SOURCE_GENERATION,
      order: "published-descending",
      dates: "strict-YYYY-MM-DD",
      stable_ties: "parent-row-order",
      first_window_size: 30,
      first_window_bbc_article_ids: BBC_IDS,
      source_rows_changed: false,
    },
    deployment: "not-authorised",
  };
  assert.deepEqual(registry.signals, parentRegistry.signals);
  assert.deepEqual(registry.news_counts, EXPECTED_NEWS_COUNTS);
  assert.deepEqual(registry.cartridges, parentRegistry.cartridges);
  const registryBytes = jsonBytes(registry, true);
  const runtimeBytes = Buffer.from(rewriteRuntime(inputs.parentRuntime.toString("utf8"), cacheIdentity));
  const htmlBytes = Buffer.from(rewriteHtml(inputs.parentHtml.toString("utf8")));
  const outputs = new Map([
    [HTML_OUTPUT, htmlBytes],
    [RUNTIME_OUTPUT, runtimeBytes],
    [`releases/data/${newsFile}`, newsBytes],
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
    + inputs.atlasCartridge.length;
  assert.ok(initialDecodedBytes < 2_000_000, `initial decoded closure is ${initialDecodedBytes} bytes`);

  const manifest = {
    schema: "pipelinenews.v8.fast-site-candidate.v1",
    generation: GENERATION,
    name: NAME,
    source_commit: sourceCommit,
    source_parent_commit: SOURCE_PARENT_COMMIT,
    github_run_id: runId,
    compiler: { path: `index/${COMPILER_FILE}`, method: COMPILER_METHOD, sha256: compilerSha256 },
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    protected_parent: PROTECTED_RECOVERY_COMMIT,
    parent_generation: PARENT_GENERATION,
    news_source_generation: NEWS_SOURCE_GENERATION,
    rollback_generation: ROLLBACK_GENERATION,
    parity: { ...parentManifest.parity },
    performance_contract: {
      ...parentManifest.performance_contract,
      initial_decoded_bytes: initialDecodedBytes,
      news_index_bytes: newsBytes.length,
      news_index_activation: "idle-after-core-ready",
      deep_link_cartridge_bytes: inputs.atlasCartridge.length,
    },
    discipline: {
      ...parentManifest.discipline,
      source_mutation: false,
      chronology_compile_time_only: true,
      chronology_stable_sort: true,
      runtime_date_sort: false,
      news_records_changed: false,
      atlas_deep_link_cartridge_reused: true,
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
  allOutputs.set(MANIFEST_OUTPUT, jsonBytes(manifest, true));
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
    schema: "pipelinenews.v8.news-chronology-compiler-result.v1",
    generation: GENERATION,
    parent_generation: PARENT_GENERATION,
    source_commit: manifest.source_commit,
    cache_identity: manifest.cache_identity,
    files: outputs.size,
    headlines: manifest.parity.headlines,
    canonical_headlines: manifest.parity.canonical_headlines,
    international_headlines: manifest.parity.international_headlines,
    first_window_bbc_article_ids: BBC_IDS,
    deployment: manifest.deployment,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
