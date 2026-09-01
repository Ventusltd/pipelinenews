/**
 * Independent proof for the Pipeline News -> composed GridAtlas handoff.
 *
 * This reads the release that will be handed to a browser, imports its actual
 * deep-link module, and generates a URL for every row in the frozen compact
 * project index. It does not ask app.mjs whether its own links are correct.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../../..');
const releaseId = process.argv[2] || '202608312018-pipelinenews';
const release = join(repo, 'releases', releaseId);
const generation = releaseId.slice(0, 12);

let passed = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failures.push(`${name}${detail ? `: ${detail}` : ''}`);
    console.error(`FAIL  ${name}${detail ? `: ${detail}` : ''}`);
  }
}

const text = async (relative) => readFile(join(release, relative), 'utf8');
const json = async (relative) => JSON.parse(await text(relative));

const app = await text('assets/202608291447-app.mjs');
const index = await text('index.html');
const manifest = await json('release-manifest.json');
const registry = await json('data/202608291447-registry.json');
const projects = await json('data/202608270055-8ab1807551bc-v8-fast-projects.json');
/* The deep-link module is resolved from what the runtime ACTUALLY imports,
   not from the release's own generation.
   ------------------------------------------------------------------------
   It used to be `${generation}-atlas-pointer-deep-link.mjs`, which is only
   the right name for a release built by the cartridge that introduced that
   asset. Every other release carries its parent's copy, so this proof could
   not run on them at all - it threw ERR_MODULE_NOT_FOUND, which is a gate
   that cannot check rather than a gate that fails. 202609012324, the first
   release cut by the night shift, is where that surfaced.

   Reading the specifier out of app.mjs is also a stronger check: it proves
   the module the runtime really loads, rather than a file that merely
   happens to be named after the release. */
const imported = app.match(
  /^import \{ buildAtlasV9DeepLink \} from "\.\/(\d{12}-atlas-pointer-deep-link\.mjs)";/m);
check('the runtime imports exactly one deep-link receiver, by name',
  !!imported && (app.match(/-atlas-pointer-deep-link\.mjs"/g) || []).length === 1,
  imported ? imported[1] : 'no import found in assets/202608291447-app.mjs');
if (!imported) {
  console.error('\nFAIL: cannot resolve the deep-link module the runtime imports.');
  process.exit(1);
}
const modulePath = join(release, 'assets', imported[1]);
const deepLink = await import(pathToFileURL(modulePath).href);

check('release manifest records the ported target', manifest.atlas_target === 'ported');
check('the imported receiver module is present in this release\'s own assets',
  existsSync(modulePath), imported[1]);
check('the receiver is the ported one, not a legacy-target module',
  (await readFile(modulePath, 'utf8')).includes('ventusltd.github.io/gridatlas/atlas/'));
check('runtime no longer imports the legacy-target module',
  !app.includes('./202608311343-atlas-pointer-deep-link.mjs'));
check('both site-navigation links use the stable GridAtlas route',
  (index.match(/https:\/\/ventusltd\.github\.io\/gridatlas\/atlas\//g) || []).length === 2);
check('site navigation contains no legacy Atlas href',
  !index.includes('https://globalgrid2050.com/repd_grid_atlasv8/'));

const entry = registry.supplemental_assets?.atlas_live_handoff;
check('registry carries the handoff receipt', Boolean(entry));
check('registry and executable agree on target',
  entry?.active_target === 'ported' && deepLink.ATLAS_DEEP_LINK_CONTRACT.active_target === 'ported');
check('receiver is the stable composed route',
  deepLink.ATLAS_DEEP_LINK_CONTRACT.receiver.base_url
    === 'https://ventusltd.github.io/gridatlas/atlas/');

const self = deepLink.selfTest();
check('module self-test passes', self.ok,
  self.checks.filter((item) => !item.ok).map((item) => item.name).join(', '));
check('module self-test ran against ported target', self.target === 'ported');

function decode(row) {
  return Object.fromEntries(projects.fields.map((field, index) => {
    const encoded = row[index];
    const dictionary = projects.dictionaries[field];
    return [field, dictionary ? (dictionary[encoded] ?? '') : encoded];
  }));
}

let valid = 0;
let invalid = 0;
let wrongHost = 0;
let wrongPath = 0;
let missingIdentity = 0;
let missingContext = 0;
let unnamed = 0;
let botley = null;
for (const row of projects.rows) {
  const project = decode(row);
  const href = deepLink.buildAtlasV9DeepLink(project);
  if (project.geometry_status !== 'valid') {
    invalid += 1;
    if (href) failures.push(`invalid geometry emitted a URL for REPD ${project.repd_ref}`);
    continue;
  }
  valid += 1;
  const url = new URL(href);
  if (url.hostname !== 'ventusltd.github.io') wrongHost += 1;
  if (url.pathname !== '/gridatlas/atlas/') wrongPath += 1;
  if (url.searchParams.get('repd_ref') !== String(project.repd_ref)) missingIdentity += 1;
  for (const key of ['technology', 'capacity_mw', 'latitude', 'longitude', 'zoom']) {
    if (!url.searchParams.has(key)) missingContext += 1;
  }
  if (project.name) {
    if (url.searchParams.get('project') !== project.name) missingContext += 1;
  } else {
    unnamed += 1;
    if (url.searchParams.has('project')) failures.push(`blank source name was guessed for REPD ${project.repd_ref}`);
  }
  if (String(project.repd_ref) === '12588') botley = { project, url };
}

check('all valid-geometry projects emit a link', valid === 7652, `found ${valid}`);
check('all non-valid geometry rows fail closed', invalid === 28, `found ${invalid}`);
check('every emitted URL uses the Ventus host', wrongHost === 0, `${wrongHost} wrong`);
check('every emitted URL uses the stable composed path', wrongPath === 0, `${wrongPath} wrong`);
check('every emitted URL retains exact REPD identity', missingIdentity === 0,
  `${missingIdentity} missing`);
check('every emitted URL carries layout/deep-link context', missingContext === 0,
  `${missingContext} missing fields`);
check('two blank official project names remain blank rather than guessed', unnamed === 2,
  `found ${unnamed}`);
check('Botley West retains the 840 MW register value',
  botley?.url.searchParams.get('capacity_mw') === '840');
check('Botley West is handed to the composed Atlas',
  botley?.url.href.startsWith('https://ventusltd.github.io/gridatlas/atlas/?repd_ref=12588'));

console.log(`\n${passed}/${passed + failures.length} checks passed`);
if (failures.length) {
  console.error('\nFAILURES');
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}
