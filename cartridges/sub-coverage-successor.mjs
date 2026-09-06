// PIPELINE-03: carry published substation observations at 33 kV or above; never infer available capacity.
const identity=value=>(typeof value==='string'||typeof value==='number')&&/^\d+$/.test(String(value));
export const substationBand=km=>km<=1?'STRONG':km<=3?'MODERATE':km<=10?'DISTANT':'REMOTE';
export function completeSubCoverage(proximity,baseline) {
  if(proximity?.schema!=='pipelinenews.v9.grid-proximity.v1'||!Array.isArray(proximity.rows))throw Error('Unsupported proximity source');
  if(baseline?.schema!=='pipelinenews.substation-33kv.v1'||!baseline.substation||typeof baseline.substation!=='object'||Array.isArray(baseline.substation))throw Error('Unsupported SUB baseline');
  if(proximity.earth_model?.radius_km!==6378.137||baseline.earth_model?.radius_km!==6378.137)throw Error('Source Earth-model radius mismatch');
  if(baseline.scope?.minimum_kv!==33)throw Error('Baseline SUB minimum voltage must be 33 kV');
  const rows=new Map(),invalid=[];
  for(const [index,row] of proximity.rows.entries()) {
    if(!identity(row.ref)){invalid.push({index,ref:row.ref??null,name:row.name||'',reason:'missing-or-invalid-repd-identity'});continue;}
    const id=String(row.ref);if(rows.has(id))throw Error('Duplicate proximity REPD '+id);rows.set(id,row);
  }
  const substation=structuredClone(baseline.substation);
  for(const id of Object.keys(substation)) {
    if(!identity(id))throw Error('Invalid existing SUB identity '+id);
    if(!rows.has(id))throw Error('Existing SUB identity absent from proximity source: '+id);
  }
  const added=[],unavailable=[],voltageNotes=[];
  for(const [id,row] of rows) {
    if(Object.hasOwn(substation,id))continue;
    const station=row.substation;
    const missing=reason=>unavailable.push({ref:id,name:row.name||'',reason});
    if(station?.km==null){missing('no-published-substation-distance');continue;}
    if(typeof station.km!=='number'||!Number.isFinite(station.km)||station.km<0||Math.abs(station.km*1000-Math.round(station.km*1000))>1e-7)throw Error('REPD '+id+': substation distance must be finite nonnegative kilometres at published three-decimal precision');
    if(!Array.isArray(station.kv)||!station.kv.length){missing('substation-voltage-unavailable');continue;}
    if(station.kv.some(kv=>typeof kv!=='number'||!Number.isFinite(kv)||kv<0))throw Error('REPD '+id+': substation voltages must be nonnegative published kV numbers');
    if(!station.kv.some(kv=>kv>=33)){missing('published-substation-below-33kv');continue;}
    const entry={k:station.km};
    if(station.name){if(typeof station.name!=='string')throw Error('Invalid substation name');entry.n=station.name;}
    entry.v=station.kv.filter(kv=>kv>0);
    if(entry.v.length!==station.kv.length)voltageNotes.push({ref:id,source_kv:structuredClone(station.kv),projected_kv:entry.v,reason:'Zero source tokens do not establish a voltage; positive published kV values retained without conversion.'});
    entry.b=substationBand(station.km);substation[id]=entry;added.push(id);
  }
  const bands={};for(const entry of Object.values(substation))bands[entry.b]=(bands[entry.b]||0)+1;
  return {substation,audit:{schema:'pipelinenews.sub-coverage-successor-audit.v1',baseline_count:Object.keys(baseline.substation).length,proximity_count:proximity.rows.length,valid_proximity_count:rows.size,added_count:added.length,output_count:Object.keys(substation).length,added_refs:added,invalid_proximity:invalid,unavailable,voltage_notes:voltageNotes,preserved_existing_values:true,minimum_kv:33,units:{distance:'km',voltage:'kV'},bands,
    derivation:'Published substation.km/name/kv copied without remeasurement. Each new station explicitly carries at least one voltage >=33 kV. Historical inclusive 1/3/10 km band fields remain backend compatibility metadata only; never a UI grade.',
    boundary:'Nearest mapped station is not necessarily the nearest station on the ground. This observation does not establish connection suitability, rights, capacity, fault level, thermal headroom or cable routing.'}};
}
export function serializeSubSuccessor(metadata,substation,baselineText) {
  const baseline=JSON.parse(baselineText);
  const raw=new Map([...baselineText.matchAll(/"([0-9]+)"\s*:\s*(\{[^{}]*\})/g)].map(match=>[match[1],match[0]]));
  for(const [id,entry] of Object.entries(baseline.substation)) {
    const encoded=raw.get(id);
    if(!encoded||JSON.stringify(JSON.parse('{'+encoded+'}')[id])!==JSON.stringify(entry))throw Error('Cannot preserve SUB baseline bytes for '+id);
    if(JSON.stringify(substation[id])!==JSON.stringify(entry))throw Error('Existing SUB entry changed: '+id);
  }
  if(Object.hasOwn(metadata,'substation'))throw Error('Metadata must not contain a SUB index');
  return JSON.stringify(metadata).slice(0,-1)+(Object.keys(metadata).length?',':'')+'"substation":{'+Object.keys(substation).map(id=>raw.get(id)||JSON.stringify(id)+':'+JSON.stringify(substation[id])).join(',')+'}}\n';
}
