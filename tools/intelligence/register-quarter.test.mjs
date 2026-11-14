// Tests: a new REPD quarter reaches discovery through the release registry, safely.
// run: node --test tools/intelligence/register-quarter.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {resolveRegister, decodeProjects} from './register-source.mjs';
import {computeDelta, operatorAliases, reviewBindings, discoveryPriority, DEFAULT_LIMITS} from './register-delta.mjs';
import {reconcileProvisional} from '../../cartridges/provisional-identity.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const FIELDS = ['repd_ref', 'gg_project_id', 'name', 'technology', 'status', 'capacity_mw', 'county', 'region', 'operator', 'repd_record_updated', 'geometry_status', 'latitude', 'longitude'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function payload(rows) {
  const dictionaries = {technology: [], status: [], county: [], region: [], operator: [], geometry_status: []};
  const code = (field, value) => { const list = dictionaries[field]; let i = list.indexOf(value); if (i < 0) { list.push(value); i = list.length - 1; } return i; };
  return {schema: 'pipelinenews.v8.fast-project-index.v1', generation: '000000000000', cache_identity: 'x', fields: FIELDS, dictionaries,
    rows: rows.map(r => [r.repd_ref, `GG2050-REPD-${r.repd_ref}`, r.name, code('technology', r.technology ?? 'solar'), code('status', r.status ?? 'Application Submitted'),
      r.capacity_mw ?? null, code('county', r.county), code('region', 'X'), code('operator', r.operator), '2026-10-01', code('geometry_status', 'valid'), 52, -1])};
}

function writeRelease(root, id, files, registered, admitted) {
  const dir = path.join(root, 'releases', id, 'data');
  mkdirSync(dir, {recursive: true});
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(dir, name), body);
  const bytes = readFileSync(path.join(dir, registered));
  writeFileSync(path.join(dir, '202608291447-registry.json'), JSON.stringify({
    source: {dataset: `test ${id}`, admitted_project_count: admitted},
    assets: {projects: {path: `data/${registered}`, schema: 'pipelinenews.v8.fast-project-index.v1', sha256: sha(bytes)}},
  }));
}

const Q2 = [
  {repd_ref: '100', name: 'Alpha Solar Farm', operator: 'Old Co / Partner', county: 'Kent', capacity_mw: 49.9},
  {repd_ref: '101', name: 'Beta Battery Storage', operator: 'Beta Ltd', county: 'Essex', capacity_mw: 100, technology: 'bess'},
  {repd_ref: '102', name: 'Gamma Solar Park', operator: 'Gamma Energy', county: 'Devon', capacity_mw: 30},
];
const Q3 = [
  {repd_ref: '100', name: 'Alpha Solar Farm', operator: 'Old Co & Partner', county: 'Kent', capacity_mw: 49.9, status: 'Awaiting Construction'},
  {repd_ref: '101', name: 'Beta Battery Storage', operator: 'New Owner Plc', county: 'Essex', capacity_mw: 100, technology: 'bess'},
  {repd_ref: '200', name: 'Cearn Solar Farm', operator: 'Telis Energy UK', county: 'Oxfordshire', capacity_mw: 500},
];

const FILLER = Array.from({length: 1200}, (_, i) => ({repd_ref: String(5000 + i), name: `Filler ${i} Solar Farm`, operator: 'Filler Co', county: 'Kent', capacity_mw: 5}));

function fixtureRepo({pad = false, q3Rows = Q3} = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'pn-quarter-'));
  const q2Rows = pad ? [...Q2, ...FILLER] : Q2;
  const nextRows = pad ? [...q3Rows, ...FILLER] : q3Rows;
  const q2 = JSON.stringify(payload(q2Rows)), q3 = JSON.stringify(payload(nextRows));
  writeRelease(root, '202609060232-pipelinenews', {'202608270055-aaaa-v8-fast-projects.json': q2}, '202608270055-aaaa-v8-fast-projects.json', q2Rows.length);
  // The new release inherits the Q2 file under its old name and registers the Q3 one.
  writeRelease(root, '202611132345-pipelinenews', {'202608270055-aaaa-v8-fast-projects.json': q2, '202611132345-bbbb-repd-2026q3-fast-projects.json': q3},
    '202611132345-bbbb-repd-2026q3-fast-projects.json', nextRows.length);
  return root;
}

