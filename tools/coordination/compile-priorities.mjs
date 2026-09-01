#!/usr/bin/env node
/** Compile recent shared-board evidence into a deterministic attention queue. */
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const arg = (name, fallback) => {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : fallback;
};
const now = new Date(arg('--now', new Date().toISOString()));
const hours = Number(arg('--hours', '24'));
const outJson = resolve(REPO, arg('--json', 'docs/coordination/generated/LAST-24-HOURS.json'));
const outMd = resolve(REPO, arg('--markdown', 'docs/coordination/generated/LAST-24-HOURS.md'));
if (Number.isNaN(now.valueOf()) || !Number.isFinite(hours) || hours <= 0) throw new Error('invalid window');
const since = new Date(now.valueOf() - hours * 3600_000).toISOString();

const git = (...args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8' });
const rawCommits = git('log', `--since=${since}`, '--format=%H%x09%cI%x09%an%x09%s', '--',
  'docs/coordination/BOARD.md', 'docs/coordination/from-claude', 'docs/coordination/from-codex')
  .trim().split(/\r?\n/).filter(Boolean);

const rules = [
  { id: 'P0', weight: 1000, re: /stop[- ]ship|data loss|delete.*evidence|false voltage|orphan|security|corrupt|failed proof/i },
  { id: 'P1', weight: 700, re: /map click|deep link|grid computation|fault current|voltage|substation|connection|topology|impedance|power flow|mobile/i },
  { id: 'P2', weight: 400, re: /proof|gate|schema|manifest|assembler|deploy|release|pages/i },
  { id: 'P3', weight: 100, re: /./ }
];
function classify(text, title = text) {
  const resolved = /\b(closed|resolved|superseded|recovered)\b/i.test(title)
    && !/\b(not|unresolved|remain(?:s|ing)?|pending)\b.{0,24}\b(closed|resolved|superseded|recovered)\b/i.test(title);
  if (resolved) return { priority: 'DONE', score: 0, grid: rules[1].re.test(text), resolved: true };
  const matched = rules.filter(rule => rule.re.test(text));
  const primary = matched[0] || rules.at(-1);
  const grid = rules[1].re.test(text);
  return { priority: primary.id, score: primary.weight + (grid && primary.id !== 'P1' ? 150 : 0), grid, resolved: false };
}

const items = [];
for (const line of rawCommits) {
  const [commit, timestamp, author, subject] = line.split('\t');
  const files = git('show', '--format=', '--name-only', commit, '--', 'docs/coordination')
    .trim().split(/\r?\n/).filter(Boolean).sort();
  let evidence = subject;
  for (const file of files.filter(file => /from-(claude|codex)\/.+\.md$/.test(file))) {
    try { evidence += '\n' + await readFile(join(REPO, file), 'utf8'); } catch { /* commit may delete */ }
  }
  const rank = classify(evidence, subject);
  items.push({ commit, timestamp, author, subject, files, ...rank });
}

// Reviewed structured events may be added locally; raw transcripts are forbidden here.
const inbox = join(REPO, 'docs', 'coordination', 'events');
for (const file of (await readdir(inbox).catch(() => [])).filter(name => name.endsWith('.json')).sort()) {
  const event = JSON.parse(await readFile(join(inbox, file), 'utf8'));
  if (event.schema !== 'coordination.reviewed-event.v1') throw new Error(`${file}: unrecognised schema`);
  if (!['claude', 'codex', 'owner'].includes(event.agent) || !event.title || !event.timestamp) {
    throw new Error(`${file}: missing reviewed-event fields`);
  }
  const when = new Date(event.timestamp);
  if (when >= new Date(since) && when <= now) items.push({
    commit: null, timestamp: when.toISOString(), author: event.agent,
    subject: event.title, files: [`docs/coordination/events/${file}`],
    ...classify(`${event.title}\n${event.detail || ''}`, event.title)
  });
}
items.sort((a, b) => b.score - a.score || b.timestamp.localeCompare(a.timestamp)
  || a.subject.localeCompare(b.subject));

const product = {
  schema: 'coordination.last-24-hours.v1', generated_at: now.toISOString(),
  window_hours: hours, source: 'git coordination history plus reviewed events',
  raw_transcripts_included: false, items
};
const lines = [
  '# Claude–Codex continuity: last 24 hours', '',
  `Generated: ${product.generated_at}  `, `Window: ${hours} hours  `,
  'Raw transcripts: **not committed**; use the local exporter for full-fidelity access.', '',
  '## Priority queue', ''
];
if (!items.length) lines.push('_No reviewed coordination activity in this window._', '');
for (const item of items) lines.push(
  `- **${item.priority}${item.grid ? ' · GRID/MAP' : ''}** — ${item.subject}`,
  `  - ${item.timestamp} · ${item.author}${item.commit ? ` · \`${item.commit.slice(0, 12)}\`` : ''}`,
  `  - Evidence: ${item.files.map(file => `\`${file}\``).join(', ') || 'commit metadata'}`
);
await mkdir(dirname(outJson), { recursive: true });
await writeFile(outJson, JSON.stringify(product, null, 2) + '\n', 'utf8');
await writeFile(outMd, lines.join('\n') + '\n', 'utf8');
console.log(JSON.stringify({ status: 'COMPILED', items: items.length, grid_items: items.filter(x => x.grid).length }, null, 2));
