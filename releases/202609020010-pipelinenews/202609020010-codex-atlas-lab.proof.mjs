/** Executable acceptance proof for the isolated Codex MAP journey. */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const GENERATION = '202609020010';
const ROUTE = `https://ventusltd.github.io/gridatlas/atlas/codex/${GENERATION}/`;
const ASSET = `assets/${GENERATION}-codex-atlas-lab-deep-link.mjs`;

let passed = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`PASS  ${name}`); return; }
  const message = `${name}${detail ? `: ${detail}` : ''}`;
  failures.push(message);
  console.error(`FAIL  ${message}`);
}

const text = async (relative) => readFile(join(ROOT, relative), 'utf8');
const json = async (relative) => JSON.parse(await text(relative));
const app = await text('assets/202608291447-app.mjs');
const source = await text(ASSET);
const manifest = await json('release-manifest.json');
const registry = await json('data/202608291447-registry.json');
const projects = await json('data/202608270055-8ab1807551bc-v8-fast-projects.json');
const module = await import(`${pathToFileURL(join(ROOT, ASSET)).href}?proof=${GENERATION}`);

check('release generation is the paired Codex timestamp',
  manifest.generation === GENERATION && manifest.release_id === `${GENERATION}-pipelinenews`);
check('release is explicitly a non-deployed Codex candidate',
  manifest.atlas_target === 'codex' && manifest.deployment === 'not-authorised');
check('release metadata has no stale shared/Claude receiver',
  manifest.atlas_live_url === ROUTE
  && manifest.atlas_release_id === `codex/${GENERATION}`
  && manifest.shared_atlas_pointer_consumed === false
  && manifest.shared_atlas_route_consumed === false);
check('app imports only the timestamped Codex handoff',
  app.startsWith(`import { buildAtlasV9DeepLink } from "./${GENERATION}-codex-atlas-lab-deep-link.mjs";`));
check('app does not import either inherited Atlas handoff',
  !/^import .*20260831(?:1343|2037)-atlas-pointer-deep-link/mu.test(app));

const entry = registry.supplemental_assets?.codex_atlas_lab_handoff;
check('registry pins the isolated receiver',
  entry?.receiver_route === ROUTE && entry?.active_target === 'codex');
check('registry refuses both shared receiver mechanisms',
  entry?.shared_pointer_consumed === false && entry?.shared_atlas_route_consumed === false);
check('executable contract pins the same immutable receiver',
  module.ATLAS_DEEP_LINK_CONTRACT.receiver.base_url === ROUTE);
check('handoff source contains no parent-relative reference', !source.includes('../'));
check('handoff source cannot assign the shared current pointer as its receiver',
  !/BASE_URL\s*=.*current\.json/u.test(source));

function decode(row) {
  return Object.fromEntries(projects.fields.map((field, index) => {
    const dictionary = projects.dictionaries[field];
    return [field, dictionary ? (dictionary[row[index]] ?? '') : row[index]];
  }));
}

let eligible = 0;
let emitted = 0;
let wrongRoute = 0;
let sharedRoute = 0;
let sharedPointer = 0;
let wrongIdentity = 0;
let missingContext = 0;
let halfCoordinate = 0;
let nonFinite = 0;
let overBudget = 0;
let maxBytes = 0;
for (const row of projects.rows) {
  const project = decode(row);
  const href = module.buildAtlasV9DeepLink(project);
  const shouldEmit = project.geometry_status === 'valid'
    && /^\d+$/u.test(String(project.repd_ref));
  if (!shouldEmit) {
    if (href) failures.push(`ineligible REPD ${project.repd_ref} emitted a MAP URL`);
    continue;
  }
  eligible += 1;
  if (!href) continue;
  emitted += 1;
  const url = new URL(href);
  const bytes = Buffer.byteLength(href, 'utf8');
  maxBytes = Math.max(maxBytes, bytes);
  if (bytes > 2048) overBudget += 1;
  if (url.href.startsWith(ROUTE) === false) wrongRoute += 1;
  if (url.pathname === '/gridatlas/atlas/') sharedRoute += 1;
  if (url.href.includes('current.json')) sharedPointer += 1;
  if (url.searchParams.get('repd_ref') !== String(project.repd_ref)) wrongIdentity += 1;
  for (const key of ['technology', 'capacity_mw', 'latitude', 'longitude', 'zoom']) {
    if (!url.searchParams.has(key)) missingContext += 1;
  }
  if (project.name
      ? url.searchParams.get('project') !== project.name
      : url.searchParams.has('project')) missingContext += 1;
  const lat = url.searchParams.get('latitude');
  const lon = url.searchParams.get('longitude');
  if ((lat === null) !== (lon === null)) halfCoordinate += 1;
  if (![lat, lon, url.searchParams.get('capacity_mw'), url.searchParams.get('zoom')]
    .every((value) => value !== null && Number.isFinite(Number(value)))) nonFinite += 1;
}

check('every eligible project emits one lab MAP URL', emitted === eligible,
  `${emitted}/${eligible}`);
check('every MAP URL uses only the paired Codex generation', wrongRoute === 0);
check('no Codex lab MAP URL targets Claude/shared /atlas/', sharedRoute === 0);
check('no Codex lab MAP URL targets atlas/current.json', sharedPointer === 0);
check('every MAP URL preserves exact REPD identity', wrongIdentity === 0);
check('every MAP URL carries immediate mobile/grid context', missingContext === 0);
check('coordinates remain a finite inseparable pair', halfCoordinate === 0 && nonFinite === 0);
check('every URL is under the 2 KiB mobile/proxy budget', overBudget === 0,
  `maximum ${maxBytes} bytes`);
check('module self-test passes', module.selfTest().ok);

console.log(`\n${passed}/${passed + failures.length} checks passed`);
console.log(`${emitted} Codex-lab MAP journeys; maximum URL ${maxBytes} bytes`);
if (failures.length) {
  console.error('\nFAILURES');
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}
