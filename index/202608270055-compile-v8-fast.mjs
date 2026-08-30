import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const GENERATION = "202608270055";
const BASE_GENERATION = "202608261927";
const COMPILER_FILE = `${GENERATION}-compile-v8-fast.mjs`;
const COMPILER_METHOD = "pipelinenews-v8-fast-dictionary-index-lazy-detail-v1";
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_SCHEMA = "pipelinenews.v8.fast-project-index.v1";
const SEARCH_SCHEMA = "pipelinenews.v8.fast-search-index.v1";
const NEWS_SCHEMA = "pipelinenews.v8.fast-news-index.v1";

const INPUTS = Object.freeze({
  template: "ui/templates/202608261927-shell-v9-6-2.html",
  runtime: "ui/javascript/202608270055-v8-fast-runtime.js",
  overrideStyle: "ui/styles/202608270055-v8-fast-overrides.css",
  styles: [
    "ui/styles/202608261740-v7-foundation.css",
    "ui/styles/202608261614-mobile.css",
    "ui/styles/202608261927-v9-3.css",
    "ui/styles/202608261927-v9-4.css",
    "ui/styles/202608261927-v9-5-1.css",
    "ui/styles/202608261927-v9-6-1.css",
  ],
  sourceManifest: "data/manifests/202608261927-build-manifest-v9-1.json",
  releaseContract: "data/contracts/202608261927-release-v9-1.json",
  trustedContract: "data/contracts/202608261721-release-v9-6-2.json",
  news: "data/news/202608261927-major-project-news-v9-5-1.json",
  newsRegions: "ui/javascript/202608261742-news-regions.js",
  utils: "ui/javascript/202608261630-utils.js",
  vendor: "releases/vendor/202608261927-chart-umd.min.js",
});

const PINNED_SHA256 = Object.freeze({
  "ui/templates/202608261927-shell-v9-6-2.html": "06382e57a58e460defcdd3c460ad01b93aa4c4578065348afa846b446e6d34ae",
  "ui/javascript/202608270055-v8-fast-runtime.js": "70d49f2a40dbfa87b0a3b1bd3fe12e186551f64b3fc33c0066ba7561bc9d6534",
  "ui/styles/202608270055-v8-fast-overrides.css": "9ad5d52f9c898afe4ada9b9b4ae6e73c36f073d533ce1e9ed2e5793f07ae80b5",
  "ui/styles/202608261740-v7-foundation.css": "036dbfe43ef1ffb2c55ba277d49dec57ab7c7be976289226a5d568e1f1be319d",
  "ui/styles/202608261614-mobile.css": "9855b9c11255a85f477873d07cca45b057aedcdc8a6cc4aab2d29a0ffaac9b85",
  "ui/styles/202608261927-v9-3.css": "219782d5f3fba11b8418a5b46075a8b1b918eed272f6bc2360f6b1060c1f2e9b",
  "ui/styles/202608261927-v9-4.css": "39f7d0fd3ff42e82407c1f5129444e6cc308ef5c0ec551d43c7396ac53310d17",
  "ui/styles/202608261927-v9-5-1.css": "79ff5b1db85ae82a381fbad061c0122e7151bb9c9c7ba80c549051761f0bfae3",
  "ui/styles/202608261927-v9-6-1.css": "851b0827ca2aa0950438c98ae3cf6cc7dce33667d37458122ea38bb2c6da2f81",
  "data/manifests/202608261927-build-manifest-v9-1.json": "67976a1bbcaf383ed7121b13060db3b864db9ce33dfc721a88b59c8ca8b8e06c",
  "data/contracts/202608261927-release-v9-1.json": "bc21070f44aae1d32da333e4954816acd907aa8c9fa9cb639c64d651f7fd4259",
  "data/contracts/202608261721-release-v9-6-2.json": "661bb4f226ac3c75811f9e1d36546602f401491a5c21e1ddebccda170da92ece",
  "data/news/202608261927-major-project-news-v9-5-1.json": "cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd",
  "ui/javascript/202608261742-news-regions.js": "673126663b69f67c73dfed4f6393e56e7779514e612559f0b6aad88a4354037f",
  "ui/javascript/202608261630-utils.js": "bec300e2720e0793bc08434e91c0ea0dd8c3d8e36e79b97172e4d5270f01eda0",
  "releases/vendor/202608261927-chart-umd.min.js": "48444a82d4edcb5bec0f1965faacdde18d9c17db3063d042abada2f705c9f54a",
});

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

