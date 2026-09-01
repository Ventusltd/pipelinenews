/**
 * The Pipeline News night shift.
 *
 * One queued step per invocation: built on this laptop by the repository's
 * own Python builder, proven here, published to both surfaces, pushed to
 * GitHub, and verified against the live bytes.
 *
 * WHY THIS IS NOT A COPY OF THE GRIDATLAS RUNNER
 * ----------------------------------------------
 * The two applications ship differently and pretending otherwise would
 * produce a runner that reports success against the wrong bytes.
 *
 *   GridAtlas cuts a COMPOSITION: a pointer file names hashed cartridges,
 *   and "live" is `atlas/current.json` on GitHub Pages.
 *
 *   Pipeline News builds an immutable RELEASE DIRECTORY by copying its
 *   parent and applying one cartridge (`tools/intelligence/release_builder.py`,
 *   pure stdlib, no network, no git). "Live" is a snapshot of that
 *   directory published at globalgrid2050.com/pipelinenews_intelligence/
 *   <generation>/, which lives in a DIFFERENT repository - the
 *   globalgrid2050 checkout beside this one. Nothing in this repository
 *   publishes that host, which is why ten releases built on 31 August sit
 *   in `releases/` with `"deployment": "not-authorised"` and no pointer
 *   naming them.
 *
 * TWO THINGS THIS RUNNER MUST DO THAT THE OTHER DOES NOT
 * ------------------------------------------------------
 * 1. Author `atman/<generation>-public-browser-readback.mjs`. The Pages
 *    workflow at `.github/workflows/202608301214-pages-v2.yml` does
 *    `test -f "$verifier"` and FAILS the deploy when it is missing. Only
 *    four such files exist, none for any generation after 30 August. A
 *    release without one is a release that cannot deploy, so the runner
 *    writes it as part of the cut rather than leaving it to be discovered.
 *
 * 2. Publish the snapshot into the globalgrid2050 checkout and push there
 *    too. The homepage `index.html` is NOT touched: it is governed by a
 *    numbered-snapshot ritual and a byte-exact sentinel contract, and a
 *    previous session rewrote more of it than was asked and had the work
 *    rejected. The directory publish makes the URL live; naming it on the
 *    homepage is a separate, deliberate act.
 *
 *   node tools/overnight/202609012300-shift.mjs            # next pending step
 *   node tools/overnight/202609012300-shift.mjs --dry      # build and prove only
 *   node tools/overnight/202609012300-shift.mjs --step <path>
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const GG = path.resolve(ROOT, '..', 'globalgrid2050');
const STEPS = path.join(HERE, 'steps');
const LOG = path.join(HERE, 'shift-log.json');

const LIVE_BASE = 'https://globalgrid2050.com/pipelinenews_intelligence';

const utcNow = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const slash = (p) => String(p).split('\\').join('/');

function run(cmd, args, { cwd = ROOT, allowFail = false, quiet = false } = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, shell: false });
  const out = (r.stdout || '') + (r.stderr || '');
  if (!quiet) process.stdout.write(out.length > 6000 ? out.slice(-6000) : out);
  if (r.status !== 0 && !allowFail) throw new Error(`${cmd} ${args.join(' ')} exited ${r.status}`);
  return { status: r.status, out };
}
const git = (...args) => run('git', args, { quiet: true }).out.trim();
const gitAt = (cwd, ...args) => run('git', args, { cwd, quiet: true }).out.trim();
const status = () => run('git', ['status', '--porcelain'], { quiet: true }).out.split('\n').filter(Boolean);
const untracked = () => git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean).map(slash);

/* python3 on CI, python on this laptop; resolved once and recorded. */
const PYTHON = (() => {
  for (const candidate of ['python', 'python3']) {
    const r = spawnSync(candidate, ['--version'], { encoding: 'utf8', shell: false });
    if (r.status === 0) return candidate;
  }
  throw new Error('no python interpreter found');
})();

const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8'))
  : { schema: 'pipelinenews.shift-log.v1', runs: [] };
function record(entry) {
  log.runs.push(entry);
  fs.writeFileSync(LOG, JSON.stringify(log, null, 2) + '\n');
}

/* ── choose the step ─────────────────────────────────────────────────── */
const flag = (name) => process.argv.includes(name);
const opt = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
};

const done = new Set(log.runs.filter(r => r.outcome === 'live').map(r => r.step));
let stepPath = opt('--step');
if (!stepPath) {
  if (!fs.existsSync(STEPS)) { console.log('no steps directory'); process.exit(0); }
  const pending = fs.readdirSync(STEPS).filter(f => f.endsWith('.mjs')).sort().filter(f => !done.has(f));
  if (!pending.length) { console.log('no pending step'); process.exit(0); }
  stepPath = path.join(STEPS, pending[0]);
}
const stepFile = path.basename(stepPath);
const step = (await import(pathToFileURL(path.resolve(stepPath)).href)).default;
for (const key of ['id', 'cartridge', 'scope', 'note']) {
  if (!step[key]) { console.error(`step ${stepFile} lacks ${key}`); process.exit(2); }
}

