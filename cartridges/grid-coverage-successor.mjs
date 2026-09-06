// PIPELINE-02: a projection of published mapped-circuit distances, not a new route or headroom calculation.
const validRef=value=>(typeof value==='string'||typeof value==='number')&&/^\d+$/.test(String(value));
const radius=6378.137;
export function countActiveCoverage(projects,index) {
  const counts={total:projects.length,measured:0,unavailable:0,missingCoordinates:0};
  for(const project of projects) {
    const km=index?.[String(project.repd_ref)]?.k;
    if(typeof km==='number'&&Number.isFinite(km)&&km>=0)counts.measured++;
    else counts.unavailable++;
    if(project.geometry_status!=='valid')counts.missingCoordinates++;
  }
  return counts;
}
export function circuitBand(km) {
  return km<=2?'STRONG':km<=5?'MODERATE':km<=15?'DISTANT':'REMOTE';
}
function distance(value,label) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw Error(label+': distance must be a finite nonnegative number of kilometres');
  if(Math.abs(value*1000-Math.round(value*1000))>1e-7)throw Error(label+': source distance exceeds published three-decimal kilometre precision');
  return value;
}
function voltage(value,label) {
  if(value==null)return null;
  if(typeof value!=='number'||!Number.isFinite(value)||value<=0)throw Error(label+': voltage must be a positive number of kV');
  return value;
}
function projectCircuit(row) {
  if(row.circuit?.km==null)return null;
  const km=distance(row.circuit.km,'REPD '+row.ref);
  const entry={k:km};
  const kv=voltage(row.circuit.kv,'REPD '+row.ref);if(kv!==null)entry.v=kv;
  for(const [field,prefix] of [['circuit_transmission','t'],['circuit_distribution','d']]) {
    if(row[field]?.km!=null){entry[prefix]=distance(row[field].km,field+' REPD '+row.ref);entry[prefix+'v']=voltage(row[field].kv,field+' REPD '+row.ref);}
  }
  entry.b=circuitBand(km);return entry;
}

export function completeGridCoverage(proximity,baseline) {
  if(proximity?.schema!=='pipelinenews.v9.grid-proximity.v1'||!Array.isArray(proximity.rows))throw Error('Unsupported proximity source');
  if(baseline?.schema!=='pipelinenews.grid-distance.v1'||!baseline.grid||typeof baseline.grid!=='object'||Array.isArray(baseline.grid))throw Error('Unsupported baseline GRID index');
  if(proximity.earth_model?.radius_km!==radius||baseline.earth_model?.radius_km!==radius)throw Error('Source Earth-model radius mismatch');
  const rows=new Map(),invalid=[];
  for(const [index,row] of proximity.rows.entries()) {
    if(!validRef(row.ref)){invalid.push({index,ref:row.ref??null,name:row.name||'',reason:'missing-or-invalid-repd-identity'});continue;}
    const id=String(row.ref);if(rows.has(id))throw Error('Duplicate proximity REPD '+id);rows.set(id,row);
  }
  const grid=structuredClone(baseline.grid);
  for(const id of Object.keys(grid)) {
    if(!validRef(id))throw Error('Invalid existing GRID identity '+id);
    if(!rows.has(id))throw Error('Existing GRID identity absent from proximity source: '+id);
  }
  const added=[],unavailable=[];
  for(const [id,row] of rows) {
    if(Object.hasOwn(grid,id))continue;
    const projected=projectCircuit(row);
    if(projected){grid[id]=projected;added.push(id);}
    else unavailable.push({ref:id,name:row.name||'',reason:'no-published-circuit-distance'});
  }
  const counts={};for(const entry of Object.values(grid))counts[entry.b]=(counts[entry.b]||0)+1;
  return {
    grid,
    audit:{schema:'pipelinenews.grid-coverage-successor-audit.v1',baseline_count:Object.keys(baseline.grid).length,proximity_count:proximity.rows.length,valid_proximity_count:rows.size,added_count:added.length,output_count:Object.keys(grid).length,added_refs:added,invalid_proximity:invalid,unavailable,
      preserved_existing_values:true,derivation:'Published circuit.km/kv and transmission/distribution km/kv copied without remeasurement; circuit-only bands use existing inclusive 2/5/15 km boundaries.',units:{distance:'km',voltage:'kV'},bands:counts,
      boundary:'Mapped straight-line first pass only. Not a cable route, connection voltage, firm capacity or thermal/fault headroom. Missing identity is excluded; missing distance remains unavailable.'}
  };
}

// The old entries' exact JSON bytes are retained, including number spellings and key order.
export function serializeGridSuccessor(metadata,grid,baselineText) {
  const baseline=JSON.parse(baselineText);
  const raw=new Map([...baselineText.matchAll(/"([0-9]+)"\s*:\s*(\{[^{}]*\})/g)].map(match=>[match[1],match[0]]));
  for(const [id,entry] of Object.entries(baseline.grid)) {
    const encoded=raw.get(id);
    if(!encoded||JSON.stringify(JSON.parse('{'+encoded+'}')[id])!==JSON.stringify(entry))throw Error('Cannot preserve baseline entry bytes for '+id);
    if(JSON.stringify(grid[id])!==JSON.stringify(entry))throw Error('Existing GRID entry changed: '+id);
  }
  const head=JSON.stringify(metadata);
  if(Object.hasOwn(metadata,'grid'))throw Error('Metadata must not contain a GRID index');
  return head.slice(0,-1)+',"grid":{'+Object.keys(grid).map(id=>raw.get(id)||JSON.stringify(id)+':'+JSON.stringify(grid[id])).join(',')+'}}\n';
}