test('the registered projects asset is used, not the inherited file with the old name', () => {
  const root = fixtureRepo();
  const register = resolveRegister(root);
  assert.equal(register.release, '202611132345-pipelinenews');
  assert.match(register.path, /repd-2026q3-fast-projects\.json$/);
  assert.deepEqual(decodeProjects(register.payload).map(row => row.repd_ref), ['100', '101', '200']);
});

test('digest, count and path guards refuse a corrupted registry', () => {
  const root = fixtureRepo();
  const registry = path.join(root, 'releases/202611132345-pipelinenews/data/202608291447-registry.json');
  const original = JSON.parse(readFileSync(registry, 'utf8'));
  writeFileSync(registry, JSON.stringify({...original, assets: {projects: {...original.assets.projects, sha256: '0'.repeat(64)}}}));
  assert.throws(() => resolveRegister(root), /digest mismatch/);
  writeFileSync(registry, JSON.stringify({...original, source: {...original.source, admitted_project_count: 7}}));
  assert.throws(() => resolveRegister(root), /admits 7/);
  writeFileSync(registry, JSON.stringify({...original, assets: {projects: {...original.assets.projects, path: '../../x.json'}}}));
  assert.throws(() => resolveRegister(root), /escapes/);
});

test('delta separates new refs, removed refs, real operator renames, respellings and status changes', () => {
  const delta = computeDelta(decodeProjects(payload(Q2)), decodeProjects(payload(Q3)), {limits: {...DEFAULT_LIMITS, min_projects: 1, max_removed_fraction: 1, max_added_fraction: 1, max_operator_change_fraction: 1}});
  assert.deepEqual(delta.added, ['200']);
  assert.deepEqual(delta.removed, ['102']);
  assert.deepEqual(delta.operator_renamed.map(r => r.repd_ref), ['101']);
  assert.deepEqual(delta.operator_respelled.map(r => r.repd_ref), ['100']);
  assert.deepEqual(delta.status_changed, [{repd_ref: '100', from: 'Application Submitted', to: 'Awaiting Construction', signal: true}]);
  assert.equal(delta.gate.status, 'PASS');
  assert.deepEqual(operatorAliases(delta).get('101'), ['Beta Ltd', 'New Owner Plc']);
});

test('the gate holds a delta that looks like a broken source', () => {
  const big = Array.from({length: 1200}, (_, i) => ({repd_ref: String(1000 + i), name: `Site ${i} Solar Farm`, operator: 'Op', county: 'Kent', capacity_mw: 5}));
  const halved = big.slice(0, 600);
  const delta = computeDelta(decodeProjects(payload(big)), decodeProjects(payload(halved)));
  assert.equal(delta.gate.status, 'HOLD');
  assert.ok(delta.gate.reasons.some(reason => /removed 600/.test(reason)));
  const dup = computeDelta(decodeProjects(payload(big)), decodeProjects(payload([...big, big[0]])));
  assert.equal(dup.gate.status, 'HOLD');
  const same = computeDelta(decodeProjects(payload(big)), decodeProjects(payload(big)), {previous: {sha256: 'a'}, next: {sha256: 'a'}});
  assert.equal(same.gate.status, 'NO_CHANGE');
});

test('existing bindings are reviewed, never deleted, and new or newly consented refs lead discovery', () => {
  const q3 = decodeProjects(payload(Q3));
  const delta = computeDelta(decodeProjects(payload(Q2)), q3, {limits: {...DEFAULT_LIMITS, min_projects: 1, max_removed_fraction: 1, max_added_fraction: 1, max_operator_change_fraction: 1}});
  const reviewed = reviewBindings([{url: 'a', repd_ref: '102'}, {url: 'b', repd_ref: '100'}, {url: 'c', repd_ref: '101'}, {url: 'd', repd_ref: null}], delta);
  assert.equal(reviewed.length, 4);
  assert.equal(reviewed[0].register_review[0].flag, 'REF_REMOVED_FROM_REGISTER');
  assert.equal(reviewed[1].register_review[0].action, 'RECHECK_FOR_NEW_COVERAGE');
  assert.equal(reviewed[2].register_review[0].flag, 'OPERATOR_RENAMED');
  assert.deepEqual(discoveryPriority(delta, q3).map(row => [row.repd_ref, row.discovery_reason]),
    [['200', 'NEW_IN_REGISTER'], ['100', 'STATUS_Application Submitted_TO_Awaiting Construction']]);
});

