import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const root='tools/intelligence/cartridges/provisional-projects';
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const blob=path=>execFileSync('git',['show',`${sha}:${path}`]);
mkdirSync(root+'/assets',{recursive:true});mkdirSync(root+'/data',{recursive:true});
writeFileSync(root+'/assets/{GEN}-provisional-identity.mjs',blob('cartridges/provisional-identity.mjs'));
writeFileSync(root+'/assets/{GEN}-provisional-projects.mjs',blob('cartridges/provisional-pipeline-panel.mjs'));
writeFileSync(root+'/data/{GEN}-provisional-projects.json',blob('data/provisional/project-register.json'));
const manifest={key:'provisional_projects',summary:'News-reported projects enter the Pipeline under one-time REPD-pending identities.',
 modifies_existing_dashboard:true,modification_note:'Adds a labelled pending-register table; official REPD totals and geometry stay source-bound.',
 section:'    <section class="panel" id="provisional-projects"><h2 class="section-title">REPD PIPELINE - AWAITING REGISTER PUBLICATION</h2><div id="provisionalProjectsHost" role="status">Loading pending project records...</div></section>\n',
 loader:`async function bindProvisionalProjects() {
  const host=document.getElementById('provisionalProjectsHost');
  try {
    const entry=registry.supplemental_assets.provisional_projects;
    const payload=await fetchImmutable(entry.payload.path);
    const module=await import('../'+entry.cartridge.path);
    invariant(module.CONTRACT.generation===entry.generation,'provisional module generation mismatch');
    const result=module.mount({host,payload,official:rows.map((_,index)=>project(index)),source:{path:registry.assets.projects.path,sha256:registry.assets.projects.sha256}});
    window.__provisionalProjects=result;
  }catch(error){host.textContent='Pending project records unavailable: '+error.message;}
}\n`,
 bind_call:'await bindProvisionalProjects();',
 hash_fields:[{at:['cartridge','sha256'],path:'assets/{GEN}-provisional-projects.mjs'},{at:['identity','sha256'],path:'assets/{GEN}-provisional-identity.mjs'},{at:['payload','sha256'],path:'data/{GEN}-provisional-projects.json'}],
 registry_entry:{schema:'pipelinenews.provisional-pipeline-supplement.v1',generation:'{GEN}',source_commit:sha,
   cartridge:{path:'assets/{GEN}-provisional-projects.mjs',schema:'pipelinenews.provisional-pipeline.v1'},identity:{path:'assets/{GEN}-provisional-identity.mjs'},payload:{path:'data/{GEN}-provisional-projects.json',schema:'pipelinenews.provisional-register.v1'},
   identity_status:'REPD_PENDING',official_source_totals_unchanged:true,quarterly_rule:'Unique name/developer/county/capacity match replaces the temporary ref; previous ref and Global Grid reference remain aliases.'}};
writeFileSync(root+'/cartridge.json',JSON.stringify(manifest,null,2)+'\n');
console.log(root);
