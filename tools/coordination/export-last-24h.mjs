#!/usr/bin/env node
/** Local-only transcript collector. Raw text never enters a tracked path. */
import { createReadStream } from 'node:fs';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

const arg = (name, fallback) => {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : fallback;
};
const hours = Number(arg('--hours', '24'));
const now = new Date(arg('--now', new Date().toISOString()));
const output = resolve(arg('--output',
  'docs/coordination/.local/transcripts-last-24h.jsonl'));
if (!Number.isFinite(hours) || hours <= 0 || Number.isNaN(now.valueOf())) {
  throw new Error('--hours must be positive and --now must be ISO-8601');
}
const cutoff = now.valueOf() - hours * 3600_000;
const roots = [
  { agent: 'claude', path: resolve(arg('--claude-root', join(homedir(), '.claude', 'projects'))) },
  { agent: 'codex', path: resolve(arg('--codex-root', join(homedir(), '.codex', 'sessions'))) }
];

async function files(root) {
  const found = [];
  async function walk(path) {
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const info = await stat(child);
        if (info.mtimeMs >= cutoff) found.push(child);
      }
    }
  }
  await walk(root);
  return found.sort();
}

function texts(record) {
  const role = record.message?.role || record.role || record.type || 'unknown';
  const content = record.message?.content ?? record.content;
  const parts = [];
  if (typeof content === 'string') parts.push(content);
  if (Array.isArray(content)) for (const item of content) {
    if (typeof item === 'string') parts.push(item);
    else if (typeof item?.text === 'string') parts.push(item.text);
  }
  if (!parts.length && typeof record.text === 'string') parts.push(record.text);
  return { role, text: parts.join('\n') };
}

const events = [];
for (const root of roots) for (const path of await files(root.path)) {
  const input = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  let line = 0;
  for await (const raw of input) {
    line += 1;
    let record;
    try { record = JSON.parse(raw); } catch { continue; }
    const timestamp = new Date(record.timestamp || record.created_at || record.time || 0);
    if (Number.isNaN(timestamp.valueOf()) || timestamp.valueOf() < cutoff) continue;
    const { role, text } = texts(record);
    if (!text.trim()) continue;
    events.push({
      schema: 'coordination.local-transcript-event.v1',
      agent: root.agent,
      timestamp: timestamp.toISOString(),
      role,
      source: path,
      source_line: line,
      source_sha256: createHash('sha256').update(raw).digest('hex'),
      text
    });
  }
}
events.sort((a, b) => a.timestamp.localeCompare(b.timestamp)
  || a.agent.localeCompare(b.agent) || a.source.localeCompare(b.source)
  || a.source_line - b.source_line);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, events.map(event => JSON.stringify(event)).join('\n')
  + (events.length ? '\n' : ''), { encoding: 'utf8', flag: 'w' });
console.log(JSON.stringify({ status: 'EXPORTED_LOCAL_ONLY', hours, events: events.length, output }, null, 2));
