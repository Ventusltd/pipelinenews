/**
 * The WIDER FLEET deep link, and the payload behind it.
 *
 * Generation 202609030132. Written because two questions turned out to have
 * no owner.
 *
 * FIRST: Pipeline News has TWO deep-link emitters, and the contract verifier
 * reads one of them.
 *
 *   tools/.../cartridges/atlas-live-handoff/assets/{GEN}-atlas-pointer-deep-link.mjs
 *       the spine's MAP link, `searchParams.set(...)`
 *       checked by 202609012300-verify-atlas-deep-link-contract.mjs
 *
 *   tools/.../cartridges/wider-fleet/assets/{GEN}-wider-fleet.mjs
 *       the wider fleet's own MAP link, `query.set(...)` inside atlasLink()
 *       checked by nothing until this file
 *
 * SECOND, and this is the one that matters: 202609012300 proves the two sides
 * agree on the NAMES of the seven parameters. It passes 11/11. Nobody had
 * asked what happens to the VALUES.
 *
 * GridAtlas validates the technology parameter against a four-member set,
 * in the live composition:
 *
 *     const allowedTechnologies = new Set(['solar', 'bess', 'wind_onshore', 'wind_offshore']);
 *     if (!allowedTechnologies.has(requestedTechnology))
 *         throw new Error('canonical project technology is invalid');
 *
 * Those four are exactly SPINE_TYPES in the wider fleet's own payload builder
 * -- the four REPD technology types the wider fleet is DEFINED as excluding.
 * So every technology value this payload can carry is outside the set, and
 * every wider-fleet MAP link fails that lane by construction. It is not a data
 * error and it is not fixed by sending the REPD type name instead: there is no
 * value this side can send that the set accepts.
 *
 * This check does not decide who should change. It makes the question
 * answerable from a command line instead of from a screenshot.
 *
 *   node tools/intelligence/202609030132-verify-wider-fleet-deep-link.mjs <release-id>
 *   node ... <release-id> --gridatlas <path>
 *
 * No network. Reads the release directory and the sibling GridAtlas checkout.
 * It does NOT skip when GridAtlas is absent, for the reason 202609012300 gives:
 * a cross-repository check that passes when it cannot see the other repository
 * is green exactly where nobody is watching.
 */

import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const RELEASES = join(REPO, 'releases');

const releaseId = process.argv[2];
if (!releaseId || releaseId.startsWith('--')) {
  console.error('usage: node 202609030132-verify-wider-fleet-deep-link.mjs <release-id> [--gridatlas <path>]');
  process.exit(2);
}
const argAt = process.argv.indexOf('--gridatlas');
const SIBLING = argAt > 0 ? resolve(process.argv[argAt + 1]) : resolve(REPO, '..', 'gridatlas');

let passed = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`PASS  ${name}`); }
  else {
    failures.push(`${name}${detail ? `: ${detail}` : ''}`);
    console.error(`FAIL  ${name}${detail ? `: ${detail}` : ''}`);
  }
}
const exists = async (path) => {
  try { await access(path, constants.R_OK); return true; } catch { return false; }
};

/* ── the release: cartridge, payload, and what the link carries ─────────── */

const root = join(RELEASES, releaseId);
const generation = releaseId.slice(0, 12);

/* WHERE THE CARTRIDGE ACTUALLY IS.
 *
 * This used to be `assets/${releaseId.slice(0,12)}-wider-fleet.mjs`, which
 * assumes the asset is named after the release reading it. That holds for
 * exactly one release -- the one that ADDED the cartridge. Every release built
 * on top of it inherits the file under the older generation's name, so the
 * check reported "the release carries a wider-fleet cartridge: FAIL" for a
 * release that carries it perfectly well, and stopped before it read anything.
 * Measured on 202609031307, the first generation to inherit it.
 *
 * The registry is the authority for where a supplemental asset lives -- it is
 * the file app.mjs itself resolves the import from -- so ask it, and fall back
 * to the old guess only when there is no registry entry to ask.
 */
const registryPath = join(root, 'data', '202608291447-registry.json');
let cartridgeRelative = `assets/${generation}-wider-fleet.mjs`;
let payloadRelative = `data/${generation}-wider-fleet.json`;
if (await exists(registryPath)) {
  const entry = JSON.parse(await readFile(registryPath, 'utf8'))
    .supplemental_assets?.wider_fleet;
  if (entry?.cartridge?.path) cartridgeRelative = entry.cartridge.path;
  if (entry?.payload?.path) payloadRelative = entry.payload.path;
  console.log(`  registry names ${cartridgeRelative} and ${payloadRelative}\n`);
}
const cartridgePath = join(root, cartridgeRelative);
const payloadPath = join(root, payloadRelative);

check('the release carries a wider-fleet cartridge', await exists(cartridgePath), cartridgePath);
check('the release carries a wider-fleet payload', await exists(payloadPath), payloadPath);
if (failures.length) { report(); }

const cartridge = await readFile(cartridgePath, 'utf8');
const rows = JSON.parse(await readFile(payloadPath, 'utf8'));
check('the payload carries rows', Array.isArray(rows) && rows.length > 0);

/* Which payload field reaches the URL. This is the whole point of the file:
   `rt` is the REPD type and `t` is an engine layer id, and reading the code
   is the only way to know which one a reader's browser sends. */
