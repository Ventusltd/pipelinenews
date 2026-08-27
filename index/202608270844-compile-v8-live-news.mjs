import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const GENERATION = "202608270844";
const BASE_GENERATION = "202608270055";
const PROTECTED_PARENT = "77bda8c3809d02550d06a1c4154315f56d1120fb";
const COMPILER_FILE = `${GENERATION}-compile-v8-live-news.mjs`;
const COMPILER_METHOD = "pipelinenews-v8-live-news-discovery-reuse-fast-spine-v1";
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_SCHEMA = "pipelinenews.v8.live-news-registry.v1";
const NEWS_SCHEMA = "pipelinenews.v8.live-news-index.v1";

const INPUTS = Object.freeze({
  parentManifest: "build/202608270055-v8-fast-site-manifest.json",
  parentRegistry: "releases/data/202608270055-v8-fast-registry.json",
  parentProjects: "releases/data/202608270055-8ab1807551bc-v8-fast-projects.json",
  parentSearch: "releases/data/202608270055-8ab1807551bc-v8-fast-search.json",
  parentNews: "releases/data/202608270055-8ab1807551bc-v8-fast-news.json",
  parentHtml: "releases/202608270055-v8-fast-candidate.html",
  parentStyle: "releases/styles/202608270055-v8-fast.css",
  projectSourceManifest: "data/manifests/202608261927-build-manifest-v9-1.json",
  runtime: "ui/javascript/202608270844-v8-live-news-runtime.js",
  contract: "data/news-discovery/202608270844-live-news-discovery-contract.json",
  evidence: "data/news-discovery/202608270844-bbc-live-news-evidence.json",
  discoveryRunner: "discovery/javascript/202608270844-live-news-runner.mjs",
  bbcEnrichment: "discovery/javascript/202608270844-bbc-enrichment.mjs",
});

const PINNED_SHA256 = Object.freeze({
  "build/202608270055-v8-fast-site-manifest.json": "48483afade72813649d9168bb27723a9bca3ba4f81a8d8e5983946a381999601",
  "releases/data/202608270055-v8-fast-registry.json": "cc69f0261acaf5fdb59ab1566a20c5b54eef12a0df6eec387bd05607889c5955",
  "releases/data/202608270055-8ab1807551bc-v8-fast-projects.json": "c06aedef176d2d38fd135806306a8ef81b4af9994c7be31e8bd760304149f862",
  "releases/data/202608270055-8ab1807551bc-v8-fast-search.json": "a1cbfc5202b717889a471409e850ea5cae13626f91c60f08cda0b06da5102b65",
  "releases/data/202608270055-8ab1807551bc-v8-fast-news.json": "cfca3ab92012022f752de887a47d5eb2b3632ebad0f89d28ba5df2fcb454d194",
  "releases/202608270055-v8-fast-candidate.html": "0734655081d1f4ccd79f4af6a5d1b71e924ecea5ef33b5c3aa9f25de7bfdb7c5",
  "releases/styles/202608270055-v8-fast.css": "d6c8100dbf79dd02f65d78e4fc9cacae92f2e4b5a749ea0fd3ff481fe5bb4792",
  "data/manifests/202608261927-build-manifest-v9-1.json": "67976a1bbcaf383ed7121b13060db3b864db9ce33dfc721a88b59c8ca8b8e06c",
  "ui/javascript/202608270844-v8-live-news-runtime.js": "0d68150c5985bd28ba89a9b120e73b48114ce4b92fc0c1273174bcd38c9dd407",
  "data/news-discovery/202608270844-live-news-discovery-contract.json": "e53585a7d0a516c71e5861d5feb08dccdedcae0e59bf06c7e4e342aaed7fb60e",
  "data/news-discovery/202608270844-bbc-live-news-evidence.json": "f1587147a7988d0d4c9d49f78607a1a255dde45baa49afefd997aa3c46eb4634",
  "discovery/javascript/202608270844-live-news-runner.mjs": "774577c441c72c41bf90cbf1a70f7c9d8ae2c8e767204dc154354a02caaeaa92",
  "discovery/javascript/202608270844-bbc-enrichment.mjs": "c3254d78d346c4aa4179083f87bc67ed5733b929a3c80e22535d9706a9071787",
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
  regionalTechnology: 19,
  regionalEvidence: 20,
  eventDetail: 21,
  relationship: 22,
  relatedContextRepdRef: 23,
  relatedContextProject: 24,
  bindingLabel: 25,
  relatedComponents: 26,
  evidenceSnippet: 27,
});

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