test('a provisional row recorded under last quarter\'s operator name is queued for review, never bound', () => {
  const q3 = decodeProjects(payload(Q3));
  const delta = computeDelta(decodeProjects(payload(Q2)), q3, {limits: {...DEFAULT_LIMITS, min_projects: 1, max_removed_fraction: 1, max_added_fraction: 1, max_operator_change_fraction: 1}});
  const row = {name: 'Beta Battery Storage', operator: 'Beta Ltd', county: 'Essex', capacity_mw: 100, repd_ref: '9999-REPD-TBC', official_repd_ref: null,
    gg_project_id: 'GG2050-REPD-9999-REPD-TBC', aliases: [], identity_history: []};
  const source = {path: 'x', sha256: 'a'.repeat(64)};
  assert.equal(reconcileProvisional([row], q3, source)[0].official_repd_ref, null, 'without the delta the renamed operator does not match');
  // NL-019 decision: a name/operator match is a review item; only exact identity evidence promotes.
  const queued = reconcileProvisional([row], q3, source, {operatorAliases: operatorAliases(delta)})[0];
  assert.equal(queued.official_repd_ref, null);
  assert.equal(queued.repd_ref, '9999-REPD-TBC');
  assert.equal(queued.reconciliation.status, 'OPERATOR_ALIAS_REQUIRES_REVIEW');
  assert.deepEqual(queued.reconciliation.review_candidates, [{repd_ref: '101', operator_matches: true, county_matches: true, capacity_matches: true}]);
  // Separator respelling ("/" vs "&") is not a different developer.
  const alpha = {...row, name: 'Alpha Solar Farm', operator: 'Old Co / Partner', county: 'Kent', capacity_mw: 49.9};
  assert.equal(reconcileProvisional([alpha], q3, source)[0].official_repd_ref, '100');
  // Capacity still has to agree exactly; the near miss is listed, not bound.
  const near = reconcileProvisional([{...alpha, capacity_mw: 50}], q3, source)[0];
  assert.equal(near.official_repd_ref, null);
  assert.deepEqual(near.reconciliation.review_candidates, [{repd_ref: '100', operator_matches: true, county_matches: true, capacity_matches: false}]);
});

function cliRepo(options) {
  const root = fixtureRepo(options);
  mkdirSync(path.join(root, 'data/provisional'), {recursive: true});
  mkdirSync(path.join(root, 'cartridges'), {recursive: true});
  cpSync(path.join(repoRoot, 'tools/intelligence'), path.join(root, 'tools/intelligence'), {recursive: true, filter: src => !src.includes(`${path.sep}cartridges`)});
  cpSync(path.join(repoRoot, 'cartridges/provisional-identity.mjs'), path.join(root, 'cartridges/provisional-identity.mjs'));
  writeFileSync(path.join(root, 'data/provisional/project-register.json'), JSON.stringify({schema: 'pipelinenews.provisional-register.v1', projects: [
    {source_key: 'bbc:x:cearn', name: 'Cearn Solar Farm', operator: 'Telis Energy UK', county: 'Oxfordshire', capacity_mw: 500,
      repd_ref: '9999-REPD-TBC', official_repd_ref: null, gg_project_id: 'GG2050-REPD-9999-REPD-TBC', identity_status: 'REPD_PENDING', aliases: [], identity_history: []}]}, null, 2) + '\n');
  return root;
}
const runCli = root => JSON.parse(execFileSync(process.execPath, ['tools/intelligence/reconcile-provisional.mjs'], {cwd: root, encoding: 'utf8'}).trim());

test('reconcile-provisional CLI reads the registered Q3 payload and binds a project new in Q3', () => {
  const root = cliRepo({pad: true});
  const out = runCli(root);
  assert.match(out.source.path, /repd-2026q3-fast-projects\.json$/);
  assert.equal(out.gate, 'PASS');
  assert.equal(out.matched, 1);
  const saved = JSON.parse(readFileSync(path.join(root, 'data/provisional/project-register.json'), 'utf8')).projects[0];
  assert.equal(saved.repd_ref, '200');
  assert.ok(saved.aliases.includes('9999-REPD-TBC'));
});

test('reconcile-provisional CLI leaves the register untouched when the new quarter is held', () => {
  const root = cliRepo({pad: false}); // 3-project register: below the 1,000-project floor
  const before = readFileSync(path.join(root, 'data/provisional/project-register.json'), 'utf8');
  const out = runCli(root);
  assert.equal(out.gate.status, 'HOLD');
  assert.equal(readFileSync(path.join(root, 'data/provisional/project-register.json'), 'utf8'), before);
});
