#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO = resolve(import.meta.dirname, '..', '..');
let passed = 0;
const failed = [];
function check(label, condition) {
  if (condition) { passed += 1; console.log(`  [PASS] ${label}`); }
  else { failed.push(label); console.log(`  [FAIL] ${label}`); }
}
const read = path => readFile(join(REPO, path), 'utf8');
const [ignore, contract, exporter, compiler, workflow] = await Promise.all([
  read('.gitignore'), read('docs/coordination/CONTINUITY.md'),
  read('tools/coordination/export-last-24h.mjs'),
  read('tools/coordination/compile-priorities.mjs'),
  read('.github/workflows/202609012115-board-continuity.yml')
]);

check('raw local transcript output is ignored', /docs\/coordination\/\.local\//.test(ignore));
check('the exporter writes only beneath an explicitly local default',
  /docs\/coordination\/\.local\/transcripts-last-24h\.jsonl/.test(exporter));
check('the exporter records source hashes and full text for local forensics',
  /source_sha256/.test(exporter) && /\btext\b/.test(exporter));
check('the exporter understands nested Codex rollout payloads',
  /record\.payload/.test(exporter) && /record\.type === 'response_item'/.test(exporter));
check('Codex tool calls and outputs are retained locally',
  /payload\.input/.test(exporter) && /payload\.output/.test(exporter));
check('the compiler explicitly excludes raw transcripts',
  /raw_transcripts_included: false/.test(compiler));
check('reviewed events fail closed on unknown schemas',
  /unrecognised schema/.test(compiler) && /coordination\.reviewed-event\.v1/.test(compiler));
check('P0 integrity failures outrank grid/map work',
  /id: 'P0', weight: 1000/.test(compiler) && /id: 'P1', weight: 700/.test(compiler));
check('closed work remains evidence but cannot remain an active P0',
  /priority: 'DONE', score: 0/.test(compiler) && /resolved: true/.test(compiler));
check('grid computation and the map-click journey are first-class signals',
  /map click\|deep link\|grid computation\|fault current\|voltage\|substation/.test(compiler));
check('the contract says the queue grants no mutation authority',
  /not authority to edit, commit, push or deploy/.test(contract));
check('the workflow has read-only contents permission', /permissions:\s*\n\s*contents: read/.test(workflow));
check('the CVAA source is pinned to a full reviewed SHA',
  /ref: d2893fab63fbcdae491e04a0be8c6a783b840911/.test(workflow));
check('CVAA absence cannot silently pass', !/continue-on-error/.test(workflow)
  && !/skipping scan/.test(workflow));
check('the scheduled job cannot write or deploy', !/git push|contents: write|deploy-pages/.test(workflow));

const generated = join(REPO, 'docs', 'coordination', '.local', 'proof-priorities.json');
const markdown = join(REPO, 'docs', 'coordination', '.local', 'proof-priorities.md');
const run = spawnSync(process.execPath, [join(REPO, 'tools', 'coordination', 'compile-priorities.mjs'),
  '--now', '2026-09-02T00:00:00.000Z', '--hours', '24',
  '--json', 'docs/coordination/.local/proof-priorities.json',
  '--markdown', 'docs/coordination/.local/proof-priorities.md'], { cwd: REPO, encoding: 'utf8' });
check('the priority compiler executes against real coordination history', run.status === 0);
if (run.status === 0) {
  const product = JSON.parse(await readFile(generated, 'utf8'));
  check('the compiled product carries its schema and privacy boundary',
    product.schema === 'coordination.last-24-hours.v1' && product.raw_transcripts_included === false);
  check('compiled priorities are monotonically non-increasing',
    product.items.every((item, index) => index === 0 || product.items[index - 1].score >= item.score));
  check('the Markdown handoff was emitted', (await readFile(markdown, 'utf8')).startsWith('# Claude–Codex continuity'));
}
const tracked = spawnSync('git', ['ls-files', 'docs/coordination/.local'], { cwd: REPO, encoding: 'utf8' });
check('no local transcript artifact is tracked', tracked.status === 0 && !tracked.stdout.trim());
const eventFiles = (await readdir(join(REPO, 'docs', 'coordination', 'events'))).filter(x => x.endsWith('.json'));
check('there are no unreviewed event payloads in the initial installation', eventFiles.length === 0);

console.log(`\n${passed}/${passed + failed.length} checks passed`);
if (failed.length) process.exit(1);
console.log('continuity is portable, privacy-bounded, priority-ordered and non-deploying.');