function stableArticleId(url) {
  return `GG2050-NEWS-${sha256(Buffer.from(url)).slice(0, 16).toUpperCase()}`;
}

function projectMap(payload) {
  assert.equal(payload.schema, "pipelinenews.v8.fast-project-index.v1");
  assert.equal(payload.generation, BASE_GENERATION);
  assert.equal(payload.rows.length, 7680);
  const fields = Object.fromEntries(payload.fields.map((field, index) => [field, index]));
  const dictionaries = payload.dictionaries;
  const result = new Map();
  for (const row of payload.rows) {
    const ref = String(row[fields.repd_ref]);
    result.set(ref, {
      repd_ref: ref,
      gg_project_id: row[fields.gg_project_id],
      name: row[fields.name],
      technology: dictionaries.technology[row[fields.technology]],
      capacity_mw: Number(row[fields.capacity_mw]),
      county: dictionaries.county[row[fields.county]],
      region: dictionaries.region[row[fields.region]],
      operator: dictionaries.operator[row[fields.operator]],
    });
  }
  return result;
}

async function loadAuthoritativeProjects(sourceManifest, inputRecords) {
  assert.equal(sourceManifest.schema, "globalgrid2050.v9.project-spine-build.v9.1");
  assert.equal(sourceManifest.project_count, 7680);
  assert.equal(sourceManifest.capacity_mw, 356474.09);
  assert.equal(sourceManifest.project_partitions.length, 16);
  const projects = new Map();
  let capacity = 0;
  for (let index = 0; index < sourceManifest.project_partitions.length; index += 1) {
    const declaration = sourceManifest.project_partitions[index];
    const relativePath = `data/projects/202608261927-project-partition-v9-1-${String(index + 1).padStart(2, "0")}.json`;
    const bytes = await readFile(absolute(relativePath));
    assert.equal(sha256(bytes), declaration.sha256, `project partition hash changed: ${index + 1}`);
    const payload = JSON.parse(bytes);
    assert.equal(payload.schema, "globalgrid2050.v9.project-partition.v9.1");
    assert.equal(payload.record_count, declaration.record_count);
    assert.equal(payload.projects.length, declaration.record_count);
    for (const project of payload.projects) {
      const ref = String(project.repd_ref);
      assert.ok(!projects.has(ref), `duplicate authoritative REPD Ref ${ref}`);
      projects.set(ref, project);
      capacity += Number(project.capacity_mw);
    }
    inputRecords.push({ path: relativePath, bytes: bytes.length, sha256: sha256(bytes) });
  }
  assert.equal(projects.size, 7680);
  assert.equal(Math.round(capacity * 100) / 100, 356474.09);
  assert.equal(projects.has("20670"), false, "unknown-capacity East Pye BESS must remain relationship-only");
  return projects;
}

function evidenceSnippet(item) {
  const snippets = Array.isArray(item.bounded_evidence_snippets) ? item.bounded_evidence_snippets : [];
  const related = snippets.find((snippet) => item.binding?.role === "RELATED_MENTION" && /Beacon Fen/u.test(snippet));
  const selected = String(related || snippets[0] || "");
  assert.ok(selected.length <= 300, `evidence snippet exceeds 300 characters: ${item.gg_article_id}`);
  return selected;
}

function itemToRow(item) {
  const binding = item.binding;
  assert.ok(binding && typeof binding === "object");
  assert.equal(item.gg_article_id, stableArticleId(item.url), `stable article ID changed: ${item.url}`);
  const published = String(item.published_at || "").slice(0, 10);
  return [
    item.gg_article_id,
    binding.repd_ref || "",
    binding.gg_project_id || "",
    binding.project || "",
    binding.technology || item.compact_metadata?.technology || "",
    binding.official_capacity_mw ?? null,
    binding.operator || "",
    binding.county || item.compact_metadata?.county || "",
    binding.country || item.compact_metadata?.country || "",
    binding.event || "PROJECT UPDATE",
    item.headline || "",
    published,
    item.source || "BBC News",
    item.url,
    Number(binding.confidence || 0),
    binding.canonical_relevant === true,
    binding.role || "",
    binding.eligible_for_news_signal === true,
    "",
    "",
    "",
    binding.event_detail || "",
    binding.relationship || "",
    binding.related_context_repd_ref || "",
    binding.related_context_project || "",
    binding.binding_label || "",
    Array.isArray(binding.related_components) ? binding.related_components : [],
    evidenceSnippet(item),
  ];
}

