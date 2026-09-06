import test from 'node:test';import assert from 'node:assert/strict';import {summarizeCoverage} from './metric-coverage.mjs';
test('coverage counts membership in the active register, not unrelated source-index entries',()=>{
 const projects=[{repd_ref:'1',geometry_status:'valid',longitude:1,latitude:51},{repd_ref:'2',geometry_status:'missing',longitude:null,latitude:null}];
 assert.deepEqual(summarizeCoverage(projects,{'1':{k:0},'99':{k:2}}),{available:true,total:2,measured:1,withoutCoordinates:1,sourceKeys:2});
 assert.equal(summarizeCoverage(projects,null).available,false);assert.equal(summarizeCoverage(projects,{}).available,true);
 assert.equal(summarizeCoverage(projects,{'1':{k:NaN},'2':{k:-1}}).measured,0);
});
