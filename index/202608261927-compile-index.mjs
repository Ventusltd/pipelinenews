import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GENERATION = "202608261927";
const COMPILER_FILE = `${GENERATION}-compile-index.mjs`;
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_URL = `https://ventusltd.github.io/pipelinenews/releases/${GENERATION}-index.html`;

const MODULES = Object.freeze([
  ["ui/javascript/202608261557-startplugins.js", "startplugins.js"],
  ["ui/javascript/202608261630-utils.js", "utils.js"],
  ["ui/javascript/202608261632-state.js", "state.js"],
  ["ui/javascript/202608261640-filters.js", "filters.js"],
  ["ui/javascript/202608261723-capacity-presentation.js", "capacity-presentation.js"],
  ["ui/javascript/202608261725-gauges.js", "gauges.js"],
  ["ui/javascript/202608261742-news-regions.js", "news-regions.js"],
  ["ui/javascript/202608261752-canonical-projects-v9-1.js", "canonical-projects-v9-1.js"],
  ["ui/javascript/202608261754-canonical-projects-v9-5-1.js", "canonical-projects-v9-5-1.js"],
  ["ui/javascript/202608261755-newspaper-v9-5-1.js", "newspaper-v9-5-1.js"],
  ["ui/javascript/202608261802-newspaper-v9-6-2.js", "newspaper-v9-6-2.js"],
  ["ui/javascript/202608261804-projects-v9-5-1.js", "projects-v9-5-1.js"],
  ["ui/javascript/202608261806-app-v9-6-2.js", "app-v9-6-2.js"],
]);

const STYLES = Object.freeze([
  ["ui/styles/202608261740-v7-foundation.css", "v7-foundation.css"],
  ["ui/styles/202608261614-mobile.css", "mobile.css"],
  ["ui/styles/202608261927-v9-3.css", "v9-3.css"],
  ["ui/styles/202608261927-v9-4.css", "v9-4.css"],
  ["ui/styles/202608261927-v9-5-1.css", "v9-5-1.css"],
  ["ui/styles/202608261927-v9-6-1.css", "v9-6-1.css"],
]);

const INPUTS = Object.freeze({
  template: "ui/templates/202608261927-shell-v9-6-2.html",
  vendor: "ui/vendor/202608261927-chart-umd.min.js",
  releaseV9_1: "data/contracts/202608261927-release-v9-1.json",
  releaseV9_5_1: "data/contracts/202608261737-release-v9-5-1.json",
  releaseV9_6_2: "data/contracts/202608261721-release-v9-6-2.json",
  sourceManifest: "data/manifests/202608261927-build-manifest-v9-1.json",
  news: "data/news/202608261927-major-project-news-v9-5-1.json",
});