function absolute(relativePath) {
  const resolved = path.resolve(REPOSITORY_ROOT, relativePath);
  assert.ok(resolved.startsWith(`${REPOSITORY_ROOT}${path.sep}`), `path escapes repository: ${relativePath}`);
  return resolved;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function jsonBytes(value, pretty = false) {
  return Buffer.from(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`);
}

async function readPinned(relativePath, encoding = null) {
  const bytes = await readFile(absolute(relativePath));
  assert.equal(sha256(bytes), PINNED_SHA256[relativePath], `input hash changed: ${relativePath}`);
  return encoding ? bytes.toString(encoding) : bytes;
}

function replaceExactly(source, from, to, expectedCount = 1) {
  const actualCount = source.split(from).length - 1;
  assert.equal(actualCount, expectedCount, `replacement count for ${JSON.stringify(from)}`);
  return source.split(from).join(to);
}

function normalise(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-GB")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchText(project) {
  const relationshipRefs = [
    ...(Array.isArray(project.direct_related_repd_refs) ? project.direct_related_repd_refs : []),
    ...(Array.isArray(project.planning_sibling_repd_refs) ? project.planning_sibling_repd_refs : []),
    ...(Array.isArray(project.development_repd_refs) ? project.development_repd_refs : []),
  ];
  return normalise([
    project.name,
    project.operator,
    project.repd_ref,
    project.gg_project_id,
    project.gg_development_id,
    project.repd_old_ref,
    project.repd_technology,
    project.technology,
    project.status,
    project.lifecycle,
    project.capacity_mw,
    project.county,
    project.region,
    project.country,
    project.planning_authority,
    project.planning_application_reference,
    project.repd_record_updated,
    project.geometry_status,
    relationshipRefs.join(" "),
  ].join(" "));
}

function makeDictionary(projects, field) {
  const values = [...new Set(projects.map((project) => project[field] ?? ""))].sort();
  return { values, indexes: new Map(values.map((value, index) => [value, index])) };
}

function projectCartridge(index) {
  return `data/projects/${BASE_GENERATION}-project-partition-v9-1-${String(index + 1).padStart(2, "0")}.json`;
}

async function loadProjects(sourceManifest, inputRecords) {
  assert.equal(sourceManifest.schema, "globalgrid2050.v9.project-spine-build.v9.1");
  assert.equal(sourceManifest.project_count, 7680);
  assert.equal(sourceManifest.source_record_count, 14657);
  assert.equal(sourceManifest.project_partitions.length, 16);
  const projects = [];
  const detailPartitions = [];
  for (let index = 0; index < sourceManifest.project_partitions.length; index += 1) {
    const declaration = sourceManifest.project_partitions[index];
    const relativePath = projectCartridge(index);
    const bytes = await readFile(absolute(relativePath));
    assert.equal(sha256(bytes), declaration.sha256, `project partition hash ${index + 1}`);
    const payload = JSON.parse(bytes);
    assert.equal(payload.schema, "globalgrid2050.v9.project-partition.v9.1");
    assert.equal(payload.record_count, declaration.record_count);
    assert.equal(payload.projects.length, declaration.record_count);
    projects.push(...payload.projects);
    detailPartitions.push({
      path: `../${relativePath}`,
      sha256: declaration.sha256,
      bytes: bytes.length,
      record_count: declaration.record_count,
      activation: "project-detail-or-export",
    });
    inputRecords.push({ path: relativePath, bytes: bytes.length, sha256: declaration.sha256 });
  }
  assert.equal(projects.length, 7680);
  return { projects, detailPartitions };
}

function validateProjects(projects, releaseContract, sourceManifest) {
  const technologies = new Set(["solar", "bess", "wind_onshore", "wind_offshore"]);
  const refs = new Set();
  const ids = new Set();
  const counts = { solar: 0, bess: 0, wind_onshore: 0, wind_offshore: 0 };
  let capacity = 0;
  let largest = 0;
  let geometryCount = 0;
  let previousCapacity = Infinity;
  for (const project of projects) {
    assert.ok(typeof project.repd_ref === "string" && project.repd_ref);
    assert.equal(project.gg_project_id, `GG2050-REPD-${project.repd_ref}`);
    assert.equal(project.identity_status, "REPD_BOUND");
    assert.equal(project.identity_confidence, "authoritative");
    assert.ok(technologies.has(project.technology));
    assert.ok(Number.isFinite(project.capacity_mw) && project.capacity_mw >= 1);
    assert.ok(!refs.has(project.repd_ref), `duplicate REPD Ref ${project.repd_ref}`);
    assert.ok(!ids.has(project.gg_project_id), `duplicate project ID ${project.gg_project_id}`);
    assert.ok(project.capacity_mw <= previousCapacity, "canonical project order is no longer capacity-descending");
    previousCapacity = project.capacity_mw;
    refs.add(project.repd_ref);
    ids.add(project.gg_project_id);
    counts[project.technology] += 1;
    capacity += project.capacity_mw;
    largest = Math.max(largest, project.capacity_mw);
    if (project.geometry_status === "valid") geometryCount += 1;
  }
  const actual = {
    project_count: projects.length,
    capacity_mw: Math.round((capacity + Number.EPSILON) * 100) / 100,
    largest_mw: largest,
    solar_count: counts.solar,
    bess_count: counts.bess,
    wind_onshore_count: counts.wind_onshore,
    wind_offshore_count: counts.wind_offshore,
  };
  assert.deepEqual(actual, releaseContract.expected);
  assert.equal(actual.project_count, sourceManifest.project_count);
  assert.equal(actual.capacity_mw, sourceManifest.capacity_mw);
  assert.equal(geometryCount, sourceManifest.geometry_count);
  return { ...actual, geometry_count: geometryCount, missing_geometry_count: projects.length - geometryCount };
}

function compileProjects(projects, cacheIdentity) {
  const compiled = {};
  const lookup = {};
  for (const field of DICTIONARY_FIELDS) {
    const dictionary = makeDictionary(projects, field);
    compiled[field] = dictionary.values;
    lookup[field] = dictionary.indexes;
  }
  const rows = projects.map((project) => [
    project.repd_ref,
    project.gg_project_id,
    project.name,
    lookup.technology.get(project.technology),
    lookup.status.get(project.status),
    project.capacity_mw,
    lookup.county.get(project.county ?? ""),
    lookup.region.get(project.region ?? ""),
    lookup.operator.get(project.operator ?? ""),
    project.repd_record_updated,
    lookup.geometry_status.get(project.geometry_status ?? ""),
    project.latitude,
    project.longitude,
  ]);
  return {
    schema: PROJECT_SCHEMA,
    generation: GENERATION,
    cache_identity: cacheIdentity,
    fields: PROJECT_FIELDS,
    dictionaries: compiled,
    rows,
  };
}

function canonicalItem(item) {
  return item
    && item.role === "PRIMARY_MATCH"
    && item.eligible_for_news_signal === true
    && String(item.repd_ref || "")
    && item.gg_project_id === `GG2050-REPD-${item.repd_ref}`;
}

function compileSignals(items) {
  const best = new Map();
  for (const item of items.filter(canonicalItem)) {
    const ref = String(item.repd_ref);
    const previous = best.get(ref);
    const candidateDate = Date.parse(String(item.published || "")) || 0;
    const previousDate = previous ? Date.parse(String(previous.published || "")) || 0 : 0;
    if (!previous || Number(item.confidence || 0) > Number(previous.confidence || 0)
      || (Number(item.confidence || 0) === Number(previous.confidence || 0) && candidateDate > previousDate)) {
      best.set(ref, item);
    }
  }
  return Object.fromEntries([...best].sort(([left], [right]) => left.localeCompare(right)).map(([ref, item]) => [
    ref,
    [String(item.event || "PROJECT UPDATE").toUpperCase(), Number(item.confidence || 0), item.published || "date unavailable"],
  ]));
}

function stableArticleId(item) {
  if (typeof item.gg_article_id === "string" && item.gg_article_id) return item.gg_article_id;
  assert.ok(typeof item.url === "string" && item.url, "news discovery row has no immutable URL");
  return `GG2050-NEWS-${sha256(Buffer.from(item.url)).slice(0, 16).toUpperCase()}`;
}

async function compileNews(news, cacheIdentity, trustedContract) {
  assert.equal(news.schema, "globalgrid2050.major-project-news.v9.5.1");
  assert.equal(news.release, "9.5.1");
  assert.equal(news.all_items.length, 133);
  assert.equal(news.canonical_items.length, 45);
  assert.equal(news.all_headline_count, 133);
  assert.equal(news.relevant_headline_count, 45);
  assert.equal(news.v9_4_baseline_headline_count, 125);
  assert.ok(news.canonical_items.every(canonicalItem));
  assert.equal(news.beacon_fen_contract?.repd_ref, "13599");
  assert.equal(news.beacon_fen_contract?.official_capacity_mw, 400);
  assert.equal(trustedContract.schema, "globalgrid2050.uk-renewables.release.v9.6.2");
  assert.equal(trustedContract.release, "9.6.2");
  assert.equal(trustedContract.expected.all_headline_count, news.all_headline_count);
  assert.equal(trustedContract.expected.uk_headline_count, news.relevant_headline_count);
  assert.equal(trustedContract.expected.beacon_fen_repd_ref, news.beacon_fen_contract.repd_ref);

  const module = await import(pathToFileURL(absolute(INPUTS.newsRegions)).href);
  const counts = { all: 133, uk: 45, international: 0, us: 0, europe: 0, other: 0 };
  const rows = news.all_items.map((item) => {
    const regional = module.classifyInternationalV9_6_2(item);
    if (regional) {
      counts.international += 1;
      if (regional.region === "US") counts.us += 1;
      else if (regional.region === "EUROPE") counts.europe += 1;
      else counts.other += 1;
    }
    return [
      stableArticleId(item),
      item.repd_ref || "",
      item.gg_project_id || "",
      item.canonical_project || item.project || "",
      item.canonical_technology || item.technology || "",
      item.canonical_capacity_mw ?? item.capacity_mw ?? null,
      item.operator || "",
      item.county || "",
      item.country || "",
      item.event || "PROJECT UPDATE",
      item.headline || "",
      item.published || "",
      item.source || "",
      item.url || "",
      Number(item.confidence || 0),
      item.canonical_relevant === true,
      item.role || "",
      item.eligible_for_news_signal === true,
      regional?.region || "",
      regional?.technology || "",
      regional?.evidence || "",
    ];
  });
  assert.equal(new Set(rows.map((row) => row[0])).size, rows.length, "compiled news IDs must be unique");
  const expectedCounts = {
    all: trustedContract.expected.all_headline_count,
    uk: trustedContract.expected.uk_headline_count,
    international: trustedContract.expected.international_headline_count,
    us: trustedContract.expected.us_headline_count,
    europe: trustedContract.expected.europe_headline_count,
    other: trustedContract.expected.international_other_headline_count,
  };
  assert.deepEqual(counts, expectedCounts);
  return {
    payload: { schema: NEWS_SCHEMA, generation: GENERATION, cache_identity: cacheIdentity, fields: NEWS_FIELDS, rows },
    counts,
    signals: compileSignals(news.canonical_items),
  };
}

function rewriteHtml(template) {
  const oldStyles = [
    "styles/v7.css?v=9.6.2",
    "styles/mobile.css?v=9.6.2",
    "styles/v9-3.css?v=9.6.2",
    "styles/v9-4.css?v=9.6.2",
    "styles/v9-5-1.css?v=9.6.2",
    "styles/v9-6-1.css?v=9.6.2",
  ];
  let source = template;
  source = replaceExactly(source, `<link rel="stylesheet" href="${oldStyles[0]}">`, `<link rel="stylesheet" href="styles/${GENERATION}-v8-fast.css">`);
  for (const oldStyle of oldStyles.slice(1)) source = replaceExactly(source, `\n  <link rel="stylesheet" href="${oldStyle}">`, "");
  source = replaceExactly(source, '\n  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>', "");
  source = replaceExactly(source, '\n  <script type="module" src="scripts/app-v9-6-2.js?v=9.6.2"></script>\n  <script type="module" src="scripts/plugins/capacity-presentation-v9-3.js?v=9.6.2"></script>', `\n  <script type="module" src="javascript/${GENERATION}-v8-fast-runtime.js"></script>`);
  source = source.replaceAll("V9.6.2", "V8 FAST CANDIDATE");
  source = replaceExactly(source, "V8 FAST CANDIDATE LIVE VALIDATED", "V8 FAST CANDIDATE · NOT DEPLOYED");
  source = replaceExactly(source, "V8 FAST CANDIDATE · UK + INTERNATIONAL NEWS · LIVE VALIDATED · 24 August 2026", "V8 FAST CANDIDATE · UK + INTERNATIONAL NEWS · BUILD VERIFIED · NOT DEPLOYED");
  const navigation = [
    ["../v9.6.1/", "https://globalgrid2050.com/uk_renewables_pipeline/v9.6.1/"],
    ["../v9.6/", "https://globalgrid2050.com/uk_renewables_pipeline/v9.6/"],
    ["../v9.5.1/", "https://globalgrid2050.com/uk_renewables_pipeline/v9.5.1/"],
    ["../v9.5/", "https://globalgrid2050.com/uk_renewables_pipeline/v9.5/"],
    ["../v9.4/", "https://globalgrid2050.com/uk_renewables_pipeline/v9.4/"],
    ["../v9/", "https://globalgrid2050.com/uk_renewables_pipeline/v9/"],
    ["../v8/", "https://globalgrid2050.com/uk_renewables_pipeline/v8/"],
    ["../v7/", "https://globalgrid2050.com/uk_renewables_pipeline/v7/"],
    ["../dashboard_v6_live.html", "https://globalgrid2050.com/uk_renewables_pipeline/dashboard_v6_live.html"],
    ["../dashboard_v5_live.html", "https://globalgrid2050.com/uk_renewables_pipeline/dashboard_v5_live.html"],
    ["../dashboard_v4_live.html", "https://globalgrid2050.com/uk_renewables_pipeline/dashboard_v4_live.html"],
    ["../dashboard_v3_live_2026-08-22.html", "https://globalgrid2050.com/uk_renewables_pipeline/dashboard_v3_live_2026-08-22.html"],
    ["../dashboard_v2_2026-08-22.html", "https://globalgrid2050.com/uk_renewables_pipeline/dashboard_v2_2026-08-22.html"],
    ["../dashboard.html", "https://globalgrid2050.com/uk_renewables_pipeline/dashboard.html"],
    ["../../index.html", "https://globalgrid2050.com/"],
    ["../../repd_grid_atlasv8/", "https://ventusltd.github.io/gridatlas/202608300453-atlas-v9/"],
  ];
  for (const [from, to] of navigation) source = replaceExactly(source, from, to);
  source = replaceExactly(source, "<body>", `<body data-fast-generation="${GENERATION}">`);
  source = replaceExactly(source, "Loading canonical release contract…", "Loading compact canonical project index…");
  return `${source.trimEnd()}\n`;
}

async function build() {
  assert.equal(path.basename(fileURLToPath(import.meta.url)), COMPILER_FILE);
  const sourceCommit = process.env.SOURCE_COMMIT;
  const runId = process.env.GITHUB_RUN_ID;
  assert.match(sourceCommit || "", /^[a-f0-9]{40}$/u, "SOURCE_COMMIT must be an exact 40-character Git SHA");
  assert.ok(runId, "GITHUB_RUN_ID is required");
  const compilerBytes = await readFile(fileURLToPath(import.meta.url));
  const compilerSha = sha256(compilerBytes);
  const inputRecords = [];

  const sourceManifestBytes = await readPinned(INPUTS.sourceManifest);
  const sourceManifest = JSON.parse(sourceManifestBytes);
  const releaseContractBytes = await readPinned(INPUTS.releaseContract);
  const releaseContract = JSON.parse(releaseContractBytes);
  const trustedContractBytes = await readPinned(INPUTS.trustedContract);
  const trustedContract = JSON.parse(trustedContractBytes);
  const newsBytes = await readPinned(INPUTS.news);
  const news = JSON.parse(newsBytes);
  for (const inputPath of [INPUTS.sourceManifest, INPUTS.releaseContract, INPUTS.trustedContract, INPUTS.news, INPUTS.newsRegions, INPUTS.utils, INPUTS.vendor, INPUTS.template, INPUTS.runtime, INPUTS.overrideStyle, ...INPUTS.styles]) {
    const bytes = await readPinned(inputPath);
    inputRecords.push({ path: inputPath, bytes: bytes.length, sha256: sha256(bytes) });
  }

  const { projects, detailPartitions } = await loadProjects(sourceManifest, inputRecords);
  const totals = validateProjects(projects, releaseContract, sourceManifest);
  assert.equal(totals.project_count, trustedContract.expected.project_count);
  assert.equal(totals.capacity_mw, trustedContract.expected.capacity_mw);
  const cacheContract = {
    schema: "pipelinenews.v8.fast-cache-contract.v1",
    compiler_method: COMPILER_METHOD,
    compiler: { path: `index/${COMPILER_FILE}`, sha256: compilerSha },
    sources: {
      project_manifest_sha256: sha256(sourceManifestBytes),
      release_contract_sha256: sha256(releaseContractBytes),
      trusted_v9_6_2_contract_sha256: sha256(trustedContractBytes),
      news_sha256: sha256(newsBytes),
    },
    project_index: { schema: PROJECT_SCHEMA, fields: PROJECT_FIELDS, dictionary_fields: DICTIONARY_FIELDS, stable_key: "repd_ref", detail_locator: "floor(global_row_index/500)" },
    search_index: { schema: SEARCH_SCHEMA, row_alignment: "global_project_row_index", activation: "first-nonempty-search" },
    news_index: { schema: NEWS_SCHEMA, fields: NEWS_FIELDS, stable_key: "gg_article_id", activation: "idle-after-core-ready" },
    runtime: { physical_project_rows: 50, physical_news_rows: 30, detail_fetch_concurrency: 4, immutable_cache_mode: "force-cache" },
  };
  const cacheIdentity = sha256(Buffer.from(JSON.stringify(cacheContract)));
  const cachePrefix = cacheIdentity.slice(0, 12);

  const projectPayload = compileProjects(projects, cacheIdentity);
  const searchPayload = { schema: SEARCH_SCHEMA, generation: GENERATION, cache_identity: cacheIdentity, row_alignment: "global_project_row_index", rows: projects.map(searchText) };
  const compiledNews = await compileNews(news, cacheIdentity, trustedContract);
  const projectBytes = jsonBytes(projectPayload);
  const searchBytes = jsonBytes(searchPayload);
  const compiledNewsBytes = jsonBytes(compiledNews.payload);
  assert.ok(projectBytes.length <= 1_310_720, `compact project index is ${projectBytes.length} bytes`);

  const projectFile = `${GENERATION}-${cachePrefix}-v8-fast-projects.json`;
  const searchFile = `${GENERATION}-${cachePrefix}-v8-fast-search.json`;
  const newsFile = `${GENERATION}-${cachePrefix}-v8-fast-news.json`;
  const registry = {
    schema: "pipelinenews.v8.fast-registry.v1",
    generation: GENERATION,
    compiler_method: COMPILER_METHOD,
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    lifecycle: ["WAIT", "QUEUED", "LOAD", "INDEX", "OK", "EMPTY", "FAIL"],
    totals,
    news_counts: compiledNews.counts,
    signals: compiledNews.signals,
    assets: {
      projects: { path: `data/${projectFile}`, schema: PROJECT_SCHEMA, sha256: sha256(projectBytes), bytes: projectBytes.length, activation: "boot" },
      search: { path: `data/${searchFile}`, schema: SEARCH_SCHEMA, sha256: sha256(searchBytes), bytes: searchBytes.length, activation: "first-nonempty-search" },
      news: { path: `data/${newsFile}`, schema: NEWS_SCHEMA, sha256: sha256(compiledNewsBytes), bytes: compiledNewsBytes.length, activation: "idle-after-core-ready" },
      chart: { path: `vendor/${BASE_GENERATION}-chart-umd.min.js`, sha256: PINNED_SHA256[INPUTS.vendor], bytes: (await readPinned(INPUTS.vendor)).length, activation: "idle-after-core-ready" },
    },
    detail_schema: "globalgrid2050.v9.project-partition.v9.1",
    detail_partition_size: 500,
    detail_partitions: detailPartitions,
    source: {
      dataset: sourceManifest.source_dataset,
      source_record_count: sourceManifest.source_record_count,
      projects_sha256: sourceManifest.projects_sha256,
      identity_sha256: sourceManifest.source_identity_sha256,
      coordinate_fixture_sha256: sourceManifest.source_coordinate_fixture_sha256,
      workbook_sha256: sourceManifest.source_workbook_sha256,
      admitted_project_count: 7680,
      candidate_delta: { count: 23, status: "held-fail-closed" },
    },
    performance: {
      maximum_physical_project_rows: 50,
      maximum_physical_news_rows: 30,
      maximum_dom_elements: 5000,
      maximum_initial_decoded_bytes: 2_000_000,
      maximum_mobile_interaction_ms: 200,
      maximum_desktop_interaction_ms: 100,
      maximum_ordinary_long_task_ms: 200,
      maximum_detail_fetch_concurrency: 4,
    },
    companies_house: "deferred-phase-two",
    deployment: "not-authorised",
  };
  const registryBytes = jsonBytes(registry, true);

  let runtimeSource = replaceExactly(await readPinned(INPUTS.runtime, "utf8"), "__FAST_GENERATION__", GENERATION);
  runtimeSource = replaceExactly(runtimeSource, "__FAST_COMPILER_METHOD__", COMPILER_METHOD);
  runtimeSource = replaceExactly(runtimeSource, "__FAST_CACHE_IDENTITY__", cacheIdentity);
  assert.ok(!/cache:\s*["']no-(?:store|cache)["']/.test(runtimeSource));
  assert.ok(!runtimeSource.includes("Date.now()"));
  assert.ok(runtimeSource.includes('cache: "force-cache"'));
  const runtimeBytes = Buffer.from(runtimeSource);
  const styleParts = [];
  for (const stylePath of [...INPUTS.styles, INPUTS.overrideStyle]) styleParts.push(`/* ${stylePath} */\n${(await readPinned(stylePath, "utf8")).trim()}\n`);
  const styleBytes = Buffer.from(styleParts.join("\n"));
  const htmlBytes = Buffer.from(rewriteHtml(await readPinned(INPUTS.template, "utf8")));

  const outputs = new Map([
    [`releases/${GENERATION}-v8-fast-candidate.html`, htmlBytes],
    [`releases/javascript/${GENERATION}-v8-fast-runtime.js`, runtimeBytes],
    [`releases/styles/${GENERATION}-v8-fast.css`, styleBytes],
    [`releases/data/${projectFile}`, projectBytes],
    [`releases/data/${searchFile}`, searchBytes],
    [`releases/data/${newsFile}`, compiledNewsBytes],
    [`releases/data/${GENERATION}-v8-fast-registry.json`, registryBytes],
  ]);
  const outputRecords = [...outputs.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([outputPath, bytes]) => ({ path: outputPath, bytes: bytes.length, sha256: sha256(bytes) }));
  const criticalPaths = new Set([
    `releases/${GENERATION}-v8-fast-candidate.html`,
    `releases/javascript/${GENERATION}-v8-fast-runtime.js`,
    `releases/styles/${GENERATION}-v8-fast.css`,
    `releases/data/${projectFile}`,
    `releases/data/${GENERATION}-v8-fast-registry.json`,
  ]);
  const initialDecodedBytes = outputRecords.filter((record) => criticalPaths.has(record.path)).reduce((sum, record) => sum + record.bytes, 0);
  assert.ok(initialDecodedBytes <= 2_000_000, `initial decoded closure is ${initialDecodedBytes} bytes`);
  const manifest = {
    schema: "pipelinenews.v8.fast-site-candidate.v1",
    generation: GENERATION,
    source_commit: sourceCommit,
    github_run_id: runId,
    compiler: { path: `index/${COMPILER_FILE}`, method: COMPILER_METHOD, sha256: compilerSha },
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    trusted_parent: { repository: "Ventusltd/globalgrid2050", release: "V9.6.2", tree: "99d3b5d80be77b43c9819a571f468913e6132d07", contract: INPUTS.trustedContract, contract_sha256: sha256(trustedContractBytes) },
    parity: { ...totals, headlines: 133, canonical_headlines: 45, international_headlines: 19, beacon_fen_repd_ref: "13599" },
    performance_contract: { ...registry.performance, initial_decoded_bytes: initialDecodedBytes, project_index_bytes: projectBytes.length },
    discipline: { source_mutation: false, immutable_outputs: true, bounded_dom: true, bounded_detail_fetches: true, full_data_copied: false, deployment_separate: true },
    inputs: inputRecords.sort((left, right) => left.path.localeCompare(right.path)),
    outputs: outputRecords,
    evidence: "workflow-artifact-only",
    companies_house: "deferred-phase-two",
    deployment: "not-authorised",
  };
  const manifestPath = `build/${GENERATION}-v8-fast-site-manifest.json`;
  outputs.set(manifestPath, jsonBytes(manifest, true));
  return { outputs, manifestPath, manifest };
}

async function writeOutputs(outRoot, outputs) {
  for (const outputPath of outputs.keys()) {
    const target = path.resolve(outRoot, outputPath);
    assert.ok(target.startsWith(`${outRoot}${path.sep}`), `output escapes root: ${outputPath}`);
    try {
      await access(target, constants.F_OK);
      assert.fail(`immutable output already exists: ${outputPath}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  for (const [outputPath, content] of outputs) {
    const target = path.resolve(outRoot, outputPath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, { flag: "wx" });
  }
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function main() {
  const requestedRoot = argument("--out-root");
  assert.ok(requestedRoot, "--out-root is required");
  const outRoot = path.resolve(REPOSITORY_ROOT, requestedRoot);
  const { outputs, manifestPath, manifest } = await build();
  await mkdir(outRoot, { recursive: true });
  await writeOutputs(outRoot, outputs);
  process.stdout.write(`${JSON.stringify({
    generation: GENERATION,
    compiler_method: COMPILER_METHOD,
    cache_identity: manifest.cache_identity,
    output_files: outputs.size,
    manifest: manifestPath,
    project_count: manifest.parity.project_count,
    capacity_mw: manifest.parity.capacity_mw,
    initial_decoded_bytes: manifest.performance_contract.initial_decoded_bytes,
    deployment: manifest.deployment,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
