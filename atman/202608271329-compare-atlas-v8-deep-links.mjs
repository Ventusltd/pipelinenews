import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { atlasUrlV9_5_1 as trustedAtlasUrl } from "../archive/202608261547-pipelinenews/202608260159-pipelinenews/scripts/plugins/projects-v9-5-1.js";
import {
  ATLAS_V8_DEEP_LINK_CONTRACT,
  buildAtlasV8DeepLink,
} from "../ui/cartridges/202608271329-atlas-v8-deep-link.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TRUSTED_SOURCE = "archive/202608261547-pipelinenews/202608260159-pipelinenews/scripts/plugins/projects-v9-5-1.js";
const TRUSTED_SHA256 = "f0c63602d85a5726aa38106157e8d3d6924d0ab1a684194ffe2de93df1c6d823";
const PARENT_RUNTIME = "releases/javascript/202608270844-v8-fast-runtime.js";
const PROJECTS = "releases/data/202608270055-8ab1807551bc-v8-fast-projects.json";
const PROJECTS_SHA256 = "c06aedef176d2d38fd135806306a8ef81b4af9994c7be31e8bd760304149f862";
const EXPECTED_PARAMETERS = [
  "repd_ref",
  "project",
  "technology",
  "capacity_mw",
  "latitude",
  "longitude",
  "zoom",
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function projectDecoder(payload) {
  const field = Object.fromEntries(payload.fields.map((name, index) => [name, index]));
  return (row) => ({
    repd_ref: row[field.repd_ref],
    gg_project_id: row[field.gg_project_id],
    name: row[field.name],
    technology: payload.dictionaries.technology[row[field.technology]],
    status: payload.dictionaries.status[row[field.status]],
    capacity_mw: row[field.capacity_mw],
    county: payload.dictionaries.county[row[field.county]],
    region: payload.dictionaries.region[row[field.region]],
    operator: payload.dictionaries.operator[row[field.operator]],
    repd_record_updated: row[field.repd_record_updated],
    geometry_status: payload.dictionaries.geometry_status[row[field.geometry_status]],
    latitude: row[field.latitude],
    longitude: row[field.longitude],
  });
}

function parseAdapterArgument(argv) {
  if (argv.length === 0) return null;
  assert.equal(argv.length, 2, "usage: --adapter <compiled-cartridge-path>");
  assert.equal(argv[0], "--adapter", "usage: --adapter <compiled-cartridge-path>");
  const relative = path.posix.normalize(argv[1]);
  assert.ok(relative.startsWith("releases/javascript/202608271329-"), "adapter must be the timestamped release cartridge");
  const absolute = path.resolve(ROOT, relative);
  assert.ok(absolute.startsWith(`${ROOT}${path.sep}`), "adapter escapes repository");
  return { relative, absolute };
}

function parameterOrder(url) {
  return [...new URL(url).searchParams.keys()];
}

function atlasParameters(source, functionName) {
  const start = source.indexOf(`function ${functionName}`);
  assert.ok(start >= 0, `missing ${functionName}`);
  const tail = source.slice(start, start + 1_500);
  return [...tail.matchAll(/searchParams\.set\("([^"]+)"/gu)].map((match) => match[1]);
}

async function main() {
  const adapterArgument = parseAdapterArgument(process.argv.slice(2));
  const trustedBytes = await readFile(path.join(ROOT, TRUSTED_SOURCE));
  assert.equal(sha256(trustedBytes), TRUSTED_SHA256, "trusted V9.6.2 builder changed");
  assert.deepEqual(
    atlasParameters(trustedBytes.toString("utf8"), "atlasUrlV9_5_1"),
    EXPECTED_PARAMETERS,
    "trusted V9.6.2 query contract changed",
  );

  const parentRuntimeBytes = await readFile(path.join(ROOT, PARENT_RUNTIME));
  assert.deepEqual(
    atlasParameters(parentRuntimeBytes.toString("utf8"), "atlasUrl"),
    ["repd_ref", "technology", "longitude", "latitude"],
    "08:44 regression evidence changed",
  );

  let adapterBuild = buildAtlasV8DeepLink;
  let adapterContract = ATLAS_V8_DEEP_LINK_CONTRACT;
  let adapterSha256 = null;
  if (adapterArgument) {
    const adapterBytes = await readFile(adapterArgument.absolute);
    adapterSha256 = sha256(adapterBytes);
    const adapter = await import(`${pathToFileURL(adapterArgument.absolute).href}?${adapterSha256}`);
    adapterBuild = adapter.buildAtlasV8DeepLink;
    adapterContract = adapter.ATLAS_V8_DEEP_LINK_CONTRACT;
  }
  assert.deepEqual(adapterContract, ATLAS_V8_DEEP_LINK_CONTRACT, "compiled cartridge contract changed");

  const projectBytes = await readFile(path.join(ROOT, PROJECTS));
  assert.equal(sha256(projectBytes), PROJECTS_SHA256, "compact project cartridge changed");
  const payload = JSON.parse(projectBytes);
  assert.equal(payload.rows.length, 7_680);
  const decode = projectDecoder(payload);

  let mapLinks = 0;
  let noMap = 0;
  let blankProjectParameters = 0;
  for (const row of payload.rows) {
    const project = decode(row);
    const trusted = trustedAtlasUrl(project);
    const source = buildAtlasV8DeepLink(project);
    const compiled = adapterBuild(project);
    assert.equal(source, trusted, `source cartridge differs from V9.6.2 for REPD ${project.repd_ref}`);
    assert.equal(compiled, trusted, `compiled cartridge differs from V9.6.2 for REPD ${project.repd_ref}`);
    if (!trusted) {
      noMap += 1;
      assert.notEqual(project.geometry_status, "valid");
      continue;
    }
    mapLinks += 1;
    assert.equal(project.geometry_status, "valid");
    assert.deepEqual(parameterOrder(trusted), EXPECTED_PARAMETERS, `parameter order changed for REPD ${project.repd_ref}`);
    const url = new URL(trusted);
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "globalgrid2050.com");
    assert.equal(url.pathname, "/repd_grid_atlasv8/");
    assert.equal(url.searchParams.get("repd_ref"), String(project.repd_ref));
    assert.equal(url.searchParams.get("technology"), String(project.technology));
    assert.equal(url.searchParams.get("zoom"), "12");
    if (url.searchParams.get("project") === "") blankProjectParameters += 1;
  }

  assert.equal(mapLinks, 7_652);
  assert.equal(noMap, 28);
  assert.equal(blankProjectParameters, 2, "blank V9.6.2 project parameters must remain representable");

  const byRef = new Map(payload.rows.map((row) => [String(row[0]), decode(row)]));
  for (const sentinel of Object.values(ATLAS_V8_DEEP_LINK_CONTRACT.sentinels)) {
    const project = byRef.get(sentinel.repd_ref);
    assert.ok(project, `missing sentinel REPD ${sentinel.repd_ref}`);
    assert.equal(adapterBuild(project), sentinel.expected_url, `sentinel changed: REPD ${sentinel.repd_ref}`);
  }

  process.stdout.write(`${JSON.stringify({
    schema: "pipelinenews.atman.atlas-v8-deep-link-parity.v1",
    generation: ATLAS_V8_DEEP_LINK_CONTRACT.generation,
    parent_generation: ATLAS_V8_DEEP_LINK_CONTRACT.parent_generation,
    trusted_source: TRUSTED_SOURCE,
    trusted_source_sha256: TRUSTED_SHA256,
    parent_regression_parameters: ["repd_ref", "technology", "longitude", "latitude"],
    restored_parameters: EXPECTED_PARAMETERS,
    project_count: payload.rows.length,
    map_links: mapLinks,
    no_map: noMap,
    blank_project_parameters: blankProjectParameters,
    adapter: adapterArgument?.relative || "source-cartridge",
    adapter_sha256: adapterSha256,
    status: "PASS",
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
