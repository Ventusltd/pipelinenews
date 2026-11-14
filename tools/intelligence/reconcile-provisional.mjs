import {readFileSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {reconcileProvisional} from '../../cartridges/provisional-identity.mjs';
import {resolveRegister,decodeProjects,validatePayload,listReleases} from './register-source.mjs';
import {computeDelta,operatorAliases} from './register-delta.mjs';
const registerPath='data/provisional/project-register.json';
if(!existsSync(registerPath)){console.log('No provisional register');process.exit(0);}
// usage: node tools/intelligence/reconcile-provisional.mjs [<projects payload path> | --release <id>]
// Default: the newest release's REGISTERED projects asset (registry assets.projects,
// digest-checked). The old default searched the release folder for
// "*-v8-fast-projects.json", which picks the inherited Q2 payload in a release whose
// register was replaced (202611132345 carries both; its registry names the Q3 one).
const args=process.argv.slice(2);
let source,official,delta=null;
if(args[0] && args[0]!=='--release'){
 const path=args[0],bytes=readFileSync(path),data=JSON.parse(bytes);
 validatePayload(data);
 source={path,sha256:createHash('sha256').update(bytes).digest('hex')};
 official=decodeProjects(data);
}else{
 const next=resolveRegister('.',{release:args[0]==='--release'?args[1]:undefined});
 source={path:next.path,sha256:next.sha256};
 official=decodeProjects(next.payload);
 // Previous distinct register, for operator renames and the safety gate.
 for(const release of listReleases('.').filter(id=>id<next.release).reverse()){
  let previous;try{previous=resolveRegister('.',{release});}catch{continue;}
  if(previous.sha256===next.sha256)continue;
  delta=computeDelta(decodeProjects(previous.payload),official,{previous,next});break;
 }
 if(delta?.gate.status==='HOLD'){
  console.log(JSON.stringify({source,gate:delta.gate,action:'register unchanged; new quarter held for review'}));
  process.exit(0);
 }
}
const register=JSON.parse(readFileSync(registerPath));
const result={...register,projects:reconcileProvisional(register.projects,official,source,{operatorAliases:delta?operatorAliases(delta):new Map()})};
const body=JSON.stringify(result,null,2)+'\n';
if(body!==readFileSync(registerPath,'utf8').replaceAll('\r\n','\n')){
 const temporary=registerPath+'.tmp';writeFileSync(temporary,body);renameSync(temporary,registerPath);
}
console.log(JSON.stringify({source,gate:delta?.gate.status??'NOT_EVALUATED',delta:delta?.counts??null,pending:result.projects.filter(p=>!p.official_repd_ref).length,matched:result.projects.filter(p=>p.official_repd_ref).length}));
