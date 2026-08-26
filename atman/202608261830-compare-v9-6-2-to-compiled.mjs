import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ATMAN_GENERATION = "202608261830";
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TRUSTED_ROOT = path.resolve(
  REPOSITORY_ROOT,
  process.env.PIPELINENEWS_TRUSTED_ROOT
    || "../estate/globalgrid2050/uk_renewables_pipeline/v9.6.2",
);
const COMPILER = "index/202608261812-compile-index.mjs";
const COMPILED_RELEASE = "releases/202608261812-index";
const REPORT = `atman/${ATMAN_GENERATION}-precision-report.json`;

const MODULES = Object.freeze([
  ["scripts/core/plugin-host.js", "ui/javascript/202608261557-startplugins.js", []],
  ["scripts/core/utils.js", "ui/javascript/202608261630-utils.js", []],
  ["scripts/core/state.js", "ui/javascript/202608261632-state.js", []],
  ["scripts/core/project-filter-v9-2.js", "ui/javascript/202608261640-filters.js", []],
  ["scripts/plugins/capacity-presentation-v9-3.js", "ui/javascript/202608261723-capacity-presentation.js", []],
  ["scripts/plugins/gauges-v9-2.js", "ui/javascript/202608261725-gauges.js", []],
  ["scripts/core/news-regions-v9-6-2.js", "ui/javascript/202608261742-news-regions.js", [
    ["./utils.js", "./202608261630-utils.js"],
  ]],
  ["scripts/data/canonical-projects-v9-1.js", "ui/javascript/202608261752-canonical-projects-v9-1.js", []],
  ["scripts/data/canonical-projects-v9-5-1.js", "ui/javascript/202608261754-canonical-projects-v9-5-1.js", [
    ["./canonical-projects-v9-1.js", "./202608261752-canonical-projects-v9-1.js"],
  ]],
  ["scripts/plugins/newspaper-v9-5-1.js", "ui/javascript/202608261755-newspaper-v9-5-1.js", [
    ["../core/state.js", "./202608261632-state.js"],
    ["../core/utils.js", "./202608261630-utils.js"],
  ]],
  ["scripts/plugins/newspaper-v9-6-2.js", "ui/javascript/202608261802-newspaper-v9-6-2.js", [
    ["../core/state.js", "./202608261632-state.js"],
    ["../core/utils.js", "./202608261630-utils.js"],
    ["../core/news-regions-v9-6-2.js", "./202608261742-news-regions.js"],
    ["./newspaper-v9-5-1.js", "./202608261755-newspaper-v9-5-1.js"],
  ]],
  ["scripts/plugins/projects-v9-5-1.js", "ui/javascript/202608261804-projects-v9-5-1.js", [
    ["../core/utils.js", "./202608261630-utils.js"],
    ["../core/state.js", "./202608261632-state.js"],
    ["../core/project-filter-v9-2.js", "./202608261640-filters.js"],
    ["../data/canonical-projects-v9-5-1.js", "./202608261754-canonical-projects-v9-5-1.js"],
    ["./gauges-v9-2.js", "./202608261725-gauges.js"],
    ["./newspaper-v9-5-1.js", "./202608261755-newspaper-v9-5-1.js"],
  ]],
  ["scripts/app-v9-6-2.js", "ui/javascript/202608261806-app-v9-6-2.js", [
    ["./plugins/gauges-v9-2.js", "./202608261725-gauges.js"],
    ["./plugins/newspaper-v9-6-2.js", "./202608261802-newspaper-v9-6-2.js"],
    ["./plugins/projects-v9-5-1.js", "./202608261804-projects-v9-5-1.js"],
    ["./core/plugin-host.js", "./202608261557-startplugins.js"],
  ]],
]);

const STYLES = Object.freeze([
  ["styles/mobile.css", "ui/styles/202608261614-mobile.css"],
  ["styles/v7.css", "ui/styles/202608261740-v7-foundation.css"],
]);

