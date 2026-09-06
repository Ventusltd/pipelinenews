import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditCoverage } from './coverage-join-audit.mjs';

test('equal counts with different identities cannot claim parity', () => {
  const result = auditCoverage({rows:[{ref:'1',tech:'solar'}]}, {grid:{2:{k:0}}}, {substation:{1:null}});
  assert.equal(result.equalKeySets, false);
  assert.deepEqual(result.missingGrid, ['1']);
  assert.deepEqual(result.extraGrid, ['2']);
  assert.equal(result.counts.substation, 1); // coverage is presence, not usable geometry
});
test('duplicate and invalid identities fail rather than inflate coverage', () => {
  assert.throws(() => auditCoverage({rows:[{ref:'1'},{ref:1}]}, {grid:{}}, {substation:{}}), /duplicate/);
  assert.equal(auditCoverage({rows:[{ref:null}]}, {grid:{}}, {substation:{}}).invalidProximity.length, 1);
  assert.throws(() => auditCoverage({rows:[]}, {grid:[]}, {substation:{}}), /index/);
});
test('pinned 202609050309 release exposes the exact missing project sets', () => {
  const base = new URL('../releases/202609050309-pipelinenews/data/', import.meta.url);
  const load = name => JSON.parse(readFileSync(new URL(name, base)));
  const result = auditCoverage(load('202608311610-grid-proximity.json'), load('202608311800-grid-distance.json'), load('202608311858-substation-33kv.json'));
  assert.deepEqual(result.counts, {proximity:4138, validProximityIdentities:4137, grid:3047, substation:3047});
  assert.equal(result.missingGrid.length, 1090);
  assert.deepEqual(result.missingGrid, result.missingSubstation);
  assert.deepEqual(result.extraGrid, []);
  assert.deepEqual(result.extraSubstation, []);
  assert.equal(result.equalKeySets, false);
});