const PINNED_SHA256 = Object.freeze({
  "ui/javascript/202608261557-startplugins.js": "e5aaa19b5bee93683fae461f7ead55d019e8c2edc8ce377680c0da634606e378",
  "ui/javascript/202608261630-utils.js": "bec300e2720e0793bc08434e91c0ea0dd8c3d8e36e79b97172e4d5270f01eda0",
  "ui/javascript/202608261632-state.js": "7280acd43f72e166e7b7b3dac1d6e75439b1e1bf46b9e137c1b8aa891b52aad7",
  "ui/javascript/202608261640-filters.js": "007126279582d5dbbe6bb5ebf30a79fd998b4839e8498c5a9a76ab2e4033c842",
  "ui/javascript/202608261723-capacity-presentation.js": "650e2d1ca9fea55d0cb96db58c752e03ac03645499f033d11d4f76d29c917cef",
  "ui/javascript/202608261725-gauges.js": "30803e3ecc787175bc31b6913541d52cc6065e9be2b50dc4d3ed900797348682",
  "ui/javascript/202608261742-news-regions.js": "673126663b69f67c73dfed4f6393e56e7779514e612559f0b6aad88a4354037f",
  "ui/javascript/202608261752-canonical-projects-v9-1.js": "26dd3f1da795717b7e82b317a795658ef0c51338525f65a9c6b43ba2a88c0ebb",
  "ui/javascript/202608261754-canonical-projects-v9-5-1.js": "4e6f3351576c898e0c1c3d5018ae40dd28b0e28a86cb9c513ea8b5e099118060",
  "ui/javascript/202608261755-newspaper-v9-5-1.js": "9a3436bae58d3a982285c2caf77830b11f0a157a99255b623cd822c89bf81549",
  "ui/javascript/202608261802-newspaper-v9-6-2.js": "1a883ff28bb7e5b98e1daba50510d3807e2ed794c93447a851042ac40e9945c8",
  "ui/javascript/202608261804-projects-v9-5-1.js": "394c2990622648321e74754afd40cb51b6978ae0d3aeb5fd139f45646c473c13",
  "ui/javascript/202608261806-app-v9-6-2.js": "371ad15c570df5408e5060dd9e298309a39b183ee7c00dd387c12a3ee57bfc1a",
  "ui/styles/202608261740-v7-foundation.css": "036dbfe43ef1ffb2c55ba277d49dec57ab7c7be976289226a5d568e1f1be319d",
  "ui/styles/202608261614-mobile.css": "9855b9c11255a85f477873d07cca45b057aedcdc8a6cc4aab2d29a0ffaac9b85",
  "ui/styles/202608261927-v9-3.css": "219782d5f3fba11b8418a5b46075a8b1b918eed272f6bc2360f6b1060c1f2e9b",
  "ui/styles/202608261927-v9-4.css": "39f7d0fd3ff42e82407c1f5129444e6cc308ef5c0ec551d43c7396ac53310d17",
  "ui/styles/202608261927-v9-5-1.css": "79ff5b1db85ae82a381fbad061c0122e7151bb9c9c7ba80c549051761f0bfae3",
  "ui/styles/202608261927-v9-6-1.css": "851b0827ca2aa0950438c98ae3cf6cc7dce33667d37458122ea38bb2c6da2f81",
  "ui/templates/202608261927-shell-v9-6-2.html": "06382e57a58e460defcdd3c460ad01b93aa4c4578065348afa846b446e6d34ae",
  "ui/vendor/202608261927-chart-umd.min.js": "48444a82d4edcb5bec0f1965faacdde18d9c17db3063d042abada2f705c9f54a",
  "data/contracts/202608261927-release-v9-1.json": "bc21070f44aae1d32da333e4954816acd907aa8c9fa9cb639c64d651f7fd4259",
  "data/contracts/202608261737-release-v9-5-1.json": "4137a31477be33a04b6ad5406d7cd13cefec1be8d84a94e23997c129c82076f1",
  "data/contracts/202608261721-release-v9-6-2.json": "661bb4f226ac3c75811f9e1d36546602f401491a5c21e1ddebccda170da92ece",
  "data/manifests/202608261927-build-manifest-v9-1.json": "67976a1bbcaf383ed7121b13060db3b864db9ce33dfc721a88b59c8ca8b8e06c",
  "data/news/202608261927-major-project-news-v9-5-1.json": "cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd",
});

const outputModuleName = new Map(MODULES.map(([source, purpose]) => [
  path.posix.basename(source),
  `${GENERATION}-${purpose}`,
]));