function canonicalRow(row) {
  return row[NEWS.role] === "PRIMARY_MATCH"
    && row[NEWS.eligible] === true
    && String(row[NEWS.repdRef] || "")
    && row[NEWS.projectId] === `GG2050-REPD-${row[NEWS.repdRef]}`;
}

function compileSignals(rows) {
  const best = new Map();
  for (const row of rows.filter(canonicalRow)) {
    const ref = String(row[NEWS.repdRef]);
    const previous = best.get(ref);
    const confidence = Number(row[NEWS.confidence] || 0);
    const previousConfidence = previous ? Number(previous[NEWS.confidence] || 0) : -1;
    const published = Date.parse(String(row[NEWS.published] || "")) || 0;
    const previousPublished = previous ? Date.parse(String(previous[NEWS.published] || "")) || 0 : 0;
    if (!previous || confidence > previousConfidence || (confidence === previousConfidence && published > previousPublished)) {
      best.set(ref, row);
    }
  }
  return Object.fromEntries([...best].sort(([left], [right]) => left.localeCompare(right)).map(([ref, row]) => [
    ref,
    [String(row[NEWS.event] || "PROJECT UPDATE").toUpperCase(), Number(row[NEWS.confidence] || 0), row[NEWS.published] || "date unavailable"],
  ]));
}

function validateSuccessorRows(rows) {
  assert.equal(rows.length, 136);
  assert.equal(new Set(rows.map((row) => row[NEWS.articleId])).size, 136, "compiled news IDs must be unique");
  assert.ok(rows.every((row) => row.length === NEWS_FIELDS.length), "compiled news row width changed");
  assert.equal(rows.filter((row) => row[NEWS.canonical] === true).length, 47);
  assert.equal(rows.filter((row) => row[NEWS.role] === "PRIMARY_MATCH" && row[NEWS.articleId].startsWith("GG2050-NEWS-")).length >= 47, true);

  const byId = new Map(rows.map((row) => [row[NEWS.articleId], row]));
  const east = byId.get("GG2050-NEWS-B4B91FD3DA8F596C");
  assert.equal(east[NEWS.repdRef], "17494");
  assert.equal(east[NEWS.event], "PROJECT UPDATE");
  assert.notEqual(east[NEWS.event], "FINANCIAL CLOSE");
  assert.deepEqual(east[NEWS.relatedComponents], [{
    role: "RELATED_DEVELOPMENT",
    repd_ref: "20670",
    gg_project_id: "GG2050-REPD-20670",
    project: "East Pye Solar Farm",
    technology: "bess",
    official_capacity_mw: null,
    eligible_for_news_signal: false,
  }]);

  const beacon = byId.get("GG2050-NEWS-C3D0A5910F32E821");
  assert.equal(beacon[NEWS.repdRef], "13599");
  assert.equal(beacon[NEWS.event], "PROJECT UPDATE");
  assert.equal(beacon[NEWS.eventDetail], "POTENTIAL_LEGAL_CHALLENGE_TO_CONSENT");
  assert.equal(beacon[NEWS.relatedComponents][0]?.repd_ref, "13600");
  assert.equal(beacon[NEWS.relatedComponents][0]?.official_capacity_mw, 600);
  assert.equal(beacon[NEWS.relatedComponents][0]?.eligible_for_news_signal, false);

  const windsock = byId.get("GG2050-NEWS-0E813A86D54E39FC");
  assert.equal(windsock[NEWS.project], "Windsock Solar Farm");
  assert.equal(windsock[NEWS.repdRef], "");
  assert.equal(windsock[NEWS.projectId], "");
  assert.equal(windsock[NEWS.role], "RELATED_MENTION");
  assert.equal(windsock[NEWS.relationship], "EDITORIAL_CONTEXT");
  assert.equal(windsock[NEWS.relatedContextRepdRef], "13599");
  assert.equal(windsock[NEWS.bindingLabel], "RELATED CONTEXT ONLY — NOT A PROJECT BINDING");
  assert.equal(windsock[NEWS.eligible], false);
}

