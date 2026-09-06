import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {completeGridCoverage,circuitBand,serializeGridSuccessor,countActiveCoverage} from './grid-coverage-successor.mjs';
const base='releases/202609050309-pipelinenews/data/';
const blob=name=>execFileSync('git',['show','HEAD:'+base+name],{encoding:'utf8',maxBuffer:16*1024*1024});
const baselineText=blob('202608311800-grid-distance.json');
const baseline=JSON.parse(baselineText),proximity=JSON.parse(blob('202608311610-grid-proximity.json'));
const fixtures=()=>({p:{schema:proximity.schema,earth_model:{radius_km:6378.137},rows:[{ref:'1',circuit:{km:1,kv:33}},{ref:'2',circuit:{km:2.001,kv:132},circuit_transmission:{km:2.001,kv:132},circuit_distribution:{km:9.001,kv:33}}]},g:{schema:baseline.schema,earth_model:{radius_km:6378.137},grid:{'1':{k:1,v:33,b:'STRONG'}}}});

test('active coverage uses actual register membership and selected source, including fallback and absent coordinates',()=>{
  const projects=[{repd_ref:'1',geometry_status:'valid'},{repd_ref:'2',geometry_status:'valid'},{repd_ref:'3',geometry_status:'missing'}];
  assert.deepEqual(countActiveCoverage(projects,{'1':{k:0},'99':{k:1}}),{total:3,measured:1,unavailable:2,missingCoordinates:1});
  assert.deepEqual(countActiveCoverage(projects,{'1':{k:0},'2':{k:2}}),{total:3,measured:2,unavailable:1,missingCoordinates:1});
  assert.deepEqual(countActiveCoverage(projects,{'1':{k:NaN},'2':{k:-1},'3':{k:'0'}}),{total:3,measured:0,unavailable:3,missingCoordinates:1});
});

test('all 3047 baseline values and serialized entry bytes survive; exactly 1090 valid source identities added',()=>{
  const before=JSON.stringify(baseline);
  const result=completeGridCoverage(proximity,baseline);
  assert.equal(result.audit.baseline_count,3047);assert.equal(result.audit.proximity_count,4138);assert.equal(result.audit.valid_proximity_count,4137);assert.equal(result.audit.added_count,1090);assert.equal(result.audit.output_count,4137);assert.equal(result.audit.invalid_proximity.length,1);assert.equal(result.audit.unavailable.length,0);
  assert.equal(result.audit.invalid_proximity[0].ref,'');
  for(const [id,value] of Object.entries(baseline.grid))assert.deepEqual(result.grid[id],value);
  const output=serializeGridSuccessor({schema:baseline.schema},result.grid,baselineText);
  for(const match of baselineText.matchAll(/"([0-9]+)"\s*:\s*(\{[^{}]*\})/g))assert.ok(output.includes(match[0]),'Original raw entry absent: '+match[1]);
  assert.deepEqual(JSON.parse(output).grid,result.grid);assert.equal(JSON.stringify(baseline),before);
});
test('every new key carries the actual source circuit and split numbers; nearest station never substitutes',()=>{
  const result=completeGridCoverage(proximity,baseline);
  const rows=new Map(proximity.rows.map(row=>[String(row.ref),row]));
  for(const id of result.audit.added_refs) {
    const row=rows.get(id),entry=result.grid[id];
    assert.equal(entry.k,row.circuit.km);assert.equal(entry.v,row.circuit.kv);
    assert.equal(entry.t,row.circuit_transmission?.km);assert.equal(entry.tv,row.circuit_transmission?.kv);
    assert.equal(entry.d,row.circuit_distribution?.km);assert.equal(entry.dv,row.circuit_distribution?.kv);
  }
  assert.deepEqual(result.grid['14926'],{k:1.836,v:275,t:1.836,tv:275,d:3.755,dv:33,b:'STRONG'});
  const {p,g}=fixtures();p.rows[1].grid_probable={band:'STRONG',circuit_km:0};p.rows[1].substation={km:0};
  assert.equal(completeGridCoverage(p,g).grid['2'].b,'MODERATE');
});
test('bands preserve inclusive boundaries, including genuine zero distance',()=>{
  assert.deepEqual([0,2,2.001,5,5.001,15,15.001].map(circuitBand),['STRONG','STRONG','MODERATE','MODERATE','DISTANT','DISTANT','REMOTE']);
  const {p,g}=fixtures();p.rows[1].circuit.km=0;assert.equal(completeGridCoverage(p,g).grid['2'].k,0);
});
test('missing circuit and missing identity stay unavailable; malformed numbers or duplicate keys fail closed',()=>{
  const {p,g}=fixtures();p.rows.push({ref:'',name:'Unidentified',circuit:{km:1,kv:33}});delete p.rows[1].circuit;
  let result=completeGridCoverage(p,g);assert.equal(result.audit.unavailable.length,1);assert.equal(result.audit.invalid_proximity.length,1);assert.equal(Object.keys(result.grid).length,1);
  for(const km of [-1,NaN,Infinity,'1',1.0001]){p.rows[1].circuit={km,kv:33};assert.throws(()=>completeGridCoverage(p,g),/distance/);}
  p.rows[1].circuit={km:1,kv:'33000'};assert.throws(()=>completeGridCoverage(p,g),/voltage/);
  p.rows[1].circuit={km:1,kv:33};p.rows.push({ref:2,circuit:{km:2,kv:33}});assert.throws(()=>completeGridCoverage(p,g),/Duplicate/);
});
test('source radius, baseline extra identity and altered baseline entry cannot be silently accepted',()=>{
  const {p,g}=fixtures();p.earth_model.radius_km=6371;assert.throws(()=>completeGridCoverage(p,g),/radius/);
  p.earth_model.radius_km=6378.137;g.grid['3']={k:1};assert.throws(()=>completeGridCoverage(p,g),/absent/);
  delete g.grid['3'];const result=completeGridCoverage(p,g);result.grid['1'].k=99;assert.throws(()=>serializeGridSuccessor({},result.grid,JSON.stringify(g)),/changed/);
});