const MISSING_STYLES = Object.freeze([
  "styles/v9-3.css",
  "styles/v9-4.css",
  "styles/v9-5-1.css",
  "styles/v9-6-1.css",
]);

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function exists(absolutePath) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function compareModule([trustedPath, modularPath, replacements]) {
  const trusted = await readFile(path.join(TRUSTED_ROOT, trustedPath), "utf8");
  const modular = await readFile(path.join(REPOSITORY_ROOT, modularPath), "utf8");
  let expected = trusted;
  for (const [from, to] of replacements) {
    assert.equal(expected.split(from).length - 1, 1, `${trustedPath} must contain one ${from}`);
    expected = expected.replace(from, to);
  }
  assert.equal(modular, expected, `${modularPath} differs beyond declared import rewrites`);
  return {
    trusted: trustedPath,
    modular: modularPath,
    status: replacements.length ? "IMPORT_REWRITTEN_EXACT" : "BYTE_EXACT",
    import_rewrites: replacements.length,
    trusted_sha256: digest(trusted),
    modular_sha256: digest(modular),
  };
}

async function compareStyle([trustedPath, modularPath]) {
  const trusted = await readFile(path.join(TRUSTED_ROOT, trustedPath));
  const modular = await readFile(path.join(REPOSITORY_ROOT, modularPath));
  assert.deepEqual(modular, trusted, `${modularPath} is not byte-exact`);
  return {
    trusted: trustedPath,
    modular: modularPath,
    status: "BYTE_EXACT",
    sha256: digest(trusted),
  };
}

async function main() {
  assert.equal(path.basename(fileURLToPath(import.meta.url)), `${ATMAN_GENERATION}-compare-v9-6-2-to-compiled.mjs`);
  assert.equal(await exists(path.join(TRUSTED_ROOT, "index.html")), true, "trusted V9.6.2 source is unavailable");

  const modules = [];
  for (const specification of MODULES) modules.push(await compareModule(specification));
  const styles = [];
  for (const specification of STYLES) styles.push(await compareStyle(specification));

  const compilerReport = JSON.parse(execFileSync(
    process.execPath,
    [path.join(REPOSITORY_ROOT, COMPILER), "--modules"],
    { encoding: "utf8" },
  ));
  const compiledReleasePresent = await exists(path.join(REPOSITORY_ROOT, COMPILED_RELEASE));
  const status = compiledReleasePresent
    ? "COMPILED_RELEASE_PRESENT_REQUIRES_BROWSER_PARITY"
    : "INCOMPLETE_NO_COMPILED_RELEASE";

  const report = {
    schema: "pipelinenews.atman-precision-report.v1",
    atman_generation: ATMAN_GENERATION,
    trusted_release: "V9.6.2",
    compiler_generation: compilerReport.generation,
    status,
    conclusion: compiledReleasePresent
      ? "A compiled release exists but visual and browser parity remain unproved."
      : "No compiled release exists. The modular JavaScript is faithful, but V9.6.2 parity cannot yet be claimed.",
    comparison: {
      javascript: {
        trusted_total: MODULES.length,
        matched_total: modules.length,
        modules,
      },
      styles: {
        trusted_total: STYLES.length + MISSING_STYLES.length,
        matched_total: styles.length,
        matched: styles,
        missing: MISSING_STYLES,
      },
      compiler_assets: {
        resolved_total: compilerReport.assets.resolved.length,
        missing_total: compilerReport.assets.missing.length,
        missing: compilerReport.assets.missing,
        ambiguous: compilerReport.assets.ambiguous,
      },
      compiled_release: {
        path: COMPILED_RELEASE,
        present: compiledReleasePresent,
      },
    },
  };

  const serialised = `${JSON.stringify(report, null, 2)}\n`;
  if (process.argv.includes("--stdout")) process.stdout.write(serialised);
  else await writeFile(path.join(REPOSITORY_ROOT, REPORT), serialised, { flag: "wx" });
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
