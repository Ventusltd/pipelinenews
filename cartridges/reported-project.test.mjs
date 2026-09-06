import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateReportedProject} from './reported-project.mjs';
const load=()=>JSON.parse(readFileSync(new URL('../discovery/inbox/202609060208-cearn-project-evidence.json',import.meta.url)));
test('Cearn stays news-only; Botley West cost cannot leak into its claims',()=>{
 const p=validateReportedProject(load());
 assert.equal(p.claims.find(x=>x.metric==='solar_capacity').value,500);
 assert.equal(p.claims.some(x=>x.metric==='project_cost'),false);
 assert.equal(p.related_projects[0].claims.find(x=>x.metric==='solar_capacity').value,840);
 assert.equal(p.repd_ref,null);assert.equal(p.geometry,null);assert.equal(p.eligible_for_project_signal,false);
});
test('mixed subjects and invented bindings fail closed',()=>{
 const p=load();p.claims.push(p.related_projects[0].claims[1]);assert.throws(()=>validateReportedProject(p),/Cross-project/);
 const q=load();q.eligible_for_project_signal=true;assert.throws(()=>validateReportedProject(q),/Unmatched/);
 const r=load();r.claims.find(x=>x.metric==='solar_capacity').unit='MWh';assert.throws(()=>validateReportedProject(r),/MW/);
});
test('the declared pinned name search is reproduced against all project rows',()=>{
 const p=load();const data=JSON.parse(readFileSync(new URL('../'+p.snapshot_check.path,import.meta.url)));
 assert.equal(data.rows.length,p.snapshot_check.rows);
 const name=data.fields.indexOf('name');assert.notEqual(name,-1);
 assert.equal(data.rows.filter(row=>row[name].toLowerCase().includes('cearn')).length,0);
});
