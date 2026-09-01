/**
 * Pipeline News -> GridAtlas MAP journey, across every ported release.
 *
 * The current cross-repository contract proves the source template agrees
 * with one GridAtlas checkout. This companion proof walks the immutable
 * Pipeline News release lineage. It imports the module each browser release
 * actually imports and exercises every project row, so a green source
 * template cannot hide a stale or partially promoted published generation.
 *
 * Read-only, offline, and deterministic.
 */
import { readFile, readdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const RELEASES = join(REPO, 'releases');
const REQUIRED = Object.freeze([
  'repd_ref', 'technology', 'capacity_mw',
  'latitude', 'longitude', 'zoom',
]);

let passed = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${name}`);
    return;
  }
  const message = `${name}${detail ? `: ${detail}` : ''}`;
  failures.push(message);
  console.error(`FAIL  ${message}`);
}

async function exists(path) {
  try { await access(path, constants.R_OK); return true; } catch { return false; }
}

function decode(payload, row) {
  return Object.fromEntries(payload.fields.map((field, index) => {
    const dictionary = payload.dictionaries[field];
    return [field, dictionary ? (dictionary[row[index]] ?? '') : row[index]];
  }));
}

const releaseIds = (await readdir(RELEASES, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^\d{12}-pipelinenews$/u.test(entry.name))
  .map((entry) => entry.name)
  .sort();

const ported = [];
for (const releaseId of releaseIds) {
  const root = join(RELEASES, releaseId);
  const manifestPath = join(root, 'release-manifest.json');
  if (!await exists(manifestPath)) continue;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.atlas_target !== 'ported') continue;

  const assets = join(root, 'assets');
  const appName = (await readdir(assets)).find((name) => /-app\.mjs$/u.test(name));
  if (!appName) {
    failures.push(`${releaseId}: no app module`);
    continue;
  }
  const app = await readFile(join(assets, appName), 'utf8');
  const imported = app.match(
    /^import \{ buildAtlasV9DeepLink \} from "\.\/([^"/]+-atlas-pointer-deep-link\.mjs)";/u,
  )?.[1];
  if (!imported || !await exists(join(assets, imported))) {
    failures.push(`${releaseId}: app imports no available Atlas handoff module`);
    continue;
  }

  const registryName = (await readdir(join(root, 'data')))
    .find((name) => /-registry\.json$/u.test(name));
  if (!registryName) {
    failures.push(`${releaseId}: no registry`);
    continue;
  }
  const registry = JSON.parse(await readFile(join(root, 'data', registryName), 'utf8'));
  const projectsAsset = registry.assets?.projects?.path;
  if (!projectsAsset || !await exists(join(root, projectsAsset))) {
    failures.push(`${releaseId}: registry does not resolve its project payload`);
    continue;
  }
  const projects = JSON.parse(await readFile(join(root, projectsAsset), 'utf8'));
  const module = await import(`${pathToFileURL(join(assets, imported)).href}?audit=${releaseId}`);
  const contract = module.ATLAS_DEEP_LINK_CONTRACT;

  const counters = {
    eligible: 0, ineligible: 0, emitted: 0, ineligibleEmitted: 0, wrongReceiver: 0,
    wrongIdentity: 0, missingContext: 0, halfCoordinate: 0,
    nonFiniteContext: 0, overBudget: 0, maxBytes: 0,
  };
  for (const row of projects.rows) {
    const project = decode(projects, row);
    const href = module.buildAtlasV9DeepLink(project);
    const eligible = project.geometry_status === 'valid' && /^\d+$/u.test(String(project.repd_ref));
    if (!eligible) {
      counters.ineligible += 1;
      if (href) counters.ineligibleEmitted += 1;
      continue;
    }
    counters.eligible += 1;
    if (!href) continue;
    counters.emitted += 1;
    const url = new URL(href);
    const bytes = Buffer.byteLength(href, 'utf8');
    counters.maxBytes = Math.max(counters.maxBytes, bytes);
    if (bytes > 2048) counters.overBudget += 1;
    if (url.origin !== 'https://ventusltd.github.io'
        || url.pathname !== '/gridatlas/atlas/') counters.wrongReceiver += 1;
    if (url.searchParams.get('repd_ref') !== String(project.repd_ref)) {
      counters.wrongIdentity += 1;
    }
    for (const key of REQUIRED) {
      if (!url.searchParams.has(key)) counters.missingContext += 1;
    }
    /* Two canonical REPD rows have no official name. Absence must remain
       absent rather than being guessed, but a name that exists must survive
       exactly: it is the instant mobile card heading before any payload. */
    if (project.name
        ? url.searchParams.get('project') !== project.name
        : url.searchParams.has('project')) counters.missingContext += 1;
    const hasLat = url.searchParams.has('latitude');
    const hasLon = url.searchParams.has('longitude');
    if (hasLat !== hasLon) counters.halfCoordinate += 1;
    if (![url.searchParams.get('latitude'), url.searchParams.get('longitude'),
      url.searchParams.get('capacity_mw'), url.searchParams.get('zoom')]
      .every((value) => value !== null && Number.isFinite(Number(value)))) {
      counters.nonFiniteContext += 1;
    }
  }
  ported.push({ releaseId, imported, contract, counters, rows: projects.rows.length });
}

console.log(`\nported immutable releases: ${ported.length}`);
check('at least one ported immutable release is audited', ported.length > 0);
check('every ported manifest resolves to an auditable runtime',
  ported.length === releaseIds.filter((id) => id >= '202608312018-pipelinenews').length,
  `${ported.length} audited`);
check('every browser-imported module declares the ported target',
  ported.every(({ contract }) => contract?.active_target === 'ported'));
check('every browser-imported module uses the stable composed receiver',
  ported.every(({ contract }) => contract?.receiver?.base_url
    === 'https://ventusltd.github.io/gridatlas/atlas/'));
check('every eligible project emits exactly one MAP URL',
  ported.every(({ counters }) => counters.emitted === counters.eligible));
check('ineligible projects never emit a MAP URL',
  ported.every(({ counters }) => counters.ineligibleEmitted === 0));
check('every MAP URL preserves exact REPD identity',
  ported.every(({ counters }) => counters.wrongIdentity === 0));
check('every MAP URL carries the immediate grid-computation context',
  ported.every(({ counters }) => counters.missingContext === 0));
check('coordinates are always emitted as an inseparable pair',
  ported.every(({ counters }) => counters.halfCoordinate === 0));
check('numeric grid-computation context is finite',
  ported.every(({ counters }) => counters.nonFiniteContext === 0));
check('no MAP URL exceeds a conservative 2 KiB mobile/proxy budget',
  ported.every(({ counters }) => counters.overBudget === 0),
  `maximum ${Math.max(...ported.map(({ counters }) => counters.maxBytes), 0)} bytes`);
check('no immutable release sends MAP to a stale receiver',
  ported.every(({ counters }) => counters.wrongReceiver === 0));

for (const item of ported) {
  console.log(`  ${item.releaseId}: ${item.rows} rows, ${item.counters.eligible} MAP, `
    + `max ${item.counters.maxBytes} B, ${item.imported}`);
}

console.log(`\n${passed}/${passed + failures.length} checks passed`);
if (failures.length) {
  console.error('\nFAILURES');
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}
console.log('the immutable Pipeline News -> GridAtlas journey remains coherent.');