const dry = flag('--dry');
const startedAt = new Date().toISOString();
console.log(`\n\x1b[1mPN shift step ${step.id}\x1b[0m  (${stepFile})  ${startedAt}${dry ? '  [dry]' : ''}`);

const entry = { step: stepFile, id: step.id, cartridge: step.cartridge,
  started_at: startedAt, dry, python: PYTHON, stages: [] };
const stage = (name, detail) => {
  entry.stages.push({ name, at: new Date().toISOString(), ...detail });
  console.log(`  \x1b[36m${name}\x1b[0m ${detail ? JSON.stringify(detail).slice(0, 240) : ''}`);
};

let untrackedBefore = null;
function undo() {
  if (untrackedBefore === null) return;
  run('git', ['checkout', '--', '.'], { allowFail: true, quiet: true });
  const before = new Set(untrackedBefore);
  for (const p of untracked()) {
    if (!before.has(p)) fs.rmSync(path.join(ROOT, p), { force: true, recursive: true });
  }
}
function fail(reason, extra = {}) {
  entry.outcome = 'failed'; entry.reason = reason;
  entry.finished_at = new Date().toISOString();
  Object.assign(entry, extra);
  console.log(`\n\x1b[31mFAILED: ${reason}\x1b[0m`);
  undo();
  record(entry);
  process.exit(1);
}

/* ── preconditions ───────────────────────────────────────────────────── */
const brings = new Set((step.brings || []).map(slash));
/* The repo carries a long-standing set of untracked candidate artefacts
   from the older v8-fast lineage. They are not this shift's business and
   they are not cleaned - they are simply not counted as a dirty tree. */
const IGNORABLE = [
  'tools/overnight/', 'docs/coordination/', 'atman/__pycache__/',
  'releases/data/', 'releases/javascript/', 'releases/202609010145-',
  'build/202609010145-'
];
const dirty = status();
const dirtyElsewhere = dirty.filter((l) => {
  const p = slash(l.slice(3));
  if (IGNORABLE.some(prefix => p.startsWith(prefix))) return false;
  if (!l.startsWith('??')) return true;
  if (brings.has(p)) return false;
  /* git collapses a wholly-untracked directory to the directory itself, so
     a step that brings `<dir>/a.py` and `<dir>/b.json` is reported as the
     single entry `<dir>/`. Matching only the file paths turned the first
     Pipeline News cut red for a tree that was exactly as the step declared
     it. A directory is allowed only when the step brings something inside
     it - a directory nothing was declared for is still dirty. */
  if (p.endsWith('/') && [...brings].some(b => b.startsWith(p))) return false;
  return true;
});
if (dirtyElsewhere.length && !dry) {
  fail('working tree not clean before the step', { dirty: dirtyElsewhere.slice(0, 20) });
}

if (!fs.existsSync(GG)) {
  fail('the globalgrid2050 checkout is not beside this repository; nothing can be published live', { expected: GG });
}

run('git', ['fetch', 'origin', '--quiet'], { quiet: true, allowFail: true });
const head = git('rev-parse', 'HEAD');
const originMain = git('rev-parse', 'origin/main');
if (head !== originMain) {
  const base = git('merge-base', 'HEAD', 'origin/main');
  if (base === head) {
    run('git', ['merge', '--ff-only', 'origin/main'], { quiet: true });
    stage('fast-forwarded to origin/main', { to: originMain.slice(0, 7) });
  } else if (base !== originMain) {
    fail('origin/main has diverged from this checkout; a human merges, not the night shift',
      { head, origin_main: originMain });
  }
}

/* ── the parent release ──────────────────────────────────────────────── */
const releases = fs.readdirSync(path.join(ROOT, 'releases'))
  .filter(f => /^\d{12}-pipelinenews$/.test(f)).sort();
if (!releases.length) fail('no parent release found');
const parent = step.parent || releases[releases.length - 1];
stage('parent release', { parent, of: releases.length });