const setCalls = [...cartridge.matchAll(/query\.set\(\s*["']([\w_]+)["']\s*,\s*([^)]+)\)/g)]
  .map(m => [m[1], m[2].trim()]);
const emitted = new Map(setCalls);
console.log(`\n  wider fleet sets: ${[...emitted.keys()].sort().join(', ')}`);
check('the wider-fleet link sets a technology parameter', emitted.has('technology'));
const technologyExpression = emitted.get('technology') || '';
console.log(`  technology comes from: ${technologyExpression}`);

const field = /row\.rt\b/.test(technologyExpression) ? 'rt'
  : /row\.t\b/.test(technologyExpression) ? 't' : null;
check('the technology parameter is traceable to one payload field', field !== null,
  `could not resolve ${technologyExpression} to row.t or row.rt`);

/* ── payload integrity ─────────────────────────────────────────────────── */

const repdTypes = new Set(rows.map(r => r.rt));
const emittedValues = [...new Set(rows.map(r => r[field]).filter(v => v != null))].sort();
console.log(`\n  REPD technology types in the cut : ${repdTypes.size}`);
console.log(`  distinct technology values emitted: ${emittedValues.length} `
  + `— ${emittedValues.join(', ')}`);

const withRef = rows.filter(r => r.ref);
const unresolved = rows.filter(r => !r.ref);
console.log(`  rows ${rows.length}, with a REPD reference ${withRef.length} `
  + `(${(100 * withRef.length / rows.length).toFixed(2)}%), without ${unresolved.length}`);

const refCounts = new Map();
for (const row of withRef) refCounts.set(row.ref, (refCounts.get(row.ref) || 0) + 1);
const repeatedRefs = [...refCounts].filter(([, n]) => n > 1).map(([ref]) => ref);
check('no REPD reference is claimed by two rows', repeatedRefs.length === 0,
  repeatedRefs.join(', '));

/* A duplicate row is not cosmetic. It double-counts capacity in the tab
   totals, and it is also why some rows can never resolve: the join looks a
   site up by name and technology, finds two, tries operator and then
   development status, and returns "ambiguous" when it still cannot get to
   one. A register that carries a project twice hands the resolver exactly
   that situation. */
const identity = (r) => JSON.stringify([r.n, r.rt, r.c, r.ll]);
const seen = new Map();
for (const row of rows) seen.set(identity(row), (seen.get(identity(row)) || 0) + 1);
const duplicated = [...seen].filter(([, n]) => n > 1);
const extraRows = duplicated.reduce((sum, [, n]) => sum + n - 1, 0);
const doubleCounted = duplicated.reduce(
  (sum, [key, n]) => sum + (JSON.parse(key)[2] || 0) * (n - 1), 0);
if (duplicated.length) {
  console.log('');
  for (const [key, n] of duplicated) {
    const [name, type, capacity] = JSON.parse(key);
    console.log(`  x${n}  ${name} — ${type}, ${capacity} MW`);
  }
}
check('no project appears twice with the same name, type, capacity and position',
  duplicated.length === 0,
  `${duplicated.length} duplicated identities, ${extraRows} extra rows, `
  + `${doubleCounted.toFixed(2)} MW double-counted in every tab total that includes them`);

if (unresolved.length) {
  console.log(`\n  the ${unresolved.length} rows the Atlas cannot resolve:`);
  for (const row of unresolved) {
    console.log(`    ${String(row.c).padStart(7)} MW  ${row.rt.padEnd(20)} ${row.n}`);
  }
}

/* ── the other side: the values GridAtlas will accept ──────────────────── */

const sibling = await exists(join(SIBLING, '.git')) || await exists(SIBLING);
check('the GridAtlas checkout this contract binds to is available', sibling,
  `not found at ${SIBLING} — clone Ventusltd/gridatlas beside this repository, `
  + 'or pass --gridatlas <path>. This check does not skip.');

if (sibling) {
  const current = JSON.parse(await readFile(join(SIBLING, 'atlas', 'current.json'), 'utf8'));
  const cartridges = current.cartridges || [];
  console.log(`\n  GridAtlas composition ${current.generation} `
    + `(${current.composition_version}), ${cartridges.length} cartridges`);
  console.log(`  read from ${SIBLING}`);
  check('the checkout being read is a composition, not an empty tree',
    Boolean(current.generation) && cartridges.length > 0);

  /* Read the allow-set out of the COMPOSED bytes, never out of a source file:
     the composed bytes are what a browser is handed. */
  let allowed = null;
  let allowedIn = null;
  for (const entry of cartridges) {
    const file = join(SIBLING, 'atlas', entry.path.replace('./', ''));
    if (!await exists(file)) continue;
    const text = await readFile(file, 'utf8');
    const match = text.match(
      /allowedTechnologies\s*=\s*new\s+Set\(\s*\[([^\]]*)\]\s*\)/);
    if (!match) continue;
    allowed = new Set([...match[1].matchAll(/["']([\w_]+)["']/g)].map(m => m[1]));
    allowedIn = entry.id;
    break;
  }
  check('the composed GridAtlas declares a technology allow-set', allowed !== null,
    'no allowedTechnologies Set found in any composed cartridge — if the check '
    + 'has moved, this harness is reading the wrong thing and must be updated');

  if (allowed) {
    console.log(`\n  ${allowedIn} accepts: ${[...allowed].sort().join(', ')}`);
    const rejected = emittedValues.filter(value => !allowed.has(value));
    const rowsRejected = rows.filter(r => !allowed.has(r[field])).length;
    check('every technology value the wider fleet emits is one GridAtlas accepts',
      rejected.length === 0,
      `${rejected.join(', ')} — ${rowsRejected} of ${rows.length} MAP links throw `
      + "'canonical project technology is invalid' on arrival. The allow-set is the "
      + 'four spine technologies, which are exactly the four the wider fleet is '
      + 'defined as excluding, so no value this side can send will pass it. '
      + 'Sending the REPD type name instead does not help.');
  }
}

report();

function report() {
  console.log(`\n${passed}/${passed + failures.length} checks passed`);
  if (failures.length) {
    console.error('\nFAILURES');
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log('the wider fleet links to an Atlas that can answer it.');
  process.exit(0);
}
