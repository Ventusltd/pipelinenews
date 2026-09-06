import {test} from 'node:test';import assert from 'node:assert/strict';
import {allocateProvisional,reconcileProvisional,resolveProject} from './provisional-identity.mjs';
const project={source_key:'bbc:c4gmkezn4nlo:cearn',name:'Cearn Solar Farm',operator:'Telis Energy UK',county:'Oxfordshire',capacity_mw:500};
const source={path:'quarterly-repd.json',sha256:'a'.repeat(64)};
test('one-time IDs are unique and retries preserve the allocated barcode',()=>{
 const a=allocateProvisional([],project);assert.equal(a.repd_ref,'9999-REPD-TBC');
 assert.equal(a.gg_project_id,'GG2050-REPD-9999-REPD-TBC');
 assert.deepEqual(allocateProvisional([a],project),a);
 assert.equal(allocateProvisional([a],{...project,source_key:'another-article-same-project'}).repd_ref,'9999-REPD-TBC');
 assert.equal(allocateProvisional([a],{...project,source_key:'another',name:'Another Solar Farm'}).repd_ref,'10000-REPD-TBC');
});
test('quarterly match replaces the number on the same row and keeps old links',()=>{
 const a=allocateProvisional([],project),official={...project,repd_ref:'25001'};
 const rows=reconcileProvisional([a],[official],source);assert.equal(rows.length,1);
 assert.equal(rows[0].repd_ref,'25001');assert.equal(rows[0].gg_project_id,'GG2050-REPD-25001');
 assert.equal(resolveProject(rows,'9999-REPD-TBC'),rows[0]);
 assert.equal(resolveProject(rows,a.gg_project_id),rows[0]);
 assert.deepEqual(reconcileProvisional(rows,[official],source),rows);
});
test('ambiguous, wrong developer and reused official IDs cannot overwrite a provisional row',()=>{
 const a=allocateProvisional([],project),official={...project,repd_ref:'25001'};
 for(const candidates of [[official,{...official,repd_ref:'25002'}],[{...official,operator:'Another developer'}]])
  assert.equal(reconcileProvisional([a],candidates,source)[0].repd_ref,a.repd_ref);
 const bound={...a,repd_ref:'25001',official_repd_ref:'25001'};
 assert.equal(reconcileProvisional([bound,a],[official],source)[1].repd_ref,a.repd_ref);
});
