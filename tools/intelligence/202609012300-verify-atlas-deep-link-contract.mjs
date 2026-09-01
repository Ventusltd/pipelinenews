/**
 * The deep link is a contract, and this is the side of it Pipeline News owns.
 *
 * Generation 202609012300. Written because a deep scan of both applications
 * on 1 Sep 2026 compared the two sides for the first time and found this:
 *
 *   Pipeline News set seven parameters on every MAP link.
 *   GridAtlas read six.
 *   `zoom` was set on every link ever generated and read by nobody.
 *
 * It did no visible harm, which is precisely why it survived. GridAtlas's
 * immutable shell hard-codes `map.flyTo({ zoom: 12 })`, and Pipeline News
 * happens to send 12, so arrival looked correct. The two agreed by
 * coincidence. The day somebody tuned DEFAULT_ZOOM here, nothing would have
 * moved on the map and nobody would have found out for a week.
 *
 * A parameter that crosses a repository boundary has two owners and no test.
 * This is that test, from this side.
 *
 *   node tools/intelligence/202609012300-verify-atlas-deep-link-contract.mjs
 *
 * It reads the sibling GridAtlas checkout. If that is absent it FAILS and
 * says how to satisfy it. It does not skip: a cross-repository check that
 * quietly passes when it cannot see the other repository is worse than no
 * check, because it reports green on exactly the isolated checkout where
 * nobody is watching. (That lesson is one generation old and was Codex's.)
 */

import { readFile, readdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
/* WHICH GridAtlas. This matters more than it looks.
   ------------------------------------------------------------------------
   The first run of this check reported that `repd_ref` and `zoom` were read
   by nobody. Both were true — of the sibling checkout, which was sitting at
   generation 202609010106 (v9.39) while the work was happening in a
   worktree. A cross-repository check that does not say WHICH checkout it
   read is a check that reports history as if it were the present.

   So the generation and the path are printed, and --gridatlas points it at
   a worktree or any other checkout. */
const argAt = process.argv.indexOf('--gridatlas');
const SIBLING = argAt > 0
  ? resolve(process.argv[argAt + 1])
  : resolve(REPO, '..', 'gridatlas');

let passed = 0;
const failures = [];
function check(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`PASS  ${name}`); }
  else { failures.push(`${name}${detail ? `: ${detail}` : ''}`);
    console.error(`FAIL  ${name}${detail ? `: ${detail}` : ''}`); }
}

const exists = async (path) => {
  try { await access(path, constants.R_OK); return true; } catch { return false; }
};

/* ── this side: what the builder sets ──────────────────────────────────── */

const BUILDER = join(REPO, 'tools', 'intelligence', 'cartridges',
  'atlas-live-handoff', 'assets', '{GEN}-atlas-pointer-deep-link.mjs');

check('the deep-link builder is where the cartridge says it is',
  await exists(BUILDER), BUILDER);
const builder = await readFile(BUILDER, 'utf8');

const produced = [...builder.matchAll(/searchParams\.set\(\s*["']([\w_]+)["']/g)]
  .map(match => match[1]);
const producedSet = new Set(produced);
console.log(`\n  Pipeline News sets: ${[...producedSet].sort().join(', ')}`);
check('the builder sets at least the identity and the position',
  ['repd_ref', 'latitude', 'longitude'].every(name => producedSet.has(name)));

/* The cartridge also DECLARES its context parameters. A declaration that
   disagrees with the code is its own defect, and cheap to catch here. */
const cartridge = JSON.parse(await readFile(join(REPO, 'tools', 'intelligence',
  'cartridges', 'atlas-live-handoff', 'cartridge.json'), 'utf8'));
const declared = new Set([...(cartridge.registry_entry?.context_parameters || []),
  cartridge.registry_entry?.identity_rule === 'EXACT_PROJECT_REPD_REF' ? 'repd_ref' : null]
  .filter(Boolean));
const undeclared = [...producedSet].filter(name => !declared.has(name));
const unbuilt = [...declared].filter(name => !producedSet.has(name));
check('every parameter the code sets is declared in cartridge.json',
  undeclared.length === 0, undeclared.join(', '));
check('every parameter cartridge.json declares is actually set',
  unbuilt.length === 0, unbuilt.join(', '));

/* ── the other side: what GridAtlas reads ──────────────────────────────── */

const sibling = await exists(join(SIBLING, '.git')) || await exists(SIBLING);
check('the GridAtlas checkout this contract binds to is available', sibling,
  `not found at ${SIBLING} — clone Ventusltd/gridatlas beside this repository. `
  + 'This check does not skip: a cross-repository contract that passes when it '
  + 'cannot see the other repository is green exactly where nobody is watching.');

if (sibling) {
  /* Read the COMPOSED cartridge, not a source file: the composed bytes are
     what a browser is handed, and the composition names which one. */
  const current = JSON.parse(
    await readFile(join(SIBLING, 'atlas', 'current.json'), 'utf8'));
  const cartridges = current.cartridges || [];
  console.log(`\n  GridAtlas composition ${current.generation} `
    + `(${current.composition_version}), ${cartridges.length} cartridges`);
  console.log(`  read from ${SIBLING}`);
  check('the checkout being read is a composition, not an empty tree',
    Boolean(current.generation) && cartridges.length > 0);

  let readNames = new Set();
  const readIn = new Map();
  for (const entry of cartridges) {
    const file = join(SIBLING, 'atlas', entry.path.replace('./', ''));
    if (!await exists(file)) continue;
    const text = await readFile(file, 'utf8');
    /* Resolve the binding, then read only that variable — the same
       discipline the deep scan had to learn after its first regex reported
       twenty-three parameters that were being read all along. */
    const bound = new Set(
      [...text.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*new\s+URLSearchParams\s*\(/g)]
        .map(match => match[1]));
    if (!bound.size) continue;
    const reads = new RegExp(`\\b(${[...bound].join('|')})\\.get\\(\\s*["']([\\w_]+)["']`, 'g');
    for (const match of text.matchAll(reads)) {
      readNames.add(match[2]);
      if (!readIn.has(match[2])) readIn.set(match[2], new Set());
      readIn.get(match[2]).add(entry.id);
    }
  }
  console.log(`  GridAtlas reads:    ${[...readNames].sort().join(', ')}`);

  const orphaned = [...producedSet].filter(name => !readNames.has(name));
  check('every parameter Pipeline News sets is read by the composed GridAtlas',
    orphaned.length === 0,
    orphaned.length
      ? `${orphaned.join(', ')} — set on every MAP link and read nowhere. `
        + 'Either GridAtlas should read it or this side should stop sending it; '
        + 'a parameter with two owners and no reader is a promise nobody keeps.'
      : '');

  for (const name of ['repd_ref', 'latitude', 'longitude', 'zoom']) {
    if (!producedSet.has(name)) continue;
    check(`  ${name} is read, by ${[...(readIn.get(name) || ['nobody'])].join(', ')}`,
      readNames.has(name));
  }
}

console.log(`\n${passed}/${passed + failures.length} checks passed`);
if (failures.length) {
  console.error('\nFAILURES');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log('the deep link is a contract both sides keep.');
