import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { auditCoverage } from '../../cartridges/coverage-join-audit.mjs';

const generation = process.argv[2];
if (!/^\d{12}$/.test(generation ?? '')) throw Error('Supply a unique UTC YYYYMMDDHHMM generation');
const output = resolve('testcode', generation);
if (existsSync(output)) throw Error('Candidate already exists; immutable output will not be overwritten');
const root = 'releases/202609050309-pipelinenews/data/';
const names = ['202608311610-grid-proximity.json','202608311800-grid-distance.json','202608311858-substation-33kv.json'];
const hash = body => createHash('sha256').update(body).digest('hex');
const sourceCommit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const committed = path => execFileSync('git',['show',sourceCommit+':'+path],{maxBuffer:20*1024*1024});
const bytes = names.map(name => committed(root + name));
const sources = names.map((name,i) => ({path:root + name, sha256:hash(bytes[i]), bytes:bytes[i].length}));
const result = auditCoverage(...bytes.map(b => JSON.parse(b)));
result.sourceCommit = sourceCommit;
result.sources = sources;
mkdirSync(output, {recursive:true});
const report = JSON.stringify(result,null,2)+'\n';
writeFileSync(output+'/coverage.json',report);
writeFileSync(output+'/index.html',`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pipeline News · Coverage audit ${generation}</title>
<style>body{font:17px/1.55 system-ui;margin:auto;padding:24px;max-width:900px;color:#e6edf3;background:#101923}a{color:#82cfff}h1{line-height:1.2}section{border:1px solid #435361;padding:18px;margin:20px 0;border-radius:8px}input,select,button{font:inherit;padding:9px;max-width:100%;box-sizing:border-box}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #435361;padding:8px}code{overflow-wrap:anywhere}#identities{max-height:260px;overflow:auto;overflow-wrap:anywhere}small{color:#bbc8d3}@media(max-width:450px){body{padding:14px}td,th{padding:5px;font-size:14px}}</style>
<a href="https://globalgrid2050.com/#test-code">Test Code</a>
<h1>Pipeline News coverage audit</h1><p>Version ${generation} · PIPELINE-01 · Test candidate</p>
<p>This checks which project identities appear in the three pinned datasets. It does not change the live application.</p>
<p id="status" role="status">Loading verified coverage report…</p>
<section><h2>Dataset coverage</h2><div id="counts"></div><div id="technologies"></div></section>
<section><h2>Missing project identities</h2><label for="source">Missing from </label><select id="source"><option value="missingGrid">GRID</option><option value="missingSubstation">SUB</option></select>
<p><label for="search">Find REPD identity </label><input id="search" type="search" inputmode="numeric"></p><p id="match-count" aria-live="polite"></p><div id="identities"></div></section>
<section><h2>Records that cannot be joined</h2><div id="invalid"></div></section>
<p id="caveat"></p><p><a href="coverage.json" download>Download complete coverage report</a> · <a href="manifest.json">Source and version record</a></p>
<script type="module">
const el=id=>document.getElementById(id);
try {
 const response=await fetch('./coverage.json'); if(!response.ok)throw Error('Report unavailable');
 const bytes=await response.arrayBuffer(); const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(actual!=='${hash(report)}')throw Error('Report identity mismatch');
 const data=JSON.parse(new TextDecoder().decode(bytes));
 el('status').textContent='Verified source report loaded. Coverage differs between datasets.';
 el('counts').textContent=data.counts.proximity+' proximity records; '+data.counts.validProximityIdentities+' valid identities; '+data.counts.grid+' GRID entries; '+data.counts.substation+' SUB entries.';
 const table=document.createElement('table');const header=table.createTHead().insertRow();for(const label of ['Technology','Proximity','GRID','SUB']){const th=document.createElement('th');th.textContent=label;header.append(th);}
 for(const [tech,counts]of Object.entries(data.byTechnology)){const row=table.insertRow();for(const value of [tech,counts.proximity,counts.grid,counts.substation])row.insertCell().textContent=value;}el('technologies').append(table);
 const update=()=>{const matches=data[el('source').value].filter(id=>id.includes(el('search').value.trim()));el('match-count').textContent=matches.length+' matching identities';el('identities').textContent=matches.join(', ')||'No matches';};
 el('source').addEventListener('change',update);el('search').addEventListener('input',update);update();
 for(const item of data.invalidProximity){const p=document.createElement('p');p.textContent=item.name+' — '+item.reason;el('invalid').append(p);}
 el('caveat').textContent=data.caveat;
}catch(error){el('status').textContent='Coverage unavailable: '+error.message;}
</script></html>`);
const files=['index.html','coverage.json'].map(path=>{const b=readFileSync(output+'/'+path);return {path,bytes:b.length,sha256:hash(b)};});
writeFileSync(output+'/manifest.json',JSON.stringify({schema:'ventus.testcode-candidate.v1',generation,planId:'PIPELINE-01',status:'candidate',change:'Report exact coverage differences and unjoinable source rows',owner:'Ventusltd/pipelinenews',sourceCommit:result.sourceCommit,module:{path:'cartridges/coverage-join-audit.mjs',sha256:hash(committed('cartridges/coverage-join-audit.mjs'))},sources,files,acceptance:'Owner fixtures pass; exact CI, served bytes and Chrome pending'},null,2)+'\n');
console.log(output);