function absolute(relativePath) {
  const resolved = path.resolve(REPOSITORY_ROOT, relativePath);
  assert.ok(resolved.startsWith(`${REPOSITORY_ROOT}${path.sep}`), `path escapes repository: ${relativePath}`);
  return resolved;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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

function rewriteImports(source) {
  let count = 0;
  const rewritten = source.replace(/(from\s+["'])\.\/([^"']+)(["'])/g, (match, before, basename, after) => {
    const output = outputModuleName.get(basename);
    assert.ok(output, `undeclared module import: ${basename}`);
    count += 1;
    return `${before}./${output}${after}`;
  });
  return { source: rewritten, count };
}

function rewriteModule(sourcePath, source) {
  if (sourcePath.endsWith("202608261632-state.js")) {
    source = replaceExactly(source, "../../dist/major_project_news_v5.json", `../data/news/${GENERATION}-major-project-news-v9-5-1.json`);
    source = replaceExactly(source, "https://raw.githubusercontent.com/Ventusltd/globalgrid2050/main/dist/major_project_news_v5.json", `../data/news/${GENERATION}-major-project-news-v9-5-1.json`);
  }
  if (sourcePath.endsWith("202608261752-canonical-projects-v9-1.js")) {
    source = replaceExactly(source, "contracts/release.v9.1.json", `../data/contracts/${GENERATION}-release-v9-1.json`);
    source = replaceExactly(source, "data/v9.1/build_manifest.json", `manifests/${GENERATION}-build-manifest-v9-1.json`);
  }
  if (sourcePath.endsWith("202608261754-canonical-projects-v9-5-1.js")) {
    source = replaceExactly(source, "contracts/release.v9.5.1.json", "../data/contracts/202608261737-release-v9-5-1.json");
  }
  if (sourcePath.endsWith("202608261755-newspaper-v9-5-1.js")) {
    const original = `const NEWS_SOURCES = Object.freeze([\n  ["Pages", "../../dist/major_project_news_v9_5_1.json"],\n  ["GitHub main", "https://raw.githubusercontent.com/Ventusltd/globalgrid2050/main/dist/major_project_news_v9_5_1.json"],\n]);`;
    const replacement = `const NEWS_SOURCES = Object.freeze([\n  ["PipelineNews", "../data/news/${GENERATION}-major-project-news-v9-5-1.json"],\n]);`;
    source = replaceExactly(source, original, replacement);
  }
  return rewriteImports(source);
}

function rewriteHtml(source) {
  const replacements = [
    ["styles/v7.css?v=9.6.2", `styles/${GENERATION}-v7-foundation.css`],
    ["styles/mobile.css?v=9.6.2", `styles/${GENERATION}-mobile.css`],
    ["styles/v9-3.css?v=9.6.2", `styles/${GENERATION}-v9-3.css`],
    ["styles/v9-4.css?v=9.6.2", `styles/${GENERATION}-v9-4.css`],
    ["styles/v9-5-1.css?v=9.6.2", `styles/${GENERATION}-v9-5-1.css`],
    ["styles/v9-6-1.css?v=9.6.2", `styles/${GENERATION}-v9-6-1.css`],
    ["https://cdn.jsdelivr.net/npm/chart.js", `vendor/${GENERATION}-chart-umd.min.js`],
    ["scripts/app-v9-6-2.js?v=9.6.2", `javascript/${GENERATION}-app-v9-6-2.js`],
    ["scripts/plugins/capacity-presentation-v9-3.js?v=9.6.2", `javascript/${GENERATION}-capacity-presentation.js`],
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
    ["../../repd_grid_atlasv8/", "https://ventusltd.github.io/gridatlas/202608292311-atlas-v9/"],
  ];
  for (const [from, to] of replacements) source = replaceExactly(source, from, to);
  return { source, replacements: replacements.length };
}

async function compileManifest(inputRecords) {
  const raw = await readPinned(INPUTS.sourceManifest, "utf8");
  const manifest = JSON.parse(raw);
  assert.equal(manifest.project_partitions.length, 16);
  assert.equal(manifest.atlas_partitions.length, 18);
  let projectCount = 0;
  for (let index = 0; index < manifest.project_partitions.length; index += 1) {
    const entry = manifest.project_partitions[index];
    const cartridge = `data/projects/${GENERATION}-project-partition-v9-1-${String(index + 1).padStart(2, "0")}.json`;
    const bytes = await readFile(absolute(cartridge));
    assert.equal(sha256(bytes), entry.sha256, `project partition hash ${index + 1}`);
    const payload = JSON.parse(bytes);
    assert.equal(payload.record_count, entry.record_count);
    assert.equal(payload.projects.length, entry.record_count);
    projectCount += payload.projects.length;
    inputRecords.push({ path: cartridge, bytes: bytes.length, sha256: sha256(bytes) });
    entry.path = `../${cartridge}`;
  }
  assert.equal(projectCount, 7680);

  for (const entry of manifest.atlas_partitions) {
    const match = entry.path.match(/atlas\/(.+)-part-(\d+)\.geojson$/);
    assert.ok(match, `invalid atlas path ${entry.path}`);
    const technology = match[1].replaceAll("_", "-");
    const cartridge = `data/atlas/${GENERATION}-atlas-${technology}-partition-v9-1-${match[2]}.geojson`;
    const bytes = await readFile(absolute(cartridge));
    assert.equal(sha256(bytes), entry.sha256, `atlas partition hash ${entry.path}`);
    const payload = JSON.parse(bytes);
    assert.equal(payload.features.length, entry.feature_count);
    inputRecords.push({ path: cartridge, bytes: bytes.length, sha256: sha256(bytes) });
    entry.path = `../${cartridge}`;
  }
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

async function validateContractsAndNews(inputRecords) {
  for (const contractPath of [INPUTS.releaseV9_1, INPUTS.releaseV9_5_1, INPUTS.releaseV9_6_2]) {
    const bytes = await readPinned(contractPath);
    JSON.parse(bytes);
    inputRecords.push({ path: contractPath, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const newsBytes = await readPinned(INPUTS.news);
  const news = JSON.parse(newsBytes);
  assert.equal(news.all_items.length, 133);
  assert.equal(news.canonical_items.length, 45);
  const prohibited = new Set(["author", "author_name", "reporter", "first_name", "last_name", "editor_name", "person_name", "contact_name"]);
  const inspect = (value) => {
    if (Array.isArray(value)) value.forEach(inspect);
    else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        assert.equal(prohibited.has(key.toLowerCase()), false, `prohibited person field: ${key}`);
        inspect(child);
      }
    }
  };
  inspect(news);
  inputRecords.push({ path: INPUTS.news, bytes: newsBytes.length, sha256: sha256(newsBytes) });
}

async function build() {
  assert.equal(path.basename(fileURLToPath(import.meta.url)), COMPILER_FILE);
  const outputs = new Map();
  const inputRecords = [];
  let importRewrites = 0;

  for (const [sourcePath, purpose] of MODULES) {
    const source = await readPinned(sourcePath, "utf8");
    inputRecords.push({ path: sourcePath, bytes: Buffer.byteLength(source), sha256: sha256(source) });
    const rewritten = rewriteModule(sourcePath, source);
    importRewrites += rewritten.count;
    outputs.set(`releases/javascript/${GENERATION}-${purpose}`, rewritten.source);
  }
  assert.equal(importRewrites, 18);

  for (const [sourcePath, purpose] of STYLES) {
    const bytes = await readPinned(sourcePath);
    inputRecords.push({ path: sourcePath, bytes: bytes.length, sha256: sha256(bytes) });
    outputs.set(`releases/styles/${GENERATION}-${purpose}`, bytes);
  }

  const template = await readPinned(INPUTS.template, "utf8");
  inputRecords.push({ path: INPUTS.template, bytes: Buffer.byteLength(template), sha256: sha256(template) });
  const html = rewriteHtml(template);
  outputs.set(`releases/${GENERATION}-index.html`, html.source);

  const vendor = await readPinned(INPUTS.vendor);
  inputRecords.push({ path: INPUTS.vendor, bytes: vendor.length, sha256: sha256(vendor) });
  outputs.set(`releases/vendor/${GENERATION}-chart-umd.min.js`, vendor);

  await validateContractsAndNews(inputRecords);
  const compiledManifest = await compileManifest(inputRecords);
  inputRecords.push({ path: INPUTS.sourceManifest, bytes: Buffer.byteLength(await readPinned(INPUTS.sourceManifest, "utf8")), sha256: PINNED_SHA256[INPUTS.sourceManifest] });
  outputs.set(`releases/manifests/${GENERATION}-build-manifest-v9-1.json`, compiledManifest);

  const outputRecords = [...outputs.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([outputPath, content]) => {
    const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
    return { path: outputPath, bytes: bytes.length, sha256: sha256(bytes) };
  });
  const compilerBytes = await readFile(fileURLToPath(import.meta.url));
  const releaseManifest = {
    schema: "pipelinenews.compiled-release.v1",
    generation: `${GENERATION}-index`,
    trusted_parent: "GlobalGrid2050 V9.6.2",
    public_url: PUBLIC_URL,
    status: "COMPILED_AWAITING_BROWSER_ATTESTATION",
    compiler: { path: `index/${COMPILER_FILE}`, sha256: sha256(compilerBytes) },
    discipline: {
      stable_folders: true,
      timestamped_files: true,
      source_mutation: false,
      data_cartridges_copied: false,
      release_references_immutable_data_cartridges: true,
    },
    substitutions: {
      javascript_imports: importRewrites,
      html_asset_and_navigation_urls: html.replacements,
      mutable_news_sources_removed: true,
      project_manifest_paths: 16,
      atlas_manifest_paths: 18,
      chart_js_pinned_locally: "4.5.1",
    },
    inputs: inputRecords.sort((left, right) => left.path.localeCompare(right.path)),
    outputs: outputRecords,
  };
  outputs.set(`releases/manifests/${GENERATION}-release-manifest.json`, `${JSON.stringify(releaseManifest, null, 2)}\n`);
  return { outputs, releaseManifest };
}

async function writeOutputs(outputs) {
  for (const outputPath of outputs.keys()) {
    try {
      await access(absolute(outputPath), constants.F_OK);
      assert.fail(`immutable output already exists: ${outputPath}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  for (const [outputPath, content] of outputs) {
    await mkdir(path.dirname(absolute(outputPath)), { recursive: true });
    await writeFile(absolute(outputPath), content, { flag: "wx" });
  }
}

async function main() {
  const { outputs, releaseManifest } = await build();
  if (!process.argv.includes("--check")) await writeOutputs(outputs);
  process.stdout.write(`${JSON.stringify({
    generation: releaseManifest.generation,
    public_url: PUBLIC_URL,
    output_files: outputs.size,
    input_files: releaseManifest.inputs.length,
    project_count: 7680,
    status: process.argv.includes("--check") ? "CHECKED" : "COMPILED",
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
