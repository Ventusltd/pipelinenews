import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';
const root=resolve(process.argv[2] ?? '');
const manifest=JSON.parse(readFileSync(resolve(root,'manifest.json')));
const hash=b=>createHash('sha256').update(b).digest('hex');
if (!/^[a-f0-9]{40}$/.test(manifest.sourceCommit)) throw Error('Full source SHA required');
for (const entry of manifest.files) {
  const path=resolve(root,entry.path), rel=relative(root,path);
  if (isAbsolute(rel)||rel.startsWith('..')) throw Error('File outside candidate');
  const b=readFileSync(path);
  if (b.length!==entry.bytes || hash(b)!==entry.sha256) throw Error(`Candidate bytes mismatch: ${entry.path}`);
}
for (const entry of [...manifest.sources ?? [], ...manifest.module ? [manifest.module] : []]) {
  const b=execFileSync('git',['show',`${manifest.sourceCommit}:${entry.path}`],{maxBuffer:20*1024*1024});
  if (hash(b)!==entry.sha256) throw Error(`Committed source mismatch: ${entry.path}`);
}
console.log(`PASS ${manifest.generation}: candidate files and committed source identities`);
