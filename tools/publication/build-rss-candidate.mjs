import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const generation = process.argv[2];
if (!/^\d{12}$/.test(generation ?? '')) throw Error('Supply unique UTC YYYYMMDDHHMM');
const out = `testcode/${generation}`;
if (existsSync(out)) throw Error('Immutable candidate already exists');
const sha = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const blob = path => execFileSync('git',['show',`${sha}:${path}`],{maxBuffer:2*1024*1024});
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const template = blob('ui/templates/bbc-rss-intelligence.html');
const snapshot = blob('discovery/products/bbc-rss.json');
const html = template.toString('utf8').replaceAll('{{GENERATION}}', generation);
const files = {'index.html':Buffer.from(html), 'snapshot.json':snapshot};
mkdirSync(out,{recursive:true});
for (const [name,bytes] of Object.entries(files)) writeFileSync(`${out}/${name}`,bytes);
writeFileSync(`${out}/manifest.json`,JSON.stringify({schema:'ventus.testcode-candidate.v1',generation,
  planId:'BBC-RSS-01',relatedPlan:'PIPELINE-35',scopeExtension:'User requested automated BBC RSS discovery, independent of energy-feed rollup prerequisites',
  owner:'Ventusltd/pipelinenews',sourceCommit:sha,status:'candidate',
  change:'Automatically discover BBC energy headlines with unmatched identity and explicit feed health',
  paper:'https://globalgrid2050.com/papers/202609060203-electrification/',
  schedule:'17 */2 * * *',
  sources:['ui/templates/bbc-rss-intelligence.html','discovery/bbc_rss.py','discovery/products/bbc-rss.json'].map(path=>({path,sha256:digest(blob(path))})),
  files:Object.entries(files).map(([path,b])=>({path,bytes:b.length,sha256:digest(b)}))},null,2)+'\n');
console.log(out);