function rewriteHtml(parentHtml) {
  let source = parentHtml;
  source = replaceExactly(source, 'data-fast-generation="202608270055"', `data-fast-generation="${GENERATION}"`);
  source = replaceExactly(source, "javascript/202608270055-v8-fast-runtime.js", `javascript/${GENERATION}-v8-fast-runtime.js`);
  source = replaceExactly(source, "● 133 HEADLINES · 45 UK · 19 INTERNATIONAL · FULL ≥1 MW", "● 136 HEADLINES · 47 UK · 19 INTERNATIONAL · FULL ≥1 MW");
  source = source.replaceAll("V8 FAST CANDIDATE", "LIVE NEWS DISCOVERY CANDIDATE");
  assert.ok(source.includes("NOT DEPLOYED"));
  assert.ok(source.includes("styles/202608270055-v8-fast.css"), "trusted fast stylesheet must be reused");
  return `${source.trimEnd()}\n`;
}

async function build() {
  assert.equal(path.basename(fileURLToPath(import.meta.url)), COMPILER_FILE);
  const sourceCommit = process.env.SOURCE_COMMIT;
  const runId = process.env.GITHUB_RUN_ID;
  assert.match(sourceCommit || "", /^[a-f0-9]{40}$/u, "SOURCE_COMMIT must be an exact 40-character Git SHA");
  assert.ok(runId && /^\d+$/u.test(runId), "GITHUB_RUN_ID must be numeric");

  const compilerBytes = await readFile(fileURLToPath(import.meta.url));
  const compilerSha = sha256(compilerBytes);
  const inputs = {};
  const inputRecords = [];
  for (const [name, relativePath] of Object.entries(INPUTS)) {
    const bytes = await readPinned(relativePath);
    inputs[name] = bytes;
    inputRecords.push({ path: relativePath, bytes: bytes.length, sha256: sha256(bytes) });
  }

  const parentManifest = JSON.parse(inputs.parentManifest);
  const parentRegistry = JSON.parse(inputs.parentRegistry);
  const parentProjects = JSON.parse(inputs.parentProjects);
  const parentSearch = JSON.parse(inputs.parentSearch);
  const parentNews = JSON.parse(inputs.parentNews);
  const projectSourceManifest = JSON.parse(inputs.projectSourceManifest);
  const contract = JSON.parse(inputs.contract);
  const evidence = JSON.parse(inputs.evidence);

  assert.equal(parentManifest.schema, "pipelinenews.v8.fast-site-candidate.v1");
  assert.equal(parentManifest.generation, BASE_GENERATION);
  assert.equal(parentManifest.deployment, "not-authorised");
  assert.equal(parentRegistry.schema, "pipelinenews.v8.fast-registry.v1");
  assert.equal(parentRegistry.generation, BASE_GENERATION);
  assert.equal(parentRegistry.deployment, "not-authorised");
  assert.equal(parentRegistry.totals.project_count, 7680);
  assert.equal(parentRegistry.totals.capacity_mw, 356474.09);
  assert.deepEqual(parentRegistry.news_counts, { all: 133, uk: 45, international: 19, us: 4, europe: 9, other: 6 });
  assert.equal(parentSearch.schema, "pipelinenews.v8.fast-search-index.v1");
  assert.equal(parentSearch.rows.length, 7680);
  assert.equal(parentNews.schema, "pipelinenews.v8.fast-news-index.v1");
  assert.deepEqual(parentNews.fields, BASE_NEWS_FIELDS);
  assert.equal(parentNews.rows.length, 133);
  assert.equal(contract.generation, GENERATION);
  assert.equal(contract.protected_parent, PROTECTED_PARENT);
  assert.equal(contract.rollback_generation, BASE_GENERATION);
  assert.equal(contract.deployment, "not-authorised");
  assert.equal(evidence.generation, GENERATION);
  assert.equal(evidence.records.length, 3);

  const compactProjects = projectMap(parentProjects);
  assert.equal(compactProjects.size, 7680);
  const projects = await loadAuthoritativeProjects(projectSourceManifest, inputRecords);
  for (const ref of ["17494", "13599", "13600"]) {
    assert.equal(compactProjects.get(ref)?.gg_project_id, projects.get(ref)?.gg_project_id, `compact/authoritative project mismatch: ${ref}`);
  }
  const discovery = await import(pathToFileURL(absolute(INPUTS.discoveryRunner)).href);
  assert.equal(typeof discovery.approvedEvidenceToNewsItems, "function", "discovery runner conversion export missing");
  const approved = discovery.approvedEvidenceToNewsItems({ evidence, contract, projectByRef: projects });
  assert.equal(approved.length, 3);
  const approvedById = new Map(approved.map((item) => [item.gg_article_id, item]));
  const records = evidence.records.map((record) => {
    const approvedRecord = approvedById.get(record.gg_article_id);
    assert.ok(approvedRecord, `approved discovery record missing: ${record.gg_article_id}`);
    return { ...record, ...approvedRecord, binding: { ...record.binding, ...approvedRecord.binding } };
  });

  const rows = [
    ...parentNews.rows.map((row) => [...row, "", "", "", "", "", [], ""]),
    ...records.map(itemToRow),
  ];
  validateSuccessorRows(rows);
  const signals = compileSignals(rows);
  assert.deepEqual(signals["17494"], ["PROJECT UPDATE", 100, "2026-08-25"]);
  assert.deepEqual(signals["13599"], ["PROJECT UPDATE", 100, "2026-08-24"]);

  const cacheContract = {
    schema: "pipelinenews.v8.live-news-cache-contract.v1",
    compiler_method: COMPILER_METHOD,
    compiler: { path: `index/${COMPILER_FILE}`, sha256: compilerSha },
    protected_parent: PROTECTED_PARENT,
    rollback_generation: BASE_GENERATION,
    sources: {
      parent_manifest_sha256: sha256(inputs.parentManifest),
      parent_registry_sha256: sha256(inputs.parentRegistry),
      parent_news_sha256: sha256(inputs.parentNews),
      discovery_contract_sha256: sha256(inputs.contract),
      bbc_evidence_sha256: sha256(inputs.evidence),
      discovery_runner_sha256: sha256(inputs.discoveryRunner),
      bbc_enrichment_sha256: sha256(inputs.bbcEnrichment),
      project_source_manifest_sha256: sha256(inputs.projectSourceManifest),
    },
    project_index: parentRegistry.cache_contract.project_index,
    search_index: parentRegistry.cache_contract.search_index,
    news_index: { schema: NEWS_SCHEMA, fields: NEWS_FIELDS, stable_key: "gg_article_id", activation: "idle-after-core-ready" },
    runtime: parentRegistry.cache_contract.runtime,
    reuse: {
      project_generation: BASE_GENERATION,
      search_generation: BASE_GENERATION,
      style_generation: BASE_GENERATION,
      detail_generation: "202608261927",
    },
  };
  const cacheIdentity = sha256(Buffer.from(JSON.stringify(cacheContract)));
  const cachePrefix = cacheIdentity.slice(0, 12);
  const newsPayload = {
    schema: NEWS_SCHEMA,
    generation: GENERATION,
    cache_identity: cacheIdentity,
    fields: NEWS_FIELDS,
    rows,
  };
  const newsBytes = jsonBytes(newsPayload);
  const newsFile = `${GENERATION}-${cachePrefix}-v8-fast-news.json`;

  const registry = {
    schema: REGISTRY_SCHEMA,
    generation: GENERATION,
    name: "Live News Discovery",
    compiler_method: COMPILER_METHOD,
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    lifecycle: parentRegistry.lifecycle,
    totals: parentRegistry.totals,
    news_counts: { all: 136, uk: 47, international: 19, us: 4, europe: 9, other: 6 },
    signals,
    assets: {
      projects: {
        ...parentRegistry.assets.projects,
        generation: BASE_GENERATION,
        cache_identity: parentRegistry.cache_identity,
      },
      search: {
        ...parentRegistry.assets.search,
        generation: BASE_GENERATION,
        cache_identity: parentRegistry.cache_identity,
      },
      news: {
        path: `data/${newsFile}`,
        schema: NEWS_SCHEMA,
        sha256: sha256(newsBytes),
        bytes: newsBytes.length,
        activation: "idle-after-core-ready",
        generation: GENERATION,
        cache_identity: cacheIdentity,
      },
      chart: parentRegistry.assets.chart,
      style: {
        path: `styles/${BASE_GENERATION}-v8-fast.css`,
        sha256: PINNED_SHA256[INPUTS.parentStyle],
        bytes: inputs.parentStyle.length,
        activation: "boot",
        generation: BASE_GENERATION,
      },
    },
    detail_schema: parentRegistry.detail_schema,
    detail_partition_size: parentRegistry.detail_partition_size,
    detail_partitions: parentRegistry.detail_partitions,
    source: parentRegistry.source,
    performance: parentRegistry.performance,
    discovery: {
      added_records: 3,
      primary_matches: 2,
      related_editorial_mentions: 1,
      enrichment: "strict-bbc-one-link-layer",
      evidence: INPUTS.evidence,
      raw_html_retained: false,
      article_bodies_retained: false,
    },
    deployment: "not-authorised",
  };
  const registryBytes = jsonBytes(registry, true);

  let runtimeSource = inputs.runtime.toString("utf8");
  runtimeSource = replaceExactly(runtimeSource, "__FAST_GENERATION__", GENERATION);
  runtimeSource = replaceExactly(runtimeSource, "__FAST_COMPILER_METHOD__", COMPILER_METHOD);
  runtimeSource = replaceExactly(runtimeSource, "__FAST_CACHE_IDENTITY__", cacheIdentity);
  assert.ok(!/cache:\s*["']no-(?:store|cache)["']/.test(runtimeSource));
  assert.ok(!runtimeSource.includes("Date.now()"));
  assert.ok(runtimeSource.includes('cache: "force-cache"'));
  const runtimeBytes = Buffer.from(runtimeSource);
  const htmlBytes = Buffer.from(rewriteHtml(inputs.parentHtml.toString("utf8")));

  const outputs = new Map([
    [`releases/${GENERATION}-v8-fast-candidate.html`, htmlBytes],
    [`releases/javascript/${GENERATION}-v8-fast-runtime.js`, runtimeBytes],
    [`releases/data/${newsFile}`, newsBytes],
    [`releases/data/${GENERATION}-v8-fast-registry.json`, registryBytes],
  ]);
  const outputRecords = [...outputs.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([outputPath, bytes]) => ({ path: outputPath, bytes: bytes.length, sha256: sha256(bytes) }));
  const initialDecodedBytes = inputs.parentProjects.length + inputs.parentStyle.length + htmlBytes.length + runtimeBytes.length + registryBytes.length;
  assert.ok(initialDecodedBytes <= 2_000_000, `initial decoded closure is ${initialDecodedBytes} bytes`);

  const manifest = {
    schema: "pipelinenews.v8.fast-site-candidate.v1",
    generation: GENERATION,
    name: "Live News Discovery",
    source_commit: sourceCommit,
    github_run_id: runId,
    compiler: { path: `index/${COMPILER_FILE}`, method: COMPILER_METHOD, sha256: compilerSha },
    cache_identity: cacheIdentity,
    cache_contract: cacheContract,
    protected_parent: PROTECTED_PARENT,
    rollback_generation: BASE_GENERATION,
    parity: {
      ...parentRegistry.totals,
      headlines: 136,
      canonical_headlines: 47,
      international_headlines: 19,
      added_bbc_records: 3,
      primary_matches: 2,
      related_editorial_mentions: 1,
    },
    performance_contract: {
      ...registry.performance,
      initial_decoded_bytes: initialDecodedBytes,
      project_index_bytes: inputs.parentProjects.length,
      reused_project_index: INPUTS.parentProjects,
      reused_search_index: INPUTS.parentSearch,
    },
    discipline: {
      source_mutation: false,
      immutable_outputs: true,
      bounded_dom: true,
      bounded_detail_fetches: true,
      full_data_copied: false,
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
    name: manifest.name,
    compiler_method: COMPILER_METHOD,
    cache_identity: manifest.cache_identity,
    output_files: outputs.size,
    manifest: manifestPath,
    project_count: manifest.parity.project_count,
    capacity_mw: manifest.parity.capacity_mw,
    headlines: manifest.parity.headlines,
    canonical_headlines: manifest.parity.canonical_headlines,
    initial_decoded_bytes: manifest.performance_contract.initial_decoded_bytes,
    deployment: manifest.deployment,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