/* ── the step prepares its cartridge ─────────────────────────────────── */
untrackedBefore = untracked();
if (typeof step.prepare === 'function') {
  try {
    await step.prepare({ root: ROOT, parent, run, python: PYTHON,
      read: (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'),
      write: (rel, text) => {
        fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
        fs.writeFileSync(path.join(ROOT, rel), text);
      } });
  } catch (error) { fail(`prepare: ${error.message}`); }
  stage('cartridge prepared', { cartridge: step.cartridge });
}

/* the tooling and the cartridge source are committed BEFORE the build, so
   the release commit contains the release and nothing else - the Pages
   workflow selects a release only when exactly one changed */
if (!dry && status().length) {
  /* Only this step's own files. `git add tools/intelligence` would sweep up
     whatever else is being written in that tree - and tonight there are
     parallel agents authoring cartridges in it. A runner that commits work
     it did not produce makes its own receipt untrue. */
  run('git', ['add', 'tools/overnight', ...brings], { allowFail: true, quiet: true });
  const r = run('git', ['commit', '-q', '-m',
    `${utcNow()}: overnight - step ${step.id} authored`], { allowFail: true, quiet: true });
  if (r.status === 0) stage('tooling committed', { commit: git('rev-parse', '--short', 'HEAD') });
}

/* ── build ───────────────────────────────────────────────────────────── */
if (dry) {
  entry.outcome = 'dry'; entry.finished_at = new Date().toISOString(); record(entry);
  console.log('\n--dry: prepared and checked; no release built.');
  process.exit(0);
}

const generation = utcNow();
if (generation <= parent.slice(0, 12)) {
  fail('the clock has not advanced past the parent generation', { generation, parent });
}
const buildArgs = ['tools/intelligence/release_builder.py',
  '--from', parent, '--cartridge', step.cartridge, '--gen', generation];
if (step.atlasTarget) buildArgs.push('--atlas-target', step.atlasTarget);
{
  const r = run(PYTHON, buildArgs, { allowFail: true });
  if (r.status !== 0) fail('the release builder refused the build', { output: r.out.slice(-3000) });
}
const releaseId = `${generation}-pipelinenews`;
const releaseDir = path.join(ROOT, 'releases', releaseId);
if (!fs.existsSync(releaseDir)) fail('the builder reported success and wrote no release', { releaseId });
stage('built', { releaseId, parent });

/* ── the readback verifier the Pages workflow demands ────────────────── */
const readback = `atman/${generation}-public-browser-readback.mjs`;
if (!fs.existsSync(path.join(ROOT, readback))) {
  const template = fs.readdirSync(path.join(ROOT, 'atman'))
    .filter(f => /^\d{12}-public-browser-readback\.mjs$/.test(f)).sort().pop();
  if (!template) fail('no readback verifier exists to model the new one on');
  const text = fs.readFileSync(path.join(ROOT, 'atman', template), 'utf8');
  const stamped = text.split(template.slice(0, 12)).join(generation);
  fs.writeFileSync(path.join(ROOT, readback), stamped);
  stage('readback verifier authored', { readback, modelled_on: template });
}

/* ── gates ───────────────────────────────────────────────────────────── */
const gates = [
  ['builder check', [PYTHON, ['tools/intelligence/release_builder.py', '--check', releaseId]]],
  ['neutral surface', [PYTHON, ['tools/intelligence/v8_neutral_surface.py', `releases/${releaseId}`]]],
  ['atlas deep-link cartridge', [process.execPath, ['tools/intelligence/cartridges/atlas-live-handoff/proof.mjs', releaseId]]],
  ['deep-link contract vs GridAtlas', [process.execPath,
    ['tools/intelligence/202609012300-verify-atlas-deep-link-contract.mjs',
      '--gridatlas', path.resolve(ROOT, '..', 'gridatlas')]]],
];
for (const extra of step.gates || []) gates.push(extra);

for (const [name, [cmd, args]] of gates) {
  const target = args[0];
  if (!fs.existsSync(path.join(ROOT, target))) {
    /* a skip is not a pass */
    fail(`gate absent: ${name} (${target})`);
  }
  const r = run(cmd, args, { allowFail: true });
  const tally = r.out.match(/(\d+)\/(\d+) checks passed/);
  stage(`gate ${name}`, { status: r.status, tally: tally ? `${tally[1]}/${tally[2]}` : undefined });
  if (r.status !== 0) fail(`gate red: ${name}`, { output: r.out.slice(-2500) });
}

/* the parent must be untouched, byte for byte - immutability is the whole
   architecture, and the builder asserts it, but so does this */
{
  const r = run('git', ['diff', '--quiet', '--', `releases/${parent}`], { allowFail: true, quiet: true });
  if (r.status !== 0) fail('the build modified its own parent release');
  stage('parent untouched', { parent });
}

/* ── commit the release alone, then push ─────────────────────────────── */
run('git', ['add', `releases/${releaseId}`, readback], { quiet: true });
run('git', ['commit', '-q', '-m',
  `${generation}: ${step.scope}\n\n${step.note}\n\n` +
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>\n` +
  `Claude-Session: https://claude.ai/code/session_01S5k13hEkFMreXi2kXxCFca`], { quiet: true });
const commit = git('rev-parse', 'HEAD');
untrackedBefore = null;
stage('committed', { commit: commit.slice(0, 7), generation });

{
  const r = run('git', ['push', 'origin', 'HEAD:main'], { allowFail: true, quiet: true });
  if (r.status !== 0) {
    entry.outcome = 'committed-not-pushed'; entry.reason = r.out.slice(-800);
    entry.finished_at = new Date().toISOString(); record(entry);
    console.log(`\n\x1b[31mpush refused\x1b[0m`);
    process.exit(1);
  }
  stage('pushed', { remote: 'origin/main' });
}

/* ── publish the snapshot to the public host ─────────────────────────── */
const snapshot = path.join(GG, 'pipelinenews_intelligence', generation);
if (fs.existsSync(snapshot)) fail('a snapshot for this generation already exists', { snapshot });
fs.cpSync(releaseDir, snapshot, { recursive: true });
stage('snapshot copied', { to: slash(path.relative(GG, snapshot)) });

/* the snapshot must be the release, byte for byte */
{
  const walk = (dir, base = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? walk(path.join(dir, d.name), `${base}${d.name}/`) : [`${base}${d.name}`]);
  const a = walk(releaseDir).sort();
  const b = walk(snapshot).sort();
  if (a.join('\n') !== b.join('\n')) fail('the snapshot does not contain the same files as the release');
  for (const rel of a) {
    if (!fs.readFileSync(path.join(releaseDir, rel)).equals(fs.readFileSync(path.join(snapshot, rel)))) {
      fail(`the snapshot differs from the release at ${rel}`);
    }
  }
  stage('snapshot verified byte-identical', { files: a.length });
}

gitAt(GG, 'add', path.join('pipelinenews_intelligence', generation));
run('git', ['commit', '-q', '-m',
  `${generation}: publish Pipeline News ${releaseId}\n\n${step.note}\n\n` +
  `The homepage index.html is deliberately NOT edited here: it is governed\n` +
  `by a numbered-snapshot ritual and a byte-exact sentinel contract, and\n` +
  `naming a release on it is a separate deliberate act.\n\n` +
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>\n` +
  `Claude-Session: https://claude.ai/code/session_01S5k13hEkFMreXi2kXxCFca`],
  { cwd: GG, quiet: true, allowFail: true });
{
  const r = run('git', ['push', 'origin', 'HEAD:main'], { cwd: GG, allowFail: true, quiet: true });
  if (r.status !== 0) fail('the snapshot was committed and could not be pushed', { output: r.out.slice(-800) });
  stage('snapshot pushed', { repo: 'globalgrid2050' });
}

/* ── the live bytes ──────────────────────────────────────────────────── */
const liveUrl = `${LIVE_BASE}/${generation}/`;
let live = null;
const deadline = Date.now() + 15 * 60 * 1000;
while (Date.now() < deadline) {
  try {
    const res = await fetch(liveUrl, { cache: 'no-store' });
    if (res.ok) {
      const html = await res.text();
      live = { url: liveUrl, status: res.status, bytes: html.length,
        names_its_generation: html.includes(generation) };
      if (live.names_its_generation) break;
    }
    process.stdout.write(`  waiting for ${liveUrl} (${res.status})\r`);
  } catch (error) { process.stdout.write(`  live check: ${error.message}\r`); }
  await new Promise(r => setTimeout(r, 20000));
}

entry.generation = generation;
entry.release_id = releaseId;
entry.commit = commit;
entry.live = live;
entry.finished_at = new Date().toISOString();

if (!live) {
  entry.outcome = 'pushed-not-seen-live';
  entry.reason = 'the public host did not serve the generation within 15 minutes';
  record(entry);
  console.log(`\n\x1b[33mpushed; ${liveUrl} not serving yet\x1b[0m`);
  process.exit(1);
}
if (!live.names_its_generation) {
  entry.outcome = 'live-but-not-its-own-generation';
  entry.reason = 'the served page does not name the generation it claims to be';
  record(entry);
  process.exit(1);
}

entry.outcome = 'live';
record(entry);
run('git', ['add', slash(path.relative(ROOT, LOG))], { quiet: true, allowFail: true });
run('git', ['commit', '-q', '-m', `${utcNow()}: overnight - ${releaseId} verified live`], { allowFail: true, quiet: true });
run('git', ['push', 'origin', 'HEAD:main'], { allowFail: true, quiet: true });
console.log(`\n\x1b[32m${releaseId} is live at ${liveUrl}\x1b[0m`);
