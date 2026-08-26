import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GENERATION = "202608261812-index";
const COMPILER_FILE = "202608261812-compile-index.mjs";
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JAVASCRIPT_ROOT = "ui/javascript";

const JAVASCRIPT_MODULES = Object.freeze([
  `${JAVASCRIPT_ROOT}/202608261557-startplugins.js`,
  `${JAVASCRIPT_ROOT}/202608261630-utils.js`,
  `${JAVASCRIPT_ROOT}/202608261632-state.js`,
  `${JAVASCRIPT_ROOT}/202608261640-filters.js`,
  `${JAVASCRIPT_ROOT}/202608261723-capacity-presentation.js`,
  `${JAVASCRIPT_ROOT}/202608261725-gauges.js`,
  `${JAVASCRIPT_ROOT}/202608261742-news-regions.js`,
  `${JAVASCRIPT_ROOT}/202608261752-canonical-projects-v9-1.js`,
  `${JAVASCRIPT_ROOT}/202608261754-canonical-projects-v9-5-1.js`,
  `${JAVASCRIPT_ROOT}/202608261755-newspaper-v9-5-1.js`,
  `${JAVASCRIPT_ROOT}/202608261802-newspaper-v9-6-2.js`,
  `${JAVASCRIPT_ROOT}/202608261804-projects-v9-5-1.js`,
  `${JAVASCRIPT_ROOT}/202608261806-app-v9-6-2.js`,
]);

const REQUIRED_ASSET_SUFFIXES = Object.freeze([
  "-mobile.css",
  "-v7-foundation.css",
  "-v9-3.css",
  "-v9-4.css",
  "-v9-5-1.css",
  "-v9-6-1.css",
  "-shell-v9-6-2.html",
  "-release-v9-1.json",
  "-release-v9-5-1.json",
  "-build-manifest-v9-1.json",
  "-major-project-news-v9-5-1.json",
  ...Array.from({ length: 16 }, (_, index) =>
    `-project-partition-v9-1-${String(index + 1).padStart(2, "0")}.json`),
]);

function repositoryPath(relativePath) {
  const absolutePath = path.resolve(REPOSITORY_ROOT, relativePath);
  assert.ok(
    absolutePath.startsWith(`${REPOSITORY_ROOT}${path.sep}`),
    `input escapes repository: ${relativePath}`,
  );
  return absolutePath;
}

async function sha256(relativePath) {
  const bytes = await readFile(repositoryPath(relativePath));
  return {
    path: relativePath,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function listFiles(relativeDirectory) {
  const result = [];
  const absoluteDirectory = repositoryPath(relativeDirectory);
  for (const entry of await readdir(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(relativePath));
    else if (entry.isFile()) result.push(relativePath);
  }
  return result;
}

async function verifyJavascriptGraph() {
  const declared = new Set(JAVASCRIPT_MODULES);
  const visited = new Set();

  async function visit(relativePath) {
    if (visited.has(relativePath)) return;
    assert.ok(declared.has(relativePath), `undeclared JavaScript dependency: ${relativePath}`);
    const source = await readFile(repositoryPath(relativePath), "utf8");
    visited.add(relativePath);
    for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
      const specifier = match[1];
      assert.ok(specifier.startsWith("."), `external JavaScript import is not pinned: ${specifier}`);
      const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(relativePath), specifier));
      await visit(dependency);
    }
  }

  await visit(`${JAVASCRIPT_ROOT}/202608261806-app-v9-6-2.js`);
  await visit(`${JAVASCRIPT_ROOT}/202608261723-capacity-presentation.js`);
  assert.equal(visited.size, JAVASCRIPT_MODULES.length, "declared JavaScript contains unreachable modules");
  return Promise.all([...visited].sort().map(sha256));
}

async function assetReadiness() {
  const candidates = [
    ...await listFiles("ui"),
    ...await listFiles("data"),
  ];
  const resolved = [];
  const missing = [];
  const ambiguous = [];

  for (const suffix of REQUIRED_ASSET_SUFFIXES) {
    const matches = candidates.filter((candidate) => candidate.endsWith(suffix));
    if (matches.length === 1) resolved.push(matches[0]);
    else if (matches.length === 0) missing.push(suffix);
    else ambiguous.push({ suffix, matches });
  }
  return { resolved: resolved.sort(), missing, ambiguous };
}

async function main() {
  assert.equal(path.basename(fileURLToPath(import.meta.url)), COMPILER_FILE);
  await stat(repositoryPath("archive"));
  const javascript = await verifyJavascriptGraph();
  const assets = await assetReadiness();
  const report = {
    schema: "pipelinenews.compiler-check.v1",
    generation: GENERATION,
    output: `releases/${GENERATION}`,
    javascript,
    assets,
    ready: assets.missing.length === 0 && assets.ambiguous.length === 0,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (process.argv.includes("--modules")) return;
  assert.equal(report.ready, true, "release refused: trusted template, styles or runtime data are incomplete");
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
