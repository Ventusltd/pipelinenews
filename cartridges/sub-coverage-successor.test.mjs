import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {completeSubCoverage,serializeSubSuccessor,substationBand} from './sub-coverage-successor.mjs';
const base='releases/202609050309-pipelinenews/data/';
const blob=path=>execFileSync('git',['show','HEAD:'+path],{encoding:'utf8',maxBuffer:16*1024*1024});
const text=blob(base+'202608311858-substation-33kv.json'),baseline=JSON.parse(text),proximity=JSON.parse(blob(base+'202608311610-grid-proximity.json'));
const fixture=()=>({p:{schema:proximity.schema,earth_model:{radius_km:6378.137},rows:[{ref:'1'},{ref:'2',substation:{km:1.23,name:'Test 33/11 station',kv:[33,11]}}]},b:{schema:baseline.schema,earth_model:{radius_km:6378.137},scope:{minimum_kv:33},substation:{'1':{k:0.001,v:[33],b:'STRONG'}}}});
test('preserve all3047 SUB values/raw entry bytes and add exactly1090 qualifying identities',()=>{
  const result=completeSubCoverage(proximity,baseline);
  assert.equal(result.audit.baseline_count,3047);assert.equal(result.audit.added_count,1090);assert.equal(result.audit.output_count,4137);assert.equal(result.audit.invalid_proximity.length,1);assert.equal(result.audit.unavailable.length,0);assert.equal(result.audit.voltage_notes.length,25);
  for(const [id,value] of Object.entries(baseline.substation))assert.deepEqual(result.substation[id],value);
  const output=serializeSubSuccessor({schema:baseline.schema},result.substation,text);
  for(const match of text.matchAll(/"([0-9]+)"\s*:\s*(\{[^{}]*\})/g))assert.ok(output.includes(match[0]),'raw SUB entry '+match[1]);
  assert.deepEqual(JSON.parse(output).substation,result.substation);
  const rows=new Map(proximity.rows.map(row=>[String(row.ref),row]));
  for(const id of result.audit.added_refs){const source=rows.get(id).substation;assert.equal(result.substation[id].k,source.km);assert.deepEqual(result.substation[id].v,source.kv.filter(kv=>kv>0));assert.ok(source.kv.some(kv=>kv>=33));assert.equal(result.substation[id].n,source.name||undefined);}
  assert.deepEqual(result.substation['14926'],{k:0.66,n:'Torryburn Primary Substation',v:[33,11],b:'STRONG'});
});
test('below33kV, unknownvoltage, missingstation andblankidentity remain explicitly unavailable',()=>{
  for(const [station,reason] of [[{km:1,kv:[11]},'published-substation-below-33kv'],[{km:1,kv:[]},'substation-voltage-unavailable'],[null,'no-published-substation-distance']]){const {p,b}=fixture();p.rows[1].substation=station;p.rows.push({ref:'',substation:{km:0,kv:[33]}});const result=completeSubCoverage(p,b);assert.equal(Object.keys(result.substation).length,1);assert.equal(result.audit.unavailable[0].reason,reason);assert.equal(result.audit.invalid_proximity.length,1);}
});
test('badunits, distances, duplicateIDs and incompatible source scope fail closed',()=>{
  for(const km of [-1,NaN,Infinity,'0',1.00001]){const {p,b}=fixture();p.rows[1].substation.km=km;assert.throws(()=>completeSubCoverage(p,b),/distance/);}
  const {p,b}=fixture();p.rows[1].substation.kv=['33000'];assert.throws(()=>completeSubCoverage(p,b),/voltages/);p.rows[1].substation.kv=[33];p.rows.push({ref:2});assert.throws(()=>completeSubCoverage(p,b),/Duplicate/);p.rows.pop();b.scope.minimum_kv=11;assert.throws(()=>completeSubCoverage(p,b),/minimum/);b.scope.minimum_kv=33;p.earth_model.radius_km=6371;assert.throws(()=>completeSubCoverage(p,b),/radius/);
});
test('legacybackendbands retaininclusive1/3/10boundaries; original entry mutation rejected',()=>{
  assert.deepEqual([0,1,1.001,3,3.001,10,10.001].map(substationBand),['STRONG','STRONG','MODERATE','MODERATE','DISTANT','DISTANT','REMOTE']);
  const {p,b}=fixture();p.rows[1].substation.km=0;const result=completeSubCoverage(p,b);assert.equal(result.substation['2'].k,0);result.substation['1'].k=3;assert.throws(()=>serializeSubSuccessor({},result.substation,JSON.stringify(b)),/changed/);
});
test('current GRID/SUB consumer renders numericmeasurements withneutralcolor, neverbackendgrades',()=>{
  const app=blob('releases/202609060232-pipelinenews/assets/202608291447-app.mjs');
  const html=blob('releases/202609060232-pipelinenews/index.html');
  const start=app.indexOf('function metricChip('),end=app.indexOf('\n// Distance to the nearest mapped circuit',start);
  const context={escapeHtml:String};vm.createContext(context);vm.runInContext(app.slice(start,end),context);
  for(const band of ['STRONG','MODERATE','DISTANT','REMOTE'])for(const label of ['GRID','SUB']){const rendered=context.metricChip({ready:true,hit:{k:1.23,b:band},located:true,label,unitSuffix:'',lines:['Measurement only']});assert.match(rendered,/<b>1.23<\/b>/);assert.ok(!rendered.includes(band));assert.ok(!rendered.includes('data-band'));}
  assert.match(html,/\.action-metric b\s*\{\s*color:\s*#5fbdc2;/);
  assert.ok(!/\[(?:data-band)\s*=/.test(html));
});
