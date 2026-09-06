import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const kind=process.argv[2],parent=process.argv[3];
if(!['grid','sub'].includes(kind)||!/^\d{12}-pipelinenews$/.test(parent||''))throw Error('Usage: prepare-wider-coverage.mjs grid|sub parent-release');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sources=[];
function blob(path){const bytes=execFileSync('git',['show',`${commit}:${path}`],{maxBuffer:32*1024*1024});sources.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});return bytes.toString();}
const modelText=blob(`cartridges/${kind}-coverage-successor.mjs`);
const model=await import('data:text/javascript;base64,'+Buffer.from(modelText).toString('base64'));
const base='releases/202609050309-pipelinenews/data/';
const baselineText=blob(base+(kind==='grid'?'202608311800-grid-distance.json':'202608311858-substation-33kv.json'));
const baseline=JSON.parse(baselineText),proximity=JSON.parse(blob(base+'202608311610-grid-proximity.json'));
const result=kind==='grid'?model.completeGridCoverage(proximity,baseline):model.completeSubCoverage(proximity,baseline);
if(result.audit.baseline_count!==3047||result.audit.added_count!==1090||result.audit.output_count!==4137)throw Error('Pinned acceptance counts changed');
const field=kind==='grid'?'grid':'substation',metadata=structuredClone(baseline);delete metadata[field];
metadata.generation='{GEN}';metadata.projects=4137;
metadata.coverage_successor={baseline_projects:3047,added_projects:1090,source_commit:commit,derivation:result.audit.derivation,active_spine_measured:3047};
metadata.earth_model={radius_km:6378.137,formula:baseline.earth_model.formula,successor_method:'Published owner observations projected without remeasurement; original entries preserved.'};
metadata.bands.counts=result.audit.bands;metadata.bands.display='Compatibility metadata only; no UI grades.';
const key=`wider_${kind}_coverage`,root=`tools/intelligence/cartridges/${key}`;
mkdirSync(root+'/data',{recursive:true});mkdirSync(root+'/assets',{recursive:true});
const payloadPath=`data/{GEN}-${kind}-coverage.json`,auditPath=`data/{GEN}-${kind}-coverage-audit.json`;
writeFileSync(root+'/'+payloadPath,kind==='grid'?model.serializeGridSuccessor(metadata,result.grid,baselineText):model.serializeSubSuccessor(metadata,result.substation,baselineText));
writeFileSync(root+'/'+auditPath,JSON.stringify(result.audit,null,2)+'\n');
const app=readFileSync(`releases/${parent}/assets/202608291447-app.mjs`,'utf8').replace(/\r\n/g,'\n');
const functionName=kind==='grid'?'loadGridDistance':'loadSubstation33kv',next=kind==='grid'?'loadLocality':'loadGridDistance';
const start=app.indexOf(`async function ${functionName}() {`);
const match=/\n(?:async )?function /g;match.lastIndex=start+1;const end=match.exec(app)?.index;
if(start<0||!end)throw Error('Loader boundary missing');
const original=app.slice(start,end).trimEnd(),baselineKey=kind==='grid'?'grid_distance_column':'grid_actions_inline';
const index=kind==='grid'?'gridDistance':'substation';
const loader=`async function ${functionName}() {
  for(const entry of [registry.supplemental_assets?.${key},registry.supplemental_assets?.${baselineKey}].filter(Boolean)) {
    try {
      runtimeEvidence.${kind==='grid'?'gridDistance':'substation'}Requests += 1;
      const payload=await fetchImmutable(entry.payload.path);
      invariant(payload.schema===entry.payload.schema && payload.generation===entry.generation,'${kind} coverage identity mismatch');
      invariant(payload.${field} && typeof payload.${field}==='object' && !Array.isArray(payload.${field}),'${kind} coverage index missing');
      ${index}=payload.${field};
      runtimeEvidence.${kind==='grid'?'gridDistance':'substation'}Ready=true;
      runtimeEvidence.${kind}CoverageSource=entry.generation;
      return;
    } catch(error) { runtimeEvidence.${kind}CoverageFallback=true; }
  }
  ${index}=null;
}`;
const repairs={app:[{label:'Load exact-identity owner coverage with existing baseline fallback',from:original,to:loader}]};
if(kind==='grid') {
  const actions=blob('cartridges/wider-grid-actions.mjs');
  writeFileSync(root+'/assets/{GEN}-wider-metrics.mjs',actions);
  repairs.app.push({label:'Import neutral wider fleet metric presentation',from:app.split('\n')[0],to:`import {widerMetricActions} from './{GEN}-wider-metrics.mjs';\n`+app.split('\n')[0]});
  repairs.app.push({label:'Pass exact GRID observations through existing cartridge seam',from:'  const result = await cartridge.mountWiderFleet({\n    host,',to:'  const result = await cartridge.mountWiderFleet({\n    host,\n    metricActions: row => widerMetricActions(row, gridDistance),'});
  repairs.assets=[{path:'assets/202609040044-wider-fleet.mjs',edits:[
    {label:'Accept optional distance renderer without reading spine state',from:'mountWiderFleet({ host, payloadAsset, presentSummary, onSpineRepaint })',to:'mountWiderFleet({ host, payloadAsset, presentSummary, onSpineRepaint, metricActions = () => "" })'},
    {label:'Show per-record GRID beside MAP',from:'${mapActions(row)}</div>',to:'${mapActions(row)} ${metricActions(row)}</div>'}
  ]}];
} else repairs.app.push({label:'Show SUB alongside wider GRID with each exact identity',from:'metricActions: row => widerMetricActions(row, gridDistance),',to:"metricActions: row => widerMetricActions(row, gridDistance) + ' ' + widerMetricActions(row, substation, 'SUB'),"});
const manifest={key,summary:`Expose published ${kind.toUpperCase()} distances for exact wider-fleet identities beside MAP.`,modifies_existing_dashboard:true,modification_note:'Existing main-spine measurements preserved; no additional core records claimed. Grouped references remain individually attributed.',repairs,
  hash_fields:[{at:['payload','sha256'],path:payloadPath},{at:['audit','sha256'],path:auditPath}],
  registry_entry:{schema:`pipelinenews.${key}.v1`,generation:'{GEN}',source_commit:commit,sources,payload:{schema:baseline.schema,path:payloadPath},audit:{schema:result.audit.schema,path:auditPath},added_owner_identities:1090,original_entries_preserved:3047,core_measured_unchanged:3047,engineering_boundary:result.audit.boundary}};
writeFileSync(root+'/cartridge.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({key,parent,source_commit:commit,ownerIdentities:4137,coreMeasured:3047}));
