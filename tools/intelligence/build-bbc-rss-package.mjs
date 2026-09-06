import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='tools/intelligence/cartridges/bbc-rss-intelligence';
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const draft=process.argv.includes('--draft');
const sources=[];
function source(path) {
  const bytes=draft&&path.startsWith('cartridges/bbc-rss-pipeline-')?Buffer.from(readFileSync(path,'utf8').replace(/\r\n/g,'\n')):execFileSync('git',['show',`${sha}:${path}`]);
  sources.push({path,sha256:createHash('sha256').update(bytes).digest('hex'),basis:draft&&path.startsWith('cartridges/bbc-rss-pipeline-')?'uncommitted draft':'committed Git blob'});
  return bytes;
}
mkdirSync(root+'/assets',{recursive:true});mkdirSync(root+'/data',{recursive:true});
const model=source('cartridges/bbc-rss-pipeline-model.mjs').toString().replace("'./reported-project.mjs'","'./{GEN}-bbc-reported-project.mjs'");
const panel=source('cartridges/bbc-rss-pipeline-panel.mjs').toString().replace("'./bbc-rss-pipeline-model.mjs'","'./{GEN}-bbc-rss-pipeline-model.mjs'");
writeFileSync(root+'/assets/{GEN}-bbc-rss-pipeline-model.mjs',model);
writeFileSync(root+'/assets/{GEN}-bbc-rss-pipeline.mjs',panel);
writeFileSync(root+'/assets/{GEN}-bbc-reported-project.mjs',source('cartridges/reported-project.mjs'));
const payload={schema:'pipelinenews.bbc-rss-pipeline-payload.v1',rss:JSON.parse(source('discovery/products/bbc-rss.json')),evidence:[JSON.parse(source('discovery/inbox/202609060208-cearn-project-evidence.json'))],projects:JSON.parse(source('data/provisional/project-register.json')).projects};
writeFileSync(root+'/data/{GEN}-bbc-rss-pipeline.json',JSON.stringify(payload,null,2)+'\n');
const manifest={key:'bbc_rss_intelligence',summary:'Automated BBC RSS discovery with freshness, source health and separate reported project evidence inside the full Pipeline app.',modifies_existing_dashboard:true,modification_note:'Adds a BBC RSS panel. Headlines and reported capacity do not change official REPD rows, geometry or totals.',
 section:'    <section class="panel" id="bbc-rss-intelligence"><h2 class="section-title">PIPELINE INTELLIGENCE - BBC RSS DISCOVERY</h2><div id="bbcRssIntelligenceHost" role="status">Loading collected BBC headlines...</div></section>\n',
 loader:`async function bindBbcRssIntelligence() {
  const host=document.getElementById('bbcRssIntelligenceHost');
  try {
    const entry=registry.supplemental_assets.bbc_rss_intelligence;
    const payload=await fetchImmutable(entry.payload.path);
    invariant(payload.schema==='pipelinenews.bbc-rss-pipeline-payload.v1','RSS panel payload schema mismatch');
    const module=await import('../'+entry.cartridge.path);
    invariant(module.CONTRACT.generation===entry.generation,'RSS panel module generation mismatch');
    window.__bbcRssIntelligence=module.mount({host,payload:payload.rss,evidence:payload.evidence,projects:()=>window.__provisionalProjects?.projects || payload.projects,official:rows.map((_,index)=>project(index))});
  }catch(error){host.textContent='BBC RSS discovery unavailable: '+error.message;}
}\n`,
 bind_call:'await bindBbcRssIntelligence();',
 hash_fields:[{at:['cartridge','sha256'],path:'assets/{GEN}-bbc-rss-pipeline.mjs'},{at:['model','sha256'],path:'assets/{GEN}-bbc-rss-pipeline-model.mjs'},{at:['evidence_validator','sha256'],path:'assets/{GEN}-bbc-reported-project.mjs'},{at:['payload','sha256'],path:'data/{GEN}-bbc-rss-pipeline.json'}],
 registry_entry:{schema:'pipelinenews.bbc-rss-pipeline-supplement.v1',generation:'{GEN}',source_commit:sha,source_mode:draft?'UNCOMMITTED_DRAFT_DO_NOT_PUBLISH':'committed',sources,
  cartridge:{path:'assets/{GEN}-bbc-rss-pipeline.mjs',schema:'pipelinenews.bbc-rss-pipeline.v1'},model:{path:'assets/{GEN}-bbc-rss-pipeline-model.mjs'},evidence_validator:{path:'assets/{GEN}-bbc-reported-project.mjs'},payload:{path:'data/{GEN}-bbc-rss-pipeline.json',schema:payload.schema},official_source_totals_unchanged:true,live_source:'https://raw.githubusercontent.com/Ventusltd/pipelinenews/main/discovery/products/bbc-rss.json',collection_schedule:'Every two hours in bbc-rss-discovery.yml',refresh_policy:'Show immutable snapshot immediately, attempt latest collected JSON on mount or explicit refresh, retain observations on failure.'}};
writeFileSync(root+'/cartridge.json',JSON.stringify(manifest,null,2)+'\n');
console.log(root+(draft?' (DRAFT - rerun without --draft after committing owner source)':''));
